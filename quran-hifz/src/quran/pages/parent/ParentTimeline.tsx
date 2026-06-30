import { useTopbar } from "../../context/useTopbar";
import { useParentContext } from "../../context/ParentContext";
import { useChildHifz } from "../../api/parent";
import { Card } from "../../components/common/Card";

const STATUS_COLOR: Record<string, string> = {
  "مكتمل": "var(--green)",
  "جارٍ":  "var(--gold)",
  "لم يبدأ": "var(--border2)",
};
const STATUS_BG: Record<string, string> = {
  "مكتمل": "var(--green-pale)",
  "جارٍ":  "var(--gold-pale)",
  "لم يبدأ": "var(--cream)",
};

export function ParentTimeline() {
  const { activeChild } = useParentContext();
  const { data: hifzEntries, isLoading } = useChildHifz(activeChild?._id);

  useTopbar("ti-timeline", `مسيرة حفظ ${activeChild?.name ?? "—"}`, <></>);

  return (
    <Card icon="ti-route" title="رحلة الحفظ من البداية حتى الآن">
      {isLoading ? (
        <div style={{ padding: "1rem", color: "var(--text-muted)" }}>جارٍ التحميل...</div>
      ) : (hifzEntries ?? []).length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--text2)", padding: 24, fontSize: 12 }}>
          لا توجد سجلات حفظ بعد.
        </p>
      ) : (
        <div style={{ position: "relative", paddingRight: 28 }}>
          <div style={{ position: "absolute", right: 13, top: 0, bottom: 0, width: 2, background: "var(--border2)" }} />
          {(hifzEntries ?? []).map((ev, i) => {
            const col = STATUS_COLOR[ev.status] ?? "var(--green)";
            const bg  = STATUS_BG[ev.status]   ?? "var(--green-pale)";
            return (
              <div key={ev._id ?? i} style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
                <div style={{ position: "relative", zIndex: 1, marginTop: 4, flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: col, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ev.status === "مكتمل" && <i className="ti ti-check" style={{ fontSize: 13, color: "white" }} />}
                    {ev.status === "جارٍ"  && <i className="ti ti-player-play" style={{ fontSize: 12, color: "white" }} />}
                    {ev.status === "لم يبدأ" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                  </div>
                </div>
                <div style={{ flex: 1, background: bg, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>سورة {ev.surah}</span>
                    {ev.status === "مكتمل"   && <span className="badge badge-green">مكتمل</span>}
                    {ev.status === "جارٍ"    && <span className="badge badge-gold">جارٍ</span>}
                    {ev.status === "لم يبدأ" && <span className="badge badge-gray">لم يبدأ</span>}
                  </div>
                  {ev.notes && (
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>{ev.notes}</div>
                  )}
                  {ev.completionDate && (
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                      <i className="ti ti-calendar" style={{ fontSize: 11 }} />{" "}
                      {new Date(ev.completionDate).toLocaleDateString("ar-SA")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
