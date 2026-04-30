import { motion } from "motion/react";

interface SplitTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  duration?: number;
  tag?: keyof React.JSX.IntrinsicElements;
}

export default function SplitText({
  text,
  className,
  style,
  delay = 30,
  duration = 0.5,
  tag: Tag = "h1",
}: SplitTextProps) {
  const chars = text.split("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component: any = Tag;

  return (
    <Component className={className} style={{ display: "inline-flex", flexWrap: "wrap", fontFamily: "Cormorant Garamond, serif", color: "var(--text-primary)", ...style }}>
      {chars.map((char, i) =>
        char === " " ? (
          <span key={i} style={{ width: "0.3em" }} />
        ) : (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * (delay / 1000), duration, ease: "easeOut" }}
          >
            {char}
          </motion.span>
        )
      )}
    </Component>
  );
}
