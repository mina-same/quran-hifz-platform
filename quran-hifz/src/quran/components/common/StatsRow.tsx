export type Stat = {
  num: string;
  label: string;
  icon: string;
  variant?: "" | "gold" | "blue" | "red";
};

export function StatsRow({ items }: { items: Stat[] }) {
  return (
    <div className="stats-row">
      {items.map((s, i) => (
        <div key={i} className={`stat-box ${s.variant ?? ""}`}>
          <div className="stat-num">{s.num}</div>
          <div className="stat-label">{s.label}</div>
          <i className={`ti ${s.icon} stat-icon`} />
        </div>
      ))}
    </div>
  );
}
