import { useEffect, useState } from "react";

interface ColorDNARadarProps {
  warmth: number;
  depth: number;
  clarity: number;
  contrast: number;
}

export function ColorDNA({ warmth, depth, clarity, contrast }: ColorDNARadarProps) {
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1000;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setScale(eased);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 60;

  const axes = [
    { label: "Warmth", value: warmth, angle: -90 },
    { label: "Clarity", value: clarity, angle: 0 },
    { label: "Contrast", value: contrast, angle: 90 },
    { label: "Depth", value: depth, angle: 180 },
  ];

  const getPoint = (angleDeg: number, pct: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const r = (pct / 100) * maxR * scale;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  };

  const getRefPoint = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * maxR, y: cy + Math.sin(rad) * maxR };
  };

  const getLabelPos = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const r = maxR + 12;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  };

  const refPoints = axes.map(a => getRefPoint(a.angle));
  const refPath = refPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const dataPoints = axes.map(a => getPoint(a.angle, a.value));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", flexShrink: 0 }}>
      <path d={refPath} fill="none" stroke="#2C2C34" strokeWidth="0.5" />
      {axes.map(a => {
        const p = getRefPoint(a.angle);
        return <line key={a.label} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#2C2C34" strokeWidth="0.5" />;
      })}
      <path d={dataPath} fill="rgba(212,175,122,0.1)" stroke="#D4AF7A" strokeWidth="1" />
      {dataPoints.map((p, i) => (
        <circle key={axes[i].label} cx={p.x} cy={p.y} r="2.5" fill="#D4AF7A" />
      ))}
      {axes.map(a => {
        const pos = getLabelPos(a.angle);
        let anchor: "start" | "middle" | "end" = "middle";
        if (a.angle === 0) anchor = "start";
        if (a.angle === 180) anchor = "end";
        let dy = "0.35em";
        if (a.angle === -90) dy = "-0.3em";
        if (a.angle === 90) dy = "1.1em";
        return (
          <text
            key={a.label}
            x={pos.x}
            y={pos.y}
            textAnchor={anchor}
            dominantBaseline="central"
            dy={dy}
            style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 9, fill: "#706860" }}
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
