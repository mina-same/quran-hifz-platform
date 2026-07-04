import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContextCard, { halqaToContext, trackToContext } from '@/components/domain/ContextCard';
import Button from '@/components/ui/Button';
import { useHalqat } from '@/lib/queries/halqat';
import { useSpecialTracks } from '@/lib/queries/specialTracks';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export default function TeacherHalqa() {
  const theme = useAppTheme();
  const router = useRouter();
  const profileId = usePortalStore((s) => s.authUser?.profileId);

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat({ teacher: profileId });
  const { data: tracks = [], isLoading: loadingTracks } = useSpecialTracks(undefined, profileId);

  const isLoading = loadingHalqat || loadingTracks;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {isLoading && <Text style={styles.muted}>جارٍ التحميل...</Text>}

        {!isLoading && halqat.length === 0 && tracks.length === 0 && (
          <Text style={styles.muted}>لا توجد حلقات أو مسارات مسندة إليك</Text>
        )}

        {halqat.map((halqa) => (
          <ContextCard
            key={halqa._id}
            context={halqaToContext(halqa)}
            actions={
              <View style={styles.actions}>
                <Button
                  label="الطلاب"
                  variant="ghost"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(portal)/teacher/students')}
                />
                <Button
                  label="الحضور"
                  variant="primary"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(portal)/teacher/attendance')}
                />
              </View>
            }
          />
        ))}

        {tracks.map((track) => (
          <ContextCard
            key={track._id}
            context={trackToContext(track)}
            actions={
              <View style={styles.actions}>
                <Button
                  label="الطلاب"
                  variant="ghost"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(portal)/teacher/special_tracks')}
                />
                <Button
                  label="الحضور"
                  variant="primary"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(portal)/teacher/attendance')}
                />
              </View>
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  actions: { flexDirection: 'row', gap: 8, flex: 1 },
  actionBtn: { flex: 1 },
  muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
});
