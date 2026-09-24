/**
 * The sample gallery shows no face whose demo analysis is under 85% confidence.
 *
 * A demo face at 50% — the cap applied when the model and the rules disagree —
 * is the product demonstrating a disagreement on a generated, colour-graded
 * image. The threshold lives in one place; the API filters by it live and the
 * precompute writes the same ids to gallery.json for the client's instant
 * list. These hold the three together.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  DEMO_DIR,
  DEMO_MIN_CONFIDENCE,
  demoIds,
  galleryIds,
  readDemoConfidence,
  shownInGallery,
} from "../server/utils/demoGallery";
import { handleDemoList, handleDemoLoad } from "../server/handlers/tools";

const manifest = JSON.parse(fs.readFileSync(path.join(DEMO_DIR, "gallery.json"), "utf8")) as {
  minConfidence: number;
  shown: string[];
  hidden: { id: string; confidence: number | null }[];
};

describe("the floor", () => {
  it("is 85", () => {
    expect(DEMO_MIN_CONFIDENCE).toBe(85);
    expect(shownInGallery(85)).toBe(true);
    expect(shownInGallery(84)).toBe(false);
    expect(shownInGallery(50)).toBe(false);
    expect(shownInGallery(null)).toBe(false);
  });
});

describe("the manifest matches the files", () => {
  it("was written with the same floor", () => {
    expect(manifest.minConfidence).toBe(DEMO_MIN_CONFIDENCE);
  });

  it("lists exactly the files at or above it, in order, and names the rest", () => {
    expect(manifest.shown).toEqual(galleryIds());
    expect(manifest.hidden.map((h) => h.id)).toEqual(demoIds().filter((id) => !manifest.shown.includes(id)));
    for (const id of manifest.shown) expect(readDemoConfidence(id)!, id).toBeGreaterThanOrEqual(DEMO_MIN_CONFIDENCE);
    for (const h of manifest.hidden) expect(h.confidence === null || h.confidence < DEMO_MIN_CONFIDENCE, h.id).toBe(true);
  });

  it("still has faces to show, and the first is the one Home and the demo check use", () => {
    expect(manifest.shown.length).toBeGreaterThan(0);
    expect(manifest.shown[0]).toBe("sample-1");
  });

  it("every shown face is one where the model and the rules agreed, and none is a capped 50", () => {
    // 85 is above the disagreement cap of 50, so clearing it also means the
    // model landed on the rules' first or flow-circle second choice.
    for (const id of manifest.shown) {
      const raw = JSON.parse(fs.readFileSync(path.join(DEMO_DIR, `${id}.json`), "utf8"));
      expect(["primary", "secondary"], id).toContain(raw.agreement?.level);
      expect(raw.agreement?.agrees, id).toBe(true);
    }
  });
});

describe("the API", () => {
  it("lists only the shown faces", async () => {
    const res = await handleDemoList(new Request("http://localhost/api/demo-list"));
    const { samples } = (await res.json()) as { samples: { id: string }[] };
    expect(samples.map((s) => s.id)).toEqual(manifest.shown);
  });

  it("refuses to load a hidden face, even by id", async () => {
    for (const { id } of manifest.hidden) {
      const res = await handleDemoLoad(
        new Request("http://localhost/api/demo-load", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sampleId: id }),
        })
      );
      expect(res.status, id).toBe(404);
    }
  });

  it("the client's instant list reads the same manifest", () => {
    const analysis = fs.readFileSync(path.join(__dirname, "../client/src/pages/Analysis.tsx"), "utf8");
    expect(analysis).toMatch(/import gallery from "\.\.\/\.\.\/\.\.\/server\/demo-analyses\/gallery\.json"/);
    expect(analysis).toMatch(/gallery\.shown\.map/);
    expect(analysis).not.toMatch(/Array\.from\(\{ length: 9 \}/);
  });
});
