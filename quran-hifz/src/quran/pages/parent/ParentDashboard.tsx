import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { useParentContext } from "../../context/ParentContext";
import { useChildHifz } from "../../api/parent";
import { AyahBar } from "../../components/common/AyahBar";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { ProgressBar } from "../../components/common/ProgressBar";
import { HalqaRow } from "../../components/common/HalqaRow";
import { toAr, pct } from "../../../lib/format";

const NOTIFICATIONS = [
  { date: "اليوم",  text: "أرسل الواجب اليومي بنجاح ✓",          tone: "green" as const },
  { date: "أمس",   text: "تقييم الأستاذ: ممتاز",                  tone: "gold"  as const },
  { date: "الأحد", text: "حضر حلقة الفجر ✓",                      tone: "green" as const },
  { date: "السبت", text: "الواجب القادم: مراجعة",                  tone: "blue"  as const },
];

export function ParentDashboard() {
  const { showPage } = usePortal();
  const { activeChild } = useParentContext();
  const childId = activeChild?._id;
  const { data: hifzEntries } = useChildHifz(childId);

  const childName   = activeChild?.name ?? "—";
  const progressPct = activeChild?.progressPct ?? 0;
  const progressPages = activeChild?.progressPages ?? 0;
  const attendancePct = activeChild?.attendancePct ?? 0;
  const halqaName = activeChild
    ? typeof activeChild.halqa === "object"
      ? activeChild.halqa.name
      : activeChild.halqa
    : "—";

  const totalJuz = hifzEntries
    ? Math.floor(progressPages / 20)
    : Math.round((progressPct / 100) * 30);

  const level = progressPct >= 80 ? "نجم ⭐" : progressPct >= 50 ? "متميز" : "ناشط";

  useTopbar(
    "ti-home",
    `لوحتي — متابعة ${childName}`,
    <button className="topbar-btn btn-ghost" style={{ fontSize: 11 }} onClick={() => showPage("dashboard")}>
      <i className="ti ti-users" /> تغيير الابن
    </button>,
  );

  return (
    <>
      <AyahBar />
      <StatsRow
        items={[
          { num: toAr(totalJuz),         label: "جزءاً محفوظاً",  icon: "ti-book" },
          { num: pct(attendancePct),     label: "نسبة الحضور",     icon: "ti-calendar-check", variant: "gold" },
          { num: toAr(progressPages),    label: "نقطة مكتسبة",     icon: "ti-star",            variant: "blue" },
          { num: level,                  label: "المستوى",          icon: "ti-award" },
        ]}
      />
      <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* خطة الحفظ الفردية */}
        <Card icon="ti-book" title="خطة الحفظ الفردية">
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>
              التقدم نحو هدف السنة: ٣٠ جزءاً
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--green)" }}>{pct(progressPct)}</div>
            <div style={{ margin: "10px auto", maxWidth: 220 }}>
              <ProgressBar pct={progressPct} />
            </div>
            <span className="badge badge-green">{toAr(totalJuz)} جزء من ٣٠</span>
          </div>
          <hr className="divider" />
          <div style={{ fontSize: 12 }}>
            <HalqaRow label="الحلقة" value={halqaName} />
            <HalqaRow label="الجلسة القادمة" value="الثلاثاء بعد الفجر" valueStyle={{ color: "var(--green)", fontWeight: 700 }} />
          </div>
        </Card>

        {/* آخر إشعارات */}
        <Card icon="ti-bell" title="آخر الإشعارات">
          {NOTIFICATIONS.map((n, i) => (
            <div
              key={i}
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "8px 0",
                borderTop: i > 0 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ color: "var(--text3)", fontSize: 11, minWidth: 42, marginTop: 2 }}>{n.date}</span>
              <span style={{ fontSize: 12, flex: 1 }}>{n.text}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
