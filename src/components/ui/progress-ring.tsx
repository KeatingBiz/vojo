import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { mixHex } from '@/lib/color';

import { colors } from '@/constants/theme';

type Props = {
  size: number;
  stroke?: number;
  /** 0..1 remaining, drawn from the top clockwise. */
  progress: SharedValue<number>;
  color?: string;
  /**
   * Color stops along the arc (t = 0 at the top, clockwise to 1). Baked into the geometry, so no per-frame color work.
   * Keep the middle stops dark so a warm→cool blend never lightens into pink.
   */
  gradient?: { t: number; color: string }[];
  /** Where the arc will end (0..1); only needed with `gradient` so the cap dot can take the matching color. */
  endAt?: number;
  track?: string;
  children?: React.ReactNode;
};

/**
 * Ring that drains or fills around whatever sits inside it.
 * Two static half-arcs, each inside a half-width clipper, are ROTATED to reveal the arc. Rotation is a
 * transform, which Reanimated applies on the UI thread without a native commit per frame. Animating
 * strokeDashoffset on an SVG instead forces a commit every frame, which made sibling views flicker on device.
 */
export function ProgressRing({ size, stroke = 10, progress, color = colors.accent, gradient, endAt = 1, track = colors.card, children }: Props) {
  const id = useId().replace(/:/g, '');
  const stops = gradient && gradient.length ? [...gradient].sort((a, b) => a.t - b.t) : [{ t: 0, color }, { t: 1, color }];
  // Piecewise-linear color at a position along the arc.
  const colorAt = (t: number) => {
    if (t <= stops[0].t) return stops[0].color;
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i].t) return mixHex(stops[i - 1].color, stops[i].color, (t - stops[i - 1].t) / (stops[i].t - stops[i - 1].t));
    }
    return stops[stops.length - 1].color;
  };
  // Each half gets evenly sampled stops from its stretch of the arc (right: 0..0.5, left: 0.5..1).
  const halfStops = (from: number) => Array.from({ length: 6 }, (_, i) => ({ offset: i / 5, color: colorAt(from + (i / 5) * 0.5) }));
  const rightStops = halfStops(0);
  const leftStops = halfStops(0.5);
  const startColor = colorAt(0);
  const midColor = colorAt(0.5);
  const headColor = colorAt(endAt);
  const rightStroke = gradient ? `url(#${id}-r)` : color;
  const leftStroke = gradient ? `url(#${id}-l)` : color;
  const r = (size - stroke) / 2;
  const c = size / 2;
  // Half-arcs have FLAT ends that butt together exactly on the center line, so nothing ever pokes into the other
  // half when an arc rotates out of view and the join is seamless. Round caps are drawn separately as two dots.
  const top = stroke / 2;
  const bottom = size - stroke / 2;
  const rightArc = `M ${c} ${top} A ${r} ${r} 0 0 1 ${c} ${bottom}`;
  const leftArc = `M ${c} ${bottom} A ${r} ${r} 0 0 1 ${c} ${top}`;

  // Right half: fully shown while progress >= .5, then rotates counter-clockwise to recede toward the top.
  const right = useAnimatedStyle(() => ({ transform: [{ rotate: `${-Math.max(0, 0.5 - progress.value) * 360}deg` }] }));
  // Left half: recedes first (from the top down to the bottom), hidden once progress < .5.
  const left = useAnimatedStyle(() => ({
    opacity: progress.value > 0.5 ? 1 : 0,
    transform: [{ rotate: `${-Math.min(0.5, 1 - progress.value) * 360}deg` }],
  }));
  // Round cap riding the receding end of the arc.
  const head = useAnimatedStyle(() => ({ opacity: progress.value > 0.002 ? 1 : 0, transform: [{ rotate: `${progress.value * 360}deg` }] }));
  const start = useAnimatedStyle(() => ({ opacity: progress.value > 0.002 ? 1 : 0 }));
  // Covers the 1px antialiasing seam where the two flat ends meet at the bottom while both halves show.
  const joint = useAnimatedStyle(() => ({ opacity: progress.value > 0.5 ? 1 : 0 }));

  const half = { position: 'absolute' as const, top: 0, width: c, height: size, overflow: 'hidden' as const };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      </Svg>
      <View style={[half, { left: c }]}>
        <Animated.View style={[{ position: 'absolute', left: -c, width: size, height: size }, right]}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id={`${id}-r`} x1="0" y1="0" x2="0" y2="1">{rightStops.map((st) => <Stop key={st.offset} offset={st.offset} stopColor={st.color} />)}</LinearGradient>
            </Defs>
            <Path d={rightArc} stroke={rightStroke} strokeWidth={stroke} strokeLinecap="butt" fill="none" />
          </Svg>
        </Animated.View>
      </View>
      <View style={[half, { left: 0 }]}>
        <Animated.View style={[{ position: 'absolute', left: 0, width: size, height: size }, left]}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id={`${id}-l`} x1="0" y1="1" x2="0" y2="0">{leftStops.map((st) => <Stop key={st.offset} offset={st.offset} stopColor={st.color} />)}</LinearGradient>
            </Defs>
            <Path d={leftArc} stroke={leftStroke} strokeWidth={stroke} strokeLinecap="butt" fill="none" />
          </Svg>
        </Animated.View>
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, start]}>
        <Svg width={size} height={size}><Circle cx={c} cy={top} r={stroke / 2} fill={startColor} /></Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, joint]}>
        <Svg width={size} height={size}><Circle cx={c} cy={bottom} r={stroke / 2} fill={midColor} /></Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, head]}>
        <Svg width={size} height={size}><Circle cx={c} cy={top} r={stroke / 2} fill={headColor} /></Svg>
      </Animated.View>
      {children}
    </View>
  );
}
