import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { STUDENTS } from '@/lib/data/students';
import { theme } from '@/lib/theme';

export default function TeacherReports() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {STUDENTS.map((s) => (
          <Card key={s.id}>
            <CardHeader
              title={s.name}
              right={<Badge label={s.status === 'active' ? 'نشط' : 'غير نشط'} variant={s.status === 'active' ? 'green' : 'gray'} />}
            />
            <View style={styles.rows}>
              {[
                ['الحلقة',      s.halqa],
                ['آخر حفظ',     s.lastMemorization],
              ].map(([k, v]) => (
                <View key={k} style={styles.row}>
                  <Text style={styles.label}>{k}</Text>
                  <Text style={styles.value}>{v}</Text>
                </View>
              ))}
              <View style={styles.row}>
                <Text style={styles.label}>نسبة الحضور</Text>
                <Text style={[styles.boldValue, { color: s.attendancePct >= 90 ? theme.green : theme.red }]}>{s.attendancePct}٪</Text>
              </View>
              <View>
                <View style={[styles.row, { marginBottom: 4 }]}>
                  <Text style={styles.label}>التقدم الكلي</Text>
                  <Text style={[styles.boldValue, { color: theme.green }]}>{s.progressPages}/{s.totalPages} صفحة</Text>
                </View>
                <ProgressBar value={s.progressPct} showPercent={false} />
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  rows: { gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  value: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
  boldValue: { fontSize: 12, fontFamily: theme.fontCairoBold },
});
