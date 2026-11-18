import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowRight, IconBell, IconLock, IconSend } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { toast } from '@/components/ui/Toast';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormInput from '@/components/forms/FormInput';
import { initials, timeLabel } from '@/components/domain/ConversationsScreen';
import { useConversations, useMarkThreadRead, useSendInThread, useThread } from '@/lib/queries/messages';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

const MAX = 1000;

/** One teacher ↔ parent thread (or the read-only «system» thread). Route
  *  params: id (other user's id or 'system'), name, role. Back goes to
 *  `backPath` explicitly: tabs' back history would not return to the list. */
export default function ThreadScreen({ backPath }: { backPath: string }) {
  const theme = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { id, name = '', role } = useLocalSearchParams<{ id?: string; name?: string; role?: string }>();
  const userId = id ?? null;
  const myId = usePortalStore((st) => st.authUser?.id);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const { data: thread, isLoading } = useThread(userId);
  const { data: rows = [] } = useConversations();
  const send = useSendInThread(userId);
  const markRead = useMarkThreadRead();
  const isSystem = role === 'system';
  const unreadHere = rows.find((r) => r.userId === userId)?.unread ?? 0;

  // Hidden tab screens stay mounted, so a different thread reuses this instance.
  useEffect(() => { setDraft(''); }, [userId]);

  // Opening a thread with unread messages marks them read.
  useEffect(() => {
    if (userId && unreadHere > 0) markRead.mutate(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, unreadHere]);

  async function submit() {
    const body = draft.trim();
    if (!body || !userId) return;
    try {
      await send.mutateAsync(body);
      setDraft('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const canSend = !!draft.trim() && !send.isPending;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.header}>
          <Pressable onPress={() => router.navigate(backPath as any)} hitSlop={10} accessibilityLabel="رجوع">
            <IconArrowRight size={22} color={theme.text} />
          </Pressable>
          <View style={s.avatar}>
            {isSystem
              ? <IconBell size={16} color={theme.greenAccent} />
              : <Text style={s.avatarText}>{initials(name)}</Text>}
          </View>
          <Text style={s.headerTitle} numberOfLines={1}>{name}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {isLoading && <SkeletonRows count={4} rowHeight={48} />}
          {(thread?.messages ?? []).map((m) => {
            const mine = String(m.sender) === myId;
            return (
              <View key={m._id} style={[s.bubble, mine ? s.mine : s.theirs]}>
                <Text style={[s.body, mine && s.bodyMine]}>{m.body}</Text>
                <Text style={[s.time, mine && s.timeMine]}>{timeLabel(m.createdAt)}</Text>
              </View>
            );
          })}
          {thread && thread.messages.length === 0 && (
            <Text style={s.empty}>لا توجد رسائل بعد — اكتب أول رسالة</Text>
          )}
        </ScrollView>


        {thread && !thread.canReply ? (
          <View style={s.readonly}>
            <IconLock size={14} color={theme.textMuted} />
            <Text style={s.readonlyText}>
              {isSystem ? 'إشعارات تلقائية من النظام — لا يمكن الرد عليها' : 'لا يمكنك مراسلة هذا المستخدم حالياً'}
            </Text>
          </View>
        ) : (
          <View style={s.compose}>
            <FormInput
              style={s.input}
              multiline
              maxLength={MAX}
              placeholder="اكتب رسالتك…"
              value={draft}
              onChangeText={setDraft}
              accessibilityLabel="نص الرسالة"
            />
            <Pressable
              style={[s.sendBtn, !canSend && s.sendDisabled]}
              disabled={!canSend}
              onPress={submit}
              accessibilityLabel="إرسال"
            >
              {/* Paper plane points left-to-right; flip it so it points "forward" in RTL. */}
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <IconSend size={20} color={theme.white} />
              </View>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    headerTitle: { flex: 1, fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    avatar: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: theme.tone.green.bg,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.tone.green.text },
    messages: { padding: theme.pagePadding, gap: 8 },
    // Forced RTL: flex-start = visual right (my messages), flex-end = visual left.
    bubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius },
    mine: { alignSelf: 'flex-start', backgroundColor: theme.greenAccent },
    theirs: { alignSelf: 'flex-end', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
    body: { fontSize: 14, fontFamily: theme.fontCairo, color: theme.text },
    bodyMine: { color: theme.white },
    time: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 2 },
    timeMine: { color: theme.white, opacity: 0.8 },
    empty: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    readonly: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: 14, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.cardAlt,
    },
    readonlyText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    compose: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10,
      borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.card,
    },
    input: { flex: 1, maxHeight: 120, paddingVertical: 10 },
    sendBtn: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: theme.greenAccent,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    sendDisabled: { opacity: 0.5 },
  });
}
