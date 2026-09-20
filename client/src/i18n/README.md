# i18n

One catalogue, two locales, no library.

```
en.ts      the English catalogue — the source of truth
ar.ts      Arabic, deep-partial against en, falling back per key
types.ts   Catalogue / Key / DeepPartial, all derived from en
index.tsx  LocaleProvider, useT, useI18n, translate, detectLocale
```

## Using it

```tsx
const t = useT();
<h1>{t("results.beauty.title")}</h1>
<p>{t("results.showingFor", { season: seasonName })}</p>
```

`Key` is a union of every dotted path in `en.ts`, so a typo is a compile error
rather than a string that reads `results.beuty.title` in production. Keys held
in a table (`labelKey`, `captionKey`, the stage list in `LoadingScreen`) should
be typed `Key` for the same reason.

`translate(locale, key, vars)` is the unbound form, for tests and for code that
runs outside a component.

## What belongs here

Interface copy: labels, headings, buttons, hints, `aria-label`s, error
messages, placeholder text.

## What does not

**Content.** Season names, palette colour names, makeup shade names and their
descriptions. Those come from the API or from the data modules beside
`seasonPalettes.ts`, they have their own source of truth, and localising them is
a separate job — a shade is named by whoever makes it.

**Model-written prose.** `seasonStory`, `seasonTagline`, tips and chat replies
are generated per analysis. They are told to write British English in
`server/prompts/colorAnalysis.ts`; they cannot be translated from a table.

**The Home feature preview's content.** `FeatureMockup` still holds a mock
season and mock product names. Only its chrome labels are in the catalogue.
Sprint rule 10 replaces that content with real demo-face analyses, and
translating placeholders first would be work thrown away.

## Adding a string

Put it in `en.ts` under the screen that shows it, in British English. Leave
`ar.ts` alone unless you can write the Arabic — a missing key falls back and
shows up as work remaining; a machine-filled one hides it.

## Switching locale

There is no switcher in the UI yet — the screens it would live on are still
being built. Use `?lang=ar`, which sticks for the session, or call `setLocale`
from `useI18n()`.

## RTL

`LocaleProvider` sets `<html lang dir>`; everything else follows from CSS being
logical rather than physical. Use `marginInlineStart`, `borderInlineStart`,
`paddingInlineEnd`, `textAlign: "start"`, `inset-inline`. Two tests in
`tests/i18n.test.ts` fail on any `marginLeft`-style property coming back.

Four things direction alone does not fix, all in the `[dir="rtl"]` block of
`index.css` (design system §07):

- **The swatch band reverses.** It is a numbered sequence, so swatch 01 has to
  stay at the reading edge. Mark such a row `.palette-band`.
- **Arabic is never letterspaced.** The design's tracked Latin caps labels
  carry their emphasis in weight instead, and `text-transform: uppercase` is
  dropped because the script has no case.
- **Numbers, hex codes and IDs stay LTR** inside an isolated run — wrap them in
  `.ltr-run` so bidi does not reorder `#C9A567`.
- **Gradients have no logical keywords.** `to left` / `to right` are swapped by
  hand for the two nav edge fades.
