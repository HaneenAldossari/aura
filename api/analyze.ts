/**
 * Vercel Function wrapper. All logic lives in server/handlers/ so the local
 * Express server and this deployment run the same code.
 */
import { handleAnalyze } from "../server/handlers/analyze";
import { withDailyLimit } from "../server/utils/rateLimit";

export default { fetch: withDailyLimit("analyze", handleAnalyze) };
