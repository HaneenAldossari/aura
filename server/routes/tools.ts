import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import { checkShoppingImage, checkManualItem } from "../services/linkChecker";
import { normalizeResult, upload } from "./analysis";
import { sessions } from "../utils/sessionStore";
import { prepareImage } from "../utils/prepareImage";

const router = Router();

// POST /api/link-check-image
router.post("/link-check-image", upload.single("photo"), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const sessionId = req.body.sessionId;

    if (!file || !sessionId) {
      res.status(400).json({ error: "bad_request", message: "Image and sessionId are required" });
      return;
    }

    const userProfile = sessions.get(sessionId);
    if (!userProfile) {
      res.status(404).json({ error: "not_found", message: "Analysis not found" });
      return;
    }

    let prepared;
    try {
      prepared = await prepareImage(file.buffer);
    } catch {
      res.status(400).json({
        error: "invalid_image",
        message: "That file doesn't look like a valid photo. Please upload a JPG, PNG, or WebP image.",
      });
      return;
    }

    const result = await checkShoppingImage(prepared.base64, prepared.mimeType, userProfile);
    res.json(result);
  } catch (err: unknown) {
    console.error("Image link check error:", err);
    const message = err instanceof Error ? err.message : "Image check failed";
    res.status(500).json({ error: "link_check_failed", message });
  }
});

// GET /api/demo-list — list available precomputed sample ids
router.get("/demo-list", (_req: Request, res: Response): void => {
  try {
    const dir = path.join(__dirname, "../demo-analyses");
    if (!fs.existsSync(dir)) {
      res.json({ samples: [] });
      return;
    }
    const samples = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    res.json({ samples });
  } catch {
    res.json({ samples: [] });
  }
});

// POST /api/demo-load — load a precomputed sample analysis into a fresh session
router.post("/demo-load", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sampleId } = req.body as { sampleId?: string };
    if (!sampleId || !/^sample-[0-9]+$/.test(sampleId)) {
      res.status(400).json({ error: "bad_request", message: "Invalid sampleId" });
      return;
    }
    const filePath = path.join(__dirname, "../demo-analyses", `${sampleId}.json`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "not_found", message: "Sample not found" });
      return;
    }
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const result = normalizeResult(raw);
    const sessionId = uuid();
    sessions.set(sessionId, result);
    res.json({ sessionId, result });
  } catch (err) {
    console.error("Demo load error:", err);
    res.status(500).json({
      error: "demo_load_failed",
      message: err instanceof Error ? err.message : "Demo load failed",
    });
  }
});

// POST /api/link-check-manual
router.post("/link-check-manual", async (req: Request, res: Response): Promise<void> => {
  try {
    const { colorDesc, category, brand, sessionId } = req.body;

    if (!colorDesc || !sessionId) {
      res.status(400).json({ error: "bad_request", message: "Color description and sessionId are required" });
      return;
    }
    if (typeof colorDesc !== "string" || colorDesc.length > 500) {
      res.status(400).json({ error: "bad_request", message: "Color description too long" });
      return;
    }

    const userProfile = sessions.get(sessionId);
    if (!userProfile) {
      res.status(404).json({ error: "not_found", message: "Analysis not found" });
      return;
    }

    const result = await checkManualItem(colorDesc, category || "", brand || "", userProfile);
    res.json(result);
  } catch (err: unknown) {
    console.error("Manual check error:", err);
    const message = err instanceof Error ? err.message : "Manual check failed";
    res.status(500).json({ error: "manual_check_failed", message });
  }
});

export default router;
