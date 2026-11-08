import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

/** Soft radial glow. Opacity/scale are animated by the parent. */
export function Glow({ size, color = colors.accent, strength = 1 }: { size: number; color?: string; strength?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`g-${color}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.55 * strength} />
          <Stop offset="45%" stopColor={color} stopOpacity={0.22 * strength} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#g-${color})`} />
    </Svg>
  );
}
