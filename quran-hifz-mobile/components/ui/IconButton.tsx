import { useMemo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Pressable from '@/components/ui/Pressable';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

interface Props {
  children: React.ReactNode;
  onPress: () => void;
  /** 'danger' outlines in red — used for every delete affordance. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Small bordered icon button for row actions (edit / delete) in the admin lists. */
export default function IconButton({ children, onPress, tone = 'default', disabled, accessibilityLabel, style }: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);

  return (
    <Pressable
      haptic={tone === 'danger' ? 'medium' : 'tap'}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      // 40x32 keeps the target tappable without bloating a dense list row.
      hitSlop={6}
      style={[s.btn, tone === 'danger' && s.danger, disabled && s.disabled, style]}
    >
      {children}
    </Pressable>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    btn: {
      minWidth: 40, height: 32,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.border, borderRadius: 8,
      paddingHorizontal: 8,
    },
    danger: { borderColor: theme.tone.red.border },
    disabled: { opacity: 0.5 },
  });
}
