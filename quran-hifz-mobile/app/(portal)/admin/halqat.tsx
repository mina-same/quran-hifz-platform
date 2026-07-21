import { ScrollView, View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import HalqaCard from '@/components/domain/HalqaCard';
import { useHalqat, type Halqa as HalqaAPI } from '@/lib/queries/halqat';
import type { Halqa as LocalHalqa } from '@/lib/types/halqa';
import { theme } from '@/lib/theme';

function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return '';
}

function toCardHalqa(h: HalqaAPI): LocalHalqa {
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

export default function AdminHalqat() {
  const { data, isLoading, error } = useHalqat();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.page}>
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={theme.green} size="large" />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.page}>
          <Alert variant="warning">{error.message}</Alert>
        </View>
      </SafeAreaView>
    );
  }

  const halqat = data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {halqat.map((halqa) => (
          <HalqaCard key={halqa._id} halqa={toCardHalqa(halqa)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  loadingCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
});
