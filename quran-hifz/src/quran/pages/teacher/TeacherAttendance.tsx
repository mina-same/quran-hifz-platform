import { useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { useHalqat } from "../../api/halqat";
import { useStudents } from "../../api/students";
import { useBulkAttendance } from "../../api/attendance";

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return "";
}

export function TeacherAttendance() {
  const { user } = usePortal();
  const { data: halqat = [] } = useHalqat({ teacher: user?.profileId });
  const firstHalqa = halqat[0];
  const { data: students = [] } = useStudents({ halqa: firstHalqa?._id });
  const bulkAttendance = useBulkAttendance();

  const today = new Date().toISOString().split("T")[0];
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  function setStatus(studentId: string, status: string) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  useTopbar(
    "ti-calendar-check",
    "الحضور اليومي",
    <button
      className="topbar-btn btn-primary"
      onClick={() => {
        if (!firstHalqa) return;
        const records = students.map((s) => ({
          student: s._id,
          status: statuses[s._id] ?? "حاضر",
        }));
        bulkAttendance.mutate({ halqa: firstHalqa._id, date: today, records });
      }}
      disabled={bulkAttendance.isPending || !firstHalqa}
    >
      <i className="ti ti-send" />
      {bulkAttendance.isPending ? "جارٍ الحفظ..." : "حفظ وإرسال إشعارات"}
    </button>,
  );

  return (
    <>
      <Card
        icon="ti-school"
        title={firstHalqa ? `${firstHalqa.name} — اليوم` : "الحضور اليومي"}
        headerExtra={
          <span style={{ fontSize: 12, color: "var(--text2)" }}>{today}</span>
        }
      >
        {!firstHalqa && (
          <div className="page-loading">لا توجد حلقات مسجلة لهذا المعلم</div>
        )}
        {firstHalqa && (
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
