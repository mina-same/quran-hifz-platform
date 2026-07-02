import type { CSSProperties } from "react";

export function Skeleton({
  width = "100%",
  height = 14,
  radius = 6,
  style,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`skl ${className ?? ""}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function SkeletonStatsRow({ count = 4 }: { count?: number }) {
  return (
    <div className="stats-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-box">
          <Skeleton width={50} height={28} />
          <Skeleton width={80} height={11} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c}>
                  <Skeleton height={13} width={c === 0 ? "70%" : "50%"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card">
      <Skeleton width={120} height={14} style={{ marginBottom: 16 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? "60%" : "100%"}
          style={{ marginBottom: 10 }}
        />
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 3, lines = 4 }: { count?: number; lines?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 0",
            borderBottom: i === rows - 1 ? "none" : "1px solid var(--border)",
          }}
        >
          {avatar && <Skeleton width={40} height={40} radius="50%" style={{ flexShrink: 0 }} />}
          <div style={{ flex: 1 }}>
            <Skeleton height={13} width="40%" style={{ marginBottom: 6 }} />
            <Skeleton height={11} width="75%" />
          </div>
        </div>
      ))}
    </>
  );
}
