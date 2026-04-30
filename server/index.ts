import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

import analysisRoutes from "./routes/analysis";
import chatRoutes from "./routes/chat";
import imageRoutes from "./routes/images";
import toolRoutes from "./routes/tools";
const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow local dev, any domains in CORS_ORIGINS, plus all Vercel URLs.
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const localOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      if (localOrigins.includes(origin)) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      // Allow any Vercel preview/production URL
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return cb(null, true);
      cb(new Error(`Origin not allowed: ${origin}`));
    },
  })
);
app.use(express.json({ limit: "10mb" }));

// API routes
app.use("/api", analysisRoutes);
app.use("/api", chatRoutes);
app.use("/api", imageRoutes);
app.use("/api", toolRoutes);

// Serve uploaded files (for development)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
