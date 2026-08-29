import { useMemo } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import AudioRecorder from '@/components/domain/AudioRecorder';
import { useHomework } from '@/lib/queries/homework';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

import { AR_LOCALE } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;

function getTitle(v: { title: string } | string | undefined): string {
  if (!v) return '';
  return typeof v === 'object' ? v.title : v;
}

export default function StudentHomework() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: homework = [], isLoading, isRefetching, refetch } = useHomework({ student: profileId, status: 'معلق' });
  const today = homework[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.green]} tintColor={theme.green} />
        }
      >
        <AyahBar />

        {/* Today's assignment */}
        <Card>
          <CardHeader title="واجب اليوم" />
          {isLoading && <Text style={styles.muted}>جارٍ التحميل...</Text>}
          {!isLoading && !today && <Text style={styles.muted}>لا يوجد واجب معلق حالياً</Text>}
          {today && (
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>المقطع المطلوب</Text>
                <Text style={styles.segment}>{today.segment}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>نوع الواجب</Text>
                <Badge label={today.type} variant="gold" />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>المصدر</Text>
                <Text style={styles.gridValue}>{today.specialTrack ? `مسار: ${getTitle(today.specialTrack)}` : 'الحلقة'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>الموعد النهائي</Text>
                <Text style={styles.gridValue}>{today.dueDate ? new Date(today.dueDate).toLocaleDateString(AR_LOCALE) : '—'}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Recorder */}
        <Card>
          <CardHeader title="تسجيل التلاوة" />
          <AudioRecorder />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    gridItem: { width: '46%', gap: 4 },
    gridLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    segment: { fontSize: 18, fontFamily: theme.fontCairoBold, color: theme.green },
    gridValue: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
  });
}
