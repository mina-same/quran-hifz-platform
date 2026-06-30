import { useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";
import { useStudents } from "../../api/students";
import { toAr, pct } from "../../../lib/format";

const PATH_TONE: Record<string, BadgeTone> = {
  "حفظ كامل": "gold",
  "عشرون جزءاً": "green",
  "عشرة أجزاء": "blue",
  "خمسة أجزاء": "blue",
};

function getHalqaName(h: unknown): string {
  if (h && typeof h === "object" && "name" in h) return (h as { name: string }).name;
  return "";
}

function getMasjidName(m: unknown): string {
  if (m && typeof m === "object" && "name" in m) return (m as { name: string }).name;
  return "";
}

export function AdminStudents() {
  const { showPage } = usePortal();
  const [search, setSearch] = useState("");
  const [pathFilter, setPathFilter] = useState("");

  const { data: students = [], isLoading, error } = useStudents();

  useTopbar(
    "ti-users",
    "إدارة الطلاب",
    <>
      <button className="topbar-btn btn-ghost">
        <i className="ti ti-filter" /> تصفية
      </button>
      <button className="topbar-btn btn-primary" onClick={() => showPage("register")}>
        <i className="ti ti-user-plus" /> تسجيل جديد
      </button>
    </>,
  );

  const filtered = students.filter((s) => {
    const matchSearch = !search || s.name.includes(search);
    const matchPath = !pathFilter || s.path === pathFilter;
    return matchSearch && matchPath;
  });

  return (
    <Card>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          placeholder="البحث باسم الطالب..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-input"
          style={{ width: 170 }}
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
        >
          <option value="">كل المسارات</option>
          <option>حفظ كامل</option>
          <option>عشرون جزءاً</option>
          <option>عشرة أجزاء</option>
          <option>خمسة أجزاء</option>
        </select>
      </div>

      {isLoading && (
        <div className="page-loading">
          <i className="ti ti-loader-2" /> جارٍ التحميل...
        </div>
      )}
      {error && (
        <div style={{ color: "var(--red, #c0392b)", padding: 12, fontSize: 13 }}>
          تعذّر تحميل بيانات الطلاب
        </div>
      )}

      {!isLoading && !error && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>المسار</th>
                <th>الحلقة</th>
                <th>المسجد</th>
                <th>الحضور</th>
                <th>التقدم</th>
                <th>ولي الأمر</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    <Badge tone={PATH_TONE[s.path] ?? "blue"}>{s.path}</Badge>
                  </td>
                  <td>{getHalqaName(s.halqa)}</td>
                  <td>{getMasjidName(s.masjid)}</td>
                  <td>{pct(s.attendancePct)}</td>
                  <td style={{ minWidth: 90 }}>
                    <ProgressBar pct={s.progressPct} />
                    <span style={{ fontSize: 10, color: "var(--text2)" }}>{pct(s.progressPct)}</span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text2)" }} dir="ltr">
                    {s.guardianPhone}
                  </td>
                  <td>
                    <button className="topbar-btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}>
                      <i className="ti ti-eye" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                    لا توجد نتائج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
