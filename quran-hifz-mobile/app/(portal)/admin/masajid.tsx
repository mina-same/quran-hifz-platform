import { ScrollView, View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import MasjidAccordion from '@/components/domain/MasjidAccordion';
import { useMasajid } from '@/lib/queries/masajid';
import { useHalqat, type Halqa as HalqaAPI } from '@/lib/queries/halqat';
import type { Halqa as LocalHalqa, Masjid as LocalMasjid } from '@/lib/types/halqa';
import { theme } from '@/lib/theme';

function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return '';
}

function getRefId(v: unknown): string {
  if (v && typeof v === 'object' && '_id' in v) return (v as { _id: string })._id;
  return typeof v === 'string' ? v : '';
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

export default function AdminMasajid() {
  const masajidQuery = useMasajid();
  const halqatQuery = useHalqat();

  const isLoading = masajidQuery.isLoading || halqatQuery.isLoading;
  const error = masajidQuery.error || halqatQuery.error;

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

  const masajid = masajidQuery.data ?? [];
  const halqat = halqatQuery.data ?? [];

  const masajidWithHalqat: LocalMasjid[] = masajid.map((m) => ({
    id: m._id,
    name: m.name,
    location: m.location,
    halqat: halqat.filter((h) => getRefId(h.masjid) === m._id).map(toCardHalqa),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader title="المساجد والحلقات" />
          {masajidWithHalqat.map((masjid) => (
            <MasjidAccordion key={masjid.id} masjid={masjid} />
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  loadingCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
});
