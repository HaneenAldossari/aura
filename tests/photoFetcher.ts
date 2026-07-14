import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function fetchCelebrityPhoto(testCase: {
  name: string;
  searchQuery: string;
  wikipediaName: string;
}): Promise<string | null> {
  // Use Claude's web_search to find a natural daylight photo — skip Wikipedia event photos
  try {
    const client = getClient();
    const searchResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `I need a photo of ${testCase.name} in NATURAL DAYLIGHT — no red carpet, no studio lighting, no heavy makeup. Search for: "${testCase.name} no makeup natural light candid" or "${testCase.name} bare face daylight street".

Find a direct image URL (ending in .jpg, .jpeg, or .png) showing their face clearly in natural outdoor light. NO event photos, NO studio shoots, NO heavy makeup looks. Paparazzi/street style/casual photos are ideal.

Return ONLY the direct image URL, nothing else.`,
        },
      ],
    });

    const textContent = searchResponse.content.find((b) => b.type === "text");
    if (textContent && textContent.type === "text") {
      const urlMatch = textContent.text.match(
        /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png)/i
      );
      if (urlMatch) {
        console.log(
          `  Found natural light photo for ${testCase.name}: ${urlMatch[0].substring(0, 80)}...`
        );
        return urlMatch[0];
      }
    }
  } catch {
    console.log(`  Web search failed for ${testCase.name}`);
  }

  // Fallback: Wikipedia (better than nothing)
  try {
    const wikiApiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${testCase.wikipediaName}`;
    const response = await fetch(wikiApiUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.thumbnail?.source) {
        const highRes = data.thumbnail.source.replace(/\/\d+px-/, "/400px-");
        console.log(
          `  Fallback to Wikipedia for ${testCase.name}: ${highRes.substring(0, 80)}...`
        );
        return highRes;
      }
    }
  } catch {
    console.log(`  Wikipedia also failed for ${testCase.name}`);
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
