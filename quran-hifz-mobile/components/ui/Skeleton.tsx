import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export default function Skeleton({ width = '100%', height = 14, radius = theme.radiusSm, style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.base, { width, height, borderRadius: radius, opacity }, style]}
    />
  );
}

/** A stacked group of skeleton rows — for card-list screens waiting on their first fetch. */
export function SkeletonRows({ count = 4, rowHeight = 56, gap = 10 }: { count?: number; rowHeight?: number; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={rowHeight} radius={theme.radius} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.border,
  },
});
