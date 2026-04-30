import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import "./TiltedCard.css";

interface TiltedCardProps {
  children: React.ReactNode;
  containerWidth?: string;
  containerHeight?: string;
  scaleOnHover?: number;
  rotateAmplitude?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function TiltedCard({
  children,
  containerWidth = "100%",
  containerHeight = "100%",
  scaleOnHover = 1.05,
  rotateAmplitude = 12,
  className,
  style,
}: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const scale = useMotionValue(1);

  const springRotateX = useSpring(rotateX, { stiffness: 200, damping: 20 });
  const springRotateY = useSpring(rotateY, { stiffness: 200, damping: 20 });
  const springScale = useSpring(scale, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    rotateY.set(dx * rotateAmplitude);
    rotateX.set(-dy * rotateAmplitude);
  };

  const handleMouseEnter = () => {
    scale.set(scaleOnHover);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  };

  return (
    <div
      className="tilted-card-perspective"
      style={{ width: containerWidth, height: containerHeight }}
    >
      <motion.div
        ref={ref}
        className={className}
        style={{
          ...style,
          rotateX: springRotateX,
          rotateY: springRotateY,
          scale: springScale,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </motion.div>
    </div>
  );
}
