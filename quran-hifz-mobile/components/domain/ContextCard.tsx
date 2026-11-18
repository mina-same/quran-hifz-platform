import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import type { Track } from '@/lib/queries/tracks';
import type { QuranPlan } from '@/lib/queries/quranPlan';
import { planScheduleDays } from '@/lib/trackSchedule';

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
};

function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return typeof v === 'string' ? v : '';
}

/**
 * `linkedPlan` is optional because most call sites map over a track list to
 * build picker cards and don't fetch a per-track plan there (that would be an
 * N+1 `useQuranPlans` per row) — when omitted, `scheduleLabel` falls back to
 * just the track's own `timeSlot`, never the vestigial `daysPerWeek`/date
 * fields. Pass it when the caller already has the resolved linked plan (see
 * lib/trackSchedule.ts's `resolveLinkedPlan`) for the real days.
 */
export function trackToContext(t: Track, linkedPlan?: QuranPlan): TeachingContext {
  const days = planScheduleDays(linkedPlan).join('، ');
  return {
    id: t._id,
    title: t.title,
    subtitle: t.isOnline ? 'أونلاين' : getName(t.masjid),
    scheduleLabel: [days, t.timeSlot].filter(Boolean).join(' | '),
    studentCount: t.studentCount,
  };
}

interface Props {
  context: TeachingContext;
  actions?: React.ReactNode;
  onPress?: () => void;
}

export default function ContextCard({ context, actions }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerName} numberOfLines={1}>{context.title}</Text>
      </View>

      <View style={styles.body}>
        {!!context.subtitle && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>المسجد</Text>
            <Text style={styles.rowValue}>{context.subtitle}</Text>
          </View>
        )}
        {!!context.scheduleLabel && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>المواعيد</Text>
            <Text style={styles.rowValue}>{context.scheduleLabel}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>الطلاب</Text>
          <Text style={styles.rowValue}>{context.studentCount ?? '—'} طالب</Text>
        </View>

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
    actions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
  });
}
