/**
 * Which step of a season's foundation ladder a depth reading lands on.
 *
 * One function because two screens ask: the Beauty tab marks the step, and
 * Home's Beauty card shows it. Computed twice, they would eventually disagree
 * about which swatch is "yours".
 */
export function foundationStep(depth: number | null | undefined, steps: number): number | null {
  if (typeof depth !== "number" || Number.isNaN(depth) || steps <= 0) return null;
  return Math.min(steps - 1, Math.max(0, Math.floor((depth / 100) * steps)));
}
