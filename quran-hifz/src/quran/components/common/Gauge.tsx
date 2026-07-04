import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toAr } from "../../../lib/format";
import { Badge, type BadgeTone } from "./Badge";

function tierOf(v: number): "ممتاز" | "جيد" | "متوسط" | "ضعيف" {
  if (v >= 90) return "ممتاز";
  if (v >= 75) return "جيد";
  if (v >= 50) return "متوسط";
  return "ضعيف";
}
const TIER_COLOR: Record<string, string> = {
  ممتاز: "var(--green)",
  جيد: "var(--green3)",
  متوسط: "var(--gold)",
  ضعيف: "#ef4444",
};
const TIER_TONE: Record<string, BadgeTone> = {
  ممتاز: "green",
  جيد: "blue",
  متوسط: "gold",
  ضعيف: "red",
};

/** Single-value ring gauge (0-100) with a tiered color + badge, used as the
 *  evaluation dashboard's hero widget. Distinct from `Donut` (multi-slice
 *  breakdown) — this is one value read at a glance. */
export function Gauge({
  value,
  size = 180,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const tier = tierOf(clamped);
  const color = TIER_COLOR[tier];
  const data = [
    { value: clamped, color },
    { value: 100 - clamped, color: "var(--border)" },
  ];

  return (
    <div className="gauge-wrap" style={{ height: size }}>
      <ResponsiveContainer width="100%" height={size}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            innerRadius={size * 0.36}
            outerRadius={size * 0.48}
            stroke="none"
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="gauge-center">
        <div className="gauge-center-num" style={{ color }}>
          {toAr(clamped)}٪
        </div>
        {label && <div className="gauge-center-sub">{label}</div>}
        <Badge tone={TIER_TONE[tier]}>{tier}</Badge>
      </div>
    </div>
  );
}
