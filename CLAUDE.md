# Aura v2 — architecture and conventions

AI personal colour analysis: a photo in, one of 12 seasonal colour types out, plus palette,
makeup, hair and shopping recommendations.

## Layout

```
client/      React 19 + Vite 7 + Tailwind 4 SPA        → Vercel
server/      Express 5 + TypeScript, run via tsx        → Render
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
browser: decode → quality gate → landmarks → regions → features
   │ (if quality fails, show issues + retake)
   ▼
POST /api/analyze  (downscaled image + measured features)
   ▼
server: sharp validate/rotate/downscale → OpenRouter vision call (strict JSON schema)
   ▼
normalizeResult() → canonical palette injected → TTL session store → client
```

`ANALYSIS_MODE=llm_only|hybrid` selects whether the measured features and rule-based ranking
participate. Chat and shop checks read from the stored session.

**The image posted to `/api/analyze` must be the one `decode.ts` produced** — ICC-converted to
sRGB, EXIF-uprighted, downscaled — never the raw upload. The model and the measurement layer
have to see the same colours; otherwise the LLM reads a Display P3 file as sRGB and disagrees
with the measured features for a reason neither side can see. Per the finding below that is a
4-degree hue error, enough to flip the undertone label. The server keeps its own sharp
validate/rotate/downscale pass as defence in depth for direct API calls, but it must not be the
step that first defines the pixels.

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

## Testing

```bash
npm test              # vitest, server/ + measure/ unit tests
npm run test:watch
npx tsc --noEmit -p tsconfig.json     # server, tests, scripts
cd client && npx tsc -b --noEmit      # client
```

Measurement unit tests (Lab conversion, region statistics, `score()`) are pure functions and
need no browser. Anything needing a real decode or MediaPipe belongs in the eval harness.

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
- There is no request timeout in `openrouter.ts` yet.
