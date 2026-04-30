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

  async function snap(name) {
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  Saved: ${name}.png`);
  }

  // 1. Home page
  console.log("1/3  Home page...");
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 15000 });
  await snap("01-home");

  // 2. Analysis (upload) page
  console.log("2/3  Analysis page...");
  await page.goto(`${BASE}/analyze`, { waitUntil: "networkidle0", timeout: 15000 });
  await snap("02-analysis-upload");

  // 3. Create a demo session via API
  console.log("3/3  Results pages...");
  const sessionId = await page.evaluate(async () => {
    try {
      const res = await fetch("/api/demo-session", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      return data.sessionId || null;
    } catch {
      return null;
    }
  });

  if (!sessionId) {
    console.log("  Could not create demo session.");
    await browser.close();
    return;
  }

  console.log(`  Session: ${sessionId}`);
  await page.goto(`${BASE}/results/${sessionId}`, { waitUntil: "networkidle0", timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000)); // Let celebrity images load

  // Screenshot each tab
  const tabLabels = [
    { label: "Overview", name: "03-results-overview" },
    { label: "Palette", name: "04-results-palette" },
    { label: "Makeup", name: "05-results-makeup" },
    { label: "Nails", name: "06-results-nails" },
    { label: "Wardrobe", name: "07-results-wardrobe" },
    { label: "Jewelry", name: "08-results-jewelry" },
    { label: "Hair", name: "09-results-hair" },
    { label: "Celebs", name: "10-results-celebrities" },
  ];

  for (const t of tabLabels) {
    const clicked = await page.evaluate((lbl) => {
      const buttons = document.querySelectorAll("nav button");
      for (const btn of buttons) {
        if (btn.textContent?.trim() === lbl || btn.textContent?.includes(lbl)) {
          btn.click();
          return true;
        }
      }
      return false;
    }, t.label);

    if (clicked) {
      await new Promise(r => setTimeout(r, 2000));
      await snap(t.name);
    } else {
      console.log(`  Could not find tab: ${t.label}`);
    }
  }

  // Screenshot chatbot open
  console.log("  Chatbot...");
  // Click the floating chat button (MessageCircle icon)
  const chatOpened = await page.evaluate(() => {
    const btns = document.querySelectorAll("button");
    for (const btn of btns) {
      if (btn.classList.contains("fixed") && btn.classList.contains("bottom-6")) {
        btn.click();
        return true;
      }
    }
    return false;
  });
  if (chatOpened) {
    await new Promise(r => setTimeout(r, 1000));
    // Take a viewport-only screenshot for the chatbot
    await page.screenshot({ path: path.join(OUT, "11-chatbot-open.png"), fullPage: false });
    console.log("  Saved: 11-chatbot-open.png");
  }

  await browser.close();
  console.log(`\nAll screenshots saved to: ${OUT}`);
}

main().catch(console.error);
