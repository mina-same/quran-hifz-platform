import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import type { Halqa } from '@/lib/queries/halqat';
import ProgressBar from '@/components/ui/ProgressBar';
import Badge from '@/components/ui/Badge';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

interface Props {
  halqa: Halqa;
  actions?: React.ReactNode;
}

function nameOf(v: { name: string } | string | undefined): string {
  if (v && typeof v === 'object') return v.name;
  if (typeof v === 'string') return v;
  return '—';
}

/** Every halqa now belongs to a مسار; it is populated on read, an id on write. */
function trackTitle(v: { title: string } | string | null | undefined): string | null {
  if (v && typeof v === 'object' && 'title' in v) return v.title;
  return null;
}

export default function HalqaCard({ halqa, actions }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const studentCount = halqa.studentCount ?? 0;
  const track = trackTitle(halqa.specialTrack);
  const capacityPct = halqa.capacity > 0 ? Math.round((studentCount / halqa.capacity) * 100) : 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerName}>{halqa.name}</Text>
        <Badge label={`${studentCount} طالب`} variant="gold" />
      </View>

      {/* Details */}
      <View style={styles.body}>
        {[
          ...(track ? [{ label: 'المسار', value: track }] : []),
          { label: 'المعلم',       value: nameOf(halqa.teacher) },
          { label: 'المسجد',       value: nameOf(halqa.masjid) },
          { label: 'الأوقات',      value: halqa.time },
          { label: 'الأيام',       value: halqa.days },
          { label: 'نسبة الحضور',  value: `${halqa.attendancePct}٪` },
          { label: 'نسبة الإنجاز', value: `${halqa.completionPct}٪` },
        ].map(({ label, value }) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}

        <Text style={styles.capacityLabel}>
          الطاقة الاستيعابية ({studentCount}/{halqa.capacity})
        </Text>
        <ProgressBar value={capacityPct} showPercent={false} />

        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: theme.radius,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    header: {
      backgroundColor: theme.greenAccent,
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
}
