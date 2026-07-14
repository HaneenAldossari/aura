import { Router, Request, Response } from "express";

const router = Router();

// In-memory caches
const wikiImageCache: Record<string, string | null> = {};
const essieImageCache: Record<string, Buffer | null> = {};

// GET /api/celebrity-image/:name — fetch celebrity photo from Wikipedia
router.get(
  "/celebrity-image/:name",
  async (req: Request, res: Response): Promise<void> => {
    const name = req.params.name as string;

    if (wikiImageCache[name] !== undefined) {
      if (wikiImageCache[name]) {
        res.json({ url: wikiImageCache[name] });
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
        wikiImageCache[name] = null;
        res.status(404).json({ error: "Wikipedia page not found" });
        return;
      }

      const data = await response.json();
      const imageUrl = data.thumbnail?.source || data.originalimage?.source || null;

      wikiImageCache[name] = imageUrl;

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

// GET /api/essie-image/:slug — fetch real Essie product image
router.get(
  "/essie-image/:slug",
  async (req: Request, res: Response): Promise<void> => {
    const slug = req.params.slug as string;

    // Return cached image if available
    if (essieImageCache[slug] !== undefined) {
      if (essieImageCache[slug]) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=604800");
        res.send(essieImageCache[slug]);
      } else {
        res.status(404).json({ error: "Image not found" });
      }
      return;
    }

    try {
      // Try fetching the Essie product page and extracting the product image
      const productUrl = `https://www.essie.com/nail-polish/enamel/${slug}`;
      const pageResponse = await fetch(productUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
      });

      if (pageResponse.ok) {
        const html = await pageResponse.text();

        // Try to extract og:image or product image from HTML
        let imageUrl: string | null = null;

        // Look for og:image
        const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
          || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
        if (ogMatch) {
          imageUrl = ogMatch[1];
        }

        // Look for product image in JSON-LD
        if (!imageUrl) {
          const jsonLdMatch = html.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
          if (jsonLdMatch) {
            try {
              const jsonLd = JSON.parse(jsonLdMatch[1]);
              if (jsonLd.image) {
                imageUrl = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
              }
            } catch {}
          }
        }

        // Look for any essie product image in the HTML
        if (!imageUrl) {
          const imgMatch = html.match(/src="(https?:\/\/[^"]*essie[^"]*(?:nail|enamel|polish)[^"]*\.(?:jpg|png|webp))"/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }

        if (imageUrl) {
          // Make URL absolute if relative
          if (imageUrl.startsWith("/")) {
            imageUrl = `https://www.essie.com${imageUrl}`;
          }

          // Fetch the actual image
          const imgResponse = await fetch(imageUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
              "Accept": "image/*",
              "Referer": "https://www.essie.com/",
            },
          });

          if (imgResponse.ok) {
            const buffer = Buffer.from(await imgResponse.arrayBuffer());
            essieImageCache[slug] = buffer;
            res.setHeader("Content-Type", imgResponse.headers.get("content-type") || "image/jpeg");
            res.setHeader("Cache-Control", "public, max-age=604800");
            res.send(buffer);
            return;
          }
        }
      }

      // Try direct CDN patterns as fallback
      const cdnPatterns = [
        `https://www.essie.com/-/media/Project/Loreal/Brand-Sites/Essie/Master/Collections/Nail-Polish/${slug}/essie-enamel-${slug}-background.jpg`,
        `https://www.essie.com/-/media/Project/Loreal/Brand-Sites/Essie/Master/Collections/Nail-Polish/${slug}/essie-enamel-${slug}-background.png`,
      ];

      for (const cdnUrl of cdnPatterns) {
        try {
          const cdnResponse = await fetch(cdnUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
              "Accept": "image/*",
              "Referer": "https://www.essie.com/",
            },
          });

          if (cdnResponse.ok) {
            const buffer = Buffer.from(await cdnResponse.arrayBuffer());
            if (buffer.length > 1000) { // Make sure it's not an error page
              essieImageCache[slug] = buffer;
              res.setHeader("Content-Type", cdnResponse.headers.get("content-type") || "image/jpeg");
              res.setHeader("Cache-Control", "public, max-age=604800");
              res.send(buffer);
              return;
            }
          }
        } catch {}
      }

      // Nothing worked
      essieImageCache[slug] = null;
      res.status(404).json({ error: "Essie image not found" });
    } catch (err) {
      console.error("Essie image fetch error:", err);
      essieImageCache[slug] = null;
      res.status(404).json({ error: "Failed to fetch Essie image" });
    }
  }
);

// GET /api/image-proxy — proxy any image URL to bypass CORS
router.get(
  "/image-proxy",
  async (req: Request, res: Response): Promise<void> => {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ error: "URL parameter required" });
      return;
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "image/*",
        },
      });

      if (!response.ok) {
        res.status(response.status).json({ error: "Failed to fetch image" });
        return;
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");

      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (err) {
      console.error("Image proxy error:", err);
      res.status(500).json({ error: "Failed to proxy image" });
    }
  }
);

export default router;
