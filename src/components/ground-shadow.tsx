import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

/** Soft contact shadow so a character reads as standing on the surface beneath it. */
export function GroundShadow({ width, opacity = 0.5 }: { width: number; opacity?: number }) {
  const h = width * 0.28;
  return (
    <Svg width={width} height={h} viewBox="0 0 100 28">
      <Defs>
        <RadialGradient id="gs" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#000" stopOpacity={opacity} />
          <Stop offset="60%" stopColor="#000" stopOpacity={opacity * 0.5} />
          <Stop offset="100%" stopColor="#000" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="14" rx="50" ry="14" fill="url(#gs)" />
    </Svg>
  );
}
