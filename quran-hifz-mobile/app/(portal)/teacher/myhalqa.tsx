import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import HalqaCard from '@/components/domain/HalqaCard';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { usePortalStore } from '@/lib/store/portalStore';
import { useHalqat, type Halqa } from '@/lib/queries/halqat';
import type { Halqa as HalqaCardData } from '@/lib/types/halqa';
import { theme } from '@/lib/theme';

function getName(v: { _id: string; name: string } | string | undefined): string {
  if (v && typeof v === 'object' && 'name' in v) return v.name;
  if (typeof v === 'string') return v;
  return '';
}

function toHalqaCardData(h: Halqa): HalqaCardData {
  return {
    id: h._id,
    name: h.name,
    teacher: getName(h.teacher),
    mosque: getName(h.masjid),
    days: h.days,
    time: h.time,
    studentCount: h.studentCount ?? 0,
    capacity: h.capacity,
    attendancePct: h.attendancePct,
    completionPct: h.completionPct,
  };
}

export default function TeacherHalqa() {
  const router = useRouter();
  const authUser = usePortalStore((s) => s.authUser);
  const { data: myHalqat = [], isLoading, isError } = useHalqat({ teacher: authUser?.profileId });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.green} />
          </View>
        )}

        {isError && <Alert variant="error">تعذر تحميل الحلقات</Alert>}

        {!isLoading && !isError && myHalqat.length === 0 && (
          <Text style={styles.muted}>لا توجد حلقات مسجلة لهذا المعلم</Text>
        )}

        {myHalqat.map((halqa) => (
          <HalqaCard
            key={halqa._id}
            halqa={toHalqaCardData(halqa)}
            actions={
              <View style={styles.actions}>
                <Button
                  label="الطلاب"
                  variant="ghost"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(portal)/teacher/students' as any)}
                />
                <Button
                  label="الحضور"
                  variant="primary"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(portal)/teacher/attendance' as any)}
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
  loadingBox: { paddingVertical: 8, alignItems: 'center' },
  muted: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 20 },
  actions: { flexDirection: 'row', gap: 8, flex: 1 },
  actionBtn: { flex: 1 },
});
