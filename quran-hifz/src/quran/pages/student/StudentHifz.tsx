import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";
import { HalqaRow } from "../../components/common/HalqaRow";
import { SkeletonTable } from "../../components/common/Skeleton";
import { useHifz } from "../../api/hifz";
import { useStudent } from "../../api/students";
import { toAr, pct } from "../../../lib/format";

function tone(status: string): BadgeTone {
  if (status === "مكتمل") return "green";
  if (status === "جارٍ") return "gold";
  return "gray";
}

export function StudentHifz() {
  const { user } = usePortal();
  const { data: hifzEntries = [], isLoading } = useHifz(user?.profileId);
  const { data: student } = useStudent(user?.profileId);

  useTopbar("ti-book", "خطة حفظي");

  const pages = student ? Math.round((student.progressPct / 100) * (student.totalPages || 604)) : 0;
  const remaining = (student?.totalPages || 604) - pages;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 18 }}>
      <Card icon="ti-target" title="هدفي السنوي">
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "var(--green)" }}>
            {toAr(pages)}
          </div>
          <div style={{ fontSize: 13, color: "var(--text2)" }}>
            صفحة من أصل {toAr(student?.totalPages || 604)}
          </div>
          <div style={{ margin: "14px 0 8px" }}>
            <ProgressBar pct={student?.progressPct ?? 0} />
          </div>
          <Badge tone="green">{pct(student?.progressPct ?? 0)} منجز</Badge>
        </div>
        <hr className="divider" />
        <div style={{ fontSize: 12 }}>
          <HalqaRow label="المسار" value={student?.path ?? "—"} />
          <HalqaRow label="الصفحات المتبقية" value={`${toAr(remaining)} صفحة`} />
          {student?.lastMemorization && (
            <HalqaRow label="آخر حفظ" value={student.lastMemorization} />
          )}
        </div>
      </Card>
      <Card icon="ti-list" title="تفاصيل الحفظ">
        {isLoading && <SkeletonTable cols={4} rows={6} />}
        {!isLoading && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>السورة</th>
                  <th>الحالة</th>
                  <th>تاريخ الختم</th>
                </tr>
              </thead>
              <tbody>
                {hifzEntries.map((e) => (
                  <tr key={e._id}>
                    <td style={{ color: "var(--text3)", fontSize: 12 }}>{toAr(e.surahNumber)}</td>
                    <td style={{ fontWeight: 600 }}>{e.surah}</td>
                    <td>
                      <Badge tone={tone(e.status)}>{e.status}</Badge>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>
                      {e.completionDate
                        ? new Date(e.completionDate).toLocaleDateString("ar-SA")
                        : "—"}
                    </td>
                  </tr>
                ))}
                {hifzEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                      لا توجد سور مسجلة بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
