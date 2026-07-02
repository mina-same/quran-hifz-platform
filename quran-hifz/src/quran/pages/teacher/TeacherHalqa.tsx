import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Badge } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";
import { HalqaRow } from "../../components/common/HalqaRow";
import { SkeletonCardGrid } from "../../components/common/Skeleton";
import { useHalqat } from "../../api/halqat";
import { toAr } from "../../../lib/format";

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return "";
}

export function TeacherHalqa() {
  const { showPage, user } = usePortal();
  const { data: halqat = [], isLoading } = useHalqat({ teacher: user?.profileId });

  useTopbar("ti-school", "حلقاتي");

  if (isLoading) {
    return <SkeletonCardGrid count={3} lines={4} />;
  }

  const occupancyPct = (studentCount: number, capacity: number) =>
    capacity > 0 ? Math.round((studentCount / capacity) * 100) : 0;

  return (
    <div className="halqa-grid">
      {halqat.map((h) => {
        const occ = occupancyPct(h.studentCount ?? 0, h.capacity);
        return (
          <div key={h._id} className="halqa-card">
            <div className="halqa-card-head">
              <span className="halqa-card-name">{h.name}</span>
              <Badge tone="gold">{getName(h.masjid) || "—"}</Badge>
            </div>
            <div className="halqa-card-body">
              <HalqaRow label="المسجد" value={getName(h.masjid)} />
              <HalqaRow label="المواعيد" value={h.days} valueStyle={{ fontSize: 11 }} />
              <HalqaRow label="الطلاب" value={`${toAr(h.studentCount ?? 0)} / ${toAr(h.capacity)}`} />
              <ProgressBar pct={occ} />
              <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 2 }}>{toAr(occ)}٪ إشغال</div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  className="topbar-btn btn-ghost"
                  style={{ flex: 1, justifyContent: "center", fontSize: 11 }}
                  onClick={() => showPage("students")}
                >
                  <i className="ti ti-users" /> الطلاب
                </button>
                <button
                  className="topbar-btn btn-primary"
                  style={{ flex: 1, justifyContent: "center", fontSize: 11 }}
                  onClick={() => showPage("attendance")}
                >
                  <i className="ti ti-calendar-check" /> الحضور
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {halqat.length === 0 && (
        <div className="page-loading">لا توجد حلقات مسجلة لهذا المعلم</div>
      )}
    </div>
  );
}
