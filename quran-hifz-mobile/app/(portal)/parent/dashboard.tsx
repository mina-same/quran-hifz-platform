import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import ProgressBar from '@/components/ui/ProgressBar';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import ChildSelector from '@/components/domain/ChildSelector';
import { useParentChildren, useChildHifz } from '@/lib/queries/parent';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

// Static content — same list as web's ParentDashboard NOTIFICATIONS.
const NOTIFICATIONS = [
  { date: 'اليوم', text: 'أرسل الواجب اليومي بنجاح ✓' },
  { date: 'أمس',   text: 'تقييم الأستاذ: ممتاز' },
  { date: 'الأحد', text: 'حضر حلقة الفجر ✓' },
  { date: 'السبت', text: 'الواجب القادم: مراجعة' },
];

export default function ParentDashboard() {
  const theme = useAppTheme();
  const selectedChildId = usePortalStore((s) => s.selectedChildId);
  const {
    data: children = [],
    isLoading: childrenLoading,
    isRefetching: childrenRefetching,
    refetch: refetchChildren,
  } = useParentChildren();
  const childId = selectedChildId ?? children[0]?._id;
  const child = children.find((c) => c._id === childId);

  const { data: hifzEntries, isRefetching: hifzRefetching, refetch: refetchHifz } = useChildHifz(childId);

  const isLoading = childrenLoading;
  const isRefetching = childrenRefetching || hifzRefetching;
  const onRefresh = () => {
    refetchChildren();
    refetchHifz();
  };

  const progressPct = child?.progressPct ?? 0;
  const progressPages = child?.progressPages ?? 0;
  const attendancePct = child?.attendancePct ?? 0;
  const trackName = child ? (typeof child.track === 'object' ? child.track.title : child.track) : '—';
  const totalJuz = hifzEntries ? Math.floor(progressPages / 20) : Math.round((progressPct / 100) * 30);
  const level = progressPct >= 80 ? 'نجم ⭐' : progressPct >= 50 ? 'متميز' : 'ناشط';

  const STATS = [
    { label: 'جزءاً محفوظاً', value: String(totalJuz), color: theme.green },
    { label: 'نسبة الحضور', value: `${attendancePct}٪`, color: theme.gold },
    { label: 'نقطة مكتسبة', value: String(progressPages), color: theme.blue },
    { label: 'المستوى', value: level, color: theme.green },
  ];

  const childName = child?.name;

  const s = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.cream },
    page: { padding: 16, gap: 14 },
    goalLabel: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center' },
    pctNum: { fontSize: 36, fontFamily: theme.fontCairoBold, color: theme.green, textAlign: 'center', marginTop: 2, marginBottom: 8 },
    juzBadgeWrap: { alignItems: 'center', marginTop: 10, marginBottom: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.border },
    key: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
    val: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    notifRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
    borderTop: { borderTopWidth: 1, borderTopColor: theme.border },
    day: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, minWidth: 42 },
    notifText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.text, flex: 1 },
  }), [theme]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.spinner} colors={[theme.spinner]} />
        }
      >
        <AyahBar />
        {/* The switcher the web puts in its topbar ("تغيير الابن"). It hides
            itself for a single-child parent and auto-selects that child. */}
        <ChildSelector />
        {isLoading ? (
          <SkeletonRows count={4} rowHeight={64} />
        ) : (
          <StatsRow stats={STATS} />
        )}
        <Card>
          <CardHeader title="خطة الحفظ الفردية" subtitle={childName ? `متابعة ${childName}` : undefined} />
          {isLoading ? (
            <SkeletonRows count={3} rowHeight={28} />
          ) : (
            <>
              <Text style={s.goalLabel}>التقدم نحو هدف السنة: ٣٠ جزءاً</Text>
              <Text style={s.pctNum}>{Math.round(progressPct)}٪</Text>
              <ProgressBar value={progressPct} showPercent={false} />
              <View style={s.juzBadgeWrap}>
                <Badge label={`${totalJuz} جزء من ٣٠`} variant="green" />
              </View>
              {[['المسار', trackName], ['الجلسة القادمة', 'الثلاثاء بعد الفجر']].map(([k, v]) => (
                <View key={k} style={s.row}>
                  <Text style={s.key}>{k}</Text>
                  <Text style={s.val}>{v}</Text>
                </View>
              ))}
            </>
          )}
        </Card>
        <Card>
          <CardHeader title="آخر الإشعارات" />
          {NOTIFICATIONS.map((n, i) => (
            <View key={i} style={[s.notifRow, i > 0 && s.borderTop]}>
              <Text style={s.day}>{n.date}</Text>
              <Text style={s.notifText}>{n.text}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
