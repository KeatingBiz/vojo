/** Local-first recording history: one .m4a + one .json per session in the app's Documents folder. No cloud yet. */
import { Directory, File, Paths } from 'expo-file-system';

import type { Analysis } from '@/lib/api';

export type RecordingRecord = { id: string; date: string; prompt: string; pinned: boolean; result: Analysis };

export type RecordingSummary = {
  id: string;
  date: string;
  prompt: string;
  pinned: boolean;
  score: number;
  duration_s: number;
  fillers: number;
  topFiller: string | null;
  wpm: number;
  pauses1s: number;
  confidence: number;
  headline: string;
  subs: { fillers: number; pacing: number; prosody: number; content: number | null };
};

function dir(): Directory {
  const d = new Directory(Paths.document, 'recordings');
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

export function newRecordingId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function summarize(rec: RecordingRecord): RecordingSummary {
  const r = rec.result;
  const top = Object.entries(r.fillers.per_filler)[0];
  return {
    id: rec.id,
    date: rec.date,
    prompt: rec.prompt,
    pinned: rec.pinned,
    score: r.scores.vojo_score,
    duration_s: r.duration_s,
    fillers: r.fillers.total,
    topFiller: top ? `${top[0]} ×${top[1]}` : null,
    wpm: r.pacing.wpm,
    pauses1s: r.pacing.pauses.over_1s,
    confidence: r.scores.confidence,
    headline: r.feedback.headline,
    subs: { fillers: r.scores.fillers, pacing: r.scores.pacing, prosody: r.scores.prosody, content: r.scores.content },
  };
}

/** Moves the clip out of the cache (where iOS may purge it) and writes the scorecard beside it. */
export async function saveRecording(id: string, prompt: string, audioUri: string, result: Analysis): Promise<RecordingRecord> {
  const d = dir();
  const src = new File(audioUri);
  if (src.exists) src.move(new File(d, `${id}.m4a`), { overwrite: true });
  const rec: RecordingRecord = { id, date: new Date().toISOString(), prompt, pinned: false, result };
  const json = new File(d, `${id}.json`);
  json.write(JSON.stringify(rec));
  return rec;
}

export async function listRecordings(): Promise<RecordingSummary[]> {
  const out: RecordingSummary[] = [];
  for (const entry of dir().list()) {
    if (!(entry instanceof File) || !entry.name.endsWith('.json')) continue;
    try {
      out.push(summarize(JSON.parse(await entry.text()) as RecordingRecord));
    } catch {
      /* skip a corrupt record rather than break the list */
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function loadRecording(id: string): Promise<RecordingRecord | null> {
  const f = new File(dir(), `${id}.json`);
  if (!f.exists) return null;
  return JSON.parse(await f.text()) as RecordingRecord;
}

export function audioUri(id: string): string | null {
  const f = new File(dir(), `${id}.m4a`);
  return f.exists ? f.uri : null;
}

export async function setPinned(id: string, pinned: boolean) {
  const rec = await loadRecording(id);
  if (!rec) return;
  new File(dir(), `${id}.json`).write(JSON.stringify({ ...rec, pinned }));
}

export function deleteRecording(id: string) {
  for (const ext of ['.json', '.m4a']) {
    const f = new File(dir(), `${id}${ext}`);
    if (f.exists) f.delete();
  }
}
