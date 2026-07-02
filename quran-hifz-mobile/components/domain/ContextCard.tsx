import { View, Text, StyleSheet } from 'react-native';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { theme } from '@/lib/theme';

/**
 * Normalized shape for anything a teacher/student/admin can act on:
 * a Halqa or a SpecialTrack. Mirrors web's `TeachingContext` type
 * (see quran-hifz/src/quran/components/common/ContextPicker.tsx).
 */
export type TeachingContext = {
  kind: 'halqa' | 'specialTrack';
  id: string;
  title: string;
  subtitle?: string;
  scheduleLabel?: string;
  studentCount?: number;
  capacity?: number;
  status?: 'active' | 'upcoming' | 'ended';
};

export function halqaToContext(h: {
  _id: string;
  name: string;
  masjid?: { _id: string; name: string } | string;
  days?: string;
  time?: string;
  studentCount?: number;
  capacity?: number;
}): TeachingContext {
  const masjidName = typeof h.masjid === 'object' && h.masjid ? h.masjid.name : (h.masjid as string | undefined);
  return {
    kind: 'halqa',
    id: h._id,
    title: h.name,
    subtitle: masjidName,
    scheduleLabel: [h.days, h.time].filter(Boolean).join(' | '),
    studentCount: h.studentCount,
    capacity: h.capacity,
  };
}

export function trackToContext(t: {
  _id: string;
  title: string;
  location?: string;
  isOnline?: boolean;
  timeSlot?: string;
  daysPerWeek?: string;
  enrolledStudents?: unknown[];
  maxStudents?: number;
  status?: 'active' | 'upcoming' | 'ended';
}): TeachingContext {
  return {
    kind: 'specialTrack',
    id: t._id,
    title: t.title,
    subtitle: t.isOnline ? 'أونلاين' : t.location,
    scheduleLabel: [t.daysPerWeek, t.timeSlot].filter(Boolean).join(' | '),
    studentCount: t.enrolledStudents?.length,
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
  const hasCapacity = typeof context.studentCount === 'number' && typeof context.capacity === 'number' && context.capacity > 0;
  const capacityPct = hasCapacity ? Math.round((context.studentCount! / context.capacity!) * 100) : 0;

  return (
    <View style={styles.card}>
      <View style={[styles.header, context.kind === 'specialTrack' && styles.headerTrack]}>
        <Text style={styles.headerName} numberOfLines={1}>{context.title}</Text>
        {context.status ? (
          <Badge label={STATUS_LABEL[context.status]} variant={STATUS_VARIANT[context.status]} />
        ) : (
          <Badge label={context.kind === 'halqa' ? 'حلقة' : 'مسار'} variant="gold" />
        )}
      </View>

      <View style={styles.body}>
        {!!context.subtitle && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{context.kind === 'halqa' ? 'المسجد' : 'المكان'}</Text>
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
    gap: 8,
  },
  headerTrack: {
    backgroundColor: theme.brown,
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
