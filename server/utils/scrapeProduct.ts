import puppeteer, { Browser } from "puppeteer";

// Singleton browser instance — reuse across requests
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--lang=en-US",
      ],
    });
  }
  return browser;
}

export interface ScrapeResult {
  success: boolean;
  productName?: string;
  colorName?: string;
  colorHex?: string;
  pageText?: string;
  error?: string;
}

export async function scrapeProductPage(url: string): Promise<ScrapeResult> {
  let page = null;

  try {
    const b = await getBrowser();
    page = await b.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });

    // Force English version of Arabic URLs (e.g. Zara /sa/ar/ → /sa/en/)
    const englishUrl = url
      .replace("/sa/ar/", "/sa/en/")
      .replace("/ar/", "/en/");

    await page.goto(englishUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Wait for JS to render product details
    await new Promise(r => setTimeout(r, 2500));

    // Try to wait for product color element
    try {
      await page.waitForSelector(
        '[class*="color"], [class*="colour"], [data-color], [class*="swatch"]',
        { timeout: 3000 }
      );
    } catch {
      // Not found — continue anyway
    }

    const data = await page.evaluate(() => {
      const getText = (selectors: string[]): string => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) return el.textContent.trim();
        }
        return "";
      };

      // Product name
      const productName = getText([
        "h1",
        '[class*="product-name"]',
        '[class*="productName"]',
        '[class*="product_name"]',
        '[data-testid*="name"]',
      ]);

      // Color name
      let colorName = getText([
        '[class*="color-name"]',
        '[class*="colorName"]',
        '[class*="colour-name"]',
        '[class*="selected-color"]',
        '[class*="color"] span',
        '[class*="swatch"][aria-selected="true"]',
        '[data-color]',
        '[class*="color-label"]',
      ]);

      // Try aria-label on selected color swatch
      if (!colorName) {
        const selectedSwatch = document.querySelector(
          '[class*="swatch"][aria-checked="true"], ' +
          '[class*="color"][aria-selected="true"], ' +
          '[class*="color-option"].selected, ' +
          '[class*="color-option"][aria-pressed="true"]'
        );
        if (selectedSwatch) {
          colorName =
            selectedSwatch.getAttribute("aria-label") ||
            selectedSwatch.getAttribute("title") ||
            selectedSwatch.textContent?.trim() || "";
        }
      }

      // Get background color of selected swatch
      let swatchHex = "";
      const swatchEl = document.querySelector(
        '[class*="swatch"][aria-selected="true"], ' +
        '[class*="color-swatch"].selected, ' +
        '[class*="colorSwatch"][aria-pressed="true"]'
      );
      if (swatchEl) {
        const bg = window.getComputedStyle(swatchEl).backgroundColor;
        const match = bg.match(/\d+/g);
        if (match && match.length >= 3) {
          const [r, g, b] = match.map(Number);
          swatchHex = "#" + [r, g, b]
            .map(n => n.toString(16).padStart(2, "0"))
            .join("");
        }
      }

      // Fallback: grab visible text for AI to analyze
      const bodyText = document.body.innerText
        .slice(0, 3000)
        .replace(/\s+/g, " ")
        .trim();

      return { productName, colorName, swatchHex, bodyText };
    });

    await page.close();

    return {
      success: true,
      productName: data.productName || "Product",
      colorName: data.colorName || "",
      colorHex: data.swatchHex || "",
      pageText: data.bodyText,
    };

  } catch (error: any) {
    if (page) {
      try { await page.close(); } catch {}
    }
    return {
      success: false,
      error: error.message ?? "Scraping failed",
    };
  }
}

// Graceful shutdown
process.on("exit", () => {
  if (browser) browser.close().catch(() => {});
});
