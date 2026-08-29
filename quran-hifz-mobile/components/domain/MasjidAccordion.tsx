import { useMemo, useState } from 'react';
import { View, StyleSheet, LayoutAnimation } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import {
  IconBuildingArch, IconChevronDown, IconChevronUp, IconUsers,
} from '@tabler/icons-react-native';
import type { Masjid } from '@/lib/queries/masajid';
import type { Halqa } from '@/lib/queries/halqat';
import Badge from '@/components/ui/Badge';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

function nameOf(v: { name: string } | string | undefined): string {
  if (v && typeof v === 'object') return v.name;
  if (typeof v === 'string') return v;
  return '—';
}

interface Props {
  masjid: Masjid;
  /** Admin edit/delete buttons — rendered in the header, beside the count badge. */
  actions?: React.ReactNode;
  /** This masjid's own halqat — the real /masajid endpoint doesn't nest them,
   * so the caller resolves them from a separate useHalqat() list. */
  halqat: Halqa[];
}

export default function MasjidAccordion({ masjid, halqat, actions }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.card}>
      {/* Plain style — NativeWind's interop drops the ({ pressed }) => … form. */}
      <Pressable onPress={toggle} style={styles.trigger}>
        <IconBuildingArch size={16} color={theme.gold} style={styles.triggerIcon} />
        {/* Name and location stack and wrap: a masjid name like "جامع الأمير متعب
            بن عبد العزيز" needs two lines, and on one row it used to run under
            the badge and the action buttons. */}
        <View style={styles.titles}>
          <Text style={styles.name} numberOfLines={2}>{masjid.name}</Text>
          <Text style={styles.location} numberOfLines={1}>{masjid.location}</Text>
        </View>
        {open
          ? <IconChevronUp size={16} color={theme.textMuted} />
          : <IconChevronDown size={16} color={theme.textMuted} />}
      </Pressable>

      {/* Count + admin actions on their own row, so nothing competes with the
          title for width and the buttons keep a full-size touch target. */}
      <View style={styles.metaRow}>
        <Badge label={`${halqat.length} حلقات`} variant="green" />
        {!!actions && <View style={styles.actions}>{actions}</View>}
      </View>

      {open && (
        <View style={styles.content}>
          {halqat.length === 0 && <Text style={styles.halqaMeta}>لا توجد حلقات في هذا المسجد</Text>}
          {halqat.map((halqa) => (
            <View key={halqa._id} style={styles.halqaRow}>
              <Text style={styles.halqaName}>{halqa.name}</Text>
              <Text style={styles.halqaMeta}>{nameOf(halqa.teacher)} • {halqa.time}</Text>
              <View style={styles.halqaBottom}>
                <View style={styles.countRow}>
                  <IconUsers size={12} color={theme.textMuted} />
                  <Text style={styles.countText}>{halqa.studentCount ?? 0}/{halqa.capacity}</Text>
                </View>
                <Badge label={`${halqa.attendancePct}٪ حضور`} variant="green" />
              </View>
            </View>
          ))}
        </View>
      )}
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
      marginBottom: 8,
      overflow: 'hidden',
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 13,
      paddingBottom: 10,
    },
    triggerIcon: {
      marginTop: 2,
    },
    // flexShrink as well as flex: without it a long unbroken title pushes past
    // the row instead of wrapping inside it.
    titles: {
      flex: 1,
      flexShrink: 1,
      gap: 2,
    },
    name: {
      fontSize: 14,
      fontFamily: theme.fontCairoBold,
      color: theme.green,
      lineHeight: 21,
    },
    location: {
      fontSize: 11,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingHorizontal: 14,
      paddingBottom: 12,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    content: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      padding: 12,
      gap: 8,
    },
    halqaRow: {
      backgroundColor: theme.cardAlt,
      borderRadius: theme.radiusSm,
      padding: 10,
      gap: 4,
    },
    halqaName: {
      fontSize: 13,
      fontFamily: theme.fontCairoBold,
      color: theme.green,
    },
    halqaMeta: {
      fontSize: 11,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
    },
    halqaBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    countRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    countText: {
      fontSize: 11,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
    },
  });
}
