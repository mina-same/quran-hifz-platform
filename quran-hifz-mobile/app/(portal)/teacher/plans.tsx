import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import ProgressBar from '@/components/ui/ProgressBar';
import { INDIVIDUAL_PLANS } from '@/lib/data/teachers';
import { theme } from '@/lib/theme';

const statusVariant = (s: string) =>
  s === 'متقدم' ? 'green' : s === 'في الموعد' ? 'gold' : 'red';

export default function TeacherPlans() {
  const rows = INDIVIDUAL_PLANS.map((p) => {
    const pct = Math.round((p.completed / p.annualTarget) * 100);
    return {
      student:  <Text style={styles.bold}>{p.studentName}</Text>,
      target:   <Text style={styles.normal}>{p.annualTarget} صفحة</Text>,
      done:     <Text style={[styles.bold, { color: theme.green }]}>{p.completed} صفحة</Text>,
      progress: (
        <View style={{ minWidth: 100 }}>
          <Text style={[styles.muted, { fontSize: 11, marginBottom: 2 }]}>{pct}٪</Text>
          <ProgressBar value={pct} showPercent={false} />
        </View>
      ),
      status: <Badge label={p.status} variant={statusVariant(p.status) as any} />,
    };
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Card noPadding>
          <CardHeader title="خطط الحفظ السنوية" style={{ padding: 16, paddingBottom: 8 }} />
          <DataTable
            columns={[
              { key: 'student',  label: 'الطالب',     flex: 2 },
              { key: 'target',   label: 'الهدف السنوي', flex: 1 },
              { key: 'done',     label: 'المنجز',     flex: 1 },
              { key: 'progress', label: 'التقدم',     flex: 2 },
              { key: 'status',   label: 'الحالة',     flex: 1 },
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
  normal: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text },
  muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
});
