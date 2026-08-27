import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

/**
 * Count-up number for the dashboard stat strip.
 *
 * Emil:
 *  - We animate `opacity` + a small `translateY` (GPU-accelerated).
 *  - We do NOT animate width / margin / padding.
 *  - We respect `prefers-reduced-motion` — counts become a static fade-in.
 *  - We guard against StrictMode's double-mount in dev so the count doesn't
 *    play twice (and so we never flash `0` to the user).
 */
export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString(),
  duration = 0.6,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => format(Math.round(v)));
  const startedRef = useRef(false);

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    if (startedRef.current) {
      mv.set(value);
      return;
    }
    startedRef.current = true;
    const controls = animate(mv, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, mv, duration, reduce]);

  return (
    <motion.span
      // Emil: numbers in a stat strip animate rarely (page load). Keep it
      // subtle. translateY(4px) is enough — no scale-from-zero.
      initial={reduce ? false : { opacity: 0, transform: "translateY(4px)" }}
      animate={{ opacity: 1, transform: "translateY(0)" }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "inline-block", fontVariantNumeric: "tabular-nums" }}
    >
      {display}
    </motion.span>
  );
}