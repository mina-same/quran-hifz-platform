import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useTeachers } from "../../api/teachers";
import { toAr } from "../../../lib/format";

export function AdminTeachers() {
  const { data: teachers = [], isLoading, error } = useTeachers();

  useTopbar(
    "ti-chalkboard",
    "المعلمون",
    <button className="topbar-btn btn-primary">
      <i className="ti ti-plus" /> إضافة معلم
    </button>,
  );

  return (
    <Card>
      {isLoading && (
        <div className="page-loading">
          <i className="ti ti-loader-2" /> جارٍ التحميل...
        </div>
      )}
      {error && (
        <div style={{ color: "var(--red, #c0392b)", padding: 12, fontSize: 13 }}>
          تعذّر تحميل بيانات المعلمين
        </div>
      )}
      {!isLoading && !error && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>التخصص</th>
                <th>الحلقات</th>
                <th>عدد الطلاب</th>
                <th>التقييم</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>
                    <Badge tone="blue">{t.specialty}</Badge>
                  </td>
                  <td>{toAr(t.halqatCount ?? 0)}</td>
                  <td>{toAr(t.studentCount ?? 0)}</td>
                  <td>{t.rating}</td>
                  <td>
                    <Badge tone={t.status === "active" ? "green" : "gray"}>
                      {t.status === "active" ? "نشط" : "غير نشط"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
