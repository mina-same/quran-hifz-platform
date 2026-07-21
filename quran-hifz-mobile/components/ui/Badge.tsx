import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

export type BadgeVariant = 'green' | 'gold' | 'red' | 'blue' | 'gray';
type Variant = BadgeVariant;

const VARIANT_STYLES: Record<Variant, { bg: string; text: string }> = {
  green: { bg: '#DCFCE7', text: '#166534' },
  gold:  { bg: theme.goldPale, text: theme.brown },
  red:   { bg: '#FEE2E2', text: '#991B1B' },
  blue:  { bg: '#DBEAFE', text: '#1E40AF' },
  gray:  { bg: '#F3F4F6', text: '#374151' },
};

interface Props {
  label: string;
  variant?: Variant;
}

export default function Badge({ label, variant = 'gray' }: Props) {
  const v = VARIANT_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.radiusFull,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontFamily: theme.fontCairoBold,
  },
});
