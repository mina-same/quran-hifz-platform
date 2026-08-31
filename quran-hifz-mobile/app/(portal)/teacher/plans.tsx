import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconPlus, IconPencil, IconCopy, IconTrash, IconSchool, IconCalendarEvent,
  IconUsers, IconCalendarWeek, IconBook, IconBook2, IconFiles, IconCalendarDue,
  IconProgress, IconCalendarStar,
} from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import IconButton from '@/components/ui/IconButton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Alert from '@/components/ui/Alert';
import { useQuranPlans, useDeleteQuranPlan, segmentReversed, type QuranPlan } from '@/lib/queries/quranPlan';
import { isReversedRange, orientSlice, surahName } from '@/lib/quranRange';
import { fmtDate } from '@/lib/date';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

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

function pointLabel(p: { surahNumber: number; ayah: number }) {
  return `${surahName(p.surahNumber)} : ${p.ayah}`;
}

/** One label/value line in the plan card's detail grid. */
function InfoRow({ icon, label, value, full }: {
  icon: React.ReactNode; label: string; value: string; full?: boolean;
}) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  return (
    <View style={[s.infoRow, full ? s.infoRowFull : s.infoRowHalf]}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function PlanCard({ plan, onPress, onEdit, onDuplicate, onDelete }: {
  plan: QuranPlan;
  onPress: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  // Direction is per segment — today's ward is oriented by the type due today.
  const assignment = plan.todayAssignment
    ? orientSlice(plan.todayAssignment, segmentReversed(plan, plan.todayAssignment.type))
    : null;
  const progressLabel = plan.juzProgress
    ? `${plan.juzProgress.completed} / ${plan.juzProgress.total} جزء`
    : `${plan.progress?.percent ?? 0}%`;

  const targetIcon = plan.targetType === 'halqa'
    ? <IconSchool size={15} color={theme.textMuted} />
    : plan.targetType === 'specialTrack'
      ? <IconCalendarEvent size={15} color={theme.textMuted} />
      : <IconUsers size={15} color={theme.textMuted} />;


  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={s.headRow}>
          <View style={s.headBadges}>
            <Badge label={plan.status} variant={STATUS_VARIANT[plan.status]} />
            {/* One chip per type — a plan can carry several, each on its own
                days and its own stretch of the mushaf. */}
            {plan.segments.map((seg) => (
              <Text key={seg.type} style={s.typeTag}>{seg.type}</Text>
            ))}
          </View>
          <View style={s.rowActions}>
            <IconButton onPress={onEdit} accessibilityLabel="تعديل الخطة">
              <IconPencil size={15} color={theme.text} />
            </IconButton>
            <IconButton onPress={onDuplicate} accessibilityLabel="نسخ الخطة">
              <IconCopy size={15} color={theme.text} />
            </IconButton>
            <IconButton tone="danger" onPress={onDelete} accessibilityLabel="حذف الخطة">
              <IconTrash size={15} color={theme.red} />
            </IconButton>
          </View>
        </View>

        <Text style={s.title}>{plan.name}</Text>
        {!!plan.description && <Text style={s.description}>{plan.description}</Text>}

        <View style={s.infoGrid}>
          <InfoRow icon={targetIcon} label="الهدف" value={targetLabel(plan)} />

          {plan.endType === 'date' && plan.endDate ? (
            <InfoRow icon={<IconCalendarDue size={15} color={theme.textMuted} />} label="ينتهي في" value={fmtDate(plan.endDate)} full />
          ) : (
            <InfoRow
              icon={<IconCalendarDue size={15} color={theme.textMuted} />}
              label="عدد الأيام النشطة"
              value={String(plan.activeDaysCount ?? '—')}
              full
            />
          )}
        </View>

        {!!plan.progress && (
          <View style={{ marginTop: 4 }}>
            <View style={s.progressHead}>
              <View style={s.progressLabelRow}>
                <IconProgress size={14} color={theme.textMuted} />
                <Text style={s.progressLabel}>تقدّم الخطة</Text>
              </View>
              <Text style={s.progressValue}>{progressLabel}</Text>
            </View>
            <ProgressBar value={plan.progress.percent} showPercent={false} />
            <Text style={s.progressSub}>
              {plan.progress.completed} / {plan.progress.total} يوم ({plan.progress.percent}%)
            </Text>
          </View>
        )}

        <View style={[s.assignmentBox, !assignment && { backgroundColor: theme.cream }]}>
          <View style={s.progressLabelRow}>
            <IconCalendarStar size={14} color={assignment ? theme.green : theme.textMuted} />
            <Text style={[s.assignmentLabel, !assignment && { color: theme.textMuted }]}>
              الجزء المطلوب اليوم{plan.todayAssignment ? ` · ${plan.todayAssignment.type}` : ''}
            </Text>
          </View>
          {assignment ? (
            <Text style={s.assignmentText}>
              {surahName(assignment.surahStart)}:{assignment.ayahStart} — {surahName(assignment.surahEnd)}:{assignment.ayahEnd}
              {plan.todayAssignment && segmentReversed(plan, plan.todayAssignment.type) ? ' · بالعكس' : ''}
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
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();
  const profileId = usePortalStore((st) => st.authUser?.profileId);
  const { data: plans = [], isLoading, isRefetching, refetch } = useQuranPlans({ teacher: profileId });
  const deletePlan = useDeleteQuranPlan();
  const [pendingDelete, setPendingDelete] = useState<QuranPlan | null>(null);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />}
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

        {deletePlan.isError && <Alert variant="error">{(deletePlan.error as Error).message}</Alert>}

        {!isLoading && plans.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.muted}>لا توجد خطط قرآنية بعد</Text>
            <Text style={s.mutedSm}>أنشئ أول خطة حفظ أو مراجعة لحلقتك أو لطلابك.</Text>
          </View>
        )}

        {plans.map((p) => (
          <PlanCard
            key={p._id}
            plan={p}
            onPress={() => router.push({ pathname: '/(portal)/teacher/plan-detail', params: { id: p._id } } as any)}
            onEdit={() => router.push({ pathname: '/(portal)/teacher/plan-form', params: { mode: 'edit', id: p._id } } as any)}
            onDuplicate={() => router.push({ pathname: '/(portal)/teacher/plan-form', params: { mode: 'duplicate', id: p._id } } as any)}
            onDelete={() => setPendingDelete(p)}
          />
        ))}
      </ScrollView>

      <ConfirmDialog
        visible={!!pendingDelete}
        title="حذف الخطة"
        message="ستُحذف الخطة نهائياً ولا يمكن التراجع."
        pending={deletePlan.isPending}
        pendingLabel="جارٍ الحذف..."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deletePlan.mutate(pendingDelete._id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    pageTitle: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.text },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.greenAccent, borderRadius: theme.radiusSm, paddingHorizontal: 14, paddingVertical: 10 },
    addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 13 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center' },
    headRow: { flexDirection: 'row', gap: 6, marginBottom: 8, justifyContent: 'space-between', alignItems: 'flex-start' },
    headBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
    rowActions: { flexDirection: 'row', gap: 6 },
    description: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginTop: 6 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 12, marginVertical: 12 },
    infoRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
    infoRowHalf: { width: '46%' },
    infoRowFull: { width: '100%' },
    infoLabel: { fontSize: 10, color: theme.textMuted, fontFamily: theme.fontCairo },
    infoValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 1 },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    progressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    progressLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    progressValue: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.green },
    progressSub: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 3 },
    assignmentLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.green },
    emptyBox: { alignItems: 'center', gap: 4, paddingVertical: 24 },
    mutedSm: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center' },
    segBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
    segTitle: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green, marginBottom: 6 },
    typeTag: { fontSize: 11, backgroundColor: theme.bg, color: theme.textMuted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
    title: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    subInfo: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginTop: 2 },
    assignmentBox: { backgroundColor: theme.greenPale, borderRadius: 10, padding: 10, marginTop: 12, gap: 4 },
    assignmentText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.greenDark },
  });
}
