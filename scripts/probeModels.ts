/**
 * Quick latency + sanity probe of candidate free vision models on OpenRouter.
 * Sends a downscaled demo face and asks for undertone/faces as tiny JSON.
 * Usage: npx tsx scripts/probeModels.ts
 */
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../.env") });

import { prepareImage } from "../server/utils/prepareImage";

const CANDIDATES = [
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
];

async function probe(model: string, base64: string): Promise<void> {
  const started = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
              {
                type: "text",
                text: 'Respond with ONLY this JSON: {"faces": <number of human faces>, "undertone": "warm|cool|neutral"}',
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (!res.ok) {
      const body = (await res.text()).slice(0, 120);
      console.log(`${model.padEnd(50)} HTTP ${res.status} in ${secs}s ${body}`);
      return;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = (data.choices?.[0]?.message?.content || "").replace(/\s+/g, " ").slice(0, 80);
    console.log(`${model.padEnd(50)} OK in ${secs}s → ${text}`);
  } catch (err) {
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`${model.padEnd(50)} FAILED in ${secs}s (${(err as Error).name})`);
  }
}

async function main() {
  const img = fs.readFileSync(path.join(__dirname, "../client/public/demo-faces/sample-1.png"));
  const prepared = await prepareImage(img);
  console.log(`image prepared: ${prepared.width}x${prepared.height}, ${Math.round(prepared.base64.length / 1024)}KB base64\n`);
  for (const model of CANDIDATES) {
    await probe(model, prepared.base64);
  }
}

main();
