/**
 * The labelled dataset, and the rule that keeps it honest.
 *
 * Two directories, never mixed:
 *
 *   eval/synthetic/  AI-generated faces. Pipeline smoke tests only, excluded
 *                    from every accuracy metric. A generated face has no
 *                    ground-truth colouring — scoring a classifier against one
 *                    measures agreement between two models, not correctness,
 *                    and would inflate the headline while hiding regressions.
 *
 *   eval/real/       Labelled real photos. The ONLY source of the reported
 *                    accuracy number.
 *
 * A row counts toward the headline figure only when `dataset` is "real" AND
 * `source` is not "consensus". Consensus labels are machine-agreed, so treating
 * them as ground truth would be the same circularity one level up.
 */

import fs from "fs";
import path from "path";
import { SEASONS, type Season } from "../measure/seasons.config";

export const EVAL_DIR = path.resolve(__dirname);
export const LABELS_PATH = path.join(EVAL_DIR, "labels.csv");

export type DatasetKind = "real" | "synthetic";
export type LabelSource = "manual" | "consensus" | "provisional";

export interface LabelRow {
  /** Path relative to eval/, e.g. "synthetic/sample-1.webp". */
  file: string;
  season: Season | "";
  dataset: DatasetKind;
  source: LabelSource;
  notes: string;
}

export const CSV_HEADER = "file,season,dataset,source,notes";

/** Only these rows may produce an accuracy number. */
export function countsTowardAccuracy(row: LabelRow): boolean {
  return row.dataset === "real" && row.source !== "consensus" && row.season !== "";
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function readLabels(file = LABELS_PATH): LabelRow[] {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const index = (name: string) => header.indexOf(name);

  const rows: LabelRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const at = (name: string) => (index(name) >= 0 ? (cells[index(name)] ?? "").trim() : "");

    const seasonRaw = at("season");
    const season = SEASONS.find((s) => s.toLowerCase() === seasonRaw.toLowerCase());
    if (seasonRaw && !season) {
      throw new Error(`labels.csv: "${seasonRaw}" is not one of the 12 seasons (file ${at("file")})`);
    }

    const dataset = at("dataset") === "synthetic" ? "synthetic" : "real";
    const sourceRaw = at("source");
    const source: LabelSource =
      sourceRaw === "consensus" ? "consensus" : sourceRaw === "provisional" ? "provisional" : "manual";

    rows.push({ file: at("file"), season: season ?? "", dataset, source, notes: at("notes") });
  }
  return rows;
}

export function writeLabels(rows: LabelRow[], file = LABELS_PATH): void {
  const body = rows
    .map((r) => [r.file, r.season, r.dataset, r.source, r.notes].map(csvEscape).join(","))
    .join("\n");
  fs.writeFileSync(file, `${CSV_HEADER}\n${body}\n`);
}

/** Absolute path to a row's image. */
export function imagePath(row: LabelRow): string {
  return path.join(EVAL_DIR, row.file);
}

export interface DatasetSummary {
  total: number;
  real: number;
  synthetic: number;
  scored: number;
  consensus: number;
  unlabelled: number;
  missingFiles: string[];
}

export function summarise(rows: LabelRow[]): DatasetSummary {
  return {
    total: rows.length,
    real: rows.filter((r) => r.dataset === "real").length,
    synthetic: rows.filter((r) => r.dataset === "synthetic").length,
    scored: rows.filter(countsTowardAccuracy).length,
    consensus: rows.filter((r) => r.source === "consensus").length,
    unlabelled: rows.filter((r) => r.season === "").length,
    missingFiles: rows.filter((r) => !fs.existsSync(imagePath(r))).map((r) => r.file),
  };
}

/** Everything in eval/inbox/ that has no label row yet. */
export function inboxFiles(): string[] {
  const dir = path.join(EVAL_DIR, "inbox");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => path.join("inbox", f));
}
