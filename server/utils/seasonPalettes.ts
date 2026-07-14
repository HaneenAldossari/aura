// Canonical 12-season palettes — keeps results consistent across analyses.
// When a person is classified as e.g. Deep Autumn, they always get the
// canonical Deep Autumn palette regardless of model run-to-run variance.
//
// Hex values per the curated 12-color-per-season spec.

export type Color = { name: string; hex: string };
export type SeasonPalette = {
  best: (Color & { note: string })[];
  avoid: (Color & { reason: string })[];
  neutrals: Color[];
  metals: { best: string[]; avoid: string[] };
};

const PALETTES: Record<string, SeasonPalette> = {
  // ── 1. LIGHT SPRING ───────────────────────────────────────────────────
  "light spring": {
    best: [
      { name: "Ivory",            hex: "#FFF4DC", note: "Warm clean white that flatters your light, fresh coloring." },
      { name: "Light Peach",      hex: "#FFD6B5", note: "Soft peach — quintessential Light Spring." },
      { name: "Apricot",          hex: "#FFB86B", note: "Warm fruity tone that brings out your warmth." },
      { name: "Coral Pink",       hex: "#FF8C7A", note: "Fresh peachy-pink with warmth." },
      { name: "Warm Rose",        hex: "#F58CA8", note: "Light warm pink for romantic looks." },
      { name: "Butter Yellow",    hex: "#FFE78A", note: "Soft warm yellow that lights up your face." },
      { name: "Fresh Mint",       hex: "#A8E6C1", note: "Cool-warm green — clear and fresh." },
      { name: "Light Aqua",       hex: "#8EDDE3", note: "Crystal blue-green for accents." },
      { name: "Sky Blue",         hex: "#8FCFF2", note: "Light clear blue that mirrors your softness." },
      { name: "Light Warm Teal",  hex: "#5BC6C6", note: "Warm-leaning teal for variety." },
      { name: "Camel Beige",      hex: "#CFAE7A", note: "Warm light neutral." },
      { name: "Soft Warm Brown",  hex: "#9B6A45", note: "Warm earthy brown for grounding." },
    ],
    avoid: [
      { name: "Black",            hex: "#000000", reason: "Too harsh and dark for your softness." },
      { name: "Burgundy",         hex: "#6A0F2B", reason: "Too dark — fights your lightness." },
      { name: "Pure White",       hex: "#FFFFFF", reason: "Stark cool white overpowers — choose ivory." },
      { name: "Charcoal",         hex: "#36454F", reason: "Too dark and cool." },
      { name: "Hot Pink",         hex: "#FF1493", reason: "Too saturated for your softness." },
      { name: "Olive",            hex: "#708238", reason: "Too earthy and muted." },
    ],
    neutrals: [
      { name: "Ivory",        hex: "#FFF4DC" },
      { name: "Camel Beige",  hex: "#CFAE7A" },
      { name: "Soft Warm Brown", hex: "#9B6A45" },
    ],
    metals: { best: ["Yellow Gold", "Rose Gold", "Champagne Gold"], avoid: ["Silver", "Platinum"] },
  },

  // ── 2. TRUE / WARM SPRING ─────────────────────────────────────────────
  "true spring": {
    best: [
      { name: "Warm Ivory",   hex: "#FFF0C9", note: "Warm clean white." },
      { name: "Golden Yellow",hex: "#FFD23F", note: "Bright warm yellow — True Spring signature." },
      { name: "Sunflower",    hex: "#F6B800", note: "Saturated golden yellow." },
      { name: "Tangerine",    hex: "#FF7A1A", note: "Vivid warm orange." },
      { name: "Tomato Red",   hex: "#E94B35", note: "Warm clear red." },
      { name: "Coral",        hex: "#FF6F61", note: "Quintessential warm coral." },
      { name: "Warm Pink",    hex: "#FF6FAE", note: "Bright warm pink." },
      { name: "Grass Green",  hex: "#6DBE45", note: "Vivid warm green." },
      { name: "Apple Green",  hex: "#8CC63F", note: "Yellow-green with clarity." },
      { name: "Turquoise",    hex: "#00A6A6", note: "Clear warm blue-green." },
      { name: "Warm Aqua",    hex: "#00BFC4", note: "Bright warm aqua." },
      { name: "Golden Brown", hex: "#8B5A2B", note: "Warm earthy neutral." },
    ],
    avoid: [
      { name: "Black",        hex: "#000000", reason: "Too harsh for your warm clarity." },
      { name: "Burgundy",     hex: "#6A0F2B", reason: "Too dark and cool-leaning." },
      { name: "Mauve",        hex: "#9C7B8C", reason: "Muted cool tone fights your warmth." },
      { name: "Charcoal",     hex: "#36454F", reason: "Too cool and heavy." },
      { name: "Cool Grey",    hex: "#9E9E9E", reason: "Lacks warmth." },
      { name: "Dusty Pink",   hex: "#B97C7C", reason: "Too muted for your clarity." },
    ],
    neutrals: [
      { name: "Warm Ivory",   hex: "#FFF0C9" },
      { name: "Golden Brown", hex: "#8B5A2B" },
    ],
    metals: { best: ["Yellow Gold", "Rose Gold", "Bronze"], avoid: ["Silver", "Platinum", "White Gold"] },
  },

  // ── 3. BRIGHT SPRING ──────────────────────────────────────────────────
  "bright spring": {
    best: [
      { name: "Clear Ivory",     hex: "#FFF7E6", note: "Warm-clear white." },
      { name: "Bright Coral",    hex: "#FF5A5F", note: "Vivid warm coral — Bright Spring signature." },
      { name: "Watermelon",      hex: "#FF3366", note: "Saturated warm pink-red." },
      { name: "Hot Peach",       hex: "#FF8A3D", note: "Bright warm orange-pink." },
      { name: "Bright Orange",   hex: "#FF6B00", note: "Saturated warm orange." },
      { name: "Lemon Yellow",    hex: "#FFE600", note: "Bright clear yellow." },
      { name: "Lime Green",      hex: "#A7E600", note: "Vivid yellow-green." },
      { name: "Emerald Green",   hex: "#00A86B", note: "Clear jewel green." },
      { name: "Bright Teal",     hex: "#00B3B8", note: "Saturated blue-green." },
      { name: "Clear Turquoise", hex: "#00D4D8", note: "Vivid warm aqua." },
      { name: "Bright Blue",     hex: "#0077FF", note: "Clear saturated blue." },
      { name: "Chocolate Brown", hex: "#5A3218", note: "Warm earthy anchor." },
    ],
    avoid: [
      { name: "Burgundy",     hex: "#6A0F2B", reason: "Too dark and muted." },
      { name: "Olive",        hex: "#708238", reason: "Earthy muted — fights your clarity." },
      { name: "Black",        hex: "#000000", reason: "Too harsh for your warmth." },
      { name: "Dusty Rose",   hex: "#B97C7C", reason: "Too muted for your brightness." },
      { name: "Charcoal",     hex: "#36454F", reason: "Too dark and cool." },
      { name: "Sage Green",   hex: "#9CAF88", reason: "Muted — clashes with brightness." },
    ],
    neutrals: [
      { name: "Clear Ivory",     hex: "#FFF7E6" },
      { name: "Chocolate Brown", hex: "#5A3218" },
    ],
    metals: { best: ["Yellow Gold", "Rose Gold"], avoid: ["Silver", "Platinum", "Pewter"] },
  },

  // ── 4. LIGHT SUMMER ───────────────────────────────────────────────────
  "light summer": {
    best: [
      { name: "Soft White",     hex: "#F7F3EF", note: "Cool clean white." },
      { name: "Powder Pink",    hex: "#F6C6D6", note: "Cool soft pink — Light Summer favorite." },
      { name: "Baby Pink",      hex: "#F4AFC4", note: "Delicate cool pink." },
      { name: "Soft Rose",      hex: "#D98BA3", note: "Muted cool rose." },
      { name: "Lavender",       hex: "#C8B6E2", note: "Cool soft purple." },
      { name: "Powder Blue",    hex: "#AFCBEF", note: "Quintessential cool soft blue." },
      { name: "Soft Sky Blue",  hex: "#9ECFE7", note: "Light clear cool blue." },
      { name: "Misty Aqua",     hex: "#A7DAD8", note: "Cool blue-green softness." },
      { name: "Light Sage",     hex: "#B9CBB2", note: "Cool muted green." },
      { name: "Cool Taupe",     hex: "#B7A9A0", note: "Soft cool neutral." },
      { name: "Dove Gray",      hex: "#B8BCC6", note: "Sophisticated cool grey." },
      { name: "Soft Navy",      hex: "#4D5F7A", note: "Cool deep neutral anchor." },
    ],
    avoid: [
      { name: "Black",        hex: "#000000", reason: "Too harsh and dark for your softness." },
      { name: "Pumpkin",      hex: "#D85B1F", reason: "Warm vivid orange fights cool softness." },
      { name: "Mustard",      hex: "#C39B26", reason: "Warm earthy — clashes with your cool." },
      { name: "Hot Pink",     hex: "#FF1493", reason: "Too saturated for your delicate palette." },
      { name: "Burgundy",     hex: "#6A0F2B", reason: "Too dark — choose dusty rose instead." },
      { name: "Olive",        hex: "#708238", reason: "Earthy warm — washes you out." },
    ],
    neutrals: [
      { name: "Soft White", hex: "#F7F3EF" },
      { name: "Cool Taupe", hex: "#B7A9A0" },
      { name: "Dove Gray",  hex: "#B8BCC6" },
      { name: "Soft Navy",  hex: "#4D5F7A" },
    ],
    metals: { best: ["Silver", "White Gold", "Rose Gold", "Platinum"], avoid: ["Yellow Gold", "Bronze", "Copper"] },
  },

  // ── 5. TRUE / COOL SUMMER ─────────────────────────────────────────────
  "true summer": {
    best: [
      { name: "Soft White",     hex: "#F2F1EE", note: "Cool clean white." },
      { name: "Cool Pink",      hex: "#D98CA6", note: "True Summer signature pink." },
      { name: "Rose",           hex: "#C96F8C", note: "Cool dusty rose." },
      { name: "Raspberry Rose", hex: "#B84A6B", note: "Saturated cool pink." },
      { name: "Mauve",          hex: "#A87898", note: "Cool muted purple-pink." },
      { name: "Lavender Gray",  hex: "#A8A0C4", note: "Cool soft purple." },
      { name: "Periwinkle",     hex: "#7F95C8", note: "Cool clear blue-purple." },
      { name: "Slate Blue",     hex: "#5F7FA3", note: "Sophisticated cool blue." },
      { name: "Soft Teal",      hex: "#5B9EA0", note: "Cool muted blue-green." },
      { name: "Cool Sage",      hex: "#8FA89B", note: "Cool muted green." },
      { name: "Blue Gray",      hex: "#7D8796", note: "Versatile cool neutral." },
      { name: "Soft Navy",      hex: "#2F405C", note: "Cool deep anchor." },
    ],
    avoid: [
      { name: "Pumpkin",      hex: "#D85B1F", reason: "Warm orange fights your cool tone." },
      { name: "Mustard",      hex: "#C39B26", reason: "Warm earthy yellow clashes." },
      { name: "Camel",        hex: "#C19A6B", reason: "Warm neutral muddies you." },
      { name: "Black",        hex: "#000000", reason: "Too harsh — choose navy." },
      { name: "Bright Coral", hex: "#FF7F50", reason: "Too warm and saturated." },
      { name: "Olive",        hex: "#708238", reason: "Warm earthy — fights your softness." },
    ],
    neutrals: [
      { name: "Soft White", hex: "#F2F1EE" },
      { name: "Blue Gray",  hex: "#7D8796" },
      { name: "Soft Navy",  hex: "#2F405C" },
    ],
    metals: { best: ["Silver", "White Gold", "Platinum"], avoid: ["Yellow Gold", "Bronze", "Copper"] },
  },

  // ── 6. SOFT SUMMER ────────────────────────────────────────────────────
  "soft summer": {
    best: [
      { name: "Oyster White",  hex: "#EDE6DD", note: "Warm-cool soft white." },
      { name: "Dusty Pink",    hex: "#C996A6", note: "Soft Summer signature." },
      { name: "Muted Rose",    hex: "#B9798D", note: "Quiet cool pink." },
      { name: "Mauve Pink",    hex: "#A96D85", note: "Cool muted pink-purple." },
      { name: "Dusty Lavender",hex: "#9B8AA8", note: "Cool soft purple." },
      { name: "Smoky Blue",    hex: "#7089A3", note: "Muted cool blue." },
      { name: "Denim Blue",    hex: "#607C99", note: "Sophisticated cool blue." },
      { name: "Soft Teal Gray",hex: "#5F8E8B", note: "Muted cool blue-green." },
      { name: "Eucalyptus",    hex: "#7F9B8E", note: "Cool muted green." },
      { name: "Mushroom Taupe",hex: "#A28F82", note: "Quiet warm-cool neutral." },
      { name: "Cool Cocoa",    hex: "#7A625A", note: "Sophisticated muted brown." },
      { name: "Charcoal Navy", hex: "#374252", note: "Cool deep anchor." },
    ],
    avoid: [
      { name: "Pumpkin",      hex: "#D85B1F", reason: "Warm vibrant — fights your softness." },
      { name: "Hot Pink",     hex: "#FF1493", reason: "Too saturated for Soft Summer." },
      { name: "Black",        hex: "#000000", reason: "Too harsh — choose deep grey." },
      { name: "Mustard",      hex: "#C39B26", reason: "Warm earthy yellow clashes." },
      { name: "Pure White",   hex: "#FFFFFF", reason: "Too stark — choose oyster." },
      { name: "Royal Blue",   hex: "#4169E1", reason: "Too saturated for muted palette." },
    ],
    neutrals: [
      { name: "Oyster White",  hex: "#EDE6DD" },
      { name: "Mushroom Taupe",hex: "#A28F82" },
      { name: "Cool Cocoa",    hex: "#7A625A" },
      { name: "Charcoal Navy", hex: "#374252" },
    ],
    metals: { best: ["Silver", "White Gold", "Brushed Pewter"], avoid: ["Yellow Gold", "Bronze", "Copper"] },
  },

  // ── 7. SOFT AUTUMN ────────────────────────────────────────────────────
  "soft autumn": {
    best: [
      { name: "Cream",            hex: "#F3E4C8", note: "Warm soft white." },
      { name: "Warm Beige",       hex: "#D7B98E", note: "Quiet warm neutral." },
      { name: "Camel",            hex: "#C19A6B", note: "Soft Autumn classic." },
      { name: "Soft Peach",       hex: "#E8A77C", note: "Warm dusty peach." },
      { name: "Dusty Coral",      hex: "#C97868", note: "Sun-warmed soft coral." },
      { name: "Muted Salmon",     hex: "#D98B75", note: "Gentle warm pink." },
      { name: "Soft Terracotta",  hex: "#B7664B", note: "Earthy warm clay." },
      { name: "Olive",            hex: "#7F8A4A", note: "Muted earthy green." },
      { name: "Moss Green",       hex: "#6F7D45", note: "Earthy warm green." },
      { name: "Warm Teal",        hex: "#4F8A83", note: "Muted blue-green accent." },
      { name: "Muted Turquoise",  hex: "#6EA7A1", note: "Soft warm aqua." },
      { name: "Soft Chocolate",   hex: "#6B4A35", note: "Warm sophisticated brown." },
    ],
    avoid: [
      { name: "Bright White",  hex: "#FFFFFF", reason: "Too stark — choose cream." },
      { name: "Hot Pink",      hex: "#FF69B4", reason: "Brightness overwhelms your softness." },
      { name: "Black",         hex: "#000000", reason: "Too harsh — chocolate is gentler." },
      { name: "Electric Blue", hex: "#0080FF", reason: "Saturation fights muted palette." },
      { name: "Neon Yellow",   hex: "#F4FF00", reason: "Vibrancy clashes with subtle warmth." },
      { name: "Royal Purple",  hex: "#663399", reason: "Too saturated for Soft Autumn." },
    ],
    neutrals: [
      { name: "Cream",          hex: "#F3E4C8" },
      { name: "Warm Beige",     hex: "#D7B98E" },
      { name: "Camel",          hex: "#C19A6B" },
      { name: "Soft Chocolate", hex: "#6B4A35" },
    ],
    metals: { best: ["Yellow Gold", "Rose Gold", "Antique Gold", "Brushed Bronze"], avoid: ["Silver", "Platinum", "White Gold"] },
  },

  // ── 8. TRUE / WARM AUTUMN ─────────────────────────────────────────────
  "true autumn": {
    best: [
      { name: "Warm Cream",      hex: "#F6E1B3", note: "Warm gentle white." },
      { name: "Mustard",         hex: "#C99700", note: "Earthy warm yellow." },
      { name: "Golden Yellow",   hex: "#D8A31A", note: "Rich autumn gold." },
      { name: "Pumpkin",         hex: "#D2691E", note: "Quintessential warm autumn." },
      { name: "Burnt Orange",    hex: "#C4511B", note: "Rich saturated orange." },
      { name: "Rust",            hex: "#A94724", note: "Earthy warm red-orange." },
      { name: "Tomato Red",      hex: "#B7412E", note: "Warm deep red." },
      { name: "Terracotta",      hex: "#A65A3A", note: "Sun-baked clay tone." },
      { name: "Olive Green",     hex: "#6B742E", note: "Classic warm autumn green." },
      { name: "Forest Olive",    hex: "#4E5D2C", note: "Deep earthy green." },
      { name: "Petrol Teal",     hex: "#2F6F6D", note: "Warm-leaning deep teal." },
      { name: "Chocolate Brown", hex: "#4B2E1F", note: "Rich warm dark brown." },
    ],
    avoid: [
      { name: "Icy Pink",       hex: "#FAD2E1", reason: "Cool pastel washes you out." },
      { name: "Royal Blue",     hex: "#4169E1", reason: "Too cool and bright." },
      { name: "Pure White",     hex: "#FFFFFF", reason: "Stark cool — choose cream." },
      { name: "Magenta",        hex: "#FF00FF", reason: "Cool brightness fights warmth." },
      { name: "Black",          hex: "#000000", reason: "Too harsh — use chocolate brown." },
      { name: "Light Lavender", hex: "#E6E6FA", reason: "Cool and ashy on warm skin." },
    ],
    neutrals: [
      { name: "Warm Cream",      hex: "#F6E1B3" },
      { name: "Chocolate Brown", hex: "#4B2E1F" },
    ],
    metals: { best: ["Yellow Gold", "Bronze", "Copper", "Antique Gold"], avoid: ["Silver", "Platinum", "White Gold"] },
  },

  // ── 9. DEEP / DARK AUTUMN ─────────────────────────────────────────────
  "deep autumn": {
    best: [
      { name: "Deep Cream",     hex: "#F0D8A8", note: "Warm rich neutral." },
      { name: "Camel",          hex: "#B7834F", note: "Sophisticated warm tan." },
      { name: "Bronze",         hex: "#8C5A2B", note: "Metallic earth tone." },
      { name: "Dark Chocolate", hex: "#3B2416", note: "Deep warm brown." },
      { name: "Espresso",       hex: "#24160F", note: "Profound depth — Deep Autumn anchor." },
      { name: "Deep Olive",     hex: "#3F4A24", note: "Rich earthy green." },
      { name: "Pine Green",     hex: "#1F4D3A", note: "Deep forest green." },
      { name: "Deep Teal",      hex: "#005C5C", note: "Warm-leaning deep teal." },
      { name: "Petrol Blue",    hex: "#064B5A", note: "Deep blue with warm undertone." },
      { name: "Aubergine",      hex: "#4A263A", note: "Warm deep purple." },
      { name: "Warm Burgundy",  hex: "#6E1F2B", note: "Rich autumn wine." },
      { name: "Burnt Brick",    hex: "#8A3324", note: "Warm earthy red." },
    ],
    avoid: [
      { name: "Pastel Pink",    hex: "#FFD1DC", reason: "Too cool and washed-out for your depth." },
      { name: "Icy Blue",       hex: "#A5F2F3", reason: "Cool brightness clashes with warmth." },
      { name: "Lavender",       hex: "#E6E6FA", reason: "Cool and pale — fights your richness." },
      { name: "Pure White",     hex: "#FFFFFF", reason: "Stark cool white overpowers warm depth." },
      { name: "Mint Green",     hex: "#98FF98", reason: "Cool minty tone clashes with warmth." },
      { name: "Hot Pink",       hex: "#FF69B4", reason: "Cool brightness fights earthy palette." },
    ],
    neutrals: [
      { name: "Deep Cream",     hex: "#F0D8A8" },
      { name: "Camel",          hex: "#B7834F" },
      { name: "Dark Chocolate", hex: "#3B2416" },
      { name: "Espresso",       hex: "#24160F" },
    ],
    metals: { best: ["Yellow Gold", "Bronze", "Copper", "Antique Gold"], avoid: ["Silver", "Platinum", "White Gold"] },
  },

  // ── 10. DEEP / DARK WINTER ────────────────────────────────────────────
  "deep winter": {
    best: [
      { name: "Pure White",    hex: "#FFFFFF", note: "Crisp white — Deep Winter signature contrast." },
      { name: "Black",         hex: "#000000", note: "Wear it boldly." },
      { name: "Charcoal",      hex: "#1E1E24", note: "Sophisticated cool grey-black." },
      { name: "Deep Navy",     hex: "#071A3D", note: "Cool deep blue." },
      { name: "Midnight Blue", hex: "#0A2342", note: "Profound cool blue." },
      { name: "Emerald",       hex: "#006B54", note: "Cool jewel green." },
      { name: "Pine Teal",     hex: "#004D4D", note: "Deep cool teal." },
      { name: "Deep Plum",     hex: "#3B1A45", note: "Rich cool purple." },
      { name: "Aubergine",     hex: "#2A1533", note: "Cool deep purple-black." },
      { name: "Burgundy",      hex: "#6A0F2B", note: "Cool wine — adds richness." },
      { name: "Cranberry",     hex: "#8C1D40", note: "Saturated cool red." },
      { name: "Icy Pink",      hex: "#F2D7E6", note: "Cool pale pink for soft contrast." },
    ],
    avoid: [
      { name: "Beige",        hex: "#F5F5DC", reason: "Warm muted tone washes you out." },
      { name: "Pumpkin",      hex: "#D85B1F", reason: "Warm orange clashes with cool depth." },
      { name: "Mustard",      hex: "#C39B26", reason: "Earthy warmth fights your clarity." },
      { name: "Camel",        hex: "#C19A6B", reason: "Warm neutral muddies sharpness." },
      { name: "Salmon Pink",  hex: "#FA8072", reason: "Warm coral fights cool tone." },
      { name: "Olive",        hex: "#708238", reason: "Warm muted green clashes." },
    ],
    neutrals: [
      { name: "Pure White",    hex: "#FFFFFF" },
      { name: "Black",         hex: "#000000" },
      { name: "Charcoal",      hex: "#1E1E24" },
      { name: "Deep Navy",     hex: "#071A3D" },
    ],
    metals: { best: ["Silver", "Platinum", "White Gold", "Pewter"], avoid: ["Yellow Gold", "Bronze", "Copper"] },
  },

  // ── 11. TRUE / COOL WINTER ────────────────────────────────────────────
  "true winter": {
    best: [
      { name: "Pure White",     hex: "#FFFFFF", note: "Crisp clean white." },
      { name: "Black",          hex: "#000000", note: "Cool jet anchor." },
      { name: "Icy Gray",       hex: "#E7EAF0", note: "Cool pale neutral." },
      { name: "Cool Gray",      hex: "#8A8F98", note: "Sophisticated cool grey." },
      { name: "Royal Blue",     hex: "#0033A0", note: "True Winter signature blue." },
      { name: "Cobalt",         hex: "#0047AB", note: "Saturated cool blue." },
      { name: "Sapphire",       hex: "#0F52BA", note: "Deep clear cool blue." },
      { name: "Emerald Green",  hex: "#007A5E", note: "Cool jewel green." },
      { name: "Blue-Red",       hex: "#C8102E", note: "Cool true red — Winter signature." },
      { name: "Fuchsia",        hex: "#D1007E", note: "Cool vibrant pink-purple." },
      { name: "Cool Raspberry", hex: "#B0005A", note: "Deep saturated cool pink." },
      { name: "Violet",         hex: "#5B2C83", note: "Cool clear purple." },
    ],
    avoid: [
      { name: "Pumpkin",      hex: "#D85B1F", reason: "Warm orange fights your coolness." },
      { name: "Camel",        hex: "#C19A6B", reason: "Warm neutral muddies you." },
      { name: "Olive",        hex: "#708238", reason: "Earthy warm tone clashes." },
      { name: "Beige",        hex: "#F5F5DC", reason: "Warm and washed out." },
      { name: "Coral",        hex: "#FF7F50", reason: "Too warm and orange." },
      { name: "Mustard",      hex: "#C39B26", reason: "Warm yellow fights your tone." },
    ],
    neutrals: [
      { name: "Pure White", hex: "#FFFFFF" },
      { name: "Black",      hex: "#000000" },
      { name: "Icy Gray",   hex: "#E7EAF0" },
      { name: "Cool Gray",  hex: "#8A8F98" },
    ],
    metals: { best: ["Silver", "Platinum", "White Gold"], avoid: ["Yellow Gold", "Bronze", "Copper"] },
  },

  // ── 12. BRIGHT / CLEAR WINTER ─────────────────────────────────────────
  "bright winter": {
    best: [
      { name: "Pure White",    hex: "#FFFFFF", note: "Crisp bright white." },
      { name: "Black",         hex: "#000000", note: "Sharp contrast anchor." },
      { name: "Icy Blue",      hex: "#DDEEFF", note: "Pale cool blue." },
      { name: "Icy Pink",      hex: "#F9DFF0", note: "Pale cool pink." },
      { name: "Electric Blue", hex: "#005BFF", note: "Bright Winter signature." },
      { name: "Royal Purple",  hex: "#5A00B5", note: "Saturated cool purple." },
      { name: "Bright Violet", hex: "#7F00FF", note: "Vivid cool purple." },
      { name: "Magenta",       hex: "#FF007F", note: "Cool vibrant pink." },
      { name: "Fuchsia",       hex: "#E6007E", note: "Saturated cool pink." },
      { name: "Blue-Red",      hex: "#E10600", note: "Cool clear red." },
      { name: "Emerald",       hex: "#00A86B", note: "Vivid jewel green." },
      { name: "Bright Teal",   hex: "#00B8B8", note: "Clear cool blue-green." },
    ],
    avoid: [
      { name: "Beige",      hex: "#F5F5DC", reason: "Muted warm tone dulls your brightness." },
      { name: "Olive",      hex: "#708238", reason: "Earthy muted green clashes." },
      { name: "Camel",      hex: "#C19A6B", reason: "Warm neutral fights your clarity." },
      { name: "Dusty Rose", hex: "#B97C7C", reason: "Muted warm tone — too soft." },
      { name: "Khaki",      hex: "#C3B091", reason: "Muted warm — fights brightness." },
      { name: "Mustard",    hex: "#C39B26", reason: "Warm earthy tone clashes." },
    ],
    neutrals: [
      { name: "Pure White", hex: "#FFFFFF" },
      { name: "Black",      hex: "#000000" },
      { name: "Icy Blue",   hex: "#DDEEFF" },
    ],
    metals: { best: ["Silver", "Platinum", "White Gold"], avoid: ["Bronze", "Copper", "Antique Gold"] },
  },
};

// Aliases — different prompt wording maps to the same canonical palette.
PALETTES["warm spring"]   = PALETTES["true spring"];
PALETTES["clear spring"]  = PALETTES["bright spring"];
PALETTES["cool summer"]   = PALETTES["true summer"];
PALETTES["muted summer"]  = PALETTES["soft summer"];
PALETTES["muted autumn"]  = PALETTES["soft autumn"];
PALETTES["warm autumn"]   = PALETTES["true autumn"];
PALETTES["dark autumn"]   = PALETTES["deep autumn"];
PALETTES["dark winter"]   = PALETTES["deep winter"];
PALETTES["cool winter"]   = PALETTES["true winter"];
PALETTES["clear winter"]  = PALETTES["bright winter"];

export function getCanonicalPalette(season: string | undefined): SeasonPalette | null {
  if (!season) return null;
  const key = season.toLowerCase().trim();
  return PALETTES[key] || null;
}
