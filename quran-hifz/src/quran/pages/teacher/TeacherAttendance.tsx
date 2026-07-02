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
      />
    );
  }

  // ── View 2: attendance table ───────────────────────────────────────
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
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>آخر حفظ</th>
                  <th>الحضور</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const status = statuses[s._id] ?? "حاضر";
                  return (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>{s.lastMemorization || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          {["حاضر", "غائب", "متأخر"].map((opt) => (
                            <label
                              key={opt}
                              style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12 }}
                            >
                              <input
                                type="radio"
                                name={`att-${s._id}`}
                                value={opt}
                                checked={status === opt}
                                onChange={() => setStatus(s._id, opt)}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                      لا يوجد طلاب
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
