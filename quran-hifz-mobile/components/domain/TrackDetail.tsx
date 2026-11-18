import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Linking, Alert as RNAlert } from 'react-native';
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
import TrackDetailScheduleSheet, { type DayEditState } from '@/components/domain/TrackDetailScheduleSheet';
import { toast } from '@/components/ui/Toast';
import TeacherStudentPlanToggle from '@/components/domain/TeacherStudentPlanToggle';
import EvaluationRoster from '@/components/domain/EvaluationRoster';
import TrackStudentsPanel from '@/components/domain/TrackStudentsPanel';
import DailyReportPrompt from '@/components/domain/DailyReportPrompt';
import MessageParentsSheet from '@/components/domain/MessageParentsSheet';
import DaySlider, { useDaySchedule } from '@/components/domain/DaySlider';
import FormSelect from '@/components/forms/FormSelect';
import {
  useTracks, useAddTeacherToTrack, type Track, type TrackTeacher,
} from '@/lib/queries/tracks';
import { useTeachers } from '@/lib/queries/teachers';
import { useStudents } from '@/lib/queries/students';
import {
  useQuranPlans, useUpdateQuranPlan, segmentReversed, isOpenPlan, isSlice, type QuranPlan,
  useGenerateSchedule, useUpdateScheduleEntry,
} from '@/lib/queries/quranPlan';
import OpenWardLogSheet from '@/components/domain/OpenWardLogSheet';
import { planScheduleDays, planScheduleRange, resolveLinkedPlan, NO_PLAN_SCHEDULE_TEXT } from '@/lib/trackSchedule';
import { orientSlice, surahName } from '@/lib/quranRange';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

import { IconCalendarCheck, IconCalendarEvent, IconCalendarOff, IconCalendarStar, IconClock, IconLink, IconMessage2, IconPlus, IconUserPlus, IconVideo } from '@tabler/icons-react-native';
import { AR_LOCALE, fmtDayLabel } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;
type ScheduleEntry = QuranPlan['schedule'][number];

function getTeacherName(v: TrackTeacher | string) { return typeof v === 'object' ? v.name : v; }
function getTeacherId(v: TrackTeacher | string) { return typeof v === 'object' ? v._id : v; }
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

const STATUS_LABEL: Record<Track['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<Track['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

function planTargetsTrack(plan: QuranPlan, trackId: string): boolean {
  const ref = plan.track;
  const id = typeof ref === 'object' ? ref?._id : ref;
  return id === trackId;
}

/** Same rule as web's `planCoversStudent`: a students-targeted plan covers
 * only its listed students; a track plan covers the whole roster. */
function planCoversStudent(plan: QuranPlan, studentId: string): boolean {
  if (plan.targetType === 'students') {
    return (plan.students ?? []).some((s) => (typeof s === 'string' ? s : s._id) === studentId);
  }
  return true;
}

const DIRTY_DAY_EDIT_MSG =
  'لديك تعديل غير محفوظ على توزيع أحد الأيام — سيتم فقده إذا واصلت. هل تريد تجاهل التعديل والمتابعة؟';

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
  const readOnly = usePortalStore((s) => s.readOnly);
  // Admin manages plans too: they own halqat/tracks/teachers and the web's
  // admin #trackdetail has always rendered these controls. The matching
  // server routes must accept 'admin' — see the note in the handoff.
  // A supervisor (reusing this same screen) never manages plans — every
  // mutating route already 403s them server-side; this just hides the UI.
  const canManagePlan = !readOnly;
  // Editing / swapping the linked plan and moving students into the halqa are
  // the admin's call (web parity); teachers only see the plan and roster.
  const canChangePlan = role === 'admin' && !readOnly;

  // Scope the list exactly the way the calling list screen does, so this
  // resolves out of the same react-query cache instead of refetching: a
  // teacher only ever sees their own tracks, an admin sees all of them.
  const teacherScope = role === 'teacher' ? profileId : undefined;
  const { data: tracks = [], isLoading: loadingTrack } = useTracks(undefined, teacherScope);
  const track = tracks.find((t) => t._id === trackId);

  const { data: allTeachers = [] } = useTeachers();
  const addTeacherToTrack = useAddTeacherToTrack();
  const [addTeacherId, setAddTeacherId] = useState('');

  // `Student.track` is now the sole membership mechanism — the roster is a
  // direct query, no more halqa-mediated derivation.
  const { data: trackStudents = [] } = useStudents(
    { track: trackId },
    { enabled: !!track },
  );

  const { data: linkedPlans = [] } = useQuranPlans({ track: trackId });
  // A plan can carry a stale `track` field left over from before its
  // targetType was switched to "students" (see planCoversStudent above), so
  // useQuranPlans({track}) can return several plans for this track — prefer
  // the one actually targeting the whole track over a narrower students-only
  // plan that merely still points at it.
  const linkedPlan = resolveLinkedPlan(linkedPlans);

  // Only the teacher-only "link another plan" panel reads this. An admin has no
  // profileId, so an ungated call would drop the `teacher` filter and pull every
  // plan in the system on each open, for a panel they never see.
  const { data: myPlans = [], isLoading: loadingMyPlans } = useQuranPlans(
    canManagePlan ? { teacher: profileId } : undefined,
    { enabled: canManagePlan },
  );
  const updatePlan = useUpdateQuranPlan();
  const generateSchedule = useGenerateSchedule();

  // `POST /evaluations/bulk` requires a teacher id, and admin users carry no
  // profileId — so an admin records against the track's own first teacher
  // rather than themselves. A track with no teacher can't be recorded at all,
  // which EvaluationRoster surfaces as an alert instead of a failing save.
  const trackTeacherId = track?.teachers.length
    ? (typeof track.teachers[0] === 'object' ? track.teachers[0]._id : track.teachers[0])
    : undefined;
  const evaluatingTeacherId = role === 'teacher' ? profileId : trackTeacherId;

  // The plan form must be pushed from *this portal's* navigator. Sending an
  // admin to the teacher route asks the admin Tabs navigator for a screen it
  // does not own, which loops the root guard instead of failing cleanly.
  const planFormPath = role === 'admin'
    ? '/(portal)/admin/plan-form'
    : '/(portal)/teacher/plan-form';

  const [tab, setTab] = useState<TabKey>('students');
  // Only one of the plan tab's sections (link-another-plan / schedule) is open
  // at once — opening one closes the other (web parity).
  const [openPlanSection, setOpenPlanSectionState] = useState<'link' | 'schedule' | null>(null);
  // Mirrors `openPlanSection` synchronously: the sheet's onClose fires both on a
  // swipe and again after a programmatic dismiss, so it must be idempotent.
  const sectionRef = useRef<'link' | 'schedule' | null>(null);
  function setOpenPlanSection(v: 'link' | 'schedule' | null) {
    sectionRef.current = v;
    setOpenPlanSectionState(v);
  }
  const [showMessageParents, setShowMessageParents] = useState(false);

  // ── Day-split row editing (web: editingDay / dayRange* / dayPage* / dayJuz) ──
  const updateScheduleEntry = useUpdateScheduleEntry();
  const [editingDay, setEditingDay] = useState<ScheduleEntry | null>(null);
  const [dayEdit, setDayEdit] = useState<DayEditState>({
    rangeStart: { surahNumber: 1, ayah: 1 }, rangeEnd: { surahNumber: 1, ayah: 1 },
    pageStart: 1, pageEnd: 1, juz: 1,
  });
  const [dayError, setDayError] = useState('');

  function isDayEditDirty(): boolean {
    if (!editingDay) return false;
    return (
      dayEdit.rangeStart.surahNumber !== editingDay.surahStart ||
      dayEdit.rangeStart.ayah !== editingDay.ayahStart ||
      dayEdit.rangeEnd.surahNumber !== editingDay.surahEnd ||
      dayEdit.rangeEnd.ayah !== editingDay.ayahEnd ||
      dayEdit.pageStart !== editingDay.pageStart ||
      dayEdit.pageEnd !== editingDay.pageEnd ||
      dayEdit.juz !== editingDay.juz
    );
  }
  /** Web's `guardDiscardDayEdit` (window.confirm) as a native confirm: runs
   * `proceed` straight away when nothing would be lost, else only once the
   * teacher confirms discarding the unsaved day edit. */
  function guardDiscardDayEdit(proceed: () => void, onKeep?: () => void) {
    if (!isDayEditDirty()) { proceed(); return; }
    RNAlert.alert(DIRTY_DAY_EDIT_MSG, undefined, [
      { text: 'إلغاء', style: 'cancel', onPress: onKeep },
      { text: 'متابعة', style: 'destructive', onPress: proceed },
    ], { cancelable: false });
  }
  function togglePlanSection(section: 'link' | 'schedule') {
    guardDiscardDayEdit(() => {
      setOpenPlanSection(sectionRef.current === section ? null : section);
      setEditingDay(null);
    });
  }
  // First time anyone opens the schedule, freeze it into the DB automatically
  // so it's a real record from then on (web's handleScheduleToggle).
  function openSchedule() {
    guardDiscardDayEdit(() => {
      setOpenPlanSection('schedule');
      setEditingDay(null);
      if (linkedPlan && !linkedPlan.scheduleIsPersisted) {
        generateSchedule.mutate(linkedPlan._id, { onError: (e) => toast.error((e as Error).message) });
      }
    });
  }
  function closeSchedule() {
    if (sectionRef.current !== 'schedule') return;
    setOpenPlanSection(null);
    guardDiscardDayEdit(
      () => setEditingDay(null),
      // Kept editing → bring the sheet straight back with the edit intact.
      () => setOpenPlanSection('schedule'),
    );
  }
  function startEditDay(entry: ScheduleEntry) {
    if (editingDay && editingDay.occurrenceIndex === entry.occurrenceIndex && editingDay.type === entry.type) return;
    guardDiscardDayEdit(() => {
      setEditingDay(entry);
      setDayEdit({
        rangeStart: { surahNumber: entry.surahStart, ayah: entry.ayahStart },
        rangeEnd: { surahNumber: entry.surahEnd, ayah: entry.ayahEnd },
        pageStart: entry.pageStart,
        pageEnd: entry.pageEnd,
        juz: entry.juz,
      });
      setDayError('');
    });
  }
  function handleRegenerateSchedule() {
    if (!linkedPlan) return;
    guardDiscardDayEdit(() => {
      setEditingDay(null);
      generateSchedule.mutate(linkedPlan._id, { onError: (e) => toast.error((e as Error).message) });
    });
  }
  async function saveEditDay() {
    if (!linkedPlan || !editingDay) return;
    const { rangeStart, rangeEnd, pageStart, pageEnd, juz } = dayEdit;
    const startsBeforeEnd =
      rangeStart.surahNumber < rangeEnd.surahNumber ||
      (rangeStart.surahNumber === rangeEnd.surahNumber && rangeStart.ayah <= rangeEnd.ayah);
    if (!startsBeforeEnd) {
      setDayError('نقطة البداية يجب أن تسبق نقطة النهاية');
      return;
    }
    if (pageStart > pageEnd) {
      setDayError('صفحة البداية يجب أن تسبق صفحة النهاية');
      return;
    }
    setDayError('');
    try {
      await updateScheduleEntry.mutateAsync({
        id: linkedPlan._id,
        occurrenceIndex: editingDay.occurrenceIndex,
        surahStart: rangeStart.surahNumber,
        ayahStart: rangeStart.ayah,
        surahEnd: rangeEnd.surahNumber,
        ayahEnd: rangeEnd.ayah,
        pageStart,
        pageEnd,
        juz,
      });
      setEditingDay(null);
    } catch (e) {
      setDayError((e as Error).message);
    }
  }

  // ── Day slider ───────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const [dayNotice, setDayNotice] = useState<string | null>(null);
  const scheduleEntries = useMemo(() => linkedPlan?.schedule ?? [], [linkedPlan]);
  const daySchedule = useDaySchedule(scheduleEntries, selectedDate);
  const { scheduledSorted, effectiveDate, isFutureDay } = daySchedule;

  const roster = useMemo(
    () => trackStudents.map((st) => ({ _id: st._id, name: st.name })),
    [trackStudents],
  );

  const unlinkedPlans = myPlans.filter((p) => !planTargetsTrack(p, trackId));

  if (loadingTrack) {
    return <SkeletonRows count={3} rowHeight={90} />;
  }

  if (!track) {
    return <Alert variant="error">هذا المسار غير موجود أو لم تعد مُسنَداً إليه.</Alert>;
  }

  const enrolledCount = roster.length;
  const capacityPct = Math.min(100, Math.round((enrolledCount / track.maxStudents) * 100));
  const barClr = capacityPct >= 90 ? theme.tone.red.text : capacityPct >= 70 ? theme.tone.gold.text : theme.green;
  const openPlan = isOpenPlan(linkedPlan);

  function createNewPlan() {
    router.push({ pathname: planFormPath, params: { mode: 'create', trackId } } as any);
  }
  // Web's topbar «تسجيل الحضور» (takeAttendance): hands this track off to the
  // attendance page. Mobile has no admin attendance route, so an admin gets
  // the same roster in place — the الطلاب tab below embeds it.
  function takeAttendance() {
    guardDiscardDayEdit(() => {
      if (role === 'teacher') {
        router.push({ pathname: '/(portal)/teacher/attendance', params: { trackId, ts: String(Date.now()) } } as any);
      } else {
        setTab('students');
      }
    });
  }

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
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>الأيام</Text>
            <Text style={s.infoValue}>{linkedPlan ? (planScheduleDays(linkedPlan).join('، ') || '—') : NO_PLAN_SCHEDULE_TEXT}</Text>
          </View>
          <View style={[s.infoItem, { width: '100%' }]}>
            <Text style={s.infoLabel}>مدة الخطة</Text>
            <Text style={s.infoValue}>{(() => {
              const range = planScheduleRange(linkedPlan);
              if (!range) return NO_PLAN_SCHEDULE_TEXT;
              return range.endType === 'date'
                ? `${fmtDate(range.startDate)} — ${fmtDate(range.endDate)}`
                : `من ${fmtDate(range.startDate)} · ${range.activeDaysCount} يوم نشط`;
            })()}</Text>
          </View>
        </View>

        <Text style={s.infoLabel}>المسجد</Text>
        <Text style={[s.infoValue, { marginBottom: 10 }]}>{track.isOnline ? 'أونلاين' : (typeof track.masjid === 'object' ? track.masjid.name : track.masjid)}</Text>

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

        <Button
          label="تسجيل الحضور"
          fullWidth
          icon={<IconCalendarCheck size={16} color={theme.white} />}
          onPress={takeAttendance}
          style={{ marginTop: 10 }}
        />
      </Card>

      <ScopeTabs options={TABS} value={tab} onChange={(v) => guardDiscardDayEdit(() => setTab(v as TabKey))} />

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
          {!readOnly && (() => {
            const availableTeachers = allTeachers.filter(
              (t) => !track.teachers.some((tc) => getTeacherId(tc) === t._id),
            );
            return (
              <View style={s.addTeacherBox}>
                <View style={s.iconLabel}>
                  <IconUserPlus size={14} color={theme.green} />
                  <Text style={s.addTeacherLabel}>إضافة معلم إلى هذا المسار</Text>
                </View>
                <View style={s.row}>
                  <View style={s.flex1}>
                    <FormSelect
                      value={addTeacherId}
                      onChange={setAddTeacherId}
                      options={availableTeachers.map((t) => ({ value: t._id, label: t.name }))}
                      placeholder="— اختر معلماً —"
                    />
                  </View>
                  <Button
                    label="إضافة"
                    icon={<IconPlus size={15} color={theme.white} />}
                    loading={addTeacherToTrack.isPending}
                    onPress={async () => {
                      if (!addTeacherId) return;
                      try {
                        await addTeacherToTrack.mutateAsync({ id: track._id, teacherId: addTeacherId });
                        setAddTeacherId('');
                        toast.success('تمت إضافة المعلم');
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                    disabled={!addTeacherId || addTeacherToTrack.isPending}
                  />
                </View>
                {availableTeachers.length === 0 && (
                  <Text style={s.muted}>كل المعلمين المسجّلين مُسنَدون بالفعل لهذا المسار.</Text>
                )}
              </View>
            );
          })()}
        </Card>
      )}

      {tab === 'students' && (
        <>
          <Card>
            <CardHeader
              title="عدد الطلاب"
              right={<Text style={[s.capacityValue, { color: barClr }]}>{enrolledCount} / {track.maxStudents}</Text>}
            />
            {!readOnly && roster.length > 0 && (
              <Button
                label="مراسلة أولياء الأمور"
                variant="outline"
                size="sm"
                icon={<IconMessage2 size={15} color={theme.greenAccent} />}
                onPress={() => setShowMessageParents(true)}
                style={{ marginBottom: 10 }}
              />
            )}
            <TrackStudentsPanel track={track} canTransfer={role === 'admin'} />
          </Card>

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
              لا يوجد خطة حفظ نشطة لهذا المسار — لا يمكن تسجيل الحضور والتقييم قبل إضافة خطة. أضف خطة من تبويب "الخطة" أولاً لتفعيل التسجيل والتقويم.
            </Alert>
          )}

          {isFutureDay && (
            <Alert variant="warning" icon={<IconClock size={16} color={theme.tone.gold.text} />}>
              هذا اليوم لم يحن بعد — لا يمكن تسجيل الحضور والتقييم مسبقًا لجلسة لم تُعقد.
            </Alert>
          )}

          {!readOnly && (
            <DailyReportPrompt
              trackId={trackId}
              date={effectiveDate}
              studentIds={roster.map((st) => st._id)}
              disabled={isFutureDay}
              inline={role === 'admin'}
            />
          )}

          <Card noPadding>
            <CardHeader
              title="طلاب المسار"
              subtitle={fmtDayLabel(effectiveDate)}
              style={{ padding: 16, paddingBottom: 8 }}
            />
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
              <EvaluationRoster
                students={roster}
                context={{ id: trackId }}
                teacherId={evaluatingTeacherId}
                readOnly={readOnly}
                linkedPlan={linkedPlan}
                daySchedule={daySchedule}
                emptyLabel="لا يوجد طلاب مسجّلون بعد"
                noActivePlan={scheduledSorted.length === 0}
                renderExtra={(student) => (
                  linkedPlan && planCoversStudent(linkedPlan, student._id)
                    ? <TeacherStudentPlanToggle plan={linkedPlan} studentId={student._id} studentName={student.name} readOnly={readOnly} />
                    : !readOnly && (
                      <Button
                        label="أضف خطة للمسار"
                        variant="ghost"
                        size="sm"
                        icon={<IconPlus size={15} color={theme.green} />}
                        onPress={createNewPlan}
                      />
                    )
                )}
              />
            </View>
          </Card>
        </>
      )}

      {tab === 'plan' && (
        <Card>
          <CardHeader
            title="الخطة القرآنية"
            right={linkedPlan?.progress ? <Badge label={`${linkedPlan.progress.percent}%`} variant="green" /> : undefined}
          />
          {linkedPlan ? (
            <>
              <Text style={s.title}>{linkedPlan.name}</Text>
              {!!linkedPlan.progress && (
                <View style={{ marginTop: 6 }}>
                  <ProgressBar value={linkedPlan.progress.percent} showPercent={false} />
                  <Text style={s.subInfo}>
                    {linkedPlan.juzProgress ? `${linkedPlan.juzProgress.completed} / ${linkedPlan.juzProgress.total} جزء` : ''}
                    {' · '}
                    {linkedPlan.progress.completed} / {linkedPlan.progress.total} يوم
                  </Text>
                </View>
              )}
              <View style={[s.assignmentBox, { backgroundColor: linkedPlan.todayAssignments.length > 0 ? theme.greenPale : theme.cream }]}>
                <View style={[s.iconLabel, { marginBottom: linkedPlan.todayAssignments.length > 0 ? 4 : 0 }]}>
                  <IconCalendarStar size={14} color={linkedPlan.todayAssignments.length > 0 ? theme.green : theme.textMuted} />
                  <Text style={[s.todayLabel, { color: linkedPlan.todayAssignments.length > 0 ? theme.green : theme.textMuted }]}>
                    الجزء المطلوب اليوم
                  </Text>
                </View>
                {linkedPlan.todayAssignments.length > 0 ? linkedPlan.todayAssignments.map((entry, idx) => {
                  const prefix = linkedPlan.todayAssignments.length > 1 ? `${entry.type} · ` : '';
                  if (!isSlice(entry)) {
                    return (
                      <Text key={idx} style={[s.assignmentText, idx > 0 && { marginTop: 4 }]}>
                        {prefix}ورد حر — يُسجَّل في الحلقة
                      </Text>
                    );
                  }
                  const a = orientSlice(entry, segmentReversed(linkedPlan, entry.type));
                  return (
                    <Text key={idx} style={[s.assignmentText, idx > 0 && { marginTop: 4 }]}>
                      {prefix}
                      {surahName(a.surahStart)} : {a.ayahStart} — {surahName(a.surahEnd)} : {a.ayahEnd} (صفحة {a.pageStart}{a.pageEnd !== a.pageStart ? ` - ${a.pageEnd}` : ''})
                    </Text>
                  );
                }) : (
                  <Text style={s.subInfo}>لا يوجد جزء مخصص لليوم</Text>
                )}
              </View>

              {canChangePlan && (
                <View style={s.actionsRow}>
                  <Button
                    label="تعديل الخطة"
                    style={{ flex: 1 }}
                    onPress={() => router.push({ pathname: planFormPath, params: { mode: 'edit', id: linkedPlan._id } } as any)}
                  />
                  <Button
                    label={openPlanSection === 'link' ? 'إلغاء' : 'ربط خطة أخرى'}
                    variant="ghost"
                    style={{ flex: 1 }}
                    onPress={() => togglePlanSection('link')}
                  />
                </View>
              )}
              {!openPlan && linkedPlan.schedule.length > 0 && (
                <SheetTriggerRow
                  label="عرض توزيع الأيام والصفحات"
                  icon={<IconCalendarEvent size={17} color={theme.green} />}
                  onPress={openSchedule}
                  style={{ marginTop: 12 }}
                />
              )}
              {openPlan && (
                <View style={{ marginTop: 12 }}>
                  <OpenWardLogSheet planId={linkedPlan._id} />
                </View>
              )}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={s.emptyTitle}>لا توجد خطة حفظ مرتبطة بهذا المسار بعد</Text>
              <Text style={s.subInfo}>اربط خطة موجودة أو أنشئ خطة جديدة لتفعيل التقويم والتقييم</Text>
              {canManagePlan && (
                <Button
                  label={openPlanSection === 'link' ? 'إلغاء' : 'ربط خطة'}
                  onPress={() => togglePlanSection('link')}
                  style={{ marginTop: 10 }}
                />
              )}
            </View>
          )}

          {canManagePlan && openPlanSection === 'link' && (
            <View style={s.linkPanel}>
              <View style={s.iconLabel}>
                <IconLink size={14} color={theme.text} />
                <Text style={s.linkPanelTitle}>ربط خطة موجودة بـ"{track.title}"</Text>
              </View>
              {loadingMyPlans ? (
                <Text style={s.subInfo}>جارٍ التحميل...</Text>
              ) : unlinkedPlans.length === 0 ? (
                <Text style={s.subInfo}>لا توجد خطط أخرى يمكن ربطها بهذا المسار.</Text>
              ) : (
                unlinkedPlans.map((p) => (
                  <View key={p._id} style={s.linkRow}>
                    <View style={s.flex1}>
                      <Text style={s.linkRowName}>{p.name}</Text>
                      <Text style={s.subInfo}>{p.type}</Text>
                    </View>
                    <Button
                      size="sm"
                      label={updatePlan.isPending ? 'جارٍ الربط...' : 'ربط'}
                      onPress={() => updatePlan.mutate(
                        { id: p._id, targetType: 'track', track: trackId },
                        { onSuccess: () => setOpenPlanSection(null) },
                      )}
                      disabled={updatePlan.isPending}
                    />
                  </View>
                ))
              )}
              <Button
                label="إنشاء خطة جديدة بدلاً من ذلك"
                variant="ghost"
                icon={<IconPlus size={15} color={theme.text} />}
                onPress={() => { setOpenPlanSection(null); createNewPlan(); }}
                style={{ marginTop: 8 }}
                fullWidth
              />
            </View>
          )}
        </Card>
      )}

      {!readOnly && (
        <MessageParentsSheet
          visible={showMessageParents}
          onClose={() => setShowMessageParents(false)}
          trackId={trackId}
          students={roster}
        />
      )}

      {linkedPlan && !openPlan && (
        <TrackDetailScheduleSheet
          visible={openPlanSection === 'schedule'}
          onClose={closeSchedule}
          plan={linkedPlan}
          reversed={(e) => segmentReversed(linkedPlan, e.type)}
          canEdit={!readOnly}
          generating={generateSchedule.isPending}
          onRegenerate={handleRegenerateSchedule}
          editingDay={editingDay}
          edit={dayEdit}
          onEditChange={(patch) => setDayEdit((prev) => ({ ...prev, ...patch }))}
          onStartEdit={startEditDay}
          onSave={saveEditDay}
          onCancel={() => guardDiscardDayEdit(() => setEditingDay(null))}
          saving={updateScheduleEntry.isPending}
          dayError={dayError}
        />
      )}
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
    capacityValue: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.text },
    assignmentBox: { borderRadius: 10, padding: 10, marginTop: 10 },
    assignmentText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.greenDark },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    linkPanel: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, gap: 8 },
    linkPanelTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
    linkRowName: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    todayLabel: { fontSize: 11, fontFamily: theme.fontCairoBold },
    emptyTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, textAlign: 'center', marginBottom: 4 },
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
    row: { flexDirection: 'row', gap: 12, marginTop: 10, alignItems: 'center' },
    flex1: { flex: 1 },
    iconLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    addTeacherBox: {
      marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.border,
    },
    addTeacherLabel: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
  });
}
