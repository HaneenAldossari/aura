import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "screenshots");
const BASE = "http://localhost:5173";

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // Navigate first so fetch works
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 15000 });

  const sessionId = await page.evaluate(async () => {
    try {
      const res = await fetch("/api/demo-session", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      return data.sessionId || null;
    } catch {
      return null;
    }
  });

  if (sessionId === null) {
    console.log("No session created");
    await browser.close();
    return;
  }

  await page.goto(`${BASE}/results/${sessionId}`, { waitUntil: "networkidle0", timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  const tabs = [
    { label: "Color DNA", name: "12-color-dna" },
    { label: "Blindspots", name: "13-blindspots" },
    { label: "Link Check", name: "14-link-check" },
    { label: "Audit", name: "15-wardrobe-audit" },
  ];

  for (const t of tabs) {
    const clicked = await page.evaluate((lbl) => {
      const buttons = document.querySelectorAll("nav button");
      for (const btn of buttons) {
        if (btn.textContent && (btn.textContent.trim() === lbl || btn.textContent.includes(lbl))) {
          btn.click();
          return true;
        }
      }
      return false;
    }, t.label);

    if (clicked) {
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(OUT, `${t.name}.png`), fullPage: true });
      console.log(`Saved: ${t.name}.png`);
    } else {
      console.log(`Tab not found: ${t.label}`);
    }
  }

  await browser.close();
  console.log("Done");
}

main().catch(console.error);
