import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toAr } from "../../../lib/format";

export type DonutSlice = { name: string; value: number; color: string };

/** Reusable donut chart with a centered label and optional legend.
 *  Colors accept CSS `var(--…)` strings — recharts renders them in SVG fill. */
export function Donut({
  data,
  centerNum,
  centerSub,
  size = 190,
  emptyText = "لا توجد بيانات",
  showLegend = true,
}: {
  data: DonutSlice[];
  centerNum?: string;
  centerSub?: string;
  size?: number;
  emptyText?: string;
  showLegend?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="donut-empty" style={{ height: size }}>
        <i className="ti ti-chart-donut" style={{ fontSize: 26, color: "var(--text3)", marginBottom: 8 }} />
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="donut-block">
      <div className="donut-wrap" style={{ position: "relative", height: size, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height={size}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={size * 0.34}
              outerRadius={size * 0.46}
              paddingAngle={2}
              stroke="none"
              isAnimationActive
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                direction: "rtl",
              }}
              formatter={(v: number) => [toAr(v), ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        {(centerNum || centerSub) && (
          <div className="donut-center">
            {centerNum && <div className="donut-center-num">{centerNum}</div>}
            {centerSub && <div className="donut-center-sub">{centerSub}</div>}
          </div>
        )}
      </div>

      {showLegend && (
        <div className="donut-legend">
          {data.map((d, i) => (
            <div className="donut-legend-row" key={i}>
              <span className="donut-legend-dot" style={{ background: d.color }} />
              <span className="donut-legend-label">{d.name}</span>
              <span className="donut-legend-val">{toAr(d.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
