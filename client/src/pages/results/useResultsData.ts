import { useEffect, useState } from "react";
import { getCelebrityImage } from "../../lib/api";
import { loadResult } from "../../lib/resultStore";
import type { AnalysisResult } from "../../lib/types";

/**
 * Reads the analysis the browser is holding and, in the background, resolves
 * celebrity photos.
 *
 * The API is stateless: nothing is fetched back. The id in the URL is a local
 * key into resultStore, which is why a link to a results page only opens on the
 * device that produced it.
 */
export function useResultsData(sessionId: string | undefined) {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebPhotos, setCelebPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sessionId) return;
    // Reset to avoid flashing the previous sample's data while the new one loads
    setData(null);
    setLoading(true);
    setData(loadResult(sessionId));
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    if (!data) return;
    const celebrities = data.celebrities;
    if (!celebrities) return;

    celebrities.forEach(async (celeb) => {
      const url = await getCelebrityImage(celeb.name);
      if (url) {
        setCelebPhotos((prev) => ({ ...prev, [celeb.name]: url }));
      }
      // No image → card falls back to initials
    });
  }, [data]);

  return { data, loading, celebPhotos };
}
