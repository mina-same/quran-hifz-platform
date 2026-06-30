import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

interface Props {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export default function FormGroup({ label, required, error, children }: Props) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: theme.fontCairoBold,
    color: theme.text,
    textAlign: 'right',
  },
  required: { color: theme.red },
  error: {
    fontSize: 12,
    color: theme.red,
    fontFamily: theme.fontCairo,
    textAlign: 'right',
  },
});
