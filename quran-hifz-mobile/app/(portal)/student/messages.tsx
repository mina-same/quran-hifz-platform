import { useMemo } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useMessages, useMarkRead } from '@/lib/queries/messages';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

import { AR_LOCALE } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;

export default function StudentMessages() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: messages = [], isLoading, isRefetching, refetch } = useMessages();
  const markRead = useMarkRead();
  const unreadCount = messages.filter((m) => !m.readAt).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />
        }
      >
        <Card>
          <CardHeader
            title="صندوق الرسائل"
            right={unreadCount > 0 ? <Badge label={`${unreadCount} غير مقروء`} variant="red" /> : undefined}
          />

          {isLoading && <SkeletonRows count={4} rowHeight={64} />}

          {!isLoading && messages.length === 0 && (
            <Text style={styles.empty}>لا توجد رسائل بعد</Text>
          )}

          {!isLoading && messages.map((msg, i) => {
            const unread = !msg.readAt;
            return (
              <Pressable
                key={msg._id}
                onPress={() => { if (unread) markRead.mutate(msg._id); }}
                style={[
                  styles.msgRow,
                  i < messages.length - 1 && styles.msgBorder,
                  unread && styles.msgUnread,
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{msg.senderInitials}</Text>
                </View>
                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text style={styles.sender}>{msg.senderName}</Text>
                    <View style={styles.timeRow}>
                      <Text style={styles.time}>{new Date(msg.createdAt).toLocaleDateString(AR_LOCALE)}</Text>
                      {unread && <View style={styles.unreadDot} />}
                    </View>
                  </View>
                  <Badge label={msg.senderRole} variant="gray" />
                  <Text style={styles.preview} numberOfLines={2}>{msg.body}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    empty: { padding: 24, textAlign: 'center', color: theme.textMuted, fontFamily: theme.fontCairo, fontSize: 13 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14 },
    msgBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    msgUnread: { backgroundColor: 'rgba(27,94,32,0.04)', borderRadius: theme.radiusSm, paddingHorizontal: 8 },
    avatar: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: theme.greenAccent, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.white },
    content: { flex: 1, gap: 4 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sender: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    time: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.red },
    preview: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, lineHeight: 18 },
  });
}
