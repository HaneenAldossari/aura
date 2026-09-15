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
