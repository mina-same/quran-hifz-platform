import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import FormSelect from '@/components/forms/FormSelect';
import { useHomework } from '@/lib/queries/homework';
import { useGradeHomework } from '@/lib/queries/homework';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

function getName(v: { name: string } | string | undefined): string {
  if (!v) return '—';
  return typeof v === 'object' ? v.name : v;
}
function getTitle(v: { title: string } | string | undefined): string {
  if (!v) return '—';
  return typeof v === 'object' ? v.title : v;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = { 'مراجع': 'green', 'معلق': 'gold', 'متأخر': 'red' };
const RATING_OPTS = [
  { value: 'ممتاز', label: 'ممتاز' },
  { value: 'جيد جداً', label: 'جيد جداً' },
  { value: 'جيد', label: 'جيد' },
  { value: 'مقبول', label: 'مقبول' },
];

export default function TeacherHomework() {
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: homework = [], isLoading } = useHomework({ teacher: profileId });
  const gradeHW = useGradeHomework();

  const rows = homework.map((h) => ({
    student: <Text style={styles.bold}>{getName(h.student)}</Text>,
    type: <Badge label={h.type} variant="blue" />,
    segment: <Text style={styles.muted}>{h.segment}</Text>,
    source: <Text style={styles.muted}>{h.specialTrack ? `مسار: ${getTitle(h.specialTrack)}` : getName(h.halqa)}</Text>,
    date: <Text style={styles.muted}>{h.dueDate ? new Date(h.dueDate).toLocaleDateString('ar-SA') : '—'}</Text>,
    status: <Badge label={h.status} variant={STATUS_VARIANT[h.status] ?? 'gray'} />,
    rating: (
      <FormSelect
        value={h.rating ?? ''}
        onChange={(v) => gradeHW.mutate({ id: h._id, rating: v, status: 'مراجع' })}
        options={RATING_OPTS}
        placeholder="اختر التقييم"
      />
    ),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Card noPadding>
          <CardHeader title="واجبات الطلاب" style={{ padding: 16, paddingBottom: 8 }} />
          {isLoading && <View style={styles.loading}><Text style={styles.muted}>جارٍ التحميل...</Text></View>}
          {!isLoading && (
            <DataTable
              columns={[
                { key: 'student', label: 'الطالب', flex: 2 },
                { key: 'type', label: 'نوع الواجب', flex: 1 },
                { key: 'segment', label: 'المقطع', flex: 2 },
                { key: 'source', label: 'المصدر', flex: 2 },
                { key: 'date', label: 'التاريخ', flex: 1 },
                { key: 'status', label: 'الحالة', flex: 1 },
                { key: 'rating', label: 'التقييم', flex: 2 },
              ]}
              rows={rows}
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
  bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  muted: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
  loading: { padding: 24, alignItems: 'center' },
});
