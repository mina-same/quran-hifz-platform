import { useTopbar } from "../../context/useTopbar";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";
import { HalqaRow } from "../../components/common/HalqaRow";
import { useHalqat } from "../../api/halqat";
import { toAr } from "../../../lib/format";

const PATH_TONE: Record<string, BadgeTone> = {
  "حفظ كامل": "gold",
  "عشرون جزءاً": "green",
  "عشرة أجزاء": "blue",
  "خمسة أجزاء": "blue",
};

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return "";
}

export function AdminHalqat() {
  const { data: halqat = [], isLoading, error } = useHalqat();

  useTopbar(
    "ti-school",
    "الحلقات",
    <button className="topbar-btn btn-primary">
      <i className="ti ti-plus" /> حلقة جديدة
    </button>,
  );

  if (isLoading) {
    return (
      <div className="page-loading">
        <i className="ti ti-loader-2" /> جارٍ التحميل...
      </div>
    );
  }
  if (error) {
    return <div style={{ color: "var(--red, #c0392b)", padding: 12 }}>تعذّر تحميل الحلقات</div>;
  }

  const occupancyPct = (h: { studentCount?: number; capacity: number }) =>
    h.capacity > 0 ? Math.round(((h.studentCount ?? 0) / h.capacity) * 100) : 0;

  return (
    <div className="halqa-grid">
      {halqat.map((h) => {
        const occ = occupancyPct(h);
        return (
          <div key={h._id} className="halqa-card">
            <div className="halqa-card-head">
              <span className="halqa-card-name">{h.name}</span>
              <Badge tone={PATH_TONE[h.name] ?? "green"}>{getName(h.masjid) || "—"}</Badge>
            </div>
            <div className="halqa-card-body">
              <HalqaRow label="المعلم" value={getName(h.teacher)} />
              <HalqaRow label="المسجد" value={getName(h.masjid)} />
              <HalqaRow label="المواعيد" value={h.days} valueStyle={{ fontSize: 11 }} />
              <HalqaRow label="الإشغال" value={`${toAr(h.studentCount ?? 0)} / ${toAr(h.capacity)}`} />
              <ProgressBar pct={occ} />
              <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 2 }}>{toAr(occ)}٪ إشغال</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
