/** Mirrors server/vojo_speech/config.py so the app teaches the same rules it grades by. Keep in sync. */
export const SCORING = {
  weights: { fillers: 0.3, pacing: 0.25, prosody: 0.25, content: 0.2 },
  fillers: { freePerMin: 1, zeroPerMin: 12 },
  wpm: { ideal: [130, 170] as const, rushing: 190, slow: 110 },
  pauses: { idealPerMin: [1, 4] as const },
  pitch: { fullSt: 2.5, monotoneSt: 1.5 },
  uptalk: { freeRatio: 0.15, zeroRatio: 0.75 },
  elite: 88,
};

export type ExplainerKey = 'fillers' | 'pacing' | 'prosody' | 'content';

export const EXPLAINERS: { key: ExplainerKey; title: string; weight: string; what: string; target: string; why: string }[] = [
  {
    key: 'fillers',
    title: 'Filler words',
    weight: '30% of your score',
    what: 'Um, uh, like, you know, basically, actually, sentence-opening so. Counted from the transcript, then the coach rules on the ambiguous ones.',
    target: 'Up to 1 per minute costs nothing. The score falls to zero at 12 per minute.',
    why: 'A filler is a stall. Replacing it with a half-second of silence reads as control, and listeners trust silence more than noise.',
  },
  {
    key: 'pacing',
    title: 'Pace & pauses',
    weight: '25% of your score',
    what: 'Words per minute from the word timestamps, plus every gap over a second.',
    target: '130 to 170 words per minute. One to four pauses over a second per minute. Zero pauses is not better than a few.',
    why: 'Above 190 reads as rushing. Below 110 reads as searching. Pauses are where your point lands.',
  },
  {
    key: 'prosody',
    title: 'Delivery',
    weight: '25% of your score',
    what: 'Pitch range in semitones relative to your own voice, and how many statements end on a rising tone. Confidence is built only from these measured signals plus fillers and pauses.',
    target: 'At least 2.5 semitones of movement. Fewer than 15% of statements ending in a rise.',
    why: 'Flat pitch reads as disengaged. A rising end on a statement reads as a question you are asking yourself.',
  },
  {
    key: 'content',
    title: 'Content',
    weight: '20% of your score',
    what: 'Did you answer the prompt, did the answer have a point, support and an ending, and was it clear. Judged by the coach from the transcript only, never from tone.',
    target: 'A clear claim, one concrete example, and a closing sentence you can hear.',
    why: 'Delivery earns attention. Content is what people remember.',
  },
];
