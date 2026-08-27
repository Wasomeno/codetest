import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Payload as TooltipPayload } from "recharts/types/component/DefaultTooltipContent";

/**
 * 14 days of pass-rate + fail-rate samples, ending today.
 * Numbers are illustrative — wired to a real source when ready.
 */
const SERIES_DATA = [
  { day: "Aug 18", success: 88, failed: 12 },
  { day: "Aug 19", success: 90, failed: 10 },
  { day: "Aug 20", success: 91, failed: 9 },
  { day: "Aug 21", success: 93, failed: 7 },
  { day: "Aug 22", success: 89, failed: 11 },
  { day: "Aug 23", success: 92, failed: 8 },
  { day: "Aug 24", success: 94, failed: 6 },
  { day: "Aug 25", success: 95, failed: 5 },
  { day: "Aug 26", success: 91, failed: 9 },
  { day: "Aug 27", success: 96, failed: 4 },
  { day: "Aug 28", success: 93, failed: 7 },
  { day: "Aug 29", success: 97, failed: 3 },
  { day: "Aug 30", success: 96, failed: 4 },
  { day: "Sep 01", success: 97, failed: 3 },
];

// Emil: one canonical easing for ALL transitions.
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/* -------------------------------------------------------------------------- */
/* Tooltip — interruptible CSS transitions, no scale-from-zero.              */
/* Uses full `transform` strings (not the `y` shorthand) so it stays on the  */
/* compositor when the page is busy.                                          */
/* -------------------------------------------------------------------------- */

type Point = (typeof SERIES_DATA)[number];

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: React.ReactNode;
};

function ChartTooltip(props: CustomTooltipProps) {
  const { active, payload, label } = props;
  const reduce = useReducedMotion();
  if (!active || !payload?.length) return null;

  const success = payload.find((p) => p.dataKey === "success")?.value as number;
  const failed = payload.find((p) => p.dataKey === "failed")?.value as number;

  return (
    <motion.div
      // Cursor-anchored tooltip — no fixed transform-origin needed.
      initial={reduce ? false : { opacity: 0, transform: "translateY(4px)" }}
      animate={{ opacity: 1, transform: "translateY(0)" }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(4px)" }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--fg)",
        boxShadow: "0 8px 24px -10px oklch(0% 0 0 / 0.18)",
        minWidth: 140,
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--muted)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        <Row color="oklch(62% 0.15 150)" label="Successful" value={`${success}%`} />
        <Row color="oklch(60% 0.18 25)" label="Failed" value={`${failed}%`} dashed />
      </div>
    </motion.div>
  );
}

function Row({
  color,
  label,
  value,
  dashed,
}: {
  color: string;
  label: string;
  value: string;
  dashed?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        aria-hidden
        style={{
          width: 16,
          height: 2,
          background: color,
          borderRadius: 1,
          backgroundImage: dashed
            ? `linear-gradient(to right, ${color} 50%, transparent 50%)`
            : undefined,
          backgroundSize: dashed ? "6px 2px" : undefined,
        }}
      />
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ marginLeft: "auto", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Active dot — GPU-only animation via `transform: scale()`.                  */
/* Hover state is gated behind `(hover: hover)` so touch devices don't       */
/* flip the dot on tap.                                                       */
/* -------------------------------------------------------------------------- */

function ActiveDot(props: {
  cx?: number;
  cy?: number;
  stroke?: string;
  payload?: Point;
}) {
  const { cx, cy, stroke } = props;
  const [hovered, setHovered] = useState(false);
  // Gate hover state to fine pointers (mouse / trackpad). Touch users see the
  // resting dot — no false "stuck hovered" state after a tap.
  const canHover =
    typeof window !== "undefined" &&
    window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
  const expanded = canHover && hovered;

  return (
    <g
      onMouseEnter={() => canHover && setHovered(true)}
      onMouseLeave={() => canHover && setHovered(false)}
      style={{ cursor: canHover ? "pointer" : "default" }}
    >
      {/* Soft halo — animate fillOpacity (compositor-friendly). */}
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={stroke}
        fillOpacity={expanded ? 0.15 : 0}
        style={{
          transition: "fill-opacity 160ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
      {/* Dot — wrap in <g> and animate transform: scale() so it stays on the
          GPU (animating the SVG `r` attribute triggers paint). */}
      <g
        style={{
          transform: expanded ? "scale(1.4)" : "scale(1)",
          transformOrigin: `${cx}px ${cy}px`,
          transition: "transform 160ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill="var(--bg)"
          stroke={stroke}
          strokeWidth={2}
        />
      </g>
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Chart                                                                       */
/* -------------------------------------------------------------------------- */

export function SuccessFailureChart() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Emil: chart entrance is "rare" — first paint of a dashboard panel.
  // 600–700ms is the budget we keep (tighter than the previous 900–1100ms).
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <motion.div
      // Emil: never start from scale(0). Use scale(0.985) + opacity so the
      // chart feels like it's settling in, not appearing from nothing.
      initial={reduce ? false : { opacity: 0, transform: "translateY(6px) scale(0.985)" }}
      animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: "100%" }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={SERIES_DATA}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="grad-success" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(62% 0.15 150)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="oklch(62% 0.15 150)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            vertical={false}
          />

          <XAxis
            dataKey="day"
            tick={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 9,
              fill: "var(--muted)",
            }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            domain={[0, 100]}
            tick={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 9,
              fill: "var(--muted)",
            }}
            tickLine={false}
            axisLine={false}
            width={32}
            tickFormatter={(v) => `${v}%`}
          />

          <Tooltip
            content={<ChartTooltip />}
            cursor={{
              stroke: "var(--fg)",
              strokeOpacity: 0.18,
              strokeDasharray: "3 3",
            }}
            wrapperStyle={{ outline: "none" }}
          />

          <Area
            type="monotone"
            dataKey="failed"
            stroke="oklch(60% 0.18 25)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            fill="transparent"
            isAnimationActive={mounted}
            animationDuration={600}
            animationEasing={EASE_OUT}
            dot={false}
            activeDot={false as never}
          />

          <Area
            type="monotone"
            dataKey="success"
            stroke="oklch(62% 0.15 150)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="url(#grad-success)"
            isAnimationActive={mounted}
            animationDuration={700}
            animationBegin={120}
            animationEasing={EASE_OUT}
            dot={false}
            activeDot={<ActiveDot />}
          />
        </AreaChart>
      </ResponsiveContainer>

      <ChartLegend />
    </motion.div>
  );
}

function ChartLegend() {
  return (
    <div className="chart-legend">
      <span className="key">
        <span
          className="swatch"
          style={{ background: "oklch(62% 0.15 150)" }}
        />
        Successful runs
      </span>
      <span className="key">
        <span
          className="swatch"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, oklch(60% 0.18 25) 0 3px, transparent 3px 6px)",
            height: 2,
            width: 18,
            borderRadius: 1,
          }}
        />
        Failed runs
      </span>
    </div>
  );
}