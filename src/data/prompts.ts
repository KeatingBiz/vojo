export type Prompt = { text: string; thinkSeconds: number; speakSeconds: number; tag: string };

// Week 1: warm, subjective, no wrong answers. Difficulty ramps in later weeks.
const WEEK_ONE: Prompt[] = [
  { text: 'What is your favorite color, and why does it feel like you?', thinkSeconds: 30, speakSeconds: 60, tag: 'Warm-up' },
  { text: 'What is the best thing that happened to you this week?', thinkSeconds: 30, speakSeconds: 60, tag: 'Warm-up' },
  { text: 'What are you passionate about right now, and when did that start?', thinkSeconds: 30, speakSeconds: 60, tag: 'Story' },
  { text: 'Describe a place that makes you calm, so clearly that I could find it.', thinkSeconds: 30, speakSeconds: 60, tag: 'Description' },
  { text: 'What is something you changed your mind about this year, and what changed it?', thinkSeconds: 30, speakSeconds: 60, tag: 'Reflection' },
  { text: 'Convince me to try your favorite food. One minute. Go.', thinkSeconds: 30, speakSeconds: 60, tag: 'Persuasion' },
];

export const BOSS_TOPIC = 'Nobody needs to be a good speaker anymore. AI will do the talking.';

export function getPrompt(dayIndex: number): Prompt {
  return WEEK_ONE[Math.min(dayIndex, WEEK_ONE.length - 1)];
}
