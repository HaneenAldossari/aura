/**
 * Vercel Function wrapper. All logic lives in server/handlers/ so the local
 * Express server and this deployment run the same code.
 */
import { handleLinkCheckManual } from "../server/handlers/tools";
import { withDailyLimit } from "../server/utils/rateLimit";

export default { fetch: withDailyLimit("shop", handleLinkCheckManual) };
