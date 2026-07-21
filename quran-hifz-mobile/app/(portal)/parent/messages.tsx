import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import { useSelectedChild } from '@/components/domain/useSelectedChild';
import { useChildMessages } from '@/lib/queries/parent';
import { theme } from '@/lib/theme';

export default function ParentMessages() {
  const { selectedChildId, hasNoChildren } = useSelectedChild();
  const { data: messages, isLoading } = useChildMessages(selectedChildId ?? undefined);

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
          <CardHeader title="الرسائل الواردة" />

          {isLoading && (
            <View style={s.inlineLoading}>
              <ActivityIndicator color={theme.green} />
            </View>
          )}

          {!isLoading && (!messages || messages.length === 0) && (
            <Text style={s.emptyInline}>لا توجد رسائل بعد</Text>
          )}

          {!isLoading &&
            (messages ?? []).map((m, i) => {
              const senderName = typeof m.sender === 'object' ? m.sender.name : m.sender;
              return (
                <View key={m._id} style={[s.item, i > 0 && s.border]}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{senderName?.[0] ?? '؟'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.head}>
                      <Text style={s.from}>{senderName}</Text>
                      <Text style={s.time}>{new Date(m.createdAt).toLocaleDateString('ar-SA')}</Text>
                    </View>
                    <Text style={s.text}>{m.body}</Text>
                  </View>
                </View>
              );
            })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 16 },
  loading: { paddingVertical: 60, alignItems: 'center' },
  inlineLoading: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
  emptyInline: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 20 },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.green, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.white },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  from: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  time: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo },
  text: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
});
