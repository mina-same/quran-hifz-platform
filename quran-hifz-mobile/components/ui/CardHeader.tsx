import { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}

export default function CardHeader({ title, subtitle, right, style }: Props) {
  const theme = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    left: {
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontFamily: theme.fontCairoBold,
      color: theme.text,
    },
    subtitle: {
      fontSize: 12,
      color: theme.textMuted,
      fontFamily: theme.fontCairo,
      marginTop: 2,
    },
  }), [theme]);

  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}
