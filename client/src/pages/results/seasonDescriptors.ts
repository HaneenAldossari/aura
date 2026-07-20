// Canonical per-season tone descriptors — used in the Color Analysis card.
// Keeps results clean and consistent across runs.
export type Descriptors = { undertone: string; hair: string; eyes: string; contrast: string };

export const SEASON_DESCRIPTORS: Record<string, Descriptors> = {
  "deep autumn":   { undertone: "Warm, golden",         hair: "Deep brown to black",         eyes: "Deep warm brown",            contrast: "High" },
  "true autumn":   { undertone: "Warm, golden",         hair: "Warm brown to auburn",        eyes: "Warm brown to hazel",        contrast: "Medium" },
  "warm autumn":   { undertone: "Warm, golden",         hair: "Warm brown to auburn",        eyes: "Warm brown to hazel",        contrast: "Medium" },
  "soft autumn":   { undertone: "Warm-neutral, soft",   hair: "Soft warm brown",             eyes: "Soft brown to hazel",        contrast: "Medium-low" },
  "muted autumn":  { undertone: "Warm-neutral, soft",   hair: "Soft warm brown",             eyes: "Soft brown to hazel",        contrast: "Medium-low" },
  "deep winter":   { undertone: "Cool-neutral, deep",   hair: "Black to deep cool brown",    eyes: "Dark cool brown to black",   contrast: "High" },
  "dark winter":   { undertone: "Cool-neutral, deep",   hair: "Black to deep cool brown",    eyes: "Dark cool brown to black",   contrast: "High" },
  "cool winter":   { undertone: "Cool, clear",          hair: "Cool dark brown to black",    eyes: "Cool brown, grey, or blue",  contrast: "High" },
  "true winter":   { undertone: "Cool, clear",          hair: "Cool dark brown to black",    eyes: "Cool brown, grey, or blue",  contrast: "High" },
  "bright winter": { undertone: "Cool, vivid",          hair: "Dark brown to black",         eyes: "Bright clear blue or green", contrast: "Very high" },
  "clear winter":  { undertone: "Cool, vivid",          hair: "Dark brown to black",         eyes: "Bright clear blue or green", contrast: "Very high" },
  "light summer":  { undertone: "Cool, soft",           hair: "Ash blonde to light brown",   eyes: "Soft blue, grey, or green",  contrast: "Low" },
  "true summer":   { undertone: "Cool, muted",          hair: "Cool ash brown",              eyes: "Cool blue, grey, or green",  contrast: "Medium" },
  "cool summer":   { undertone: "Cool, muted",          hair: "Cool ash brown",              eyes: "Cool blue, grey, or green",  contrast: "Medium" },
  "soft summer":   { undertone: "Cool-neutral, muted",  hair: "Soft ash brown",              eyes: "Soft blue, grey, or hazel",  contrast: "Low" },
  "muted summer":  { undertone: "Cool-neutral, muted",  hair: "Soft ash brown",              eyes: "Soft blue, grey, or hazel",  contrast: "Low" },
  "light spring":  { undertone: "Warm, soft",           hair: "Light blonde to light brown", eyes: "Soft warm blue or green",    contrast: "Low" },
  "true spring":   { undertone: "Warm, clear",          hair: "Warm blonde to red-brown",    eyes: "Warm blue, green, or brown", contrast: "Medium" },
  "warm spring":   { undertone: "Warm, clear",          hair: "Warm blonde to red-brown",    eyes: "Warm blue, green, or brown", contrast: "Medium" },
  "bright spring": { undertone: "Warm, vivid",          hair: "Warm brown",                  eyes: "Bright clear warm",          contrast: "High" },
  "clear spring":  { undertone: "Warm, vivid",          hair: "Warm brown",                  eyes: "Bright clear warm",          contrast: "High" },
};

export function getDescriptors(season: string): Descriptors {
  const key = (season || "").toLowerCase().trim();
  return SEASON_DESCRIPTORS[key] || { undertone: "Neutral", hair: "Medium", eyes: "Medium", contrast: "Medium" };
}
