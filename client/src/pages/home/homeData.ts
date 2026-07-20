/* ─── BounceCards Season Card SVG Images ────────── */
export const bounceCardData = [
  { name: "Deep Autumn", colors: ["#6B2737", "#C4714A", "#B8834A", "#6B7A3A", "#3D5C3A", "#C8963C"], desc: "Warm · Rich · Deep" },
  { name: "True Winter", colors: ["#1B1B2E", "#8B2040", "#4A4A8A", "#C8D4E8", "#2A4A6B", "#FFFFFF"], desc: "Cool · Crisp · Bold" },
  { name: "Light Spring", colors: ["#F0C8A8", "#E8A89A", "#F0D4B8", "#C8D4A8", "#E8C4B8", "#F0E8D4"], desc: "Soft · Warm · Bright" },
  { name: "Soft Summer", colors: ["#8B7A8B", "#C4B4C4", "#A89AAA", "#D4C4D4", "#7A8A9A", "#B4C4C4"], desc: "Cool · Muted · Gentle" },
  { name: "Dark Winter", colors: ["#1A1A2E", "#6B1A3A", "#3A3A6A", "#B0C0D0", "#2A3A5A", "#E0E0E8"], desc: "Cool · Deep · Vivid" },
  { name: "Warm Spring", colors: ["#E8B88A", "#D4946A", "#E8C49A", "#A8C488", "#D4A878", "#F0D8B4"], desc: "Warm · Clear · Fresh" },
  { name: "True Autumn", colors: ["#8B4A2A", "#C47240", "#B88330", "#6B5A2A", "#3D4A2A", "#C88C3C"], desc: "Warm · Earthy · Rich" },
];

export function makeSeasonCardSvg(name: string, colors: string[], desc: string): string {
  const w = 200;
  const h = 267;
  const stripH = Math.round(h * 0.38);
  const segW = w / colors.length;
  const strips = colors.map((c, i) => `<rect x="${i * segW}" y="0" width="${segW + 1}" height="${stripH}" fill="${c}"/>`).join("");
  // Individual swatches row
  const swatchY = stripH + 60;
  const swatchR = 8;
  const swatchGap = w / (colors.length + 1);
  const swatches = colors.map((c, i) => `<circle cx="${swatchGap * (i + 1)}" cy="${swatchY}" r="${swatchR}" fill="${c}" opacity="0.85"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="#131316"/>
    ${strips}
    <line x1="40" y1="${stripH + 20}" x2="160" y2="${stripH + 20}" stroke="#D4AF7A" stroke-width="0.5" opacity="0.3"/>
    <text x="${w / 2}" y="${stripH + 42}" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#D4AF7A" letter-spacing="1.5">${name}</text>
    ${swatches}
    <text x="${w / 2}" y="${swatchY + 28}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#807870" letter-spacing="1.5">${desc}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const bounceCardImages = bounceCardData.map((d) => makeSeasonCardSvg(d.name, d.colors, d.desc));

/* ─── Season Carousel Data (all 12) ──────────── */
export const seasonCarouselData = [
  { name: "Deep Autumn", colors: ["#6B2737", "#C4714A", "#B8834A", "#6B7A3A", "#3D5C3A", "#C8963C"], desc: "Warm · Rich · Deep", line: "Think olive, rust, burgundy, and deep gold" },
  { name: "True Winter", colors: ["#1B1B2E", "#8B2040", "#4A4A8A", "#C8D4E8", "#2A4A6B", "#FFFFFF"], desc: "Cool · Crisp · Bold", line: "Icy brights, jewel tones, and stark contrasts" },
  { name: "Light Spring", colors: ["#F0C8A8", "#E8A89A", "#F0D4B8", "#C8D4A8", "#E8C4B8", "#F0E8D4"], desc: "Warm · Soft · Bright", line: "Peach, coral, warm pastels, and golden highlights" },
  { name: "Soft Summer", colors: ["#8B7A8B", "#C4B4C4", "#A89AAA", "#D4C4D4", "#7A8A9A", "#B4C4C4"], desc: "Cool · Muted · Gentle", line: "Dusty rose, lavender, sage, and soft blues" },
  { name: "True Autumn", colors: ["#8B4A2A", "#C47240", "#B88330", "#6B5A2A", "#3D4A2A", "#C88C3C"], desc: "Warm · Earthy · Rich", line: "Terracotta, pumpkin, moss, and caramel tones" },
  { name: "Dark Winter", colors: ["#1A1A2E", "#6B1A3A", "#3A3A6A", "#B0C0D0", "#2A3A5A", "#E0E0E8"], desc: "Cool · Deep · Vivid", line: "Rich plum, emerald, navy, and deep berry" },
  { name: "Warm Spring", colors: ["#E8B88A", "#D4946A", "#E8C49A", "#A8C488", "#D4A878", "#F0D8B4"], desc: "Warm · Clear · Fresh", line: "Warm coral, golden yellow, and fresh greens" },
  { name: "Cool Winter", colors: ["#2A2A3E", "#9A2850", "#5A5A9A", "#D0D8E8", "#3A5A7A", "#F0F0F8"], desc: "Cool · Icy · Pure", line: "Fuchsia, royal blue, icy pink, and true white" },
  { name: "Warm Autumn", colors: ["#7A3A1A", "#B46A38", "#A07A28", "#5A5A1A", "#4A5A2A", "#B88438"], desc: "Warm · Muted · Golden", line: "Amber, mustard, warm olive, and copper hues" },
  { name: "Light Summer", colors: ["#9A8AAA", "#D4C8D8", "#B8A8C0", "#E0D4E0", "#8A9AAA", "#C4D4D8"], desc: "Cool · Light · Soft", line: "Powder blue, soft mauve, and cool pastels" },
  { name: "Bright Spring", colors: ["#E89870", "#F0B868", "#E8D070", "#70C088", "#60A8D0", "#E87898"], desc: "Warm · Vivid · Clear", line: "Bright coral, turquoise, warm red, and citrus" },
  { name: "Soft Autumn", colors: ["#8A6A4A", "#B8946A", "#A89858", "#6A7A4A", "#5A6A4A", "#C8A868"], desc: "Warm · Soft · Muted", line: "Camel, sage, muted teal, and warm taupe" },
];
