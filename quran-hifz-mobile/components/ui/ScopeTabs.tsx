import { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { IconRoute, IconSchool, IconUsers } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

export interface ScopeOption {
  value: string;
  label: string;
  /** Drives the chip's icon: the "all" tab, a halqa, or a programme. */
  kind?: 'all' | 'halqa' | 'track';
}

interface Props {
  options: ScopeOption[];
  value: string;
  onChange: (value: string) => void;
}

/** Past this many options a segmented control gives each label ~35pt and every
 * name collapses to "أبو بك…" — so the chips scroll sideways instead. */
const SEGMENTED_MAX = 3;

/** Scopes report/dashboard widgets (all / per-halqa / per-track). */
export default function ScopeTabs({ options, value, onChange }: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const segmented = options.length <= SEGMENTED_MAX;

  function iconFor(opt: ScopeOption, active: boolean) {
    const color = active ? theme.white : theme.textMuted;
    if (opt.kind === 'halqa') return <IconSchool size={14} color={color} />;
    if (opt.kind === 'track') return <IconRoute size={14} color={color} />;
    if (opt.kind === 'all') return <IconUsers size={14} color={color} />;
    return null;
  }

  if (segmented) {
    return (
      <View style={s.segmentWrap}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              haptic={active ? 'none' : 'select'}
              onPress={() => onChange(opt.value)}
              style={[s.segment, active && s.segmentActive]}
            >
              <Text style={[s.segmentLabel, active && s.segmentLabelActive]} numberOfLines={1}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chipRow}
      // Chips are content-sized, so the row is as wide as it needs to be and
      // the labels stay readable instead of being squeezed to three letters.
      keyboardShouldPersistTaps="handled"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const icon = iconFor(opt, active);
        return (
          <Pressable
            key={opt.value}
            haptic={active ? 'none' : 'select'}
            onPress={() => onChange(opt.value)}
            style={[s.chip, active && s.chipActive]}
          >
            {icon}
            <Text style={[s.chipLabel, active && s.chipLabelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    // ── segmented (≤3 options) ──
    segmentWrap: {
      flexDirection: 'row',
      // The track has to sit DARKER than the raised active pill in both modes:
      // in dark mode `border` is the near-black recess and `cardAlt` the pill.
      backgroundColor: theme.mode === 'dark' ? theme.bg : theme.border,
      borderRadius: theme.radiusFull,
      padding: 3,
    },
    segment: { flex: 1, paddingVertical: 8, borderRadius: theme.radiusFull, alignItems: 'center' },
    segmentActive: { backgroundColor: theme.mode === 'dark' ? theme.cardAlt : theme.card },
    segmentLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    segmentLabelActive: { fontFamily: theme.fontCairoBold, color: theme.greenAccent },

    // ── scrolling chips (>3 options) ──
    chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2, paddingHorizontal: 1 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      // A long programme title ellipsizes rather than making one chip fill the row.
      maxWidth: 200,
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: theme.radiusFull,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    chipActive: { backgroundColor: theme.greenAccent, borderColor: theme.greenAccent },
    chipLabel: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, flexShrink: 1 },
    chipLabelActive: { fontFamily: theme.fontCairoBold, color: theme.white },
  });
}
