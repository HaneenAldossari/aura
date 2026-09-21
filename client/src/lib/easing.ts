/**
 * cubic-bezier(0.16, 1, 0.3, 1) — the one easing curve this app animates on.
 *
 * Needed in JS as well as CSS because the colour field interpolates its own
 * state per frame on a canvas, and a canvas has no transitions. Sharing the
 * curve is what keeps the field's focus easing identical to the CSS easing on
 * everything around it.
 *
 * Newton-Raphson with a bisection fallback: the curve is monotonic in x, so a
 * few iterations converge well inside a pixel, and the fallback covers the flat
 * region near t=1 where the derivative approaches zero.
 */

const X1 = 0.16;
const Y1 = 1;
const X2 = 0.3;
const Y2 = 1;

const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1;
const b = (a1: number, a2: number) => 3 * a2 - 6 * a1;
const c = (a1: number) => 3 * a1;

const curve = (t: number, a1: number, a2: number) =>
  ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;

const slope = (t: number, a1: number, a2: number) =>
  3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1);

function solveT(x: number): number {
  let t = x;
  for (let i = 0; i < 5; i++) {
    const d = slope(t, X1, X2);
    if (d === 0) break;
    t -= (curve(t, X1, X2) - x) / d;
  }
  if (t >= 0 && t <= 1) return t;

  let lo = 0;
  let hi = 1;
  let mid = x;
  for (let i = 0; i < 20; i++) {
    mid = (lo + hi) / 2;
    if (curve(mid, X1, X2) < x) lo = mid;
    else hi = mid;
  }
  return mid;
}

/** Eased progress for a linear 0-1 input. */
export function ease(progress: number): number {
  const x = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
  if (x === 0 || x === 1) return x;
  return curve(solveT(x), Y1, Y2);
}

/** The same curve as a CSS value, so both sides cannot drift apart. */
export const EASE_CSS = `cubic-bezier(${X1}, ${Y1}, ${X2}, ${Y2})`;
