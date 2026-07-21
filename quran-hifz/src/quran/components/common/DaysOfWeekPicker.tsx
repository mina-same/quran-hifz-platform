export const WEEK_DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export function DaysOfWeekPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (days: string[]) => void;
}) {
  function toggle(day: string) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day]);
  }

  const allSelected = value.length === WEEK_DAYS.length;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {WEEK_DAYS.map((day) => {
          const active = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              style={{
                padding: "8px 16px",
                borderRadius: 99,
                cursor: "pointer",
                border: `2px solid ${active ? "var(--green)" : "var(--border)"}`,
                background: active ? "var(--green-pale)" : "var(--cream)",
                color: active ? "var(--green)" : "var(--text2)",
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
        onClick={() => onChange(allSelected ? [] : [...WEEK_DAYS])}
      >
        <i className={`ti ${allSelected ? "ti-square-off" : "ti-checks"}`} />
        {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
      </button>
    </div>
  );
}
