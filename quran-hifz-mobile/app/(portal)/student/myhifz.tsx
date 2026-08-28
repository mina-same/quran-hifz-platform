import { useMemo } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Alert from '@/components/ui/Alert';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { usePortalStore } from '@/lib/store/portalStore';
import { useHifz } from '@/lib/queries/hifz';
import { useStudent } from '@/lib/queries/students';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export default function StudentHifz() {
  const theme = useAppTheme();
  const authUser = usePortalStore((s) => s.authUser);
  const studentId = authUser?.profileId;

  const { data: hifzEntries = [], isLoading: hifzLoading, isError: hifzError, isRefetching: hifzRefetching, refetch: refetchHifz } = useHifz(studentId);
  const { data: student, isLoading: studentLoading, isRefetching: studentRefetching, refetch: refetchStudent } = useStudent(studentId);

  const isLoading = hifzLoading || studentLoading;
  const isRefetching = hifzRefetching || studentRefetching;
  const onRefresh = () => {
    refetchHifz();
    refetchStudent();
  };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    summaryItem: { flex: 1, gap: 4 },
    summaryLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    summaryValue: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    pctRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    pctLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    pctVal: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green },
    pctNote: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 4 },
    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    empty: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 24 },
  }), [theme]);

  const completed = hifzEntries.filter((e) => e.status === 'مكتمل').length;
  const total = hifzEntries.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = student ? Math.max(student.totalPages - student.progressPages, 0) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />
        }
      >
        <AyahBar />

        {hifzError && <Alert variant="error">تعذر تحميل خطة الحفظ</Alert>}

        {/* Summary card */}
        <Card>
          <CardHeader title="ملخص خطة الحفظ" />
          {student && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>الصفحات المحفوظة</Text>
                <Text style={styles.summaryValue}>{student.progressPages}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>الصفحات المتبقية</Text>
                <Text style={styles.summaryValue}>{remaining}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>المسار</Text>
                <Badge label={student.path} variant="green" />
              </View>
            </View>
          )}
          <View style={styles.pctRow}>
            <Text style={styles.pctLabel}>السور المكتملة</Text>
            <Text style={styles.pctVal}>{completed} / {total}</Text>
          </View>
          <ProgressBar value={pct} showPercent={false} />
          <Text style={styles.pctNote}>{pct}٪ مكتمل</Text>
        </Card>

        {/* Card-list */}
        <Card noPadding>
          <CardHeader title="تفاصيل السور" style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && hifzEntries.length === 0 && <Text style={styles.empty}>لا توجد سور مسجلة بعد</Text>}

            {!isLoading && hifzEntries.map((entry, i) => (
              <View key={entry._id} style={[styles.row, i < hifzEntries.length - 1 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.name} numberOfLines={1}>{entry.surah}</Text>
                  <Badge
                    label={entry.status}
                    variant={entry.status === 'مكتمل' ? 'green' : entry.status === 'جارٍ' ? 'gold' : 'gray'}
                  />
                </View>
                <View style={styles.infoGrid}>
                  <Text style={styles.infoItem}>
                    تاريخ الإكمال: {entry.completionDate ? new Date(entry.completionDate).toLocaleDateString('ar-SA') : '—'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
