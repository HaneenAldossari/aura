import { useEffect, useState } from "react";
import { loadResult } from "../../lib/resultStore";
import type { AnalysisResult } from "../../lib/types";

/**
 * Reads the analysis the browser is holding.
 *
 * The API is stateless: nothing is fetched back. The id in the URL is a local
 * key into resultStore, which is why a link to a results page only opens on the
 * device that produced it.
 *
 * This used to resolve celebrity photos in the background too. The editorial
 * Results has no celebrity section, so those requests fetched images nothing
 * rendered — two per page load, and a 400 for any name with brackets in it.
 */
export function useResultsData(sessionId: string | undefined) {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    // Reset first, so the previous sample's result does not flash while the
    // new one loads.
    setData(null);
    setLoading(true);
    setData(loadResult(sessionId));
    setLoading(false);
  }, [sessionId]);

  return { data, loading };
}
