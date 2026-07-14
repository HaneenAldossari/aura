/**
 * Maps AI-returned hair color names to local PNG filenames.
 * Files live in public/haircolors/*.png
 */
const HAIR_IMAGE_MAP: Record<string, string> = {
  // Blondes
  "platinum blonde":    "platinum-blonde",
  "platinum":           "platinum-blonde",
  "soft platinum":      "platinum-blonde",
  "ash blonde":         "ash-blonde",
  "light blonde":       "light-blonde",
  "golden blonde":      "golden-blonde",
  "honey blonde":       "honey-blonde",
  "strawberry blonde":  "strawberry-blonde",
  "dirty blonde":       "dirty-blonde",

  // Browns
  "light brown":        "light-brown",
  "medium brown":       "medium-brown",
  "warm brown":         "warm-brown",
  "chestnut":           "chestnut",
  "chocolate brown":    "chocolate-brown",
  "chocolate":          "chocolate-brown",
  "dark brown":         "dark-brown",
  "caramel brown":      "caramel-brown",
  "caramel":            "caramel-brown",
  "ash brown":          "ash-brown",

  // Reds & Auburns
  "auburn":             "auburn",
  "warm auburn":        "auburn",
  "copper":             "copper",
  "copper red":         "copper",
  "deep red":           "deep-red",
  "red":                "deep-red",

  // Darks
  "jet black":          "jet-black",
  "black":              "jet-black",
  "natural black":      "jet-black",
  "soft black":         "soft-black",
  "blue black":         "blue-black",
  "blue-black":         "blue-black",

  // Silvers & Whites
  "silver grey":        "silver-grey",
  "silver":             "silver-grey",
  "grey":               "silver-grey",
  "salt and pepper":    "salt-and-pepper",
  "salt-and-pepper":    "salt-and-pepper",
  "white":              "white",
};

export function getHairImagePath(name: string): string | null {
  const key = name.toLowerCase().trim();
  if (HAIR_IMAGE_MAP[key]) return `/haircolors/${HAIR_IMAGE_MAP[key]}.png`;
  const match = Object.keys(HAIR_IMAGE_MAP).find(
    k => key.includes(k) || k.includes(key)
  );
  return match ? `/haircolors/${HAIR_IMAGE_MAP[match]}.png` : null;
}
