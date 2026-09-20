/**
 * Canonical makeup shades per season.
 *
 * The same contract as seasonPalettes.ts, for the same reason: the model names
 * shades, the data owns their hex values. A model asked for a hex invents a
 * plausible one, and two runs on the same face produce two different blushes;
 * asked to pick a name from a fixed list, it can only be right or refer to
 * something that does not exist — and the latter is caught by
 * validateLookShades() rather than rendered.
 *
 * Categories map to what the Makeup section renders: `foundation` is the depth
 * ladder, `nails` gets the flat silhouette, and the rest are flat bars.
 */

export type ShadeCategory =
  | "foundation"
  | "blush"
  | "bronzer"
  | "lip"
  | "eye"
  | "liner"
  | "highlight"
  | "nails";

export type ShadeFinish =
  | "matte"
  | "satin"
  | "cream"
  | "shimmer"
  | "metallic"
  | "gloss";

export interface MakeupShade {
  name: string;
  hex: string;
  category: ShadeCategory;
  finish: ShadeFinish;
}

export interface SeasonMakeup {
  /** Light → deep. Rendered as the base ladder, not as matchable shades. */
  foundation: MakeupShade[];
  /** One line under the ladder. */
  undertoneGuide: string;
  blush: MakeupShade[];
  bronzer: MakeupShade[];
  lip: MakeupShade[];
  eye: MakeupShade[];
  liner: MakeupShade[];
  highlight: MakeupShade[];
  nails: MakeupShade[];
  /** One line for the shade index, drawn from the season's avoid logic. */
  skip: string;
}

const f = (name: string, hex: string, finish: ShadeFinish = "satin"): MakeupShade =>
  ({ name, hex, category: "foundation", finish });
const bl = (name: string, hex: string, finish: ShadeFinish): MakeupShade =>
  ({ name, hex, category: "blush", finish });
const br = (name: string, hex: string, finish: ShadeFinish): MakeupShade =>
  ({ name, hex, category: "bronzer", finish });
const li = (name: string, hex: string, finish: ShadeFinish): MakeupShade =>
  ({ name, hex, category: "lip", finish });
const ey = (name: string, hex: string, finish: ShadeFinish): MakeupShade =>
  ({ name, hex, category: "eye", finish });
const ln = (name: string, hex: string, finish: ShadeFinish): MakeupShade =>
  ({ name, hex, category: "liner", finish });
const hi = (name: string, hex: string, finish: ShadeFinish): MakeupShade =>
  ({ name, hex, category: "highlight", finish });
const na = (name: string, hex: string, finish: ShadeFinish): MakeupShade =>
  ({ name, hex, category: "nails", finish });

const MAKEUP: Record<string, SeasonMakeup> = {
  // ── AUTUMNS ───────────────────────────────────────────────────────────
  "deep autumn": {
    foundation: [
      f("Warm Porcelain", "#F2D9C0"), f("Golden Beige", "#E0BB96"),
      f("Warm Honey", "#C79A6E"), f("Chestnut", "#9E6F49"), f("Deep Umber", "#6B4530"),
    ],
    undertoneGuide: "Golden-olive undertone — go one depth deeper than feels obvious, and never pink.",
    blush: [
      bl("Terracotta", "#C0664A", "matte"), bl("Brick Rose", "#A84C42", "satin"),
      bl("Bronze Rose", "#B07158", "shimmer"), bl("Burnt Sienna", "#96452F", "matte"),
    ],
    bronzer: [br("Warm Chestnut", "#8A5535", "matte"), br("Amber Bronze", "#A26A3C", "shimmer")],
    lip: [
      li("Raisin", "#5E2434", "matte"), li("Deep Brick", "#8A3324", "satin"),
      li("Warm Burgundy", "#6E1F2B", "matte"), li("Spiced Cocoa", "#7A4636", "cream"),
      li("Rust Gloss", "#A8503A", "gloss"),
    ],
    eye: [
      ey("Antique Bronze", "#8C5A2B", "metallic"), ey("Copper Ember", "#A45A32", "shimmer"),
      ey("Forest Moss", "#3F4A24", "matte"), ey("Dark Chocolate", "#3B2416", "matte"),
      ey("Burnished Gold", "#B08542", "metallic"),
    ],
    liner: [
      ln("Espresso", "#24160F", "matte"), ln("Deep Olive", "#3A3F21", "matte"),
      ln("Bronze Pencil", "#7A4A25", "metallic"),
    ],
    highlight: [hi("Warm Champagne", "#E9CFA3", "shimmer"), hi("Soft Gold", "#D8B473", "metallic")],
    nails: [
      na("Burnt Brick", "#8A3324", "cream"), na("Deep Olive", "#3F4A24", "cream"),
      na("Warm Burgundy", "#6E1F2B", "cream"), na("Camel", "#B7834F", "cream"),
    ],
    skip: "Skip icy pink, pure white and anything silver-based — they flatten your depth and cool the skin.",
  },

  "true autumn": {
    foundation: [
      f("Warm Ivory", "#F5DFC6"), f("Golden Sand", "#E5C29C"),
      f("Warm Amber", "#CBA074"), f("Toasted Almond", "#A97A52"), f("Warm Walnut", "#7B5436"),
    ],
    undertoneGuide: "Clearly golden undertone — warm every base, and skip anything described as rosy or neutral-cool.",
    blush: [
      bl("Apricot Glow", "#DE9068", "satin"), bl("Warm Coral", "#D2705A", "matte"),
      bl("Golden Peach", "#E0A272", "shimmer"), bl("Russet", "#A85A38", "matte"),
    ],
    bronzer: [br("Golden Bronze", "#A9713E", "shimmer"), br("Earth Tan", "#8E6136", "matte")],
    lip: [
      li("Pumpkin", "#C4652F", "satin"), li("Terracotta Matte", "#B05536", "matte"),
      li("Warm Brick", "#A5402C", "cream"), li("Caramel Nude", "#B07A57", "cream"),
      li("Amber Gloss", "#C87A45", "gloss"),
    ],
    eye: [
      ey("Pure Copper", "#B06A35", "metallic"), ey("Olive Bronze", "#7A6A32", "shimmer"),
      ey("Cinnamon", "#96502C", "matte"), ey("Moss Green", "#5B6233", "matte"),
      ey("Antique Gold", "#C8963C", "metallic"),
    ],
    liner: [
      ln("Warm Espresso", "#3A2415", "matte"), ln("Moss Liner", "#4A5228", "matte"),
      ln("Copper Pencil", "#8E5227", "metallic"),
    ],
    highlight: [hi("Liquid Gold", "#DDBB74", "metallic"), hi("Warm Apricot", "#EFC9A2", "shimmer")],
    nails: [
      na("Pumpkin", "#C4652F", "cream"), na("Moss Green", "#5B6233", "cream"),
      na("Warm Brick", "#A5402C", "cream"), na("Golden Camel", "#B8834A", "cream"),
    ],
    skip: "Skip cool berry, fuchsia and blue-based reds — they fight the gold in your skin.",
  },

  "soft autumn": {
    foundation: [
      f("Neutral Ivory", "#F3DECB"), f("Soft Beige", "#E2C4A6"),
      f("Warm Sand", "#C8A382"), f("Muted Tan", "#A88663"), f("Soft Walnut", "#7F6046"),
    ],
    undertoneGuide: "Neutral-warm and low contrast — keep the base soft, and let nothing on the face read as bright.",
    blush: [
      bl("Dusty Apricot", "#D19A7E", "matte"), bl("Muted Rose", "#BE8074", "satin"),
      bl("Soft Terracotta", "#C08466", "matte"), bl("Warm Clay", "#AE7561", "matte"),
    ],
    bronzer: [br("Soft Taupe Bronze", "#9C7A56", "matte"), br("Muted Amber", "#A8804F", "satin")],
    lip: [
      li("Rosewood", "#9C5F58", "satin"), li("Muted Brick", "#A0604A", "matte"),
      li("Soft Cocoa", "#8E6253", "cream"), li("Dusty Rose", "#B27D77", "cream"),
      li("Warm Nude Gloss", "#C2907C", "gloss"),
    ],
    eye: [
      ey("Soft Bronze", "#9A7448", "shimmer"), ey("Warm Taupe", "#8A7561", "matte"),
      ey("Sage Olive", "#77804F", "matte"), ey("Muted Plum", "#6E4F53", "matte"),
      ey("Antique Pewter", "#8B7F6B", "shimmer"),
    ],
    liner: [
      ln("Soft Brown", "#5A4433", "matte"), ln("Olive Grey", "#565A46", "matte"),
      ln("Muted Bronze", "#7E6242", "shimmer"),
    ],
    highlight: [hi("Soft Champagne", "#E4CDB0", "satin"), hi("Muted Pearl", "#E0D3C0", "shimmer")],
    nails: [
      na("Rosewood", "#9C5F58", "cream"), na("Sage Olive", "#77804F", "cream"),
      na("Warm Taupe", "#8A7561", "cream"), na("Soft Clay", "#B58572", "cream"),
    ],
    skip: "Skip anything vivid or icy — bright coral, true red and stark white all overpower your softness.",
  },
  // ── WINTERS ───────────────────────────────────────────────────────────
  "deep winter": {
    foundation: [
      f("Cool Porcelain", "#F1DAD0"), f("Neutral Beige", "#DDBCA4"),
      f("Cool Honey", "#BE9573"), f("Cool Chestnut", "#8F6549"), f("Deep Espresso", "#5C3B2C"),
    ],
    undertoneGuide: "Cool to neutral-cool undertone at depth — match exactly, and avoid golden or peachy bases.",
    blush: [
      bl("Cool Plum", "#8E4A5E", "matte"), bl("Deep Berry", "#94374F", "satin"),
      bl("Blackened Rose", "#7E3A47", "matte"), bl("Cool Wine", "#7A2E42", "matte"),
    ],
    bronzer: [br("Cool Taupe", "#7E5E4C", "matte"), br("Deep Neutral Bronze", "#6F4B3A", "satin")],
    lip: [
      li("True Red", "#C0142E", "matte"), li("Black Cherry", "#5A1024", "satin"),
      li("Deep Plum", "#4E1D38", "matte"), li("Cool Berry", "#8E1F43", "cream"),
      li("Crimson Gloss", "#A8123A", "gloss"),
    ],
    eye: [
      ey("Charcoal", "#36353B", "matte"), ey("Icy Silver", "#C6CBD2", "metallic"),
      ey("Deep Emerald", "#0E4F3C", "satin"), ey("Blackened Plum", "#3B2138", "matte"),
      ey("Sapphire", "#1B3A6B", "shimmer"),
    ],
    liner: [
      ln("True Black", "#101013", "matte"), ln("Blackened Navy", "#151E35", "matte"),
      ln("Gunmetal", "#4A4D55", "metallic"),
    ],
    highlight: [hi("Icy Pearl", "#E7E9EE", "shimmer"), hi("Cool Platinum", "#D6D9DE", "metallic")],
    nails: [
      na("True Red", "#C0142E", "cream"), na("Black Cherry", "#5A1024", "cream"),
      na("Deep Emerald", "#0E4F3C", "cream"), na("Cool Charcoal", "#36353B", "cream"),
    ],
    skip: "Skip warm orange, camel and muted earth tones — they dull the clarity your colouring depends on.",
  },

  "true winter": {
    foundation: [
      f("Cool Ivory", "#F4DFD8"), f("Rose Beige", "#E3C0AE"),
      f("Neutral Tan", "#C09478"), f("Cool Walnut", "#8E6650"), f("Cool Mahogany", "#603E31"),
    ],
    undertoneGuide: "Distinctly cool, blue-based undertone — a rosy base reads correct on you where a golden one greys.",
    blush: [
      bl("Cool Pink", "#D4667F", "matte"), bl("Raspberry", "#B8385C", "satin"),
      bl("Icy Rose", "#DE8AA0", "shimmer"), bl("Blue Berry", "#9C2F55", "matte"),
    ],
    bronzer: [br("Cool Contour", "#8A6656", "matte"), br("Neutral Sculpt", "#7C5B4C", "matte")],
    lip: [
      li("Blue Red", "#C11235", "matte"), li("Fuchsia", "#B62A78", "satin"),
      li("Cool Ruby", "#A81340", "cream"), li("Icy Berry", "#C25078", "gloss"),
      li("Deep Magenta", "#8A1A56", "matte"),
    ],
    eye: [
      ey("Pure Silver", "#CBD1D8", "metallic"), ey("Royal Blue", "#1F4FA8", "satin"),
      ey("Cool Charcoal", "#3A3A42", "matte"), ey("Emerald", "#0F6B4F", "shimmer"),
      ey("Icy Lilac", "#BBAFD4", "shimmer"),
    ],
    liner: [
      ln("Jet Black", "#0D0D10", "matte"), ln("Royal Navy", "#16315E", "matte"),
      ln("Silver Pencil", "#B4BAC3", "metallic"),
    ],
    highlight: [hi("Snow Pearl", "#EDEFF3", "shimmer"), hi("Cool Silver", "#D2D7DE", "metallic")],
    nails: [
      na("Blue Red", "#C11235", "cream"), na("Fuchsia", "#B62A78", "cream"),
      na("Royal Blue", "#1F4FA8", "cream"), na("Pure White", "#F3F5F8", "cream"),
    ],
    skip: "Skip orange-red, gold and anything beige-warm — they muddy a palette that wants blue underneath.",
  },

  "bright winter": {
    foundation: [
      f("Bright Ivory", "#F6E1D6"), f("Clear Beige", "#E5C3AC"),
      f("Neutral Honey", "#C69A7C"), f("Clear Tan", "#A0755A"), f("Deep Cool Cocoa", "#674436"),
    ],
    undertoneGuide: "Cool-neutral with high clarity — keep the base clean and light-reflecting, never muted or matte-flat.",
    blush: [
      bl("Hot Pink", "#E2477F", "matte"), bl("Bright Coral Pink", "#F0637C", "satin"),
      bl("Clear Raspberry", "#CC2D63", "matte"), bl("Bright Rose", "#E86A92", "shimmer"),
    ],
    bronzer: [br("Clear Sculpt", "#8E6552", "matte"), br("Neutral Warmth", "#9A6F58", "satin")],
    lip: [
      li("Bright Cherry", "#D2113C", "satin"), li("Electric Fuchsia", "#C92184", "matte"),
      li("Clear Red", "#DC1F3C", "cream"), li("Bright Berry", "#B32660", "cream"),
      li("Vivid Pink Gloss", "#E8508C", "gloss"),
    ],
    eye: [
      ey("Bright Silver", "#D2D8DF", "metallic"), ey("Electric Teal", "#0E7C84", "satin"),
      ey("Vivid Violet", "#6A3FA8", "shimmer"), ey("Clear Black", "#141419", "matte"),
      ey("Icy White", "#EDF1F5", "shimmer"),
    ],
    liner: [
      ln("Jet Black", "#0D0D10", "matte"), ln("Electric Teal Liner", "#0C6E77", "satin"),
      ln("Bright Violet", "#5E34A0", "satin"),
    ],
    highlight: [hi("Crystal Pearl", "#F0F3F7", "shimmer"), hi("Bright Platinum", "#D8DDE4", "metallic")],
    nails: [
      na("Bright Cherry", "#D2113C", "cream"), na("Electric Fuchsia", "#C92184", "cream"),
      na("Icy White", "#EDF1F5", "cream"), na("Clear Black", "#141419", "cream"),
    ],
    skip: "Skip dusty, greyed and earthy shades — anything muted reads as dirt against your clarity.",
  },

  // ── SPRINGS ───────────────────────────────────────────────────────────
  "light spring": {
    foundation: [
      f("Porcelain Warm", "#FBEADA"), f("Light Ivory", "#F4DCC2"),
      f("Warm Cream", "#EACAA6"), f("Light Golden", "#DDB289"), f("Soft Honey", "#C79B72"),
    ],
    undertoneGuide: "Light and warm — the commonest mistake is going too deep, which drops a veil over the whole face.",
    blush: [
      bl("Light Peach", "#F5B191", "satin"), bl("Soft Coral", "#F79A87", "matte"),
      bl("Warm Petal Pink", "#F7A8B4", "shimmer"), bl("Apricot Cream", "#F3B487", "cream"),
    ],
    bronzer: [br("Light Warm Tan", "#C79765", "satin"), br("Soft Golden", "#D2A877", "shimmer")],
    lip: [
      li("Peach Nude", "#E8A183", "cream"), li("Coral Pink", "#F58C7A", "satin"),
      li("Warm Rose", "#F0899E", "cream"), li("Apricot Gloss", "#F2A874", "gloss"),
      li("Light Watermelon", "#EE7D80", "satin"),
    ],
    eye: [
      ey("Warm Champagne", "#EFD4AE", "shimmer"), ey("Light Peach Shimmer", "#F3C2A1", "shimmer"),
      ey("Soft Aqua", "#8EDDE3", "satin"), ey("Light Warm Brown", "#B98A63", "matte"),
      ey("Butter Gold", "#EBCE8A", "metallic"),
    ],
    liner: [
      ln("Warm Taupe Liner", "#9A7A5E", "matte"), ln("Soft Bronze", "#B48453", "shimmer"),
      ln("Light Chocolate", "#7A5539", "matte"),
    ],
    highlight: [hi("Pearl Peach", "#FBE0CB", "shimmer"), hi("Light Gold", "#F2DCA8", "metallic")],
    nails: [
      na("Coral Pink", "#F58C7A", "cream"), na("Light Peach", "#FFD6B5", "cream"),
      na("Warm Rose", "#F58CA8", "cream"), na("Light Aqua", "#8EDDE3", "cream"),
    ],
    skip: "Skip black, burgundy and charcoal — depth of that order swamps a light, delicate face.",
  },

  "true spring": {
    foundation: [
      f("Warm Porcelain", "#F9E4CE"), f("Golden Ivory", "#F0D0AC"),
      f("Warm Beige", "#DFB287"), f("Golden Tan", "#C7986B"), f("Warm Caramel", "#AC7B52"),
    ],
    undertoneGuide: "Clear golden warmth — the base should look sunlit rather than neutral, and never ashy.",
    blush: [
      bl("Warm Coral", "#F3785F", "matte"), bl("Golden Peach", "#F0A268", "satin"),
      bl("Bright Apricot", "#F58F55", "matte"), bl("Coral Rose", "#EF8377", "shimmer"),
    ],
    bronzer: [br("Golden Tan", "#C08B4F", "shimmer"), br("Warm Sand Sculpt", "#B4854F", "matte")],
    lip: [
      li("Clear Coral", "#F26B4F", "satin"), li("Poppy", "#E8452F", "matte"),
      li("Warm Watermelon", "#EF6B6B", "cream"), li("Golden Nude", "#D69A6B", "cream"),
      li("Peach Gloss", "#F49A6C", "gloss"),
    ],
    eye: [
      ey("Bright Gold", "#E3B94F", "metallic"), ey("Warm Copper", "#C4753C", "shimmer"),
      ey("Clear Turquoise", "#22A8A8", "satin"), ey("Warm Camel", "#C39560", "matte"),
      ey("Fresh Green", "#6FA83C", "satin"),
    ],
    liner: [
      ln("Warm Brown", "#6E4A2C", "matte"), ln("Bronze Gold", "#A87434", "metallic"),
      ln("Clear Teal", "#1B8C8C", "satin"),
    ],
    highlight: [hi("Bright Gold", "#EFD095", "metallic"), hi("Warm Pearl", "#F7E3C6", "shimmer")],
    nails: [
      na("Clear Coral", "#F26B4F", "cream"), na("Bright Gold", "#E3B94F", "cream"),
      na("Fresh Green", "#6FA83C", "cream"), na("Golden Nude", "#D69A6B", "cream"),
    ],
    skip: "Skip mauve, dusty rose and anything greyed — muting is what takes the life out of this palette.",
  },

  "bright spring": {
    foundation: [
      f("Bright Ivory", "#FAE6D4"), f("Warm Clear Beige", "#EFCEAB"),
      f("Clear Golden", "#DDAF85"), f("Bright Tan", "#C59468"), f("Warm Amber Deep", "#A87450"),
    ],
    undertoneGuide: "Warm with real clarity — a clean, luminous base; anything powdery flattens the contrast you carry.",
    blush: [
      bl("Bright Coral", "#FA6A55", "matte"), bl("Vivid Peach", "#FB8A5C", "satin"),
      bl("Clear Watermelon", "#F4657A", "matte"), bl("Bright Rose Coral", "#F5788A", "shimmer"),
    ],
    bronzer: [br("Clear Golden Tan", "#C6884A", "shimmer"), br("Bright Sculpt", "#B87F4C", "matte")],
    lip: [
      li("Vivid Coral", "#FB5A44", "satin"), li("Clear Poppy", "#EE3628", "matte"),
      li("Bright Warm Pink", "#F55C7E", "cream"), li("Hot Peach", "#FA7A52", "cream"),
      li("Clear Red Gloss", "#EE3A42", "gloss"),
    ],
    eye: [
      ey("Vivid Gold", "#EDBE3F", "metallic"), ey("Clear Turquoise", "#00B3B3", "satin"),
      ey("Bright Copper", "#D07A38", "shimmer"), ey("Fresh Leaf", "#6FBE3A", "satin"),
      ey("Clear Ivory", "#FBF1DE", "shimmer"),
    ],
    liner: [
      ln("Warm Espresso", "#4A2F1C", "matte"), ln("Bright Teal", "#00A0A0", "satin"),
      ln("Gold Pencil", "#CFA13A", "metallic"),
    ],
    highlight: [hi("Clear Gold", "#F6DA9C", "metallic"), hi("Bright Pearl", "#FDF0DC", "shimmer")],
    nails: [
      na("Vivid Coral", "#FB5A44", "cream"), na("Clear Turquoise", "#00B3B3", "cream"),
      na("Vivid Gold", "#EDBE3F", "cream"), na("Bright Warm Pink", "#F55C7E", "cream"),
    ],
    skip: "Skip dusty, smoky and earthy shades — they read as grime beside colours this clear.",
  },

  // ── SUMMERS ───────────────────────────────────────────────────────────
  "light summer": {
    foundation: [
      f("Cool Porcelain", "#FBE8E0"), f("Rose Ivory", "#F3D8CB"),
      f("Cool Light Beige", "#E6C3AE"), f("Soft Rose Beige", "#D4A990"), f("Cool Sand", "#BE9276"),
    ],
    undertoneGuide: "Light and cool with a rosy cast — a golden base turns sallow on you almost immediately.",
    blush: [
      bl("Soft Rose", "#EBA3B4", "satin"), bl("Cool Petal Pink", "#F0AFC0", "matte"),
      bl("Dusty Pink", "#DB94A3", "matte"), bl("Light Berry", "#D77F9C", "shimmer"),
    ],
    bronzer: [br("Cool Light Taupe", "#B08E7C", "matte"), br("Soft Rosy Sculpt", "#B8907F", "satin")],
    lip: [
      li("Soft Rose Pink", "#E58CA0", "cream"), li("Cool Petal", "#EFA0B2", "satin"),
      li("Light Raspberry", "#D96E8E", "cream"), li("Rosy Nude", "#D3969B", "cream"),
      li("Cool Pink Gloss", "#E893AC", "gloss"),
    ],
    eye: [
      ey("Soft Pearl Grey", "#C8C6CC", "shimmer"), ey("Cool Lilac", "#C0AED0", "satin"),
      ey("Powder Blue", "#A8C4DE", "satin"), ey("Rose Taupe", "#B49AA0", "matte"),
      ey("Soft Periwinkle", "#AFB4DC", "shimmer"),
    ],
    liner: [
      ln("Soft Grey", "#6E6C74", "matte"), ln("Cool Slate", "#5E6878", "matte"),
      ln("Muted Plum Liner", "#6E566A", "matte"),
    ],
    highlight: [hi("Cool Pearl", "#F3E9EC", "shimmer"), hi("Soft Rose Pearl", "#F6DDE2", "shimmer")],
    nails: [
      na("Soft Rose", "#EBA3B4", "cream"), na("Powder Blue", "#A8C4DE", "cream"),
      na("Cool Lilac", "#C0AED0", "cream"), na("Rosy Nude", "#D3969B", "cream"),
    ],
    skip: "Skip black, orange and deep browns — the weight and the warmth both work against a light cool face.",
  },

  "true summer": {
    foundation: [
      f("Rose Porcelain", "#F8E2DA"), f("Cool Ivory", "#EFD1C2"),
      f("Rose Beige", "#DBB39D"), f("Cool Tan", "#C19A80"), f("Cool Cocoa", "#9E7660"),
    ],
    undertoneGuide: "Cool and rose-based throughout — match to the pink in your skin, not the depth of your hair.",
    blush: [
      bl("Cool Rose", "#DE8296", "matte"), bl("Soft Raspberry", "#C86285", "satin"),
      bl("Mauve Pink", "#C98CA0", "matte"), bl("Dusty Berry", "#B45F7C", "matte"),
    ],
    bronzer: [br("Cool Taupe Sculpt", "#A07C6A", "matte"), br("Rosy Contour", "#A88374", "matte")],
    lip: [
      li("Cool Rose", "#D2637E", "satin"), li("Soft Raspberry", "#C04A72", "matte"),
      li("Mauve", "#A96A83", "cream"), li("Dusty Plum", "#8E4E68", "cream"),
      li("Rose Gloss", "#DB7C96", "gloss"),
    ],
    eye: [
      ey("Cool Taupe", "#96878C", "matte"), ey("Soft Plum", "#7A5A72", "satin"),
      ey("Slate Blue", "#6B7E9C", "satin"), ey("Pearl Grey", "#BEBCC4", "shimmer"),
      ey("Muted Teal", "#5C8A8A", "satin"),
    ],
    liner: [
      ln("Soft Charcoal", "#4E4C56", "matte"), ln("Cool Plum Liner", "#5E4258", "matte"),
      ln("Slate Liner", "#556076", "matte"),
    ],
    highlight: [hi("Rose Pearl", "#F2DFE2", "shimmer"), hi("Cool Moonstone", "#E7E4EA", "shimmer")],
    nails: [
      na("Cool Rose", "#D2637E", "cream"), na("Slate Blue", "#6B7E9C", "cream"),
      na("Dusty Plum", "#8E4E68", "cream"), na("Soft Mauve", "#A98BA0", "cream"),
    ],
    skip: "Skip orange, gold and warm camel — warmth of any kind is what pulls this face off-key.",
  },

  "soft summer": {
    foundation: [
      f("Neutral Rose Ivory", "#F5E0D6"), f("Soft Cool Beige", "#E6C9B6"),
      f("Muted Rose Beige", "#D0AC96", ), f("Soft Cool Tan", "#B8927B"), f("Muted Cocoa", "#96735E"),
    ],
    undertoneGuide: "Neutral-cool and low contrast — keep everything soft and close in depth; edges are what age this face.",
    blush: [
      bl("Dusty Rose", "#C88B94", "matte"), bl("Muted Mauve", "#B8828F", "matte"),
      bl("Soft Berry", "#AC6C80", "satin"), bl("Rose Taupe", "#BC9099", "matte"),
    ],
    bronzer: [br("Muted Taupe", "#9C7E6E", "matte"), br("Soft Cool Sculpt", "#94786A", "matte")],
    lip: [
      li("Soft Mauve", "#AE7481", "cream"), li("Dusty Rose", "#B87D84", "satin"),
      li("Muted Berry", "#96566B", "matte"), li("Rosy Nude", "#BC8E8C", "cream"),
      li("Soft Plum Gloss", "#A06578", "gloss"),
    ],
    eye: [
      ey("Soft Taupe", "#9A8C8A", "matte"), ey("Muted Plum", "#74596A", "matte"),
      ey("Sage Grey", "#8A958C", "satin"), ey("Dusty Periwinkle", "#8E97B0", "satin"),
      ey("Soft Pewter", "#A8A4A8", "shimmer"),
    ],
    liner: [
      ln("Soft Grey Brown", "#5E5450", "matte"), ln("Muted Plum Liner", "#5E4658", "matte"),
      ln("Sage Liner", "#5E6A5E", "matte"),
    ],
    highlight: [hi("Soft Pearl", "#EEE4E2", "satin"), hi("Muted Rose Pearl", "#F0DFDE", "shimmer")],
    nails: [
      na("Dusty Rose", "#C88B94", "cream"), na("Muted Plum", "#74596A", "cream"),
      na("Sage Grey", "#8A958C", "cream"), na("Soft Taupe", "#9A8C8A", "cream"),
    ],
    skip: "Skip black, pure white and anything vivid — high contrast and high chroma both overwhelm you.",
  },

};

/** Categories the shade index renders, in the order it renders them. */
export const INDEX_CATEGORIES = ["blush", "lip", "eye", "liner", "nails"] as const;

/** Slots a look may fill. `bronzer` and `highlight` are the optional fifth. */
export const LOOK_SLOTS = ["eye", "liner", "cheek", "lip", "bronzer", "highlight"] as const;
export type LookSlot = (typeof LOOK_SLOTS)[number];

/** The category a look slot draws its shades from. */
const SLOT_CATEGORY: Record<LookSlot, ShadeCategory> = {
  eye: "eye",
  liner: "liner",
  cheek: "blush",
  lip: "lip",
  bronzer: "bronzer",
  highlight: "highlight",
};

function key(season: string | undefined): string {
  return (season ?? "").trim().toLowerCase();
}

export function getSeasonMakeup(season: string | undefined): SeasonMakeup | null {
  return MAKEUP[key(season)] ?? null;
}

/**
 * Every shade a season offers, flattened.
 *
 * Foundation is excluded: it is a depth ladder for the base section, not a
 * shade a look can name, and letting the model reach for "Warm Honey" as a lip
 * would be a category error the schema cannot express.
 */
export function allShades(season: string | undefined): MakeupShade[] {
  const m = getSeasonMakeup(season);
  if (!m) return [];
  return [...m.blush, ...m.bronzer, ...m.lip, ...m.eye, ...m.liner, ...m.highlight, ...m.nails];
}

/** Shade names the model may use, for the prompt. */
export function shadeNamesForPrompt(season: string | undefined): string {
  const m = getSeasonMakeup(season);
  if (!m) return "";
  const line = (label: string, shades: MakeupShade[]) =>
    `${label}: ${shades.map((x) => x.name).join(", ")}`;
  return [
    line("eye", m.eye),
    line("liner", m.liner),
    line("cheek", m.blush),
    line("lip", m.lip),
    line("bronzer", m.bronzer),
    line("highlight", m.highlight),
  ].join("\n");
}

/**
 * Resolve a named shade within a slot.
 *
 * Matching is case- and whitespace-insensitive because that is the difference
 * between a model being useful and a model being punished for capitalisation.
 * It is NOT fuzzy beyond that: a name that is not on the list is a miss, and
 * the caller drops it rather than guessing what was meant.
 */
export function resolveShade(
  season: string | undefined,
  slot: LookSlot,
  name: string
): MakeupShade | null {
  const m = getSeasonMakeup(season);
  if (!m) return null;
  const pool = m[SLOT_CATEGORY[slot] as keyof SeasonMakeup];
  if (!Array.isArray(pool)) return null;
  const wanted = name.trim().toLowerCase();
  return (pool as MakeupShade[]).find((x) => x.name.trim().toLowerCase() === wanted) ?? null;
}

export default MAKEUP;
