import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  YAxis,
} from "recharts";

/**
 * Sparkline for a single project's 14-day pass rate.
 *
 *  - Y domain is tight (yMin–yMax) so the line has visible variance even
 *    when the actual numbers don't move much. Keeps the chart honest.
 *  - Gradient fill under the curve. Adds depth without distracting.
 *  - GPU-only entrance via `transform` + `opacity` on the wrapper.
 *  - `prefers-reduced-motion` honored — chart appears instantly.
 */
export function PassRateChart({
  data,
  color = "oklch(62% 0.15 150)",
}: {
  data: number[];
  color?: string;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Wait one frame so Recharts picks up `isAnimationActive` correctly on
  // first paint (Recharts keys off `mounted` to avoid double-animations).
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (data.length === 0) return null;

  // Tight Y domain — clamp to [50, 100] like the original so the line
  // reads as a trend, not a flat plateau at the top of the chart.
  const yMin = 50;
  const yMax = 100;

  return (
    <motion.div
      // Same compositional entrance as the success/failure chart: never
      // `scale(0)`, a subtle rise + scale to feel like settling in.
      initial={
        reduce
          ? false
          : { opacity: 0, transform: "translateY(6px) scale(0.985)" }
      }
      animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: "100%" }}
    >
      <ResponsiveContainer width="100%" height={96}>
        <AreaChart
          data={data.map((v, i) => ({ i, v }))}
          margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
        >
          <defs>
            <linearGradient id="grad-passrate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            vertical={false}
          />

          <YAxis
            hide
            domain={[yMin, yMax]}
          />

          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#grad-passrate)"
            isAnimationActive={mounted}
            animationDuration={700}
            animationEasing="cubic-bezier(0.16, 1, 0.3, 1)"
            dot={false}
            // Tiny end-point marker — same `transform: scale` pattern as
            // the dashboard chart's active dot so it stays on the GPU.
            activeDot={({ cx, cy }) => (
              <g style={{ pointerEvents: "none" }}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill="var(--bg)"
                  stroke={color}
                  strokeWidth={2}
                />
              </g>
            )}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}