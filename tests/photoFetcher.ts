export async function fetchCelebrityPhoto(testCase: {
  name: string;
  searchQuery: string;
  wikipediaName: string;
}): Promise<string | null> {
  // Wikipedia portrait — deterministic source, so benchmark runs are comparable.
  // Use originalimage (full-res) — thumbnails only exist at specific widths,
  // and the analysis pipeline downscales anyway.
  try {
    const wikiApiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${testCase.wikipediaName}`;
    const response = await fetch(wikiApiUrl);
    if (response.ok) {
      const data = (await response.json()) as {
        originalimage?: { source?: string };
        thumbnail?: { source?: string };
      };
      const url = data.originalimage?.source || data.thumbnail?.source;
      if (url) {
        console.log(`  Wikipedia photo for ${testCase.name}: ${url.substring(0, 80)}...`);
        return url;
      }
    }
  } catch {
    console.log(`  Wikipedia fetch failed for ${testCase.name}`);
  }

  console.log(`  Could not find photo for ${testCase.name}`);
  return null;
}

export async function downloadPhotoAsBase64(
  url: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.includes("png") ? "image/png" : "image/jpeg";
    const buffer = await response.arrayBuffer();

    // Skip if too small (likely a placeholder/error image)
    if (buffer.byteLength < 5000) return null;

    const base64 = Buffer.from(buffer).toString("base64");
    return { data: base64, mimeType };
  } catch {
    return null;
  }
}
