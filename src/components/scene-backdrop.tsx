import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Glow } from '@/components/glow';
import { colors } from '@/constants/theme';

export type SceneRegion = 'cove' | 'path' | 'shore' | 'water' | 'falls';

// Vertical focus (fraction of the 9:16 island image) for each region.
const FOCUS: Record<SceneRegion, number> = { cove: 0.78, path: 0.55, shore: 0.22, water: 0.1, falls: 0.52 };
// Horizontal focus (fraction of image width). Default is centered.
const FOCUS_X: Partial<Record<SceneRegion, number>> = { falls: 0.8 };

/**
 * The island as a backdrop, zoomed on one region and darkened so UI stays readable.
 * Puts every scene physically on the island instead of in a void.
 */
type Props = {
  region: SceneRegion;
  zoom?: number;
  dim?: number;
  blur?: number;
  /** 'natural' adds a soft daylight wash from the upper left so the scene reads without Mojo's glow. */
  light?: 'none' | 'natural';
};

export function SceneBackdrop({ region, zoom = 1.9, dim = 0.55, blur = 2, light = 'none' }: Props) {
  const { width, height } = useWindowDimensions();
  const imgW = width * zoom;
  const imgH = (imgW * 16) / 9;
  const top = -(FOCUS[region] * imgH - height * 0.5);
  const fx = FOCUS_X[region] ?? 0.5;
  const left = Math.min(0, Math.max(width - imgW, -(fx * imgW - width * 0.5)));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Image
        source={require('@/assets/journey/island-still.jpg')}
        style={{ position: 'absolute', width: imgW, height: imgH, left, top }}
        contentFit="cover"
        blurRadius={blur}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: dim }]} />
      {light === 'natural' && (
        <>
          {/* Cool-white daylight falling from the upper left, warming slightly toward the water. */}
          <LinearGradient
            colors={['rgba(214,226,255,0.14)', 'rgba(214,226,255,0.05)', 'rgba(255,214,170,0.03)', 'rgba(0,0,0,0)']}
            locations={[0, 0.3, 0.6, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { alignItems: 'flex-start' }]}>
            <View style={{ position: 'absolute', top: -width * 0.55, left: -width * 0.35 }}>
              <Glow size={width * 1.5} color="#DCE6FF" strength={0.3} />
            </View>
          </View>
        </>
      )}
      <LinearGradient colors={['rgba(15,15,35,0.85)', 'rgba(15,15,35,0)', 'rgba(15,15,35,0)', 'rgba(15,15,35,0.95)']} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}
