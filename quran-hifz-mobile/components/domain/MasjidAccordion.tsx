import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation } from 'react-native';
import {
  IconBuildingArch, IconChevronDown, IconChevronUp, IconUsers,
} from '@tabler/icons-react-native';
import type { Masjid } from '@/lib/types/halqa';
import Badge from '@/components/ui/Badge';
import { theme } from '@/lib/theme';

interface Props {
  masjid: Masjid;
}

export default function MasjidAccordion({ masjid }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={toggle} style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}>
        <View style={styles.triggerLeft}>
          <IconBuildingArch size={16} color={theme.gold} />
          <Text style={styles.name}>{masjid.name}</Text>
          <Text style={styles.location}>— {masjid.location}</Text>
        </View>
        <View style={styles.triggerRight}>
          <Badge label={`${masjid.halqat.length} حلقات`} variant="green" />
          {open
            ? <IconChevronUp size={16} color={theme.textMuted} />
            : <IconChevronDown size={16} color={theme.textMuted} />}
        </View>
      </Pressable>

      {open && (
        <View style={styles.content}>
          {masjid.halqat.map((halqa) => (
            <View key={halqa.id} style={styles.halqaRow}>
              <Text style={styles.halqaName}>{halqa.name}</Text>
              <Text style={styles.halqaMeta}>{halqa.teacher} • {halqa.time}</Text>
              <View style={styles.halqaBottom}>
                <View style={styles.countRow}>
                  <IconUsers size={12} color={theme.textMuted} />
                  <Text style={styles.countText}>{halqa.studentCount}/{halqa.capacity}</Text>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triggerPressed: { backgroundColor: '#F0FDF4' },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontFamily: theme.fontCairoBold,
    color: theme.green,
  },
  location: {
    fontSize: 11,
    fontFamily: theme.fontCairo,
    color: theme.textMuted,
  },
  triggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    padding: 12,
    gap: 8,
  },
  halqaRow: {
    backgroundColor: '#F9FAF5',
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
