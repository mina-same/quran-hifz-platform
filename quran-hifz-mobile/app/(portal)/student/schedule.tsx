import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import { usePortalStore } from '@/lib/store/portalStore';
import { useStudent } from '@/lib/queries/students';
import { useHalqa } from '@/lib/queries/halqat';
import { theme } from '@/lib/theme';

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function getId(v: unknown): string | undefined {
  if (v && typeof v === 'object' && '_id' in v) return (v as { _id: string })._id;
  if (typeof v === 'string') return v;
  return undefined;
}
function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return '—';
}

export default function StudentSchedule() {
  const authUser = usePortalStore((s) => s.authUser);
  const studentId = authUser?.profileId;

  const { data: student, isLoading: studentLoading, isError: studentError } = useStudent(studentId);
  const halqaId = student ? getId(student.halqa) : undefined;
  const { data: halqa, isLoading: halqaLoading, isError: halqaError } = useHalqa(halqaId);

  const isLoading = studentLoading || (!!halqaId && halqaLoading);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.green} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (studentError || halqaError) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.page}>
          <Alert variant="error">تعذر تحميل مواعيد الحلقة</Alert>
        </View>
      </SafeAreaView>
    );
  }

  const sessionDays = new Set(
    (halqa?.days ?? '').split(/[،,]/).map((d) => d.trim()).filter(Boolean),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {!halqa ? (
          <Card>
            <Text style={styles.emptyText}>لا توجد حلقة مسجلة بعد</Text>
          </Card>
        ) : (
          <>
            {/* Halqa info */}
            <Card>
              <CardHeader title="تفاصيل الحلقة" />
              <View style={styles.grid}>
                {[
                  ['الحلقة', halqa.name],
                  ['المعلم', getName(halqa.teacher)],
                  ['المسجد', getName(halqa.masjid)],
                  ['الوقت', halqa.time || '—'],
                ].map(([k, v]) => (
                  <View key={k} style={styles.gridItem}>
                    <Text style={styles.gridLabel}>{k}</Text>
                    <Text style={styles.gridValue}>{v}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Weekly grid */}
            <Card>
              <CardHeader title="الجدول الأسبوعي" />
              <View style={styles.weekGrid}>
                {DAYS.map((day) => {
                  const isSession = sessionDays.has(day);
                  return (
                    <View
                      key={day}
                      style={[styles.dayCell, isSession ? styles.dayCellActive : styles.dayCellInactive]}
                    >
                      <Text style={[styles.dayName, isSession && styles.dayNameActive]}>{day}</Text>
                      {isSession ? (
                        <Text style={styles.sessionTime}>{halqa.time || '—'}</Text>
                      ) : (
                        <Text style={styles.dash}>—</Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.green }]} />
                  <Text style={styles.legendText}>يوم حلقة</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F9FAF5', borderWidth: 1, borderColor: theme.border }]} />
                  <Text style={styles.legendText}>يوم عادي</Text>
                </View>
              </View>
            </Card>

            <Alert variant="info">سيصلك تذكير على الواتساب قبل كل جلسة بساعة.</Alert>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { padding: theme.pagePadding, gap: 14 },
  emptyText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '46%', gap: 4 },
  gridLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  gridValue: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayCell: { width: '13%', borderRadius: theme.radiusSm, padding: 6, alignItems: 'center', minWidth: 40 },
  dayCellActive: { backgroundColor: theme.green },
  dayCellInactive: { backgroundColor: '#F9FAF5' },
  dayName: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', marginBottom: 2 },
  dayNameActive: { color: theme.white, fontFamily: theme.fontCairoBold },
  sessionTime: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontFamily: theme.fontCairo },
  dash: { fontSize: 10, color: theme.textMuted },
  legend: { flexDirection: 'row', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
});
