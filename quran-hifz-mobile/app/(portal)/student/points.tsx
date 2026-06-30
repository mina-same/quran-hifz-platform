import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import ProgressBar from '@/components/ui/ProgressBar';
import { theme } from '@/lib/theme';

const MY_PTS = 740;
const NEXT   = 1000;

const STATS = [
  { label: 'نقطة مكتسبة',         value: String(MY_PTS),       color: theme.green },
  { label: 'للمستوى التالي',       value: String(NEXT - MY_PTS), color: theme.gold },
  { label: 'مرتبتك في الحلقة',    value: '١',                   color: '#3B82F6' },
  { label: 'مستواك',               value: 'نجم ⭐',             color: theme.green },
];

const LEADERS = [
  { rank: '🥇', name: 'عبدالله الحميداني', pts: 740, me: true },
  { rank: '🥈', name: 'يوسف الشمري',        pts: 680, me: false },
  { rank: '🥉', name: 'محمد القحطاني',      pts: 620, me: false },
  { rank: '#٤', name: 'عمر العتيبي',        pts: 550, me: false },
];

const HISTORY = [
  { day: 'اليوم',  reason: 'واجب يومي',              pts: '+٨٥٠' },
  { day: 'أمس',   reason: 'تقييم ممتاز من الأستاذ', pts: '+٦٠٠' },
  { day: 'الأحد', reason: 'حضور منتظم',              pts: '+١٠٠' },
];

export default function StudentPoints() {
  const pct = Math.round((MY_PTS / NEXT) * 100);
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <StatsRow stats={STATS} />
        <Card>
          <CardHeader title={`التقدم نحو المستوى التالي — ${NEXT} نقطة`} />
          <Text style={s.pct}>{pct}٪</Text>
          <ProgressBar pct={pct} />
        </Card>
        <Card>
          <CardHeader title="المتصدرون" />
          {LEADERS.map((l, i) => (
            <View key={i} style={[s.row, i && s.border, l.me && s.myRow]}>
              <Text style={s.rankIcon}>{l.rank}</Text>
              <Text style={[s.name, l.me && s.meName]}>{l.name}</Text>
              <Text style={s.pts}>{l.pts}</Text>
            </View>
          ))}
        </Card>
        <Card>
          <CardHeader title="آخر النقاط" />
          {HISTORY.map((h, i) => (
            <View key={i} style={[s.row, i && s.border]}>
              <Text style={s.day}>{h.day}</Text>
              <Text style={[s.name, { flex: 1 }]}>{h.reason}</Text>
              <Text style={s.earned}>{h.pts}</Text>
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
  pct: { fontSize: 28, fontFamily: theme.fontCairoBold, color: theme.green, textAlign: 'center', marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  myRow: { backgroundColor: theme.greenPale, borderRadius: 8, paddingHorizontal: 8 },
  rankIcon: { fontSize: 18, minWidth: 30 },
  name: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text },
  meName: { fontFamily: theme.fontCairoBold },
  pts: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.gold },
  day: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, minWidth: 40 },
  earned: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.green },
});
