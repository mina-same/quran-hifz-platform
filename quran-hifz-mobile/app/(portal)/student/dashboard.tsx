import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconBook, IconCalendarCheck, IconFlame, IconClock,
} from '@tabler/icons-react-native';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { theme } from '@/lib/theme';

const STATS = [
  { label: 'صفحات محفوظة',       value: '٤٠٨', color: theme.green },
  { label: 'نسبة الحضور',         value: '٩٤٪', color: theme.gold },
  { label: 'أيام الالتزام',        value: '١٢',  color: '#3B82F6' },
  { label: 'يوم للإكمال (تقديري)', value: '٦٨',  color: theme.red },
];

const RECENT_HW = [
  { date: '١٤٤٥/١٠/٢٠', segment: 'النساء ١-١٥',         rating: 'ممتاز',    status: 'مراجع' },
  { date: '١٤٤٥/١٠/١٨', segment: 'آل عمران ١٨٠-٢٠٠',    rating: 'جيد جداً', status: 'مراجع' },
  { date: '١٤٤٥/١٠/١٥', segment: 'آل عمران ١٦٠-١٨٠',    rating: 'ممتاز',    status: 'مراجع' },
];

export default function StudentDashboard() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AyahBar />

        <StatsRow stats={STATS} />

        <View style={styles.twoCol}>
          {/* Next session */}
          <Card style={styles.half}>
            <CardHeader title="الجلسة القادمة" />
            {[
              ['الحلقة',      'حلقة عمر بن الخطاب'],
              ['الموعد',      'الخميس ٥:٠٠ م'],
              ['المسجد',      'مسجد الفاروق'],
              ['المعلم',      'ناصر الحميداني'],
            ].map(([k, v]) => (
              <View key={k} style={styles.infoRow}>
                <Text style={styles.infoKey}>{k}</Text>
                <Text style={styles.infoVal}>{v}</Text>
              </View>
            ))}
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>الواجب</Text>
              <Badge label="النساء ١٥-٣٠" variant="gold" />
            </View>
          </Card>

          {/* Weekly progress */}
          <Card style={styles.half}>
            <CardHeader title="التقدم هذا الأسبوع" />
            <View style={styles.progressSection}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>صفحات هذا الأسبوع</Text>
                <Text style={styles.progressVal}>٨ / ١٠</Text>
              </View>
              <ProgressBar value={80} showPercent={false} />
            </View>
            <View style={styles.progressSection}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>التقدم الكلي</Text>
                <Text style={styles.progressVal}>٤٠٨ / ٦٠٤ صفحة</Text>
              </View>
              <ProgressBar value={67.5} showPercent={false} />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>الهدف السنوي</Text>
              <Badge label="في الموعد" variant="green" />
            </View>
          </Card>
        </View>

        {/* Recent homework */}
        <Card>
          <CardHeader title="آخر الواجبات" />
          {RECENT_HW.map((row, i) => (
            <View key={i} style={[styles.hwRow, i < RECENT_HW.length - 1 && styles.hwBorder]}>
              <View>
                <Text style={styles.hwSegment}>{row.segment}</Text>
                <Text style={styles.hwDate}>{row.date}</Text>
              </View>
              <View style={styles.hwBadges}>
                <Badge label={row.rating} variant="gold" />
                <Badge label={row.status} variant="green" />
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: theme.bg },
  page:  { padding: theme.pagePadding, gap: 14 },
  twoCol:{ flexDirection: 'row', gap: 12 },
  half:  { flex: 1 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  infoKey: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  infoVal: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
  progressSection: { gap: 4, marginBottom: 10 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
  progressVal: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.green },
  hwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  hwBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  hwSegment: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  hwDate: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 2 },
  hwBadges: { flexDirection: 'row', gap: 6 },
});
