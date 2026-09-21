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

### 2026-09-20 — the demo faces' hair was inverting their season

Regenerating the nine demo analyses through the real hybrid path showed six of
nine capped at **50% confidence** with the model and the rules disagreeing
outright. The cause is the hair gap recorded above, now measured end to end.

`sample-2`, the same pixels, analysed twice:

| hair | model | rules | agree | confidence |
| --- | --- | --- | --- | --- |
| counted (`natural`) | Deep Autumn | True Autumn | no | **50** |
| excluded (`dyed`) | Light Spring | Light Spring | yes | **88** |

Not a cosmetic difference — Deep Autumn and Light Spring are opposite corners of
the system. These faces measure skin in the **light** band while their hair
reads near-black at C\* under 2.6 (hue undefined at C\* 0 on `sample-4`). Hair
carries 0.25 of the chroma axis, so that combination drags the ranking toward
deep, muted seasons and the model — which is looking at the actual picture —
disagrees. The disagreement was real; the input causing it was an artefact of
generated imagery.

`scripts/precomputeDemoAnalyses.ts` therefore runs the demo faces with
`--hair=dyed`, which is also the honest answer: these are AI-generated faces and
their hair says nothing about anyone's natural colouring. The results page says
so, in the hair note, exactly as it would for a real user who answered the same
way.

**This does not retune anything.** No threshold moved. It is one more reason
`eval/real` needs real photos with natural hair before any threshold is
calibrated — and a reminder that the demo gallery is not a substitute.

### 2026-09-20 — `looks` pushed classification past its token budget

Adding `looks` to the classification schema made the longest responses truncate
mid-JSON, surfacing as `Expected ',' or '}' after property value` — a parse
error that reads like a bad model rather than a budget that ran out. Found on
`sample-1`, the deepest-skinned demo face, which produces the longest prose.

Reasoning tokens count against `max_tokens` on `google/gemini-3.8-flash`, so the
8192 default had less headroom than it appeared to. `MAX_TOKENS_CLASSIFY` now
defaults to **12288**. Worth re-checking whenever the schema grows again.

### 2026-09-20 — specular highlights were inflating skin L* by up to 23

Two deep-skinned demo faces came back labelled **Light Summer** and **Light
Spring** — impossible, since the light seasons are light in value by
definition. Hybrid had run correctly and both had measured features, a rules
ranking and an agreement check. The measurement was wrong.

Three separate faults, each masking the next.

**1. The estimator ignored that specular is one-sided.** `statsFor` took a
plain median over the patch. Specular reflection is additive — a highlight can
only raise L\*, never lower it — so a median over a lit patch is biased, and the
bias grows with gloss. It was worst on the deepest skin, where
specular-to-diffuse contrast is highest, which is exactly the direction that
turns a deep face into a light season. Componentwise medians were also taken
independently per channel, describing a colour no pixel in the patch ever had.

**2. Skin was sampled from three discs on the most specular points of a face.**
`extractSkin` used both cheekbone centroids and the mid-forehead — where studio
lighting puts its highlights. On `sample-1`:

| patch | L\* |
| --- | --- |
| lit cheekbone | 32.9 |
| mid-forehead | **68.3** |
| what we measured | 60.4 |
| whole face, banded | **37.5** |

A 35-point spread across one face. Three discs are a biased *spatial* sample of
a non-uniformly lit surface; the face-skin mask covers the lit and shadowed
sides both.

**3. The mask was only computed when hair was natural.** The segmentation mask
does two jobs — isolating hair, and bounding the face-skin region — and they
were tied to one answer. Saying "dyed" or "covered" silently switched skin
measurement to the three-disc fallback: a different method for the same
question, chosen by an unrelated answer. This hid fix 2 entirely until the
demo regeneration ran with `--hair=dyed` and the numbers did not move.

**Before and after on `sample-1`** (the deepest demo face):

| | skin L\* | band | rules | model | agreement |
| --- | --- | --- | --- | --- | --- |
| before | 60.4 | medium | True Winter | Light Summer | none |
| after | **37.5** | **deep** | Deep Winter | Deep Winter | **primary** |

`SPECULAR.diffuseBand` (p25-p60 of L\* within a region) lives in
`measure/seasons.config.ts`. The band sits below the median because only one
tail is additive — trimming harder at the top than the bottom is the asymmetry
the physics asks for.

**White balance was ruled out.** `whiteBalanceGains` exists in `color.ts` but
the pipeline never calls it, so the bright white backgrounds were not inflating
anything.

**What is still open.** `sample-5` reads L\* 58.4 — better than 72.8, still
high for the face. Its skin measures **C\* 41**, where real skin sits near
12-25, and the quality gate flags `colour_cast` on all nine demo faces. These
images are graded, not photographed; the residual is the fixture, not the
estimator. `eval/real` is what settles it.

`scripts/dev/overlayBrowser.ts` had its own copy of the statistic, so the tool
for checking the measurement silently disagreed with it. It now imports the
same function.

**Gallery rule.** A sample shows a season plainly only when the rules and the
model agree at **primary** level and the gate found no colour cast. Otherwise
it shows the rules' primary with a `measured` tag and is flagged for review. A
model-only label is never shown.

### 2026-09-20 — `looks` pushed classification past its token budget

Adding `looks` to the classification schema made the longest responses truncate
mid-JSON, surfacing as `Expected ',' or '}' after property value` — a parse
error that reads like a bad model rather than a budget that ran out. Found on
`sample-1`, the deepest-skinned demo face, which produces the longest prose.

Reasoning tokens count against `max_tokens` on `google/gemini-3.8-flash`, so the
8192 default had less headroom than it appeared to. `MAX_TOKENS_CLASSIFY` now
defaults to **12288**. Worth re-checking whenever the schema grows again.

### 2026-09-20 — specular highlights were inflating skin L* by up to 15

Two deep-skinned demo faces came back labelled **Light Summer** and **Light
Spring** — impossible, since the light seasons are light in value by
definition. Hybrid had run correctly; the measurement was wrong.

Cause: the region estimator took a plain median over each sampled patch, and
those patches are the three most specular points on a studio-lit face. Measured
on `sample-1`:

| patch | L\* | C\* |
| --- | --- | --- |
| lit cheekbone | 32.9 | 21.2 |
| mid-forehead | **68.3** | 17.8 |
| pooled median (what we used) | 60.4 | 27.7 |
| face-wide median | 45.8 | — |

A 35-point spread across one face. Specular reflection is **additive and
one-sided** — a highlight can only raise L\*, never lower it — so a median over
a lit patch is a biased estimator, and the bias grows with gloss. It was worst
on the deepest skin, where specular-to-diffuse contrast is highest, which is
exactly the direction that turns a deep face into a light season.

Two fixes, both structural rather than tuned:

1. `diffusePixels()` takes the **p15-p50 band of L\*** within a region before
   the median (`SPECULAR.diffuseBand` in `measure/seasons.config.ts`). The
   highlight is in the upper tail, shadow in the lower.
2. The componentwise medians now come from the **same subset of pixels**.
   Taking `median(L)`, `median(a)`, `median(b)` independently describes a
   colour no pixel in the patch ever had — a strange thing to hand a
   classifier that reasons about hue.

`sample-1` moved 60.4 → 56.7. Better, not solved: the forehead patch still
dominates. **Deliberately not fixed here.** Reweighting regions is a
measurement-core change, and these nine faces are not photometrically
realistic — all nine measure skin C\* 17-41 where real skin sits near 12-25,
and the quality gate flags `colour_cast` on every one of them. Retuning
against them would be calibrating to the artefact. It belongs in Phase 4
against `eval/real`.

`scripts/dev/overlayBrowser.ts` had its own copy of this statistic, so the tool
for checking the measurement silently disagreed with the measurement. It now
imports the same function.

**Gallery rule.** A sample shows a season plainly only when the rules and the
model agree at **primary** level and the quality gate found no colour cast.
Otherwise it shows the rules' primary with a `measured` tag and is flagged for
review. A model-only label is never shown. With every demo face flagged for
colour cast, all nine currently read as provisional — which is the honest
state of them.

### 2026-09-21 — a blocking font stylesheet cost Home 23 Lighthouse points

Home, Lighthouse mobile (simulated throttling), production build:

| | performance | FCP | LCP | Speed Index |
| --- | --- | --- | --- | --- |
| Google Fonts `<link rel="stylesheet">` in `<head>` | **72** | 3.7 s | 3.7 s | 13.6 s |
| Latin faces self-hosted, two preloaded | **93** | 2.0 s | 2.9 s | 2.0 s |
| …and Home no longer a lazy route chunk | **95-96** | 1.9 s | 2.6 s | 1.9 s |

A render-blocking stylesheet also blocks every script after it, so React could
not start until fonts.googleapis.com had answered — on the run above that took
5.4 s, during which the page was blank. The stylesheet was there before the
Home port; the port is what measured it.

Latin faces now live in `client/src/assets/fonts/` (OFL, unmodified), declared
in `src/styles/fonts.css`, hashed into `/assets/` by Vite — which the service
worker already caches as immutable, so an installed Aura keeps its typography
offline. The Arabic faces stay on Google but load as `media="print"` and flip
on load; nothing can select `[dir="rtl"]` yet. `tests/fonts.test.ts` fails if a
blocking font `<link>` comes back.

Accessibility, best practices and SEO are 100 after the same pass: the
decorative step numerals moved into CSS `content`, the footer line lost an
`opacity: 0.7` that took `--ink-muted` under its 4.5:1 floor, and
`index.html` gained a description, a favicon link and a `robots.txt`.

## Interface strings

Every user-facing string lives in `client/src/i18n/en.ts`, in **British English**
— colour, analyse, jewellery, grey. `ar.ts` is deep-partial against it and falls
back per key; `Key` is derived from `en`, so a mistyped key will not compile.
Content (season names, shade names) and model-written prose are deliberately
outside the catalogue — `client/src/i18n/README.md` says why, and what to do
instead.

Layout is direction-agnostic: logical CSS properties only, with the four cases
mirroring cannot fix collected in the `[dir="rtl"]` block of `index.css`. There
is no locale switcher yet; `?lang=ar` selects one and sticks.

The classification and chat prompts are told to write British English too, since
their output is rendered verbatim beside the catalogue's.

## Screens

**Home** is a port of the Lovable landing page (`aura-color-reveal`,
`src/pages/Index.tsx`): its structure, pacing and motion, with our buttons,
mono eyebrows and colour tokens. Order: hero → season marquee → three steps →
what you get → closing CTA → footer. Sections live in `client/src/pages/home/`,
styles in `home-landing.css`.

- **No colour is written on Home.** The marquee's twelve cards and the "what you
  get" panel read `seasonPalettes`, `seasonMakeup` and `seasonStyle` through
  `pages/home/seasonData.ts`; a card's one-line descriptor is cut from the
  season's own `story` by `seasonDescriptor()`. `tests/homeLanding.test.ts`
  asserts every hex against `getCanonicalPalette()` and that no Home component
  contains a hex literal; `npm run e2e:home` asserts the same of the painted DOM.
- **The motion budget is one ambient effect** — the hero particle canvas — plus
  the marquee and a mount entrance. No starfield, shimmer or pulsing glow on
  Home. Reduced motion mounts no canvas, renders no marquee clone (the belt
  becomes a static row that scrolls inside its own window) and runs no entrance.
  The marquee pauses on hover (only where hover is real), touch and focus.
- **One display face everywhere:** `--font-display` is Cormorant Garamond.
- `npm run e2e:home` (`scripts/dev/home.ts`) builds the client, serves it,
  writes `dev/home-390.png` and `dev/home-1440.png`, and checks horizontal
  scroll, section order, CTA wiring and reduced motion. It makes no API call
  and costs nothing.

Results is four tabs — Overview, Beauty, Style, Shop — rendered as text links
on a rule, with the tab in the URL (`?tab=beauty`) so it survives a reload and
can be linked to. `/before-you-buy/:id` redirects to `?tab=shop`.

One rule decides every colour element: **a colour is a flat rectangle, a
product is a render.** Only nails, metal discs and gem facets are photographed;
everything else is stated flat. A flat rectangle is an honest statement of a
colour, a rendered dab is a guess at a texture nobody supplied.

Canonical data, all on the same contract — the model may name a shade but never
assigns a hex:

| data | module |
| --- | --- |
| palettes, neutrals, metals | `server/utils/seasonPalettes.ts` |
| makeup shades, finishes, undertone and skip lines | `server/utils/seasonMakeup.ts` |
| gemstones, hair colours, hair avoids, metal notes | `server/utils/seasonStyle.ts` |

`npx tsx scripts/exportShadeReview.ts` writes all of it to
`design/makeup-review.md` as tables for human review, since colour judgement is
not something a test can make.

`looks` is the one place the model names shades: it writes the look name, vibe
line and day/evening tag and picks shades **by name** from the season's list.
`validateLooks()` resolves every name server-side, drops what does not resolve
rather than substituting, and logs the misses so prompt drift is visible.

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

`npm run shots` (`scripts/dev/shots.ts`) photographs every screen and state at
390 and 1440 into `dev/shots/<route>-<width>.png` and prints the list: Home,
Upload, the sample gallery, Loading held at stage 3 of 5, the four Results tabs
for demo face 1, Before You Buy with a result, chat open, and the
quality-failure and system-error panels. It boots its own API and Vite, blocks
`/api/analyze` outright and stubs the shop check, so it spends nothing; the
stubbed file is marked in the list, and `-- --live` makes the one real call
instead. Run it before and after any visual change.

`/dev/` is gitignored — anchored, because a bare `dev/` also swallowed
`scripts/dev/`. `scripts/dev/_*.ts` are scratch and stay ignored. The overlay draws the sampled discs per region, the hair and face-skin
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
