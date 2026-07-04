import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import MasjidAccordion from '@/components/domain/MasjidAccordion';
import { MASAJID } from '@/lib/data/halqat';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export default function AdminMasajid() {
  const theme = useAppTheme();
  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
