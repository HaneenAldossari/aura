# Aura v2 — architecture and conventions

AI personal colour analysis: a photo in, one of 12 seasonal colour types out, plus palette,
makeup, hair and shopping recommendations.

## Layout

```
client/      React 19 + Vite 7 + Tailwind 4 SPA        → Vercel
api/         Vercel Functions, one file per route      → Vercel
server/      handlers/ (shared) + index.ts (dev only)
measure/     Framework-free TS colour measurement       → runs in the BROWSER (and headless for eval)
eval/        Accuracy harness (Phase 4)
tests/       vitest unit tests for server/ and measure/
scripts/     One-off maintenance scripts
```

## Hard rules

**1. OpenRouter is the only provider layer.** Every AI call goes through
`server/services/openrouter.ts`. There are no direct Gemini / Anthropic / OpenAI SDK paths,
and none should be added — `.env` holds keys for those vendors but they are deliberately
unused. Add a model by putting its OpenRouter slug in config, never by adding a dependency.

**2. Models are per-task and live in config.** `MODEL_CLASSIFY`, `MODEL_CHAT`, `MODEL_SHOP`
resolve through `server/utils/config.ts`. Never hardcode a model ID at a call site.
`OPENROUTER_MODEL` / `OPENROUTER_CHAT_MODEL` are deprecated but still honoured with a warning.

**3. Every numeric threshold lives in a config file**, not inline, so the eval can tune it.
Server: `server/utils/config.ts`. Measurement: `measure/seasons.config.ts`.

**4. Image bytes never touch disk and are never logged.** multer uses `memoryStorage`, sharp
is buffer-in/buffer-out, and measurement happens on the user's own device. Keep it that way.

**5. Seasons are the 12 canonical names, exactly.** They are defined once in
`server/prompts/colorAnalysis.ts` as `CANONICAL_SEASONS` and must match the keys of
`server/utils/seasonPalettes.ts`. "Soft Spring" and "Light Autumn" are **not** seasons in this
system — they were removed. The classifier's `primarySeason` is enum-constrained to these 12,
which is what guarantees `getCanonicalPalette()` can never miss.

**6. Don't break the client contract.** `normalizeResult()` in `server/routes/analysis.ts` is
the single chokepoint between model output and the UI; `client/src/lib/types.ts` mirrors it.
Adding optional fields is safe. Two reads are *not* optional-chained in the client and will
throw if absent: `palette` (`StyleTab.tsx`) and `palette.avoid` (`AvoidSection.tsx`).

## Analysis pipeline

```
browser: decode → quality gate → landmarks → regions → features → canonical JPEG
   │ (quality failure never uploads — issues + retake, photo stays on device)
   ▼
POST /api/analyze  (canonical sRGB JPEG + measured features)
   ▼
server: validate features (400 on implausible) → score() ranks the 12 seasons
   ▼
        OpenRouter vision call: image + measured values, NEVER the ranking
   ▼
        agreement check (model vs rules) → confidence cap, alternatives
   ▼
normalizeResult() → canonical palette injected → session → client
```

**The model never sees the rule-based ranking.** Shown the rules' answer it would
anchor on it, and the agreement check computed afterwards would be measuring its own
suggestion. It gets the image and the measured colour values only; agreement is
computed once it has committed. The model's verdict is still the final season — the
ranking sets confidence and offers alternatives, nothing more.

`needsSecondPhoto` is a **suggestion, never a gate**, until Phase 4 calibrates the
thresholds behind it.

**The API is stateless.** There is no session store. `/api/analyze` returns everything
inside `result` (~6 KB); the browser keeps it in `client/src/lib/resultStore.ts`
(localStorage, with an in-memory fallback) and sends it back with chat and shop
requests, where it is validated like any other untrusted input. The id in a
`/results/:id` URL is a **local key, not a server handle** — a results link only opens
on the device that produced it.

**One implementation, two runtimes.** Routes are web-standard
`(request: Request) => Promise<Response>` handlers in `server/handlers/`. `api/*.ts`
wraps each as a Vercel Function; `server/index.ts` is a ~60-line Node adapter for local
dev. Express, multer, helmet, cors and express-rate-limit are gone.

**Known gap: the LLM routes are unthrottled.** `express-rate-limit` counted per process,
which is meaningless on serverless, and nothing replaced it. `/api/analyze` costs about
$0.01 per call. Vercel Firewall rate limiting or a durable counter is the fix.

`ANALYSIS_MODE=llm_only|hybrid` selects whether the measured features and rule-based ranking
participate. Chat and shop checks read from the stored session.

**The image posted to `/api/analyze` must be the one `decode.ts` produced** — ICC-converted to
sRGB, EXIF-uprighted, downscaled — never the raw upload. The model and the measurement layer
have to see the same colours; otherwise the LLM reads a Display P3 file as sRGB and disagrees
with the measured features for a reason neither side can see. Per the finding below that is a
4-degree hue error, enough to flip the undertone label. The server keeps its own sharp
validate/rotate/downscale pass as defence in depth for direct API calls, but it must not be the
step that first defines the pixels.

## Pinned MediaPipe models

| model | version path | bytes | SHA-256 |
| --- | --- | --- | --- |
| `face_landmarker.task` | `.../float16/**1**/` | 3,758,596 | `64184e22…4e0bc9ff` |
| `selfie_multiclass_256x256.tflite` | `.../float32/**1**/` | 16,371,837 | `c6748b12…6507e0e0` |

The paths end in `/1/`, not `/latest/`. `/latest/` is a moving pointer: a silent
model update would change every measurement the eval had recorded, and the
calibrated thresholds would quietly stop matching the model they were calibrated
against, with nothing in this repo having changed.

Version pinning alone is not enough — these are mutable objects in a Google
bucket — so every download is checked against the SHA-256 above and a mismatch
**throws**. A model change becomes a loud failure rather than a drift in the
numbers. Full values live in `MODEL_SPECS` in `measure/landmarks.ts`; update them
only deliberately, and re-run the eval when you do.

To self-host instead, call `setModelBase("/models/")` and put the two files under
`client/public/models/`. The integrity check still applies.

## measure/ — why it is in the browser

The measurement module is plain TypeScript with no framework imports, so the same code runs in
the user's browser and in headless Chromium under Playwright for the eval. One implementation
means the eval measures exactly what users get.

**Decode with WASM codecs, not canvas.** `canvas.getImageData()` is colour-managed to the
display profile and is deliberately noised by anti-fingerprinting modes (Firefox
`privacy.resistFingerprinting`, Brave, Safari), so it cannot produce pixel-identical results
across browsers. `measure/decode.ts` uses `@jsquash/*` (libjpeg-turbo / libpng / libwebp
compiled to WASM), which is deterministic everywhere. Decode once to `ImageData` and feed
those same pixels to both MediaPipe and our own region sampling — MediaPipe's `ImageSource`
is `TexImageSource`, which includes `ImageData`.

## Measurement findings

A dated log of things measured in this repo, with the numbers and what they
changed. Cite these rather than re-deriving them.

### 2026-09-16 — Display P3 must be converted before measurement

Fixture: `tests/fixtures/color/iphone-p3-hand.jpg` (straight from an iPhone,
Display P3 verified with `sips`, 5712x4284). 94,943 skin pixels sampled, median
Lab under each assumption:

| measured as | L\* | a\* | b\* | C\* | h (deg) |
| --- | --- | --- | --- | --- | --- |
| sRGB (profile ignored) | 48.59 | 7.92 | 12.79 | 15.04 | **58.23** |
| Display P3 (correct) | 48.74 | 10.56 | 14.63 | 18.04 | **54.18** |
| difference | +0.15 | +2.64 | +1.84 | **+3.00** | **-4.05** |

Correct handling reads the skin **cooler**: P3's wider primaries mean the same
encoded bytes describe a more saturated colour, so reading them as sRGB
overstates yellowness.

**Consequence — the undertone label flips.** With `HUE.skinByBand.span = 10`, a
4.05 degree shift is 0.4 of the whole normalised half-axis:

- as sRGB: `(58.23 - 52.5) / 10 = +0.57` → **warm**
- as P3: `(54.18 - 52.5) / 10 = +0.17` → **neutral-warm**

Chroma moves +0.30 on its axis too. On a warm/cool split this is the difference
between a Spring and a Summer call, on photos from the most common phone in the
world. This is why `decode.ts` reads the ICC profile and why `Gamut` is carried
through to `color.rgbToLab()`.

### 2026-09-16 — decode failures were blamed on the user's photo

`decode.ts` wrapped every decode failure as `corrupt`, message *"That image file
looks damaged or incomplete."* The `@jsquash` codecs fetch their `.wasm` at first
use, so a blocked, offline or rate-limited fetch produced that message for a
perfectly good photo — sending the user to re-export a file that was never the
problem. Found because the first fixture run failed that way in Node, which has
no origin to fetch from.

Split into a `decoder_unavailable` code with its own message, plus
`isDecoderUnavailable()` and `cause` preservation. Anything matching
fetch/network/WebAssembly/wasm/dynamic-import is ours, not theirs.

### 2026-09-16 — the overlay tool found three region bugs

`npx tsx scripts/dev/overlay.ts` runs landmarks/regions/quality for real in
headless Chromium and writes annotated PNGs to `dev/`. First run against
`sample-4` (lightest demo face) and `sample-1` (deepest) found:

| problem | symptom | fix |
| --- | --- | --- |
| Exclusion zones far too large (0.45-0.55 of interocular distance) | only ~20% of considered skin pixels survived, and survivors were all at disc edges where shading differs most | radii cut to 0.26-0.34; retention went 3298 → 7458 and 2749 → 7167 pixels |
| `forehead` landmark set centred on the glabella | sat inside both brow exclusion zones, so most of the patch was discarded | set changed to `[10, 151, 108, 337]`, mid-forehead |
| Sclera sampled at the eye centroid | the centroid is the **iris** — every sample failed the brightness filter, so colour cast read `n/a` on every photo | sample two thirds of the way from iris to each eye corner |

The landmark index sets themselves were confirmed correct — cheeks, forehead,
irises and lips all land where intended on both faces.

Still open from that run: `QUALITY.maxScleraCast = 8` fires on both demo faces
(measured 8.40 and 11.95). Left alone for now — the threshold is an estimate and
n=2 synthetic faces is not grounds to retune, but it is the first candidate when
real photos arrive. Also note `sample-4` hair measures C\* 0.00 with hue 142.81:
hue is undefined at zero chroma, which is harmless only because `HUE.weights.hair`
is 0.

### 2026-09-16 — the demo gallery has no deep skin tones

Skin L* across all nine faces in `client/public/demo-faces/`, measured with the
overlay tool:

| sample | 1 | 5 | 3 | 9 | 7 | 2 | 6 | 8 | 4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| skin L\* | 60.4 | 72.8 | 75.3 | 76.9 | 77.3 | 79.8 | 80.2 | 80.2 | 82.7 |
| band | medium | light | light | light | light | light | light | light | light |

Against `SKIN_BANDS` (deep < 45, light >= 65): **eight light, one medium, zero
deep.** The deep band's hue and chroma thresholds — the ones most likely to be
wrong, since melanin raises b\* and inflates both hue angle and C\* — are never
exercised by any demo run. A bias affecting deep skin would be invisible here.

Hair is a second gap. L\* 4.0-38.9 with C\* at or below 2.6 on seven of nine, so
hair reads near-black and near-neutral almost everywhere; hue at that chroma is
noise (sample-4: C\* 0.00, h 142.8). Harmless on the hue axis, where
`HUE.weights.hair` is 0, but hair carries 0.25 of the **chroma** axis, so
systematically low hair chroma may drag dark-haired faces toward "soft".

**Actions:** `eval/real` must deliberately include deep skin tones and natural
hair, and report accuracy per skin-lightness band. The demo gallery itself
should be widened — it is what most users see. Both are open.

Also open and deliberately untouched: `QUALITY.maxScleraCast = 8` fires on both
demo faces measured so far (8.40, 11.95). Left alone until real photos arrive.

## Testing

```bash
npm test              # vitest, server/ + measure/ unit tests
npm run test:watch
npx tsc --noEmit -p tsconfig.json     # server, tests, scripts
cd client && npx tsc -b --noEmit      # client
```

Measurement unit tests (Lab conversion, region statistics, `score()`) are pure functions and
need no browser.

Anything needing a real decode or MediaPipe cannot run in Node — the @jsquash codecs and
MediaPipe's WASM runtime both fetch over HTTP. Two ways to exercise those:

```bash
npx tsx scripts/dev/overlay.ts [image ...]   # headless Chromium, writes annotated PNGs to dev/
```

`dev/` is gitignored. The overlay draws the sampled discs per region, the hair and face-skin
masks, the sclera patches and the exclusion zones, and prints per-region pixel counts, median
Lab and the quality-gate result. It is the only way to check a landmark index set — whether
index 116 is on a cheek or a jawline is a question you answer by looking.

**Bundle as ESM, not IIFE.** The emscripten codec glue reads `import.meta.url` to find its own
`.wasm`; an IIFE has no `import.meta`, esbuild substitutes an empty string, and emscripten
throws `Failed to construct 'URL': Invalid URL`. Call `initDecoders(wasmBase)` to sidestep
path resolution entirely by handing each codec a pre-compiled module.

## Eval

`eval/run.ts` reports accuracy, cost and latency per model. Two datasets, **never mixed**:

- `eval/synthetic/` — AI-generated faces. Pipeline smoke tests only. **Excluded from every
  accuracy metric**, because a generated face has no ground-truth colouring, so scoring against
  it measures model-vs-model agreement rather than correctness.
- `eval/real/` — labelled real photos. The **only** source of the reported accuracy number.

`labels.csv` carries a `dataset` column; a row counts toward the headline figure only if
`dataset=real` **and** `source≠consensus`. Images are gitignored; only `labels.csv` is committed.

## Things that will bite you

- OpenRouter withdraws model slugs without notice. Both free Nemotron models this app once used
  now return HTTP 404. `OPENROUTER_FALLBACK_MODEL` engages on *failure* for this reason.
- `google/gemini-3.8-flash` refuses `reasoning: {enabled: false}` — `CLASSIFY_REASONING=false`
  is a no-op on that model.
- `temperature: 0` + `seed` gives a stable *season*, not byte-identical output.
- Low-confidence results return **HTTP 200** with `result.error`, and the client reads
  `photoTips` only from that path. Moving it to a non-2xx status silently drops the tips UI.
- `openrouter.ts` has a request deadline (`OPENROUTER_TIMEOUT_MS`, default 120s). It
  covers the whole buffered call, but for a stream only the wait for headers — a deadline
  spanning the body would cut a long chat off mid-sentence.
