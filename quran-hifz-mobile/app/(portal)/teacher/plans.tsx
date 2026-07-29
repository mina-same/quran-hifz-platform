import { useRouter } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconPlus } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useQuranPlans, type QuranPlan } from '@/lib/queries/quranPlan';
import { isReversedRange, orientSlice, surahName } from '@/lib/quranRange';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

const STATUS_VARIANT: Record<QuranPlan['status'], 'green' | 'gold' | 'gray'> = {
  'نشطة': 'green',
  'متوقفة': 'gold',
  'منتهية': 'gray',
};

function targetLabel(plan: QuranPlan): string {
  if (plan.targetType === 'halqa') {
    return typeof plan.halqa === 'object' ? plan.halqa?.name ?? '—' : '—';
  }
  if (plan.targetType === 'specialTrack') {
    return typeof plan.specialTrack === 'object' ? plan.specialTrack?.title ?? '—' : '—';
  }
  return `${plan.students?.length ?? 0} طالب محدد`;
}

function PlanCard({ plan, onPress }: { plan: QuranPlan; onPress: () => void }) {
  const reversed = isReversedRange(plan.rangeStart, plan.rangeEnd);
  const assignment = plan.todayAssignment ? orientSlice(plan.todayAssignment, reversed) : null;
  const progressPct = plan.progress?.percent ?? 0;
  const progressLabel = plan.juzProgress ? `${plan.juzProgress.completed} / ${plan.juzProgress.total} جزء` : undefined;

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={s.headRow}>
          <Badge label={plan.status} variant={STATUS_VARIANT[plan.status]} />
          <Text style={s.typeTag}>{plan.type}</Text>
        </View>

        <Text style={s.title}>{plan.name}</Text>
        <Text style={s.subInfo}>{targetLabel(plan)} · {plan.days.length} أيام أسبوعياً</Text>

        <View style={{ marginTop: 10 }}>
          <ProgressBar value={progressPct} label={progressLabel} />
        </View>

        <View style={s.assignmentBox}>
          {assignment ? (
            <Text style={s.assignmentText}>
              {surahName(assignment.surahStart)}:{assignment.ayahStart} — {surahName(assignment.surahEnd)}:{assignment.ayahEnd}
              {reversed ? ' · بالعكس' : ''}
            </Text>
          ) : (
            <Text style={s.muted}>لا يوجد جزء مخصص لليوم</Text>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

export default function TeacherPlans() {
  const router = useRouter();
  const profileId = usePortalStore((st) => st.authUser?.profileId);
  const { data: plans = [], isLoading, isRefetching, refetch } = useQuranPlans({ teacher: profileId });

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.green]} tintColor={theme.green} />}
      >
        <View style={s.topRow}>
          <Text style={s.pageTitle}>خطط الحفظ</Text>
          <Pressable
            style={s.addBtn}
            onPress={() => router.push({ pathname: '/(portal)/teacher/plan-form', params: { mode: 'create' } } as any)}
          >
            <IconPlus size={16} color={theme.white} />
            <Text style={s.addBtnText}>خطة جديدة</Text>
          </Pressable>
        </View>

        {isLoading && <SkeletonRows count={3} rowHeight={140} />}

        {!isLoading && plans.length === 0 && (
          <Text style={s.muted}>لا توجد خطط حفظ بعد</Text>
        )}

        {plans.map((p) => (
          <PlanCard
            key={p._id}
            plan={p}
            onPress={() => router.push({ pathname: '/(portal)/teacher/plan-detail', params: { id: p._id } } as any)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.green, borderRadius: theme.radiusSm, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 13 },
  muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
  headRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8, justifyContent: 'space-between' },
  typeTag: { fontSize: 11, backgroundColor: theme.bg, color: theme.textMuted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
  title: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
  subInfo: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginTop: 2 },
  assignmentBox: { backgroundColor: theme.greenPale, borderRadius: 10, padding: 10, marginTop: 10 },
  assignmentText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.greenDark },
});
