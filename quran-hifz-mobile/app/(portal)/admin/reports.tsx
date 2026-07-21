import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Button from '@/components/ui/Button';
import { STUDENTS } from '@/lib/data/students';
import { HALQAT } from '@/lib/data/halqat';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const EXPORT_BTNS = [
  { label: 'تقرير الطلاب PDF',    variant: 'danger' },
  { label: 'تقرير الحضور Excel',  variant: 'ghost' },
  { label: 'تقرير المعلمين PDF',  variant: 'danger' },
  { label: 'تقرير الأداء Excel',  variant: 'ghost' },
  { label: 'تقرير الحلقات PDF',   variant: 'danger' },
] as const;

const MONTHLY = [
  { label: 'طلاب جدد',                  val: '٢' },
  { label: 'جلسات منعقدة',              val: '٤٨' },
  { label: 'واجبات مُسلَّمة',            val: '١٢٦' },
  { label: 'صفحات محفوظة إجمالاً',     val: '٣٨٤' },
  { label: 'أولياء أمور تلقوا إشعارات', val: '٩٤' },
];

export default function AdminReports() {
  const avgAttendance = Math.round(STUDENTS.reduce((a, s) => a + s.attendancePct, 0) / STUDENTS.length);
  const avgProgress   = Math.round(STUDENTS.reduce((a, s) => a + s.progressPct, 0) / STUDENTS.length);

  const STATS = [
    { label: 'إجمالي الطلاب',   value: STUDENTS.length,     color: theme.green },
    { label: 'متوسط الحضور',     value: `${avgAttendance}٪`, color: theme.gold },
    { label: 'متوسط التقدم',     value: `${avgProgress}٪`,  color: '#3B82F6' },
    { label: 'الحلقات النشطة',   value: HALQAT.length,       color: theme.red },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <StatsRow stats={STATS} />

        {/* Export */}
        <Card>
          <CardHeader title="تصدير التقارير" />
          <View style={styles.exportGrid}>
            {EXPORT_BTNS.map((btn, i) => (
              <Button key={i} label={btn.label} variant={btn.variant} />
            ))}
          </View>
        </Card>

        {/* Two-column summary cards */}
        <View style={styles.twoCol}>
          <Card style={styles.half}>
            <CardHeader title="ملخص شهر ذو القعدة ١٤٤٥" />
            {MONTHLY.map((row, i) => (
              <View key={i} style={[styles.row, i < MONTHLY.length - 1 && styles.rowBorder]}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.val}>{row.val}</Text>
              </View>
            ))}
          </Card>

          <Card style={styles.half}>
            <CardHeader title="أداء الحلقات" />
            {HALQAT.map((h, i) => (
              <View key={h.id} style={[styles.row, i < HALQAT.length - 1 && styles.rowBorder]}>
                <Text style={[styles.label, { flex: 1 }]} numberOfLines={1}>{h.name}</Text>
                <Text style={[styles.val, { color: theme.green }]}>{h.attendancePct}٪ حضور</Text>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  exportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  twoCol: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  label: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  val: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.green },
});
