import { useMemo } from 'react';
import { ScrollView, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import MasjidAccordion from '@/components/domain/MasjidAccordion';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useMasajid } from '@/lib/queries/masajid';
import { useHalqat } from '@/lib/queries/halqat';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

function masjidIdOf(v: { _id: string } | string | undefined): string | undefined {
  if (v && typeof v === 'object') return v._id;
  if (typeof v === 'string') return v;
  return undefined;
}

export default function AdminMasajid() {
  const theme = useAppTheme();
  const { data: masajid = [], isLoading: loadingMasajid, isRefetching: refetchingMasajid, refetch: refetchMasajid } = useMasajid();
  const { data: halqat = [], isLoading: loadingHalqat, isRefetching: refetchingHalqat, refetch: refetchHalqat } = useHalqat();

  const isLoading = loadingMasajid || loadingHalqat;
  const isRefreshing = refetchingMasajid || refetchingHalqat;
  const onRefresh = () => { refetchMasajid(); refetchHalqat(); };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />}
      >
        <Card>
          <CardHeader title="المساجد والحلقات" />
          {isLoading && <SkeletonRows count={3} rowHeight={56} />}
          {!isLoading && masajid.length === 0 && <Text style={styles.muted}>لا توجد مساجد مسجلة بعد</Text>}
          {masajid.map((masjid) => (
            <MasjidAccordion
              key={masjid._id}
              masjid={masjid}
              halqat={halqat.filter((h) => masjidIdOf(h.masjid) === masjid._id)}
            />
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
