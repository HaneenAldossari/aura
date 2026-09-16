/**
 * Vercel Function wrapper. All logic lives in server/handlers/ so the local
 * Express server and this deployment run the same code.
 */
import { handleHealth } from "../server/handlers/health";

export default { fetch: handleHealth };
