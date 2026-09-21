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
| Results — Beauty tab | client/src/pages/results/BeautyTab.tsx, client/src/data/seasonBeautyGuide.ts (blush, lips, eyes, bronzer, nails, foundationTip), client/public/makeup/foundation/*.webp |
| Results — Style tab | server/utils/seasonPalettes.ts (metals, avoid), client/src/data/seasonBeautyGuide.ts (gemstones), client/src/data/hairShadeLibrary.ts, client/src/pages/results/StyleTab.tsx |
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

## Beauty / Style tabs — data notes (Light Spring)
- There is no seasonMakeup.ts on v2. Shades come from client/src/data/seasonBeautyGuide.ts; metals and avoid colours from server/utils/seasonPalettes.ts; hair from client/src/data/hairShadeLibrary.ts.
- No liner category exists in the data. The Liner column is composed from the deepest eyes[] shades plus the bronzer ladder's deepest step, and should become a real field.
- The five Base depths render the app's own swatch images, copied into this project from client/public/makeup/foundation/ (fair-porcelain, light-ivory, warm-ivory, warm-sand, golden-beige). Sampled true colours: #EED3C1, #EDCBAF, #ECC095, #D3A475, #D09D6D.
- The live BeautyTab.tsx does NOT use named depth swatches — it renders a 6-stop WARM_UNDERTONES gradient bar with a gold diamond at the colorDNA depth percentage. The five-swatch ladder is a design proposal; wiring it needs a depth-name → file resolver like gemstoneImage.ts / hairColorImage.ts, which does not exist for foundation yet.
- getHairShadesForSeason("Light Spring") returns exactly ONE shade (Honey Highlights). The other three cards are Spring-family neighbours, badged "spring family" in the design. Light Spring is missing from most seasons[] arrays in the library.
- Gemstone hex + accent are real (GEMS table); the live tab draws them via GemFacet. Metal swatches here are rendered gradients — the codebase stores metals as name strings and renders MetalCircle from METAL_FILE_MAP, which only maps three files (gold, silver, rose-gold), so Champagne Gold has no asset.
- StyleTab.tsx splits metals into "Your metals" / "Not yours" across ALL_METALS rather than listing palette.metals.avoid; the designs show the palette's explicit avoid list instead.

## Beauty / Style — gemstone + jewellery assets
- Gemstones now render the user's supplied stone photographs, background-removed (corner flood fill + 1px alpha feather) from uploads/*.webp into gems/*.png. Light Spring uses citrine, opal, rose-quartz, peridot.
- Jewellery renders the app's own metal images copied from client/public/makeup/metals/ (gold, rose-gold, silver). Mapping follows METAL_FILE_MAP: Yellow Gold→gold, Rose Gold→rose-gold, Silver→silver, Platinum→silver. Champagne Gold keeps a CSS gradient and is labelled "no asset" — there is no file and no METAL_FILE_MAP entry for it.
- MetalCircle exports ALL_METALS = ["Rose Gold","Silver","Gold"] — only three — so StyleTab.tsx's "Your metals / Not yours" split can never surface Champagne Gold or Platinum as distinct entries, though both appear in the Light Spring palette. Needs widening for the designs to be implementable as drawn.
- Nails render the user's supplied polish photographs, background-removed the same way, from uploads/*.webp into nails/*.png. Light Spring uses bubble-bath, sheer-bliss, angel-food, pink-ing-of-you, strawberry-margarita, watermelon. Filenames follow the NAIL_SHADES keys in seasonBeautyGuide.ts slugified; the three avoid shades (midnight-cami, malaga-wine, charged-up-cherry) are uploaded but not yet placed.
- Section naming in the designs: "Jewellery" (was Metals) and "Gemstones"; both now appear on the Beauty page as well as the Style tab.
