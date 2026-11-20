import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowLeft, IconHistory, IconInfoCircle } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormSelect from '@/components/forms/FormSelect';
import FormDatePicker from '@/components/forms/FormDatePicker';
import { useGradeChanges } from '@/lib/queries/evaluations';
import { useTracks } from '@/lib/queries/tracks';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { todayIso } from '@/lib/date';

const ROLE: Record<string, string> = { teacher: 'المعلم', admin: 'المدير' };

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('ar', { day: 'numeric', month: 'long', timeZone: 'UTC', numberingSystem: 'latn' });
const timeOf = (iso: string) =>
  new Date(iso).toLocaleString('ar', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' });

/**
 * «سجل تعديل الدرجات» (web parity): grades / attendance changed AFTER the
 * halqa's daily report for that day was sent — who changed what, from → to.
 */
export default function AdminGradeChangesScreen() {
  const theme = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const today = todayIso();
  const [from, setFrom] = useState(todayIso(new Date(Date.now() - 6 * 86_400_000)));
  const [to, setTo] = useState(today);
  const [track, setTrack] = useState('');
  const { data: rows = [], isLoading, isError, error, refetch, isRefetching } = useGradeChanges({ from, to, track });
  const { data: tracks = [] } = useTracks('active');

  const trackOptions = useMemo(
    () => [
      { value: '', label: 'كل الحلقات' },
      ...[...tracks].sort((a, b) => a.title.localeCompare(b.title, 'ar')).map((t) => ({ value: t._id, label: t.title })),
    ],
    [tracks],
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Text style={s.title}>سجل تعديل الدرجات</Text>
        <View style={s.noteRow}>
          <IconInfoCircle size={15} color={theme.textMuted} />
          <Text style={s.note}>الدرجات والحضور التي عُدِّلت بعد إرسال التقرير اليومي للحلقة.</Text>
        </View>

        <Card style={s.filters}>
          <View style={s.dateRow}>
            <View style={s.dateCol}>
              <Text style={s.label}>من</Text>
              <FormDatePicker value={from} onChange={(v) => v && setFrom(v)} maximumDate={new Date(to)} />
            </View>
            <View style={s.dateCol}>
              <Text style={s.label}>إلى</Text>
              <FormDatePicker value={to} onChange={(v) => v && setTo(v)} minimumDate={new Date(from)} maximumDate={new Date(today)} />
            </View>
          </View>
          <FormSelect value={track} onChange={setTrack} options={trackOptions} placeholder="كل الحلقات" title="الحلقة" />
          <Text style={s.count}>{rows.length} تعديل</Text>
        </Card>

        {isError && <Alert variant="error">{(error as Error).message}</Alert>}

        {isLoading ? (
          <SkeletonRows count={4} />
        ) : rows.length === 0 ? (
          <Card style={s.empty}>
            <IconHistory size={22} color={theme.textMuted} />
            <Text style={s.emptyText}>لا توجد تعديلات بعد إرسال التقرير في هذه الفترة</Text>
          </Card>
        ) : (
          rows.map((r) => (
            <Card key={r._id} style={s.item}>
              <Text style={s.name}>{r.studentName || 'طالب'}</Text>
              <Text style={s.meta}>{r.trackTitle} · يوم {dayLabel(r.date)}</Text>
              <View style={s.changes}>
                {r.changes.map((c, i) => (
                  <View key={i} style={s.change}>
                    <Text style={s.changeLabel}>{c.label}:</Text>
                    <Text style={s.from}>{c.from}</Text>
                    <IconArrowLeft size={14} color={theme.textMuted} />
                    <Text style={s.to}>{c.to}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.meta}>
                عدّلها {ROLE[r.editedByRole] ?? ''} {r.editedByName} · {timeOf(r.createdAt)} · أُرسل التقرير {timeOf(r.reportSentAt)}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 12 },
    title: { fontFamily: theme.fontCairoBold, fontSize: 18, color: theme.text },
    noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    note: { flex: 1, fontFamily: theme.fontCairo, fontSize: 13, color: theme.textMuted },
    filters: { gap: 10 },
    dateRow: { flexDirection: 'row', gap: 10 },
    dateCol: { flex: 1, gap: 4 },
    label: { fontFamily: theme.fontCairoBold, fontSize: 13, color: theme.textMuted },
    count: { fontFamily: theme.fontCairoBold, fontSize: 13, color: theme.textMuted },
    empty: { alignItems: 'center', gap: 8, paddingVertical: 28 },
    emptyText: { fontFamily: theme.fontCairo, fontSize: 13, color: theme.textMuted, textAlign: 'center' },
    item: { gap: 6 },
    name: { fontFamily: theme.fontCairoBold, fontSize: 15, color: theme.text },
    meta: { fontFamily: theme.fontCairo, fontSize: 12, color: theme.textMuted },
    changes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, columnGap: 16 },
    change: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    changeLabel: { fontFamily: theme.fontCairoBold, fontSize: 13, color: theme.textMuted },
    from: { fontFamily: theme.fontCairoBold, fontSize: 13, color: theme.red, textDecorationLine: 'line-through' },
    to: { fontFamily: theme.fontCairoBold, fontSize: 13, color: theme.greenAccent },
  });
}
