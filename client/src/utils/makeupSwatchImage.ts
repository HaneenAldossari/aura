type MakeupCategory = "foundation" | "lips" | "blush" | "bronzer" | "eyeshadow" | "nails";

const FOUNDATION_MAP: Record<string, string> = {
  "fair porcelain": "fair-porcelain", "light ivory": "light-ivory",
  "warm ivory": "warm-ivory", "natural beige": "natural-beige",
  "sand": "sand", "warm sand": "warm-sand", "golden beige": "golden-beige",
  "honey beige": "honey-beige", "medium beige": "medium-beige",
  "warm medium": "warm-medium", "tan": "tan", "warm tan": "warm-tan",
  "caramel": "caramel", "medium brown": "medium-brown",
  "warm brown": "warm-brown", "deep tan": "deep-tan",
  "mahogany": "mahogany", "deep brown": "deep-brown",
  "cool ivory": "cool-ivory", "rose beige": "rose-beige",
  "cool beige": "cool-beige", "cool sand": "cool-sand",
  "cool medium": "cool-medium", "cool tan": "cool-tan",
};

const LIPS_MAP: Record<string, string> = {
  "nude pink": "nude-pink", "warm nude": "warm-nude",
  "peachy nude": "peachy-nude", "soft peach": "soft-peach",
  "warm peach": "warm-peach", "coral": "coral",
  "warm coral": "warm-coral", "brick red": "brick-red",
  "tomato red": "tomato-red", "cherry red": "cherry-red",
  "deep red": "deep-red", "burgundy": "burgundy",
  "berry": "berry", "deep berry": "deep-berry",
  "plum": "plum", "mauve": "mauve",
  "dusty rose": "dusty-rose", "rose pink": "rose-pink",
  "cool pink": "cool-pink", "hot pink": "hot-pink",
  "raspberry": "raspberry", "deep plum": "deep-plum",
  "raisin": "raisin", "brown nude": "brown-nude",
};

const BLUSH_MAP: Record<string, string> = {
  "soft pink": "Soft Pink", "rose pink": "Rose Pink",
  "coral pink": "Coral Pink", "peach": "Peach",
  "warm peach": "Warm Peach", "apricot": "Apricot",
  "dusty rose": "Dusty Rose", "mauve": "Mauve",
  "berry rose": "Berry Rose", "terracotta": "Terracotta",
  "brick red": "Brick Red", "warm coral": "Warm Coral",
  "baby pink": "Baby Pink", "nude pink": "Nude Pink",
  "cool rose": "Cool Rose", "deep rose": "Deep Rose",
  "plum blush": "Plum Blush", "bronze rose": "Bronze Rose",
};

const BRONZER_MAP: Record<string, string> = {
  "light bronze": "light-bronze", "sun bronze": "sun-bronze",
  "cool taupe bronze": "cool-taupe-bronze", "warm tan bronze": "warm-tan-bronze",
  "golden bronze": "golden-bronze", "soft bronze": "soft-bronze",
  "matte warm bronze": "matte-warm-bronze", "medium bronze": "medium-bronze",
  "cool espresso bronze": "cool-espresso-bronze", "terracotta bronze": "terracotta-bronze",
  "deep bronze": "deep-bronze", "matte deep bronze": "matte-deep-bronze",
  "rich bronze": "rich-bronze", "dark bronze": "dark-bronze",
};

const EYESHADOW_MAP: Record<string, string> = {
  "champagne": "champagne", "gold": "gold",
  "bronze": "bronze", "copper": "copper",
  "rose gold": "rose-gold", "warm brown": "warm-brown",
  "taupe": "taupe", "grey brown": "grey-brown",
  "charcoal": "charcoal", "slate": "slate",
  "navy": "navy", "deep brown": "deep-brown",
  "mauve": "mauve", "dusty rose": "dusty-rose",
  "plum": "plum", "forest green": "forest-green",
  "sage": "sage", "burgundy": "burgundy",
  "shimmer pink": "shimmer-pink", "metallic rose": "metallic-rose",
  "copper shimmer": "copper-shimmer", "teal shimmer": "teal-shimmer",
  "silver": "silver",
};

const NAILS_MAP: Record<string, string> = {
  "berry naughty": "berry-naughty", "bubble bath": "bubble-bath",
  "limo-scene": "limo-scene", "limo scene": "limo-scene",
  "ballet slippers": "ballet-slippers", "perennial chic": "perennial-chic",
  "mademoiselle": "mademoiselle", "pink-ing of you": "pink-ing-of-you",
  "pink ing of you": "pink-ing-of-you",
  "princesses rule": "princesses-rule",
  "bare with me": "bare-with-me", "mod about you": "mod-about-you",
  "lovie dovie": "lovie-dovie",
  "charged up cherry": "charged-up-cherry",
  "malaga wine": "malaga-wine", "big apple red": "big-apple-red",
  "bachelorette bash": "bachelorette-bash",
  "sheer bliss": "sheer-bliss", "angel food": "angel-food",
  "tiara": "tiara",
  "strawberry margarita": "strawberry-margarita",
  "cajun shrimp": "cajun-shrimp", "passion": "passion",
  "watermelon": "watermelon", "midnight cami": "midnight-cami",
  "sugar daddy": "sugar-daddy",
};

// Alias fallbacks for AI-invented names
const ALIASES: Record<string, Record<string, string>> = {
  foundation: {
    "golden brown": "golden-beige", "warm beige": "natural-beige",
    "porcelain": "fair-porcelain", "ivory": "light-ivory",
    "deep": "deep-brown", "espresso": "deep-brown",
    "chestnut": "mahogany", "nude beige": "natural-beige",
  },
  blush: {
    "pink": "Soft Pink", "coral": "Coral Pink", "rose": "Rose Pink",
    "bronze": "Bronze Rose", "plum": "Plum Blush", "nude": "Nude Pink",
    "golden": "Bronze Rose", "shimmer peach": "Warm Peach",
  },
  bronzer: {
    "golden brown": "golden-bronze", "warm bronze": "medium-bronze",
    "bronze": "medium-bronze", "tan": "warm-tan-bronze",
    "copper": "terracotta-bronze", "golden": "golden-bronze",
    "sun kissed": "sun-bronze", "sun-kissed": "sun-bronze",
    "cool bronze": "cool-taupe-bronze", "neutral tan": "cool-taupe-bronze",
    "cool taupe": "cool-taupe-bronze", "cool espresso": "cool-espresso-bronze",
    "matte bronze": "matte-warm-bronze", "matte deep": "matte-deep-bronze",
    "peach glow": "sun-bronze", "warm tan": "warm-tan-bronze",
  },
  lips: {
    "cool red": "cherry-red", "true red": "tomato-red",
    "classic red": "tomato-red", "orange": "warm-coral",
    "red": "tomato-red", "nude": "warm-nude", "pink": "rose-pink",
    "wine": "raisin", "mocha": "brown-nude",
  },
  eyeshadow: {
    "lavender": "mauve", "purple": "plum", "lilac": "mauve",
    "violet": "plum", "brown": "warm-brown", "nude": "champagne",
    "smoky": "charcoal", "black": "charcoal", "green": "forest-green",
    "teal": "teal-shimmer", "blue": "navy", "pink": "shimmer-pink",
    "orange": "copper", "red": "burgundy",
  },
  nails: {
    "red": "big-apple-red", "bright red": "big-apple-red",
    "pink": "bubble-bath", "light pink": "ballet-slippers",
    "nude": "mademoiselle", "sheer": "sheer-bliss",
    "coral": "cajun-shrimp", "orange": "cajun-shrimp",
    "dark red": "malaga-wine", "wine": "malaga-wine",
    "navy": "midnight-cami", "dark blue": "midnight-cami",
    "berry": "berry-naughty", "purple": "berry-naughty",
  },
};

const CATEGORY_MAPS: Record<MakeupCategory, Record<string, string>> = {
  foundation: FOUNDATION_MAP, lips: LIPS_MAP, blush: BLUSH_MAP,
  bronzer: BRONZER_MAP, eyeshadow: EYESHADOW_MAP, nails: NAILS_MAP,
};

// Words to skip when doing significant-word matching
const COMMON_WORDS = new Set(["soft", "light", "warm", "cool", "deep", "bright", "muted"]);

export function getMakeupSwatchImage(
  category: MakeupCategory,
  name: string
): string | null {
  const map = CATEGORY_MAPS[category];
  const aliases = ALIASES[category] ?? {};
  const key = name.toLowerCase().trim();

  // Step 1: Exact map match
  if (map[key]) return `/makeup/${category}/${map[key]}.png`;

  // Alias exact match
  if (aliases[key]) return `/makeup/${category}/${aliases[key]}.png`;

  // Existing partial match on map keys
  const mainMatch = Object.keys(map).find(k => key.includes(k) || k.includes(key));
  if (mainMatch) return `/makeup/${category}/${map[mainMatch]}.png`;

  // Existing partial match on alias keys
  const aliasMatch = Object.keys(aliases).find(k => key.includes(k) || k.includes(key));
  if (aliasMatch) return `/makeup/${category}/${aliases[aliasMatch]}.png`;

  // Step 2 & 3: Try matching map keys that contain the first or second word
  const words = key.split(/\s+/).filter(w => w.length >= 3);
  for (const word of words) {
    const wordMatch = Object.keys(map).find(k => k.includes(word));
    if (wordMatch) return `/makeup/${category}/${map[wordMatch]}.png`;
  }

  // Step 4: Try significant words (skip common modifier words)
  const significantWords = words.filter(w => !COMMON_WORDS.has(w));
  for (const word of significantWords) {
    const wordMatch = Object.keys(map).find(k => k.includes(word));
    if (wordMatch) return `/makeup/${category}/${map[wordMatch]}.png`;
    // Also try alias keys
    const aliasWordMatch = Object.keys(aliases).find(k => k.includes(word));
    if (aliasWordMatch) return `/makeup/${category}/${aliases[aliasWordMatch]}.png`;
  }

  // Step 5: No match — log and return null
  console.warn(`[Swatch miss] ${category}/${name} — no image match`);
  return null;
}
