/**
 * GET /api/health — is this deployment able to do its job?
 *
 * "The function responds" is not the question a monitor should be asking. The
 * ways this app actually breaks are quieter: OpenRouter retires a model slug
 * and every analysis 404s; the balance runs out and every analysis 402s; the
 * key is missing from a new environment. So health asks OpenRouter whether the
 * configured models still exist and what credit is left, and says so.
 *
 *   status "ok"        everything checked out                         HTTP 200
 *   status "degraded"  it works today and will not for long:
 *                      balance under the alert threshold              HTTP 200
 *   status "down"      analyses will fail now: no key, or a configured
 *                      model is no longer listed                      HTTP 503
 *
 * A check that could not be made (OpenRouter unreachable, a key that may not
 * read credits) is reported as unknown and never as a failure: a monitor that
 * pages because a third party's status endpoint blinked teaches its owner to
 * ignore it. Point an uptime monitor at this URL with the keyword `"status":"ok"`.
 *
 * Never any secrets. The balance is the one sensitive-ish number here; it is
 * rounded to the dollar, which is all an alert needs.
 */
import { accountStatus, isDemo } from "../services/openrouter";
import { analysisMode, balanceAlertUsd, fallbackModel, modelChat, modelClassify, modelShop } from "../utils/config";
import { rateLimitStatus } from "../utils/rateLimit";
import { json, methodNotAllowed } from "./http";

export async function handleHealth(request: Request): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed("GET");

  const configured = { classify: modelClassify(), chat: modelChat(), shop: modelShop() };
  const fallback = fallbackModel();
  const slugs = [...new Set([...Object.values(configured), ...(fallback ? [fallback] : [])])];
  const account = await accountStatus(slugs);

  // Only the three task models can take the app down; a missing fallback only
  // removes a safety net, which is a warning.
  const retired = Object.values(configured).filter((slug) => account.models[slug] === false);
  const threshold = balanceAlertUsd();
  const lowBalance = account.balanceUsd !== null && account.balanceUsd < threshold;
  const problems = [
    ...(isDemo() ? ["OPENROUTER_API_KEY is not set"] : []),
    ...[...new Set(retired)].map((slug) => `model no longer listed on OpenRouter: ${slug}`),
  ];
  const warnings = [
    ...(lowBalance ? [`OpenRouter balance is under $${threshold}`] : []),
    ...(fallback && account.models[fallback] === false ? [`fallback model no longer listed: ${fallback}`] : []),
    ...(Object.values(account.models).some((v) => v === null) ? ["could not verify model IDs with OpenRouter"] : []),
  ];
  const status = problems.length ? "down" : lowBalance ? "degraded" : "ok";

  return json(
    {
      status,
      timestamp: new Date().toISOString(),
      provider: "openrouter",
      providerConfigured: !isDemo(),
      analysisMode: analysisMode(),
      models: configured,
      modelsResolve: account.models,
      balance: {
        usd: account.balanceUsd === null ? null : Math.floor(account.balanceUsd),
        alertBelowUsd: threshold,
        low: account.balanceUsd === null ? null : lowBalance,
      },
      rateLimit: rateLimitStatus(),
      problems,
      warnings,
      accountCheckedAt: account.checkedAt,
      stateless: true,
    },
    status === "down" ? 503 : 200
  );
}
