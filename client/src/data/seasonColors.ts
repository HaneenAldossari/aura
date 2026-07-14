// ---------------------------------------------------------------------------
// Season Colors — swatch data for color-analysis results page
// ---------------------------------------------------------------------------

// ---- Season family helpers ------------------------------------------------

export function getSeasonFamily(
  season: string
): "autumn" | "winter" | "spring" | "summer" {
  const s = season.toLowerCase();
  if (s.includes("autumn")) return "autumn";
  if (s.includes("winter")) return "winter";
  if (s.includes("spring")) return "spring";
  return "summer";
}

export function isWarmSeason(season: string): boolean {
  const family = getSeasonFamily(season);
  return family === "autumn" || family === "spring";
}

// ---- Shared interfaces ----------------------------------------------------

export interface ColorSwatch {
  hex: string;
  name: string;
}

export interface BlushSwatch extends ColorSwatch {
  usage: string;
}

export interface LipSwatch extends ColorSwatch {
  product: string;
}

export interface EyeSwatch extends ColorSwatch {
  finish: "matte" | "shimmer";
}

export interface MakeupSwatches {
  foundation: {
    recommended: ColorSwatch[];
    avoid: ColorSwatch[];
  };
  blush: BlushSwatch[];
  bronzer: {
    yes: ColorSwatch[];
    no: ColorSwatch[];
  };
  lips: {
    everyday: LipSwatch[];
    bold: LipSwatch[];
    avoid: ColorSwatch[];
  };
  eyes: EyeSwatch[];
}

export interface JewelrySwatches {
  metals: { name: string; gradient: string; recommended: boolean }[];
  stones: { name: string; hex: string }[];
}

export interface HairSwatches {
  best: ColorSwatch[];
  avoid: ColorSwatch[];
}

// ---- Makeup data ----------------------------------------------------------

const autumnMakeup: MakeupSwatches = {
  foundation: {
    recommended: [
      { hex: "#D4A574", name: "Warm Honey" },
      { hex: "#C4956A", name: "Golden Beige" },
      { hex: "#B08660", name: "Warm Olive" },
      { hex: "#9E7856", name: "Deep Caramel" },
      { hex: "#8B6A4C", name: "Rich Toffee" },
    ],
    avoid: [
      { hex: "#F5C5B8", name: "Cool Pink" },
      { hex: "#E8B0A0", name: "Rose Beige" },
      { hex: "#DBAD9F", name: "Pink Neutral" },
    ],
  },
  blush: [
    { hex: "#C1654A", name: "Terracotta", usage: "Daily" },
    { hex: "#D4826B", name: "Warm Peach", usage: "Natural" },
    { hex: "#A0522D", name: "Brick Red", usage: "Evening" },
  ],
  bronzer: {
    yes: [
      { hex: "#B8733D", name: "Medium Bronze" },
      { hex: "#A0622D", name: "Terracotta Bronze" },
      { hex: "#8B5E3C", name: "Deep Bronze" },
    ],
    no: [
      { hex: "#8B7D72", name: "Cool Taupe Bronze" },
      { hex: "#5C4A3D", name: "Dark Bronze" },
    ],
  },
  lips: {
    everyday: [
      { hex: "#B87850", name: "Warm Nude", product: "MAC Velvet Teddy" },
      { hex: "#C49070", name: "Caramel", product: "Fenty Shawty" },
      { hex: "#A67B5B", name: "Toffee", product: "CT Pillow Talk Medium" },
    ],
    bold: [
      { hex: "#8B2500", name: "Brick Red", product: "MAC Chili" },
      { hex: "#6B1D2A", name: "Deep Burgundy", product: "MAC Marrakesh" },
      { hex: "#4A2040", name: "Warm Plum", product: "NARS Dolce Vita" },
    ],
    avoid: [
      { hex: "#FF69B4", name: "Hot Pink" },
      { hex: "#C71585", name: "Cool Berry" },
    ],
  },
  eyes: [
    { hex: "#B87333", name: "Copper", finish: "shimmer" },
    { hex: "#A0522D", name: "Rust", finish: "matte" },
    { hex: "#8B4513", name: "Burnt Sienna", finish: "matte" },
    { hex: "#556B2F", name: "Moss Green", finish: "matte" },
    { hex: "#4A2040", name: "Deep Plum", finish: "matte" },
    { hex: "#967117", name: "Warm Gold", finish: "shimmer" },
  ],
};

const winterMakeup: MakeupSwatches = {
  foundation: {
    recommended: [
      { hex: "#D9B99B", name: "Cool Beige" },
      { hex: "#E8D5C4", name: "Neutral Ivory" },
      { hex: "#C4A882", name: "Cool Sand" },
      { hex: "#F0DDD0", name: "Porcelain" },
      { hex: "#8B7355", name: "Cool Espresso" },
    ],
    avoid: [
      { hex: "#DAB07A", name: "Warm Golden" },
      { hex: "#D4A96A", name: "Yellow Beige" },
      { hex: "#B89C70", name: "Olive Tan" },
    ],
  },
  blush: [
    { hex: "#D4728C", name: "Cool Pink", usage: "Daily" },
    { hex: "#B5456A", name: "Berry Rose", usage: "Evening" },
    { hex: "#C48B9F", name: "Soft Mauve", usage: "Natural" },
  ],
  bronzer: {
    yes: [
      { hex: "#8B7D72", name: "Cool Taupe Bronze" },
      { hex: "#5C4A3D", name: "Cool Espresso Bronze" },
      { hex: "#3D2B1F", name: "Dark Bronze" },
    ],
    no: [
      { hex: "#CD853F", name: "Golden Bronze" },
      { hex: "#C47A4A", name: "Terracotta Bronze" },
    ],
  },
  lips: {
    everyday: [
      { hex: "#B07080", name: "Mauve", product: "MAC Twig" },
      { hex: "#C08888", name: "Rose Nude", product: "CT Pillow Talk" },
      { hex: "#A06070", name: "Berry Balm", product: "Clinique Black Honey" },
    ],
    bold: [
      { hex: "#CC0033", name: "Blue Red", product: "MAC Ruby Woo" },
      { hex: "#7A1F3D", name: "Deep Berry", product: "Fenty Griselda" },
      { hex: "#6B2040", name: "Wine", product: "NARS Scarlet Empress" },
    ],
    avoid: [
      { hex: "#FF4500", name: "Orange Red" },
      { hex: "#E8734A", name: "Warm Coral" },
    ],
  },
  eyes: [
    { hex: "#A8A9AD", name: "Silver", finish: "shimmer" },
    { hex: "#6B3A5D", name: "Cool Plum", finish: "matte" },
    { hex: "#36454F", name: "Charcoal", finish: "matte" },
    { hex: "#1C2951", name: "Navy", finish: "matte" },
    { hex: "#836478", name: "Mauve", finish: "matte" },
    { hex: "#A89B8C", name: "Icy Taupe", finish: "shimmer" },
  ],
};

const springMakeup: MakeupSwatches = {
  foundation: {
    recommended: [
      { hex: "#ECCFB3", name: "Light Golden" },
      { hex: "#E4C0A0", name: "Warm Peach" },
      { hex: "#D9B896", name: "Light Honey" },
      { hex: "#F0E0CC", name: "Warm Ivory" },
      { hex: "#C8A882", name: "Soft Caramel" },
    ],
    avoid: [
      { hex: "#E8C0C8", name: "Cool Rose" },
      { hex: "#F0D0D4", name: "Pink Ivory" },
      { hex: "#C4B8A8", name: "Ashy Beige" },
    ],
  },
  blush: [
    { hex: "#E8868A", name: "Warm Pink", usage: "Daily" },
    { hex: "#F0A080", name: "Peach", usage: "Natural" },
    { hex: "#E87461", name: "Coral", usage: "Evening" },
  ],
  bronzer: {
    yes: [
      { hex: "#D4A870", name: "Sun Bronze" },
      { hex: "#C49058", name: "Warm Tan Bronze" },
      { hex: "#B8733D", name: "Golden Bronze" },
    ],
    no: [
      { hex: "#8B7D72", name: "Cool Taupe Bronze" },
      { hex: "#5C4A3D", name: "Cool Espresso Bronze" },
    ],
  },
  lips: {
    everyday: [
      { hex: "#E0A080", name: "Peach Nude", product: "Fenty Fenty Glow" },
      { hex: "#D48080", name: "Warm Pink", product: "MAC Creme Cup" },
      { hex: "#E88C70", name: "Light Coral", product: "CT Kim K.W." },
    ],
    bold: [
      { hex: "#E8604A", name: "True Coral", product: "MAC Lady Danger" },
      { hex: "#D44030", name: "Warm Red", product: "Fenty Uncensored" },
      { hex: "#FF7F50", name: "Bright Peach", product: "NARS Heat Wave" },
    ],
    avoid: [
      { hex: "#4A2040", name: "Deep Plum" },
      { hex: "#8B2252", name: "Cool Berry" },
    ],
  },
  eyes: [
    { hex: "#F0D5B0", name: "Champagne", finish: "shimmer" },
    { hex: "#A08B70", name: "Warm Taupe", finish: "matte" },
    { hex: "#C8A850", name: "Soft Gold", finish: "shimmer" },
    { hex: "#E0A888", name: "Peach", finish: "matte" },
    { hex: "#8DA07A", name: "Sage Green", finish: "matte" },
    { hex: "#B8956A", name: "Light Bronze", finish: "shimmer" },
  ],
};

const summerMakeup: MakeupSwatches = {
  foundation: {
    recommended: [
      { hex: "#E8D8CC", name: "Cool Ivory" },
      { hex: "#D8C0B0", name: "Rose Beige" },
      { hex: "#D0BCA8", name: "Neutral Sand" },
      { hex: "#E0CCC4", name: "Soft Pink" },
      { hex: "#B8A498", name: "Cool Tan" },
    ],
    avoid: [
      { hex: "#D4A870", name: "Warm Gold" },
      { hex: "#C4A468", name: "Yellow Olive" },
      { hex: "#D0A06C", name: "Orange Beige" },
    ],
  },
  blush: [
    { hex: "#D4909A", name: "Soft Rose", usage: "Daily" },
    { hex: "#B88898", name: "Dusty Mauve", usage: "Natural" },
    { hex: "#A86080", name: "Cool Berry", usage: "Evening" },
  ],
  bronzer: {
    yes: [
      { hex: "#C8B8A8", name: "Light Bronze" },
      { hex: "#8B7D72", name: "Cool Taupe Bronze" },
      { hex: "#5C4A3D", name: "Cool Espresso Bronze" },
    ],
    no: [
      { hex: "#CD853F", name: "Golden Bronze" },
      { hex: "#B8860B", name: "Terracotta Bronze" },
    ],
  },
  lips: {
    everyday: [
      { hex: "#C08888", name: "Dusty Rose", product: "MAC Modesty" },
      { hex: "#B08080", name: "Soft Mauve", product: "CT Very Victoria" },
      { hex: "#C8A098", name: "Nude Pink", product: "Fenty S1ngle" },
    ],
    bold: [
      { hex: "#9B3060", name: "Raspberry", product: "MAC D for Danger" },
      { hex: "#8B4068", name: "Plum Rose", product: "NARS Anna" },
      { hex: "#B82040", name: "Cool Red", product: "Clinique Poppy" },
    ],
    avoid: [
      { hex: "#FF6347", name: "Orange" },
      { hex: "#E87750", name: "Warm Coral" },
    ],
  },
  eyes: [
    { hex: "#9E8E80", name: "Cool Taupe", finish: "matte" },
    { hex: "#8B7080", name: "Soft Plum", finish: "matte" },
    { hex: "#B89898", name: "Dusty Rose", finish: "shimmer" },
    { hex: "#708090", name: "Slate", finish: "matte" },
    { hex: "#9080A0", name: "Lavender", finish: "shimmer" },
    { hex: "#A08898", name: "Muted Mauve", finish: "matte" },
  ],
};

const makeupMap: Record<string, MakeupSwatches> = {
  autumn: autumnMakeup,
  winter: winterMakeup,
  spring: springMakeup,
  summer: summerMakeup,
};

export function getSeasonMakeupSwatches(season: string): MakeupSwatches {
  return makeupMap[getSeasonFamily(season)];
}

// ---- Jewelry data ---------------------------------------------------------

const warmJewelry: JewelrySwatches = {
  metals: [
    {
      name: "Yellow Gold",
      gradient: "linear-gradient(135deg, #B8860B, #FFD700, #C9A96E)",
      recommended: true,
    },
    {
      name: "Rose Gold",
      gradient: "linear-gradient(135deg, #B76E79, #E8B4B8, #C9956C)",
      recommended: true,
    },
    {
      name: "Copper",
      gradient: "linear-gradient(135deg, #B87333, #DA8A67, #C46E2C)",
      recommended: true,
    },
    {
      name: "Silver",
      gradient: "linear-gradient(135deg, #9E9E9E, #E0E0E0, #C0C0C0)",
      recommended: false,
    },
    {
      name: "Platinum",
      gradient: "linear-gradient(135deg, #A0A0A0, #D0D0D0, #B0B0B0)",
      recommended: false,
    },
  ],
  stones: [
    { name: "Amber", hex: "#FFBF00" },
    { name: "Garnet", hex: "#6D1A22" },
    { name: "Tiger Eye", hex: "#B5651D" },
    { name: "Citrine", hex: "#E4C760" },
    { name: "Carnelian", hex: "#B44420" },
    { name: "Turquoise", hex: "#40C4AC" },
    { name: "Smoky Quartz", hex: "#7B6B5D" },
    { name: "Emerald", hex: "#046A38" },
  ],
};

const coolJewelry: JewelrySwatches = {
  metals: [
    {
      name: "Silver",
      gradient: "linear-gradient(135deg, #9E9E9E, #F0F0F0, #C0C0C0)",
      recommended: true,
    },
    {
      name: "Platinum",
      gradient: "linear-gradient(135deg, #A8A8A8, #E8E8E8, #C0C0C0)",
      recommended: true,
    },
    {
      name: "White Gold",
      gradient: "linear-gradient(135deg, #B0B0A0, #E8E8E0, #C8C8C0)",
      recommended: true,
    },
    {
      name: "Yellow Gold",
      gradient: "linear-gradient(135deg, #B8860B, #FFD700, #C9A96E)",
      recommended: false,
    },
    {
      name: "Rose Gold",
      gradient: "linear-gradient(135deg, #B76E79, #E8B4B8, #C9956C)",
      recommended: false,
    },
  ],
  stones: [
    { name: "Diamond", hex: "#B9F2FF" },
    { name: "Sapphire", hex: "#0F52BA" },
    { name: "Amethyst", hex: "#9966CC" },
    { name: "Aquamarine", hex: "#7FFFD4" },
    { name: "Rose Quartz", hex: "#E8B4B8" },
    { name: "Moonstone", hex: "#AAA9AD" },
    { name: "Ruby", hex: "#9B111E" },
    { name: "Pearl", hex: "#F0EAD6" },
  ],
};

export function getJewelrySwatches(season: string): JewelrySwatches {
  return isWarmSeason(season) ? warmJewelry : coolJewelry;
}

// ---- Hair data ------------------------------------------------------------

const autumnHair: HairSwatches = {
  best: [
    { name: "Warm Caramel", hex: "#C19A6B" },
    { name: "Auburn", hex: "#A52A2A" },
    { name: "Golden Chestnut", hex: "#954535" },
    { name: "Henna Red", hex: "#9B4F0F" },
    { name: "Warm Chocolate", hex: "#5C3317" },
    { name: "Rich Espresso", hex: "#3C1414" },
  ],
  avoid: [
    { name: "Ashy Blonde", hex: "#B8B09E" },
    { name: "Platinum", hex: "#E5E4E2" },
    { name: "Cool Brown", hex: "#6B5B4F" },
    { name: "Blue Black", hex: "#0D0D1A" },
  ],
};

const winterHair: HairSwatches = {
  best: [
    { name: "Cool Espresso", hex: "#2C1810" },
    { name: "Blue Black", hex: "#0D0D2B" },
    { name: "Icy Platinum", hex: "#E5E4E2" },
    { name: "Cool Ash Brown", hex: "#6B5B4F" },
    { name: "Deep Burgundy", hex: "#4A0E2E" },
    { name: "Dark Chocolate", hex: "#2C1608" },
  ],
  avoid: [
    { name: "Golden Blonde", hex: "#DAA520" },
    { name: "Warm Caramel", hex: "#C19A6B" },
    { name: "Auburn", hex: "#A52A2A" },
    { name: "Copper", hex: "#B87333" },
  ],
};

const springHair: HairSwatches = {
  best: [
    { name: "Golden Blonde", hex: "#DAA520" },
    { name: "Light Caramel", hex: "#D4A76A" },
    { name: "Strawberry Blonde", hex: "#C88448" },
    { name: "Honey", hex: "#C49648" },
    { name: "Warm Brown", hex: "#8B6B4A" },
    { name: "Light Auburn", hex: "#B06030" },
  ],
  avoid: [
    { name: "Ashy Brown", hex: "#6B5B4F" },
    { name: "Blue Black", hex: "#0D0D2B" },
    { name: "Platinum White", hex: "#F0F0F0" },
    { name: "Cool Burgundy", hex: "#4A0E2E" },
  ],
};

const summerHair: HairSwatches = {
  best: [
    { name: "Ash Blonde", hex: "#C8B898" },
    { name: "Cool Light Brown", hex: "#8B7D6B" },
    { name: "Soft Platinum", hex: "#DDD8D0" },
    { name: "Mushroom Brown", hex: "#9E8E7E" },
    { name: "Icy Highlights", hex: "#E8E0D8" },
    { name: "Cool Beige", hex: "#B8A898" },
  ],
  avoid: [
    { name: "Golden Blonde", hex: "#DAA520" },
    { name: "Auburn", hex: "#A52A2A" },
    { name: "Warm Copper", hex: "#B87333" },
    { name: "Henna Red", hex: "#9B4F0F" },
  ],
};

const hairMap: Record<string, HairSwatches> = {
  autumn: autumnHair,
  winter: winterHair,
  spring: springHair,
  summer: summerHair,
};

export function getHairSwatches(season: string): HairSwatches {
  return hairMap[getSeasonFamily(season)];
}
