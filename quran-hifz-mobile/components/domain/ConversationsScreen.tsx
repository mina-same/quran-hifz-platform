import { useMemo, useState } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconEdit, IconX, IconBell } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Card from '@/components/ui/Card';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormInput from '@/components/forms/FormInput';
import { useConversations, useMessageContacts } from '@/lib/queries/messages';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { AR_LOCALE } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');
}

export function timeLabel(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString(AR_LOCALE, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(AR_LOCALE, { day: 'numeric', month: 'short' });
}

/**
 * «الرسائل» for teachers and parents (mirrors web ConversationsPage): one
 * thread per person. A teacher talks to the parents of their students, a
 * parent to their children's teachers — the server enforces who may write
 * to whom. Opening a row pushes `threadPath` with { id, name, role }.
 */
export default function ConversationsScreen({ threadPath }: { threadPath: string }) {
  const theme = useAppTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const isTeacher = usePortalStore((st) => st.authUser?.role) === 'teacher';
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');

  const { data: rows = [], isLoading, isRefetching, refetch } = useConversations();
  const { data: contacts = [] } = useMessageContacts(picking);

  const open = (id: string, name: string, role: string) => {
    setPicking(false);
    router.push({ pathname: threadPath, params: { id, name, role } } as any);
  };

  const term = q.trim();
  const filtered = contacts.filter((c) => !term || c.name.includes(term) || c.subtitle.includes(term));

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.spinner} colors={[theme.spinner]} />
        }
      >
        <Card>
          <View style={s.head}>
            <Text style={s.headTitle}>المحادثات</Text>
            {picking ? (
              <Pressable onPress={() => setPicking(false)} hitSlop={10} accessibilityLabel="إغلاق">
                <IconX size={20} color={theme.textMuted} />
              </Pressable>
            ) : (
              <Pressable style={s.newBtn} onPress={() => { setPicking(true); setQ(''); }}>
                <IconEdit size={16} color={theme.white} />
                <Text style={s.newBtnText}>رسالة جديدة</Text>
              </Pressable>
            )}
          </View>

          {picking ? (
            <>
              <FormInput
                autoFocus
                placeholder={isTeacher ? 'ابحث عن ولي أمر أو طالب…' : 'ابحث عن معلم…'}
                value={q}
                onChangeText={setQ}
              />
              {filtered.length === 0 ? (
                <Text style={s.empty}>{isTeacher ? 'لا يوجد أولياء أمور مرتبطون بطلابك' : 'لا يوجد معلمون لأبنائك'}</Text>
              ) : (
                filtered.map((c, i) => (
                  <Pressable key={c.userId} style={[s.row, i > 0 && s.border]} onPress={() => open(c.userId, c.name, c.role)}>
                    <View style={s.avatar}><Text style={s.avatarText}>{initials(c.name)}</Text></View>
                    <View style={s.main}>
                      <Text style={s.name}>{c.name}</Text>
                      <Text style={s.snippet} numberOfLines={1}>{c.subtitle}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </>
          ) : isLoading ? (
            <SkeletonRows count={4} rowHeight={56} />
          ) : rows.length === 0 ? (
            <Text style={s.empty}>لا توجد محادثات بعد — ابدأ بـ «رسالة جديدة»</Text>
          ) : (
            rows.map((r, i) => (
              <Pressable key={r.userId} style={[s.row, i > 0 && s.border]} onPress={() => open(r.userId, r.name, r.role)}>
                <View style={s.avatar}>
                  {r.role === 'system'
                    ? <IconBell size={18} color={theme.greenAccent} />
                    : <Text style={s.avatarText}>{initials(r.name)}</Text>}
                </View>
                <View style={s.main}>
                  <View style={s.top}>
                    <Text style={s.name} numberOfLines={1}>{r.name}</Text>
                    <Text style={s.time}>{timeLabel(r.last.createdAt)}</Text>
                  </View>
                  <Text style={s.snippet} numberOfLines={1}>{r.last.fromMe ? 'أنت: ' : ''}{r.last.body}</Text>
                </View>
                {r.unread > 0 && (
                  <View style={s.unread}><Text style={s.unreadText}>{r.unread.toLocaleString(AR_LOCALE)}</Text></View>
                )}
              </Pressable>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    newBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.greenAccent,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radiusSm, overflow: 'hidden',
    },
    newBtnText: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.white },
    empty: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    border: { borderTopWidth: 1, borderTopColor: theme.border },
    avatar: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: theme.tone.green.bg,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    avatarText: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.tone.green.text },
    main: { flex: 1, minWidth: 0 },
    top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    name: { flexShrink: 1, fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    time: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    snippet: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    unread: {
      minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: theme.red,
      alignItems: 'center', justifyContent: 'center',
    },
    unreadText: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.white },
  });
}
