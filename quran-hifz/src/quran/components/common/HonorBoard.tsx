const RANK_META = [
  { icon: "ti-crown", cls: "rank-1", height: 76 },
  { icon: "ti-medal", cls: "rank-2", height: 56 },
  { icon: "ti-medal", cls: "rank-3", height: 40 },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? "") + (parts[1][0] ?? "");
}

export type HonorRow = { id: string; name: string; subtitle?: string; display: string };

/** Podium-style top-3 showcase — visually distinct from `Leaderboard`'s
 *  ranked-row list, used to give evaluation champions a celebratory moment
 *  instead of just another list row. Degrades gracefully with fewer than 3
 *  rows (empty side slots) instead of breaking the podium symmetry. */
export function HonorBoard({
  rows,
  emptyText = "لا توجد بيانات كافية بعد",
}: {
  rows: HonorRow[];
  emptyText?: string;
}) {
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) {
    return (
      <div className="honor-empty">
        <i className="ti ti-award" />
        <span>{emptyText}</span>
      </div>
    );
  }

  // Visual podium order: 2nd — 1st — 3rd, with 1st elevated in the middle.
  const order = [top3[1], top3[0], top3[2]];

  return (
    <div className="honor-board">
      {order.map((row, i) => {
        if (!row) return <div key={`gap-${i}`} className="honor-slot-empty" />;
        const rank = top3.indexOf(row);
        const meta = RANK_META[rank];
        return (
          <div key={row.id} className={`honor-card ${meta.cls}`}>
            <i className={`ti ${meta.icon} honor-icon`} />
            <div className="honor-avatar">{initials(row.name)}</div>
            <div className="honor-name">{row.name}</div>
            {row.subtitle && <div className="honor-sub">{row.subtitle}</div>}
            <div className="honor-score">{row.display}</div>
            <div className="honor-bar" style={{ height: meta.height }} />
          </div>
        );
      })}
    </div>
  );
}
