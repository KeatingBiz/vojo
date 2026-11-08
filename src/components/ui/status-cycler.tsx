import { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

/** Rotates through status lines on its own timer so the parent never re-renders. */
export function StatusCycler({ lines, every = 2800, style }: { lines: string[]; every?: number; style?: StyleProp<TextStyle> }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((k) => Math.min(lines.length - 1, k + 1)), every);
    return () => clearInterval(id);
  }, [lines.length, every]);
  return (
    <Animated.View key={i} entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
      <Text style={style}>{lines[i]}</Text>
    </Animated.View>
  );
}
