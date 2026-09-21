/**
 * End-to-end run against a real dev stack.
 *
 *   npm run e2e            # against local `npm run dev`
 *   npm run e2e -- <url>   # against a deployed URL
 *
 * Boots the Express API and the Vite dev server, drives Chromium through the
 * real upload flow, and then exercises chat and shop with whatever the analysis
 * returned. This spends real OpenRouter credit — roughly $0.01 for the
 * classification plus a few tenths of a cent for chat and the shop check.
 *
 * Selectors are semantic (headings, roles, visible text) rather than test ids.
 * The client carries no data-testid, and adding them would mean editing files a
 * redesign is about to rewrite.
 */
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { chromium, type Browser, type Page, type Request } from "playwright";
// Selectors come from the catalogue rather than literals: the strings moved
// out of the components in the i18n step, and an e2e still matching on
// "Analyze Photo" fails for a spelling change rather than a broken flow.
import { en } from "../../client/src/i18n/en";

const ROOT = path.resolve(__dirname, "../..");
const API_PORT = 3101;
const WEB_PORT = 5180;

const DEMO_FACE = path.join(ROOT, "client/public/demo-faces/sample-4.webp");

// ─────────────────────────────────────────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The weekly monitor runs this against production, where the daily limits are
 * real. With RATE_LIMIT_BYPASS_TOKEN's value in E2E_BYPASS_TOKEN its requests
 * are not counted, so monitoring never uses up — or gets blocked by — the five
 * analyses a day a real visitor behind the same address is allowed.
 *
 * Added to /api/ requests only. As a context-wide extra header it would also be
 * sent to the MediaPipe bucket, where an unknown header turns a simple GET into
 * a preflighted one that the bucket refuses.
 */
const BYPASS = process.env.E2E_BYPASS_TOKEN;
const bypassHeaders: Record<string, string> = BYPASS ? { "x-aura-bypass": BYPASS } : {};
async function withBypass(page: Page): Promise<void> {
  if (!BYPASS) return;
  await page.route("**/api/**", (route) =>
    route.continue({ headers: { ...route.request().headers(), ...bypassHeaders } })
  );
}

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) failures++;
  console.log(`    ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
  return ok;
};
const section = (title: string) => console.log(`\n  ${title}\n    ${"-".repeat(60)}`);

// ─────────────────────────────────────────────────────────────────────────────
// Processes
// ─────────────────────────────────────────────────────────────────────────────

interface Proc {
  child: ChildProcess;
  label: string;
}

const started: Proc[] = [];

function stopAll() {
  for (const { child } of started) {
    try {
      if (child.pid) process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

async function waitForHttp(url: string, label: string, attempts = 90): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`${label}: never came up at ${url}`);
}

function launch(label: string, command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) {
  // detached so the whole group dies: npx spawns the real process as a child.
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, ...env },
  });
  started.push({ child, label });
  return child;
}

// ─────────────────────────────────────────────────────────────────────────────
// The run
// ─────────────────────────────────────────────────────────────────────────────

interface Captured {
  analyzeHadFeatures: boolean;
  analyzeFeatureKeys: string[];
  result: Record<string, unknown> | null;
}

async function runBrowserFlow(page: Page, baseUrl: string): Promise<Captured> {
  const captured: Captured = {
    analyzeHadFeatures: false,
    analyzeFeatureKeys: [],
    result: null,
  };

  // A result is immutable once displayed: one upload, one analyze call, and
  // nothing the reader does afterwards may cause another.
  let analyzeCalls = 0;
  page.on("request", (request: Request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/api/analyze")) analyzeCalls++;
  });

  // Did the browser actually send measured features, or silently fall back?
  page.on("request", (request: Request) => {
    if (!request.url().includes("/api/analyze")) return;
    const body = request.postData() ?? "";
    const match = body.match(/name="features"\r?\n\r?\n([\s\S]*?)\r?\n--/);
    if (!match) return;
    try {
      const features = JSON.parse(match[1]);
      captured.analyzeHadFeatures = true;
      captured.analyzeFeatureKeys = Object.keys(features).sort();
    } catch {
      /* leave it false — reported below */
    }
  });

  page.on("response", async (response) => {
    if (!response.url().includes("/api/analyze")) return;
    try {
      const json = (await response.json()) as { result?: Record<string, unknown> };
      captured.result = json.result ?? null;
    } catch {
      /* non-JSON error body */
    }
  });

  const stagesSeen: string[] = [];

  // A route lost in a refactor 404s silently: the client swallows it and the
  // page still renders. The celebrity-image endpoint disappeared in the Vercel
  // migration exactly this way.
  const notFound: string[] = [];
  page.on("response", (r) => {
    if (r.status() === 404 && r.url().includes("/api/")) notFound.push(new URL(r.url()).pathname);
  });

  section("1. Upload flow");
  await page.goto(`${baseUrl}/analyse`, { waitUntil: "domcontentloaded" });
  const uploadHeading = page.getByRole("heading", { name: en.analysis.photoTitle });
  await uploadHeading.waitFor({ timeout: 30_000 });
  check(await uploadHeading.isVisible(), "upload screen rendered");

  await page.setInputFiles('input[type="file"]', DEMO_FACE);
  await page.waitForTimeout(500);

  // The hair toggle only appears once a photo is chosen.
  const hairGroup = page.getByRole("radiogroup", { name: en.analysis.hair.groupLabel });
  check(await hairGroup.isVisible(), "hair status toggle appears after choosing a photo");

  const naturalOption = page.getByRole("radio", { name: en.analysis.hair.naturalLabel });
  await naturalOption.click();
  check(
    (await naturalOption.getAttribute("aria-checked")) === "true",
    "hair status set to natural"
  );

  section("2. Real loading stages");
  // Watch the active stage change while the pipeline runs. Targeting the
  // class rather than a tag: the row is a <p> inside an <li>, and a heading
  // level is the kind of thing a redesign changes without telling anyone.
  const collect = setInterval(async () => {
    try {
      const text = await page
        .locator(".an-stage--active .an-stage__title")
        .allInnerTexts();
      for (const t of text) {
        const clean = t.trim();
        if (clean && !stagesSeen.includes(clean)) stagesSeen.push(clean);
      }
    } catch {
      /* page navigated */
    }
  }, 200);

  await page.getByRole("button", { name: en.analysis.analyse, exact: true }).click();

  await page.waitForURL(/\/results\/.+/, { timeout: 180_000 });
  clearInterval(collect);

  const expectedStages = [/getting ready|checking your photo/i, /measuring|determining/i];
  for (const pattern of expectedStages) {
    check(
      stagesSeen.some((s) => pattern.test(s)),
      `loading stage matching ${pattern}`,
      stagesSeen.slice(0, 6).join(" | ")
    );
  }

  section("3. The server received and used the measured features");
  // The response listener is async and can land after waitForURL resolves.
  for (let i = 0; i < 40 && !captured.result; i++) {
    await page.waitForTimeout(100);
  }
  // Server truth beats request sniffing: these fields only appear when
  // validateFeatures() accepted a payload and the hybrid path ran.
  const result = captured.result ?? {};
  check(Boolean(result.measured), "response carries `measured` — hybrid path ran");
  check(Boolean(result.rules), "response carries the rule-based verdict");
  check(Boolean(result.agreement), "response carries the model-vs-rules agreement");
  const measured = result.measured as Record<string, unknown> | undefined;
  check(Boolean(measured?.skin), "measured.skin present");
  check(
    typeof measured?.hairStatus === "string",
    "measured.hairStatus present",
    String(measured?.hairStatus)
  );
  if (!result.measured) {
    console.log(`      result keys: ${Object.keys(result).join(", ")}`);
  }

  section("4. Results page");
  // .ed-season, not the first h1: the loading screen also has an h1, and
  // reading it before React has swapped the route is a race.
  const heading = page.locator(".ed-season").first();
  await heading.waitFor({ timeout: 30_000 });
  const seasonText = (await heading.innerText()).replace(/\s+/g, " ").trim();
  check(
    /(spring|summer|autumn|winter)/i.test(seasonText),
    "results page shows a season",
    seasonText.replace(/\s+/g, " ")
  );

  // Confidence is NOT rendered anywhere in the client — only the API carries it.
  // Asserted from the response rather than the page; see the note in the header.
  const confidence = captured.result?.confidence;
  check(
    typeof confidence === "number" && confidence > 0 && confidence <= 100,
    "confidence present in the API response (not rendered in the UI)",
    String(confidence)
  );

  // The hair assumption lives on the Style tab.
  // Tabs carry role="tab", not "button".
  await // Tabs are gone — Results is one scrolling page now.
  await page.waitForTimeout(800);
  const bodyText = await page.locator("body").innerText();
  check(
    /natural colour|coloured, so we left it out|not visible|couldn't read your hair/i.test(bodyText),
    "hair assumption line shown on the results page"
  );

  section("4b. The result is immutable once displayed");
  // Watch the season heading from first render: every text it ever holds is
  // recorded in the page, so a change that happens and reverts is still caught.
  const resultUrl = page.url().split("?")[0];
  // A string, not a function: tsx wraps named helpers in __name(), which the
  // page does not have, and this needs one (it is both called and observed).
  await page.evaluate(`(() => {
    const seen = new Set();
    const read = () => {
      const el = document.querySelector(".ed-season");
      if (el && el.textContent) seen.add(el.textContent.replace(/\\s+/g, " ").trim());
    };
    read();
    new MutationObserver(read).observe(document.body, { childList: true, subtree: true, characterData: true });
    window.__seasonsSeen = seen;
  })()`);

  // What the bug report did: scroll, switch tabs, lose and regain focus, wait.
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 1200); await page.waitForTimeout(150); }
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, -1200); await page.waitForTimeout(150); }
  for (const tab of ["beauty", "style", "shop", "overview"]) {
    await page.getByRole("tab", { name: new RegExp(`^${tab}$`, "i") }).click();
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur"));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
  });
  const idleMs = Number(process.env.E2E_IDLE_MS ?? 20_000);
  await page.waitForTimeout(idleMs);

  const seasonsSeen = (await page.evaluate("[...window.__seasonsSeen]")) as string[];
  check(analyzeCalls === 1, "exactly one /api/analyze call for one upload", `${analyzeCalls} calls`);
  check(
    // textContent joins the per-word spans with no space ("SoftAutumn"); compare without it.
    seasonsSeen.length === 1 && String(seasonsSeen[0]).replace(/\s/g, "") === seasonText.replace(/\s/g, ""),
    `season text never changed after first render (scroll, tabs, blur/focus, ${idleMs / 1000}s idle)`,
    seasonsSeen.join(" → ")
  );
  check(page.url().split("?")[0] === resultUrl, "still the same result id", page.url().slice(-40));
  check(
    (await page.getByRole("button", { name: /re-analys/i }).count()) === 0,
    "no control on the results page re-runs the analysis in place"
  );

  section("5. No silently-missing API routes");
  const unexpected = [...new Set(notFound)];
  check(
    unexpected.length === 0,
    "no unexpected /api 404s during the run",
    unexpected.join(", ")
  );

  return captured;
}

async function runApiChecks(baseApi: string, captured: Captured) {
  section("6. Statelessness");
  const health = await (await fetch(`${baseApi}/health`)).json();
  check(health.stateless === true, "health reports a stateless API");
  // Older deployments predate these fields; assert them only where they exist.
  if ("modelsResolve" in health) {
    check(health.status === "ok", "health is ok", `${health.status} ${[...(health.problems ?? []), ...(health.warnings ?? [])].join("; ")}`);
    check(
      Object.values(health.modelsResolve as Record<string, boolean | null>).every((v) => v !== false),
      "every configured model ID still resolves on OpenRouter",
      JSON.stringify(health.modelsResolve)
    );
    console.log(`      balance: ${health.balance?.usd === null ? "unknown" : `$${health.balance?.usd}`} · rate limit: ${health.rateLimit}`);
  }
  const gone = await fetch(`${baseApi}/results/anything`);
  check(gone.status === 404, "GET /api/results is gone", `HTTP ${gone.status}`);
  check(!("sessionId" in (captured.result ?? {})), "response carries no sessionId");

  section("7. Chat");
  const chat = await fetch(`${baseApi}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bypassHeaders },
    // Stateless: the analysis travels in the body, there is no session to look up.
    body: JSON.stringify({
      analysis: captured.result,
      messages: [{ role: "user", content: "In one sentence, why is this my season?" }],
    }),
  });
  const chatBody = (await chat.json().catch(() => ({}))) as { response?: string };
  check(chat.ok, "chat responded", `HTTP ${chat.status}`);
  check(
    typeof chatBody.response === "string" && chatBody.response.length > 20,
    "chat returned prose",
    (chatBody.response ?? "").slice(0, 70)
  );

  section("8. Before You Buy");
  const form = new FormData();
  const { readFileSync } = await import("fs");
  form.append(
    "photo",
    new File([new Blob([readFileSync(DEMO_FACE) as unknown as BlobPart])], "product.webp", {
      type: "image/webp",
    })
  );
  form.append("analysis", JSON.stringify(captured.result));

  const shop = await fetch(`${baseApi}/link-check-image`, { method: "POST", body: form, headers: bypassHeaders });
  const shopBody = (await shop.json().catch(() => ({}))) as { matchScore?: number; verdict?: string };
  check(shop.ok, "shop check responded", `HTTP ${shop.status}`);
  check(
    typeof shopBody.matchScore === "number",
    "shop check returned a score",
    `${shopBody.matchScore} / ${shopBody.verdict}`
  );
}

/**
 * Layout and direction, at both ends of the responsive range.
 *
 * The page must not scroll horizontally. In LTR an overflowing element hides
 * off the right edge and nobody notices; in RTL the scroll origin is the right
 * edge, so the same overflow pushes the content visibly out of frame. That is
 * how the 41px the drape wall was adding at 390px came to light, so both
 * directions are checked at both widths rather than one of each.
 */
async function runLayoutChecks(browser: Browser, baseUrl: string) {
  section("layout and direction");

  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await withBypass(page);
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      const { dir, htmlLang, scrollWidth, clientWidth } = await page.evaluate(() => ({
        dir: document.documentElement.dir,
        htmlLang: document.documentElement.lang,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      check(dir === "ltr", `@${width}: dir is ltr`, `got "${dir}"`);
      check(htmlLang === "en", `@${width}: lang is en`, `got "${htmlLang}"`);
      check(
        scrollWidth <= clientWidth + 1,
        `@${width}: no horizontal page scroll`,
        `scrollWidth ${scrollWidth} vs clientWidth ${clientWidth}`
      );
    } finally {
      await context.close();
    }
  }

  /**
   * Locale switching is off until the Arabic copy and a visible toggle ship
   * together. These assert nothing a visitor controls can reach Arabic — a
   * half-translated UI laid out RTL is worse than an English one, because the
   * English strings that fall back get rendered right-to-left.
   */
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    locale: "ar-SA",
  });
  const page = await context.newPage();
  await withBypass(page);
  try {
    await page.goto(`${baseUrl}/?lang=ar`, { waitUntil: "networkidle" });
    const state = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      stored: (() => {
        try {
          return localStorage.getItem("aura:locale");
        } catch {
          return null;
        }
      })(),
      arabic: /[\u0600-\u06FF]/.test(document.body.innerText),
    }));
    check(state.dir === "ltr", "?lang=ar does not flip direction", `got "${state.dir}"`);
    check(state.lang === "en", "?lang=ar does not change the language", `got "${state.lang}"`);
    check(!state.arabic, "no Arabic text renders");
    check(state.stored === null, "no locale preference is stored", `got ${state.stored}`);

    // A browser that only asks for Arabic must still get English.
    await page.goto(`${baseUrl}/analyse`, { waitUntil: "networkidle" });
    check(
      (await page.getAttribute("html", "lang")) === "en",
      "an Arabic-preferring browser still gets English"
    );
  } finally {
    await context.close();
  }
}


/**
 * Walk every screen and state at both ends of the responsive range, and
 * photograph each one.
 *
 * The screenshots are the point as much as the assertions: a layout that has
 * quietly broken still passes a selector check, and nobody opens a phone
 * viewport by hand on the way to a release. Written to dev/shots/, which is
 * gitignored.
 *
 * Runs one real analysis per width, because several of these screens only
 * exist after one.
 */
async function runScreenshotTour(browser: Browser, baseUrl: string) {
  section("screenshot tour");

  const dir = path.join(ROOT, "dev/shots");
  fs.mkdirSync(dir, { recursive: true });

  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await withBypass(page);
    const tag = `${width}`;
    const shot = async (name: string) => {
      await page.screenshot({ path: path.join(dir, `${name}-${tag}.png`), fullPage: true });
    };
    const noScroll = async (name: string) => {
      const ok = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      );
      check(ok, `${name} @${width}: no horizontal scroll`);
    };

    try {
      // ── Home ──
      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      await shot("01-home");
      await noScroll("home");

      // ── Upload ──
      await page.goto(`${baseUrl}/analyse`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      await shot("02-upload");
      await noScroll("upload");

      // ── Quality failure: a photo with no face never reaches the network ──
      await page.setInputFiles('input[type="file"]', "client/public/seasons/winter.webp");
      await page.getByRole("button", { name: en.analysis.analyse, exact: true }).click();
      await page.waitForSelector(".an-state", { timeout: 120_000 });
      await shot("03-state-quality");
      check(
        (await page.locator(".an-title").innerText()).trim().length > 0,
        `quality panel @${width} has a heading`
      );
      await page.getByRole("button", { name: en.errors.qualityRetake }).click();
      // Wait for the upload screen to come back before reaching for its input.
      await page.waitForSelector(".an-drop", { timeout: 15_000 });

      // ── Loading, then a real analysis ──
      await page.setInputFiles('input[type="file"]', "client/public/demo-faces/sample-4.webp");
      await page.getByRole("radio", { name: en.analysis.hair.naturalLabel }).click();
      await shot("04-upload-chosen");
      await page.getByRole("button", { name: en.analysis.analyse, exact: true }).click();
      await page.waitForTimeout(900);
      await shot("05-loading");

      await page.waitForURL(/\/results\//, { timeout: 180_000 });
      await page.waitForSelector(".ed-season", { timeout: 60_000 });
      await page.waitForTimeout(900);
      await shot("06-results-overview");
      await noScroll("results overview");

      // ── Tabs ──
      for (const [i, tab] of [["07", "beauty"], ["08", "style"]] as const) {
        await page.getByRole("tab", { name: new RegExp(`^${tab}$`, "i") }).click();
        await page.waitForTimeout(500);
        await shot(`${i}-results-${tab}`);
        await noScroll(`results ${tab}`);
      }

      // ── Shop: a real product check, through the UI ──
      await page.getByRole("tab", { name: /^shop$/i }).click();
      await page.waitForTimeout(400);
      await shot("09-shop-empty");
      await page.setInputFiles('input[type="file"]', "client/public/seasons/autumn.webp");
      await page.waitForSelector(".ed-score", { timeout: 120_000 });
      const score = (await page.locator(".ed-score__value").innerText()).trim();
      check(/^\d{1,3}$/.test(score), `shop check renders a score @${width}`, score);
      check(
        (await page.locator(".ed-verdict").innerText()).trim().length > 0,
        `shop check renders a verdict @${width}`
      );
      await shot("10-shop-result");
      await noScroll("shop result");

      // ── Chat: ask a question and wait for prose back ──
      await page.getByRole("tab", { name: /^overview$/i }).click();
      await page.waitForTimeout(300);
      await page.locator(".ed-chatfab").click();
      await page.waitForSelector('[role="dialog"]', { timeout: 15_000 });
      const input = page.getByPlaceholder(en.results.chat.placeholder);
      await input.fill("Does a camel coat suit me?");
      await input.press("Enter");

      // The reply streams, so wait for prose rather than for the request.
      await page
        .locator('[role="dialog"]')
        .getByText(/\w{40,}/)
        .first()
        .waitFor({ timeout: 90_000 })
        .catch(() => {});
      await page.waitForTimeout(2500);
      const panel = await page.locator('[role="dialog"]').innerText();
      const answered = panel.replace(en.results.chat.greeting.slice(0, 40), "").length > 220;
      check(answered, `chat answered a question @${width}`, panel.slice(-90).replace(/\s+/g, " "));
      check(
        !/Sorry, I had trouble responding/.test(panel),
        `chat did not fall back to its error line @${width}`
      );
      await shot("11-chat");

      console.log(`      wrote dev/shots/*-${tag}.png`);
    } finally {
      await context.close();
    }
  }
}

async function main() {
  const deployed = process.argv[2];
  const baseUrl = deployed ?? `http://localhost:${WEB_PORT}`;
  const baseApi = deployed ? `${deployed}/api` : `http://localhost:${API_PORT}/api`;

  let browser: Browser | undefined;
  try {
    if (!deployed) {
      console.log(`\n  starting API on :${API_PORT} and web on :${WEB_PORT}...`);
      launch("api", "npx", ["tsx", "server/index.ts"], ROOT, {
        PORT: String(API_PORT),
        // The default allowlist covers :5173/:5174 only; this test runs on its
        // own port, so it has to be allowed explicitly rather than bypassed.
        CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
      });
      launch("web", "npx", ["vite", "--port", String(WEB_PORT), "--strictPort"], path.join(ROOT, "client"), {
        VITE_API_BASE: `http://localhost:${API_PORT}/api`,
      });
      await waitForHttp(`${baseApi}/health`, "api");
      await waitForHttp(`${baseUrl}/`, "web");
    } else {
      console.log(`\n  running against ${deployed}`);
      await waitForHttp(`${baseApi}/health`, "api", 20);
    }

    browser = await chromium.launch();
    const page = await browser.newPage();
    await withBypass(page);
    page.on("console", (m) => {
      if (m.type() === "error") console.log(`      [browser] ${m.text().slice(0, 160)}`);
    });

    const captured = await runBrowserFlow(page, baseUrl);
    await runApiChecks(baseApi, captured);
    await runLayoutChecks(browser, baseUrl);
    await runScreenshotTour(browser, baseUrl);
  } finally {
    await browser?.close();
    stopAll();
  }

  console.log(
    `\n  ${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\n  e2e crashed:", error);
  stopAll();
  process.exit(1);
});
