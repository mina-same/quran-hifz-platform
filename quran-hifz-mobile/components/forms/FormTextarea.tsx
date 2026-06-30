import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '@/lib/theme';

interface Props extends TextInputProps {
  rows?: number;
  error?: boolean;
}

export default function FormTextarea({ rows = 4, error, style, ...rest }: Props) {
  return (
    <TextInput
      multiline
      numberOfLines={rows}
      textAlignVertical="top"
      style={[styles.textarea, { minHeight: rows * 22 }, error && styles.error, style]}
      textAlign="right"
      placeholderTextColor={theme.textMuted}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  textarea: {
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
  error: {
    borderColor: theme.red,
  },
});
