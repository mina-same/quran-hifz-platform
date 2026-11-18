import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Text from '@/components/ui/Text';
import Alert from '@/components/ui/Alert';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormSelect from '@/components/forms/FormSelect';
import DailyReportComposer from '@/components/domain/DailyReportComposer';
import { DailyReportDateBar } from '@/components/domain/DailyReportCard';
import { useTracks } from '@/lib/queries/tracks';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { todayIso } from '@/lib/date';

/** «التقرير اليومي» — pick a halqa + day, then edit and send its report. */
export default function TeacherDailyReport() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: tracks = [], isLoading } = useTracks(undefined, profileId);
  // Optional `track`/`date` params (from DailyReportPrompt) preselect the
  // halqa and day; without them the first halqa + today stay the default.
  const params = useLocalSearchParams<{ track?: string; date?: string }>();
  const [trackId, setTrackId] = useState(params.track ?? '');
  const [date, setDate] = useState(params.date ?? todayIso());

  // A tab screen stays mounted, so a later push with new params must re-apply them.
  useEffect(() => {
    if (params.track) setTrackId(params.track);
    if (params.date) setDate(params.date);
  }, [params.track, params.date]);

  useEffect(() => {
    if (!trackId && tracks.length) setTrackId(tracks[0]._id);
  }, [tracks, trackId]);

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    title: { fontFamily: theme.fontCairoBold, fontSize: 18, color: theme.text },
    label: { fontSize: 13, color: theme.textMuted, marginBottom: 6 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>التقرير اليومي للحلقة</Text>
          {isLoading ? (
            <SkeletonRows count={3} />
          ) : tracks.length === 0 ? (
            <Alert variant="info">لا توجد حلقات مرتبطة بحسابك بعد.</Alert>
          ) : (
            <>
              <View>
                <Text style={styles.label}>الحلقة</Text>
                <FormSelect
                  value={trackId}
                  onChange={setTrackId}
                  title="الحلقة"
                  options={tracks.map((t) => ({ value: t._id, label: t.title }))}
                />
              </View>
              <View>
                <Text style={styles.label}>التاريخ</Text>
                <DailyReportDateBar date={date} onChange={setDate} />
              </View>
              {!!trackId && (
                <DailyReportComposer
                  key={`${trackId}:${date}`}
                  trackId={trackId}
                  date={date}
                  onGoRecord={() => router.push('/(portal)/teacher/attendance' as any)}
                />
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
