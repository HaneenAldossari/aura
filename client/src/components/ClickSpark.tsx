import { useRef, useCallback, useEffect } from "react";

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  children: React.ReactNode;
}

export default function ClickSpark({
  sparkColor = "#D4AF7A",
  sparkSize = 3,
  sparkRadius = 40,
  sparkCount = 8,
  duration = 660,
  children,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = performance.now();

    sparksRef.current = sparksRef.current.filter((spark) => {
      const elapsed = now - spark.startTime;
      if (elapsed > duration) return false;

      const progress = elapsed / duration;
      const eased = 1 - Math.pow(1 - progress, 3);
      const dist = eased * sparkRadius;
      const alpha = 1 - progress;
      const lineLen = sparkSize * 6 * (1 - progress * 0.6);

      const tipX = spark.x + Math.cos(spark.angle) * dist;
      const tipY = spark.y + Math.sin(spark.angle) * dist;
      const tailX = tipX - Math.cos(spark.angle) * lineLen;
      const tailY = tipY - Math.sin(spark.angle) * lineLen;

      // Spark line
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sparkColor;
      ctx.lineWidth = sparkSize;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Bright dot at tip
      ctx.beginPath();
      ctx.arc(tipX, tipY, sparkSize * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.globalAlpha = alpha * 0.9;
      ctx.fill();
      ctx.restore();

      return true;
    });

    if (sparksRef.current.length > 0) {
      animFrameRef.current = requestAnimationFrame(draw);
    }
  }, [sparkColor, sparkSize, sparkRadius, duration]);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener("resize", syncCanvasSize);
    return () => window.removeEventListener("resize", syncCanvasSize);
  }, [syncCanvasSize]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      syncCanvasSize();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();

      const newSparks: Spark[] = [];
      for (let i = 0; i < sparkCount; i++) {
        const jitter = (Math.random() - 0.5) * 0.3;
        newSparks.push({
          x,
          y,
          angle: (Math.PI * 2 * i) / sparkCount + jitter,
          startTime: now,
        });
      }

      sparksRef.current.push(...newSparks);
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(draw);
    },
    [sparkCount, draw, syncCanvasSize]
  );

  return (
    <div style={{ position: "relative", display: "inline-block" }} onClick={handleClick}>
      {children}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: "-20px",
          left: "-20px",
          right: "-20px",
          bottom: "-20px",
          width: "calc(100% + 40px)",
          height: "calc(100% + 40px)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
