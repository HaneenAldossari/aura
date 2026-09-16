import { describe, expect, it, vi, afterEach } from "vitest";
import { handleCelebrityImage } from "../server/handlers/celebrityImage";

const get = (path: string) =>
  handleCelebrityImage(new Request(`https://example.test${path}`));

afterEach(() => vi.unstubAllGlobals());

function wikiReply(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, json: async () => body } as unknown as Response)
  );
}

describe("celebrity image lookup", () => {
  it("returns the Wikipedia thumbnail", async () => {
    wikiReply({ thumbnail: { source: "https://example.test/a.jpg" } });
    const res = await get("/api/celebrity-image/Halle%20Berry");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://example.test/a.jpg" });
  });

  it("falls back to the full-size image", async () => {
    wikiReply({ originalimage: { source: "https://example.test/b.jpg" } });
    expect(((await (await get("/api/celebrity-image/X")).json()) as any).url).toBe(
      "https://example.test/b.jpg"
    );
  });

  it("404s when the page exists but has no image", async () => {
    wikiReply({});
    expect((await get("/api/celebrity-image/Nobody")).status).toBe(404);
  });

  it("404s when there is no page", async () => {
    wikiReply({}, false);
    expect((await get("/api/celebrity-image/Nobody")).status).toBe(404);
  });

  /**
   * Serverless has no shared memory, so the in-memory cache the Express route
   * used is replaced by CDN caching. Misses are cached too: a name with no
   * Wikipedia page will not gain one during a deployment's life.
   */
  it("sets CDN cache headers on both hits and misses", async () => {
    wikiReply({ thumbnail: { source: "https://example.test/a.jpg" } });
    expect((await get("/api/celebrity-image/A")).headers.get("cache-control")).toMatch(/s-maxage/);
    wikiReply({}, false);
    expect((await get("/api/celebrity-image/B")).headers.get("cache-control")).toMatch(/s-maxage/);
  });

  it("rejects names that are not names", async () => {
    const calls = vi.fn();
    vi.stubGlobal("fetch", calls);
    for (const bad of ["", "%2E%2E%2Fetc", "a".repeat(200), "<script>", "1234"]) {
      expect((await get(`/api/celebrity-image/${bad}`)).status, bad).toBe(400);
    }
    // Nothing invalid should ever reach Wikipedia.
    expect(calls).not.toHaveBeenCalled();
  });

  it("accepts real names with accents, hyphens and apostrophes", async () => {
    wikiReply({ thumbnail: { source: "https://example.test/a.jpg" } });
    for (const good of ["Penélope Cruz", "Lupita Nyong'o", "Zendaya", "Daniel Day-Lewis"]) {
      expect((await get(`/api/celebrity-image/${encodeURIComponent(good)}`)).status, good).toBe(200);
    }
  });

  it("only answers GET", async () => {
    const res = await handleCelebrityImage(
      new Request("https://example.test/api/celebrity-image/X", { method: "POST" })
    );
    expect(res.status).toBe(405);
  });
});
