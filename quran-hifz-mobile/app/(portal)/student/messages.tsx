import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { MY_MESSAGES } from '@/lib/data/students';
import { theme } from '@/lib/theme';

export default function StudentMessages() {
  const unreadCount = MY_MESSAGES.filter((m) => m.unread).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader
            title="صندوق الرسائل"
            right={unreadCount > 0 ? <Badge label={`${unreadCount} غير مقروء`} variant="red" /> : undefined}
          />
          {MY_MESSAGES.map((msg, i) => (
            <Pressable
              key={msg.id}
              style={({ pressed }) => [
                styles.msgRow,
                i < MY_MESSAGES.length - 1 && styles.msgBorder,
                msg.unread && styles.msgUnread,
                pressed && styles.msgPressed,
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{msg.initials}</Text>
              </View>
              <View style={styles.content}>
                <View style={styles.topRow}>
                  <Text style={styles.sender}>{msg.sender}</Text>
                  <View style={styles.timeRow}>
                    <Text style={styles.time}>{msg.time}</Text>
                    {msg.unread && <View style={styles.unreadDot} />}
                  </View>
                </View>
                <Badge label={msg.senderRole} variant="gray" />
                <Text style={styles.preview} numberOfLines={2}>{msg.preview}</Text>
              </View>
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14 },
  msgBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  msgUnread: { backgroundColor: 'rgba(27,94,32,0.04)', borderRadius: theme.radiusSm, paddingHorizontal: 8 },
  msgPressed: { backgroundColor: '#F0FDF4' },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.green, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.white },
  content: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sender: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F87171' },
  preview: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, lineHeight: 18 },
});
