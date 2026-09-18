/**
 * Scoring a run.
 *
 * Top-1 alone hides the two failures that matter most here. A Soft Autumn
 * called Soft Summer is a hue miss on an otherwise correct read; a Soft Autumn
 * called Bright Winter is wrong on every axis. Both cost one point. So per-axis
 * accuracy is reported alongside, and the confusion matrix shows which pairs
 * actually blur.
 *
 * Per skin-lightness band is reported for a reason recorded in CLAUDE.md:
 * melanin raises b*, inflating both hue angle and chroma, so a bias against deep
 * skin is entirely possible — and it would be invisible inside a single mean.
 */

import {
  SEASON_PROFILES,
  SEASONS,
  flowNeighbours,
  type Axis,
  type Season,
} from "../measure/seasons.config";
import type { SkinBand } from "../measure/score";

export interface Prediction {
  file: string;
  expected: Season;
  predicted: Season | null;
  /** The runner-up, where the mode produces one. */
  secondary: Season | null;
  skinBand: SkinBand | null;
  confidence: number | null;
  /** Whether the model agreed with the rule-based ranking (hybrid only). */
  agreement: "primary" | "secondary" | "none" | null;
  latencyMs: number;
  costUsd: number;
  error?: string;
}

export interface AxisAccuracy {
  hue: number;
  value: number;
  chroma: number;
}

export interface Metrics {
  n: number;
  errors: number;
  top1: number;
  top2: number;
  axes: AxisAccuracy;
  byBand: Record<SkinBand, { n: number; top1: number }>;
  /** expected -> predicted -> count. */
  confusion: Record<string, Record<string, number>>;
  /** The pairs that blur most, biggest first. */
  topConfusions: { expected: Season; predicted: Season; count: number }[];
  agreement: { primary: number; secondary: number; none: number; n: number } | null;
  meanConfidenceCorrect: number | null;
  meanConfidenceWrong: number | null;
  latency: { meanMs: number; p50Ms: number; maxMs: number };
  cost: { totalUsd: number; perAnalysisUsd: number };
}

const AXES: Axis[] = ["hue", "value", "chroma"];

/** Which side of each axis a season sits on. Two seasons agreeing on an axis
 *  means the classifier read that axis correctly even if it named the wrong season. */
function axisSign(season: Season, axis: Axis): number {
  return Math.sign(SEASON_PROFILES[season].target[axis]);
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

export function computeMetrics(predictions: Prediction[]): Metrics {
  const usable = predictions.filter((p) => p.predicted !== null);
  const errors = predictions.length - usable.length;

  const correct = usable.filter((p) => p.predicted === p.expected);

  // Top-2: the expected season is the prediction, or the prediction's own
  // runner-up, or a flow-circle neighbour of it. Landing next door on the circle
  // is a near miss in the sense that matters.
  const top2 = usable.filter((p) => {
    if (p.predicted === p.expected) return true;
    if (p.secondary === p.expected) return true;
    return flowNeighbours(p.predicted!).includes(p.expected);
  });

  const axes: AxisAccuracy = { hue: 0, value: 0, chroma: 0 };
  for (const axis of AXES) {
    const hits = usable.filter((p) => axisSign(p.predicted!, axis) === axisSign(p.expected, axis));
    axes[axis] = usable.length === 0 ? 0 : hits.length / usable.length;
  }

  const byBand = { light: { n: 0, top1: 0 }, medium: { n: 0, top1: 0 }, deep: { n: 0, top1: 0 } };
  for (const band of ["light", "medium", "deep"] as SkinBand[]) {
    const inBand = usable.filter((p) => p.skinBand === band);
    byBand[band] = {
      n: inBand.length,
      top1: inBand.length === 0 ? 0 : inBand.filter((p) => p.predicted === p.expected).length / inBand.length,
    };
  }

  const confusion: Record<string, Record<string, number>> = {};
  for (const expected of SEASONS) {
    confusion[expected] = {};
    for (const predicted of SEASONS) confusion[expected][predicted] = 0;
  }
  for (const p of usable) confusion[p.expected][p.predicted!]++;

  const topConfusions = usable
    .filter((p) => p.predicted !== p.expected)
    .reduce<Record<string, number>>((acc, p) => {
      const key = `${p.expected}|${p.predicted}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  const ranked = Object.entries(topConfusions)
    .map(([key, count]) => {
      const [expected, predicted] = key.split("|") as [Season, Season];
      return { expected, predicted, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const withAgreement = usable.filter((p) => p.agreement !== null);
  const agreement =
    withAgreement.length === 0
      ? null
      : {
          n: withAgreement.length,
          primary: withAgreement.filter((p) => p.agreement === "primary").length / withAgreement.length,
          secondary: withAgreement.filter((p) => p.agreement === "secondary").length / withAgreement.length,
          none: withAgreement.filter((p) => p.agreement === "none").length / withAgreement.length,
        };

  const confOf = (rows: Prediction[]) => {
    const values = rows.map((p) => p.confidence).filter((c): c is number => c !== null);
    return values.length === 0 ? null : mean(values);
  };

  const latencies = predictions.map((p) => p.latencyMs);
  const totalCost = predictions.reduce((sum, p) => sum + p.costUsd, 0);

  return {
    n: predictions.length,
    errors,
    top1: usable.length === 0 ? 0 : correct.length / usable.length,
    top2: usable.length === 0 ? 0 : top2.length / usable.length,
    axes,
    byBand,
    confusion,
    topConfusions: ranked,
    agreement,
    meanConfidenceCorrect: confOf(correct),
    meanConfidenceWrong: confOf(usable.filter((p) => p.predicted !== p.expected)),
    latency: {
      meanMs: mean(latencies),
      p50Ms: percentile(latencies, 0.5),
      maxMs: latencies.length === 0 ? 0 : Math.max(...latencies),
    },
    cost: {
      totalUsd: totalCost,
      perAnalysisUsd: predictions.length === 0 ? 0 : totalCost / predictions.length,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function renderMetrics(label: string, m: Metrics): string {
  const lines: string[] = [];
  lines.push(`  ${label}`);
  lines.push(`  ${"─".repeat(72)}`);

  if (m.n === 0) {
    lines.push("    no rows");
    return lines.join("\n");
  }

  lines.push(
    `    top-1 ${pct(m.top1).padStart(6)}   top-2 ${pct(m.top2).padStart(6)}` +
      `   n=${m.n}${m.errors ? `  (${m.errors} failed)` : ""}`
  );
  lines.push(
    `    per-axis   hue ${pct(m.axes.hue).padStart(6)}` +
      `   value ${pct(m.axes.value).padStart(6)}` +
      `   chroma ${pct(m.axes.chroma).padStart(6)}`
  );

  const band = (name: SkinBand) => {
    const b = m.byBand[name];
    return b.n === 0 ? `${name} —` : `${name} ${pct(b.top1)} (n=${b.n})`;
  };
  lines.push(`    by skin band   ${band("light")}   ${band("medium")}   ${band("deep")}`);

  if (m.agreement) {
    lines.push(
      `    model vs rules   primary ${pct(m.agreement.primary)}` +
        `   secondary ${pct(m.agreement.secondary)}` +
        `   disagree ${pct(m.agreement.none)}`
    );
  }
  if (m.meanConfidenceCorrect !== null || m.meanConfidenceWrong !== null) {
    const c = m.meanConfidenceCorrect?.toFixed(1) ?? "—";
    const w = m.meanConfidenceWrong?.toFixed(1) ?? "—";
    lines.push(`    mean confidence   correct ${c}   wrong ${w}`);
  }
  lines.push(
    `    latency  mean ${(m.latency.meanMs / 1000).toFixed(1)}s` +
      `  p50 ${(m.latency.p50Ms / 1000).toFixed(1)}s` +
      `  max ${(m.latency.maxMs / 1000).toFixed(1)}s`
  );
  lines.push(
    `    cost     $${m.cost.totalUsd.toFixed(4)} total` +
      `   $${m.cost.perAnalysisUsd.toFixed(4)} per analysis`
  );

  if (m.topConfusions.length > 0) {
    lines.push(`    most confused:`);
    for (const c of m.topConfusions) {
      lines.push(`      ${c.expected} → ${c.predicted}  ×${c.count}`);
    }
  }
  return lines.join("\n");
}

/** Full 12x12 grid. Only worth printing when there is enough data to fill it. */
export function renderConfusion(m: Metrics): string {
  const short = (s: Season) =>
    s.split(" ").map((w) => w[0]).join("") + s.split(" ")[1][0].toLowerCase();
  const lines: string[] = [];
  lines.push(`    ${"expected \\ predicted".padEnd(16)}${SEASONS.map((s) => short(s).padStart(5)).join("")}`);
  for (const expected of SEASONS) {
    const row = SEASONS.map((p) => {
      const n = m.confusion[expected][p];
      return (n === 0 ? "·" : String(n)).padStart(5);
    }).join("");
    lines.push(`    ${expected.padEnd(16)}${row}`);
  }
  return lines.join("\n");
}
