import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import { useSelectedChild } from '@/components/domain/useSelectedChild';
import { useChildHomework } from '@/lib/queries/parent';
import { theme } from '@/lib/theme';

export default function ParentHomeworkView() {
  const { selectedChildId, activeChild, hasNoChildren } = useSelectedChild();
  const { data: hwData, isLoading } = useChildHomework(selectedChildId ?? undefined);

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

  const groupHWs = hwData?.group ?? [];
  const individualHWs = hwData?.individual ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Alert variant="info">واجبات ابنك الجماعية والفردية المُكلَّف بها من المعلم.</Alert>

        <Card>
          <CardHeader title="الواجبات الجماعية" />
          {isLoading ? (
            <View style={s.inlineLoading}>
              <ActivityIndicator color={theme.green} />
            </View>
          ) : groupHWs.length === 0 ? (
            <Text style={s.emptyInline}>لا توجد واجبات جماعية</Text>
          ) : (
            groupHWs.map((hw, i) => (
              <View key={hw._id} style={[s.item, i > 0 && s.border]}>
                <Text style={s.title}>{hw.title}</Text>
                <Badge label={`الموعد: ${new Date(hw.dueDate).toLocaleDateString('ar-SA')}`} variant="gold" />
              </View>
            ))
          )}
        </Card>

        <Card>
          <CardHeader title={`واجبات خاصة بـ ${activeChild?.name ?? '—'}`} />
          {individualHWs.length === 0 ? (
            <Text style={s.emptyInline}>لا توجد واجبات فردية حالياً — ممتاز!</Text>
          ) : (
            individualHWs.map((hw, i) => (
              <View key={hw._id} style={[s.item, i > 0 && s.border]}>
                <Text style={s.title}>{hw.segment}</Text>
                <Text style={s.desc}>{hw.notes ?? hw.type}</Text>
                <Badge label={`الموعد: ${new Date(hw.dueDate).toLocaleDateString('ar-SA')}`} variant="gold" />
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 16, gap: 14 },
  loading: { paddingVertical: 60, alignItems: 'center' },
  inlineLoading: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
  emptyInline: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 16 },
  item: { paddingVertical: 12, gap: 6 },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  title: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  desc: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
});
