import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import { theme } from '@/lib/theme';

const MSGS = [
  { from: 'أ. ناصر الحميداني', text: 'أحسن عبدالله في مراجعة آل عمران هذا الأسبوع', time: 'أمس' },
  { from: 'نظام الجمعية',      text: 'تذكير: موعد حلقة الفجر غداً السبت ٦:١٥', time: 'اليوم' },
  { from: 'إدارة الجمعية',     text: 'عبدالله انتقل لمستوى نجم ⭐ بعد ٧٠٠ نقطة', time: 'اليوم' },
  { from: 'نظام الجمعية',      text: 'تم استلام واجب عبدالله ✓ — ٨٥٠ نقطة', time: 'اليوم' },
];

export default function ParentMessages() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader title="الرسائل الواردة" />
          {MSGS.map((m, i) => (
            <View key={i} style={[s.item, i && s.border]}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{m.from[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.head}>
                  <Text style={s.from}>{m.from}</Text>
                  <Text style={s.time}>{m.time}</Text>
                </View>
                <Text style={s.text}>{m.text}</Text>
              </View>
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
  item: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.greenPale, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.green },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  from: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  time: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo },
  text: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
});
