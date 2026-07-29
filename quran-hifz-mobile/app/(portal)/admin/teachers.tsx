import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { TEACHERS } from '@/lib/data/teachers';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const ratingVariant = (r: string) =>
  r === 'ممتاز' ? 'green' : r === 'جيد جداً' ? 'gold' : r === 'جيد' ? 'blue' : 'gray';

export default function AdminTeachers() {
  const theme = useAppTheme();
  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text, flex: 1 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    rowFoot: { flexDirection: 'row', alignItems: 'center' },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Card noPadding>
          <CardHeader title={`المعلمون (${TEACHERS.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {TEACHERS.map((t, i) => (
              <View key={t.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.name} numberOfLines={1}>{t.name}</Text>
                  <Badge label={t.status === 'active' ? 'نشط' : 'غير نشط'} variant={t.status === 'active' ? 'green' : 'gray'} />
                </View>
                <View style={styles.infoGrid}>
                  <Text style={styles.infoItem}>التخصص: {t.specialty}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>الحلقات: {t.halqatCount}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>الطلاب: {t.studentCount}</Text>
                </View>
                <View style={styles.rowFoot}>
                  <Badge label={t.rating} variant={ratingVariant(t.rating) as any} />
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
