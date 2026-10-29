import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Badge } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";
import { useKpis, KPI_STATUS } from "../../api/kpis";
import { downloadCsv } from "../../../lib/csv";
import { toAr } from "../../../lib/format";

/**
 * «مؤشرات الأداء» — this month's indicators, computed by the server from real
 * records (attendance, evaluations, daily reports, homework) for the active
 * gender scope. Each card says what is measured and how far it is from target.
 */
export function AdminKpis() {
  const { genderScope } = usePortal();
  const { data: kpis = [], isLoading, error } = useKpis(genderScope);

  function exportCsv() {
    downloadCsv(
      "تقرير مؤشرات الأداء.csv",
      ["المؤشر", "الفعلي", "المستهدف", "الحالة", "طريقة الحساب"],
      kpis.map((k) => [k.indicator, k.actual, k.target, KPI_STATUS[k.status].label, k.hint]),
    );
  }

  useTopbar(
    "ti-target",
    "مؤشرات الأداء — هذا الشهر",
    <button className="topbar-btn btn-ghost" onClick={exportCsv} disabled={kpis.length === 0}>
      <i className="ti ti-download" /> تصدير
    </button>,
  );

  const counts = {
    achieved: kpis.filter((k) => k.status === "achieved").length,
    near: kpis.filter((k) => k.status === "near").length,
    below: kpis.filter((k) => k.status === "below").length,
  };

  return (
    <div className="kp-page">
      {!isLoading && !error && kpis.length > 0 && (
        <p className="kp-summary">
          <span className="kp-dot achieved" /> محقق {toAr(counts.achieved)}
          <span className="kp-dot near" /> قريب من الهدف {toAr(counts.near)}
          <span className="kp-dot below" /> دون الهدف {toAr(counts.below)}
          <span className="kp-note">تُحسب تلقائياً من الحضور والتقييمات والتقارير منذ بداية الشهر</span>
        </p>
      )}

      {error && <div className="card kp-error">تعذّر تحميل المؤشرات</div>}

      <div className="kp-grid">
        {isLoading
          ? [0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card kp-card" aria-hidden="true">
                <span className="skl" style={{ width: "60%", height: 14 }} />
                <span className="skl" style={{ width: 90, height: 34 }} />
                <span className="skl" style={{ width: "100%", height: 8 }} />
                <span className="skl" style={{ width: "80%", height: 12 }} />
              </div>
            ))
          : kpis.map((k) => {
              const st = KPI_STATUS[k.status];
              return (
                <section key={k._id} className={`card kp-card ${k.status}`}>
                  <header className="kp-head">
                    <h3>{k.indicator}</h3>
                    <Badge tone={st.tone}>
                      <i className={`ti ${st.icon}`} /> {st.label}
                    </Badge>
                  </header>
                  <div className="kp-values">
                    <b style={{ color: st.color }}>{k.actual}</b>
                    <span>المستهدف {k.target}</span>
                  </div>
                  <ProgressBar pct={k.progress} />
                  <p className="kp-hint">
                    <i className="ti ti-info-circle" /> {k.hint}
                  </p>
                </section>
              );
            })}
      </div>
    </div>
  );
}
