import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import { useParentChildren, useChildRecordings } from '@/lib/queries/parent';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export default function ParentRecordings() {
  const theme = useAppTheme();
  const selectedChildId = usePortalStore((s) => s.selectedChildId);
  const { data: children = [] } = useParentChildren();
  const childId = selectedChildId ?? children[0]?._id;

  const { data: recordings = [], isLoading } = useChildRecordings(childId);

  const s = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 16 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
    item: { paddingVertical: 12 },
    border: { borderTopWidth: 1, borderTopColor: theme.border },
    itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
    date: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo },
    segment: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text, marginBottom: 2 },
    note: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
  }), [theme]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader title="الدروس المسجّلة" />
          {isLoading && <Text style={s.muted}>جارٍ التحميل...</Text>}
          {!isLoading && recordings.length === 0 && <Text style={s.muted}>لا توجد دروس مسجّلة</Text>}
          {recordings.map((r, i) => (
            <View key={r._id} style={[s.item, i > 0 && s.border]}>
              <View style={s.itemHead}>
                <Text style={s.date}>{new Date(r.recordedAt).toLocaleDateString('ar-SA')}</Text>
              </View>
              {!!r.segment && <Text style={s.segment}>{r.segment}</Text>}
              {!!r.notes && <Text style={s.note}>{r.notes}</Text>}
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
