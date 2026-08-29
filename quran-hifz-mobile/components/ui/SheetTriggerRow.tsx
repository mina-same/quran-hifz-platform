import { useMemo } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Text from '@/components/ui/Text';
import { IconChevronLeft } from '@tabler/icons-react-native';
import Pressable from '@/components/ui/Pressable';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

interface Props {
  label: string;
  /** Short right-aligned summary (e.g. "٢٤ يوم") so the row carries information
   * even while the sheet is closed. */
  value?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * "Tap to open a sheet" row — the mobile stand-in for a section that used to be
 * expanded inline (a wide table, a long list). Reads as a settings row: leading
 * icon, label, trailing summary + chevron, 56pt tall so it is comfortably
 * tappable.
 */
export default function SheetTriggerRow({ label, value, icon, onPress, disabled, style }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      haptic="select"
      disabled={disabled}
      onPress={onPress}
      // Plain array, never `style={({ pressed }) => …}`: NativeWind's JSX interop
      // (jsxImportSource: 'nativewind') drops function styles on native, which
      // left this row with no flexDirection — icon, label, value and chevron each
      // stacked on their own line. Press feedback is the press-in haptic.
      style={[styles.row, disabled && styles.rowDisabled, style]}
    >
      {!!icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {!!value && <Text style={styles.value} numberOfLines={1}>{value}</Text>}
      <IconChevronLeft size={18} color={theme.textMuted} />
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space.sm,
      minHeight: 56,
      paddingHorizontal: theme.space.md,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
    },
    rowDisabled: { opacity: 0.5 },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.green}1A`,
    },
    label: {
      flex: 1,
      fontSize: theme.fontSize.base,
      fontFamily: theme.fontCairoBold,
      color: theme.text,
    },
    value: {
      fontSize: theme.fontSize.sm,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
    },
  });
}
