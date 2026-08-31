import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowRight, IconCalendarEvent } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import SheetTriggerRow from '@/components/ui/SheetTriggerRow';
import ScheduleSheet, { scheduleItems } from '@/components/domain/ScheduleSheet';
import { useQuranPlan, useDeleteQuranPlan, type QuranPlan, segmentReversed } from '@/lib/queries/quranPlan';
import { isReversedRange, orientSlice, surahName } from '@/lib/quranRange';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

import { AR_LOCALE } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;

const STATUS_VARIANT: Record<QuranPlan['status'], 'green' | 'gold' | 'gray'> = {
  'نشطة': 'green',
  'متوقفة': 'gold',
  'منتهية': 'gray',
};

function targetLabel(plan: QuranPlan): string {
  if (plan.targetType === 'halqa') return typeof plan.halqa === 'object' ? plan.halqa?.name ?? '—' : '—';
  if (plan.targetType === 'specialTrack') return typeof plan.specialTrack === 'object' ? plan.specialTrack?.title ?? '—' : '—';
  return `${plan.students?.length ?? 0} طالب محدد`;
}

export default function TeacherPlanDetail() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: plan, isLoading, isRefetching, refetch } = useQuranPlan(id);
  const deletePlan = useDeleteQuranPlan();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  async function handleDelete() {
    if (!id) return;
    await deletePlan.mutateAsync(id);
    router.back();
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <IconArrowRight size={22} color={theme.text} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{plan?.name ?? 'تفاصيل الخطة'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        {isLoading && <SkeletonRows count={3} rowHeight={80} />}

        {!isLoading && !plan && <Text style={s.muted}>تعذّر العثور على الخطة</Text>}

        {plan && (() => {
          // Direction is per segment — orient today's ward by the type due.
          const reversed = segmentReversed(plan, plan.todayAssignment?.type);
          const assignment = plan.todayAssignment ? orientSlice(plan.todayAssignment, reversed) : null;
          const progressPct = plan.progress?.percent ?? 0;
          const progressLabel = plan.juzProgress ? `${plan.juzProgress.completed} / ${plan.juzProgress.total} جزء` : undefined;

          return (
            <>
              <Card>
                <View style={s.headRow}>
                  <Badge label={plan.status} variant={STATUS_VARIANT[plan.status]} />
                  {plan.segments.map((seg) => (
                    <Text key={seg.type} style={s.typeTag}>{seg.type}</Text>
                  ))}
                </View>

                <View style={s.infoGrid}>
                  <View style={s.infoItem}>
                    <Text style={s.infoLabel}>الهدف</Text>
                    <Text style={s.infoValue}>{targetLabel(plan)}</Text>
                  </View>
                  <View style={s.infoItem}>
                    <Text style={s.infoLabel}>{plan.endType === 'date' ? 'ينتهي في' : 'عدد الأيام النشطة'}</Text>
                    <Text style={s.infoValue}>
                      {plan.endType === 'date'
                        ? (plan.endDate ? new Date(plan.endDate).toLocaleDateString(AR_LOCALE) : '—')
                        : (plan.activeDaysCount ?? '—')}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <View style={s.progressHead}>
                    <Text style={s.progressLabel}>تقدّم الخطة</Text>
                    <Text style={s.progressValue}>{progressLabel ?? `${progressPct}%`}</Text>
                  </View>
                  <ProgressBar value={progressPct} showPercent={false} />
                  {!!plan.progress && (
                    <Text style={s.progressSub}>
                      {plan.progress.completed} / {plan.progress.total} يوم ({plan.progress.percent}%)
                    </Text>
                  )}
                </View>

                {/* One block per type: its own days, its own range, its own
                    page count — independent divisions of different content
                    over the plan's one shared window. */}
                {plan.segments.map((seg) => (
                  <View key={seg.type} style={s.segBlock}>
                    <Text style={s.segTitle}>{seg.type}</Text>
                    <View style={s.infoGrid}>
                      <View style={s.infoItem}>
                        <Text style={s.infoLabel}>الأيام</Text>
                        <Text style={s.infoValue}>{seg.days.join('، ')}</Text>
                      </View>
                      <View style={s.infoItem}>
                        <Text style={s.infoLabel}>عدد الصفحات</Text>
                        <Text style={s.infoValue}>{seg.pageRange.pageCount}</Text>
                      </View>
                      <View style={s.infoItem}>
                        <Text style={s.infoLabel}>من</Text>
                        <Text style={s.infoValue}>{surahName(seg.rangeStart.surahNumber)}:{seg.rangeStart.ayah}</Text>
                      </View>
                      <View style={s.infoItem}>
                        <Text style={s.infoLabel}>إلى</Text>
                        <Text style={s.infoValue}>{surahName(seg.rangeEnd.surahNumber)}:{seg.rangeEnd.ayah}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>

              <Card>
                <CardHeader title="الورد المقرر اليوم" />
                <View style={[s.assignmentBox, { backgroundColor: assignment ? theme.greenPale : theme.cream }]}>
                  {assignment ? (
                    <Text style={s.assignmentText}>
                      {surahName(assignment.surahStart)}:{assignment.ayahStart} — {surahName(assignment.surahEnd)}:{assignment.ayahEnd}
                    </Text>
                  ) : (
                    <Text style={s.muted}>لا يوجد جزء مخصص لليوم</Text>
                  )}
                </View>
              </Card>

              <Card>
                <CardHeader title="تقسيم الأجزاء على الأيام" />
                <SheetTriggerRow
                  label="عرض التوزيع اليومي"
                  value={`${plan.schedule.length} يوم`}
                  icon={<IconCalendarEvent size={17} color={theme.green} />}
                  onPress={() => setShowSchedule(true)}
                  disabled={plan.schedule.length === 0}
                />
              </Card>

              <ScheduleSheet
                visible={showSchedule}
                onClose={() => setShowSchedule(false)}
                title="تقسيم الأجزاء على الأيام"
                items={scheduleItems(plan.schedule, (e) => segmentReversed(plan, e.type))}
              />

              {!confirmDelete ? (
                <View style={s.actionsRow}>
                  <Button
                    label="تعديل"
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => router.push({ pathname: '/(portal)/teacher/plan-form', params: { mode: 'edit', id: plan._id } } as any)}
                  />
                  <Button
                    label="نسخ"
                    variant="ghost"
                    style={{ flex: 1 }}
                    onPress={() => router.push({ pathname: '/(portal)/teacher/plan-form', params: { mode: 'duplicate', id: plan._id } } as any)}
                  />
                  <Button label="حذف" variant="danger" style={{ flex: 1 }} onPress={() => setConfirmDelete(true)} />
                </View>
              ) : (
                <Card>
                  <Text style={s.confirmText}>هل أنت متأكد من حذف هذه الخطة؟ لا يمكن التراجع عن هذا الإجراء.</Text>
                  <View style={s.actionsRow}>
                    <Button label="إلغاء" variant="ghost" style={{ flex: 1 }} onPress={() => setConfirmDelete(false)} />
                    <Button
                      label={deletePlan.isPending ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
                      variant="danger"
                      style={{ flex: 1 }}
                      disabled={deletePlan.isPending}
                      onPress={handleDelete}
                    />
                  </View>
                </Card>
              )}
            </>
          );
        })()}
      </ScrollView>
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    // No background and no divider: the header sits directly on the page surface
    // rather than reading as a separate white bar over it.
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    headerTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text, flex: 1, textAlign: 'center' },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    headRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    segBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
    segTitle: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green, marginBottom: 8 },
    typeTag: { fontSize: 11, backgroundColor: theme.bg, color: theme.textMuted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    infoItem: { width: '46%' },
    infoLabel: { fontSize: 10, color: theme.textMuted, fontFamily: theme.fontCairo },
    infoValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 1 },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    progressLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    progressValue: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.green },
    progressSub: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 3 },
    assignmentBox: { borderRadius: 10, padding: 12 },
    assignmentText: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.greenDark },
    actionsRow: { flexDirection: 'row', gap: 10 },
    confirmText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text, textAlign: 'center', marginBottom: 12 },
  });
}
