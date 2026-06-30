import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/lib/theme';

export default function AyahBar() {
  return (
    <LinearGradient
      colors={['#1B5E20', '#2E7D32']}
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

const styles = StyleSheet.create({
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
});
