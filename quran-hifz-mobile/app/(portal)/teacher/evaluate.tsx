import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconCircleCheck, IconLock } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormTextarea from '@/components/forms/FormTextarea';
import ContextCard, { halqaToContext, trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import { useHalqat } from '@/lib/queries/halqat';
import { useSpecialTracks } from '@/lib/queries/specialTracks';
import { useStudents } from '@/lib/queries/students';
import { useEvaluations, useBulkEvaluate, type BulkEvaluateRecord } from '@/lib/queries/evaluations';
import { MAX_SCORES, TOTAL_MAX } from '@/lib/evaluationRubric';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { success, error } from '@/lib/haptics';

type ScoreCategory = 'hifz' | 'tajweed' | 'talawah';
const CATEGORY_LABELS: Record<ScoreCategory, string> = { hifz: 'حفظ', tajweed: 'تجويد', talawah: 'تلاوة' };

type StudentEval = { attendanceStatus: 'حاضر' | 'غائب'; hifz: number; tajweed: number; talawah: number; note: string };

/** Scores start at 0 so the teacher consciously awards points rather than
 * every student defaulting to full marks. */
function blankEval(): StudentEval {
  return { attendanceStatus: 'حاضر', hifz: 0, tajweed: 0, talawah: 0, note: '' };
}
function totalOf(e: StudentEval): number {
  if (e.attendanceStatus === 'غائب') return 0;
  return MAX_SCORES.attendance + e.hifz + e.tajweed + e.talawah;
}

export default function TeacherEvaluate() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);
  const [overrides, setOverrides] = useState<Record<string, StudentEval>>({});
  const [saved, setSaved] = useState(false);

  const { data: halqat = [], isLoading: loadingHalqat, refetch: refetchHalqat, isRefetching: refetchingHalqat } = useHalqat({ teacher: profileId });
  const { data: tracks = [], isLoading: loadingTracks, refetch: refetchTracks, isRefetching: refetchingTracks } = useSpecialTracks(undefined, profileId);

  const contextFilter = selected
    ? selected.kind === 'halqa' ? { halqa: selected.id } : { specialTrack: selected.id }
    : undefined;

  const { data: students = [], isLoading: loadingStudents, refetch: refetchStudents, isRefetching: refetchingStudents } = useStudents(contextFilter);

  const today = new Date().toISOString().split('T')[0];

  // Today's already-saved evaluations for this context — prefill + once-a-day lock.
  const { data: savedToday = [], refetch: refetchEvaluations, isRefetching: refetchingEvaluations } = useEvaluations(
    contextFilter ? { ...contextFilter, from: today, to: today } : undefined,
  );
  const savedById: Record<string, StudentEval> = {};
  for (const r of savedToday) {
    const id = typeof r.student === 'string' ? r.student : r.student._id;
    savedById[id] = {
      attendanceStatus: r.attendanceStatus,
      hifz: r.scores.hifz,
      tajweed: r.scores.tajweed,
      talawah: r.scores.talawah,
      note: r.note ?? '',
    };
  }
  const alreadySubmitted = savedToday.length > 0;

  const evalFor = (studentId: string): StudentEval => overrides[studentId] ?? savedById[studentId] ?? blankEval();
  function setAttendance(studentId: string, status: 'حاضر' | 'غائب') {
    setOverrides((p) => ({ ...p, [studentId]: { ...evalFor(studentId), attendanceStatus: status } }));
  }
  function setScore(studentId: string, category: ScoreCategory, value: number) {
    setOverrides((p) => ({ ...p, [studentId]: { ...evalFor(studentId), [category]: value } }));
  }
  function setNote(studentId: string, note: string) {
    setOverrides((p) => ({ ...p, [studentId]: { ...evalFor(studentId), note } }));
  }

  const bulkEvaluate = useBulkEvaluate();

  function handleSave() {
    if (!selected || alreadySubmitted) return;
    const records: BulkEvaluateRecord[] = students.map((s) => {
      const e = evalFor(s._id);
      return {
        student: s._id,
        attendanceStatus: e.attendanceStatus,
        hifz: e.hifz,
        tajweed: e.tajweed,
        talawah: e.talawah,
        note: e.note.trim() || undefined,
      };
    });
    bulkEvaluate.mutate(
      {
        teacher: profileId!,
        ...(selected.kind === 'halqa' ? { halqa: selected.id } : { specialTrack: selected.id }),
        date: today,
        records,
      },
      {
        onSuccess: () => {
          success();
          setSaved(true);
          setTimeout(() => setSaved(false), 4000);
        },
        onError: () => error(),
      },
    );
  }

  const isLoading = loadingHalqat || loadingTracks;
  const isRefreshing = refetchingHalqat || refetchingTracks || refetchingStudents || refetchingEvaluations;
  function handleRefresh() {
    refetchHalqat();
    refetchTracks();
    refetchStudents();
    refetchEvaluations();
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },
    studentRow: { paddingVertical: 14, gap: 10 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    studentName: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radiusSm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    toggleText: {
      fontSize: 12,
      fontFamily: theme.fontCairo,
      color: theme.text,
    },
    categoryBlock: { gap: 6 },
    categoryLabel: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip: {
      minWidth: 32,
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: theme.radiusSm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipText: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end' },
    totalText: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.green },
  }), [theme]);

  if (!selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
        >
          {isLoading && <SkeletonRows count={4} rowHeight={72} />}
          {!isLoading && halqat.length === 0 && tracks.length === 0 && (
            <Text style={styles.muted}>لا توجد حلقات أو مسارات مسندة إليك</Text>
          )}
          {halqat.map((h) => (
            <Pressable key={h._id} onPress={() => setSelected(halqaToContext(h))}>
              <ContextCard context={halqaToContext(h)} />
            </Pressable>
          ))}
          {tracks.map((t) => (
            <Pressable key={t._id} onPress={() => setSelected(trackToContext(t))}>
              <ContextCard context={trackToContext(t)} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
        >
        {saved && (
          <Alert variant="success" icon={<IconCircleCheck size={18} color={theme.green} />}>
            تم حفظ التقييم بنجاح.
          </Alert>
        )}
        {bulkEvaluate.isError && (
          <Alert variant="error">{(bulkEvaluate.error as Error).message}</Alert>
        )}
        {alreadySubmitted && (
          <Alert variant="success" icon={<IconLock size={18} color={theme.green} />}>
            تم تسجيل التقييم لهذا اليوم بالفعل. اختر يومًا آخر أو راجع السجل لاحقًا للتعديل.
          </Alert>
        )}

        <Pressable onPress={() => { setSelected(null); setOverrides({}); }}>
          <Text style={styles.backLink}>‹ رجوع لاختيار الحلقة/المسار</Text>
        </Pressable>

        <Card>
          <CardHeader title={`${selected.title} — ${today}`} />

          {loadingStudents && <View style={{ paddingHorizontal: 4 }}><SkeletonRows count={3} rowHeight={140} gap={14} /></View>}
          {!loadingStudents && students.length === 0 && (
            <Text style={styles.muted}>لا يوجد طلاب</Text>
          )}

          {students.map((st, i) => {
            const e = evalFor(st._id);
            const isAbsent = e.attendanceStatus === 'غائب';
            const total = totalOf(e);
            return (
              <View key={st._id} style={[styles.studentRow, i < students.length - 1 && styles.rowBorder]}>
                <Text style={styles.studentName}>{st.name}</Text>

                <View style={styles.toggleRow}>
                  <Pressable
                    haptic="select"
                    disabled={alreadySubmitted}
                    onPress={() => setAttendance(st._id, 'حاضر')}
                    style={[styles.toggleBtn, !isAbsent && { backgroundColor: theme.greenPale, borderColor: theme.greenAccent }]}
                  >
                    <Text style={[styles.toggleText, !isAbsent && { color: theme.green, fontFamily: theme.fontCairoBold }]}>حاضر</Text>
                  </Pressable>
                  <Pressable
                    haptic="select"
                    disabled={alreadySubmitted}
                    onPress={() => setAttendance(st._id, 'غائب')}
                    style={[styles.toggleBtn, isAbsent && { backgroundColor: theme.red + '20', borderColor: theme.red }]}
                  >
                    <Text style={[styles.toggleText, isAbsent && { color: theme.red, fontFamily: theme.fontCairoBold }]}>غائب</Text>
                  </Pressable>
                </View>

                {!isAbsent && (
                  <>
                    {(['hifz', 'tajweed', 'talawah'] as ScoreCategory[]).map((cat) => (
                      <View key={cat} style={styles.categoryBlock}>
                        <Text style={styles.categoryLabel}>{CATEGORY_LABELS[cat]} (٠-{MAX_SCORES[cat]})</Text>
                        <View style={styles.chipRow}>
                          {Array.from({ length: MAX_SCORES[cat] + 1 }, (_, n) => n).map((n) => {
                            const active = e[cat] === n;
                            return (
                              <Pressable
                                haptic="select"
                                key={n}
                                disabled={alreadySubmitted}
                                onPress={() => setScore(st._id, cat, n)}
                                style={[styles.chip, active && { backgroundColor: theme.greenAccent, borderColor: theme.green }]}
                              >
                                <Text style={[styles.chipText, active && { color: theme.white }]}>{n}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                    <View style={styles.totalRow}>
                      <Text style={styles.totalText}>{total}/{TOTAL_MAX}</Text>
                    </View>
                  </>
                )}

                <FormTextarea
                  rows={2}
                  editable={!alreadySubmitted}
                  placeholder="ملاحظات (اختياري)"
                  value={e.note}
                  onChangeText={(v) => setNote(st._id, v)}
                />
              </View>
            );
          })}
        </Card>

        <Button
          label={alreadySubmitted ? 'تم الإرسال لهذا اليوم' : bulkEvaluate.isPending ? 'جارٍ الحفظ...' : 'حفظ التقييم'}
          onPress={handleSave}
          disabled={alreadySubmitted || bulkEvaluate.isPending || students.length === 0}
          fullWidth
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
