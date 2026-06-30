import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import ProgressBar from '@/components/ui/ProgressBar';
import { theme } from '@/lib/theme';

const CHILD = { name: 'عبدالله الحميداني', juz: 20, attend: '٩٥٪', pts: 740, level: 'الحلقة المتميزة', halqa: 'حلقة عمر بن الخطاب', teacher: 'أ. ناصر الحميداني' };
const STATS = [
  { label: 'جزءاً محفوظاً',  value: String(CHILD.juz),   color: theme.green },
  { label: 'نسبة الحضور',    value: CHILD.attend,          color: theme.gold },
  { label: 'نقطة مكتسبة',   value: String(CHILD.pts),    color: '#3B82F6' },
  { label: 'المستوى',         value: CHILD.level,           color: theme.green },
];
const NOTIFS = [
  { day: 'اليوم',  text: 'أرسل الواجب اليومي بنجاح ✓' },
  { day: 'أمس',   text: `تقييم الأستاذ: ممتاز — ${CHILD.pts} نقطة` },
  { day: 'الأحد', text: 'حضر حلقة الفجر ✓' },
];

export default function ParentDashboard() {
  const pct = Math.round((CHILD.juz / 30) * 100);
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <AyahBar />
        <StatsRow stats={STATS} />
        <Card>
          <CardHeader title="خطة الحفظ الفردية" />
          <Text style={s.pctNum}>{pct}٪</Text>
          <ProgressBar pct={pct} />
          {[['الحلقة', CHILD.halqa], ['المعلم', CHILD.teacher], ['الجلسة القادمة', 'الثلاثاء بعد الفجر']].map(([k, v]) => (
            <View key={k} style={s.row}>
              <Text style={s.key}>{k}</Text>
              <Text style={s.val}>{v}</Text>
            </View>
          ))}
        </Card>
        <Card>
          <CardHeader title="آخر إشعارات" />
          {NOTIFS.map((n, i) => (
            <View key={i} style={[s.notifRow, i && s.borderTop]}>
              <Text style={s.day}>{n.day}</Text>
              <Text style={s.notifText}>{n.text}</Text>
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
  pctNum: { fontSize: 32, fontFamily: theme.fontCairoBold, color: theme.green, textAlign: 'center', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.border },
  key: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
  val: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
  notifRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  borderTop: { borderTopWidth: 1, borderTopColor: theme.border },
  day: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, minWidth: 42 },
  notifText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.text, flex: 1 },
});
