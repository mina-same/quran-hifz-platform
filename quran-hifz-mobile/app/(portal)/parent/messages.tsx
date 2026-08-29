import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useParentChildren, useChildMessages } from '@/lib/queries/parent';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { AR_LOCALE } from '@/lib/date';

export default function ParentMessages() {
  const theme = useAppTheme();
  const selectedChildId = usePortalStore((s) => s.selectedChildId);
  const { data: children = [] } = useParentChildren();
  const childId = selectedChildId ?? children[0]?._id;

  const { data: messages = [], isLoading, isRefetching, refetch } = useChildMessages(childId);

  const s = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.cream },
    page: { padding: 16 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
    item: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' },
    border: { borderTopWidth: 1, borderTopColor: theme.border },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.greenPale, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    avatarText: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.green },
    head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
    from: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    time: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo },
    text: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
  }), [theme]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.spinner} colors={[theme.spinner]} />
        }
      >
        <Card>
          <CardHeader title="الرسائل الواردة" />
          {isLoading && <SkeletonRows count={4} rowHeight={56} />}
          {!isLoading && messages.length === 0 && <Text style={s.muted}>لا توجد رسائل</Text>}
          {messages.map((m, i) => {
            const from = typeof m.sender === 'object' ? m.sender.name : 'إدارة الجمعية';
            return (
              <View key={m._id} style={[s.item, i > 0 && s.border]}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{from[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.head}>
                    <Text style={s.from}>{from}</Text>
                    <Text style={s.time}>{new Date(m.createdAt).toLocaleDateString(AR_LOCALE)}</Text>
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
