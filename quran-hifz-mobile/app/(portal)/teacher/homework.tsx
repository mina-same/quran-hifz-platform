import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import DataTable from '@/components/ui/DataTable';
import FormSelect from '@/components/forms/FormSelect';
import { useHomework, useGradeHomework } from '@/lib/queries/homework';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return typeof v === 'string' ? v : '';
}

const RATING_OPTIONS = [
  { value: 'ممتاز', label: 'ممتاز' },
  { value: 'جيد جداً', label: 'جيد جداً' },
  { value: 'جيد', label: 'جيد' },
  { value: 'مقبول', label: 'مقبول' },
];

export default function TeacherHomework() {
  const authUser = usePortalStore((s) => s.authUser);
  const { data: homework = [], isLoading } = useHomework({ teacher: authUser?.profileId });
  const gradeHW = useGradeHomework();

  const statusVariant = (s: string) =>
    ({ 'مراجع': 'green', 'معلق': 'gold', 'متأخر': 'red' }[s] ?? 'gray') as any;

  const rows = homework.map((hw) => ({
    student: <Text style={styles.bold}>{getName(hw.student)}</Text>,
    type:    <Text style={styles.muted}>{hw.type}</Text>,
    segment: <Text style={styles.muted}>{hw.segment}</Text>,
    date:    <Text style={styles.muted}>{hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('ar-SA') : '—'}</Text>,
    status:  <Badge label={hw.status} variant={statusVariant(hw.status)} />,
    rating:  (
      <FormSelect
        value={hw.rating}
        options={RATING_OPTIONS}
        placeholder="اختر التقييم"
        onChange={(value) => gradeHW.mutate({ id: hw._id, rating: value, status: 'مراجع' })}
      />
    ),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Alert variant="info">يمكنك تقييم الواجبات المعلقة مباشرة من الجدول أدناه.</Alert>
        {gradeHW.isError && <Alert variant="warning">{(gradeHW.error as Error).message}</Alert>}

        <Card noPadding>
          <CardHeader title="واجبات الطلاب" style={{ padding: 16, paddingBottom: 8 }} />
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.green} />
            </View>
          ) : (
            <DataTable
              columns={[
                { key: 'student', label: 'الطالب',     flex: 2 },
                { key: 'type',    label: 'نوع الواجب', flex: 1 },
                { key: 'segment', label: 'المقطع',     flex: 2 },
                { key: 'date',    label: 'التاريخ',    flex: 1 },
                { key: 'status',  label: 'الحالة',     flex: 1 },
                { key: 'rating',  label: 'التقييم',    flex: 2 },
              ]}
              rows={rows}
              emptyMessage="لا توجد واجبات"
            />
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  center: { paddingVertical: 24, alignItems: 'center' },
  bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  muted: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
});
