import { motion, useReducedMotion } from "framer-motion";

/**
 * GPU-accelerated horizontal bar.
 *
 * Emil:
 *  - Animating `width` triggers layout/paint. We use `transform: scaleX()`
 *    instead, which runs on the compositor and is interruptible.
 *  - `transform-origin: left` is required or the bar grows from both sides.
 *  - `transform` + `opacity` are the only properties we touch — no need to
 *    set `willChange` permanently; the compositor promotes the layer for
 *    the duration of the animation and releases it when settled.
 *  - Duration ≤ 500ms — bars are first-paint visual context, can be slow.
 */
export function ProjectBar({
  percent,
  color,
  delay = 0,
}: {
  percent: number;
  color: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const target = Math.max(0, Math.min(100, percent)) / 100;

  return (
    <span
      className="by-project-bar"
      // Container already provides the track; we just need an inner element.
      aria-hidden
    >
      <motion.span
        className="bar-fill"
        initial={
          reduce
            ? { transform: "scaleX(1)" }
            : { transform: "scaleX(0)", opacity: 0.4 }
        }
        animate={{ transform: `scaleX(${target})`, opacity: 1 }}
        transition={{
          duration: reduce ? 0 : 0.5,
          delay: reduce ? 0 : delay,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          background: color,
          // Override the default left:0 placement; transform handles it now.
          left: 0,
          right: 0,
          transformOrigin: "left center",
        }}
      />
    </span>
  );
}