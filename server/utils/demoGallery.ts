/**
 * Which demo faces the sample gallery may show.
 *
 * A demo face is a promise about what the product does. One that comes back
 * at 50% — the cap applied when the model and the measurement disagree — is
 * the product demonstrating a disagreement, on a face that is AI-generated
 * and graded rather than photographed, so the disagreement is the fixture's
 * and not anybody's colouring. It should not be the first result a visitor
 * sees. A face is shown only when its precomputed analysis clears this
 * confidence, which in practice also means the model and the rules agreed.
 *
 * One constant, read in two places that must agree: the API filters the list
 * it serves, and `scripts/precomputeDemoAnalyses.ts` writes
 * `server/demo-analyses/gallery.json` — the same ids — for the client's
 * instant static list. A test holds the manifest to the files.
 */
import fs from "fs";
import path from "path";

/** Below this the face is not offered. estimate — the user asked for 85. */
export const DEMO_MIN_CONFIDENCE = 85;

export const DEMO_DIR = path.join(__dirname, "../demo-analyses");
export const GALLERY_MANIFEST = path.join(DEMO_DIR, "gallery.json");

export interface GalleryManifest {
  minConfidence: number;
  /** Ids in gallery order, all at or above minConfidence. */
  shown: string[];
  /** Ids on disk that did not make it, with the number that kept them out. */
  hidden: { id: string; confidence: number | null }[];
  writtenOn: string;
}

export function readDemoConfidence(id: string, dir = DEMO_DIR): number | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), "utf8")) as { confidence?: unknown };
    return typeof raw.confidence === "number" ? raw.confidence : null;
  } catch {
    return null;
  }
}

export function shownInGallery(confidence: number | null): boolean {
  return confidence !== null && confidence >= DEMO_MIN_CONFIDENCE;
}

export function demoIds(dir = DEMO_DIR): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^sample-\d+\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ""))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** The ids the gallery shows, from the files, in order. */
export function galleryIds(dir = DEMO_DIR): string[] {
  return demoIds(dir).filter((id) => shownInGallery(readDemoConfidence(id, dir)));
}

export function writeGalleryManifest(dir = DEMO_DIR): GalleryManifest {
  const ids = demoIds(dir);
  const manifest: GalleryManifest = {
    minConfidence: DEMO_MIN_CONFIDENCE,
    shown: ids.filter((id) => shownInGallery(readDemoConfidence(id, dir))),
    hidden: ids
      .filter((id) => !shownInGallery(readDemoConfidence(id, dir)))
      .map((id) => ({ id, confidence: readDemoConfidence(id, dir) })),
    writtenOn: new Date().toISOString().slice(0, 10),
  };
  fs.writeFileSync(path.join(dir, "gallery.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}
