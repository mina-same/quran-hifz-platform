import { toAr } from "../../../lib/format";
import type { BadgeTone } from "./Badge";
import { Badge } from "./Badge";

export type LeaderRow = {
  id: string;
  name: string;
  subtitle?: string;
  /** 0–100 used to fill the meter */
  meter: number;
  /** value shown to the right of the meter (already-formatted string) */
  display: string;
  /** optional reason badge (used on the watchlist) */
  reason?: { tone: BadgeTone; text: string };
};

/** Ranked list of students. `variant="leader"` shows a numeric rank medal;
 *  `variant="watch"` shows an alert icon and a reason badge. */
export function Leaderboard({
  rows,
  variant = "leader",
  emptyText = "لا يوجد بيانات",
  emptyIcon = "ti-mood-empty",
}: {
  rows: LeaderRow[];
  variant?: "leader" | "watch";
  emptyText?: string;
  emptyIcon?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="lb-empty">
        <i className={`ti ${emptyIcon}`} />
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="leaderboard-list">
      {rows.map((r, i) => (
        <div key={r.id} className={`lb-row ${variant}`}>
          <div className={`lb-rank ${variant === "leader" ? `rank-${Math.min(i + 1, 4)}` : "rank-watch"}`}>
            {variant === "leader" ? toAr(i + 1) : <i className="ti ti-alert-triangle" />}
          </div>
          <div className="lb-avatar">{initials(r.name)}</div>
          <div className="lb-info">
            <div className="lb-name">{r.name}</div>
            {r.subtitle && <div className="lb-sub">{r.subtitle}</div>}
            {r.reason && (
              <div className="lb-reason">
                <Badge tone={r.reason.tone}>{r.reason.text}</Badge>
              </div>
            )}
          </div>
          <div className="lb-meter">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${clampPct(r.meter)}%` }}
              />
            </div>
            <div className="lb-value">{r.display}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? "") + (parts[1][0] ?? "");
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}
