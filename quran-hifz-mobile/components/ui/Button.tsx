import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { theme } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: theme.green,    text: theme.white },
  secondary: { bg: theme.goldPale, text: theme.brown, border: 'rgba(201,149,42,0.3)' },
  danger:    { bg: '#EF4444',      text: theme.white },
  ghost:     { bg: 'transparent',  text: theme.green, border: theme.border },
};

export default function Button({
  label, onPress, variant = 'primary', disabled, loading, icon, style, fullWidth,
}: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: v.bg },
        v.border && { borderWidth: 1, borderColor: v.border },
        fullWidth && styles.fullWidth,
        (pressed || disabled) && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: v.text }]}>{label}</Text>
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
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: theme.radiusSm,
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fontCairoBold,
  },
});
