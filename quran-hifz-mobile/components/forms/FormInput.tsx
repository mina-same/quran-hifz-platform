import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '@/lib/theme';

interface Props extends TextInputProps {
  error?: boolean;
}

export default function FormInput({ error, style, ...rest }: Props) {
  return (
    <TextInput
      style={[styles.input, error && styles.inputError, style]}
      textAlign="right"
      placeholderTextColor={theme.textMuted}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: theme.fontCairo,
    color: theme.text,
    backgroundColor: theme.white,
    textAlign: 'right',
  },
  inputError: {
    borderColor: theme.red,
  },
});
