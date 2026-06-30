import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HalqaCard from '@/components/domain/HalqaCard';
import { HALQAT } from '@/lib/data/halqat';
import { theme } from '@/lib/theme';

export default function AdminHalqat() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {HALQAT.map((halqa) => (
          <HalqaCard key={halqa.id} halqa={halqa} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
});
