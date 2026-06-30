import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { theme } from '@/lib/theme';

const ROWS = [
  { date: 'اليوم',    type: 'حفظ جديد',     segment: 'البقرة ٢٤٠-٢٤٥', pts: '٨٥٠', note: 'أحسنت! الإيقاع ممتاز' },
  { date: 'أمس',     type: 'مراجعة بعيدة',  segment: 'سورة الكهف',       pts: '٦٠٠', note: 'تحقق من مد المنفصل' },
  { date: 'الاثنين', type: 'حفظ جديد',     segment: 'البقرة ٢٢٠-٢٣٥', pts: '٨٠٠', note: 'أداء قوي' },
  { date: 'السبت',   type: 'تحسين تلاوة',  segment: 'الفاتحة',           pts: '٧٠٠', note: 'حسّن نطق الضاد' },
];

export default function ParentRecordings() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader title="الدروس المسجّلة" />
          {ROWS.map((r, i) => (
            <View key={i} style={[s.item, i && s.border]}>
              <View style={s.itemHead}>
                <Text style={s.date}>{r.date}</Text>
                <Badge variant="blue">{r.type}</Badge>
                <Text style={s.pts}>{r.pts} نقطة</Text>
              </View>
              <Text style={s.segment}>{r.segment}</Text>
              <Text style={s.note}>{r.note}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.cream },
  page: { padding: 16 },
  item: { paddingVertical: 12 },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  date: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo },
  pts: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.gold, marginRight: 'auto' as any },
  segment: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text, marginBottom: 2 },
  note: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
});
