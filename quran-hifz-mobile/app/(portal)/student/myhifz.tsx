import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconCircleCheck, IconCircleDashed, IconCircle,
} from '@tabler/icons-react-native';
import AyahBar from '@/components/ui/AyahBar';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import DataTable from '@/components/ui/DataTable';
import { MY_HIFZ_PLAN } from '@/lib/data/students';
import { theme } from '@/lib/theme';

export default function StudentHifz() {
  const completed = MY_HIFZ_PLAN.filter((e) => e.status === 'مكتمل').length;
  const total = MY_HIFZ_PLAN.length;
  const pct = Math.round((completed / total) * 100);

  const rows = MY_HIFZ_PLAN.map((entry) => ({
    surah: <Text style={styles.surahName}>{entry.surah}</Text>,
    status: (
      <Badge
        label={entry.status}
        variant={entry.status === 'مكتمل' ? 'green' : entry.status === 'جارٍ' ? 'gold' : 'gray'}
      />
    ),
    date: <Text style={styles.dateText}>{entry.completionDate ?? '—'}</Text>,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AyahBar />

        {/* Summary card */}
        <Card>
          <CardHeader title="ملخص خطة الحفظ السنوية" />
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>تاريخ البداية</Text>
              <Text style={styles.summaryValue}>١٤٤٥/٠١/٠١</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>الهدف السنوي</Text>
              <Text style={styles.summaryValue}>٢٠٠ صفحة</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>المسار</Text>
              <Badge label="حفظ كامل" variant="green" />
            </View>
          </View>
          <View style={styles.pctRow}>
            <Text style={styles.pctLabel}>السور المكتملة</Text>
            <Text style={styles.pctVal}>{completed} / {total}</Text>
          </View>
          <ProgressBar value={pct} showPercent={false} />
          <Text style={styles.pctNote}>{pct}٪ مكتمل</Text>
        </Card>

        {/* Table */}
        <Card noPadding>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <CardHeader title="تفاصيل السور" />
          </View>
          <DataTable
            columns={[
              { key: 'surah',  label: 'السورة', flex: 2 },
              { key: 'status', label: 'الحالة',  flex: 1 },
              { key: 'date',   label: 'تاريخ الإكمال', flex: 2 },
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
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  summaryItem: { flex: 1, gap: 4 },
  summaryLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  summaryValue: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  pctRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pctLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  pctVal: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green },
  pctNote: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 4 },
  surahName: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  dateText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
});
