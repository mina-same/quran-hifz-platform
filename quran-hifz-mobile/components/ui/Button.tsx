import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator, Platform } from 'react-native';
import { theme } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'default' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string; elevated?: boolean }> = {
  primary:   { bg: theme.green,    text: theme.white, elevated: true },
  secondary: { bg: theme.goldPale, text: theme.brown, border: 'rgba(201,149,42,0.3)' },
  danger:    { bg: '#EF4444',      text: theme.white, elevated: true },
  ghost:     { bg: 'transparent',  text: theme.green, border: theme.border },
  outline:   { bg: theme.white,    text: theme.green, border: theme.border },
};

// shadcn-style sizing: fixed control heights so labels always sit centred.
const SIZES: Record<Size, { height: number; paddingHorizontal: number; fontSize: number; radius: number; gap: number }> = {
  sm:      { height: 36, paddingHorizontal: 14, fontSize: 13, radius: 10, gap: 6 },
  default: { height: 44, paddingHorizontal: 18, fontSize: 14, radius: 10, gap: 8 },
  lg:      { height: 56, paddingHorizontal: 20, fontSize: 16, radius: 14, gap: 8 },
};

export default function Button({
  label, onPress, variant = 'primary', size = 'default', disabled, loading, icon, style, fullWidth,
}: Props) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: v.bg,
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.radius,
          gap: s.gap,
        },
        v.border && { borderWidth: 1, borderColor: v.border },
        v.elevated && Platform.OS === 'ios' && theme.shadow.sm,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: v.text, fontSize: s.fontSize, lineHeight: s.fontSize + 6 }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    // Keeps every child (and any press feedback) inside the rounded corners.
    overflow: 'hidden',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: theme.fontCairoBold,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
