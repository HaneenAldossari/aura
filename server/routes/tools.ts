import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import { checkShoppingImage, checkManualItem } from "../services/linkChecker";
import { analysisStore, normalizeResult } from "./analysis";

const router = Router();

// Multer config for link-check image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP images are allowed"));
    }
  },
});

// POST /api/link-check-image
router.post("/link-check-image", upload.single("photo"), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const sessionId = req.body.sessionId;

    if (!file || !sessionId) {
      res.status(400).json({ error: "Image and sessionId are required" });
      return;
    }

    const userProfile = analysisStore[sessionId];
    if (!userProfile) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    const result = await checkShoppingImage(file.path, userProfile);

    // Clean up uploaded file
    try { fs.unlinkSync(file.path); } catch {}

    res.json(result);
  } catch (err: unknown) {
    // Clean up uploaded file on error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    console.error("Image link check error:", err);
    const message = err instanceof Error ? err.message : "Image check failed";
    res.status(500).json({ error: message });
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
      res.status(400).json({ error: "Invalid sampleId" });
      return;
    }
    const filePath = path.join(__dirname, "../demo-analyses", `${sampleId}.json`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Sample not found" });
      return;
    }
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const result = normalizeResult(raw);
    const sessionId = uuid();
    analysisStore[sessionId] = result;
    res.json({ sessionId, result });
  } catch (err) {
    console.error("Demo load error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Demo load failed" });
  }
});

// POST /api/link-check-manual
router.post("/link-check-manual", async (req: Request, res: Response): Promise<void> => {
  try {
    const { colorDesc, category, brand, sessionId } = req.body;

    if (!colorDesc || !sessionId) {
      res.status(400).json({ error: "Color description and sessionId are required" });
      return;
    }

    const userProfile = analysisStore[sessionId];
    if (!userProfile) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    const result = await checkManualItem(colorDesc, category || "", brand || "", userProfile);
    res.json(result);
  } catch (err: unknown) {
    console.error("Manual check error:", err);
    const message = err instanceof Error ? err.message : "Manual check failed";
    res.status(500).json({ error: message });
  }
});

export default router;
