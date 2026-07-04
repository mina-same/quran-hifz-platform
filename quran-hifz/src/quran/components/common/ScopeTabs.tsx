/** Segmented control used to scope report widgets to a cohort
 *  (all / a specific halqa / a specific special track). */
export function ScopeTabs({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="scope-tabs" role="tablist" aria-label="نطاق التقرير">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={`scope-tab ${o.value === value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <i className={`ti ${o.icon}`} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
