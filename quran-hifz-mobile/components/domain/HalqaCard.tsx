import { View, Text, StyleSheet } from 'react-native';
import type { Halqa } from '@/lib/types/halqa';
import ProgressBar from '@/components/ui/ProgressBar';
import Badge from '@/components/ui/Badge';
import { theme } from '@/lib/theme';

interface Props {
  halqa: Halqa;
  actions?: React.ReactNode;
}

export default function HalqaCard({ halqa, actions }: Props) {
  const capacityPct = Math.round((halqa.studentCount / halqa.capacity) * 100);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerName}>{halqa.name}</Text>
        <Badge label={`${halqa.studentCount} طالب`} variant="gold" />
      </View>

      {/* Details */}
      <View style={styles.body}>
        {[
          { label: 'المعلم',       value: halqa.teacher },
          { label: 'المسجد',       value: halqa.mosque },
          { label: 'الأوقات',      value: halqa.time },
          { label: 'الأيام',       value: halqa.days },
          { label: 'نسبة الحضور',  value: `${halqa.attendancePct}٪` },
        ].map(({ label, value }) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}

        <Text style={styles.capacityLabel}>
          الطاقة الاستيعابية ({halqa.studentCount}/{halqa.capacity})
        </Text>
        <ProgressBar value={capacityPct} showPercent={false} />

        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: theme.green,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerName: {
    fontSize: 13,
    fontFamily: theme.fontCairoBold,
    color: theme.white,
  },
  body: {
    padding: 14,
    gap: 7,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: theme.fontCairo,
    color: theme.textMuted,
  },
  rowValue: {
    fontSize: 12,
    fontFamily: theme.fontCairoBold,
    color: theme.text,
  },
  capacityLabel: {
    fontSize: 11,
    fontFamily: theme.fontCairo,
    color: theme.textMuted,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
});
