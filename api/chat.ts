/**
 * Vercel Function wrapper. All logic lives in server/handlers/ so the local
 * Express server and this deployment run the same code.
 */
import { handleChat } from "../server/handlers/chat";

export default { fetch: handleChat };
