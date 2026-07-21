import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import { useSelectedChild } from '@/components/domain/useSelectedChild';
import { useChildHifz, type ChildHifzEntry } from '@/lib/queries/parent';
import { theme } from '@/lib/theme';

const DOT_COLOR: Record<ChildHifzEntry['status'], string> = {
  'مكتمل': theme.green,
  'جارٍ': theme.gold,
  'لم يبدأ': theme.border,
};
const BADGE_LABEL: Record<ChildHifzEntry['status'], string> = {
  'مكتمل': 'مكتمل ✓',
  'جارٍ': 'جارٍ',
  'لم يبدأ': 'لم يبدأ',
};

export default function ParentTimeline() {
  const { selectedChildId, hasNoChildren } = useSelectedChild();
  const { data: hifzEntries, isLoading } = useChildHifz(selectedChildId ?? undefined);

  if (!selectedChildId) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <View style={s.loading}>
          {hasNoChildren ? (
            <Text style={s.emptyText}>لم يتم اختيار طالب</Text>
          ) : (
            <ActivityIndicator color={theme.green} size="large" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader title="رحلة الحفظ من البداية حتى الآن" />

          {isLoading ? (
            <View style={s.inlineLoading}>
              <ActivityIndicator color={theme.green} />
            </View>
          ) : !hifzEntries || hifzEntries.length === 0 ? (
            <Text style={s.emptyInline}>لا توجد سجلات حفظ بعد.</Text>
          ) : (
            <View style={{ paddingRight: 16 }}>
              {hifzEntries.map((ev) => (
                <View key={ev._id} style={s.row}>
                  <View style={[s.dot, { backgroundColor: DOT_COLOR[ev.status] }]} />
                  <View style={s.evBody}>
                    <View style={s.evHead}>
                      <Text style={s.evLabel}>سورة {ev.surah}</Text>
                      <Text style={[s.badge, { color: DOT_COLOR[ev.status] }]}>{BADGE_LABEL[ev.status]}</Text>
                    </View>
                    {!!ev.notes && <Text style={s.detail}>{ev.notes}</Text>}
                    {!!ev.completionDate && (
                      <Text style={s.date}>{new Date(ev.completionDate).toLocaleDateString('ar-SA')}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 16 },
  loading: { paddingVertical: 60, alignItems: 'center' },
  inlineLoading: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
  emptyInline: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 24 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  dot: { width: 18, height: 18, borderRadius: 9, marginTop: 4, flexShrink: 0 },
  evBody: { flex: 1, backgroundColor: theme.bg, borderRadius: 10, padding: 12 },
  evHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  evLabel: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  badge: { fontSize: 11, fontFamily: theme.fontCairoBold },
  detail: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
  date: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, marginTop: 2 },
});
