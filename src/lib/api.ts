/** Client for the Vojo speech-analysis service (server/ in this repo, deployed on Vercel). */
import { File } from 'expo-file-system';

export const API_URL = process.env.EXPO_PUBLIC_VOJO_API_URL ?? 'https://vojo-api.vercel.app';
const API_KEY = process.env.EXPO_PUBLIC_VOJO_API_KEY;

export type Measured = {
  stage?: 'measured' | 'final';
  duration_s: number;
  transcript: string;
  words: { text: string; start_ms: number; end_ms: number; is_filler: boolean }[];
  fillers: { total: number; per_filler: Record<string, number>; per_minute: number; per_100_words: number };
  pacing: { wpm: number; wpm_windows?: { start_s: number; wpm: number }[]; pauses: { over_1s: number; over_2s: number; over_3s: number; longest_s: number }; flags: { rushing: boolean; too_slow: boolean; long_freeze: boolean } };
  prosody: { pitch_variation_semitones: number; monotone: boolean; uptalk: { rising: number; statements: number; ratio: number } };
  scores: { fillers: number; pacing: number; prosody: number; content: number | null; confidence: number; vojo_score: number };
};

export type Analysis = Measured & {
  content: { on_topic_score: number; structure_score: number; clarity_score: number; answered_the_prompt: boolean; best_moment: string; one_tip: string } | null;
  feedback: { headline: string; notes: { fillers?: string; pacing?: string; delivery?: string; content?: string }; one_tip: string };
  meta: { timings: Record<string, number>; cost: { total_usd: number } };
};

/** Fire-and-forget: wakes the serverless function so the real request skips the cold start. */
export function warmUp() {
  fetch(`${API_URL}/health`).catch(() => {});
}

/**
 * Uploads the clip. The server streams two JSON lines: measured numbers first (fast), then the full
 * scorecard with coaching copy. `onMeasured` fires as soon as the first line lands.
 */
export async function analyzeRecording(uri: string, prompt: string, onMeasured?: (m: Measured) => void): Promise<Analysis> {
  const form = new FormData();
  // Expo's fetch wants a real File (or Blob); the old { uri, name, type } descriptor throws "Unsupported FormDataPart".
  form.append('audio', new File(uri) as unknown as Blob, 'clip.m4a');
  form.append('prompt', prompt);
  const res = await fetch(`${API_URL}/analyze`, { method: 'POST', body: form, headers: API_KEY ? { 'X-Vojo-Key': API_KEY } : undefined });
  if (!res.ok) {
    let message = `The grader returned ${res.status}.`;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') message = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  let final: Analysis | null = null;
  const handle = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const obj = JSON.parse(trimmed) as Analysis;
    if (obj.stage === 'final' || 'feedback' in obj) final = obj;
    else onMeasured?.(obj);
  };

  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl = buf.indexOf('\n');
      while (nl >= 0) {
        handle(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
        nl = buf.indexOf('\n');
      }
    }
    handle(buf);
  } else {
    (await res.text()).split('\n').forEach(handle);
  }
  if (!final) throw new Error('The grader did not finish.');
  return final;
}
