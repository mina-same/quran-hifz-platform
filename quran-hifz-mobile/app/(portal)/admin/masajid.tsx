import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import MasjidAccordion from '@/components/domain/MasjidAccordion';
import { MASAJID } from '@/lib/data/halqat';
import { theme } from '@/lib/theme';

export default function AdminMasajid() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Card>
          <CardHeader title="المساجد والحلقات" />
          {MASAJID.map((masjid) => (
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
});
