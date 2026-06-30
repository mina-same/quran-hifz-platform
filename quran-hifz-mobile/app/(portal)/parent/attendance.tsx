import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { theme } from '@/lib/theme';

const STATS = [
  { label: 'نسبة الحضور', value: '٩٥٪', color: theme.green },
  { label: 'جلسة حضرها', value: '٣٨',   color: theme.gold },
  { label: 'غيابات بعذر', value: '٢',    color: '#3B82F6' },
  { label: 'غياب بلا عذر', value: '٠',  color: theme.red },
];
const ROWS = [
  { date: '١٩ محرم', day: 'الأحد',    status: 'حاضر',      variant: 'green' as const, note: '—' },
  { date: '١٧ محرم', day: 'الخميس',   status: 'حاضر',      variant: 'green' as const, note: '—' },
  { date: '١٥ محرم', day: 'الثلاثاء', status: 'غائب بعذر', variant: 'gold'  as const, note: 'مرض طارئ' },
  { date: '١٢ محرم', day: 'السبت',    status: 'حاضر',      variant: 'green' as const, note: '—' },
];

export default function ParentAttendance() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <StatsRow stats={STATS} />
        <Card>
          <CardHeader title="سجل الحضور" />
          {ROWS.map((r, i) => (
            <View key={i} style={[s.row, i && s.border]}>
              <View style={s.left}>
                <Text style={s.date}>{r.date} — {r.day}</Text>
                <Text style={s.note}>{r.note !== '—' ? r.note : 'بعد الفجر'}</Text>
              </View>
              <Badge variant={r.variant}>{r.status}</Badge>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.cream },
  page: { padding: 16, gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  left: { flex: 1 },
  date: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  note: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, marginTop: 2 },
});
