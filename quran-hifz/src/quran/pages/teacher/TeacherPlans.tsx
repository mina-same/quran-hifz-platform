import { useState, type CSSProperties } from "react";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import {
  useQuranPlans, useDeleteQuranPlan,
  PLAN_FORM_HANDOFF_KEY, PLAN_DETAIL_ID_KEY,
  type QuranPlan, type PlanType, type RangePoint,
  type PlanHalqa,
} from "../../api/quran-plans";
import { SURAHS } from "../../data/surahs";
import { Badge } from "../../components/common/Badge";
import { SkeletonCardGrid } from "../../components/common/Skeleton";

/* ─── helpers ─────────────────────────────────────────────── */
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

const PLAN_TYPES: { value: PlanType; label: string; icon: string; fg: string; bg: string }[] = [
  { value: "حفظ",    label: "حفظ",    icon: "ti-book-2",    fg: "var(--green)", bg: "var(--green-pale)" },
  { value: "مراجعة", label: "مراجعة", icon: "ti-refresh",   fg: "#1d4ed8",      bg: "#eff6ff" },
  { value: "ترتيل",  label: "ترتيل",  icon: "ti-music",     fg: "#7c3aed",      bg: "#f3e8ff" },
  { value: "تلاوة",  label: "تلاوة",  icon: "ti-microphone",fg: "#c2410c",      bg: "#fff1e6" },
];

/* ─── overlay / dialog styles (matches AdminSpecialTracks) ──── */
const OVERLAY: CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const DIALOG: CSSProperties = {
  background: "var(--surface)", borderRadius: 16, width: "100%",
  maxHeight: "92vh", overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

/* ════════════════════════════════════════════════════════════ */
export function TeacherPlans() {
  const { user, showPage } = usePortal();
  const teacherId = user?.profileId;

  const { data: plans = [], isLoading } = useQuranPlans({ teacher: teacherId });
  const deletePlan = useDeleteQuranPlan();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openAdd() {
    sessionStorage.setItem(PLAN_FORM_HANDOFF_KEY, JSON.stringify({ mode: "create" }));
    showPage("planform");
  }
  function openEdit(item: QuranPlan) {
    sessionStorage.setItem(PLAN_FORM_HANDOFF_KEY, JSON.stringify({ mode: "edit", plan: item }));
    showPage("planform");
  }
  function openDuplicate(item: QuranPlan) {
    sessionStorage.setItem(PLAN_FORM_HANDOFF_KEY, JSON.stringify({ mode: "duplicate", plan: item }));
    showPage("planform");
  }
  function openDetail(item: QuranPlan) {
    sessionStorage.setItem(PLAN_DETAIL_ID_KEY, item._id);
    showPage("plandetail");
  }

  useTopbar("ti-target", "الخطط القرآنية",
    <button className="topbar-btn btn-primary" onClick={openAdd}>
      <i className="ti ti-plus" /> خطة جديدة
    </button>,
  );

  return (
    <>
      {isLoading && <SkeletonCardGrid count={3} lines={5} />}

      {!isLoading && plans.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 0" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: "var(--green-pale)", color: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 16px",
          }}>
            <i className="ti ti-target" />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>لا توجد خطط قرآنية بعد</p>
          <p style={{ margin: "6px 0 20px", fontSize: 13, color: "var(--text3)" }}>أنشئ أول خطة حفظ أو مراجعة لحلقتك أو لطلابك</p>
          <button className="topbar-btn btn-primary" style={{ padding: "10px 24px" }} onClick={openAdd}>
            <i className="ti ti-plus" /> خطة جديدة
          </button>
        </div>
      )}

      {!isLoading && plans.length > 0 && (
        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
          {plans.map((p) => (
            <PlanCard
              key={p._id}
              plan={p}
              onOpen={openDetail}
              onEdit={openEdit}
              onDelete={setDeleteId}
              onDuplicate={openDuplicate}
              onViewTrack={() => showPage("specialtracks")}
            />
          ))}
        </div>
      )}

      {/* ════════ DELETE CONFIRM ════════ */}
      {deleteId && (
        <div style={OVERLAY} onClick={() => setDeleteId(null)}>
          <div style={{ ...DIALOG, maxWidth: 360, padding: "28px 24px" }} onClick={(e) => e.stopPropagation()}>
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
                onClick={async () => { await deletePlan.mutateAsync(deleteId); setDeleteId(null); }}
                disabled={deletePlan.isPending}
              >
                <i className="ti ti-trash" />
                {deletePlan.isPending ? "جارٍ الحذف..." : "حذف"}
              </button>
              <button className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => setDeleteId(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── plan card (module scope — never nest inside the page render body) ── */
function PlanCard({
  plan, onOpen, onEdit, onDelete, onDuplicate, onViewTrack,
}: {
  plan: QuranPlan;
  onOpen: (p: QuranPlan) => void;
  onEdit: (p: QuranPlan) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: QuranPlan) => void;
  onViewTrack: () => void;
}) {
  const typeCfg = PLAN_TYPES.find((t) => t.value === plan.type) ?? PLAN_TYPES[0];
  const targetLabel =
    plan.targetType === "halqa" ? getName(plan.halqa as PlanHalqa | string) :
    plan.targetType === "specialTrack" ? (plan.specialTrack ? (typeof plan.specialTrack === "object" ? plan.specialTrack.title : plan.specialTrack) : "—") :
    `${(plan.students ?? []).length} طالب`;
  const targetIcon =
    plan.targetType === "halqa" ? "ti-school" :
    plan.targetType === "specialTrack" ? "ti-calendar-event" : "ti-users";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(plan)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(plan); } }}
      style={{
        background: "var(--surface)", borderRadius: 16,
        border: "1px solid var(--border)", overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        cursor: "pointer", transition: "box-shadow .15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ height: 4, background: `linear-gradient(90deg,${typeCfg.fg},${typeCfg.fg}99)` }} />
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: typeCfg.bg, color: typeCfg.fg,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>
              <i className={`ti ${typeCfg.icon}`} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)", whiteSpace: "normal", wordBreak: "break-word" }}>{plan.name}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                <Badge tone={plan.status === "نشطة" ? "green" : plan.status === "متوقفة" ? "gold" : "gray"}>{plan.status}</Badge>
                <span style={{
                  fontSize: 11, background: typeCfg.bg, color: typeCfg.fg,
                  borderRadius: 6, padding: "2px 9px", fontWeight: 600,
                }}>
                  {typeCfg.label}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button className="topbar-btn btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => onEdit(plan)}>
              <i className="ti ti-pencil" />
            </button>
            <button
              className="topbar-btn btn-ghost"
              style={{ padding: "5px 11px", fontSize: 12 }}
              onClick={() => onDuplicate(plan)}
              title="نسخ الخطة"
            >
              <i className="ti ti-copy" />
            </button>
            <button
              className="topbar-btn btn-ghost"
              style={{ padding: "5px 11px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }}
              onClick={() => onDelete(plan._id)}
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        </div>

        {plan.description && <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text2)" }}>{plan.description}</p>}

        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12, color: "var(--text2)", margin: "12px 0" }}>
          <InfoRow
            icon={targetIcon}
            label="الهدف"
            val={targetLabel}
            onClick={plan.targetType === "specialTrack" ? onViewTrack : undefined}
          />
          <InfoRow icon="ti-calendar-week" label="الأيام" val={plan.days.join("، ")} span />
          <InfoRow icon="ti-book" label="من" val={pointLabel(plan.rangeStart)} />
          <InfoRow icon="ti-book-2" label="إلى" val={pointLabel(plan.rangeEnd)} />
          <InfoRow
            icon="ti-files"
            label="عدد الصفحات"
            val={plan.pageRange.pageCount === 1 ? `صفحة ${plan.pageRange.pageStart}` : `${plan.pageRange.pageCount} (${plan.pageRange.pageStart}-${plan.pageRange.pageEnd})`}
            span
          />
          {plan.endType === "date" && plan.endDate
            ? <InfoRow icon="ti-calendar-due" label="ينتهي في" val={fmtDate(plan.endDate)} span />
            : <InfoRow icon="ti-calendar-due" label="عدد الأيام النشطة" val={String(plan.activeDaysCount ?? "—")} span />
          }
        </div>

        {plan.progress && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>
                <i className="ti ti-progress" style={{ marginLeft: 4 }} />تقدّم الخطة
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)" }}>
                {plan.juzProgress ? `${plan.juzProgress.completed} / ${plan.juzProgress.total} جزء` : `${plan.progress.percent}%`}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${plan.progress.percent}%` }} />
            </div>
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>
              {plan.progress.completed} / {plan.progress.total} يوم ({plan.progress.percent}%)
            </div>
          </div>
        )}

        <div style={{
          borderRadius: 10, padding: "10px 12px",
          background: plan.todayAssignment ? "var(--green-pale)" : "var(--cream)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: plan.todayAssignment ? "var(--green)" : "var(--text3)", marginBottom: plan.todayAssignment ? 4 : 0 }}>
            <i className="ti ti-calendar-star" style={{ marginLeft: 4 }} />الجزء المطلوب اليوم
          </div>
          {plan.todayAssignment ? (
            <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
              {surahName(plan.todayAssignment.surahStart)} : {plan.todayAssignment.ayahStart}
              {" — "}
              {surahName(plan.todayAssignment.surahEnd)} : {plan.todayAssignment.ayahEnd}
              <span style={{ fontWeight: 400, color: "var(--text2)" }}>
                {" "}(صفحة {plan.todayAssignment.pageStart}
                {plan.todayAssignment.pageEnd !== plan.todayAssignment.pageStart ? ` - ${plan.todayAssignment.pageEnd}` : ""})
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text3)" }}>لا يوجد جزء مخصص لليوم</div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, val, span, onClick }: { icon: string; label: string; val: string; span?: boolean; onClick?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, gridColumn: span ? "1 / -1" : undefined }}>
      <i className={`ti ${icon}`} style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>{label}</div>
        {onClick ? (
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontWeight: 600, color: "var(--green)", marginTop: 1,
              display: "flex", alignItems: "center", gap: 3, textDecoration: "underline",
            }}
          >
            {val} <i className="ti ti-arrow-left" style={{ fontSize: 11 }} />
          </button>
        ) : (
          <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{val}</div>
        )}
      </div>
    </div>
  );
}
