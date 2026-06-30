import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Badge } from "../../components/common/Badge";
import { useMasajid } from "../../api/masajid";
import { toAr } from "../../../lib/format";

export function AdminMasajid() {
  const { data: masajid = [], isLoading, error } = useMasajid();
  const [open, setOpen] = useState<Set<string>>(new Set());

  useTopbar("ti-building-arch", "المساجد والحلقات");

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="page-loading">
        <i className="ti ti-loader-2" /> جارٍ التحميل...
      </div>
    );
  }
  if (error) {
    return <div style={{ color: "var(--red, #c0392b)", padding: 12 }}>تعذّر تحميل المساجد</div>;
  }

  return (
    <>
      {masajid.map((m) => (
        <div key={m._id} className="masjid-item">
          <div className="masjid-head" onClick={() => toggle(m._id)}>
            <span className="masjid-head-title">
              <i className="ti ti-building-arch" />
              {m.name}
            </span>
            <Badge tone="green">{toAr(m.halqat?.length ?? 0)} حلقات</Badge>
          </div>
          <div className={`masjid-body${open.has(m._id) ? " open" : ""}`}>
            {(m.halqat ?? []).map((h) => (
              <div key={h._id} className="halqa-row-item">
                <span className="h-name">{h.name}</span>
                <Badge tone="blue">{toAr(h.studentCount ?? 0)} طالب</Badge>
              </div>
            ))}
            {!m.halqat?.length && (
              <div style={{ padding: "10px 16px", color: "var(--text3)", fontSize: 13 }}>
                لا توجد حلقات مسجلة
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
