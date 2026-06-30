import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import { theme } from '@/lib/theme';

type EventStatus = 'done' | 'current' | 'future';
const TL: { date: string; label: string; detail: string; juz: number; s: EventStatus }[] = [
  { date: 'محرم ١٤٤٦',     label: 'بدء خطة الختم',           detail: 'الفاتحة + قصار المفصَّل', juz: 1,  s: 'done' },
  { date: 'صفر ١٤٤٦',      label: 'إتمام الجزء الثالث',       detail: 'آل عمران كاملاً',          juz: 3,  s: 'done' },
  { date: 'ربيع الأول',     label: 'إتمام الجزء السادس',       detail: 'المائدة — الأنعام',         juz: 6,  s: 'done' },
  { date: 'رجب ١٤٤٦',      label: 'الموقع الحالي — الجزء ٢٠', detail: 'البقرة ص٣٢',              juz: 20, s: 'current' },
  { date: 'رمضان ١٤٤٦',    label: 'المستهدف: الجزء ٢٧',       detail: 'الرحمن — الواقعة',         juz: 27, s: 'future' },
  { date: 'ذو الحجة ١٤٤٦', label: 'الهدف السنوي: الختم',      detail: 'الناس — الفاتحة',          juz: 30, s: 'future' },
];

const DOT_COLOR: Record<EventStatus, string> = { done: theme.green, current: theme.gold, future: theme.border };
const BADGE: Record<EventStatus, string> = { done: 'مكتمل ✓', current: 'أنت هنا', future: 'مستهدف' };

export default function ParentTimeline() {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader title="رحلة الحفظ من البداية حتى الختم" />
          <View style={{ paddingRight: 16 }}>
            {TL.map((ev, i) => (
              <View key={i} style={s.row}>
                <View style={[s.dot, { backgroundColor: DOT_COLOR[ev.s] }]} />
                <View style={s.evBody}>
                  <View style={s.evHead}>
                    <Text style={s.evLabel}>{ev.label}</Text>
                    <Text style={[s.badge, { color: DOT_COLOR[ev.s] }]}>{BADGE[ev.s]}</Text>
                  </View>
                  <Text style={s.detail}>{ev.detail} • الجزء {ev.juz}</Text>
                  <Text style={s.date}>{ev.date}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.cream },
  page: { padding: 16 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  dot: { width: 18, height: 18, borderRadius: 9, marginTop: 4, flexShrink: 0 },
  evBody: { flex: 1, backgroundColor: theme.cream, borderRadius: 10, padding: 12 },
  evHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  evLabel: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  badge: { fontSize: 11, fontFamily: theme.fontCairoBold },
  detail: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
  date: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, marginTop: 2 },
});
