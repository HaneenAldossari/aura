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
  /** Body colour of the stone. */
  hex: string;
  /** Facet highlight, for the two-tone swatch. */
  accent: string;
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
  /** One line on what the metals are doing, under the metal row. */
  metalNote: string;
}

const g = (name: string, hex: string, accent: string): StoneShade => ({ name, hex, accent });
const h = (name: string, hex: string, accent: string): HairShade => ({ name, hex, accent });

const STYLE: Record<string, SeasonStyle> = {
  "deep autumn": {
    gemstones: [
      g("Tiger's Eye", "#8A5A２B".replace("２", "2"), "#C89B4A"),
      g("Garnet", "#6E1F2B", "#A8384A"),
      g("Malachite", "#1F4D3A", "#3F8A64"),
      g("Amber", "#B06A1E", "#E0A84A"),
    ],
    hair: [
      h("Dark Chocolate", "#3B2416", "#6A4526"),
      h("Warm Espresso", "#24160F", "#4E3220"),
      h("Deep Auburn", "#5A2418", "#96442A"),
      h("Burnished Chestnut", "#4A2A18", "#8A5A2B"),
    ],
    metalNote: "Warm, darkened metals — the deeper the finish, the better it sits against you.",
  },
  "true autumn": {
    gemstones: [
      g("Carnelian", "#A5402C", "#D2764A"),
      g("Topaz", "#B8834A", "#E0B46E"),
      g("Jade", "#5B6233", "#8CA054"),
      g("Bronze Pearl", "#8E6136", "#C49A62"),
    ],
    hair: [
      h("Warm Chestnut", "#5A3620", "#96602F"),
      h("Golden Copper", "#8A4A20", "#C87A38"),
      h("Rich Auburn", "#6E2E18", "#A8542A"),
      h("Caramel Brown", "#7A4E2A", "#B4854A"),
    ],
    metalNote: "Yellow gold and copper. Silver goes grey against this much warmth.",
  },
  "soft autumn": {
    gemstones: [
      g("Smoky Quartz", "#7A6A5A", "#A8968A"),
      g("Moss Agate", "#77804F", "#A0A878"),
      g("Rose Bronze", "#9C6A58", "#C49080"),
      g("Champagne Pearl", "#C4AE92", "#E4D4BC"),
    ],
    hair: [
      h("Soft Mocha", "#5E4632", "#96785A"),
      h("Muted Chestnut", "#6A4A34", "#A0805E"),
      h("Warm Ash Brown", "#5A4A3E", "#8E7A66"),
      h("Dusty Caramel", "#7A5C40", "#B09070"),
    ],
    metalNote: "Antique and brushed finishes. Anything highly polished is too bright here.",
  },

  "deep winter": {
    gemstones: [
      g("Onyx", "#1A1A1E", "#4A4A54"),
      g("Ruby", "#8E1024", "#C8304A"),
      g("Emerald", "#0E4F3C", "#2A8A66"),
      g("Amethyst", "#4E1D38", "#8A4A78"),
    ],
    hair: [
      h("Blue Black", "#141418", "#3A3A48"),
      h("Cool Espresso", "#2A1E1A", "#544038"),
      h("Deep Mahogany", "#3A1820", "#70303C"),
      h("Dark Ash Brown", "#332C2A", "#5E524E"),
    ],
    metalNote: "Silver, platinum and white gold. Yellow gold muddies the contrast.",
  },
  "true winter": {
    gemstones: [
      g("Sapphire", "#1B3A6B", "#3A6AA8"),
      g("Diamond", "#D8DDE4", "#FFFFFF"),
      g("Ruby", "#A81340", "#D8365E"),
      g("Black Pearl", "#2A2A32", "#6A6A78"),
    ],
    hair: [
      h("True Black", "#101013", "#38383F"),
      h("Cool Dark Brown", "#2E2622", "#5A4C46"),
      h("Ash Brown", "#453A38", "#786864"),
      h("Icy Platinum", "#D2D0CC", "#F2F0EC"),
    ],
    metalNote: "Cool metals only. Silver and platinum read as clean; gold reads as dirty.",
  },
  "bright winter": {
    gemstones: [
      g("Clear Diamond", "#E2E6EC", "#FFFFFF"),
      g("Emerald", "#0F6B4F", "#2FA87A"),
      g("Fuchsia Sapphire", "#8A1A6E", "#C24AA0"),
      g("Jet", "#141419", "#44444E"),
    ],
    hair: [
      h("Jet Black", "#0D0D10", "#38383F"),
      h("Cool Chocolate", "#2E211E", "#5A4440"),
      h("Bright Ash", "#4A4240", "#84766F"),
      h("Clear Platinum", "#D8D6D2", "#F5F3EF"),
    ],
    metalNote: "High-polish silver and platinum. Matte finishes dull the clarity you carry.",
  },

  "light spring": {
    gemstones: [
      g("Aquamarine", "#8EDDE3", "#C2F0F2"),
      g("Coral", "#F58C7A", "#FFB8A8"),
      g("Citrine", "#F0CE7A", "#FBE8B4"),
      g("Peach Moonstone", "#F3C2A1", "#FBE2CE"),
    ],
    hair: [
      h("Honey Blonde", "#B4894E", "#E0C08A"),
      h("Light Golden Brown", "#8A6238", "#BE9668"),
      h("Strawberry Blonde", "#C08050", "#EDB48A"),
      h("Warm Butter Blonde", "#D2AE72", "#F2DCAC"),
    ],
    metalNote: "Light, bright gold. Heavy antique finishes sit too dark on you.",
  },
  "true spring": {
    gemstones: [
      g("Turquoise", "#22A8A8", "#5ED2D2"),
      g("Coral", "#F26B4F", "#FF9A7A"),
      g("Golden Beryl", "#E3B94F", "#F4DC96"),
      g("Peridot", "#6FA83C", "#A2CE72"),
    ],
    hair: [
      h("Golden Blonde", "#C09A4E", "#E8CE8A"),
      h("Warm Copper", "#B4682E", "#E09A5E"),
      h("Golden Brown", "#8A5E2E", "#BE9258"),
      h("Light Auburn", "#A0502A", "#D08A5A"),
    ],
    metalNote: "Clear yellow gold. Warmth is the point — do not tone it down.",
  },
  "bright spring": {
    gemstones: [
      g("Clear Turquoise", "#00B3B3", "#4EDCDC"),
      g("Vivid Coral", "#FB5A44", "#FF9276"),
      g("Bright Citrine", "#EDBE3F", "#FAE08E"),
      g("Chrysoprase", "#6FBE3A", "#A4DC78"),
    ],
    hair: [
      h("Bright Golden Blonde", "#CCA04A", "#F0D68E"),
      h("Vivid Copper", "#C06A2A", "#EE9E56"),
      h("Clear Chestnut", "#7A4A24", "#B47E4E"),
      h("Warm Caramel", "#A0703A", "#D4A870"),
    ],
    metalNote: "Bright polished gold. Anything oxidised or brushed kills the clarity.",
  },

  "light summer": {
    gemstones: [
      g("Rose Quartz", "#E8AFBC", "#F8DCE2"),
      g("Moonstone", "#D8D4DE", "#F2F0F6"),
      g("Blue Topaz", "#A8C4DE", "#D4E4F2"),
      g("Amethyst", "#B49CD0", "#DCCEEC"),
    ],
    hair: [
      h("Ash Blonde", "#B0A08A", "#DED2BE"),
      h("Cool Light Brown", "#7A6A5E", "#AC9C8E"),
      h("Platinum Beige", "#CEC4B8", "#EEE6DC"),
      h("Soft Ash Brown", "#665A52", "#98887E"),
    ],
    metalNote: "Silver and white gold, kept light. Heavy metals overwhelm a delicate face.",
  },
  "true summer": {
    gemstones: [
      g("Sapphire", "#3A5A8A", "#6E8EBE"),
      g("Rose Quartz", "#DE9EAC", "#F4D2DA"),
      g("Pearl", "#E4DEDC", "#F8F4F2"),
      g("Amethyst", "#7A5A82", "#AE8EB4"),
    ],
    hair: [
      h("Cool Ash Brown", "#5A4E4A", "#8C7E78"),
      h("Mushroom Blonde", "#A4948A", "#D2C4BA"),
      h("Soft Cool Brown", "#4E4240", "#7E7068"),
      h("Pearl Blonde", "#C6BAB2", "#E8E0D8"),
    ],
    metalNote: "Silver, white gold and rose gold with a cool cast. Yellow gold reads brassy.",
  },
  "soft summer": {
    gemstones: [
      g("Grey Moonstone", "#C4C0C4", "#E4E2E4"),
      g("Dusty Rose Quartz", "#C69AA2", "#E4C8CE"),
      g("Sage Jade", "#8A958C", "#B8C0B8"),
      g("Smoky Amethyst", "#74596A", "#A48A9C"),
    ],
    hair: [
      h("Soft Ash Brown", "#564A46", "#867872"),
      h("Mushroom Brown", "#7A6E68", "#A89C96"),
      h("Cool Mocha", "#4E423E", "#7A6C66"),
      h("Muted Sand", "#A89684", "#D0C2B2"),
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
