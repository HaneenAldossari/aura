# Makeup section — design-system extension

Specified 2026-09-20. Builds at UX step 8 (Results). No new design frames; this
extends `Aura Design System.dc.html` using language already in it.

## Why it changes

The current BeautyTab renders circular swatches and `ShadeDab` dabs. The design
system's colour language is the flat bar — the 12-swatch palette band — and two
colour vocabularies on one screen read as two products. Makeup adopts the bar.

**The only figurative element in the section is a flat nail silhouette**, used
for nail shades, where a bar genuinely fails to say what the colour is for.

## Three subsections

### 1. Base
- A **foundation depth ladder** — the season's depth range as stepped bars.
- **One line of undertone guidance** beneath it.

### 2. Looks
**2–3 named looks per season.** Each look carries:
- a name and a **one-line vibe**,
- a **day / evening** tag,
- **4–5 shade bars**: eye, liner, cheek, lip, and optionally bronzer or
  highlight — each labelled with its **shade name and finish**.

Names and vibe lines use modern beauty vocabulary, not colour-theory prose.

### 3. Shade index
A compact table by category — **blush, lip, eye, liner, nails** — 3–5 shades
each with finish, plus a **one-line "skip"** drawn from `avoidColors`.

## Data layer

A **canonical makeup shade list per season** lives beside
`server/utils/seasonPalettes.ts`. Each shade: `name`, `hex`, `category`,
`finish`.

**`looks` is added to the classification schema.** The model:
- picks shades **by name** from that canonical list,
- writes the look names and vibe lines.

**Hexes always come from the data, never from the model** — the same rule that
makes `getCanonicalPalette()` unable to miss, applied to makeup. Every
referenced shade name is **validated to exist** in the canonical list; a
reference that does not resolve is an error, not a silent drop.

Arabic strings follow through i18n like every other string.
