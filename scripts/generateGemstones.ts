import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;
if (!API_KEY) {
  console.error("Set GOOGLE_AI_STUDIO_API_KEY or GOOGLE_AI_API_KEY in .env");
  process.exit(1);
}

const GEMSTONES = [
  "diamond", "ruby", "emerald", "sapphire", "amethyst", "turquoise",
  "pearl", "opal", "topaz", "aquamarine", "citrine", "garnet",
  "onyx", "jade", "lapis lazuli", "amber", "tigers eye", "carnelian",
  "smoky quartz", "moonstone", "rose quartz", "coral", "peridot",
  "sunstone", "morganite", "kunzite", "chalcedony", "labradorite", "tanzanite",
];

function buildPrompt(gemstone: string): string {
  return `A single ${gemstone} gemstone, photorealistic, studio macro photography, sharp focus, dramatic lighting that shows the gem's natural color and clarity, floating against a pure black background, no reflections on background, no props, no jewelry setting, just the raw gem itself, high detail, 4K quality`;
}

async function generateGemstoneImage(gemstone: string): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: buildPrompt(gemstone) }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
        safetyFilterLevel: "block_few",
        personGeneration: "dont_allow",
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json() as { predictions?: Array<{ bytesBase64Encoded?: string }> };
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    console.error(`No image data for: ${gemstone}`);
    return;
  }

  const outputDir = path.join(process.cwd(), "client", "public", "gemstones");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = gemstone.replace(/\s+/g, "-").toLowerCase() + ".png";
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, Buffer.from(b64, "base64"));
  console.log(`✓ Generated: ${filename}`);
}

async function main() {
  console.log(`Generating ${GEMSTONES.length} gemstone images...`);
  for (const gem of GEMSTONES) {
    try {
      await generateGemstoneImage(gem);
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`✗ Failed: ${gem}`, err instanceof Error ? err.message : err);
    }
  }
  console.log("Done! Images saved to client/public/gemstones/");
}

main().catch(console.error);
