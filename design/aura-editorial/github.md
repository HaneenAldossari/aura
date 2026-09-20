repo: HaneenAldossari/aura
branch: v2
local path: aura-v2 (attached local folder — the current app; the GitHub `main` branch is the older version)

## Last sync
date: 2026-09-16T04:16:00Z

### Updated in this project
- Loading rebuilt on the five real client pipeline stages, with the two model downloads shown as downloads.
- Confidence is numeric again (89%) and `secondarySeason` restored as the "next closest" line.
- Results now shows the measured per-region readings (skin, hair, eyes) and a non-blocking second-photo suggestion for `needsSecondPhoto`.
- Added a Home screen at desktop and phone width.

## Screen map

| Project screen | Source files (aura-v2) |
| --- | --- |
| Home | client/src/pages/Home.tsx, client/src/pages/home/HeroSection.tsx, client/src/components/StarField.tsx, server/utils/seasonPalettes.ts (the ribbon's twelve palettes), client/src/data/colorDNA.ts, measure/pipeline.ts (prefetchModels — why "happens once" is true) |
| Upload | client/src/pages/Analysis.tsx, measure/quality.ts, measure/pipeline.ts (hairStatus: natural / dyed / covered) |
| Loading | client/src/pages/analysis/LoadingScreen.tsx (ANALYSIS_STAGES), measure/pipeline.ts (StageName, StageEvent), measure/stageQueue.ts |
| Results | client/src/lib/types.ts (AnalysisResult, MeasuredSummary, RegionReading), server/normalizeResult.ts, server/utils/seasonPalettes.ts, measure/features.ts |
| Before You Buy | server/services/linkChecker.ts, client/src/lib/types.ts (LinkCheckResultData), measure/productColor.ts |
| Aura Design System | visual direction is original — not derived from client/src/index.css or theme.ts. Motion section: client/src/components/StarField.tsx, BounceCards.tsx, BounceCards.css |

## Notes
- `measured` is CIE **LCh** per region (`RegionReading { L, C, h }`), not raw Lab — the designs label it L / C / h accordingly. The loading copy says "CIE Lab" because that is the app's own wording in LoadingScreen.tsx.
- `needsSecondPhoto` is a suggestion, never a gate (CLAUDE.md, Phase 4 calibrates thresholds) — the design treats it as a dismissible nudge, not a blocker.
- `hairAvailable: false` is what the hair-assumption note on Results covers.
- ΔE is deliberately omitted from "closest palette colour" until the next backend phase.
- Confidence: the model may emit a 0–1 float or a string; `normalizeResult` renders 0–100.
- The hero is now a drifting twelve-palette ribbon, chosen over the season-card fan. It has no counterpart in the codebase: the live hero is `HeroSection.tsx` + `DrapeWall`, and `BounceCards` / `homeData.bounceCardData` are unmounted. The ribbon is a new build, so its motion is recorded as "proposed" in the design system.
- Motion in the design system is split: values marked "as built" are read from StarField.tsx / BounceCards; "proposed" values are not in the code yet. BounceCards does not respect `prefers-reduced-motion`.
- The ribbon's 45% dim applies to the palette bars only. Season names stay at full opacity and shift #8C8378 → #C9A567 instead, because 13px type at 45% measures about 3:1.
