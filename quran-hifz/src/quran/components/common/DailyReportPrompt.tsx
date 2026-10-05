import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDailyReportDraft } from "../../api/daily-reports";
import { DailyReportComposer } from "./DailyReportComposer";
import { Modal } from "./Modal";
import { toAr } from "../../../lib/format";
import { hijriDate, weekdayAr } from "../../lib/dailyReport";

/**
 * Progress strip «سُجّل X من Y» for a day's roster, and the daily report
 * hand-off once everyone is recorded: the report pops up by itself the moment
 * the LAST student is saved; if the day was already complete when the page
 * opened, a banner offers it instead (no surprise pop-up).
 */
export function DailyReportPrompt({ trackId, date, total, recorded, ready, disabled }: {
  trackId: string;
  date: string;
  total: number;
  /** Students with a saved evaluation for `date`. */
  recorded: number;
  /** The day's saved evaluations have loaded — until then `recorded` is a
   *  placeholder 0, and treating it as real would make a finished day look
   *  like it was "just completed" and pop the report up on every visit. */
  ready: boolean;
  /** e.g. a future day — nothing to report yet. */
  disabled?: boolean;
}) {
  const qc = useQueryClient();
  const allDone = !disabled && total > 0 && recorded >= total;
  const [open, setOpen] = useState(false);

  // Only ask the server for the report once the day is complete.
  const { data } = useDailyReportDraft(allDone ? trackId : undefined, date);
  const sent = !!data?.saved;

  // Keep the draft in step with the grades: any save changes what it contains.
  const prevRecorded = useRef(recorded);
  useEffect(() => {
    if (prevRecorded.current !== recorded) qc.invalidateQueries({ queryKey: ["daily-report-draft", trackId, date] });
  }, [recorded, trackId, date, qc]);

  // Auto-open only on the transition to "everyone recorded" while the teacher
  // is on this day — never just because a finished day was opened/switched to.
  const seen = useRef<{ key: string; done: boolean } | null>(null);
  const pendingOpen = useRef(false);
  useEffect(() => {
    if (!ready) return;
    const key = `${trackId}:${date}`;
    if (seen.current?.key === key && !seen.current.done && allDone) pendingOpen.current = true;
    seen.current = { key, done: allDone };
    prevRecorded.current = recorded;
  }, [ready, trackId, date, allDone, recorded]);

  // …and only once we know the report wasn't already sent.
  useEffect(() => {
    if (pendingOpen.current && data) {
      pendingOpen.current = false;
      if (!data.saved) setOpen(true);
    }
  }, [data]);

  if (disabled || total === 0) return null;
  const pct = Math.round((Math.min(recorded, total) / total) * 100);

  return (
    <>
      <div className={`drp ${allDone ? (sent ? "sent" : "done") : ""}`}>
        <div className="drp-progress">
          <div className="drp-text">
            {allDone
              ? <><i className="ti ti-circle-check" /> تم تسجيل جميع الطلاب ({toAr(total)})</>
              : <><i className="ti ti-list-check" /> سُجّل <b>{toAr(recorded)}</b> من <b>{toAr(total)}</b> طلاب</>}
          </div>
          <div className="drp-bar"><i style={{ width: `${pct}%` }} /></div>
        </div>
        {allDone && (
          <button type="button" className={`drp-btn ${sent ? "ghost" : ""}`} onClick={() => setOpen(true)}>
            {sent
              ? <><i className="ti ti-report" /> أُرسل التقرير — عرض / تعديل</>
              : <><i className="ti ti-send" /> إرسال التقرير اليومي</>}
          </button>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={1100}
        title={<>📖 التقرير اليومي — {weekdayAr(date)} {toAr(hijriDate(date))} هـ</>}
      >
        <DailyReportComposer trackId={trackId} date={date} onSent={() => setOpen(false)} />
      </Modal>
    </>
  );
}
