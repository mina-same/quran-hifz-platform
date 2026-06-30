import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { useParentContext } from "../../context/ParentContext";
import { useChildHifz } from "../../api/parent";
import { AyahBar } from "../../components/common/AyahBar";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { ProgressBar } from "../../components/common/ProgressBar";

export function ParentDashboard() {
  const { showPage } = usePortal();
  const { activeChild } = useParentContext();
  const childId = activeChild?._id;
  const { data: hifzEntries } = useChildHifz(childId);

  const childName = activeChild?.name ?? "—";
  const progressPct = activeChild?.progressPct ?? 0;
  const progressPages = activeChild?.progressPages ?? 0;
  const attendancePct = activeChild?.attendancePct ?? 0;
  const halqaName = activeChild
    ? typeof activeChild.halqa === "object"
      ? activeChild.halqa.name
      : activeChild.halqa
    : "—";

  const totalJuz = hifzEntries ? Math.floor(progressPages / 20) : Math.round((progressPct / 100) * 30);

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
          { num: `${totalJuz}`,          label: "جزءاً محفوظاً",  icon: "ti-book" },
          { num: `${attendancePct}٪`,    label: "نسبة الحضور",      icon: "ti-calendar-check", variant: "gold" },
          { num: `${progressPages}`,     label: "صفحة محفوظة",      icon: "ti-star",            variant: "blue" },
          { num: activeChild?.path ?? "—", label: "المسار",          icon: "ti-award" },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card icon="ti-book" title="خطة الحفظ الفردية">
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>
              التقدم نحو هدف السنة: ٣٠ جزءاً
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--green)" }}>{progressPct}٪</div>
            <div style={{ margin: "10px auto", maxWidth: 220 }}>
              <ProgressBar pct={progressPct} />
            </div>
            <span className="badge badge-green">{totalJuz} جزء من ٣٠</span>
          </div>
          <hr className="divider" />
          <div style={{ fontSize: 12 }}>
            <div className="halqa-row"><span className="lbl">الحلقة</span><span className="val">{halqaName}</span></div>
          </div>
        </Card>
        <Card icon="ti-bell" title="ملخص الأداء">
          <div style={{ padding: "8px 0", fontSize: 13, color: "var(--text2)", lineHeight: 2 }}>
            <div>📚 الصفحات المحفوظة: <strong>{progressPages}</strong></div>
            <div>📅 نسبة الحضور: <strong>{attendancePct}٪</strong></div>
            <div>🏫 الحلقة: <strong>{halqaName}</strong></div>
            <div>🛤️ المسار: <strong>{activeChild?.path ?? "—"}</strong></div>
          </div>
        </Card>
      </div>
    </>
  );
}
