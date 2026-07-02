import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { useParentChildren, useChildHomework } from '@/lib/queries/parent';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

export default function ParentHomeworkView() {
  const selectedChildId = usePortalStore((s) => s.selectedChildId);
  const { data: children = [] } = useParentChildren();
  const childId = selectedChildId ?? children[0]?._id;

  const { data, isLoading } = useChildHomework(childId);
  const group = data?.group ?? [];
  const individual = data?.individual ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {isLoading && <Text style={s.muted}>جارٍ التحميل...</Text>}

        <Card>
          <CardHeader title="الواجبات الجماعية" />
          {!isLoading && group.length === 0 && <Text style={s.muted}>لا توجد واجبات جماعية</Text>}
          {group.map((hw, i) => (
            <View key={hw._id} style={[s.item, i > 0 && s.border]}>
              <Text style={s.title}>{hw.title}</Text>
              <Badge label={`الموعد: ${new Date(hw.dueDate).toLocaleDateString('ar-SA')}`} variant="gold" />
            </View>
          ))}
        </Card>
        <Card>
          <CardHeader title="الواجبات الفردية" />
          {!isLoading && individual.length === 0 && <Text style={s.muted}>لا توجد واجبات فردية</Text>}
          {individual.map((hw, i) => (
            <View key={hw._id} style={[s.item, i > 0 && s.border]}>
              <Text style={s.title}>{hw.type} — {hw.segment}</Text>
              {!!hw.notes && <Text style={s.desc}>{hw.notes}</Text>}
              <View style={s.badgeRow}>
                <Badge label={`الموعد: ${new Date(hw.dueDate).toLocaleDateString('ar-SA')}`} variant="gold" />
                <Badge
                  label={hw.status}
                  variant={hw.status === 'مراجع' ? 'green' : hw.status === 'متأخر' ? 'red' : 'gray'}
                />
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 16, gap: 14 },
  muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
  item: { paddingVertical: 12, gap: 6 },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  title: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  desc: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
  badgeRow: { flexDirection: 'row', gap: 8 },
});
