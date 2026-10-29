import { useMemo, useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { useGradeChanges } from "../../api/evaluations";
import { useTracks } from "../../api/tracks";
import { shiftDay, todayKey } from "../../lib/dailyReport";
import { AR_LOCALE, toAr } from "../../../lib/format";

const ROLE: Record<string, string> = { teacher: "المعلم", admin: "المدير" };

/**
 * «سجل تعديل الدرجات»: every time a saved day (attendance / grades) was
 * re-saved with different values — who changed what, from → to, and when.
 */
export function AdminGradeChanges() {
  const today = todayKey();
  const [from, setFrom] = useState(shiftDay(today, -6));
  const [to, setTo] = useState(today);
  const [track, setTrack] = useState("");
  const { data: rows = [], isLoading, isError, error } = useGradeChanges({ from, to, track });
  const { data: tracks = [] } = useTracks("active");
  useTopbar("ti-history", "سجل تعديل الدرجات");

  const sortedTracks = useMemo(() => [...tracks].sort((a, b) => a.title.localeCompare(b.title, "ar")), [tracks]);

  return (
    <div className="gc-page">
      <div className="card gc-filters">
        <label>من <input className="form-input" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
        <label>إلى <input className="form-input" type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
        <select className="form-input gc-track" value={track} onChange={(e) => setTrack(e.target.value)} aria-label="الحلقة">
          <option value="">كل الحلقات</option>
          {sortedTracks.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
        </select>
        <span className="gc-count">{toAr(rows.length)} تعديل</span>
      </div>

      {isError && <div className="card gc-empty">{(error as Error).message}</div>}

      {isLoading ? (
        <div className="card gc-list" aria-label="جارٍ التحميل">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="gc-row">
              <span className="skl" style={{ width: "40%", height: 14 }} />
              <span className="skl" style={{ width: "70%", height: 12 }} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card gc-empty">
          <i className="ti ti-history-off" /> لا توجد تعديلات على الدرجات في هذه الفترة
        </div>
      ) : (
        <div className="card gc-list">
          {rows.map((r) => (
            <article key={r._id} className="gc-row">
              <header>
                <b>{r.studentName || "طالب"}</b>
                <span>
                  {r.trackTitle} · يوم{" "}
                  {new Date(r.date).toLocaleDateString(AR_LOCALE, { day: "numeric", month: "long", timeZone: "UTC" })}
                </span>
              </header>
              <ul>
                {r.changes.map((c, i) => (
                  <li key={i}>
                    <span className="gc-label">{c.label}:</span>
                    <span className="gc-from">{toAr(c.from)}</span>
                    <i className="ti ti-arrow-left" aria-label="إلى" />
                    <span className="gc-to">{toAr(c.to)}</span>
                  </li>
                ))}
              </ul>
              <footer>
                عدّلها {ROLE[r.editedByRole] ?? ""} {r.editedByName} ·{" "}
                {new Date(r.createdAt).toLocaleString(AR_LOCALE, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
