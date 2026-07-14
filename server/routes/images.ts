import { Router, Request, Response } from "express";

const router = Router();

// In-memory cache (bounded — celebrity list is small and repeated)
const wikiImageCache = new Map<string, string | null>();
const WIKI_CACHE_MAX = 500;

// GET /api/celebrity-image/:name — fetch celebrity photo from Wikipedia
router.get(
  "/celebrity-image/:name",
  async (req: Request, res: Response): Promise<void> => {
    const name = req.params.name as string;

    if (wikiImageCache.has(name)) {
      const cached = wikiImageCache.get(name);
      if (cached) {
        res.json({ url: cached });
      } else {
        res.status(404).json({ error: "No image found" });
      }
      return;
    }

    try {
      const encoded = encodeURIComponent(name.replace(/ /g, "_"));
      const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const response = await fetch(apiUrl, {
        headers: { "User-Agent": "ColorAnalysisApp/1.0" },
      });

      if (!response.ok) {
        cacheWikiImage(name, null);
        res.status(404).json({ error: "Wikipedia page not found" });
        return;
      }

      const data = (await response.json()) as {
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
      };
      const imageUrl = data.thumbnail?.source || data.originalimage?.source || null;

      cacheWikiImage(name, imageUrl);

      if (imageUrl) {
        res.json({ url: imageUrl });
      } else {
        res.status(404).json({ error: "No image found" });
      }
    } catch (err) {
      console.error("Wikipedia image fetch error:", err);
      res.status(500).json({ error: "Failed to fetch image" });
    }
  }
);

function cacheWikiImage(name: string, url: string | null): void {
  // Simple FIFO eviction — enough to bound memory
  if (wikiImageCache.size >= WIKI_CACHE_MAX) {
    const oldest = wikiImageCache.keys().next().value;
    if (oldest !== undefined) wikiImageCache.delete(oldest);
  }
  wikiImageCache.set(name, url);
}

export default router;
