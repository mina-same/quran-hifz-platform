import { useMemo } from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

interface Props extends TextInputProps {
  error?: boolean;
}

export default function FormInput({ error, style, ...rest }: Props) {
  const theme = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.radiusSm,
      paddingHorizontal: 12,
      paddingVertical: 12,
      minHeight: 44,
      fontSize: 14,
      fontFamily: theme.fontCairo,
      color: theme.text,
      backgroundColor: theme.inputBg,
      textAlign: 'right',
    },
    inputError: {
      borderColor: theme.red,
    },
  }), [theme]);

  return (
    <TextInput
      style={[styles.input, error && styles.inputError, style]}
      textAlign="right"
      placeholderTextColor={theme.textMuted}
      // Without this the OS draws a black caret and black selection on the dark field.
      selectionColor={theme.greenLight}
      keyboardAppearance={theme.mode === 'dark' ? 'dark' : 'light'}
      {...rest}
    />
  );
}
