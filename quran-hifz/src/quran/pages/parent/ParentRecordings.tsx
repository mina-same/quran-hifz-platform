import { useTopbar } from "../../context/useTopbar";
import { useParentContext } from "../../context/ParentContext";
import { useChildRecordings } from "../../api/parent";
import { Alert } from "../../components/common/Alert";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";

export function ParentRecordings() {
  const { activeChild } = useParentContext();
  const childId = activeChild?._id;
  const { data: recordings, isLoading } = useChildRecordings(childId);

  useTopbar("ti-microphone", `دروس ${activeChild?.name ?? "—"} المُسجَّلة`, <></>);

  return (
    <>
      <Alert tone="info">جميع دروس ابنك مرتبة من الأحدث — سجّلها المعلم مباشرة في الحلقة.</Alert>
      <Card icon="ti-table" title="سجل الدروس">
        {isLoading ? (
          <SkeletonTable cols={5} rows={5} />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>نوع الدرس</th>
                    <th>المقطع</th>
                    <th>النقاط</th>
                    <th>ملاحظة المعلم</th>
                  </tr>
                </thead>
                <tbody>
                  {(recordings ?? []).map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>
                        {new Date(r.recordedAt).toLocaleDateString("ar-SA")}
                      </td>
                      <td><Badge tone="blue">{r.type}</Badge></td>
                      <td style={{ fontSize: 12 }}>{r.segment}</td>
                      <td style={{ fontWeight: 700, color: "var(--gold)" }}>{r.points}</td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>{r.teacherNote ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rc-list">
              {(recordings ?? []).map((r, i) => (
                <div key={i} className="rc-card">
                  <div className="rc-card-head">
                    <span className="rc-card-title">{new Date(r.recordedAt).toLocaleDateString("ar-SA")}</span>
                    <Badge tone="blue">{r.type}</Badge>
                  </div>
                  <div className="rc-row">
                    <span className="rc-row-label">المقطع</span>
                    <span>{r.segment}</span>
                  </div>
                  <div className="rc-row">
                    <span className="rc-row-label">النقاط</span>
                    <span style={{ fontWeight: 700, color: "var(--gold)" }}>{r.points}</span>
                  </div>
                  <div className="rc-row">
                    <span className="rc-row-label">ملاحظة المعلم</span>
                    <span>{r.teacherNote ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
