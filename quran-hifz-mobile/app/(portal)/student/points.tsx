import { useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import ProgressBar from '@/components/ui/ProgressBar';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

// Static content — mirrors web's StudentPoints.tsx exactly.
const LEVELS: { label: string; range: string; pct: number; active: boolean }[] = [
  { label: 'مبتدئ',    range: '0–200',    pct: 100, active: false },
  { label: 'ناشط',     range: '200–450',  pct: 100, active: false },
  { label: 'متميز',    range: '450–700',  pct: 100, active: false },
  { label: 'نجم ⭐',   range: '700–1000', pct: 57,  active: true  },
  { label: 'حافظ 🏆',  range: '1000+',    pct: 0,   active: false },
];

const HISTORY = [
  { date: 'اليوم',    text: 'واجب حفظ جديد — البقرة آيات ٢٤٠-٢٤٥', pts: '+٨٠',  tone: 'green' },
  { date: 'أمس',      text: 'واجب مراجعة بعيدة — سورة الكهف',       pts: '+٦٠',  tone: 'green' },
  { date: 'الاثنين',  text: 'حضور حلقة الفجر',                       pts: '+٢٠',  tone: 'blue'  },
  { date: 'الأحد',    text: 'تقييم الأستاذ: ممتاز',                  pts: '+١٠٠', tone: 'gold'  },
  { date: 'السبت',    text: 'واجب تحسين تلاوة',                      pts: '+٥٠',  tone: 'green' },
  { date: 'الخميس',   text: 'حضور حلقة الفجر',                       pts: '+٢٠',  tone: 'blue'  },
  { date: 'الأربعاء', text: 'واجب حفظ جديد',                         pts: '+٨٠',  tone: 'green' },
];

export default function StudentPoints() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  // Built inside the component: these accents come from the theme, so a
  // module-scope array would freeze them to whichever mode loaded first.
  const STATS = useMemo(() => [
    { label: 'إجمالي النقاط',  value: '٧٤٠', color: theme.gold },
    { label: 'أسابيع متتالية', value: '٣',   color: theme.green },
    { label: 'واجب مسلَّم',     value: '١٢',  color: theme.blue },
    { label: 'المستوى الحالي', value: 'نجم', color: theme.green },
  ], [theme]);
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <AyahBar />
        <StatsRow stats={STATS} />
        <Card>
          <CardHeader title="المستويات" />
          {LEVELS.map((lv) => (
            <View key={lv.label} style={[s.level, lv.active && s.levelActive]}>
              <Text style={[s.levelLabel, lv.active && s.levelLabelActive]}>{lv.label}</Text>
              <View style={s.levelBar}>
                <ProgressBar value={lv.pct} showPercent={false} color={lv.active ? theme.gold : undefined} />
              </View>
              <Text style={s.range}>{lv.range}</Text>
            </View>
          ))}
        </Card>
        <Card>
          <CardHeader title="تاريخ النقاط" />
          {HISTORY.map((h, i) => (
            <View key={i} style={[s.row, i > 0 && s.border]}>
              <Text style={s.day}>{h.date}</Text>
              <Text style={s.text}>{h.text}</Text>
              <Text style={[s.earned, { color: h.tone === 'gold' ? theme.gold : h.tone === 'blue' ? theme.textMuted : theme.green }]}>
                {h.pts}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.cream },
    page: { padding: 16, gap: 14 },
    level: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, padding: 8, borderRadius: 8, backgroundColor: theme.cream },
    levelActive: { backgroundColor: theme.goldPale },
    levelLabel: { minWidth: 64, fontSize: 12, fontFamily: theme.fontCairo, color: theme.text },
    levelLabelActive: { fontFamily: theme.fontCairoBold, color: theme.gold },
    levelBar: { flex: 1 },
    range: { minWidth: 60, fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'right' },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
    border: { borderTopWidth: 1, borderTopColor: theme.border },
    day: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, minWidth: 48 },
    text: { flex: 1, fontSize: 12, fontFamily: theme.fontCairo, color: theme.text },
    earned: { fontSize: 13, fontFamily: theme.fontCairoBold },
  });
}
