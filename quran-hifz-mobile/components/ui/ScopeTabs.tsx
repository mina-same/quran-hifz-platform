import { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { select } from '@/lib/haptics';

export interface ScopeOption {
  value: string;
  label: string;
}

interface Props {
  options: ScopeOption[];
  value: string;
  onChange: (value: string) => void;
}

/** Segmented control used to scope report/dashboard widgets (all / per-halqa / per-track, etc). */
export default function ScopeTabs({ options, value, onChange }: Props) {
  const theme = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      // The track has to sit DARKER than the raised active pill in both modes:
      // in dark mode `border` is the near-black recess and `cardAlt` the pill.
      backgroundColor: theme.mode === 'dark' ? theme.bg : theme.border,
      borderRadius: theme.radiusFull,
      padding: 3,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: theme.radiusFull,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: theme.mode === 'dark' ? theme.cardAlt : theme.card,
    },
    label: {
      fontSize: 12,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
    },
    labelActive: {
      fontFamily: theme.fontCairoBold,
      color: theme.greenAccent,
    },
  }), [theme]);

  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              // Silent when re-tapping the active tab — nothing changed.
              if (!active) select();
              onChange(opt.value);
            }}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
