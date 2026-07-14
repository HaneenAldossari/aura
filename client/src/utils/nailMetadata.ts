export interface NailMeta {
  brand: string;
  colorDescription: string;
  shadeName: string;
  file: string;
  seasons: string[];
}

export const NAIL_METADATA: NailMeta[] = [
  // ── OPI ────────────────────────────────────────────────
  { file: "bubble-bath", shadeName: "Bubble Bath", brand: "OPI", colorDescription: "Sheer Soft Pink", seasons: ["Light Summer", "Soft Summer", "True Summer", "Cool Summer", "Light Spring"] },
  { file: "limo-scene", shadeName: "Limo-Scene", brand: "OPI", colorDescription: "Sheer Cool Pink", seasons: ["Cool Summer", "True Summer", "Soft Summer", "True Winter"] },
  { file: "pink-ing-of-you", shadeName: "Pink-ing of You", brand: "OPI", colorDescription: "Warm Bubblegum Pink", seasons: ["Warm Spring", "True Spring", "Light Spring"] },
  { file: "princesses-rule", shadeName: "Princesses Rule", brand: "OPI", colorDescription: "Bright Cool Pink", seasons: ["True Winter", "Cool Summer", "Light Summer"] },
  { file: "charged-up-cherry", shadeName: "Charged Up Cherry", brand: "OPI", colorDescription: "Vivid Cool Red", seasons: ["True Winter", "Deep Winter", "Cool Summer"] },
  { file: "big-apple-red", shadeName: "Big Apple Red", brand: "OPI", colorDescription: "Bright Blue-Red", seasons: ["True Winter", "Deep Winter", "Cool Summer"] },
  { file: "cajun-shrimp", shadeName: "Cajun Shrimp", brand: "OPI", colorDescription: "Warm Orange Coral", seasons: ["Warm Spring", "True Spring", "Light Spring", "Warm Autumn", "Deep Autumn"] },
  { file: "malaga-wine", shadeName: "Malaga Wine", brand: "OPI", colorDescription: "Deep Cool Burgundy", seasons: ["Cool Summer", "True Summer", "True Winter", "Deep Winter", "Soft Summer"] },
  { file: "berry-naughty", shadeName: "Berry Naughty", brand: "OPI", colorDescription: "Deep Berry Red", seasons: ["Deep Autumn", "True Autumn", "Warm Autumn", "Deep Winter"] },
  { file: "bare-with-me", shadeName: "Bare With Me", brand: "OPI", colorDescription: "Neutral Warm Nude", seasons: ["True Autumn", "Soft Autumn", "Warm Autumn", "Warm Spring"] },
  { file: "sheer-bliss", shadeName: "Sheer Bliss", brand: "OPI", colorDescription: "Sheer White Pink", seasons: ["Light Summer", "Cool Summer", "True Summer", "Light Spring"] },
  { file: "strawberry-margarita", shadeName: "Strawberry Margarita", brand: "OPI", colorDescription: "Warm Coral Red", seasons: ["Warm Spring", "True Spring", "Light Spring", "Warm Autumn"] },
  { file: "watermelon", shadeName: "Watermelon", brand: "OPI", colorDescription: "Bright Warm Pink", seasons: ["Warm Spring", "True Spring", "Light Spring"] },
  { file: "midnight-cami", shadeName: "Midnight Cami", brand: "OPI", colorDescription: "Deep Navy Blue", seasons: ["True Winter", "Deep Winter", "Cool Summer"] },
  // ── Essie ───────────────────────────────────────────────
  { file: "ballet-slippers", shadeName: "Ballet Slippers", brand: "Essie", colorDescription: "Sheer Pale Pink", seasons: ["Cool Summer", "Light Summer", "Soft Summer", "True Winter"] },
  { file: "mademoiselle", shadeName: "Mademoiselle", brand: "Essie", colorDescription: "Warm Sheer Nude", seasons: ["Light Spring", "Warm Spring", "True Spring", "Light Autumn"] },
  { file: "perennial-chic", shadeName: "Perennial Chic", brand: "Essie", colorDescription: "Muted Dusty Rose", seasons: ["Soft Summer", "Cool Summer", "Soft Autumn"] },
  { file: "mod-about-you", shadeName: "Mod About You", brand: "Essie", colorDescription: "Cool Mauve Purple", seasons: ["True Winter", "Cool Summer", "Soft Summer", "Deep Winter"] },
  { file: "lovie-dovie", shadeName: "Lovie Dovie", brand: "Essie", colorDescription: "Soft Warm Pink", seasons: ["Light Spring", "Warm Spring", "Soft Autumn"] },
  { file: "bachelorette-bash", shadeName: "Bachelorette Bash", brand: "Essie", colorDescription: "Hot Bright Pink", seasons: ["True Winter", "Warm Spring", "Light Spring"] },
  { file: "sugar-daddy", shadeName: "Sugar Daddy", brand: "Essie", colorDescription: "Sheer Warm Peach", seasons: ["Light Spring", "Warm Spring", "True Spring", "Light Autumn", "Soft Autumn"] },
  { file: "angel-food", shadeName: "Angel Food", brand: "Essie", colorDescription: "Pale Warm Cream", seasons: ["Light Spring", "Warm Spring", "True Spring", "Light Autumn"] },
  { file: "tiara", shadeName: "Tiara", brand: "Essie", colorDescription: "Soft Lavender Pink", seasons: ["Soft Summer", "Cool Summer", "True Summer", "Light Summer"] },
  { file: "passion", shadeName: "Passion", brand: "Essie", colorDescription: "Dusty Cool Mauve", seasons: ["Soft Summer", "Cool Summer", "True Summer", "Soft Autumn"] },
];

export function getNailMeta(nameOrKey: string): NailMeta | null {
  const key = nameOrKey
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[!']/g, "");

  return (
    NAIL_METADATA.find(n => n.file === key) ??
    NAIL_METADATA.find(n =>
      n.shadeName.toLowerCase().replace(/[!\s']/g, "-").replace(/-+/g, "-") === key
    ) ??
    NAIL_METADATA.find(n =>
      n.shadeName.toLowerCase().includes(nameOrKey.toLowerCase()) ||
      nameOrKey.toLowerCase().includes(n.shadeName.toLowerCase())
    ) ??
    null
  );
}
