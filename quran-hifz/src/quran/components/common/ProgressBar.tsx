export function ProgressBar({ pct, variant }: { pct: number; variant?: string }) {
  return (
    <div className="progress-bar">
      <div className={`progress-fill ${variant ?? ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
