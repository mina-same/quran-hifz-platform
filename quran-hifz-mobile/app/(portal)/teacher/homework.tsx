import { ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import { HOMEWORK_REVIEWS } from '@/lib/data/teachers';
import { theme } from '@/lib/theme';

export default function TeacherHomework() {
  const statusVariant = (s: string) =>
    ({ 'مراجع': 'green', 'معلق': 'gold', 'متأخر': 'red' }[s] ?? 'gray') as any;
  const ratingVariant = (r: string) =>
    ({ 'ممتاز': 'green', 'جيد جداً': 'gold', 'جيد': 'blue', 'مقبول': 'gray' }[r] ?? 'gray') as any;

  const rows = HOMEWORK_REVIEWS.map((h) => ({
    student: <Text style={styles.bold}>{h.studentName}</Text>,
    type:    <Text style={styles.muted}>{h.type}</Text>,
    segment: <Text style={styles.muted}>{h.segment}</Text>,
    date:    <Text style={styles.muted}>{h.date}</Text>,
    status:  <Badge label={h.status} variant={statusVariant(h.status)} />,
    rating:  <Badge label={h.rating} variant={ratingVariant(h.rating)} />,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Card noPadding>
          <CardHeader title="واجبات الطلاب" style={{ padding: 16, paddingBottom: 8 }} />
          <DataTable
            columns={[
              { key: 'student', label: 'الطالب',     flex: 2 },
              { key: 'type',    label: 'نوع الواجب', flex: 1 },
              { key: 'segment', label: 'المقطع',     flex: 2 },
              { key: 'date',    label: 'التاريخ',    flex: 1 },
              { key: 'status',  label: 'الحالة',     flex: 1 },
              { key: 'rating',  label: 'التقييم',    flex: 1 },
            ]}
            rows={rows}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  muted: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
});
