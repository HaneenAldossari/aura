/**
 * Canonical style shades per season: gemstones and hair colours.
 *
 * Same contract as seasonPalettes and seasonMakeup — the data owns the hexes.
 * These were prose from the model until now ("deep chestnut with warm caramel
 * highlights"), which cannot be rendered as colour and varied run to run. The
 * Style tab is visual, so it needs values.
 *
 * Metals are not duplicated here: they are already canonical in
 * seasonPalettes.ts as `metals.best` / `metals.avoid`, and a second copy would
 * be a second thing to keep in step.
 */

export interface StoneShade {
  name: string;
  /** Body colour of the stone — the fallback when no render exists. */
  hex: string;
  /** Facet highlight, for the two-tone fallback swatch. */
  accent: string;
  /** Slug of a photographed render under /makeup/gems/. */
  asset?: string;
}

export interface HairShade {
  name: string;
  hex: string;
  /** Lighter strand colour, for the gradient swatch. */
  accent: string;
}


/** A metal, with a verdict a reader can act on and a reason short enough to scan. */
export interface MetalVerdict {
  name: string;
  verdict: "best" | "works" | "skip";
  /** Five words. Long enough to say why, short enough to read in a row. */
  reason: string;
}

/** Three colours from the season's canonical palette, and when to wear them. */
export interface Pairing {
  colours: [string, string, string];
  when: string;
}

/**
 * The sentences that open each Style section, before any colour is shown.
 *
 * Canonical, like the shades: the model does not write these, so two people
 * with the same season read the same advice. Avoids live inside the guidance
 * rather than in a block of their own — "avoid ash tones" belongs in the
 * sentence about hair, not in a separate list nobody connects to it.
 */
export interface StyleGuidance {
  jewellery: string;
  hair: string;
  pairings: string;
}

export interface SeasonStyle {
  guidance: StyleGuidance;
  /** Two or three sentences on what this season is, in the second person. */
  story: string;
  /** Yellow gold, rose gold, silver — always these three, always in this order. */
  metals: MetalVerdict[];
  /** Warm seasons name the extra metals that also work; cool seasons are null. */
  extraMetals: string | null;
  pairings: Pairing[];
  gemstones: StoneShade[];
  hair: HairShade[];
  /** Shown struck through under Hair — the directions that fight the season. */
  hairAvoid: HairShade[];
}

const g = (name: string, hex: string, accent: string, asset?: string): StoneShade =>
  ({ name, hex, accent, asset });
const h = (name: string, hex: string, accent: string): HairShade => ({ name, hex, accent });

const STYLE: Record<string, SeasonStyle> = {
  "deep autumn": {
    guidance: {
      jewellery:
        "Warm metals, and the deeper the finish the better. Polished silver sits on your skin like a cold spot.",
      hair:
        "Keep your hair warm and deep. Chestnut, auburn and warm espresso suit you; avoid ash tones and platinum, which grey you instantly.",
      pairings:
        "Build outfits from your darks and let one warm colour do the talking. Pale, cool shades belong away from your face.",
    },
    story:
      "Yours is the deepest and warmest of the autumns — rich before it is bright. Saturated earth tones read as natural on you, where pale or cool shades drain the face and leave the eyes doing all the work. You can wear more depth than almost anyone, provided it stays warm.",
    metals: [
      { name: "Yellow gold", verdict: "best", reason: "Warm and deep, like you" },
      { name: "Rose gold", verdict: "works", reason: "Softer, but still reads warm" },
      { name: "Silver", verdict: "skip", reason: "Cold against a deep warmth" },
    ],
    extraMetals: "copper, bronze",
    pairings: [
      { colours: ["Espresso", "Burnt Brick", "Deep Cream"], when: "Everyday, when you want depth without effort" },
      { colours: ["Deep Olive", "Camel", "Bronze"], when: "Daytime, offices, anything that needs to look considered" },
      { colours: ["Warm Burgundy", "Dark Chocolate", "Deep Cream"], when: "Evening, and anywhere you want to look expensive" },
      { colours: ["Pine Green", "Bronze", "Camel"], when: "Autumn and winter layers, coats and knitwear" },
    ],
    gemstones: [
      g("Tiger's Eye", "#825A1D", "#B69F7C", "tigers-eye"),
      g("Garnet", "#693032", "#A88788", "garnet"),
      g("Emerald", "#12724B", "#76AD97", "emerald"),
      g("Amber", "#C89523", "#DFC27F", "amber"),
    ],
    hair: [
      h("Dark Chocolate", "#3B2416", "#6A4526"),
      h("Warm Espresso", "#24160F", "#4E3220"),
      h("Deep Auburn", "#5A2418", "#96442A"),
      h("Burnished Chestnut", "#4A2A18", "#8A5A2B"),
    ],
    hairAvoid: [
      h("Ash Blonde Highlights", "#B8A88E", "#DED2BE"),
      h("Platinum Blonde", "#D8D4CC", "#F2F0EC"),
    ],
  },
  "true autumn": {
    guidance: {
      jewellery:
        "Yellow gold and copper. Warmth is the point, so do not tone it down.",
      hair:
        "Keep your hair golden-warm. Chestnut, copper and rich auburn suit you; avoid ash and blue-black, which flatten your colouring.",
      pairings:
        "Earth tones layered on earth tones, with one clear warm accent. Nothing here should look cool.",
    },
    story:
      "You are the most purely warm of the twelve — golden, earthy and unmistakably autumn. Rust, olive and bronze look like your natural colouring rather than a choice, and the cooler a colour gets the harder your face has to work. Your best outfits look as though they were dyed with plants.",
    metals: [
      { name: "Yellow gold", verdict: "best", reason: "The warmest metal, your default" },
      { name: "Rose gold", verdict: "works", reason: "Warm enough, slightly softer edge" },
      { name: "Silver", verdict: "skip", reason: "Goes grey against your gold" },
    ],
    extraMetals: "copper, bronze",
    pairings: [
      { colours: ["Rust", "Olive Green", "Warm Cream"], when: "Everyday, and the easiest place to start" },
      { colours: ["Chocolate Brown", "Mustard", "Warm Cream"], when: "Daytime, tailoring, anything structured" },
      { colours: ["Forest Olive", "Golden Yellow", "Warm Cream"], when: "Evening, dinners, warm lighting" },
      { colours: ["Pumpkin", "Olive Green", "Chocolate Brown"], when: "Weekends and outdoors" },
    ],
    gemstones: [
      g("Carnelian", "#9D2913", "#C68376", "carnelian"),
      g("Topaz", "#BB862D", "#D8B985", "topaz"),
      g("Jade", "#468254", "#94B69C", "jade"),
      g("Tiger's Eye", "#825A1D", "#B69F7C", "tigers-eye"),
    ],
    hair: [
      h("Warm Chestnut", "#5A3620", "#96602F"),
      h("Golden Copper", "#8A4A20", "#C87A38"),
      h("Rich Auburn", "#6E2E18", "#A8542A"),
      h("Caramel Brown", "#7A4E2A", "#B4854A"),
    ],
    hairAvoid: [
      h("Ash Brown", "#5E5652", "#8E8680"),
      h("Blue Black", "#141418", "#3A3A48"),
    ],
  },
  "soft autumn": {
    guidance: {
      jewellery:
        "Antique and brushed finishes. Anything highly polished is brighter than your face and takes attention from it.",
      hair:
        "Keep your hair soft and warm. Mocha, muted chestnut and dusty caramel suit you; avoid jet black and platinum, which are both too strong for your contrast.",
      pairings:
        "Keep every piece close in depth. Your outfits work through blending, not contrast.",
    },
    story:
      "Yours is the gentlest of the autumns — warm, but so muted that brightness reads as noise on you. Dusty, blended colours let your face be the most interesting thing in the outfit, which is exactly the effect you want. The moment an outfit has a sharp edge in it, the edge is all anyone sees.",
    metals: [
      { name: "Yellow gold", verdict: "best", reason: "Warm, best in brushed finishes" },
      { name: "Rose gold", verdict: "best", reason: "Soft warmth, made for you" },
      { name: "Silver", verdict: "skip", reason: "Too cool and too bright" },
    ],
    extraMetals: "antique gold, bronze",
    pairings: [
      { colours: ["Camel", "Dusty Coral", "Warm Beige"], when: "Everyday, the easiest outfit you own" },
      { colours: ["Olive", "Cream", "Soft Terracotta"], when: "Daytime, anything that needs to look calm" },
      { colours: ["Warm Teal", "Warm Beige", "Camel"], when: "Evening, kept quiet" },
      { colours: ["Muted Salmon", "Cream", "Olive"], when: "Weekends and layers" },
    ],
    gemstones: [
      g("Smoky Quartz", "#6B5B4B", "#A9A097", "smoky-quartz"),
      g("Peridot", "#7A863C", "#B2B98E", "peridot"),
      g("Rose Quartz", "#C89B9D", "#DFC5C6", "rose-quartz"),
      g("Pearl", "#C3C1B9", "#DCDBD6", "pearl"),
    ],
    hair: [
      h("Soft Mocha", "#5E4632", "#96785A"),
      h("Muted Chestnut", "#6A4A34", "#A0805E"),
      h("Warm Ash Brown", "#5A4A3E", "#8E7A66"),
      h("Dusty Caramel", "#7A5C40", "#B09070"),
    ],
    hairAvoid: [
      h("Jet Black", "#0D0D10", "#38383F"),
      h("Platinum Blonde", "#D8D4CC", "#F2F0EC"),
    ],
  },

  "deep winter": {
    guidance: {
      jewellery:
        "Silver, platinum and white gold. Yellow gold muddies the contrast that makes your colouring work.",
      hair:
        "Keep your hair deep and cool. Blue-black, cool espresso and dark ash suit you; avoid golden and copper tones, which turn brassy against your skin.",
      pairings:
        "Work from black and true white, with one saturated jewel colour. Your palette is built for contrast.",
    },
    story:
      "You carry the most contrast of any season — deep, cool and clear all at once. Black and true white are genuinely yours, and a jewel tone beside them looks deliberate rather than loud. Muted and earthy colours are the ones that let you down; they blur an outline that should stay sharp.",
    metals: [
      { name: "Yellow gold", verdict: "skip", reason: "Turns brassy against your skin" },
      { name: "Rose gold", verdict: "skip", reason: "Warmth muddies your cool depth" },
      { name: "Silver", verdict: "best", reason: "Cool and clear, like you" },
    ],
    extraMetals: null,
    pairings: [
      { colours: ["Black", "Pure White", "Cranberry"], when: "Everyday, and the outfit that always works" },
      { colours: ["Deep Navy", "Charcoal", "Emerald"], when: "Daytime and offices" },
      { colours: ["Black", "Emerald", "Pure White"], when: "Evening, and anywhere you want presence" },
      { colours: ["Burgundy", "Charcoal", "Pure White"], when: "Winter layers and coats" },
    ],
    gemstones: [
      g("Garnet", "#693032", "#A88788", "garnet"),
      g("Ruby", "#822635", "#B6818A", "ruby"),
      g("Emerald", "#12724B", "#76AD97", "emerald"),
      g("Amethyst", "#563776", "#9D8BB0", "amethyst"),
    ],
    hair: [
      h("Blue Black", "#141418", "#3A3A48"),
      h("Cool Espresso", "#2A1E1A", "#544038"),
      h("Deep Mahogany", "#3A1820", "#70303C"),
      h("Dark Ash Brown", "#332C2A", "#5E524E"),
    ],
    hairAvoid: [
      h("Golden Blonde", "#C09A4E", "#E8CE8A"),
      h("Warm Copper", "#B4682E", "#E09A5E"),
    ],
  },
  "true winter": {
    guidance: {
      jewellery:
        "Cool metals only. Silver reads clean on you; gold reads dirty, every time.",
      hair:
        "Keep your hair cool and dark. True black and cool dark brown suit you; avoid honey, caramel and warm auburn, which go orange against your undertone.",
      pairings:
        "Pure colour against pure neutral. You are the one season that can wear true white and true black without adjustment.",
    },
    story:
      "You are cool right through — blue-based, clear and high in contrast. Icy brights and true jewel tones look effortless on you, and the stark combinations other people avoid are the ones that suit you best. Anything warm, dusty or beige takes your clarity away and gives nothing back.",
    metals: [
      { name: "Yellow gold", verdict: "skip", reason: "Reads dirty on cool skin" },
      { name: "Rose gold", verdict: "skip", reason: "Warm cast fights your cool" },
      { name: "Silver", verdict: "best", reason: "Blue-based, matches your undertone" },
    ],
    extraMetals: null,
    pairings: [
      { colours: ["Pure White", "Black", "Blue-Red"], when: "Everyday, and the sharpest thing you own" },
      { colours: ["Royal Blue", "Icy Gray", "Pure White"], when: "Daytime and offices" },
      { colours: ["Black", "Fuchsia", "Pure White"], when: "Evening, when you want to be seen" },
      { colours: ["Emerald Green", "Black", "Icy Gray"], when: "Winter layers" },
    ],
    gemstones: [
      g("Sapphire", "#204081", "#7E90B6", "sapphire"),
      g("Diamond", "#8892A0", "#BAC0C8", "diamond"),
      g("Ruby", "#822635", "#B6818A", "ruby"),
      g("Smoky Quartz", "#6B5B4B", "#A9A097", "smoky-quartz"),
    ],
    hair: [
      h("True Black", "#101013", "#38383F"),
      h("Cool Dark Brown", "#2E2622", "#5A4C46"),
      h("Ash Brown", "#453A38", "#786864"),
      h("Icy Platinum", "#D2D0CC", "#F2F0EC"),
    ],
    hairAvoid: [
      h("Honey Blonde", "#B4894E", "#E0C08A"),
      h("Warm Auburn", "#8A4A24", "#BE7A48"),
    ],
  },
  "bright winter": {
    guidance: {
      jewellery:
        "High-polish silver and platinum. Matte and brushed finishes dull the clarity you carry.",
      hair:
        "Keep your hair cool and clear. Jet black and cool chocolate suit you; avoid mousy and golden tones, which go flat against your brightness.",
      pairings:
        "One vivid colour, one crisp neutral. Your outfits should look switched on.",
    },
    story:
      "You are winter at its clearest — cool, bright and built for saturated colour. Vivid shades against a crisp neutral look considered on you, where anything dusty or greyed reads as a mistake. Your face can hold more brightness than almost any other season, and it looks wrong without it.",
    metals: [
      { name: "Yellow gold", verdict: "skip", reason: "Warm and dull against you" },
      { name: "Rose gold", verdict: "skip", reason: "Softens what should stay sharp" },
      { name: "Silver", verdict: "best", reason: "Bright and clean, like you" },
    ],
    extraMetals: null,
    pairings: [
      { colours: ["Pure White", "Black", "Magenta"], when: "Everyday, and hard to get wrong" },
      { colours: ["Electric Blue", "Pure White", "Black"], when: "Daytime, anything that needs energy" },
      { colours: ["Black", "Emerald", "Pure White"], when: "Evening, and anywhere you want presence" },
      { colours: ["Fuchsia", "Black", "Icy Blue"], when: "When you want the room to notice" },
    ],
    gemstones: [
      g("Moonstone", "#B4BFCB", "#D4DAE1", "moonstone"),
      g("Emerald", "#12724B", "#76AD97", "emerald"),
      g("Amethyst", "#563776", "#9D8BB0", "amethyst"),
      g("Garnet", "#693032", "#A88788", "garnet"),
    ],
    hair: [
      h("Jet Black", "#0D0D10", "#38383F"),
      h("Cool Chocolate", "#2E211E", "#5A4440"),
      h("Bright Ash", "#4A4240", "#84766F"),
      h("Clear Platinum", "#D8D6D2", "#F5F3EF"),
    ],
    hairAvoid: [
      h("Muted Mousy Brown", "#6E6258", "#9E9288"),
      h("Golden Caramel", "#A8763A", "#D4A870"),
    ],
  },

  "light spring": {
    guidance: {
      jewellery:
        "Light, bright gold. Heavy antique finishes sit too dark against a delicate face.",
      hair:
        "Keep your hair light and warm. Honey, golden blonde and light chestnut suit you; avoid ash tones and anything near black, which overwhelm you.",
      pairings:
        "Light colours together, warm throughout. Depth is what costs you, not brightness.",
    },
    story:
      "Yours is the lightest and freshest of the springs — warm, delicate and easily overwhelmed. Peach, coral and clear warm pastels look like they belong to you, while anything dark or heavy takes over the outfit and leaves your face behind it. The trick with your colouring is never adding weight.",
    metals: [
      { name: "Yellow gold", verdict: "best", reason: "Light, warm, made for you" },
      { name: "Rose gold", verdict: "best", reason: "Peachy warmth suits you perfectly" },
      { name: "Silver", verdict: "skip", reason: "Cool and hard beside you" },
    ],
    extraMetals: "light copper",
    pairings: [
      { colours: ["Light Peach", "Ivory", "Coral Pink"], when: "Everyday, and your easiest outfit" },
      { colours: ["Sky Blue", "Ivory", "Camel Beige"], when: "Daytime, offices, anything light" },
      { colours: ["Coral Pink", "Butter Yellow", "Ivory"], when: "Summer, holidays, warm days" },
      { colours: ["Light Warm Teal", "Camel Beige", "Light Peach"], when: "Weekends and warm days" },
    ],
    gemstones: [
      g("Aquamarine", "#8AB1C3", "#BBD2DC", "aquamarine"),
      g("Rose Quartz", "#C89B9D", "#DFC5C6", "rose-quartz"),
      g("Citrine", "#CB9F1E", "#E1C77C", "citrine"),
      g("Pearl", "#C3C1B9", "#DCDBD6", "pearl"),
    ],
    hair: [
      h("Honey Blonde", "#B4894E", "#E0C08A"),
      h("Light Golden Brown", "#8A6238", "#BE9668"),
      h("Strawberry Blonde", "#C08050", "#EDB48A"),
      h("Warm Butter Blonde", "#D2AE72", "#F2DCAC"),
    ],
    hairAvoid: [
      h("Ash Blonde Highlights", "#B0A492", "#D8CEBE"),
      h("Soft Black", "#1A1A20", "#42424C"),
    ],
  },
  "true spring": {
    guidance: {
      jewellery:
        "Clear yellow gold. Warmth is the point on you, so do not tone it down.",
      hair:
        "Keep your hair golden. Honey, golden brown and light auburn suit you; avoid ash and blue-black, which drain the warmth from your skin.",
      pairings:
        "Warm and clear together. Your outfits should look sunlit.",
    },
    story:
      "You are warm and clear in equal measure — the brightest of the warm seasons. Coral, turquoise and golden tones look lit from inside on you, and muting them is what makes you look tired. Your colouring wants colour, and it wants it undiluted.",
    metals: [
      { name: "Yellow gold", verdict: "best", reason: "Clear warm gold, your metal" },
      { name: "Rose gold", verdict: "works", reason: "Warm enough, a softer option" },
      { name: "Silver", verdict: "skip", reason: "Cools down what should glow" },
    ],
    extraMetals: "copper, bronze",
    pairings: [
      { colours: ["Coral", "Warm Ivory", "Turquoise"], when: "Everyday, and the most you-ish outfit" },
      { colours: ["Golden Yellow", "Warm Ivory", "Grass Green"], when: "Daytime and warm weather" },
      { colours: ["Turquoise", "Golden Brown", "Coral"], when: "Holidays and evenings out" },
      { colours: ["Apple Green", "Golden Brown", "Warm Ivory"], when: "Weekends and outdoors" },
    ],
    gemstones: [
      g("Turquoise", "#1B9CB4", "#7BC6D4", "turquoise"),
      g("Carnelian", "#9D2913", "#C68376", "carnelian"),
      g("Citrine", "#CB9F1E", "#E1C77C", "citrine"),
      g("Peridot", "#7A863C", "#B2B98E", "peridot"),
    ],
    hair: [
      h("Golden Blonde", "#C09A4E", "#E8CE8A"),
      h("Warm Copper", "#B4682E", "#E09A5E"),
      h("Golden Brown", "#8A5E2E", "#BE9258"),
      h("Light Auburn", "#A0502A", "#D08A5A"),
    ],
    hairAvoid: [
      h("Ash Brown", "#5E5652", "#8E8680"),
      h("Blue Black", "#141418", "#3A3A48"),
    ],
  },
  "bright spring": {
    guidance: {
      jewellery:
        "Bright polished gold. Anything oxidised or brushed kills the clarity you carry.",
      hair:
        "Keep your hair warm and bright. Golden blonde, vivid copper and clear chestnut suit you; avoid mousy and ashy tones, which go dull against you.",
      pairings:
        "Vivid warm colour against a clean light neutral. You can take more brightness than you think.",
    },
    story:
      "You are the brightest of the springs — warm, clear and high in contrast. Vivid coral, turquoise and clear gold look ordinary on you rather than loud, which is what makes your palette hard for other people to borrow. Softened, dusty versions of your colours are the ones that fail.",
    metals: [
      { name: "Yellow gold", verdict: "best", reason: "Bright warm gold, your default" },
      { name: "Rose gold", verdict: "works", reason: "Warm and clear enough" },
      { name: "Silver", verdict: "skip", reason: "Too cool for your warmth" },
    ],
    extraMetals: "copper",
    pairings: [
      { colours: ["Bright Coral", "Clear Ivory", "Clear Turquoise"], when: "Everyday, and hard to overdo" },
      { colours: ["Clear Turquoise", "Clear Ivory", "Lemon Yellow"], when: "Daytime, anything that needs energy" },
      { colours: ["Bright Coral", "Lemon Yellow", "Clear Ivory"], when: "Evening and warm weather" },
      { colours: ["Lime Green", "Clear Ivory", "Bright Teal"], when: "Weekends and warm days" },
    ],
    gemstones: [
      g("Opal Fire", "#429587", "#91C2B9", "opal-fire"),
      g("Carnelian", "#9D2913", "#C68376", "carnelian"),
      g("Citrine", "#CB9F1E", "#E1C77C", "citrine"),
      g("Peridot", "#7A863C", "#B2B98E", "peridot"),
    ],
    hair: [
      h("Bright Golden Blonde", "#CCA04A", "#F0D68E"),
      h("Vivid Copper", "#C06A2A", "#EE9E56"),
      h("Clear Chestnut", "#7A4A24", "#B47E4E"),
      h("Warm Caramel", "#A0703A", "#D4A870"),
    ],
    hairAvoid: [
      h("Mousy Ash", "#6A6058", "#9A9088"),
      h("Soft Black", "#1A1A20", "#42424C"),
    ],
  },

  "light summer": {
    guidance: {
      jewellery:
        "Silver and white gold, kept light. Heavy metal overwhelms a delicate face.",
      hair:
        "Keep your hair cool and light. Ash blonde and cool light brown suit you; avoid golden and copper tones, which turn brassy on you.",
      pairings:
        "Soft cool colours layered together. Contrast is what costs you.",
    },
    story:
      "Yours is the lightest and coolest of the summers — soft, cool and easily overpowered. Powder blue, soft rose and cool pastels sit on you like they were chosen, while black and strong colour swallow you whole. The lighter and cooler the outfit, the more of your face shows through it.",
    metals: [
      { name: "Yellow gold", verdict: "skip", reason: "Warm and heavy against you" },
      { name: "Rose gold", verdict: "works", reason: "Cool enough if kept pale" },
      { name: "Silver", verdict: "best", reason: "Cool and light, like you" },
    ],
    extraMetals: null,
    pairings: [
      { colours: ["Powder Blue", "Soft White", "Soft Rose"], when: "Everyday, and your easiest outfit" },
      { colours: ["Soft Rose", "Dove Gray", "Soft White"], when: "Daytime and offices" },
      { colours: ["Lavender", "Soft White", "Powder Blue"], when: "Warm weather and evenings" },
      { colours: ["Dove Gray", "Soft Rose", "Lavender"], when: "Weekends and layers" },
    ],
    gemstones: [
      g("Rose Quartz", "#C89B9D", "#DFC5C6", "rose-quartz"),
      g("Moonstone", "#B4BFCB", "#D4DAE1", "moonstone"),
      g("Aquamarine", "#8AB1C3", "#BBD2DC", "aquamarine"),
      g("Amethyst", "#563776", "#9D8BB0", "amethyst"),
    ],
    hair: [
      h("Ash Blonde", "#B0A08A", "#DED2BE"),
      h("Cool Light Brown", "#7A6A5E", "#AC9C8E"),
      h("Platinum Beige", "#CEC4B8", "#EEE6DC"),
      h("Soft Ash Brown", "#665A52", "#98887E"),
    ],
    hairAvoid: [
      h("Warm Golden Blonde", "#C09A4E", "#E8CE8A"),
      h("Jet Black", "#0D0D10", "#38383F"),
    ],
  },
  "true summer": {
    guidance: {
      jewellery:
        "Silver, white gold and cool-cast rose gold. Yellow gold reads brassy on your skin.",
      hair:
        "Keep your hair cool. Ash brown and cool mushroom tones suit you; avoid golden, copper and warm caramel, which go orange against your undertone.",
      pairings:
        "Cool colour against cool neutral, kept soft. Nothing here needs to be bright to work.",
    },
    story:
      "You are cool and soft in equal measure — the most classically summer of the three. Dusty blues, cool roses and soft greys look composed on you, and warmth of any kind is what pulls your face off-key. Your outfits work best when nothing in them is trying very hard.",
    metals: [
      { name: "Yellow gold", verdict: "skip", reason: "Reads brassy on cool skin" },
      { name: "Rose gold", verdict: "works", reason: "Only in its cooler shades" },
      { name: "Silver", verdict: "best", reason: "Cool-toned, matches your skin" },
    ],
    extraMetals: null,
    pairings: [
      { colours: ["Slate Blue", "Soft White", "Rose"], when: "Everyday, and always correct" },
      { colours: ["Cool Pink", "Blue Gray", "Soft White"], when: "Daytime and offices" },
      { colours: ["Mauve", "Slate Blue", "Blue Gray"], when: "Evening, kept understated" },
      { colours: ["Blue Gray", "Soft White", "Periwinkle"], when: "Weekends and layers" },
    ],
    gemstones: [
      g("Sapphire", "#204081", "#7E90B6", "sapphire"),
      g("Rose Quartz", "#C89B9D", "#DFC5C6", "rose-quartz"),
      g("Pearl", "#C3C1B9", "#DCDBD6", "pearl"),
      g("Amethyst", "#563776", "#9D8BB0", "amethyst"),
    ],
    hair: [
      h("Cool Ash Brown", "#5A4E4A", "#8C7E78"),
      h("Mushroom Blonde", "#A4948A", "#D2C4BA"),
      h("Soft Cool Brown", "#4E4240", "#7E7068"),
      h("Pearl Blonde", "#C6BAB2", "#E8E0D8"),
    ],
    hairAvoid: [
      h("Golden Copper", "#B4682E", "#E09A5E"),
      h("Jet Black", "#0D0D10", "#38383F"),
    ],
  },
  "soft summer": {
    guidance: {
      jewellery:
        "Brushed silver and pewter. Polished metal is brighter than anything on your face.",
      hair:
        "Keep your hair soft and cool. Ash brown and cool mushroom suit you; avoid platinum and jet black, which are both too strong for your contrast.",
      pairings:
        "Everything close in depth and slightly greyed. Blending, not contrast, is what works.",
    },
    story:
      "Yours is the softest colouring of the twelve — cool, muted and very low in contrast. Dusty roses, sage and soft greys let your features read clearly, while anything vivid or stark takes the attention for itself. The best compliment your outfits can get is that someone noticed you rather than what you were wearing.",
    metals: [
      { name: "Yellow gold", verdict: "skip", reason: "Too warm and too bright" },
      { name: "Rose gold", verdict: "works", reason: "Muted rose gold only" },
      { name: "Silver", verdict: "best", reason: "Cool and soft, brushed finishes" },
    ],
    extraMetals: "pewter",
    pairings: [
      { colours: ["Dusty Pink", "Mushroom Taupe", "Eucalyptus"], when: "Everyday, and your quietest outfit" },
      { colours: ["Eucalyptus", "Oyster White", "Mauve Pink"], when: "Daytime and offices" },
      { colours: ["Mauve Pink", "Mushroom Taupe", "Dusty Pink"], when: "Evening, kept soft" },
      { colours: ["Mushroom Taupe", "Oyster White", "Smoky Blue"], when: "Weekends and layers" },
    ],
    gemstones: [
      g("Pearl", "#C3C1B9", "#DCDBD6", "pearl"),
      g("Rose Quartz", "#C89B9D", "#DFC5C6", "rose-quartz"),
      g("Opal", "#889A85", "#BAC4B8", "opal"),
      g("Smoky Quartz", "#6B5B4B", "#A9A097", "smoky-quartz"),
    ],
    hair: [
      h("Soft Ash Brown", "#564A46", "#867872"),
      h("Mushroom Brown", "#7A6E68", "#A89C96"),
      h("Cool Mocha", "#4E423E", "#7A6C66"),
      h("Muted Sand", "#A89684", "#D0C2B2"),
    ],
    hairAvoid: [
      h("Platinum Blonde", "#D8D4CC", "#F2F0EC"),
      h("Jet Black", "#0D0D10", "#38383F"),
    ],
  },
};

function key(season: string | undefined): string {
  return (season ?? "").trim().toLowerCase();
}

/**
 * A pairing with its colours resolved to hexes.
 *
 * Names are stored rather than hexes so a palette correction reaches the
 * pairings too — the alternative is two places to fix and one of them silently
 * going stale.
 */
export function resolvePairings(
  season: string | undefined,
  palette: { best: { name: string; hex: string }[]; neutrals: { name: string; hex: string }[] } | null
): { colours: { name: string; hex: string }[]; when: string }[] {
  const style = STYLE[key(season)];
  if (!style || !palette) return [];
  const byName = new Map(
    [...palette.best, ...palette.neutrals].map((c) => [c.name.toLowerCase(), c])
  );
  return style.pairings
    .map((p) => ({
      colours: p.colours
        .map((n) => byName.get(n.toLowerCase()))
        .filter((c): c is { name: string; hex: string } => Boolean(c)),
      when: p.when,
    }))
    // A pairing missing a colour is a data error, not something to render with
    // a gap in it.
    .filter((p) => p.colours.length === 3);
}

export function getSeasonStyle(season: string | undefined): SeasonStyle | null {
  return STYLE[key(season)] ?? null;
}

export default STYLE;
