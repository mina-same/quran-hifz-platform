import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

interface Props {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export default function FormGroup({ label, required, error, children }: Props) {
  const theme = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    group: { gap: 6 },
    label: {
      fontSize: 13,
      fontFamily: theme.fontCairoBold,
      color: theme.text,
    },
    required: { color: theme.red },
    error: {
      fontSize: 12,
      color: theme.red,
      fontFamily: theme.fontCairo,
    },
  }), [theme]);

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
