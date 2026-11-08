import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioRecorder,
} from 'expo-audio';
import { useCallback } from 'react';

/** dBFS (-160..0) → 0..1. Speech sits around -40..-10. */
export function dbToLevel(db: number | undefined) {
  return Math.max(0, Math.min(1, ((db ?? -160) + 50) / 45));
}

/** Speech-tuned preset: mono AAC at 48 kbps, ~360 KB per minute, transparent to the grader and cheap to keep. */
const SPEECH = { ...RecordingPresets.HIGH_QUALITY, sampleRate: 24000, numberOfChannels: 1, bitRate: 48000, isMeteringEnabled: true };

/** Microphone recording. Start/stop only; use `useMicLevel` in a leaf component for the live meter. */
export function useMic() {
  const recorder = useAudioRecorder(SPEECH);

  const start = useCallback(async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [recorder]);

  const stop = useCallback(async () => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    return recorder.uri;
  }, [recorder]);

  return { recorder, start, stop };
}

/** Polls the recorder 10x/s. Keep this in a small leaf so the rest of the screen does not re-render with it. */
export function useMicLevel(recorder: AudioRecorder) {
  const state = useAudioRecorderState(recorder, 100);
  return { level: dbToLevel(state.metering), isRecording: state.isRecording };
}
