import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import DataTable from '@/components/ui/DataTable';
import { useSelectedChild } from '@/components/domain/useSelectedChild';
import { useChildRecordings } from '@/lib/queries/parent';
import { theme } from '@/lib/theme';

export default function ParentRecordings() {
  const { selectedChildId, hasNoChildren } = useSelectedChild();
  const { data: recordings, isLoading } = useChildRecordings(selectedChildId ?? undefined);

  if (!selectedChildId) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <View style={s.loading}>
          {hasNoChildren ? (
            <Text style={s.emptyText}>لم يتم اختيار طالب</Text>
          ) : (
            <ActivityIndicator color={theme.green} size="large" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const rows = (recordings ?? []).map((r) => ({
    date: <Text style={s.cell}>{new Date(r.recordedAt).toLocaleDateString('ar-SA')}</Text>,
    teacher: <Text style={s.cell}>{typeof r.teacher === 'object' ? r.teacher.name : r.teacher}</Text>,
    segment: <Text style={s.cell}>{r.segment ?? '—'}</Text>,
    notes: <Text style={s.cell}>{r.notes ?? '—'}</Text>,
  }));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Alert variant="info">جميع دروس ابنك مرتبة من الأحدث — سجّلها المعلم مباشرة في الحلقة.</Alert>

        <Card noPadding>
          <CardHeader title="سجل الدروس" style={{ padding: 16, paddingBottom: 8 }} />
          {isLoading ? (
            <View style={s.inlineLoading}>
              <ActivityIndicator color={theme.green} />
            </View>
          ) : (
            <DataTable
              columns={[
                { key: 'date', label: 'التاريخ' },
                { key: 'teacher', label: 'المعلم' },
                { key: 'segment', label: 'المقطع', flex: 1.4 },
                { key: 'notes', label: 'ملاحظة المعلم', flex: 1.6 },
              ]}
              rows={rows}
              emptyMessage="لا توجد دروس مسجّلة بعد"
            />
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 16, gap: 14 },
  loading: { paddingVertical: 60, alignItems: 'center' },
  inlineLoading: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
  cell: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text },
});
