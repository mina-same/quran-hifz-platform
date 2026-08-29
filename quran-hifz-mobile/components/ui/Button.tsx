import { useMemo, useState } from 'react';
import { Pressable, View, StyleSheet, ViewStyle, ActivityIndicator, Platform } from 'react-native';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { tap, medium } from '@/lib/haptics';

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
  /**
   * Press feedback. Defaults to a light tap ('medium' for `danger`, which is
   * usually destructive). Pass 'none' when the screen fires its own haptic for
   * this press and the two would double up.
   */
  haptic?: 'tap' | 'medium' | 'none';
}

/**
 * Built per-theme rather than at module scope. The old frozen map baked the light
 * palette in: `outline` sat on a hard `theme.white`, and `secondary`'s dark-brown
 * label on a pale gold fill — both unreadable once the page went dark.
 */
function buildVariants(theme: ReturnType<typeof useAppTheme>): Record<Variant, { bg: string; text: string; border?: string; elevated?: boolean }> {
  const dark = theme.mode === 'dark';
  return {
    primary:   { bg: theme.greenAccent, text: theme.white, elevated: true },
    secondary: { bg: theme.tone.gold.bg, text: theme.tone.gold.text, border: dark ? theme.tone.gold.border : 'rgba(201,149,42,0.3)' },
    danger:    { bg: theme.red,          text: theme.white, elevated: true },
    ghost:     { bg: 'transparent',      text: theme.greenAccent, border: theme.border },
    outline:   { bg: theme.card,         text: theme.greenAccent, border: theme.border },
  };
}

// shadcn-style sizing: fixed control heights so labels always sit centred.
const SIZES: Record<Size, { height: number; paddingHorizontal: number; fontSize: number; radius: number; gap: number }> = {
  sm:      { height: 36, paddingHorizontal: 14, fontSize: 13, radius: 10, gap: 6 },
  default: { height: 44, paddingHorizontal: 18, fontSize: 14, radius: 10, gap: 8 },
  lg:      { height: 56, paddingHorizontal: 20, fontSize: 16, radius: 14, gap: 8 },
};

export default function Button({
  label, onPress, variant = 'primary', size = 'default', disabled, loading, icon, style, fullWidth, haptic,
}: Props) {
  const theme = useAppTheme();
  const v = useMemo(() => buildVariants(theme)[variant], [theme, variant]);
  const s = SIZES[size];
  const [pressed, setPressed] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      // Keeps every child (and any press feedback) inside the rounded corners.
      overflow: 'hidden',
    },
    selfStart: {
      alignSelf: 'flex-start',
    },
    fullWidth: {
      alignSelf: 'stretch',
      width: '100%',
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
  }), [theme]);
  const kind = haptic ?? (variant === 'danger' ? 'medium' : 'tap');

  // The coloured box is a plain View with a plain style array: NativeWind's JSX
  // interop (jsxImportSource: 'nativewind') drops `style={({ pressed }) => …}`
  // functions on native, which left the button with no background at all.
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => {
        // Fires at finger-down so the feedback lands with the touch. A disabled
        // or loading button is inert, so it stays silent.
        if (!disabled && !loading && kind !== 'none') (kind === 'medium' ? medium : tap)();
        setPressed(true);
      }}
      onPressOut={() => setPressed(false)}
      style={fullWidth ? styles.fullWidth : styles.selfStart}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: v.bg,
            height: s.height,
            paddingHorizontal: s.paddingHorizontal,
            borderRadius: s.radius,
            gap: s.gap,
          },
          v.border ? { borderWidth: 1, borderColor: v.border } : null,
          v.elevated && Platform.OS === 'ios' ? theme.shadow.sm : null,
          fullWidth ? styles.fullWidth : styles.selfStart,
          pressed ? styles.pressed : null,
          disabled ? styles.disabled : null,
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
      </View>
    </Pressable>
  );
}
