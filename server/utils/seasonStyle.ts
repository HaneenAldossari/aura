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

export interface SeasonStyle {
  gemstones: StoneShade[];
  hair: HairShade[];
  /** Shown struck through under Hair — the directions that fight the season. */
  hairAvoid: HairShade[];
  /** One line on what the metals are doing, under the metal row. */
  metalNote: string;
}

const g = (name: string, hex: string, accent: string, asset?: string): StoneShade =>
  ({ name, hex, accent, asset });
const h = (name: string, hex: string, accent: string): HairShade => ({ name, hex, accent });

const STYLE: Record<string, SeasonStyle> = {
  "deep autumn": {
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
    metalNote: "Warm, darkened metals — the deeper the finish, the better it sits against you.",
  },
  "true autumn": {
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
    metalNote: "Yellow gold and copper. Silver goes grey against this much warmth.",
  },
  "soft autumn": {
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
    metalNote: "Antique and brushed finishes. Anything highly polished is too bright here.",
  },

  "deep winter": {
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
    metalNote: "Silver, platinum and white gold. Yellow gold muddies the contrast.",
  },
  "true winter": {
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
    metalNote: "Cool metals only. Silver and platinum read as clean; gold reads as dirty.",
  },
  "bright winter": {
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
    metalNote: "High-polish silver and platinum. Matte finishes dull the clarity you carry.",
  },

  "light spring": {
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
    metalNote: "Light, bright gold. Heavy antique finishes sit too dark on you.",
  },
  "true spring": {
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
    metalNote: "Clear yellow gold. Warmth is the point — do not tone it down.",
  },
  "bright spring": {
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
    metalNote: "Bright polished gold. Anything oxidised or brushed kills the clarity.",
  },

  "light summer": {
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
    metalNote: "Silver and white gold, kept light. Heavy metals overwhelm a delicate face.",
  },
  "true summer": {
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
    metalNote: "Silver, white gold and rose gold with a cool cast. Yellow gold reads brassy.",
  },
  "soft summer": {
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
    metalNote: "Brushed silver and pewter. Polished metal is brighter than anything on your face.",
  },
};

function key(season: string | undefined): string {
  return (season ?? "").trim().toLowerCase();
}

export function getSeasonStyle(season: string | undefined): SeasonStyle | null {
  return STYLE[key(season)] ?? null;
}

export default STYLE;
