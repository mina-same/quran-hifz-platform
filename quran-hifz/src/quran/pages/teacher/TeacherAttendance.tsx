import { useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { ContextPicker, halqaToContext, trackToContext, type TeachingContext } from "../../components/common/ContextPicker";
import { SkeletonCard, SkeletonTable } from "../../components/common/Skeleton";
import { useHalqat } from "../../api/halqat";
import { useSpecialTracks } from "../../api/special-tracks";
import { useStudents } from "../../api/students";
import { useBulkAttendance } from "../../api/attendance";

export function TeacherAttendance() {
  const { user } = usePortal();
  const [selected, setSelected] = useState<TeachingContext | null>(null);

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat({ teacher: user?.profileId });
  const { data: tracks = [], isLoading: loadingTracks } = useSpecialTracks(undefined, user?.profileId as string | undefined);

  const contexts: TeachingContext[] = [
    ...halqat.map(halqaToContext),
    ...tracks.map(trackToContext),
  ];

  const { data: students = [], isLoading: loadingStudents } = useStudents(
    selected
      ? selected.kind === "halqa"
        ? { halqa: selected.id }
        : { specialTrack: selected.id }
      : undefined
  );
  const bulkAttendance = useBulkAttendance();

  const today = new Date().toISOString().split("T")[0];
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  function setStatus(studentId: string, status: string) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  useTopbar(
    "ti-calendar-check",
    selected ? `الحضور اليومي — ${selected.title}` : "الحضور اليومي",
    selected ? (
      <div style={{ display: "flex", gap: 8 }}>
        <button className="topbar-btn btn-ghost" onClick={() => { setSelected(null); setStatuses({}); }}>
          <i className="ti ti-arrow-right" /> الحلقات والمسارات
        </button>
        <button
          className="topbar-btn btn-primary"
          onClick={() => {
            const records = students.map((s) => ({
              student: s._id,
              status: statuses[s._id] ?? "حاضر",
            }));
            bulkAttendance.mutate(
              selected.kind === "halqa"
                ? { halqa: selected.id, date: today, records }
                : { specialTrack: selected.id, date: today, records }
            );
          }}
          disabled={bulkAttendance.isPending}
        >
          <i className="ti ti-send" />
          {bulkAttendance.isPending ? "جارٍ الحفظ..." : "حفظ وإرسال إشعارات"}
        </button>
      </div>
    ) : undefined,
  );

  // ── View 1: context selector ──────────────────────────────────────
  if (!selected) {
    if (loadingHalqat || loadingTracks) {
      return <SkeletonCard lines={2} />;
    }
    return (
      <ContextPicker
        contexts={contexts}
        onSelect={setSelected}
        emptyLabel="لا توجد حلقات أو مسارات مسجلة لهذا المعلم"
        heading="اختر الحلقة أو المسار الاستثنائي لتسجيل حضور اليوم"
        actionLabel="أخذ الحضور"
        actionIcon="ti-calendar-check"
      />
    );
  }

  // ── View 2: attendance list ───────────────────────────────────────
  const presentCount = students.filter((s) => (statuses[s._id] ?? "حاضر") === "حاضر").length;
  const absentCount = students.length - presentCount;

  return (
    <>
      <Card
        icon={selected.kind === "halqa" ? "ti-school" : "ti-calendar-event"}
        title={`${selected.title} — اليوم`}
        headerExtra={
          <span style={{ fontSize: 12, color: "var(--text2)" }}>{today}</span>
        }
      >
        {loadingStudents && (
          <SkeletonTable cols={3} rows={5} />
        )}
        {!loadingStudents && (
          <>
            {students.length > 0 && (
              <div className="att-summary">
                <span className="att-chip">
                  <i className="ti ti-check" /> حاضر: {presentCount}
                </span>
                <span className="att-chip absent">
                  <i className="ti ti-x" /> غائب: {absentCount}
                </span>
                <button
                  className="att-mark-all"
                  onClick={() => {
                    const all: Record<string, string> = {};
                    students.forEach((s) => { all[s._id] = "حاضر"; });
                    setStatuses(all);
                  }}
                >
                  <i className="ti ti-checks" /> تحديد الكل حاضر
                </button>
              </div>
            )}
            <div className="att-list">
              {students.map((s) => {
                const status = statuses[s._id] ?? "حاضر";
                const isAbsent = status === "غائب";
                return (
                  <div key={s._id} className={`att-row ${isAbsent ? "is-absent" : ""}`}>
                    <div className="att-avatar">{s.name.trim().charAt(0)}</div>
                    <div className="att-info">
                      <div className="att-name">{s.name}</div>
                      <div className="att-sub">آخر حفظ: {s.lastMemorization || "—"}</div>
                    </div>
                    <div className="att-toggle">
                      <button
                        type="button"
                        className={status === "حاضر" ? "active present" : ""}
                        onClick={() => setStatus(s._id, "حاضر")}
                      >
                        <i className="ti ti-check" /> حاضر
                      </button>
                      <button
                        type="button"
                        className={isAbsent ? "active absent" : ""}
                        onClick={() => setStatus(s._id, "غائب")}
                      >
                        <i className="ti ti-x" /> غائب
                      </button>
                    </div>
                  </div>
                );
              })}
              {students.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                  لا يوجد طلاب
                </div>
              )}
            </div>
          </>
        )}
      </Card>
      {bulkAttendance.isSuccess && (
        <Alert tone="success">تم حفظ الحضور بنجاح.</Alert>
      )}
      {bulkAttendance.isError && (
        <Alert tone="warning">{(bulkAttendance.error as Error).message}</Alert>
      )}
    </>
  );
}
