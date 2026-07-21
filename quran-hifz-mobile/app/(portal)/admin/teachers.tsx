import { useMemo } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import { TEACHERS } from '@/lib/data/teachers';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const ratingVariant = (r: string) =>
  r === 'ممتاز' ? 'green' : r === 'جيد جداً' ? 'gold' : r === 'جيد' ? 'blue' : 'gray';

export default function AdminTeachers() {
  const theme = useAppTheme();
  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    muted: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
  }), [theme]);

  const rows = TEACHERS.map((t) => ({
    name:      <Text style={styles.bold}>{t.name}</Text>,
    specialty: <Text style={styles.muted}>{t.specialty}</Text>,
    halqat:    <Text style={styles.bold}>{t.halqatCount}</Text>,
    students:  <Text style={styles.bold}>{t.studentCount}</Text>,
    rating:    <Badge label={t.rating} variant={ratingVariant(t.rating) as any} />,
    status:    <Badge label={t.status === 'active' ? 'نشط' : 'غير نشط'} variant={t.status === 'active' ? 'green' : 'gray'} />,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Card noPadding>
          <CardHeader title={`المعلمون (${TEACHERS.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <DataTable
            columns={[
              { key: 'name',      label: 'الاسم',       flex: 2 },
              { key: 'specialty', label: 'التخصص',      flex: 2 },
              { key: 'halqat',    label: 'الحلقات',     flex: 1 },
              { key: 'students',  label: 'عدد الطلاب', flex: 1 },
              { key: 'rating',    label: 'التقييم',     flex: 1 },
              { key: 'status',    label: 'الحالة',      flex: 1 },
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
