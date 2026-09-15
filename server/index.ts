import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

import analysisRoutes from "./routes/analysis";
import chatRoutes from "./routes/chat";
import imageRoutes from "./routes/images";
import toolRoutes from "./routes/tools";
import { isDemo } from "./services/openrouter";
import { modelChat, modelClassify, modelShop } from "./utils/config";
import { sessions } from "./utils/sessionStore";

const app = express();
const PORT = process.env.PORT || 3001;
const startedAt = Date.now();

// Render terminates TLS behind a proxy — needed for correct client IPs
app.set("trust proxy", 1);

app.use(helmet());

// CORS — local dev + the deployed frontend + anything in CORS_ORIGINS.
// (No wildcard *.vercel.app: any Vercel user could host a hostile frontend.)
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://aura-azure-six.vercel.app",
  ...corsOrigins,
]);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl / health checks
      if (allowedOrigins.has(origin)) return cb(null, true);
      cb(new Error(`Origin not allowed: ${origin}`));
    },
  })
);

// JSON bodies are small (chat, demo-load); uploads go through multer
app.use(express.json({ limit: "100kb" }));

// Rate limits — the LLM routes burn shared free-tier quota, so they get a
// much tighter budget than cheap reads.
const llmLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many analyses — please wait a few minutes and try again." },
});
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many messages — please slow down a little." },
});
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many requests." },
});

app.use("/api/analyze", llmLimiter);
app.use("/api/chat", chatLimiter);
app.use("/api/link-check-image", chatLimiter);
app.use("/api/link-check-manual", chatLimiter);
app.use("/api", generalLimiter);

// API routes
app.use("/api", analysisRoutes);
app.use("/api", chatRoutes);
app.use("/api", imageRoutes);
app.use("/api", toolRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    provider: "openrouter",
    providerConfigured: !isDemo(),
    models: { classify: modelClassify(), chat: modelChat(), shop: modelShop() },
    sessions: sessions.size,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  });
});

// Error handler — multer size/type failures and CORS rejections land here;
// return clean JSON instead of the default HTML 500 page.
app.use(
  (err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    if (err.message?.startsWith("Origin not allowed")) {
      res.status(403).json({ error: "cors_denied", message: "Origin not allowed" });
      return;
    }
    if (err.message?.includes("File too large")) {
      res.status(400).json({ error: "file_too_large", message: "Photo is too large. Please upload an image under the size limit." });
      return;
    }
    if (err.message?.includes("images are allowed")) {
      res.status(400).json({ error: "invalid_file_type", message: err.message });
      return;
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "internal_error", message: "Something went wrong." });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
