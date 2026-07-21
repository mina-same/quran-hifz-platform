import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import ProgressBar from '@/components/ui/ProgressBar';
import ChildSelector from '@/components/domain/ChildSelector';
import { useSelectedChild } from '@/components/domain/useSelectedChild';
import { useChildHifz } from '@/lib/queries/parent';
import { theme } from '@/lib/theme';

export default function ParentDashboard() {
  const { selectedChildId, activeChild, hasNoChildren } = useSelectedChild();
  const { data: hifzEntries } = useChildHifz(selectedChildId ?? undefined);

  const childName = activeChild?.name ?? '—';
  const progressPct = activeChild?.progressPct ?? 0;
  const progressPages = activeChild?.progressPages ?? 0;
  const attendancePct = activeChild?.attendancePct ?? 0;
  const halqaName = activeChild
    ? typeof activeChild.halqa === 'object'
      ? activeChild.halqa.name
      : activeChild.halqa
    : '—';
  const totalJuz = hifzEntries ? Math.floor(progressPages / 20) : Math.round((progressPct / 100) * 30);

  const STATS = [
    { label: 'جزءاً محفوظاً', value: String(totalJuz), color: theme.green },
    { label: 'نسبة الحضور', value: `${attendancePct}٪`, color: theme.gold },
    { label: 'صفحة محفوظة', value: String(progressPages), color: theme.blue },
    { label: 'المسار', value: activeChild?.path ?? '—', color: theme.green },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <ChildSelector />

        {!selectedChildId ? (
          <View style={s.loading}>
            {hasNoChildren ? (
              <Text style={s.emptyText}>لم يتم اختيار طالب</Text>
            ) : (
              <ActivityIndicator color={theme.green} size="large" />
            )}
          </View>
        ) : (
          <>
            <AyahBar />
            <StatsRow stats={STATS} />

            <Card>
              <CardHeader title="خطة الحفظ الفردية" subtitle={`متابعة ${childName}`} />
              <Text style={s.pctNum}>{progressPct}٪</Text>
              <ProgressBar value={progressPct} showPercent={false} />
              <View style={s.row}>
                <Text style={s.key}>الحلقة</Text>
                <Text style={s.val}>{halqaName}</Text>
              </View>
            </Card>

            <Card>
              <CardHeader title="ملخص الأداء" />
              <View style={s.row}>
                <Text style={s.key}>الصفحات المحفوظة</Text>
                <Text style={s.val}>{progressPages}</Text>
              </View>
              <View style={[s.row, s.borderTop]}>
                <Text style={s.key}>نسبة الحضور</Text>
                <Text style={s.val}>{attendancePct}٪</Text>
              </View>
              <View style={[s.row, s.borderTop]}>
                <Text style={s.key}>الحلقة</Text>
                <Text style={s.val}>{halqaName}</Text>
              </View>
              <View style={[s.row, s.borderTop]}>
                <Text style={s.key}>المسار</Text>
                <Text style={s.val}>{activeChild?.path ?? '—'}</Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 16, gap: 14 },
  loading: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
  pctNum: { fontSize: 32, fontFamily: theme.fontCairoBold, color: theme.green, textAlign: 'center', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  borderTop: { borderTopWidth: 1, borderTopColor: theme.border },
  key: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
  val: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
});
