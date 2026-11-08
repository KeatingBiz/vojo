import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import meta from '@/assets/icons/hourglass.json';

const BASE = require('@/assets/icons/hourglass-base.png');
const TOP = require('@/assets/icons/hourglass-sand-top.png');
const BOTTOM = require('@/assets/icons/hourglass-sand-bottom.png');
const STREAM = require('@/assets/icons/hourglass-stream.png');

/** Height of the sand column as a share of each bulb; keeps a little air at the full end. */
const TOP_MAX = 0.85;
const BOTTOM_MAX = 0.75;

type Props = { size: number; /** 1 = full day left, 0 = out of time */ fraction: number };

/**
 * One generated hourglass split into layers: empty glass, top sand, bottom sand, stream.
 * The sand layers are clipped to the time remaining, so the same art animates all day.
 */
export function Hourglass({ size, fraction }: Props) {
  const f = Math.min(1, Math.max(0, fraction));
  const k = size / meta.size;
  const [t0, t1] = meta.top;
  const [b0, b1] = meta.bottom;
  const topCut = (t1 - f * TOP_MAX * (t1 - t0)) * k;
  const bottomCut = (b1 - (1 - f) * BOTTOM_MAX * (b1 - b0)) * k;
  const layer = { width: size, height: size } as const;
  return (
    <View style={layer}>
      <Image source={BASE} style={[StyleSheet.absoluteFill, layer]} contentFit="contain" />
      <View style={{ position: 'absolute', left: 0, top: topCut, width: size, height: size - topCut, overflow: 'hidden' }}>
        <Image source={TOP} style={[layer, { position: 'absolute', top: -topCut }]} contentFit="contain" />
      </View>
      <View style={{ position: 'absolute', left: 0, top: bottomCut, width: size, height: size - bottomCut, overflow: 'hidden' }}>
        <Image source={BOTTOM} style={[layer, { position: 'absolute', top: -bottomCut }]} contentFit="contain" />
      </View>
      {f > 0.01 && f < 0.995 && <Image source={STREAM} style={[StyleSheet.absoluteFill, layer]} contentFit="contain" />}
    </View>
  );
}
