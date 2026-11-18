import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { IconCircleCheck, IconRefresh, IconSend, IconX } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormSelect from '@/components/forms/FormSelect';
import FormInput from '@/components/forms/FormInput';
import FormTextarea from '@/components/forms/FormTextarea';
import { DailyReportActions, DailyReportSheet, ReportChangesBox, reportFileName, reportSheetHtml, reportText, toAr } from '@/components/domain/DailyReportCard';
import { useDailyReportDraft, useSendDailyReport, type DailyReport, type ReportLine } from '@/lib/queries/dailyReports';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { success, error as hapticError } from '@/lib/haptics';

type AppTheme = ReturnType<typeof useAppTheme>;
type ListKey = 'struggling' | 'absent' | 'excused';

const AREAS = ['الحفظ', 'المراجعة'];

const SECTIONS: { key: ListKey; icon: string; title: string; notePlaceholder: string }[] = [
  { key: 'struggling', icon: '⚠️', title: 'المتعثرون', notePlaceholder: 'ملاحظة (اختياري)' },
  { key: 'absent', icon: '❌', title: 'الغائبون', notePlaceholder: 'سبب الغياب — مثال: مريض' },
  { key: 'excused', icon: '🙋', title: 'المعتذرون', notePlaceholder: 'سبب الاعتذار' },
];

function LineEditor({ list, line, onChange, onRemove, notePlaceholder, s }: {
  list: ListKey; line: ReportLine; onChange: (l: ReportLine) => void; onRemove: () => void;
  notePlaceholder: string; s: ReturnType<typeof createS>;
}) {
  const theme = useAppTheme();
  const areas = (line.area ?? '').split('،').map((a) => a.trim()).filter(Boolean);
  const toggleArea = (a: string) => {
    const next = areas.includes(a) ? areas.filter((x) => x !== a) : [...areas, a];
    onChange({ ...line, area: next.join('، ') || undefined });
  };
  return (
    <View style={s.line}>
      <View style={s.lineHead}>
        <Text style={s.lineName}>{line.name}</Text>
        <Pressable style={s.remove} onPress={onRemove} accessibilityLabel={`إزالة ${line.name}`}>
          <IconX size={16} color={theme.textMuted} />
        </Pressable>
      </View>
      {list === 'struggling' && (
        <View style={s.chips}>
          {AREAS.map((a) => {
            const on = areas.includes(a);
            return (
              <Pressable key={a} style={[s.chip, on && s.chipOn]} onPress={() => toggleArea(a)}>
                <Text style={[s.chipText, on && s.chipTextOn]}>{a}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <FormInput
        value={line.note ?? ''}
        placeholder={notePlaceholder}
        maxLength={300}
        onChangeText={(t) => onChange({ ...line, note: t || undefined })}
      />
      {list === 'struggling' && areas.length === 0 && <Text style={s.warn}>اختر مجال التعثر</Text>}
    </View>
  );
}

/**
 * The daily report editor + preview + send button for one (track, date).
 * Pre-filled from that day's attendance/evaluations (or the already-sent report).
 */
export default function DailyReportComposer({ trackId, date, onSent, onGoRecord }: {
  trackId: string;
  date: string;
  onSent?: (r: DailyReport) => void;
  /** Shown as a link when nothing was recorded for the day yet. */
  onGoRecord?: () => void;
}) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const { data, isLoading, isError, error } = useDailyReportDraft(trackId || undefined, date);
  const send = useSendDailyReport();
  const [report, setReport] = useState<DailyReport | null>(null);

  // Start from the saved report when the day was already sent, else the draft.
  useEffect(() => {
    if (data) setReport(data.saved ?? data.draft);
  }, [data]);

  const listed = useMemo(() => {
    const set = new Set<string>();
    if (report) for (const k of ['struggling', 'absent', 'excused'] as ListKey[]) for (const l of report[k]) set.add(l.student);
    return set;
  }, [report]);
  const addable = (data?.students ?? []).filter((st) => !listed.has(st._id));

  const updateList = (k: ListKey, fn: (rows: ReportLine[]) => ReportLine[]) =>
    setReport((r) => (r ? { ...r, [k]: fn(r[k]) } : r));

  function submit() {
    if (!report) return;
    if (report.struggling.some((l) => !l.area)) {
      hapticError();
      toast.error('حدد مجال التعثر لكل طالب في قائمة المتعثرين');
      return;
    }
    const { struggling, absent, excused, presentCount, totalCount, notes } = report;
    send.mutate(
      { track: trackId, date, struggling, absent, excused, presentCount, totalCount, notes: notes?.trim() || undefined },
      {
        onSuccess: (saved) => {
          success();
          toast.success('تم إرسال التقرير للمشرف والإدارة');
          onSent?.(saved);
        },
        onError: (e) => {
          hapticError();
          toast.error((e as Error).message);
        },
      },
    );
  }

  if (isError) return <Alert variant="error">{(error as Error).message}</Alert>;
  if (isLoading || !report) return <SkeletonRows count={4} />;

  return (
    <View style={s.wrap}>
      {data?.saved && (
        <Alert variant="success" icon={<IconCircleCheck size={16} color={theme.tone.green.text} />}>
          أُرسل التقرير — يمكنك تعديله وإعادة الإرسال
        </Alert>
      )}
      {data?.saved?.changes && (
        <ReportChangesBox changes={data.saved.changes}>
          <Text style={[s.small, { color: theme.tone.gold.text }]}>
            عدّلت التقييم أو الحضور بعد إرسال التقرير — حدّث التقرير ثم أعد إرساله ليصل التعديل للمشرف والإدارة.
          </Text>
          <Button
            label="تحديث التقرير من التقييمات"
            variant="outline"
            size="sm"
            icon={<IconRefresh size={16} color={theme.text} />}
            onPress={() => setReport((r) => (r && data ? {
              ...r,
              struggling: data.draft.struggling,
              absent: data.draft.absent,
              excused: data.draft.excused,
              presentCount: data.draft.presentCount,
              totalCount: data.draft.totalCount,
            } : r))}
          />
        </ReportChangesBox>
      )}
      {data && !data.recorded && !data.saved && (
        <Alert variant="warning">
          <Text style={[s.small, { color: theme.tone.gold.text }]}>
            لم يُسجَّل الحضور والتقييم لهذا اليوم بعد، فالتقرير فارغ.
            {onGoRecord ? ' ' : ''}
            {onGoRecord && <Text style={s.link} onPress={onGoRecord}>سجّل الحضور والتقييم أولاً</Text>}
            {' '}أو أضف الطلاب يدوياً.
          </Text>
        </Alert>
      )}

      {SECTIONS.map((sec) => (
        <Card key={sec.key} style={s.section}>
          <Text style={s.secTitle}>{sec.icon} {sec.title} ({toAr(report[sec.key].length)})</Text>
          {addable.length > 0 && (
            <FormSelect
              value=""
              placeholder="+ إضافة طالب"
              title={`إضافة طالب إلى ${sec.title}`}
              options={addable.map((st) => ({ value: st._id, label: st.name }))}
              onChange={(id) => {
                const st = addable.find((x) => x._id === id);
                if (st) updateList(sec.key, (rows) => [...rows, { student: st._id, name: st.name }]);
              }}
            />
          )}
          {report[sec.key].length === 0 ? (
            <Text style={s.empty}>لا يوجد</Text>
          ) : (
            report[sec.key].map((line, i) => (
              <LineEditor
                key={line.student}
                list={sec.key}
                line={line}
                notePlaceholder={sec.notePlaceholder}
                s={s}
                onChange={(l) => updateList(sec.key, (rows) => rows.map((x, j) => (j === i ? l : x)))}
                onRemove={() => updateList(sec.key, (rows) => rows.filter((_, j) => j !== i))}
              />
            ))
          )}
        </Card>
      ))}

      <Card style={s.section}>
        <Text style={s.secTitle}>📝 ملاحظات عامة (اختياري)</Text>
        <FormTextarea
          rows={3}
          maxLength={1000}
          value={report.notes ?? ''}
          placeholder="أي ملاحظة للمشرف عن حلقة اليوم"
          onChangeText={(t) => setReport({ ...report, notes: t })}
        />
      </Card>


      <Button
        label={send.isPending ? 'جارٍ الإرسال…' : data?.saved ? 'تحديث التقرير' : 'إرسال التقرير للمشرف والإدارة'}
        icon={<IconSend size={16} color={theme.white} />}
        loading={send.isPending}
        disabled={send.isPending || !trackId}
        onPress={submit}
        haptic="medium"
        fullWidth
      />

      <Text style={s.previewLabel}>معاينة التقرير</Text>
      <DailyReportSheet report={report} />
      <DailyReportActions text={reportText(report)} title={reportFileName(report)} html={() => reportSheetHtml(report)} />
    </View>
  );
}

const createS = (theme: AppTheme) => StyleSheet.create({
  wrap: { gap: 12 },
  section: { gap: 10 },
  secTitle: { fontFamily: theme.fontCairoBold, fontSize: 14, color: theme.text },
  empty: { fontSize: 13, color: theme.textMuted },
  line: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineName: { flex: 1, fontFamily: theme.fontCairoBold, fontSize: 13, color: theme.text },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radiusSm, backgroundColor: theme.cardAlt },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.radiusFull,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardAlt,
  },
  chipOn: { backgroundColor: theme.tone.gold.bg, borderColor: theme.tone.gold.border },
  chipText: { fontSize: 13, color: theme.text },
  chipTextOn: { fontFamily: theme.fontCairoBold, color: theme.tone.gold.text },
  warn: { fontSize: 12, color: theme.tone.red.text },
  small: { fontSize: 13, lineHeight: 20 },
  link: { fontFamily: theme.fontCairoBold, textDecorationLine: 'underline' },
  previewLabel: { fontFamily: theme.fontCairoBold, fontSize: 13, color: theme.textMuted, marginTop: 8 },
});
