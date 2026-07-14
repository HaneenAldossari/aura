import { Router, Request, Response } from "express";

const router = Router();

const PATTERN_IMAGES: Record<string, string> = {
  "Animal Print": "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=150&h=150&fit=crop",
  "Paisley": "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=150&h=150&fit=crop",
  "Floral": "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=150&h=150&fit=crop",
  "Plaid": "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=150&h=150&fit=crop",
  "Houndstooth": "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=150&h=150&fit=crop",
  "Geometric": "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=150&h=150&fit=crop",
  "Stripes": "https://images.unsplash.com/photo-1604762524889-3e2fcc145683?w=150&h=150&fit=crop",
  "Abstract": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=150&h=150&fit=crop",
};

router.get("/patterns", (req: Request, res: Response) => {
  const { patterns } = req.query;
  if (!patterns) {
    res.json([]);
    return;
  }

  const patternList = (patterns as string).split(",").map((p) => p.trim());
  const results = patternList.map((pattern) => {
    const key = Object.keys(PATTERN_IMAGES).find(
      (k) => k.toLowerCase() === pattern.toLowerCase()
    );
    return {
      pattern,
      imageUrl: key ? PATTERN_IMAGES[key] : `https://source.unsplash.com/150x150/?${encodeURIComponent(pattern + " fabric pattern")}`,
    };
  });

  res.json(results);
});

export default router;
