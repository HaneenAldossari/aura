# Eval harness

```bash
npx tsx eval/run.ts                       # default model, all three modes
npx tsx eval/run.ts --models gemini-flash,gemini-pro,claude-sonnet,claude-opus,gpt-mini
npx tsx eval/run.ts --modes hybrid --confusion
npx tsx eval/run.ts --bootstrap           # triage eval/inbox/ by agreement
npx tsx eval/serveLabeller.ts             # http://localhost:5199
```

## The rule

Two directories, never mixed.

| | contents | role |
| --- | --- | --- |
| `eval/real/` | labelled real photos | **the only source of the accuracy number** |
| `eval/synthetic/` | AI-generated faces | pipeline smoke tests, excluded from every metric |

A generated face has no ground-truth colouring. Scoring a classifier against one
measures agreement between two models, not correctness — it would inflate the
headline figure and hide real regressions.

A row counts toward accuracy only when `dataset=real` **and** `source≠consensus`.
Consensus labels are machine-agreed, so trusting them would be the same
circularity one level up. `--include-consensus` reports them separately.

## Photo requirements for `eval/real/`

Natural daylight near a window · no makeup · no filters or beauty mode · hair
visible if it is natural · neutral background · phone camera defaults · one face.

**Deliberately seek out deep skin tones and natural hair.** Measured across the
nine demo faces, skin L\* runs 60.4–82.7: eight land in the "light" band, one in
"medium", none in "deep". The deep band's hue and chroma thresholds are the ones
most likely to be wrong — melanin raises b\*, inflating both — and nothing
currently exercises them. The harness reports accuracy per band so a bias there
cannot hide inside a mean.

## Modes

| mode | what it does |
| --- | --- |
| `rules_only` | `score()` over measured features. No model call, no cost. |
| `llm_only` | the model sees the photo alone. |
| `hybrid` | the model sees the photo **and** the measured colour values as ground truth — never the rule-based ranking, so the agreement figure is not measuring its own suggestion. |

## Metrics

top-1 · top-2 (the prediction's own runner-up or a flow-circle neighbour) ·
per-axis hue/value/chroma · per skin-lightness band · 12×12 confusion matrix
(`--confusion`) · model-vs-rules agreement · mean confidence when right vs wrong ·
latency · cost.

Per-axis matters because top-1 flattens two different failures: Soft Autumn
called Soft Summer is a hue miss on an otherwise correct read, while Soft Autumn
called Bright Winter is wrong on every axis. Both cost one point.

## Files

Photos are gitignored; only `labels.csv` is committed. `eval/results/<timestamp>.json`
holds the full per-photo record of each run.

## Cost

Roughly $0.009 per model call. The matrix is *providers × LLM modes × photos* —
five models × two LLM modes × fifty photos is about $4.50. `run.ts` prints the
estimate before it starts.
