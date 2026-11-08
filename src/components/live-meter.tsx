import { useEffect } from 'react';
import { type SharedValue, withTiming } from 'react-native-reanimated';
import type { AudioRecorder } from 'expo-audio';

import { Waveform } from '@/components/ui/waveform';
import { useMicLevel } from '@/lib/use-mic';

type Props = { recorder: AudioRecorder; active: boolean; energy: SharedValue<number>; color?: string };

/** The only component that polls the mic. Pushes the level into a shared value that drives Mojo's glow and the waveform on the UI thread. */
export function LiveMeter({ recorder, active, energy, color }: Props) {
  const { level } = useMicLevel(recorder);
  useEffect(() => {
    energy.set(withTiming(active ? level : 0, { duration: 100 }));
  }, [level, active, energy]);
  return <Waveform level={energy} active={active} color={color} />;
}
