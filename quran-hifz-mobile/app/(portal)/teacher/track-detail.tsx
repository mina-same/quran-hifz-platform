import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowRight } from '@tabler/icons-react-native';
import TrackDetail from '@/components/domain/TrackDetail';
import { theme } from '@/lib/theme';

export default function TeacherTrackDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <IconArrowRight size={22} color={theme.text} />
        </Pressable>
        <Text style={s.headerTitle}>تفاصيل المسار</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {id ? <TrackDetail trackId={id} role="teacher" /> : <Text style={s.muted}>لم يتم تحديد مسار</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.card,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
  page: { padding: theme.pagePadding },
  muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
});
