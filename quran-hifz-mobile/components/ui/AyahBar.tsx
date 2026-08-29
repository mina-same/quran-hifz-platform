import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export default function AyahBar() {
  const theme = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    bar: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderRadius: theme.radius,
      marginBottom: 16,
    },
    ayah: {
      color: theme.white,
      fontFamily: theme.fontAmiriBold,
      fontSize: 18,
      textAlign: 'center',
      lineHeight: 30,
    },
  }), [theme]);

  return (
    <LinearGradient
      // Deepened in dark mode so the banner doesn't glow against the near-black page.
      colors={theme.mode === 'dark' ? [theme.greenDark, theme.green] : [theme.green, theme.greenLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.bar}
    >
      <Text style={styles.ayah}>
        ﴿ وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ ﴾
      </Text>
    </LinearGradient>
  );
}
