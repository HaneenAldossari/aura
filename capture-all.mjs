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

  // 1. Home page
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT, "01-home.png"), fullPage: true });
  console.log("Saved: 01-home.png");

  // 2. Create demo session and go to results
  const sessionId = await page.evaluate(async () => {
    try {
      const res = await fetch("/api/demo-session", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      return data.sessionId || null;
    } catch { return null; }
  });

  if (!sessionId) {
    console.log("No session created");
    await browser.close();
    return;
  }

  await page.goto(`${BASE}/results/${sessionId}`, { waitUntil: "networkidle0", timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  // All tabs to capture in order (4-tab final layout)
  const tabs = [
    { label: "Overview", name: "02-overview" },
    { label: "Beauty", name: "03-beauty" },
    { label: "Style", name: "04-style" },
    { label: "Shop", name: "05-shop" },
  ];

  for (const t of tabs) {
    const clicked = await page.evaluate((lbl) => {
      // Try nav buttons first
      const buttons = document.querySelectorAll("nav button");
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || "";
        if (text === lbl || text.includes(lbl)) {
          btn.click();
          return true;
        }
      }
      // Also try any button/tab element
      const allBtns = document.querySelectorAll("button");
      for (const btn of allBtns) {
        const text = btn.textContent?.trim() || "";
        if (text === lbl || text.includes(lbl)) {
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
  console.log("\nDone! All screenshots saved to ./screenshots/");
}

main().catch(console.error);
