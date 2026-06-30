import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { theme } from '@/lib/theme';

const GROUP_HWS = [
  { title: 'مراجعة سورة البقرة آيات ١-٢٠', desc: 'مراجعة شاملة مع التجويد',  dueDay: 'الأحد' },
  { title: 'حفظ آل عمران آيات ١-١٠',       desc: 'حفظ جديد مع ضبط المخارج', dueDay: 'الثلاثاء' },
];
const INDIV_HWS = [
  { title: 'تحسين نطق حرف الضاد',  note: 'ركّز على الضاد في سورة الفاتحة',  dueDay: 'الأحد' },
  { title: 'مراجعة مد اللين',       note: 'تطبيق مد اللين في سورة يس',       dueDay: 'الثلاثاء' },
];

export default function ParentHomeworkView() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader title="الواجبات الجماعية" />
          {GROUP_HWS.map((hw, i) => (
            <View key={i} style={[s.item, i && s.border]}>
              <Text style={s.title}>{hw.title}</Text>
              <Text style={s.desc}>{hw.desc}</Text>
              <Badge variant="gold">الموعد: {hw.dueDay}</Badge>
            </View>
          ))}
        </Card>
        <Card>
          <CardHeader title="الواجبات الفردية" />
          {INDIV_HWS.map((hw, i) => (
            <View key={i} style={[s.item, i && s.border]}>
              <Text style={s.title}>{hw.title}</Text>
              <Text style={s.desc}>{hw.note}</Text>
              <Badge variant="gold">الموعد: {hw.dueDay}</Badge>
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
  item: { paddingVertical: 12 },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  title: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 4 },
  desc: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginBottom: 6 },
});
