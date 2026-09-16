/** GET /api/health — what the deployment is configured with. Never any secrets. */
import { isDemo } from "../services/openrouter";
import { analysisMode, modelChat, modelClassify, modelShop } from "../utils/config";
import { json, methodNotAllowed } from "./http";

export async function handleHealth(request: Request): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed("GET");
  return json({
    status: "ok",
    timestamp: new Date().toISOString(),
    provider: "openrouter",
    providerConfigured: !isDemo(),
    analysisMode: analysisMode(),
    models: { classify: modelClassify(), chat: modelChat(), shop: modelShop() },
    stateless: true,
  });
}
