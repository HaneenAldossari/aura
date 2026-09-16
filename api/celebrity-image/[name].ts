/**
 * Vercel Function wrapper. Dynamic segment: /api/celebrity-image/<name>.
 * All logic lives in server/handlers/ so local dev and production share it.
 */
import { handleCelebrityImage } from "../../server/handlers/celebrityImage";

export default { fetch: handleCelebrityImage };
