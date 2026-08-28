import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import SheetTriggerRow from '@/components/ui/SheetTriggerRow';
import ScheduleSheet, { scheduleItems } from '@/components/domain/ScheduleSheet';
import IndividualPlanPanel from '@/components/domain/IndividualPlanPanel';
import {
  useSpecialTracks, type SpecialTrack, type EnrolledStudent, type TrackTeacher,
} from '@/lib/queries/specialTracks';
import { useStudents } from '@/lib/queries/students';
import {
  useQuranPlans, useUpdateQuranPlan, useStudentPlanProgressList, type QuranPlan,
} from '@/lib/queries/quranPlan';
import { isReversedRange, isReversedSchedule, orientSlice, surahName } from '@/lib/quranRange';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';
import { IconCalendarEvent } from '@tabler/icons-react-native';

function getEnrolledId(v: EnrolledStudent | string) { return typeof v === 'object' ? v._id : v; }
function getEnrolledName(v: EnrolledStudent | string) { return typeof v === 'object' ? v.name : v; }
function getTeacherName(v: TrackTeacher | string) { return typeof v === 'object' ? v.name : v; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }); }

function isSameLocalDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

const STATUS_LABEL: Record<SpecialTrack['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<SpecialTrack['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

function planTargetsTrack(plan: QuranPlan, trackId: string): boolean {
  const ref = plan.specialTrack;
  const id = typeof ref === 'object' ? ref?._id : ref;
  return id === trackId;
}

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
  const router = useRouter();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const canManagePlan = role === 'teacher';

  const { data: tracks = [], isLoading: loadingTrack } = useSpecialTracks();
  const track = tracks.find((t) => t._id === trackId);

  const { data: allStudents = [] } = useStudents();
  const { data: linkedPlans = [] } = useQuranPlans({ specialTrack: trackId });
  const linkedPlan = linkedPlans[0];

  const { data: myPlans = [] } = useQuranPlans({ teacher: profileId });
  const updatePlan = useUpdateQuranPlan();

  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const roster = useMemo(() => {
    if (!track) return [];
    const map = new Map<string, { _id: string; name: string }>();
    track.enrolledStudents.forEach((es) => {
      const id = getEnrolledId(es);
      map.set(id, { _id: id, name: getEnrolledName(es) });
    });
    allStudents.forEach((st) => {
      const h = st.halqa;
      const trackRef = typeof h === 'object' ? h.specialTrack : undefined;
      const linkedTrackId = typeof trackRef === 'object' ? trackRef?._id : trackRef;
      if (linkedTrackId === trackId) map.set(st._id, { _id: st._id, name: st.name });
    });
    return Array.from(map.values());
  }, [track, allStudents, trackId]);

  const progressByStudent = useStudentPlanProgressList(linkedPlan?._id, roster.map((r) => r._id));

  const planReversed = linkedPlan ? isReversedRange(linkedPlan.rangeStart, linkedPlan.rangeEnd) : false;

  const scheduleRows = useMemo(
    () => (linkedPlan ? scheduleItems(linkedPlan.schedule, planReversed) : []),
    [linkedPlan, planReversed],
  );

  function assignmentForStudent(studentId: string) {
    const p = progressByStudent[studentId];
    if (p?.progressIsPersisted) {
      const todayEntry = p.effectiveSchedule.find((e) => isSameLocalDay(e.date, new Date()));
      if (todayEntry) {
        const rev = isReversedSchedule(p.effectiveSchedule) ?? planReversed;
        return { oriented: orientSlice(todayEntry, rev), reversed: rev };
      }
    }
    if (linkedPlan?.todayAssignment) {
      return { oriented: orientSlice(linkedPlan.todayAssignment, planReversed), reversed: planReversed };
    }
    return null;
  }

  const unlinkedPlans = myPlans.filter((p) => !planTargetsTrack(p, trackId));

  if (loadingTrack) {
    return <SkeletonRows count={3} rowHeight={90} />;
  }

  if (!track) {
    return <Text style={s.muted}>تعذّر العثور على المسار</Text>;
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

        {track.teachers.length > 0 && (
          <>
            <Text style={s.infoLabel}>المعلمون</Text>
            <Text style={[s.infoValue, { marginBottom: 10 }]}>{track.teachers.map(getTeacherName).join('، ')}</Text>
          </>
        )}

        {track.isOnline && track.meetLink && (
          <Text style={s.meetLink}>رابط الجلسة: {track.meetLink}</Text>
        )}

        <View style={s.capacityBox}>
          <View style={s.capacityRow}>
            <Text style={s.capacityLabel}>الطلاب</Text>
            <Text style={s.capacityValue}>{enrolledCount} / {track.maxStudents}</Text>
          </View>
          <ProgressBar value={capacityPct} showPercent={false} />
        </View>
      </Card>

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

      <Card noPadding>
        <CardHeader title={`طلاب المسار (${roster.length})`} style={{ padding: 16, paddingBottom: 8 }} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 4 }}>
          {roster.length === 0 && <Text style={s.muted}>لا يوجد طلاب مسجّلون بعد</Text>}
          {roster.map((student) => {
            const expanded = expandedId === student._id;
            const assignment = assignmentForStudent(student._id);
            return (
              <View key={student._id} style={s.studentBlock}>
                <Pressable style={s.studentRow} onPress={() => setExpandedId(expanded ? null : student._id)}>
                  <Text style={s.studentName}>{student.name}</Text>
                  <Text style={s.expandIcon}>{expanded ? '▲' : '▼'}</Text>
                </Pressable>

                {expanded && (
                  <View style={s.expandedBox}>
                    {assignment ? (
                      <View style={[s.assignmentBox, { backgroundColor: theme.greenPale }]}>
                        <Text style={s.assignmentText}>
                          {surahName(assignment.oriented.surahStart)}:{assignment.oriented.ayahStart} — {surahName(assignment.oriented.surahEnd)}:{assignment.oriented.ayahEnd}
                          {assignment.reversed ? ' · بالعكس' : ''}
                        </Text>
                      </View>
                    ) : (
                      <Text style={s.muted}>لا يوجد جزء مخصص لهذا الطالب اليوم</Text>
                    )}

                    {linkedPlan ? (
                      <IndividualPlanPanel planId={linkedPlan._id} studentId={student._id} studentName={student.name} basePlan={linkedPlan} />
                    ) : (
                      <Text style={s.muted}>اربط خطة حفظ بالمسار أولاً لعرض التوزيع الفردي</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </Card>

      <ScheduleSheet
        visible={showSchedule}
        onClose={() => setShowSchedule(false)}
        title="توزيع الأيام والصفحات"
        items={scheduleRows}
      />
    </View>
  );
}

const s = StyleSheet.create({
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
  meetLink: { fontSize: 11, color: theme.blue, fontFamily: theme.fontCairo, marginBottom: 10 },
  assignmentBox: { borderRadius: 10, padding: 10, marginTop: 10 },
  assignmentText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.greenDark },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  linkPanel: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, gap: 8 },
  linkPanelTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  linkRowText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.text, flex: 1 },
  studentBlock: { borderTopWidth: 1, borderTopColor: theme.border },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  studentName: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  expandIcon: { fontSize: 12, color: theme.textMuted },
  expandedBox: { paddingBottom: 14, gap: 6 },
});
