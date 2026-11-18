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
import { useQuranPlan, useDeleteQuranPlan, type QuranPlan, segmentReversed, isOpenPlan, isSlice } from '@/lib/queries/quranPlan';
import OpenWardLogSheet from '@/components/domain/OpenWardLogSheet';
import { isReversedRange, orientSlice, surahName } from '@/lib/quranRange';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

import { fmtDateShort } from '@/lib/date';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';

type AppTheme = ReturnType<typeof useAppTheme>;

const STATUS_VARIANT: Record<QuranPlan['status'], 'green' | 'gold' | 'gray'> = {
  'نشطة': 'green',
  'متوقفة': 'gold',
  'منتهية': 'gray',
};

function targetLabel(plan: QuranPlan): string {
  if (plan.targetType === 'track') return plan.track ? (typeof plan.track === 'object' ? plan.track.title : plan.track) : '—';
  return `${plan.students?.length ?? 0} طالب`;
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
    try {
      await deletePlan.mutateAsync(id);
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    setConfirmDelete(false);
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

        {!id && <Text style={s.muted}>لم يتم تحديد خطة</Text>}
        {!!id && !isLoading && !plan && <Text style={s.muted}>تعذّر العثور على الخطة</Text>}

        {plan && (() => {
          // Direction is per segment — orient today's ward by the type due.
          const assignments = plan.todayAssignments.filter(isSlice).map((a) => ({
            ...orientSlice(a, segmentReversed(plan, a.type)),
            type: a.type,
          }));
          // Open-ward days: due, but nothing fixed to show.
          const openDue = plan.todayAssignments.filter((a) => !isSlice(a)).map((a) => a.type);
          const openPlan = isOpenPlan(plan);
          const progressPct = plan.progress?.percent ?? 0;
          const progressLabel = plan.juzProgress ? `${plan.juzProgress.completed} / ${plan.juzProgress.total} جزء` : undefined;

          return (
            <>
              <Card>
                <View style={s.headRow}>
                  <Badge label={plan.status} variant={STATUS_VARIANT[plan.status]} />
                  <Text style={s.typeTag}>{plan.type}</Text>
                  {openPlan && <Badge label="ورد حر" variant="gold" />}
                </View>
                {!!plan.description && <Text style={s.infoValue}>{plan.description}</Text>}

                <View style={s.infoGrid}>
                  <View style={s.infoItem}>
                    <Text style={s.infoLabel}>الهدف</Text>
                    <Text style={s.infoValue}>{targetLabel(plan)}</Text>
                  </View>
                  <View style={s.infoItem}>
                    <Text style={s.infoLabel}>{plan.endType === 'date' ? 'ينتهي في' : 'عدد الأيام النشطة'}</Text>
                    <Text style={s.infoValue}>
                      {plan.endType === 'date'
                        ? fmtDateShort(plan.endDate)
                        : String(plan.activeDaysCount ?? '—')}
                    </Text>
                  </View>
                </View>

                {!!plan.progress && (
                <View style={{ marginTop: 12 }}>
                  <View style={s.progressHead}>
                    <Text style={s.progressLabel}>تقدّم الخطة</Text>
                    <Text style={s.progressValue}>{progressLabel ?? `${progressPct}%`}</Text>
                  </View>
                  <ProgressBar value={progressPct} showPercent={false} />
                  <Text style={s.progressSub}>
                    {plan.progress.completed} / {plan.progress.total} يوم ({plan.progress.percent}%)
                  </Text>
                </View>
                )}

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
                      {seg.rangeStart && seg.rangeEnd && seg.pageRange ? (<>
                      <View style={s.infoItem}>
                        <Text style={s.infoLabel}>عدد الصفحات</Text>
                        <Text style={s.infoValue}>
                          {seg.pageRange.pageCount === 1
                            ? `صفحة ${seg.pageRange.pageStart}`
                            : `${seg.pageRange.pageCount} (${seg.pageRange.pageStart}-${seg.pageRange.pageEnd})`}
                        </Text>
                      </View>
                      <View style={s.infoItem}>
                        <Text style={s.infoLabel}>من</Text>
                        <Text style={s.infoValue}>{surahName(seg.rangeStart.surahNumber)}:{seg.rangeStart.ayah}</Text>
                      </View>
                      <View style={s.infoItem}>
                        <Text style={s.infoLabel}>إلى</Text>
                        <Text style={s.infoValue}>{surahName(seg.rangeEnd.surahNumber)}:{seg.rangeEnd.ayah}</Text>
                      </View>
                      </>) : (
                      <View style={s.infoItem}>
                        <Text style={s.infoLabel}>الورد</Text>
                        <Text style={s.infoValue}>بدون مقطع محدد — يُسجَّل ما حفظه الطالب في الحلقة</Text>
                      </View>
                      )}
                    </View>
                  </View>
                ))}
              </Card>

              <Card>
                <CardHeader title="الجزء المطلوب اليوم" />
                <View style={[s.assignmentBox, { backgroundColor: assignments.length + openDue.length > 0 ? theme.greenPale : theme.cream }]}>
                  {openDue.map((type) => (
                    <Text key={type} style={s.assignmentText}>{type} · ورد حر — يُسجَّل في الحلقة</Text>
                  ))}
                  {assignments.map((a, idx) => (
                    <Text key={a.type} style={[s.assignmentText, (idx > 0 || openDue.length > 0) && { marginTop: 4 }]}>
                      {`${a.type} · `}
                      {surahName(a.surahStart)} : {a.ayahStart} — {surahName(a.surahEnd)} : {a.ayahEnd}
                      {` (صفحة ${a.pageStart}${a.pageEnd !== a.pageStart ? ` - ${a.pageEnd}` : ''})`}
                    </Text>
                  ))}
                  {assignments.length + openDue.length === 0 && (
                    <Text style={s.muted}>لا يوجد جزء مخصص لليوم</Text>
                  )}
                </View>
              </Card>

              {openPlan ? (
              <Card>
                <CardHeader title="سجل الورد" />
                <OpenWardLogSheet planId={plan._id} />
              </Card>
              ) : (<>
              <Card>
                <CardHeader title="تقسيم الأجزاء على الأيام" />
                {plan.schedule.length === 0 ? (
                  <Text style={[s.muted, { marginVertical: 20 }]}>لا يوجد جدول محسوب لهذه الخطة</Text>
                ) : (
                <SheetTriggerRow
                  label="عرض التوزيع اليومي"
                  value={`${plan.schedule.length} يوم`}
                  icon={<IconCalendarEvent size={17} color={theme.green} />}
                  onPress={() => setShowSchedule(true)}
                />
                )}
              </Card>

              <ScheduleSheet
                visible={showSchedule}
                onClose={() => setShowSchedule(false)}
                title="تقسيم الأجزاء على الأيام"
                items={scheduleItems(plan.schedule, (e) => segmentReversed(plan, e.type))}
              />
              </>)}

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
            </>
          );
        })()}
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title="حذف الخطة"
        message="ستُحذف الخطة نهائياً ولا يمكن التراجع."
        confirmLabel="حذف"
        pending={deletePlan.isPending}
        pendingLabel="جارٍ الحذف..."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
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
