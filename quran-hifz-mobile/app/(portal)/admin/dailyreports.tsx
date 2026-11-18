import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconAlertTriangle, IconChevronDown, IconChevronUp, IconClockExclamation, IconFileTypePdf } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Tile, { tileGridStyle } from '@/components/ui/Tile';
import ScopeTabs from '@/components/ui/ScopeTabs';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormSelect from '@/components/forms/FormSelect';
import {
  DailyReportCard, DailyReportCombinedCard, DailyReportDateBar, ReportChangesBox, reportSheetHtml, shareReportPdf, toAr,
} from '@/components/domain/DailyReportCard';
import { useDailyReports, type DailyReport } from '@/lib/queries/dailyReports';
import { useTracks, type Track } from '@/lib/queries/tracks';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { todayIso } from '@/lib/date';
import { error as hapticError } from '@/lib/haptics';

type AppTheme = ReturnType<typeof useAppTheme>;

function masjidOf(t: Track): { id: string; name: string } {
  return typeof t.masjid === 'string' ? { id: t.masjid, name: '' } : { id: t.masjid._id, name: t.masjid.name };
}

function teacherNamesOf(t: Track): string[] {
  return t.teachers.flatMap((x) => (typeof x === 'string' || !x.name ? [] : [x.name]));
}

/** One card per report — tap to expand the full sheet (web opens it in a modal). */
function ReportSummary({ report: r, open, onToggle, s }: {
  report: DailyReport; open: boolean; onToggle: () => void; s: ReturnType<typeof createS>;
}) {
  const theme = useAppTheme();
  const Chevron = open ? IconChevronUp : IconChevronDown;
  return (
    <Card style={s.item}>
      <Pressable onPress={onToggle} style={s.itemTap}>
        <View style={s.itemHead}>
          <Text style={s.itemTitle}>{r.trackTitle}</Text>
          <Chevron size={18} color={theme.textMuted} />
        </View>
        {r.changes && (
          <View style={s.edited}>
            <IconAlertTriangle size={14} color={theme.tone.gold.text} />
            <Text style={[s.small, { color: theme.tone.gold.text }]}>عُدّل بعد الإرسال</Text>
          </View>
        )}
        {(!!r.masjidName || !!r.teacherName) && (
          <Text style={s.muted}>{[r.masjidName, r.teacherName].filter(Boolean).join(' · ')}</Text>
        )}
        <View style={s.counts}>
          <Text style={[s.count, { color: theme.tone.green.text }]}>الحضور {toAr(r.presentCount)}/{toAr(r.totalCount)}</Text>
          <Text style={[s.count, !r.struggling.length && s.zero]}>⚠️ {toAr(r.struggling.length)}</Text>
          <Text style={[s.count, !r.absent.length && s.zero]}>❌ {toAr(r.absent.length)}</Text>
          <Text style={[s.count, !r.excused.length && s.zero]}>🙋 {toAr(r.excused.length)}</Text>
        </View>
      </Pressable>
      {open && (
        <View style={s.expanded}>
          {r.changes && <ReportChangesBox changes={r.changes} />}
          <DailyReportCard report={r} />
        </View>
      )}
    </Card>
  );
}

/**
 * «التقارير اليومية» — the supervisor's / admin's read-only view of the reports
 * teachers send after each session, by date. Supervisor scoping (gender)
 * happens on the server for both the reports and the track list.
 */
export default function AdminDailyReports() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [masjid, setMasjid] = useState('');
  const [teacher, setTeacher] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  // Only meaningful with a teacher picked: their reports side by side, or merged into one sheet.
  const [view, setView] = useState<'split' | 'combined'>('split');
  const { data: reports = [], isLoading, isError, error, refetch, isRefetching } = useDailyReports({ date });
  const { data: tracks = [], refetch: refetchTracks } = useTracks('active');
  const [pdfBusy, setPdfBusy] = useState(false);

  const masajid = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tracks) { const x = masjidOf(t); if (x.name) m.set(x.id, x.name); }
    return [...m].sort((a, b) => a[1].localeCompare(b[1], 'ar'));
  }, [tracks]);

  // Reports only carry the teacher's name, so the filter keys on names.
  const teachers = useMemo(() => {
    const names = new Set<string>();
    for (const t of tracks) for (const n of teacherNamesOf(t)) names.add(n);
    for (const r of reports) if (r.teacherName) names.add(r.teacherName);
    return [...names].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [tracks, reports]);

  const masjidName = masajid.find(([id]) => id === masjid)?.[1];
  const visible = reports.filter((r) =>
    (!masjid || r.masjidName === masjidName) && (!teacher || r.teacherName === teacher));
  const reportedTracks = new Set(reports.map((r) => r.track));
  const missing = tracks.filter((t) =>
    !reportedTracks.has(t._id)
    && (!masjid || masjidOf(t).id === masjid)
    && (!teacher || teacherNamesOf(t).includes(teacher)));
  const combined = !!teacher && view === 'combined';

  const totals = visible.reduce(
    (a, r) => ({ s: a.s + r.struggling.length, ab: a.ab + r.absent.length, ex: a.ex + r.excused.length }),
    { s: 0, ab: 0, ex: 0 },
  );

  async function downloadAll() {
    setPdfBusy(true);
    try {
      await shareReportPdf(`التقارير-اليومية-${date}`, visible.map(reportSheetHtml).join(''));
    } catch {
      hapticError();
      toast.error('تعذّر إنشاء ملف PDF');
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetch(); refetchTracks(); }}
            colors={[theme.spinner]}
            tintColor={theme.spinner}
          />
        }
      >
        <Text style={s.title}>التقارير اليومية للحلقات</Text>
        <DailyReportDateBar date={date} onChange={setDate} />
        {date !== today && <Button label="اليوم" variant="outline" size="sm" onPress={() => setDate(today)} />}
        <FormSelect
          value={masjid}
          onChange={setMasjid}
          title="تصفية حسب المسجد"
          options={[{ value: '', label: 'كل المساجد' }, ...masajid.map(([id, name]) => ({ value: id, label: name }))]}
        />
        <FormSelect
          value={teacher}
          onChange={setTeacher}
          title="تصفية حسب المعلم"
          options={[{ value: '', label: 'كل المعلمين' }, ...teachers.map((n) => ({ value: n, label: n }))]}
        />
        {!!teacher && (
          <ScopeTabs
            value={view}
            onChange={(v) => setView(v as 'split' | 'combined')}
            options={[
              { value: 'split', label: 'كل تقرير منفصل' },
              { value: 'combined', label: 'تقرير مجمّع' },
            ]}
          />
        )}
        {visible.length > 0 && !combined && (
          <Button
            label="تحميل الكل PDF"
            variant="outline"
            icon={<IconFileTypePdf size={16} color={theme.greenAccent} />}
            loading={pdfBusy}
            onPress={downloadAll}
          />
        )}

        <View style={tileGridStyle}>
          <Tile label={`تقرير مُرسل من ${toAr(visible.length + missing.length)} حلقة`} value={toAr(visible.length)} />
          <Tile label="⚠️ متعثرون" value={toAr(totals.s)} color={theme.tone.gold.text} />
          <Tile label="❌ غائبون" value={toAr(totals.ab)} color={theme.tone.red.text} />
          <Tile label="🙋 معتذرون" value={toAr(totals.ex)} color={theme.tone.blue.text} />
        </View>

        {isError && <Alert variant="error">{(error as Error).message}</Alert>}

        {missing.length > 0 && (
          <Card style={s.missing}>
            <View style={s.missingHead}>
              <IconClockExclamation size={16} color={theme.tone.red.text} />
              <Text style={s.bold}>لم تُرسل تقريرها بعد ({toAr(missing.length)})</Text>
            </View>
            <View style={s.pills}>
              {missing.map((t) => (
                <View key={t._id} style={s.pill}>
                  <Text style={s.small}>{t.title}{masjidOf(t).name ? ` — ${masjidOf(t).name}` : ''}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {isLoading ? (
          <SkeletonRows count={3} />
        ) : visible.length === 0 ? (
          <Alert variant="info">لا توجد تقارير مرسلة في هذا اليوم</Alert>
        ) : combined ? (
          <DailyReportCombinedCard teacher={teacher} date={date} reports={visible} pending={missing.map((t) => t.title)} />
        ) : (
          visible.map((r) => {
            const id = r._id ?? r.track;
            return (
              <ReportSummary
                key={id}
                report={r}
                s={s}
                open={openId === id}
                onToggle={() => setOpenId(openId === id ? null : id)}
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createS = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 12 },
  title: { fontFamily: theme.fontCairoBold, fontSize: 18, color: theme.text },
  item: { gap: 10 },
  itemTap: { gap: 6 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { flex: 1, fontFamily: theme.fontCairoBold, fontSize: 15, color: theme.text },
  edited: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  count: { fontFamily: theme.fontCairoBold, fontSize: 13, color: theme.text },
  zero: { opacity: 0.4 },
  expanded: { gap: 10 },
  missing: { gap: 8 },
  missingHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: theme.cardAlt, borderRadius: theme.radiusFull, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.border },
  bold: { fontFamily: theme.fontCairoBold, fontSize: 13, color: theme.text },
  small: { fontSize: 12, color: theme.text },
  muted: { fontSize: 12, color: theme.textMuted },
});
