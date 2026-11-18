import { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { IconCircleCheck, IconListCheck, IconReport, IconSend } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { useEvaluations } from '@/lib/queries/evaluations';
import { useDailyReportDraft } from '@/lib/queries/dailyReports';
import DailyReportComposer from '@/components/domain/DailyReportComposer';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

/**
 * Progress strip «سُجّل X من Y» for a day's roster, and the daily report
 * hand-off once everyone is recorded (web DailyReportPrompt). The web pops the
 * composer in a modal; mobile navigates to the «التقرير اليومي» route instead
 * (the composer holds pickers, which must not live in an RN Modal). It goes
 * there by itself only on the transition to "everyone recorded" while the
 * teacher is on this day, and only if the report wasn't already sent.
 */
export default function DailyReportPrompt({ trackId, date, studentIds, disabled, inline }: {
  trackId: string;
  date: string;
  studentIds: string[];
  /** e.g. a future day — nothing to report yet. */
  disabled?: boolean;
  /** Open the composer in place instead of the teacher route — admin can't
   * reach /teacher/* (the portal layout redirects by role). */
  inline?: boolean;
}) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();
  const qc = useQueryClient();

  // Same filter as EvaluationRoster, so this reads the roster's cached query.
  const { data: savedForDay = [], isSuccess: ready } = useEvaluations({ track: trackId, from: date, to: date });
  const recorded = useMemo(() => {
    const saved = new Set(savedForDay.map((r) => (typeof r.student === 'string' ? r.student : r.student._id)));
    return studentIds.filter((id) => saved.has(id)).length;
  }, [savedForDay, studentIds]);
  const total = studentIds.length;
  const allDone = !disabled && total > 0 && recorded >= total;

  // Only ask the server for the report once the day is complete.
  const { data } = useDailyReportDraft(allDone ? trackId : undefined, date);
  const sent = !!data?.saved;

  const [composerOpen, setComposerOpen] = useState(false);
  useEffect(() => { setComposerOpen(false); }, [trackId, date]);
  const openReport = () => (inline
    ? setComposerOpen(true)
    : router.push({ pathname: '/(portal)/teacher/dailyreport', params: { track: trackId, date } } as any));

  // Keep the draft in step with the grades: any save changes what it contains.
  const prevRecorded = useRef(recorded);
  useEffect(() => {
    if (prevRecorded.current !== recorded) qc.invalidateQueries({ queryKey: ['daily-report-draft', trackId, date] });
  }, [recorded, trackId, date, qc]);

  // Auto-open only on the transition to "everyone recorded" — never just
  // because a finished day was opened/switched to.
  const seen = useRef<{ key: string; done: boolean } | null>(null);
  const pendingOpen = useRef(false);
  useEffect(() => {
    if (!ready) return;
    const key = `${trackId}:${date}`;
    if (seen.current?.key === key && !seen.current.done && allDone) pendingOpen.current = true;
    seen.current = { key, done: allDone };
    prevRecorded.current = recorded;
  }, [ready, trackId, date, allDone, recorded]);

  useEffect(() => {
    if (pendingOpen.current && data) {
      pendingOpen.current = false;
      if (!data.saved) openReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (disabled || total === 0) return null;
  const pct = Math.round((Math.min(recorded, total) / total) * 100);
  const tone = allDone ? theme.tone[sent ? 'blue' : 'green'] : null;

  return (
    <View style={[s.box, tone && { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={s.textRow}>
        {allDone
          ? <IconCircleCheck size={16} color={tone!.text} />
          : <IconListCheck size={16} color={theme.textMuted} />}
        <Text style={[s.text, tone && { color: tone.text }]}>
          {allDone ? `تم تسجيل جميع الطلاب (${total})` : `سُجّل ${recorded} من ${total} طلاب`}
        </Text>
      </View>
      <ProgressBar value={pct} showPercent={false} />
      {allDone && (
        <Button
          label={sent ? 'أُرسل التقرير — عرض / تعديل' : 'إرسال التقرير اليومي'}
          variant={sent ? 'outline' : 'primary'}
          size="sm"
          icon={sent
            ? <IconReport size={16} color={theme.greenAccent} />
            : <IconSend size={16} color={theme.white} />}
          onPress={openReport}
          fullWidth
        />
      )}
      {allDone && inline && composerOpen && (
        <DailyReportComposer
          key={`${trackId}:${date}`}
          trackId={trackId}
          date={date}
          onSent={() => setComposerOpen(false)}
        />
      )}
    </View>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    box: {
      gap: 10, padding: 12, borderRadius: 12, borderWidth: 1,
      borderColor: theme.border, backgroundColor: theme.card,
    },
    textRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    text: { flex: 1, fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  });
}
