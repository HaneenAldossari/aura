export interface ColorDNA {
  temperature: number;
  depth: number;
  clarity: number;
  contrast: number;
}

export const SEASON_DNA: Record<string, ColorDNA> = {
  'Deep Autumn':    { temperature: 82, depth: 78, clarity: 35, contrast: 75 },
  'True Autumn':    { temperature: 78, depth: 55, clarity: 40, contrast: 55 },
  'Soft Autumn':    { temperature: 65, depth: 45, clarity: 25, contrast: 35 },
  'Deep Winter':    { temperature: 25, depth: 80, clarity: 75, contrast: 85 },
  'True Winter':    { temperature: 20, depth: 65, clarity: 80, contrast: 70 },
  'Bright Winter':  { temperature: 30, depth: 60, clarity: 95, contrast: 80 },
  'Light Spring':   { temperature: 68, depth: 25, clarity: 70, contrast: 30 },
  'True Spring':    { temperature: 75, depth: 40, clarity: 80, contrast: 50 },
  'Bright Spring':  { temperature: 72, depth: 45, clarity: 92, contrast: 65 },
  'Light Summer':   { temperature: 35, depth: 28, clarity: 55, contrast: 25 },
  'True Summer':    { temperature: 30, depth: 42, clarity: 45, contrast: 40 },
  'Soft Summer':    { temperature: 40, depth: 38, clarity: 28, contrast: 30 },
};

export function calculateColorDNA(season: string, keyFeatures?: Record<string, string>): ColorDNA {
  // Normalize season name — match against keys
  const normalizedSeason = Object.keys(SEASON_DNA).find(
    k => season.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(season.toLowerCase())
  );
  const base = { ...(SEASON_DNA[normalizedSeason || 'Deep Autumn'] || SEASON_DNA['Deep Autumn']) };

  // Fine-tune based on actual detected features
  if (keyFeatures?.contrast?.toLowerCase().includes('high')) {
    base.contrast = Math.min(100, base.contrast + 8);
  } else if (keyFeatures?.contrast?.toLowerCase().includes('low')) {
    base.contrast = Math.max(0, base.contrast - 8);
  }

  // Enforce season-based bounds for accuracy
  const sl = season.toLowerCase();

  // Warmth bounds
  if (sl.includes("cool") || sl.includes("winter")) {
    base.temperature = Math.min(base.temperature, 38);
  }
  if (sl.includes("warm") || sl.includes("spring") || sl.includes("autumn")) {
    base.temperature = Math.max(base.temperature, 56);
  }
  if (sl.includes("soft") && !sl.includes("spring") && !sl.includes("autumn") && !sl.includes("winter")) {
    base.temperature = Math.max(35, Math.min(60, base.temperature));
  }

  // Depth bounds
  if (sl.includes("light")) {
    base.depth = Math.min(base.depth, 44);
  }
  if (sl.includes("deep")) {
    base.depth = Math.max(base.depth, 66);
  }

  return base;
}

// Axis descriptions per value range
export function getDNADescriptions(dna: ColorDNA, _season: string): Array<{
  axis: string;
  emoji: string;
  value: number;
  label: string;
  description: string;
}> {
  return [
    {
      axis: 'Warmth',
      emoji: '🌡️',
      value: dna.temperature,
      label: dna.temperature >= 60 ? 'Warm' : dna.temperature >= 40 ? 'Neutral' : 'Cool',
      description: dna.temperature >= 60
        ? 'Cool colors will always look slightly off on you.'
        : dna.temperature >= 40
        ? 'You can borrow from warm and cool — lean toward your dominant side.'
        : 'Warm earthy colors will look muddy against your skin.'
    },
    {
      axis: 'Depth',
      emoji: '🌑',
      value: dna.depth,
      label: dna.depth >= 60 ? 'Deep' : dna.depth >= 40 ? 'Medium' : 'Light',
      description: dna.depth >= 60
        ? 'Light colors wash you out — always go pigment-rich.'
        : dna.depth >= 40
        ? 'You handle both rich and lighter shades — avoid extremes.'
        : 'Heavy, dark colors overwhelm you — keep things airy.'
    },
    {
      axis: 'Clarity',
      emoji: '🎨',
      value: dna.clarity,
      label: dna.clarity >= 60 ? 'Clear' : dna.clarity >= 40 ? 'Medium' : 'Muted',
      description: dna.clarity >= 60
        ? 'You can carry bright, saturated colors that overwhelm others.'
        : dna.clarity >= 40
        ? 'Moderate saturation looks best on you.'
        : 'Earthy and muted beats bright or neon every time.'
    },
    {
      axis: 'Contrast',
      emoji: '⚡',
      value: dna.contrast,
      label: dna.contrast >= 60 ? 'High' : dna.contrast >= 40 ? 'Medium' : 'Low',
      description: dna.contrast >= 60
        ? 'High contrast — you can carry bold, dramatic looks.'
        : dna.contrast >= 40
        ? 'Medium contrast — stick to medium-intensity combinations.'
        : 'Low contrast — gentle, tonal dressing looks most harmonious.'
    },
  ];
}
