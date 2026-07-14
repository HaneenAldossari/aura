import { useEffect, useState } from "react";

interface Star {
  id: number;
  cx: number;
  cy: number;
  r: number;
  duration: number;
  delay: number;
}

interface StarFieldProps {
  /** Max opacity of individual stars (0–1). Default 0.92 (Home page). Use 0.45 for inner pages. */
  maxOpacity?: number;
  /** Min animation duration in seconds. Default 2.5 */
  minDuration?: number;
  /** Max extra duration in seconds added to min. Default 4 */
  durationRange?: number;
}

export default function StarField({
  maxOpacity = 0.92,
  minDuration = 2.5,
  durationRange = 4,
}: StarFieldProps) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 220 }).map((_, i) => ({
      id: i,
      cx: Math.random() * 96 + 2,
      cy: Math.random() * 96 + 2,
      r: Math.random() * 1.1 + 0.3,
      duration: Math.random() * durationRange + minDuration,
      delay: Math.random() * 9,
    }));
    setStars(generated);
  }, [minDuration, durationRange]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
      <svg style={{ width: "100%", height: "100%" }}>
        {stars.map((star) => (
          <circle
            key={star.id}
            cx={`${star.cx}%`}
            cy={`${star.cy}%`}
            r={star.r}
            fill="var(--text-primary)"
            style={{
              opacity: maxOpacity,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
