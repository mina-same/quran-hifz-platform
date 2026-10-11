import { useEffect, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { useTracks } from "../../api/tracks";
import { DailyReportComposer } from "../../components/common/DailyReportComposer";
import { Alert } from "../../components/common/Alert";
import { shiftDay, todayKey } from "../../lib/dailyReport";

/** «التقرير اليومي» — pick a halqa + day, then edit and send its report. */
export function TeacherDailyReport() {
  const { user, showPage } = usePortal();
  const teacherId = user?.role === "teacher" ? (user?.profileId as string | undefined) : undefined;
  const { data: tracks = [], isLoading: loadingTracks } = useTracks(undefined, teacherId);
  const [trackId, setTrackId] = useState<string>("");
  const [date, setDate] = useState(todayKey());
  const today = todayKey();

  useEffect(() => {
    if (!trackId && tracks.length) setTrackId(tracks[0]._id);
  }, [tracks, trackId]);

  useTopbar("ti-report", "التقرير اليومي للحلقة");

  if (!loadingTracks && tracks.length === 0) {
    return <Alert tone="info">لا توجد حلقات مرتبطة بحسابك بعد.</Alert>;
  }

  return (
    <div className="dre-page">
      <div className="card dre-controls">
        <label>
          <span>الحلقة</span>
          <select className="form-input" value={trackId} onChange={(e) => setTrackId(e.target.value)}>
            {tracks.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
          </select>
        </label>
        <label>
          <span>التاريخ</span>
          <div className="dre-date">
            <button type="button" className="topbar-btn btn-ghost" onClick={() => setDate(shiftDay(date, -1))} aria-label="اليوم السابق"><i className="ti ti-chevron-right" /></button>
            <input className="form-input" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
            <button type="button" className="topbar-btn btn-ghost" onClick={() => setDate(shiftDay(date, 1))} disabled={date >= today} aria-label="اليوم التالي"><i className="ti ti-chevron-left" /></button>
          </div>
        </label>
      </div>

      {trackId && <DailyReportComposer key={`${trackId}:${date}`} trackId={trackId} date={date} onGoRecord={() => showPage("attendance")} />}
    </div>
  );
}
