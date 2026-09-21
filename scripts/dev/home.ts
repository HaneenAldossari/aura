/**
 * Home acceptance, in a real browser.
 *
 *   npm run e2e:home            # builds the client and serves the build
 *   npm run e2e:home -- <url>   # against something already running
 *
 * Spends nothing: Home makes no API call. Writes full-page screenshots to
 * dev/home-390.png and dev/home-1440.png, and checks what a screenshot cannot —
 * that the page never scrolls sideways, that the marquee's hexes are the
 * canonical ones as rendered (not merely as imported), that the links go where
 * they say, and that reduced motion really does stop everything.
 */
import { spawn, spawnSync, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { chromium, type Browser, type Page } from "playwright";
import { en } from "../../client/src/i18n/en";
import demoFile from "../../server/demo-analyses/sample-1.json";
import { CANONICAL_SEASONS } from "../../server/prompts/colorAnalysis";
import { getCanonicalPalette, heroSix } from "../../server/utils/seasonPalettes";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "dev");
const PORT = 4179;
const WIDTHS = [390, 1440] as const;

const demo = ((demoFile as { result?: unknown }).result ?? demoFile) as { season: string; confidence: number };

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) failures++;
  console.log(`    ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
};
const section = (title: string) => console.log(`\n  ${title}\n    ${"-".repeat(60)}`);

async function serveBuild(): Promise<{ url: string; child: ChildProcess }> {
  console.log("  building client…");
  const build = spawnSync("npm", ["run", "build"], { cwd: path.join(ROOT, "client"), encoding: "utf8" });
  if (build.status !== 0) throw new Error(`client build failed:\n${build.stdout}\n${build.stderr}`);

  const child = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    cwd: path.join(ROOT, "client"),
    stdio: "ignore",
  });
  const url = `http://localhost:${PORT}`;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return { url, child };
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error("vite preview did not start");
}

/** Walk the page so lazy images and anything scroll-dependent has happened before the shot. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForTimeout(1400); // the entrance is 0.8s + 0.8s of delay
}

async function checkWidth(browser: Browser, base: string, width: number) {
  section(`${width}px`);
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 600 });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));

  await page.goto(base, { waitUntil: "networkidle" });
  await settle(page);

  const scroll = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  check(scroll.doc <= scroll.client && scroll.body <= scroll.client, "no horizontal scroll", JSON.stringify(scroll));

  // Nothing but the belt may be wider than the screen.
  const overflowing = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll<HTMLElement>("#home *"))
      .filter((el) => !el.closest(".lp-marquee__window"))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5);
      })
      .map((el) => el.className || el.tagName)
      .slice(0, 5);
  });
  check(overflowing.length === 0, "no element outside the viewport", overflowing.join(", "));

  const order = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#home > *:not(canvas)")).map((el) => el.className.split(" ").pop() || el.tagName),
  );
  check(
    JSON.stringify(order) === JSON.stringify(["lp-hero", "lp-marquee", "lp-section", "lp-section--raised", "lp-close", "FOOTER"]),
    "order: hero → marquee → steps → what you get → closing → footer",
    order.join(" → "),
  );

  // ── Marquee: the rendered hexes, against the canonical module ──
  const cards = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>(".lp-season:not([aria-hidden])")).map((card) => ({
      name: card.dataset.season ?? "",
      line: card.querySelector(".lp-season__line")?.textContent ?? "",
      swatches: Array.from(card.querySelectorAll<HTMLElement>(".lp-season__swatch")).map((s) => ({
        hex: s.dataset.hex ?? "",
        painted: getComputedStyle(s).backgroundColor,
      })),
    })),
  );
  check(cards.length === 12, "exactly twelve season cards", String(cards.length));
  check(
    JSON.stringify(cards.map((c) => c.name)) === JSON.stringify([...CANONICAL_SEASONS]),
    "canonical names, canonical order",
  );
  const toRgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };
  const wrong: string[] = [];
  for (const card of cards) {
    const six = heroSix(card.name);
    const canonical = new Set((getCanonicalPalette(card.name)?.best ?? []).map((c) => c.hex));
    if (card.swatches.length !== 6) wrong.push(`${card.name}: ${card.swatches.length} swatches`);
    card.swatches.forEach((s, i) => {
      if (s.hex !== six[i]?.hex) wrong.push(`${card.name}[${i}] ${s.hex} ≠ ${six[i]?.hex}`);
      if (!canonical.has(s.hex)) wrong.push(`${card.name}[${i}] ${s.hex} is not in getCanonicalPalette`);
      if (s.painted !== toRgb(six[i]?.hex ?? "#000000")) wrong.push(`${card.name}[${i}] painted ${s.painted}`);
    });
    if (!card.line.trim()) wrong.push(`${card.name}: no descriptor`);
  }
  check(wrong.length === 0, "every marquee hex matches getCanonicalPalette, as painted", wrong.slice(0, 3).join("; "));

  const moving = await page.evaluate(async () => {
    // No named helpers in here: tsx wraps them in __name(), which the page does not have.
    const belt = document.querySelector(".lp-marquee__belt")!;
    const before = new DOMMatrix(getComputedStyle(belt).transform).m41;
    await new Promise((r) => setTimeout(r, 400));
    return before !== new DOMMatrix(getComputedStyle(belt).transform).m41;
  });
  check(moving, "marquee is moving");

  // ── Copy ──
  const text = (await page.locator("#home").innerText()).replace(/\s+/g, " ");
  const l = en.home.landing;
  for (const line of [en.home.privacy, l.step2Body, l.row4Body]) {
    check(text.toLowerCase().includes(line.toLowerCase()), `copy: “${line.slice(0, 48)}…”`);
  }
  check(!/OPI|Essie|27 gemstones|\bcolor\b/i.test(text), "no brand names, invented counts or American spelling");
  check(!text.includes("Nothing uploads until your photo passes"), "the duplicate trust line is gone");

  // ── Hero actions ──
  const howVisible = await page.getByRole("link", { name: l.ctaHow }).isVisible();
  check(howVisible === width >= 600, width < 600 ? "phone hero: primary and sample only" : "desktop hero keeps “See how it works”");

  // ── Particle field: fixed behind everything ──
  const field = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#home canvas");
    if (!canvas) return null;
    const style = getComputedStyle(canvas);
    window.scrollTo(0, document.documentElement.scrollHeight);
    const rect = canvas.getBoundingClientRect();
    window.scrollTo(0, 0);
    return { position: style.position, top: rect.top, height: rect.height, vh: window.innerHeight };
  });
  check(
    field?.position === "fixed" && field.top === 0 && Math.abs(field.height - field.vh) < 2,
    "particle field is fixed to the viewport at the foot of the page too",
    JSON.stringify(field),
  );

  // ── What you get: four rows, each previewed by a capture of the real tab ──
  const rows = await page.locator(".lp-get__item").allInnerTexts();
  check(
    rows.length === 4 && [l.row1Title, l.row2Title, l.row3Title, l.row4Title].every((title, i) => rows[i].startsWith(title)),
    "what you get: exactly four rows, in tab order",
    rows.map((r) => r.split("\n")[0]).join(" | "),
  );
  // Fixed height, nothing cut off: every card is the same size and none overflows.
  const heights: number[] = [];
  for (const title of [l.row1Title, l.row2Title, l.row3Title, l.row4Title]) {
    await page.getByRole("button", { name: title }).click();
    await page.waitForTimeout(650); // the crossfade
    const card = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(".lp-card")!;
      const box = el.getBoundingClientRect();
      const spill = Array.from(el.querySelectorAll<HTMLElement>("*")).filter((child) => {
        const r = child.getBoundingClientRect();
        return r.height > 0 && (r.bottom > box.bottom + 0.5 || r.right > box.right + 0.5);
      }).length;
      return { height: Math.round(box.height), overflow: el.scrollHeight - el.clientHeight, spill, text: el.innerText };
    });
    heights.push(card.height);
    check(card.overflow <= 0 && card.spill === 0, `card fits its frame: ${title}`, `overflow ${card.overflow}px, ${card.spill} spilling`);
    if (title === l.row1Title) {
      check(card.text.includes(demo.season) && card.text.includes(`${demo.confidence}%`), "season card shows the demo file's own season and confidence", `${demo.season} · ${demo.confidence}%`);
    }
  }
  check(new Set(heights).size === 1, "all four cards are one height", heights.join(", "));
  await page.getByRole("button", { name: l.row1Title }).click();
  await page.waitForTimeout(800); // let the crossfade and the 500ms list transition land before the shot

  await page.screenshot({ path: path.join(OUT, `home-${width}.png`), fullPage: true });
  console.log(`    shot  dev/home-${width}.png`);

  // ── Wiring ──
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>("#home a")).map((a) => [a.textContent?.trim(), a.getAttribute("href")]),
  );
  const primary = hrefs.filter(([label]) => label === en.home.ctaPrimary2);
  check(primary.length === 2 && primary.every(([, href]) => href === "/analyse"), "both primary CTAs → /analyse");
  check(hrefs.some(([label, href]) => label === en.common.getStarted && href === "/analyse"), "Get Started → /analyse");

  // The link is desktop-only; a phone hero is the primary button and the sample link.
  if (width >= 600) {
    await page.getByRole("link", { name: l.ctaHow }).click();
    await page.waitForTimeout(900);
    const stepsTop = await page.evaluate(() => document.getElementById("how-it-works")!.getBoundingClientRect().top);
    check(Math.abs(stepsTop) < 4, "“See how it works” → the steps section", `top ${stepsTop.toFixed(0)}px`);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("link", { name: en.home.ctaSample }).click();
  await page.waitForURL(/\/analyse#samples$/);
  await page.waitForTimeout(900);
  const gallery = await page.evaluate(() => {
    const r = document.getElementById("samples")?.getBoundingClientRect();
    return r ? r.top >= 0 && r.bottom <= window.innerHeight + 1 : false;
  });
  check(gallery, "“Try a sample face” → the sample gallery, in view");

  // ── Touch pause (phone only) ──
  if (width < 600) {
    await page.goto(base, { waitUntil: "networkidle" });
    const held = await page.evaluate(async () => {
      const win = document.querySelector(".lp-marquee__window")!;
      const belt = document.querySelector(".lp-marquee__belt")!;
      win.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 60));
      const during = getComputedStyle(belt).animationPlayState;
      win.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 60));
      return { during, after: getComputedStyle(belt).animationPlayState };
    });
    check(held.during === "paused" && held.after === "running", "marquee pauses under a finger, resumes on release", JSON.stringify(held));
  } else {
    await page.goto(base, { waitUntil: "networkidle" });
    await page.locator(".lp-marquee__window").hover();
    const state = await page.evaluate(() => getComputedStyle(document.querySelector(".lp-marquee__belt")!).animationPlayState);
    check(state === "paused", "marquee pauses on hover", state);
  }

  check(errors.length === 0, "no console or page errors", errors.join(" | "));
  await ctx.close();
}

async function checkReducedMotion(browser: Browser, base: string) {
  section("reduced motion");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "networkidle" });

  const state = await page.evaluate(() => ({
    canvases: document.querySelectorAll("#home canvas").length,
    cards: document.querySelectorAll(".lp-season").length,
    running: document.getAnimations().filter((a) => a.playState === "running").length,
    beltAnimation: getComputedStyle(document.querySelector(".lp-marquee__belt")!).animationName,
    hidden: Array.from(document.querySelectorAll<HTMLElement>(".lp-rise")).filter(
      (el) => getComputedStyle(el).opacity !== "1",
    ).length,
    doc: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    rowScrolls: (() => {
      const w = document.querySelector(".lp-marquee__window")!;
      return w.scrollWidth > w.clientWidth && getComputedStyle(w).overflowX === "auto";
    })(),
  }));
  check(state.canvases === 0, "no particle canvas", String(state.canvases));
  check(state.cards === 12 && state.beltAnimation === "none", "marquee is a static row of twelve", `${state.cards} cards, animation ${state.beltAnimation}`);
  check(state.rowScrolls, "the row scrolls inside its own window");
  check(state.doc <= state.client, "and the page still does not scroll sideways");
  check(state.hidden === 0 && state.running === 0, "no entrance animation", `${state.running} running, ${state.hidden} hidden`);

  await page.screenshot({ path: path.join(OUT, "home-390-reduced.png"), fullPage: true });
  await ctx.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const given = process.argv[2];
  const served = given ? null : await serveBuild();
  // A Playwright timeout thrown mid-run skips the finally below only if the
  // process dies first; this makes sure the preview server never outlives us.
  process.on("exit", () => served?.child.kill());
  const base = (given ?? served!.url).replace(/\/$/, "") + "/";
  console.log(`\n  Home acceptance against ${base}`);

  const browser = await chromium.launch();
  try {
    for (const width of WIDTHS) await checkWidth(browser, base, width);
    await checkReducedMotion(browser, base);
  } finally {
    await browser.close();
    served?.child.kill();
  }

  console.log(failures ? `\n  ${failures} FAILED\n` : "\n  all passed\n");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
