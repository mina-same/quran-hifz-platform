import { useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import {
  useQuranPlan, useDeleteQuranPlan,
  PLAN_DETAIL_ID_KEY, PLAN_FORM_HANDOFF_KEY,
  type RangePoint,
} from "../../api/quran-plans";
import { SURAHS } from "../../data/surahs";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { SkeletonCard } from "../../components/common/Skeleton";

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}
function pointLabel(p: RangePoint) {
  return `${surahName(p.surahNumber)} : ${p.ayah}`;
}
function getName(v: { name: string } | string) {
  return typeof v === "object" ? v.name : v;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

const PLAN_TYPE_CFG: Record<string, { icon: string; fg: string; bg: string }> = {
  "حفظ":    { icon: "ti-book-2",     fg: "var(--green)", bg: "var(--green-pale)" },
  "مراجعة": { icon: "ti-refresh",    fg: "#1d4ed8",       bg: "#eff6ff" },
  "ترتيل":  { icon: "ti-music",      fg: "#7c3aed",       bg: "#f3e8ff" },
  "تلاوة":  { icon: "ti-microphone", fg: "#c2410c",       bg: "#fff1e6" },
};

export function TeacherPlanDetail() {
  const { showPage } = usePortal();

  const [planId] = useState<string | null>(() => sessionStorage.getItem(PLAN_DETAIL_ID_KEY));
  const { data: plan, isLoading } = useQuranPlan(planId ?? undefined);
  const deletePlan = useDeleteQuranPlan();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useTopbar("ti-target", plan?.name ?? "تفاصيل الخطة",
    <button className="topbar-btn btn-ghost" onClick={() => showPage("plans")}>
      <i className="ti ti-arrow-right" /> الخطط
    </button>,
  );

  function openEdit() {
    if (!plan) return;
    sessionStorage.setItem(PLAN_FORM_HANDOFF_KEY, JSON.stringify({ mode: "edit", plan }));
    showPage("planform");
  }
  function openDuplicate() {
    if (!plan) return;
    sessionStorage.setItem(PLAN_FORM_HANDOFF_KEY, JSON.stringify({ mode: "duplicate", plan }));
    showPage("planform");
  }
  async function confirmDeletePlan() {
    if (!plan) return;
    await deletePlan.mutateAsync(plan._id);
    showPage("plans");
  }

  if (!planId) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text3)" }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 28, display: "block", marginBottom: 10 }} />
          لم يتم تحديد خطة
        </div>
      </Card>
    );
  }

  if (isLoading || !plan) {
    return <SkeletonCard lines={8} />;
  }

  const typeCfg = PLAN_TYPE_CFG[plan.type] ?? PLAN_TYPE_CFG["حفظ"];
  const targetLabel =
    plan.targetType === "halqa" ? getName(plan.halqa!) :
    plan.targetType === "specialTrack" ? (plan.specialTrack ? (typeof plan.specialTrack === "object" ? plan.specialTrack.title : plan.specialTrack) : "—") :
    `${(plan.students ?? []).length} طالب`;
  const targetIcon =
    plan.targetType === "halqa" ? "ti-school" :
    plan.targetType === "specialTrack" ? "ti-calendar-event" : "ti-users";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Header card ── */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: typeCfg.bg, color: typeCfg.fg,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>
              <i className={`ti ${typeCfg.icon}`} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "var(--text)" }}>{plan.name}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                <Badge tone={plan.status === "نشطة" ? "green" : plan.status === "متوقفة" ? "gold" : "gray"}>{plan.status}</Badge>
                <span style={{ fontSize: 11, background: typeCfg.bg, color: typeCfg.fg, borderRadius: 6, padding: "2px 9px", fontWeight: 600 }}>
                  {plan.type}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="topbar-btn btn-ghost" onClick={openEdit}>
              <i className="ti ti-pencil" /> تعديل
            </button>
            <button className="topbar-btn btn-ghost" onClick={openDuplicate}>
              <i className="ti ti-copy" /> نسخ
            </button>
            <button
              className="topbar-btn btn-ghost"
              style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }}
              onClick={() => setConfirmDelete(true)}
            >
              <i className="ti ti-trash" /> حذف
            </button>
          </div>
        </div>

        {plan.description && <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--text2)" }}>{plan.description}</p>}

        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "14px 20px", marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
          <InfoRow icon={targetIcon} label="الهدف" val={targetLabel} />
          <InfoRow icon="ti-calendar-week" label="الأيام" val={plan.days.join("، ")} />
          <InfoRow icon="ti-book" label="من" val={pointLabel(plan.rangeStart)} />
          <InfoRow icon="ti-book-2" label="إلى" val={pointLabel(plan.rangeEnd)} />
          <InfoRow
            icon="ti-files"
            label="عدد الصفحات"
            val={plan.pageRange.pageCount === 1 ? `صفحة ${plan.pageRange.pageStart}` : `${plan.pageRange.pageCount} (${plan.pageRange.pageStart}-${plan.pageRange.pageEnd})`}
          />
          {plan.endType === "date" && plan.endDate
            ? <InfoRow icon="ti-calendar-due" label="ينتهي في" val={fmtDate(plan.endDate)} />
            : <InfoRow icon="ti-calendar-due" label="عدد الأيام النشطة" val={String(plan.activeDaysCount ?? "—")} />
          }
        </div>

        {plan.progress && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>
                <i className="ti ti-progress" style={{ marginLeft: 4 }} />تقدّم الخطة
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>
                {plan.juzProgress ? `${plan.juzProgress.completed} / ${plan.juzProgress.total} جزء` : `${plan.progress.percent}%`}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${plan.progress.percent}%` }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
              {plan.progress.completed} / {plan.progress.total} يوم ({plan.progress.percent}%)
            </div>
          </div>
        )}

        <div style={{
          borderRadius: 10, padding: "12px 14px", marginTop: 16,
          background: plan.todayAssignment ? "var(--green-pale)" : "var(--cream)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: plan.todayAssignment ? "var(--green)" : "var(--text3)", marginBottom: plan.todayAssignment ? 5 : 0 }}>
            <i className="ti ti-calendar-star" style={{ marginLeft: 4 }} />الجزء المطلوب اليوم
          </div>
          {plan.todayAssignment ? (
            <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
              {surahName(plan.todayAssignment.surahStart)} : {plan.todayAssignment.ayahStart}
              {" — "}
              {surahName(plan.todayAssignment.surahEnd)} : {plan.todayAssignment.ayahEnd}
              <span style={{ fontWeight: 400, color: "var(--text2)" }}>
                {" "}(صفحة {plan.todayAssignment.pageStart}
                {plan.todayAssignment.pageEnd !== plan.todayAssignment.pageStart ? ` - ${plan.todayAssignment.pageEnd}` : ""})
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>لا يوجد جزء مخصص لليوم</div>
          )}
        </div>
      </Card>

      {/* ── Schedule breakdown ── */}
      <Card icon="ti-calendar-stats" title="تقسيم الأجزاء على الأيام">
        {plan.schedule.length === 0 ? (
          <p style={{ margin: "20px 0", fontSize: 13, color: "var(--text3)", textAlign: "center" }}>
            لا يوجد جدول محسوب لهذه الخطة
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>التاريخ</th>
                  <th>الجزء</th>
                  <th>من</th>
                  <th>إلى</th>
                  <th>الصفحات</th>
                </tr>
              </thead>
              <tbody>
                {plan.schedule.map((s) => (
                  <tr key={s.occurrenceIndex}>
                    <td>{s.occurrenceIndex}</td>
                    <td>{fmtDate(s.date)}</td>
                    <td><Badge tone="green">جزء {s.juz}</Badge></td>
                    <td>{surahName(s.surahStart)} : {s.ayahStart}</td>
                    <td>{surahName(s.surahEnd)} : {s.ayahEnd}</td>
                    <td>{s.pageStart === s.pageEnd ? s.pageStart : `${s.pageStart} - ${s.pageEnd}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={() => setConfirmDelete(false)}
        >
          <div
            style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 360, padding: "28px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "#fef2f2", color: "#ef4444",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, margin: "0 auto 14px",
              }}>
                <i className="ti ti-trash" />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>حذف الخطة</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>ستُحذف الخطة نهائياً ولا يمكن التراجع.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "#ef4444", borderColor: "#ef4444", padding: 11 }}
                onClick={confirmDeletePlan}
                disabled={deletePlan.isPending}
              >
                <i className="ti ti-trash" />
                {deletePlan.isPending ? "جارٍ الحذف..." : "حذف"}
              </button>
              <button className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => setConfirmDelete(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, val }: { icon: string; label: string; val: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <i className={`ti ${icon}`} style={{ color: "var(--green)", marginTop: 2, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1 }}>{label}</div>
        <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 2, fontSize: 13 }}>{val}</div>
      </div>
    </div>
  );
}
