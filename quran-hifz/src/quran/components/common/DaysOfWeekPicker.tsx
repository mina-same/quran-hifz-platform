export const WEEK_DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export function DaysOfWeekPicker({
  value,
  onChange,
  disabledDays = [],
}: {
  value: string[];
  onChange: (days: string[]) => void;
  /** Days another plan type already owns. A multi-type plan partitions the
   * week — no date may belong to two types — so those days are shown but not
   * selectable here. */
  disabledDays?: string[];
}) {
  function toggle(day: string) {
    if (disabledDays.includes(day)) return;
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day]);
  }

  const selectable = WEEK_DAYS.filter((d) => !disabledDays.includes(d));
  const allSelected = selectable.length > 0 && selectable.every((d) => value.includes(d));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {WEEK_DAYS.map((day) => {
          const active = value.includes(day);
          const taken = disabledDays.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              disabled={taken}
              title={taken ? "هذا اليوم مُسنَد لنوع آخر" : undefined}
              style={{
                padding: "8px 16px",
                borderRadius: 99,
                cursor: taken ? "not-allowed" : "pointer",
                border: `2px ${taken ? "dashed" : "solid"} ${active ? "var(--green)" : "var(--border)"}`,
                background: active ? "var(--green-pale)" : "var(--cream)",
                color: active ? "var(--green)" : "var(--text2)",
                opacity: taken ? 0.4 : 1,
                fontWeight: active ? 700 : 400,
                fontSize: 13,
                transition: "all .15s",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="topbar-btn btn-ghost"
        style={{ padding: "5px 12px", fontSize: 12 }}
        onClick={() => onChange(allSelected ? [] : selectable)}
      >
        <i className={`ti ${allSelected ? "ti-square-off" : "ti-checks"}`} />
        {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
      </button>
    </div>
  );
}
