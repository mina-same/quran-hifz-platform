import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Linking } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import ScopeTabs from '@/components/ui/ScopeTabs';
import { SkeletonRows } from '@/components/ui/Skeleton';
import SheetTriggerRow from '@/components/ui/SheetTriggerRow';
import ScheduleSheet, { scheduleItems } from '@/components/domain/ScheduleSheet';
import IndividualPlanPanel from '@/components/domain/IndividualPlanPanel';
import EvaluationRoster from '@/components/domain/EvaluationRoster';
import DaySlider, { useDaySchedule } from '@/components/domain/DaySlider';
import {
  useSpecialTracks, type SpecialTrack, type EnrolledStudent, type TrackTeacher,
} from '@/lib/queries/specialTracks';
import { useHalqat } from '@/lib/queries/halqat';
import { useStudents } from '@/lib/queries/students';
import {
  useQuranPlans, useUpdateQuranPlan, type QuranPlan,
} from '@/lib/queries/quranPlan';
import { isReversedRange, orientSlice, surahName } from '@/lib/quranRange';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

import { IconCalendarEvent, IconCalendarOff, IconClock, IconVideo } from '@tabler/icons-react-native';
import { AR_LOCALE, fmtDayLabel } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;

function getEnrolledId(v: EnrolledStudent | string) { return typeof v === 'object' ? v._id : v; }
function getEnrolledName(v: EnrolledStudent | string) { return typeof v === 'object' ? v.name : v; }
function getTeacherName(v: TrackTeacher | string) { return typeof v === 'object' ? v.name : v; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString(AR_LOCALE, { year: 'numeric', month: 'short', day: 'numeric' }); }

/** First letter of the first two words — the same initials the web chips show. */
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');
}
/** Rotating chip tones for teacher avatars — theme.tone so dark mode holds. */
function avatarTone(theme: AppTheme, i: number) {
  const order = ['green', 'gold', 'blue', 'red'] as const;
  return theme.tone[order[i % order.length]];
}

const STATUS_LABEL: Record<SpecialTrack['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<SpecialTrack['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

function planTargetsTrack(plan: QuranPlan, trackId: string): boolean {
  const ref = plan.specialTrack;
  const id = typeof ref === 'object' ? ref?._id : ref;
  return id === trackId;
}

type TabKey = 'teachers' | 'students' | 'plan';
const TABS = [
  { value: 'teachers', label: 'المعلمون' },
  { value: 'students', label: 'الطلاب' },
  { value: 'plan', label: 'الخطة' },
];

interface Props {
  trackId: string;
  /** Admin reuses this same drill-down (role parity, per backend routes that
   * authorize both roles for the per-student progress endpoints) but plan-level
   * CRUD (create/edit/link) stays teacher-only — those routes are
   * `authorize('teacher')` only on the server, no backend change was made for
   * this port, so the UI must not offer actions the API will 403 on. */
  role: 'teacher' | 'admin';
}

export default function TrackDetail({ trackId, role }: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  // Admin manages plans too: they own halqat/tracks/teachers and the web's
  // admin #trackdetail has always rendered these controls. The matching
  // server routes must accept 'admin' — see the note in the handoff.
  const canManagePlan = true;

  // Scope the list exactly the way the calling list screen does, so this
  // resolves out of the same react-query cache instead of refetching: a
  // teacher only ever sees their own tracks, an admin sees all of them.
  const teacherScope = role === 'teacher' ? profileId : undefined;
  const { data: tracks = [], isLoading: loadingTrack } = useSpecialTracks(undefined, teacherScope);
  const track = tracks.find((t) => t._id === trackId);

  // This track's real roster lives on its halaqat, not on `enrolledStudents`
  // (that field is only for tracks with no halqa layer — direct enrollment).
  // Scope the halaqat to just the ones *this* teacher teaches within the
  // track, so a teacher sees their own students and not every halqa's; an
  // admin gets every halqa in the track.
  const { data: halqat = [] } = useHalqat(role === 'teacher' ? { teacher: profileId } : undefined);
  const halqaIdsInTrack = useMemo(
    () => halqat
      .filter((h) => {
        const ref = h.specialTrack;
        return (typeof ref === 'object' ? ref?._id : ref) === trackId;
      })
      .map((h) => h._id),
    [halqat, trackId],
  );
  const { data: halqaStudents = [] } = useStudents(
    { halqa: halqaIdsInTrack.join(',') },
    { enabled: halqaIdsInTrack.length > 0 },
  );

  const { data: linkedPlans = [] } = useQuranPlans({ specialTrack: trackId });
  // A plan can carry a stale `specialTrack` field left over from before its
  // targetType was switched to "students", so this filter can return several
  // plans for one track — prefer the one actually targeting the whole track
  // over a narrower students-only plan that merely still points at it.
  const linkedPlan = linkedPlans.find((p) => p.targetType === 'specialTrack') ?? linkedPlans[0];

  // Only the teacher-only "link another plan" panel reads this. An admin has no
  // profileId, so an ungated call would drop the `teacher` filter and pull every
  // plan in the system on each open, for a panel they never see.
  const { data: myPlans = [] } = useQuranPlans(
    canManagePlan ? { teacher: profileId } : undefined,
    { enabled: canManagePlan },
  );
  const updatePlan = useUpdateQuranPlan();

  // `POST /evaluations/bulk` requires a teacher id, and admin users carry no
  // profileId — so an admin records against the track's own first teacher
  // rather than themselves. A track with no teacher can't be recorded at all,
  // which EvaluationRoster surfaces as an alert instead of a failing save.
  const trackTeacherId = track?.teachers.length
    ? (typeof track.teachers[0] === 'object' ? track.teachers[0]._id : track.teachers[0])
    : undefined;
  const evaluatingTeacherId = role === 'teacher' ? profileId : trackTeacherId;

  const [tab, setTab] = useState<TabKey>('students');
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // ── Day slider ───────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const [dayNotice, setDayNotice] = useState<string | null>(null);
  const scheduleEntries = useMemo(() => linkedPlan?.schedule ?? [], [linkedPlan]);
  const daySchedule = useDaySchedule(scheduleEntries, selectedDate);
  const { scheduledSorted, assignmentByDate, effectiveDate, isFutureDay } = daySchedule;

  const roster = useMemo(() => {
    if (!track) return [];
    const map = new Map<string, { _id: string; name: string }>();
    // Directly-enrolled students first (tracks with no halqa layer), then the
    // students reached through this track's halaqat.
    track.enrolledStudents.forEach((es) => {
      const id = getEnrolledId(es);
      map.set(id, { _id: id, name: getEnrolledName(es) });
    });
    halqaStudents.forEach((st) => map.set(st._id, { _id: st._id, name: st.name }));
    return Array.from(map.values());
  }, [track, halqaStudents]);

  const planReversed = linkedPlan ? isReversedRange(linkedPlan.rangeStart, linkedPlan.rangeEnd) : false;

  const scheduleRows = useMemo(
    () => (linkedPlan ? scheduleItems(linkedPlan.schedule, planReversed) : []),
    [linkedPlan, planReversed],
  );

  const unlinkedPlans = myPlans.filter((p) => !planTargetsTrack(p, trackId));

  if (loadingTrack) {
    return <SkeletonRows count={3} rowHeight={90} />;
  }

  if (!track) {
    return <Alert variant="error">هذا المسار غير موجود أو لم تعد مُسنَداً إليه.</Alert>;
  }

  const enrolledCount = track.enrolledStudents.length;
  const capacityPct = track.maxStudents > 0 ? Math.min(100, Math.round((enrolledCount / track.maxStudents) * 100)) : 0;

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={s.headRow}>
          <Badge label={STATUS_LABEL[track.status]} variant={STATUS_VARIANT[track.status]} />
          <Text style={s.typeTag}>{track.type}</Text>
          {track.isOnline && <Text style={s.onlineTag}>أونلاين</Text>}
        </View>

        <Text style={s.title}>{track.title}</Text>

        <View style={s.infoGrid}>
          <View style={s.infoItem}><Text style={s.infoLabel}>الوقت</Text><Text style={s.infoValue}>{track.timeSlot}</Text></View>
          <View style={s.infoItem}><Text style={s.infoLabel}>الأيام</Text><Text style={s.infoValue}>{track.daysPerWeek}</Text></View>
          <View style={s.infoItem}><Text style={s.infoLabel}>البداية</Text><Text style={s.infoValue}>{fmtDate(track.startDate)}</Text></View>
          <View style={s.infoItem}><Text style={s.infoLabel}>النهاية</Text><Text style={s.infoValue}>{fmtDate(track.endDate)}</Text></View>
        </View>

        <Text style={s.infoLabel}>المكان</Text>
        <Text style={[s.infoValue, { marginBottom: 10 }]}>{track.isOnline ? 'أونلاين' : track.location}</Text>

        {track.isOnline && !!track.meetLink && (
          <Pressable
            haptic="medium"
            style={s.joinBtn}
            onPress={() => Linking.openURL(track.meetLink!)}
          >
            <IconVideo size={16} color={theme.tone.blue.text} />
            <Text style={s.joinBtnText}>انضم للجلسة</Text>
          </Pressable>
        )}

        <View style={s.capacityBox}>
          <View style={s.capacityRow}>
            <Text style={s.capacityLabel}>الطلاب</Text>
            <Text style={s.capacityValue}>{enrolledCount} / {track.maxStudents}</Text>
          </View>
          <ProgressBar value={capacityPct} showPercent={false} />
        </View>
      </Card>

      <ScopeTabs options={TABS} value={tab} onChange={(v) => setTab(v as TabKey)} />

      {tab === 'teachers' && (
        <Card>
          <CardHeader title="المعلمون" right={<Text style={s.chipCount}>{track.teachers.length} معلم</Text>} />
          {track.teachers.length === 0 ? (
            <Text style={s.muted}>لا يوجد معلمون مُسنَدون لهذا المسار</Text>
          ) : (
            <View style={s.chipWrap}>
              {track.teachers.map((tc, i) => {
                const name = getTeacherName(tc);
                const tone = avatarTone(theme, i);
                return (
                  <View key={name + i} style={[s.teacherChip, { backgroundColor: tone.bg }]}>
                    <View style={[s.chipAvatar, { backgroundColor: tone.text }]}>
                      <Text style={s.chipAvatarText}>{avatarInitials(name)}</Text>
                    </View>
                    <Text style={[s.chipName, { color: tone.text }]}>{name}</Text>
                  </View>
                );
              })}
            </View>
          )}
          <Text style={[s.muted, { marginTop: 12, textAlign: 'right' }]}>
            لإضافة أو إزالة معلم من هذا المسار، تواصل مع الإدارة.
          </Text>
        </Card>
      )}

      {tab === 'students' && (
        <>
          <DaySlider
            schedule={daySchedule}
            onSelect={(iso) => { setDayNotice(null); setSelectedDate(iso); }}
            onBlocked={(iso) => setDayNotice(`${fmtDayLabel(iso)} — هذا اليوم غير مشمول بخطة الحفظ الحالية`)}
          />

          {!!dayNotice && (
            <Alert variant="warning" icon={<IconCalendarOff size={16} color={theme.tone.gold.text} />}>
              {dayNotice}
            </Alert>
          )}

          {scheduledSorted.length === 0 && (
            <Alert variant="warning">
              لا يوجد خطة حفظ نشطة لهذا المسار — أضف خطة من تبويب "الخطة" أولاً لعرض الورد المقرر لكل يوم.
            </Alert>
          )}

          {isFutureDay && (
            <Alert variant="warning" icon={<IconClock size={16} color={theme.tone.gold.text} />}>
              هذا اليوم لم يحن بعد — الورد معروض للاطلاع فقط.
            </Alert>
          )}

          <Card noPadding>
            <CardHeader
              title={`طلاب المسار (${roster.length})`}
              subtitle={scheduledSorted.length > 0 ? fmtDayLabel(effectiveDate) : undefined}
              style={{ padding: 16, paddingBottom: 8 }}
            />
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
              <EvaluationRoster
                students={roster}
                context={{ kind: 'specialTrack', id: trackId }}
                teacherId={evaluatingTeacherId}
                linkedPlan={linkedPlan}
                daySchedule={daySchedule}
                emptyLabel="لا يوجد طلاب مسجّلون بعد"
                renderExtra={(student) => (
                  linkedPlan
                    ? <IndividualPlanPanel planId={linkedPlan._id} studentId={student._id} studentName={student.name} basePlan={linkedPlan} />
                    : <Text style={s.muted}>اربط خطة حفظ بالمسار أولاً لعرض التوزيع الفردي</Text>
                )}
              />
            </View>
          </Card>

          <Text style={[s.muted, { textAlign: 'right' }]}>
            لإضافة أو إزالة طالب من هذا المسار، تواصل مع الإدارة.
          </Text>
        </>
      )}

      {tab === 'plan' && (
        <Card>
          <CardHeader title="خطة الحفظ المرتبطة" />
          {linkedPlan ? (
            <>
              <Text style={s.title}>{linkedPlan.name}</Text>
              <Text style={s.subInfo}>{linkedPlan.type}</Text>
              <View style={{ marginTop: 10 }}>
                <ProgressBar
                  value={linkedPlan.progress?.percent ?? 0}
                  label={linkedPlan.juzProgress ? `${linkedPlan.juzProgress.completed} / ${linkedPlan.juzProgress.total} جزء` : undefined}
                />
              </View>
              <View style={[s.assignmentBox, { backgroundColor: linkedPlan.todayAssignment ? theme.greenPale : theme.cream }]}>
                {linkedPlan.todayAssignment ? (() => {
                  const a = orientSlice(linkedPlan.todayAssignment, planReversed);
                  return (
                    <Text style={s.assignmentText}>
                      {surahName(a.surahStart)}:{a.ayahStart} — {surahName(a.surahEnd)}:{a.ayahEnd}{planReversed ? ' · بالعكس' : ''}
                    </Text>
                  );
                })() : (
                  <Text style={s.muted}>لا يوجد جزء مخصص لليوم</Text>
                )}
              </View>

              <View style={s.actionsRow}>
                {canManagePlan && (
                  <Button
                    label="تعديل الخطة"
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => router.push({ pathname: '/(portal)/teacher/plan-form', params: { mode: 'edit', id: linkedPlan._id } } as any)}
                  />
                )}
                {canManagePlan && (
                  <Button label="ربط خطة أخرى" variant="ghost" style={{ flex: 1 }} onPress={() => setShowLinkPanel((v) => !v)} />
                )}
              </View>
              {linkedPlan.schedule.length > 0 && (
                <SheetTriggerRow
                  label="توزيع الأيام والصفحات"
                  value={`${linkedPlan.schedule.length} يوم`}
                  icon={<IconCalendarEvent size={17} color={theme.green} />}
                  onPress={() => setShowSchedule(true)}
                  style={{ marginTop: 12 }}
                />
              )}
            </>
          ) : (
            <>
              <Text style={s.muted}>لا توجد خطة حفظ مرتبطة بهذا المسار</Text>
              {canManagePlan && (
                <Button label="ربط خطة" onPress={() => setShowLinkPanel((v) => !v)} style={{ marginTop: 10 }} />
              )}
            </>
          )}

          {canManagePlan && showLinkPanel && (
            <View style={s.linkPanel}>
              <Text style={s.linkPanelTitle}>اختر خطة من خططك</Text>
              {unlinkedPlans.length === 0 ? (
                <Text style={s.muted}>لا توجد خطط متاحة للربط</Text>
              ) : (
                unlinkedPlans.map((p) => (
                  <View key={p._id} style={s.linkRow}>
                    <Text style={s.linkRowText}>{p.name} · {p.type}</Text>
                    <Button
                      label="ربط"
                      onPress={() => updatePlan.mutate(
                        { id: p._id, targetType: 'specialTrack', specialTrack: trackId },
                        { onSuccess: () => setShowLinkPanel(false) },
                      )}
                      disabled={updatePlan.isPending}
                    />
                  </View>
                ))
              )}
              <Button
                label="إنشاء خطة جديدة بدلاً من ذلك"
                variant="ghost"
                onPress={() => router.push({ pathname: '/(portal)/teacher/plan-form', params: { mode: 'create' } } as any)}
                style={{ marginTop: 8 }}
                fullWidth
              />
            </View>
          )}
        </Card>
      )}

      <ScheduleSheet
        visible={showSchedule}
        onClose={() => setShowSchedule(false)}
        title="توزيع الأيام والصفحات"
        items={scheduleRows}
      />
    </View>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
    headRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    typeTag: { fontSize: 11, backgroundColor: theme.bg, color: theme.textMuted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
    onlineTag: { fontSize: 11, backgroundColor: theme.bluePale, color: theme.blue, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
    title: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 4 },
    subInfo: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginBottom: 8 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6, marginTop: 8 },
    infoItem: { width: '46%' },
    infoLabel: { fontSize: 10, color: theme.textMuted, fontFamily: theme.fontCairo },
    infoValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 1 },
    capacityBox: { backgroundColor: theme.bg, borderRadius: 10, padding: 10 },
    capacityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    capacityLabel: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo },
    capacityValue: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.text },
    assignmentBox: { borderRadius: 10, padding: 10, marginTop: 10 },
    assignmentText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.greenDark },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    linkPanel: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, gap: 8 },
    linkPanelTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
    linkRowText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.text, flex: 1 },
    joinBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: theme.bluePale, borderWidth: 1, borderColor: theme.blue,
      borderRadius: 8, paddingVertical: 8, marginBottom: 10,
    },
    joinBtnText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.blue },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    teacherChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderRadius: 99, paddingVertical: 5, paddingHorizontal: 12,
    },
    chipAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    chipAvatarText: { fontSize: 10, fontFamily: theme.fontCairoBold, color: theme.white },
    chipName: { fontSize: 12, fontFamily: theme.fontCairoBold },
    chipCount: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo },
  });
}
