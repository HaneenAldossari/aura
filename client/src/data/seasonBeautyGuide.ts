// ---------------------------------------------------------------------------
// Season Beauty Guide — per-season (12-season) makeup, nail & gemstone data
// ---------------------------------------------------------------------------
// Complements seasonColors.ts (which provides 4-family MakeupSwatches via
// getSeasonMakeupSwatches) with per-SUB-season detail, essie/OPI-style nail
// shade names (matching server/prompts/colorAnalysis.ts nail rules) and
// gemstone picks (matching the prompt's gemstone guidelines).
// Hair shades intentionally excluded — see hairShadeLibrary.ts.

// ---- Types ----------------------------------------------------------------

export type ShadeFinish = "matte" | "satin" | "shimmer" | "gloss";

export interface BeautyShade {
  name: string;
  hex: string;
  finish?: ShadeFinish;
}

export interface GemstoneEntry {
  name: string;
  /** Dominant stone body color */
  hex: string;
  /** Lighter facet / highlight color */
  accent: string;
}

export interface SeasonBeautyGuide {
  /** Canonical display name, e.g. "Light Spring" */
  season: string;
  blush: BeautyShade[];
  lips: {
    everyday: BeautyShade[];
    bold: BeautyShade[];
  };
  eyes: BeautyShade[];
  /** Ordered light → deep (bronzer should sit at least one depth below skin) */
  bronzer: BeautyShade[];
  nails: {
    best: BeautyShade[];
    avoid: BeautyShade[];
  };
  gemstones: GemstoneEntry[];
  foundationTip: string;
}

// ---- Nail polish shade library (essie/OPI-style names from the analysis
//      prompt's nail rules, with faithful hex estimates of the real shades) --

const NAIL_SHADES = {
  // Sheer / light / nude
  "Ballet Slippers": { hex: "#F2D8DC", finish: "satin" }, // sheer pale cool pink
  "Bubble Bath": { hex: "#F6DDD8", finish: "satin" }, // sheer pink-nude
  "Sheer Bliss": { hex: "#F0D5D8", finish: "satin" }, // milky sheer pink
  "Limo-Scene": { hex: "#EAD4DA", finish: "satin" }, // sheer pinky-beige
  Tiara: { hex: "#EFE3E2", finish: "shimmer" }, // pearly sheer white-pink
  "Sugar Daddy": { hex: "#F5D9D4", finish: "gloss" }, // sheer warm-leaning pink
  Mademoiselle: { hex: "#F2D3CB", finish: "satin" }, // sheer warm pink-nude
  "Bare With Me": { hex: "#E3C3B0", finish: "satin" }, // sheer warm beige-nude
  "Angel Food": { hex: "#F5E3D4", finish: "satin" }, // creamy warm ivory-peach
  // Light-medium pinks
  "Pink-ing of You": { hex: "#F4B9B8", finish: "gloss" }, // soft warm baby pink
  "Mod About You": { hex: "#F1A7C4", finish: "gloss" }, // cool bubblegum pastel pink
  "Princesses Rule": { hex: "#EFC3D4", finish: "shimmer" }, // sparkly cool sheer pink
  "Lovie Dovie": { hex: "#ED7A9E", finish: "gloss" }, // fresh warm tulip pink
  Passion: { hex: "#D8A0AC", finish: "gloss" }, // soft muted rose-mauve
  "Perennial Chic": { hex: "#B9A39B", finish: "gloss" }, // greige mauve-taupe
  // Medium / bright
  Watermelon: { hex: "#E04A62", finish: "gloss" }, // juicy pink-red
  "Strawberry Margarita": { hex: "#E85D78", finish: "gloss" }, // bright warm pink
  "Bachelorette Bash": { hex: "#D94F70", finish: "gloss" }, // vivid warm raspberry
  "Cajun Shrimp": { hex: "#E2543F", finish: "gloss" }, // coral red
  // Dark
  "Big Apple Red": { hex: "#BF1932", finish: "gloss" }, // classic blue-based red
  "Charged Up Cherry": { hex: "#D6104C", finish: "gloss" }, // electric cool cherry
  "Malaga Wine": { hex: "#8E2043", finish: "gloss" }, // deep wine red
  "Berry Naughty": { hex: "#6E2142", finish: "gloss" }, // deep warm-leaning berry
  "Midnight Cami": { hex: "#1C2749", finish: "gloss" }, // navy-black
} as const satisfies Record<string, { hex: string; finish: ShadeFinish }>;

type NailShadeName = keyof typeof NAIL_SHADES;

function nail(name: NailShadeName): BeautyShade {
  const s = NAIL_SHADES[name];
  return { name, hex: s.hex, finish: s.finish };
}

// ---- Gemstone library (names restricted to the analysis prompt's list) ----

const GEMS = {
  Diamond: { hex: "#C9E8F2", accent: "#F0FAFF" },
  Sapphire: { hex: "#0F52BA", accent: "#5B8FD9" },
  Amethyst: { hex: "#9966CC", accent: "#C9A8E8" },
  Aquamarine: { hex: "#86D3CE", accent: "#C4EEEA" },
  Pearl: { hex: "#F0EAD6", accent: "#FBF7EC" },
  Moonstone: { hex: "#B9B7C4", accent: "#E6E4F0" },
  "Rose Quartz": { hex: "#E8B4B8", accent: "#F6D8DA" },
  Topaz: { hex: "#F0C05A", accent: "#F9E0A0" },
  Amber: { hex: "#E8A317", accent: "#FFD073" },
  Citrine: { hex: "#E4C760", accent: "#F3E19A" },
  "Tigers Eye": { hex: "#B5651D", accent: "#DA9A52" },
  Carnelian: { hex: "#B44420", accent: "#DC7B52" },
  Garnet: { hex: "#6D1A22", accent: "#A34A50" },
  Turquoise: { hex: "#40C4AC", accent: "#8EE3D2" },
  Jade: { hex: "#00A86B", accent: "#66CBA0" },
  Peridot: { hex: "#9ACD32", accent: "#C6E67A" },
  Opal: { hex: "#EAE3E0", accent: "#BFE8E0" },
  Ruby: { hex: "#9B111E", accent: "#D14A57" },
  Emerald: { hex: "#046A38", accent: "#50C878" },
  "Lapis Lazuli": { hex: "#26619C", accent: "#5A8FD0" },
  "Smoky Quartz": { hex: "#7B6B5D", accent: "#AC9B8B" },
} as const satisfies Record<string, { hex: string; accent: string }>;

type GemName = keyof typeof GEMS;

function gem(name: GemName): GemstoneEntry {
  return { name, hex: GEMS[name].hex, accent: GEMS[name].accent };
}

// ---- Bronzer ladders (ordered light → deep, per prompt bronzer rules) -----

const WARM_LIGHT_BRONZERS: BeautyShade[] = [
  { name: "Sun Bronze", hex: "#D9AE78", finish: "satin" },
  { name: "Warm Tan Bronze", hex: "#C49058", finish: "matte" },
  { name: "Golden Bronze", hex: "#B8793F", finish: "shimmer" },
];

const WARM_MEDIUM_BRONZERS: BeautyShade[] = [
  { name: "Golden Bronze", hex: "#C49058", finish: "shimmer" },
  { name: "Medium Bronze", hex: "#A9743F", finish: "matte" },
  { name: "Terracotta Bronze", hex: "#96562E", finish: "matte" },
];

const WARM_DEEP_BRONZERS: BeautyShade[] = [
  { name: "Terracotta Bronze", hex: "#A0622D", finish: "matte" },
  { name: "Deep Bronze", hex: "#7C4A28", finish: "satin" },
  { name: "Rich Bronze", hex: "#5E3A20", finish: "matte" },
];

const COOL_LIGHT_BRONZERS: BeautyShade[] = [
  { name: "Light Bronze", hex: "#CBB6A2", finish: "satin" },
  { name: "Cool Taupe Bronze", hex: "#9A8878", finish: "matte" },
  { name: "Cool Espresso Bronze", hex: "#6E5A4C", finish: "matte" },
];

const COOL_DEEP_BRONZERS: BeautyShade[] = [
  { name: "Cool Taupe Bronze", hex: "#8B7D72", finish: "matte" },
  { name: "Cool Espresso Bronze", hex: "#5C4A3D", finish: "matte" },
  { name: "Dark Bronze", hex: "#3D2B1F", finish: "matte" },
];

// ---- Per-season guides ----------------------------------------------------

const lightSpring: SeasonBeautyGuide = {
  season: "Light Spring",
  blush: [
    { name: "Peach", hex: "#F5B08E", finish: "satin" },
    { name: "Soft Pink", hex: "#F2A5A8", finish: "satin" },
    { name: "Coral Pink", hex: "#EF8878", finish: "satin" },
    { name: "Apricot", hex: "#F2A574", finish: "shimmer" },
  ],
  lips: {
    everyday: [
      { name: "Peachy Nude", hex: "#E8B49A", finish: "gloss" },
      { name: "Soft Peach", hex: "#F0A488", finish: "satin" },
      { name: "Warm Pink", hex: "#E89AA0", finish: "gloss" },
    ],
    bold: [
      { name: "Coral", hex: "#F07360", finish: "satin" },
      { name: "Warm Watermelon", hex: "#E8607A", finish: "gloss" },
      { name: "Bright Peach", hex: "#FF8A65", finish: "satin" },
    ],
  },
  eyes: [
    { name: "Champagne", hex: "#F2DCB8", finish: "shimmer" },
    { name: "Peach", hex: "#EFC09A", finish: "matte" },
    { name: "Warm Taupe", hex: "#B49A80", finish: "matte" },
    { name: "Soft Gold", hex: "#E2C878", finish: "shimmer" },
    { name: "Light Bronze", hex: "#C8A075", finish: "shimmer" },
  ],
  bronzer: WARM_LIGHT_BRONZERS,
  nails: {
    best: [
      nail("Bubble Bath"),
      nail("Sheer Bliss"),
      nail("Angel Food"),
      nail("Pink-ing of You"),
      nail("Strawberry Margarita"),
      nail("Watermelon"),
    ],
    avoid: [nail("Midnight Cami"), nail("Malaga Wine"), nail("Charged Up Cherry")],
  },
  gemstones: [gem("Citrine"), gem("Opal"), gem("Rose Quartz"), gem("Peridot")],
  foundationTip:
    "Choose light warm-ivory to peach bases with a golden undertone — rosy-pink or ashy-beige foundations will dull your fresh warmth.",
};

const trueSpring: SeasonBeautyGuide = {
  season: "True Spring",
  blush: [
    { name: "Coral Pink", hex: "#F08070", finish: "satin" },
    { name: "Warm Peach", hex: "#F09A72", finish: "satin" },
    { name: "Warm Pink", hex: "#EE8490", finish: "gloss" },
    { name: "Apricot", hex: "#EF9463", finish: "shimmer" },
  ],
  lips: {
    everyday: [
      { name: "Peachy Nude", hex: "#E0A080", finish: "satin" },
      { name: "Warm Coral", hex: "#EE7E62", finish: "gloss" },
      { name: "Soft Peach", hex: "#EC9478", finish: "satin" },
    ],
    bold: [
      { name: "True Coral", hex: "#F0563F", finish: "satin" },
      { name: "Tomato Red", hex: "#E94B35", finish: "matte" },
      { name: "Bright Warm Pink", hex: "#F45E8C", finish: "gloss" },
    ],
  },
  eyes: [
    { name: "Champagne", hex: "#F0D5B0", finish: "shimmer" },
    { name: "Warm Gold", hex: "#D4AF37", finish: "shimmer" },
    { name: "Soft Copper", hex: "#C47E48", finish: "shimmer" },
    { name: "Warm Brown", hex: "#8B6144", finish: "matte" },
    { name: "Leaf Green", hex: "#7FA05A", finish: "matte" },
  ],
  bronzer: [
    { name: "Sun Bronze", hex: "#D4A870", finish: "satin" },
    { name: "Golden Bronze", hex: "#C49058", finish: "shimmer" },
    { name: "Medium Bronze", hex: "#A9743F", finish: "matte" },
  ],
  nails: {
    best: [
      nail("Mademoiselle"),
      nail("Angel Food"),
      nail("Pink-ing of You"),
      nail("Cajun Shrimp"),
      nail("Watermelon"),
      nail("Berry Naughty"),
    ],
    avoid: [nail("Midnight Cami"), nail("Malaga Wine"), nail("Mod About You")],
  },
  gemstones: [gem("Amber"), gem("Citrine"), gem("Turquoise"), gem("Peridot")],
  foundationTip:
    "Look for golden or peach-toned bases in the warm-ivory to warm-sand family — your skin reads clearly warm, so skip anything labeled 'rose' or 'cool'.",
};

const brightSpring: SeasonBeautyGuide = {
  season: "Bright Spring",
  blush: [
    { name: "Bright Coral", hex: "#F26B58", finish: "satin" },
    { name: "Warm Pink", hex: "#F4708C", finish: "gloss" },
    { name: "Peach Pop", hex: "#F49A78", finish: "satin" },
    { name: "Watermelon Flush", hex: "#EE5570", finish: "satin" },
  ],
  lips: {
    everyday: [
      { name: "Peachy Nude", hex: "#E8A488", finish: "gloss" },
      { name: "Light Coral", hex: "#F08A70", finish: "gloss" },
      { name: "Warm Rose", hex: "#E27288", finish: "satin" },
    ],
    bold: [
      { name: "Bright Coral Red", hex: "#FF4F42", finish: "satin" },
      { name: "Watermelon", hex: "#FF3F66", finish: "gloss" },
      { name: "Hot Coral Pink", hex: "#FF5E7E", finish: "satin" },
    ],
  },
  eyes: [
    { name: "Champagne", hex: "#F4DFBA", finish: "shimmer" },
    { name: "Bronze", hex: "#B07A42", finish: "shimmer" },
    { name: "Bright Teal", hex: "#159C94", finish: "shimmer" },
    { name: "Warm Brown", hex: "#7A5638", finish: "matte" },
    { name: "Gold", hex: "#D9B24A", finish: "shimmer" },
  ],
  bronzer: [
    { name: "Sun Bronze", hex: "#D4A870", finish: "satin" },
    { name: "Golden Bronze", hex: "#C08A4E", finish: "shimmer" },
    { name: "Medium Bronze", hex: "#A26C38", finish: "matte" },
  ],
  nails: {
    best: [
      nail("Sugar Daddy"),
      nail("Lovie Dovie"),
      nail("Strawberry Margarita"),
      nail("Cajun Shrimp"),
      nail("Bachelorette Bash"),
      nail("Berry Naughty"),
    ],
    avoid: [nail("Perennial Chic"), nail("Malaga Wine"), nail("Midnight Cami")],
  },
  gemstones: [gem("Turquoise"), gem("Citrine"), gem("Jade"), gem("Amber")],
  foundationTip:
    "Pick clear golden or neutral-warm bases with a luminous (not flat-matte) finish — muted greige or rosy tones will grey out your natural clarity.",
};

const lightSummer: SeasonBeautyGuide = {
  season: "Light Summer",
  blush: [
    { name: "Soft Pink", hex: "#EFB2C0", finish: "satin" },
    { name: "Cool Rose", hex: "#E393A8", finish: "satin" },
    { name: "Dusty Rose", hex: "#D9A0AC", finish: "matte" },
    { name: "Baby Pink", hex: "#F2BECB", finish: "shimmer" },
  ],
  lips: {
    everyday: [
      { name: "Nude Pink", hex: "#DBA8AC", finish: "satin" },
      { name: "Rose Pink", hex: "#D6899B", finish: "gloss" },
      { name: "Soft Mauve", hex: "#C793A2", finish: "satin" },
    ],
    bold: [
      { name: "Cool Pink", hex: "#D46E92", finish: "gloss" },
      { name: "Raspberry Rose", hex: "#BC4F72", finish: "satin" },
      { name: "Soft Berry", hex: "#A65C7C", finish: "satin" },
    ],
  },
  eyes: [
    { name: "Icy Pink", hex: "#EFD4DA", finish: "shimmer" },
    { name: "Cool Taupe", hex: "#A99A94", finish: "matte" },
    { name: "Lavender", hex: "#B8A8C8", finish: "shimmer" },
    { name: "Slate", hex: "#7A8796", finish: "matte" },
    { name: "Dusty Rose", hex: "#C4A0A8", finish: "matte" },
  ],
  bronzer: COOL_LIGHT_BRONZERS,
  nails: {
    best: [
      nail("Ballet Slippers"),
      nail("Bubble Bath"),
      nail("Limo-Scene"),
      nail("Mod About You"),
      nail("Princesses Rule"),
      nail("Malaga Wine"),
    ],
    avoid: [nail("Cajun Shrimp"), nail("Watermelon"), nail("Angel Food")],
  },
  gemstones: [gem("Aquamarine"), gem("Rose Quartz"), gem("Pearl"), gem("Moonstone")],
  foundationTip:
    "Reach for fair-to-light bases with a rosy or neutral-cool undertone (porcelain, cool ivory, rose beige) — golden or yellow bases will look sallow on you.",
};

const trueSummer: SeasonBeautyGuide = {
  season: "True Summer",
  blush: [
    { name: "Cool Rose", hex: "#D4849A", finish: "satin" },
    { name: "Soft Mauve", hex: "#C48BA0", finish: "matte" },
    { name: "Berry Rose", hex: "#B5567A", finish: "satin" },
    { name: "Dusty Pink", hex: "#C79AA6", finish: "matte" },
  ],
  lips: {
    everyday: [
      { name: "Rose Nude", hex: "#C48E96", finish: "satin" },
      { name: "Mauve", hex: "#B07F92", finish: "satin" },
      { name: "Dusty Rose", hex: "#C08090", finish: "gloss" },
    ],
    bold: [
      { name: "Raspberry", hex: "#A93A66", finish: "satin" },
      { name: "Soft Blue-Red", hex: "#B82A50", finish: "satin" },
      { name: "Plum Rose", hex: "#8E4A70", finish: "matte" },
    ],
  },
  eyes: [
    { name: "Cool Taupe", hex: "#9E8E86", finish: "matte" },
    { name: "Soft Plum", hex: "#8B7090", finish: "matte" },
    { name: "Slate Blue", hex: "#6E7F96", finish: "matte" },
    { name: "Pink Pearl", hex: "#C9B6BE", finish: "shimmer" },
    { name: "Dusty Mauve", hex: "#A0879A", finish: "matte" },
  ],
  bronzer: [
    { name: "Light Bronze", hex: "#C8B8A8", finish: "satin" },
    { name: "Cool Taupe Bronze", hex: "#8B7D72", finish: "matte" },
    { name: "Cool Espresso Bronze", hex: "#5C4A3D", finish: "matte" },
  ],
  nails: {
    best: [
      nail("Ballet Slippers"),
      nail("Sheer Bliss"),
      nail("Passion"),
      nail("Mod About You"),
      nail("Perennial Chic"),
      nail("Malaga Wine"),
    ],
    avoid: [nail("Cajun Shrimp"), nail("Strawberry Margarita"), nail("Bare With Me")],
  },
  gemstones: [gem("Sapphire"), gem("Amethyst"), gem("Pearl"), gem("Aquamarine")],
  foundationTip:
    "Choose rosy or neutral-cool bases (rose beige, cool sand, cool medium) — anything golden or honey-toned will fight your soft pink undertone.",
};

const softSummer: SeasonBeautyGuide = {
  season: "Soft Summer",
  blush: [
    { name: "Dusty Mauve", hex: "#BC8C98", finish: "matte" },
    { name: "Soft Rose", hex: "#CE97A2", finish: "satin" },
    { name: "Muted Berry", hex: "#A66B82", finish: "matte" },
  ],
  lips: {
    everyday: [
      { name: "Rose Taupe", hex: "#B58890", finish: "satin" },
      { name: "Dusty Rose", hex: "#C08E92", finish: "satin" },
      { name: "Mauve Nude", hex: "#AD7E88", finish: "matte" },
    ],
    bold: [
      { name: "Muted Berry", hex: "#94486A", finish: "satin" },
      { name: "Plum Rose", hex: "#8B5074", finish: "matte" },
      { name: "Soft Wine", hex: "#7E3D55", finish: "satin" },
    ],
  },
  eyes: [
    { name: "Cool Taupe", hex: "#9E8E80", finish: "matte" },
    { name: "Greyed Rose", hex: "#B79AA0", finish: "shimmer" },
    { name: "Smoky Plum", hex: "#77627E", finish: "matte" },
    { name: "Slate", hex: "#708090", finish: "matte" },
    { name: "Muted Mauve", hex: "#A08898", finish: "matte" },
  ],
  bronzer: [
    { name: "Light Bronze", hex: "#C8B8A8", finish: "satin" },
    { name: "Cool Taupe Bronze", hex: "#8B7D72", finish: "matte" },
    { name: "Cool Espresso Bronze", hex: "#6E5A4C", finish: "matte" },
  ],
  nails: {
    best: [
      nail("Ballet Slippers"),
      nail("Limo-Scene"),
      nail("Perennial Chic"),
      nail("Passion"),
      nail("Princesses Rule"),
      nail("Malaga Wine"),
    ],
    avoid: [nail("Cajun Shrimp"), nail("Watermelon"), nail("Bachelorette Bash")],
  },
  gemstones: [gem("Moonstone"), gem("Rose Quartz"), gem("Pearl"), gem("Amethyst")],
  foundationTip:
    "Go for neutral-to-cool bases with a soft, natural matte or satin finish (neutral sand, rose beige) — high-glow golden formulas overpower your muted coloring.",
};

const softAutumn: SeasonBeautyGuide = {
  season: "Soft Autumn",
  blush: [
    { name: "Muted Peach", hex: "#D89B82", finish: "satin" },
    { name: "Dusty Coral", hex: "#C97F6C", finish: "matte" },
    { name: "Soft Terracotta", hex: "#BC6E56", finish: "matte" },
    { name: "Warm Rose", hex: "#C58878", finish: "satin" },
  ],
  lips: {
    everyday: [
      { name: "Warm Nude", hex: "#BE8A6E", finish: "satin" },
      { name: "Dusty Peach", hex: "#CE9078", finish: "gloss" },
      { name: "Muted Coral", hex: "#C1705F", finish: "satin" },
    ],
    bold: [
      { name: "Soft Brick", hex: "#A6503C", finish: "matte" },
      { name: "Terracotta Red", hex: "#AB5844", finish: "satin" },
      { name: "Warm Berry", hex: "#8E4A52", finish: "satin" },
    ],
  },
  eyes: [
    { name: "Warm Taupe", hex: "#A08B76", finish: "matte" },
    { name: "Golden Bronze", hex: "#B58A5C", finish: "shimmer" },
    { name: "Sage", hex: "#8A8F62", finish: "matte" },
    { name: "Dusty Peach", hex: "#CFA184", finish: "matte" },
    { name: "Soft Copper", hex: "#B67B54", finish: "shimmer" },
  ],
  bronzer: [
    { name: "Soft Bronze", hex: "#C9A176", finish: "satin" },
    { name: "Matte Warm Bronze", hex: "#B08050", finish: "matte" },
    { name: "Medium Bronze", hex: "#96683F", finish: "matte" },
  ],
  nails: {
    best: [
      nail("Bare With Me"),
      nail("Mademoiselle"),
      nail("Sugar Daddy"),
      nail("Perennial Chic"),
      nail("Passion"),
      nail("Berry Naughty"),
    ],
    avoid: [nail("Charged Up Cherry"), nail("Midnight Cami"), nail("Mod About You")],
  },
  gemstones: [gem("Citrine"), gem("Tigers Eye"), gem("Smoky Quartz"), gem("Opal")],
  foundationTip:
    "Look for softly warm bases (warm sand, golden beige, honey beige) with a skin-like satin finish — bright pink undertones or stark matte formulas read chalky on you.",
};

const trueAutumn: SeasonBeautyGuide = {
  season: "True Autumn",
  blush: [
    { name: "Terracotta", hex: "#C1654A", finish: "matte" },
    { name: "Warm Peach", hex: "#D4826B", finish: "satin" },
    { name: "Brick Red", hex: "#A0522D", finish: "matte" },
    { name: "Bronze Rose", hex: "#B87461", finish: "shimmer" },
  ],
  lips: {
    everyday: [
      { name: "Warm Nude", hex: "#B87850", finish: "satin" },
      { name: "Caramel", hex: "#C49070", finish: "gloss" },
      { name: "Terracotta", hex: "#B25F42", finish: "satin" },
    ],
    bold: [
      { name: "Brick Red", hex: "#9A2E10", finish: "matte" },
      { name: "Rust", hex: "#A94724", finish: "satin" },
      { name: "Warm Wine", hex: "#71302A", finish: "matte" },
    ],
  },
  eyes: [
    { name: "Copper", hex: "#B87333", finish: "shimmer" },
    { name: "Rust", hex: "#A0522D", finish: "matte" },
    { name: "Moss Green", hex: "#556B2F", finish: "matte" },
    { name: "Antique Gold", hex: "#A67C1A", finish: "shimmer" },
    { name: "Burnt Sienna", hex: "#8B4513", finish: "matte" },
  ],
  bronzer: WARM_MEDIUM_BRONZERS,
  nails: {
    best: [
      nail("Bare With Me"),
      nail("Angel Food"),
      nail("Mademoiselle"),
      nail("Cajun Shrimp"),
      nail("Strawberry Margarita"),
      nail("Berry Naughty"),
    ],
    avoid: [nail("Midnight Cami"), nail("Charged Up Cherry"), nail("Princesses Rule")],
  },
  gemstones: [gem("Amber"), gem("Tigers Eye"), gem("Carnelian"), gem("Garnet")],
  foundationTip:
    "Choose distinctly golden, honey, or olive-leaning bases (golden beige through caramel) — your warmth is strong, so avoid any rose or neutral-cool shade.",
};

const deepAutumn: SeasonBeautyGuide = {
  season: "Deep Autumn",
  blush: [
    { name: "Deep Terracotta", hex: "#B75C40", finish: "matte" },
    { name: "Brick", hex: "#9E4732", finish: "matte" },
    { name: "Warm Berry", hex: "#96424A", finish: "satin" },
    { name: "Bronze Rose", hex: "#A05C48", finish: "shimmer" },
  ],
  lips: {
    everyday: [
      { name: "Toffee", hex: "#A6704E", finish: "satin" },
      { name: "Warm Rosewood", hex: "#9C5A4C", finish: "satin" },
      { name: "Brick Nude", hex: "#A05540", finish: "gloss" },
    ],
    bold: [
      { name: "Deep Brick", hex: "#7E2A14", finish: "matte" },
      { name: "Warm Burgundy", hex: "#66242A", finish: "satin" },
      { name: "Raisin", hex: "#5A2E33", finish: "matte" },
    ],
  },
  eyes: [
    { name: "Espresso", hex: "#4B2E1F", finish: "matte" },
    { name: "Deep Copper", hex: "#A6642E", finish: "shimmer" },
    { name: "Deep Olive", hex: "#4E512C", finish: "matte" },
    { name: "Antique Gold", hex: "#9C7A2E", finish: "shimmer" },
    { name: "Aubergine", hex: "#4A263A", finish: "matte" },
  ],
  bronzer: WARM_DEEP_BRONZERS,
  nails: {
    best: [
      nail("Bare With Me"),
      nail("Mademoiselle"),
      nail("Cajun Shrimp"),
      nail("Bachelorette Bash"),
      nail("Watermelon"),
      nail("Berry Naughty"),
    ],
    avoid: [nail("Ballet Slippers"), nail("Mod About You"), nail("Midnight Cami")],
  },
  gemstones: [gem("Garnet"), gem("Emerald"), gem("Smoky Quartz"), gem("Amber")],
  foundationTip:
    "Match your true depth with warm golden or mahogany-leaning bases (caramel, warm brown, deep tan) — never lighten up, and skip cool ashy undertones.",
};

const deepWinter: SeasonBeautyGuide = {
  season: "Deep Winter",
  blush: [
    { name: "Cool Berry", hex: "#A03A5C", finish: "satin" },
    { name: "Deep Rose", hex: "#B04A6A", finish: "matte" },
    { name: "Wine Flush", hex: "#7E2A48", finish: "satin" },
  ],
  lips: {
    everyday: [
      { name: "Deep Rose Nude", hex: "#A96A74", finish: "satin" },
      { name: "Mulberry", hex: "#8E4462", finish: "satin" },
      { name: "Berry Balm", hex: "#94476A", finish: "gloss" },
    ],
    bold: [
      { name: "Deep Berry", hex: "#7A1F3D", finish: "matte" },
      { name: "Wine", hex: "#58152E", finish: "satin" },
      { name: "Blue Red", hex: "#B3002D", finish: "matte" },
    ],
  },
  eyes: [
    { name: "Charcoal", hex: "#36454F", finish: "matte" },
    { name: "Deep Plum", hex: "#3B1A45", finish: "matte" },
    { name: "Silver", hex: "#A8A9AD", finish: "shimmer" },
    { name: "Deep Emerald", hex: "#0F5148", finish: "shimmer" },
    { name: "Navy", hex: "#14224A", finish: "matte" },
  ],
  bronzer: [
    { name: "Cool Espresso Bronze", hex: "#5C4A3D", finish: "matte" },
    { name: "Deep Bronze", hex: "#46352A", finish: "matte" },
    { name: "Dark Bronze", hex: "#33241B", finish: "matte" },
  ],
  nails: {
    best: [
      nail("Ballet Slippers"),
      nail("Tiara"),
      nail("Princesses Rule"),
      nail("Big Apple Red"),
      nail("Malaga Wine"),
      nail("Midnight Cami"),
    ],
    avoid: [nail("Cajun Shrimp"), nail("Angel Food"), nail("Bare With Me")],
  },
  gemstones: [gem("Ruby"), gem("Emerald"), gem("Lapis Lazuli"), gem("Garnet")],
  foundationTip:
    "Choose deep bases with a cool or neutral undertone (cool tan, medium brown, deep brown) — golden-orange 'warm deep' shades will muddy your cool clarity.",
};

const trueWinter: SeasonBeautyGuide = {
  season: "True Winter",
  blush: [
    { name: "Cool Pink", hex: "#D4728C", finish: "satin" },
    { name: "Berry Rose", hex: "#B5456A", finish: "matte" },
    { name: "Icy Rose", hex: "#E0A9BE", finish: "shimmer" },
    { name: "Plum Flush", hex: "#9E4468", finish: "satin" },
  ],
  lips: {
    everyday: [
      { name: "Cool Rose Nude", hex: "#C08890", finish: "satin" },
      { name: "Mauve", hex: "#B07080", finish: "satin" },
      { name: "Sheer Berry", hex: "#A05570", finish: "gloss" },
    ],
    bold: [
      { name: "Blue Red", hex: "#CC0033", finish: "matte" },
      { name: "Fuchsia", hex: "#D1007E", finish: "satin" },
      { name: "Wine", hex: "#6B2040", finish: "matte" },
    ],
  },
  eyes: [
    { name: "Silver", hex: "#A8A9AD", finish: "shimmer" },
    { name: "Charcoal", hex: "#36454F", finish: "matte" },
    { name: "Navy", hex: "#1C2951", finish: "matte" },
    { name: "Cool Plum", hex: "#6B3A5D", finish: "matte" },
    { name: "Icy White", hex: "#E6E6EE", finish: "shimmer" },
  ],
  bronzer: COOL_DEEP_BRONZERS,
  nails: {
    best: [
      nail("Ballet Slippers"),
      nail("Princesses Rule"),
      nail("Mod About You"),
      nail("Charged Up Cherry"),
      nail("Big Apple Red"),
      nail("Midnight Cami"),
    ],
    avoid: [nail("Cajun Shrimp"), nail("Bare With Me"), nail("Angel Food")],
  },
  gemstones: [gem("Sapphire"), gem("Diamond"), gem("Ruby"), gem("Emerald")],
  foundationTip:
    "Pick bases with a clearly cool or neutral undertone at your exact depth (porcelain, cool ivory through cool tan) — even slightly yellow bases will look off against your pink-cool skin.",
};

const brightWinter: SeasonBeautyGuide = {
  season: "Bright Winter",
  blush: [
    { name: "Bright Cool Pink", hex: "#E56A94", finish: "satin" },
    { name: "Fuchsia Flush", hex: "#D6488A", finish: "satin" },
    { name: "Icy Pink", hex: "#F0B8CE", finish: "shimmer" },
  ],
  lips: {
    everyday: [
      { name: "Cool Pink Nude", hex: "#D0949E", finish: "satin" },
      { name: "Cool Rose", hex: "#C87890", finish: "gloss" },
      { name: "Sheer Raspberry", hex: "#C04E74", finish: "gloss" },
    ],
    bold: [
      { name: "Clear Blue Red", hex: "#E10600", finish: "satin" },
      { name: "Fuchsia", hex: "#E6007E", finish: "satin" },
      { name: "Cranberry", hex: "#9C1642", finish: "matte" },
    ],
  },
  eyes: [
    { name: "Silver", hex: "#C9CDD4", finish: "shimmer" },
    { name: "Icy Lilac", hex: "#CFC4E4", finish: "shimmer" },
    { name: "Charcoal", hex: "#33404C", finish: "matte" },
    { name: "Bright Navy", hex: "#14265C", finish: "matte" },
    { name: "Cool Plum", hex: "#5E3260", finish: "matte" },
  ],
  bronzer: [
    { name: "Light Bronze", hex: "#C4B0A0", finish: "satin" },
    { name: "Cool Taupe Bronze", hex: "#8B7D72", finish: "matte" },
    { name: "Cool Espresso Bronze", hex: "#5C4A3D", finish: "matte" },
  ],
  nails: {
    best: [
      nail("Tiara"),
      nail("Ballet Slippers"),
      nail("Mod About You"),
      nail("Charged Up Cherry"),
      nail("Big Apple Red"),
      nail("Midnight Cami"),
    ],
    avoid: [nail("Bare With Me"), nail("Perennial Chic"), nail("Cajun Shrimp")],
  },
  gemstones: [gem("Diamond"), gem("Sapphire"), gem("Amethyst"), gem("Ruby")],
  foundationTip:
    "Choose crisp neutral-to-cool bases with a fresh, luminous finish — muted beige or warm honey undertones will dull the natural brightness of your contrast.",
};

// ---- Registry + lookup ----------------------------------------------------

const GUIDES: Record<string, SeasonBeautyGuide> = {
  "light spring": lightSpring,
  "true spring": trueSpring,
  "bright spring": brightSpring,
  "light summer": lightSummer,
  "true summer": trueSummer,
  "soft summer": softSummer,
  "soft autumn": softAutumn,
  "true autumn": trueAutumn,
  "deep autumn": deepAutumn,
  "deep winter": deepWinter,
  "true winter": trueWinter,
  "bright winter": brightWinter,
};

// Aliases — mirror server/utils/seasonPalettes.ts, plus Soft Spring
// (mentioned by the analysis prompt but not one of the app's 12 canonical
// palettes; mapped to Light Spring as the closest light-warm-gentle match).
const ALIASES: Record<string, string> = {
  "warm spring": "true spring",
  "clear spring": "bright spring",
  "soft spring": "light spring",
  "cool summer": "true summer",
  "muted summer": "soft summer",
  "muted autumn": "soft autumn",
  "warm autumn": "true autumn",
  "dark autumn": "deep autumn",
  "dark winter": "deep winter",
  "cool winter": "true winter",
  "clear winter": "bright winter",
};

/**
 * Tolerant, case-insensitive lookup for a season's beauty guide.
 * Accepts canonical names ("Deep Winter"), aliases ("Dark Winter",
 * "Warm Autumn", "Soft Spring"), and falls back to the family's "True"
 * season if only the base season is recognizable. Ultimate fallback is
 * Soft Summer (the most commonly assigned/misidentified season).
 */
export function getSeasonBeautyGuide(season: string): SeasonBeautyGuide {
  const key = season.toLowerCase().trim();
  const resolved = GUIDES[key] ?? GUIDES[ALIASES[key] ?? ""];
  if (resolved) return resolved;

  // Family-level fallback (e.g. "Autumn", "winter something").
  if (key.includes("spring")) return trueSpring;
  if (key.includes("summer")) return trueSummer;
  if (key.includes("autumn")) return trueAutumn;
  if (key.includes("winter")) return trueWinter;
  return softSummer;
}

/** All 12 canonical guides, keyed by lowercase season name. */
export const SEASON_BEAUTY_GUIDES: Readonly<Record<string, SeasonBeautyGuide>> = GUIDES;
