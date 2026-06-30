import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HalqaCard from '@/components/domain/HalqaCard';
import Button from '@/components/ui/Button';
import { HALQAT } from '@/lib/data/halqat';
import { theme } from '@/lib/theme';

export default function TeacherHalqa() {
  const myHalqat = HALQAT.filter((h) => h.teacher === 'ناصر الحميداني');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {myHalqat.map((halqa) => (
          <HalqaCard
            key={halqa.id}
            halqa={halqa}
            actions={
              <View style={styles.actions}>
                <Button label="الطلاب"  variant="ghost"   style={styles.actionBtn} />
                <Button label="الحضور" variant="primary" style={styles.actionBtn} />
              </View>
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  actions: { flexDirection: 'row', gap: 8, flex: 1 },
  actionBtn: { flex: 1 },
});
