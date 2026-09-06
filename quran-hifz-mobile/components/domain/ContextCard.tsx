import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import type { Track } from '@/lib/queries/tracks';

type AppTheme = ReturnType<typeof useAppTheme>;

/**
 * Normalized shape for anything a teacher/student/admin can act on — always a
 * Track now that Halqa is gone. Mirrors web's `TeachingContext` type (see
 * quran-hifz/src/quran/components/common/ContextPicker.tsx).
 */
export type TeachingContext = {
  id: string;
  title: string;
  subtitle?: string;
  scheduleLabel?: string;
  studentCount?: number;
  capacity?: number;
  status?: 'active' | 'upcoming' | 'ended';
};

function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return typeof v === 'string' ? v : '';
}

export function trackToContext(t: Track): TeachingContext {
  return {
    id: t._id,
    title: t.title,
    subtitle: t.isOnline ? 'أونلاين' : getName(t.masjid),
    scheduleLabel: [t.daysPerWeek, t.timeSlot].filter(Boolean).join(' | '),
    studentCount: t.studentCount,
    capacity: t.maxStudents,
    status: t.status,
  };
}

const STATUS_LABEL: Record<NonNullable<TeachingContext['status']>, string> = {
  active: 'نشط',
  upcoming: 'قادم',
  ended: 'منتهي',
};
const STATUS_VARIANT: Record<NonNullable<TeachingContext['status']>, 'green' | 'gold' | 'gray'> = {
  active: 'green',
  upcoming: 'gold',
  ended: 'gray',
};

interface Props {
  context: TeachingContext;
  actions?: React.ReactNode;
  onPress?: () => void;
}

export default function ContextCard({ context, actions }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasCapacity = typeof context.studentCount === 'number' && typeof context.capacity === 'number' && context.capacity > 0;
  const capacityPct = hasCapacity ? Math.round((context.studentCount! / context.capacity!) * 100) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerName} numberOfLines={1}>{context.title}</Text>
        {context.status ? (
          <Badge label={STATUS_LABEL[context.status]} variant={STATUS_VARIANT[context.status]} />
        ) : (
          <Badge label="مسار" variant="gold" />
        )}
      </View>

      <View style={styles.body}>
        {!!context.subtitle && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>المكان</Text>
            <Text style={styles.rowValue}>{context.subtitle}</Text>
          </View>
        )}
        {!!context.scheduleLabel && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>المواعيد</Text>
            <Text style={styles.rowValue}>{context.scheduleLabel}</Text>
          </View>
        )}
        {typeof context.studentCount === 'number' && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>الطلاب</Text>
            <Text style={styles.rowValue}>
              {context.studentCount}{typeof context.capacity === 'number' ? ` / ${context.capacity}` : ''}
            </Text>
          </View>
        )}

        {hasCapacity && (
          <>
            <Text style={styles.capacityLabel}>الطاقة الاستيعابية</Text>
            <ProgressBar value={capacityPct} showPercent={false} />
          </>
        )}

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
      gap: 8,
    },
    headerName: {
      fontSize: 13,
      fontFamily: theme.fontCairoBold,
      color: theme.white,
      flex: 1,
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
