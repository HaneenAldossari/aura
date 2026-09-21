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
  /**
   * Slug of a photographed render under /makeup/<category>/.
   *
   * Only nails carry one: the design renders nails realistically and every
   * other shade as a flat rectangle, because a flat rectangle is an honest
   * statement of a colour and a rendered dab is a guess at a texture.
   */
  asset?: string;
  /**
   * Who makes it. Nails only, and only because a polish is bought by its name:
   * "Big Apple Red" means nothing at a counter without "OPI" in front of it.
   * Every other shade here is a colour to match, not a product to find.
   */
  brand?: NailBrand;
}

export type NailBrand = "OPI" | "Essie";

/**
 * One or two plain sentences that open a section, before any colour is shown.
 *
 * Every section leads with these: a reader who does not know what "muted"
 * means cannot use a row of swatches, and a swatch cannot say "go one depth
 * deeper" or "never black". Written in the second person, and canonical — the
 * model does not produce them, so two people with the same season read the
 * same advice.
 */
export interface MakeupGuidance {
  base: string;
  blush: string;
  lip: string;
  eye: string;
  liner: string;
  nails: string;
}

export interface SeasonMakeup {
  /** Light → deep. Rendered as the base ladder, not as matchable shades. */
  foundation: MakeupShade[];
  /** Opens each section, above the swatches. */
  guidance: MakeupGuidance;
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
const na = (
  name: string,
  hex: string,
  finish: ShadeFinish,
  asset?: string,
  brand?: NailBrand
): MakeupShade => ({ name, hex, category: "nails", finish, asset, brand });

const MAKEUP: Record<string, SeasonMakeup> = {
  // ── AUTUMNS ───────────────────────────────────────────────────────────
  "deep autumn": {
    foundation: [
      f("Warm Porcelain", "#F2D9C0"), f("Golden Beige", "#E0BB96"),
      f("Warm Honey", "#C79A6E"), f("Chestnut", "#9E6F49"), f("Deep Umber", "#6B4530"),
    ],
    guidance: {
      base:
        "Match your base one depth deeper than feels obvious, and keep it golden. A pink or neutral-cool foundation will grey you out within an hour.",
      blush:
        "Reach for earth, not sugar. Terracotta, brick and bronzed rose sit into your skin; cool pinks sit on top of it.",
      lip:
        "Your lips can carry real depth. Raisin, deep brick and warm burgundy look intentional on you where a nude reads washed out.",
      eye:
        "Metals belong on your lids — bronze, copper, burnished gold — with forest and chocolate for depth. Silver and icy shades will look borrowed.",
      liner:
        "Skip black. Espresso, deep olive and bronze define your eye without cutting a hard line across a warm face.",
      nails:
        "Deep and warm: brick, burgundy, olive, camel. Pale pinks and icy pastels disappear against your hands.",
    },
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
      na("Berry Naughty", "#74303E", "gloss", "berry-naughty", "OPI"),
      na("Malaga Wine", "#6A3A43", "gloss", "malaga-wine", "OPI"),
      na("Mademoiselle", "#D3A493", "satin", "mademoiselle", "Essie"),
      na("Big Apple Red", "#B01B1E", "gloss", "big-apple-red", "OPI"),
    ],
    skip: "Skip icy pink, pure white and anything silver-based — they flatten your depth and cool the skin.",
  },

  "true autumn": {
    foundation: [
      f("Warm Ivory", "#F5DFC6"), f("Golden Sand", "#E5C29C"),
      f("Warm Amber", "#CBA074"), f("Toasted Almond", "#A97A52"), f("Warm Walnut", "#7B5436"),
    ],
    guidance: {
      base:
        "Warm every layer of your base. Your skin is clearly golden, so anything described as rosy or neutral-cool will fight it.",
      blush:
        "Apricot, warm coral and russet read as a flush on you. Anything blue-based reads as a bruise.",
      lip:
        "Pumpkin, terracotta and warm brick are your register. A caramel nude works for every day; cool berry never will.",
      eye:
        "Copper, olive-bronze and cinnamon are yours. Moss and antique gold give you depth without going cold.",
      liner:
        "Warm espresso or moss rather than black — your colouring has no true black in it, so black liner always looks added.",
      nails:
        "Pumpkin, warm brick, moss and golden camel. Fuchsia and blue-reds will look like someone else's hands.",
    },
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
      na("Cajun Shrimp", "#E14A46", "gloss", "cajun-shrimp", "OPI"),
      na("Malaga Wine", "#6A3A43", "gloss", "malaga-wine", "OPI"),
      na("Big Apple Red", "#B01B1E", "gloss", "big-apple-red", "OPI"),
      na("Mademoiselle", "#D3A493", "satin", "mademoiselle", "Essie"),
    ],
    skip: "Skip cool berry, fuchsia and blue-based reds — they fight the gold in your skin.",
  },

  "soft autumn": {
    foundation: [
      f("Neutral Ivory", "#F3DECB"), f("Soft Beige", "#E2C4A6"),
      f("Warm Sand", "#C8A382"), f("Muted Tan", "#A88663"), f("Soft Walnut", "#7F6046"),
    ],
    guidance: {
      base:
        "Keep the base soft and neutral-warm. Your contrast is low, so a heavy or high-coverage finish reads as a mask.",
      blush:
        "Dusty apricot and muted rose. The rule for you is quiet — if a blush is visible from across a room it is too bright.",
      lip:
        "Rosewood, muted brick and soft cocoa. Your lip should look like a slightly better version of your own colour.",
      eye:
        "Soft bronze, warm taupe and sage. Everything stays within a few steps of each other; sharp contrast ages your eye.",
      liner:
        "Soft brown or olive-grey, smudged rather than drawn. A crisp black line is the fastest way to make you look tired.",
      nails:
        "Rosewood, sage olive and warm taupe. Bright coral and true red overpower the softness that defines you.",
    },
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
      na("Perennial Chic", "#B77A7A", "satin", "perennial-chic", "Essie"),
      na("Bare With Me", "#D8B7A0", "satin", "bare-with-me", "OPI"),
      na("Mademoiselle", "#D3A493", "satin", "mademoiselle", "Essie"),
      na("Passion", "#D08F89", "satin", "passion", "Essie"),
    ],
    skip: "Skip anything vivid or icy — bright coral, true red and stark white all overpower your softness.",
  },
  // ── WINTERS ───────────────────────────────────────────────────────────
  "deep winter": {
    foundation: [
      f("Cool Porcelain", "#F1DAD0"), f("Neutral Beige", "#DDBCA4"),
      f("Cool Honey", "#BE9573"), f("Cool Chestnut", "#8F6549"), f("Deep Espresso", "#5C3B2C"),
    ],
    guidance: {
      base:
        "Match exactly at depth, and keep it cool to neutral-cool. A golden or peachy base turns orange against your undertone.",
      blush:
        "Cool plum and deep berry. Warm corals and peaches will look like a stripe rather than a flush.",
      lip:
        "This is your strongest feature. True red, black cherry and deep plum all belong to you — nude lips waste the contrast you have.",
      eye:
        "Charcoal, deep emerald and blackened plum, with icy silver to lift. Warm browns and bronzes muddy you.",
      liner:
        "True black, and you can draw it properly. You are one of the few seasons black liner genuinely belongs to.",
      nails:
        "True red, black cherry, deep emerald. Nude and beige polish make your hands look unfinished.",
    },
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
      na("Big Apple Red", "#B01B1E", "gloss", "big-apple-red", "OPI"),
      na("Berry Naughty", "#74303E", "gloss", "berry-naughty", "OPI"),
      na("Midnight Cami", "#344360", "gloss", "midnight-cami", "OPI"),
      na("Malaga Wine", "#6A3A43", "gloss", "malaga-wine", "OPI"),
    ],
    skip: "Skip warm orange, camel and muted earth tones — they dull the clarity your colouring depends on.",
  },

  "true winter": {
    foundation: [
      f("Cool Ivory", "#F4DFD8"), f("Rose Beige", "#E3C0AE"),
      f("Neutral Tan", "#C09478"), f("Cool Walnut", "#8E6650"), f("Cool Mahogany", "#603E31"),
    ],
    guidance: {
      base:
        "Cool and blue-based throughout. A rosy base reads correct on you where a golden one immediately greys.",
      blush:
        "Cool pink and raspberry. Keep it clear — a muted or dusty blush goes flat against your clarity.",
      lip:
        "Blue-red, fuchsia and cool ruby. These are loud colours that look ordinary on you, which is the point.",
      eye:
        "Pure silver, royal blue, emerald, cool charcoal. Anything warm or golden reads as dirt against your skin.",
      liner:
        "Jet black or royal navy. Brown liner will always look slightly muddy on you.",
      nails:
        "Blue-red, fuchsia, royal blue, pure white. Orange, gold and beige are the three to leave.",
    },
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
      na("Big Apple Red", "#B01B1E", "gloss", "big-apple-red", "OPI"),
      na("Charged Up Cherry", "#BE2073", "gloss", "charged-up-cherry", "OPI"),
      na("Midnight Cami", "#344360", "gloss", "midnight-cami", "OPI"),
      na("Sheer Bliss", "#DFD4C5", "satin", "sheer-bliss", "OPI"),
    ],
    skip: "Skip orange-red, gold and anything beige-warm — they muddy a palette that wants blue underneath.",
  },

  "bright winter": {
    foundation: [
      f("Bright Ivory", "#F6E1D6"), f("Clear Beige", "#E5C3AC"),
      f("Neutral Honey", "#C69A7C"), f("Clear Tan", "#A0755A"), f("Deep Cool Cocoa", "#674436"),
    ],
    guidance: {
      base:
        "Cool-neutral and clean. Keep the finish light-reflecting; a flat matte base kills the clarity your whole palette depends on.",
      blush:
        "Hot pink and clear raspberry. Muted and dusty shades read as grime on you rather than as softness.",
      lip:
        "Bright cherry, electric fuchsia, clear red. If a lipstick looks alarming in the tube it is probably yours.",
      eye:
        "Bright silver, electric teal and vivid violet, with clear black to anchor. Nothing greyed, nothing earthy.",
      liner:
        "Jet black, or a saturated teal or violet if you want colour. Softened liner wastes your contrast.",
      nails:
        "Bright cherry, electric fuchsia, icy white, clear black. Dusty and earthy polish look dirty against you.",
    },
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
      na("Charged Up Cherry", "#BE2073", "gloss", "charged-up-cherry", "OPI"),
      na("Sheer Bliss", "#DFD4C5", "satin", "sheer-bliss", "OPI"),
      na("Midnight Cami", "#344360", "gloss", "midnight-cami", "OPI"),
      na("Strawberry Margarita", "#D03364", "gloss", "strawberry-margarita", "OPI"),
    ],
    skip: "Skip dusty, greyed and earthy shades — anything muted reads as dirt against your clarity.",
  },

  // ── SPRINGS ───────────────────────────────────────────────────────────
  "light spring": {
    foundation: [
      f("Porcelain Warm", "#FBEADA"), f("Light Ivory", "#F4DCC2"),
      f("Warm Cream", "#EACAA6"), f("Light Golden", "#DDB289"), f("Soft Honey", "#C79B72"),
    ],
    guidance: {
      base:
        "Light and warm. The commonest mistake is going one shade too deep, which drops a veil over your whole face.",
      blush:
        "Light peach and soft coral, applied with a light hand. Your face flushes easily, so you need less than you think.",
      lip:
        "Peach nude, coral pink and warm rose. Your lip should look fresh rather than dressed.",
      eye:
        "Warm champagne, light peach shimmer and soft aqua. Keep everything luminous; matte darks flatten you.",
      liner:
        "Warm taupe or soft bronze, never black. Black liner on a light warm face reads as a line drawn on top of it.",
      nails:
        "Coral pink, light peach and warm rose. Black, burgundy and charcoal swamp a light, delicate hand.",
    },
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
      na("Bare With Me", "#D8B7A0", "satin", "bare-with-me", "OPI"),
      na("Bachelorette Bash", "#E36085", "gloss", "bachelorette-bash", "Essie"),
      na("Sheer Bliss", "#DFD4C5", "satin", "sheer-bliss", "OPI"),
      na("Mademoiselle", "#D3A493", "satin", "mademoiselle", "Essie"),
    ],
    skip: "Skip black, burgundy and charcoal — depth of that order swamps a light, delicate face.",
  },

  "true spring": {
    foundation: [
      f("Warm Porcelain", "#F9E4CE"), f("Golden Ivory", "#F0D0AC"),
      f("Warm Beige", "#DFB287"), f("Golden Tan", "#C7986B"), f("Warm Caramel", "#AC7B52"),
    ],
    guidance: {
      base:
        "Clearly golden, and let it look sunlit rather than neutral. Ashy bases are the one thing that consistently fails on you.",
      blush:
        "Warm coral and golden peach. You can take more brightness than you expect, as long as it stays warm.",
      lip:
        "Clear coral, poppy and warm watermelon. Mauve and dusty rose drain you on sight.",
      eye:
        "Bright gold, warm copper and clear turquoise. Your eye colour should look lit, not smoked.",
      liner:
        "Warm brown or bronze-gold. Teal is your one adventurous option and it works.",
      nails:
        "Clear coral, bright gold and fresh green. Anything greyed takes the life out of your hands.",
    },
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
      na("Cajun Shrimp", "#E14A46", "gloss", "cajun-shrimp", "OPI"),
      na("Bare With Me", "#D8B7A0", "satin", "bare-with-me", "OPI"),
      na("Mademoiselle", "#D3A493", "satin", "mademoiselle", "Essie"),
      na("Watermelon", "#DF4747", "gloss", "watermelon", "OPI"),
    ],
    skip: "Skip mauve, dusty rose and anything greyed — muting is what takes the life out of this palette.",
  },

  "bright spring": {
    foundation: [
      f("Bright Ivory", "#FAE6D4"), f("Warm Clear Beige", "#EFCEAB"),
      f("Clear Golden", "#DDAF85"), f("Bright Tan", "#C59468"), f("Warm Amber Deep", "#A87450"),
    ],
    guidance: {
      base:
        "Warm with real clarity. Keep it clean and luminous — powdery finishes flatten the contrast you carry.",
      blush:
        "Bright coral and vivid peach. Your blush can be properly bright; muting it is what makes you look ill.",
      lip:
        "Vivid coral, clear poppy and hot peach. These are the colours other people find too much.",
      eye:
        "Vivid gold, clear turquoise and bright copper. Smoky eyes are the one look that never works on you.",
      liner:
        "Warm espresso for every day, bright teal when you want it. Grey and taupe go dull on you.",
      nails:
        "Vivid coral, clear turquoise, vivid gold. Dusty, smoky and earthy shades read as grime beside you.",
    },
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
      na("Cajun Shrimp", "#E14A46", "gloss", "cajun-shrimp", "OPI"),
      na("Bare With Me", "#D8B7A0", "satin", "bare-with-me", "OPI"),
      na("Bachelorette Bash", "#E36085", "gloss", "bachelorette-bash", "Essie"),
      na("Watermelon", "#DF4747", "gloss", "watermelon", "OPI"),
    ],
    skip: "Skip dusty, smoky and earthy shades — they read as grime beside colours this clear.",
  },

  // ── SUMMERS ───────────────────────────────────────────────────────────
  "light summer": {
    foundation: [
      f("Cool Porcelain", "#FBE8E0"), f("Rose Ivory", "#F3D8CB"),
      f("Cool Light Beige", "#E6C3AE"), f("Soft Rose Beige", "#D4A990"), f("Cool Sand", "#BE9276"),
    ],
    guidance: {
      base:
        "Light and cool with a rosy cast. A golden base turns sallow on you almost immediately.",
      blush:
        "Soft rose and cool petal pink. Yours is the softest blush of any season — build it slowly.",
      lip:
        "Soft rose pink and cool petal. Your lip works best barely deeper than your own colour.",
      eye:
        "Soft pearl grey, cool lilac and powder blue. Keep everything light; dark shadow overwhelms your eye.",
      liner:
        "Soft grey or cool slate, smudged. Black is far too heavy for a face this light and cool.",
      nails:
        "Soft rose, powder blue and cool lilac. Black, orange and deep brown all fight a light cool hand.",
    },
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
      na("Angel Food", "#E3C9CB", "satin", "angel-food", "Essie"),
      na("Tiara", "#DAA9C5", "satin", "tiara", "Essie"),
      na("Mod About You", "#E2A7B0", "satin", "mod-about-you", "Essie"),
      na("Princesses Rule", "#C37E8B", "satin", "princesses-rule", "OPI"),
    ],
    skip: "Skip black, orange and deep browns — the weight and the warmth both work against a light cool face.",
  },

  "true summer": {
    foundation: [
      f("Rose Porcelain", "#F8E2DA"), f("Cool Ivory", "#EFD1C2"),
      f("Rose Beige", "#DBB39D"), f("Cool Tan", "#C19A80"), f("Cool Cocoa", "#9E7660"),
    ],
    guidance: {
      base:
        "Cool and rose-based. Match to the pink in your skin rather than to the depth of your hair.",
      blush:
        "Cool rose and soft raspberry. Warmth is the single thing that pulls your face off-key.",
      lip:
        "Cool rose, soft raspberry and mauve. Your lip should look cool even when it is strong.",
      eye:
        "Cool taupe, soft plum and slate blue. Grey-based shadows do the work that browns do on warm seasons.",
      liner:
        "Soft charcoal or cool plum. Warm brown liner reads slightly orange against you.",
      nails:
        "Cool rose, slate blue and dusty plum. Orange, gold and warm camel are the ones to skip.",
    },
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
      na("Midnight Cami", "#344360", "gloss", "midnight-cami", "OPI"),
      na("Berry Naughty", "#74303E", "gloss", "berry-naughty", "OPI"),
      na("Tiara", "#DAA9C5", "satin", "tiara", "Essie"),
      na("Princesses Rule", "#C37E8B", "satin", "princesses-rule", "OPI"),
    ],
    skip: "Skip orange, gold and warm camel — warmth of any kind is what pulls this face off-key.",
  },

  "soft summer": {
    foundation: [
      f("Neutral Rose Ivory", "#F5E0D6"), f("Soft Cool Beige", "#E6C9B6"),
      f("Muted Rose Beige", "#D0AC96", ), f("Soft Cool Tan", "#B8927B"), f("Muted Cocoa", "#96735E"),
    ],
    guidance: {
      base:
        "Neutral-cool and soft. Your contrast is the lowest of any season, so a heavy base immediately looks applied.",
      blush:
        "Dusty rose and muted mauve. If it announces itself, it is wrong for you.",
      lip:
        "Soft mauve and dusty rose. Yours is the most forgiving lip register — nothing needs to be strong.",
      eye:
        "Soft taupe, muted plum and sage grey. Everything close in value; edges are what age this face.",
      liner:
        "Soft grey-brown or muted plum, always blended. A crisp line cuts across your softness.",
      nails:
        "Dusty rose, muted plum and sage grey. Black, pure white and anything vivid overwhelm you.",
    },
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
      na("Princesses Rule", "#C37E8B", "satin", "princesses-rule", "OPI"),
      na("Malaga Wine", "#6A3A43", "gloss", "malaga-wine", "OPI"),
      na("Perennial Chic", "#B77A7A", "satin", "perennial-chic", "Essie"),
      na("Passion", "#D08F89", "satin", "passion", "Essie"),
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
