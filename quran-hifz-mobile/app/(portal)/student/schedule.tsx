import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { theme } from '@/lib/theme';

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const SESSION_DAYS = new Set(['الاثنين', 'الخميس', 'السبت']);
const UPCOMING = [
  { date: '١٤٤٥/١٠/٢٤', day: 'الاثنين', countdown: 'بعد يومين',  i: 0 },
  { date: '١٤٤٥/١٠/٢٧', day: 'الخميس',  countdown: 'بعد ٥ أيام', i: 1 },
  { date: '١٤٤٥/١٠/٢٩', day: 'السبت',   countdown: 'بعد أسبوع',  i: 2 },
];

export default function StudentSchedule() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {/* Halqa info */}
        <Card>
          <CardHeader title="تفاصيل الحلقة" />
          <View style={styles.grid}>
            {[
              ['الحلقة',  'حلقة عمر بن الخطاب'],
              ['المعلم',  'الأستاذ ناصر الحميداني'],
              ['المسجد',  'مسجد الفاروق — حي العماير'],
              ['الوقت',   '٥:٠٠ م — ٦:٣٠ م'],
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
              const isSession = SESSION_DAYS.has(day);
              return (
                <View
                  key={day}
                  style={[styles.dayCell, isSession ? styles.dayCellActive : styles.dayCellInactive]}
                >
                  <Text style={[styles.dayName, isSession && styles.dayNameActive]}>{day}</Text>
                  {isSession ? (
                    <>
                      <Text style={styles.sessionTime}>٥:٠٠ م</Text>
                      <Text style={styles.sessionTime}>٦:٣٠ م</Text>
                    </>
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

        {/* Upcoming sessions */}
        <Card>
          <CardHeader title="الجلسات القادمة" />
          {UPCOMING.map((s, i) => (
            <View key={s.date} style={[styles.sessionRow, i < UPCOMING.length - 1 && styles.sessionBorder]}>
              <View>
                <Text style={styles.sessionDay}>{s.day} <Text style={styles.sessionDate}>{s.date}</Text></Text>
                <Text style={styles.sessionTimeLabel}>٥:٠٠ م — ٦:٣٠ م</Text>
              </View>
              <Badge label={s.countdown} variant={s.i === 0 ? 'gold' : 'gray'} />
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
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
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  sessionBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  sessionDay: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  sessionDate: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
  sessionTimeLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 2 },
});
