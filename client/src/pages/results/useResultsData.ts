import { useEffect, useState } from "react";
import { getResults, getCelebrityImage } from "../../lib/api";
import type { AnalysisResult } from "../../lib/types";

/**
 * Loads the analysis result for a session and (in the background) resolves
 * celebrity photos for the returned celebrity list.
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
    getResults(sessionId)
      .then((r) => { setData(r); setLoading(false); })
      .catch(() => { setLoading(false); });
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
