import { View, StyleSheet, ViewProps } from 'react-native';
import { theme } from '@/lib/theme';

interface Props extends ViewProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export default function Card({ children, noPadding, style, ...rest }: Props) {
  return (
    <View style={[styles.card, noPadding && styles.noPadding, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  noPadding: {
    padding: 0,
  },
});
