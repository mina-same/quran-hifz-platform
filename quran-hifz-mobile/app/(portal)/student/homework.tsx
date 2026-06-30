import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import AudioRecorder from '@/components/domain/AudioRecorder';
import { theme } from '@/lib/theme';

export default function StudentHomework() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AyahBar />

        {/* Today's assignment */}
        <Card>
          <CardHeader title="واجب اليوم" />
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>المقطع المطلوب</Text>
              <Text style={styles.segment}>النساء ١٥ — ٣٠</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>نوع الواجب</Text>
              <Badge label="حفظ جديد" variant="gold" />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>عدد الصفحات</Text>
              <Text style={styles.gridValue}>٢ صفحتان</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>الموعد النهائي</Text>
              <Text style={styles.gridValue}>الخميس ٥:٠٠ م</Text>
            </View>
          </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '46%', gap: 4 },
  gridLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  segment: { fontSize: 18, fontFamily: theme.fontCairoBold, color: theme.green },
  gridValue: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
});
