import { useMemo } from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

interface Props extends TextInputProps {
  rows?: number;
  error?: boolean;
}

export default function FormTextarea({ rows = 4, error, style, ...rest }: Props) {
  const theme = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    textarea: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.radiusSm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: theme.fontCairo,
      color: theme.text,
      backgroundColor: theme.inputBg,
      textAlign: 'right',
    },
    error: {
      borderColor: theme.red,
    },
  }), [theme]);

  return (
    <TextInput
      multiline
      numberOfLines={rows}
      textAlignVertical="top"
      style={[styles.textarea, { minHeight: rows * 22 }, error && styles.error, style]}
      textAlign="right"
      placeholderTextColor={theme.textMuted}
      selectionColor={theme.greenLight}
      keyboardAppearance={theme.mode === 'dark' ? 'dark' : 'light'}
      {...rest}
    />
  );
}
