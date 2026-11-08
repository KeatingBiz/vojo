import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Persisted on-device via AsyncStorage. Supabase sync comes later.
export type VojoState = {
  streak: number;
  bestStreak: number;
  xp: number;
  sessions: number;
  /** 0..6 within the current week. Index 6 is the boss. */
  dayIndex: number;
  /** 1-based week within the season (4 weeks per season). */
  week: number;
  season: number;
  bossWins: number;
  completed: boolean[];
  todayDone: boolean;
  lastScore: number | null;
  bossBeaten: boolean;
  /** Bumped whenever a recording is saved, pinned or deleted so lists refresh. Not persisted meaningfully. */
  recordingsVersion: number;
  bumpRecordings: () => void;
  completeSession: (score: number) => void;
  completeBoss: (won: boolean) => void;
  resetDemo: () => void;
};

const fresh = () => ({
  streak: 0,
  bestStreak: 0,
  xp: 0,
  sessions: 0,
  dayIndex: 0,
  week: 1,
  season: 1,
  bossWins: 0,
  completed: [false, false, false, false, false, false, false],
  todayDone: false,
  lastScore: null as number | null,
  bossBeaten: false,
  recordingsVersion: 0,
});

export const useVojo = create<VojoState>()(persist((set) => ({
  ...fresh(),
  completeSession: (score) =>
    set((s) => {
      const completed = [...s.completed];
      completed[s.dayIndex] = true;
      const streak = s.streak + 1;
      return {
        completed,
        todayDone: true,
        lastScore: score,
        streak,
        bestStreak: Math.max(streak, s.bestStreak),
        xp: s.xp + score,
        sessions: s.sessions + 1,
        // Prototype: advance immediately so the whole week can be walked in one sitting.
        dayIndex: Math.min(6, s.dayIndex + 1),
      };
    }),
  completeBoss: (won) =>
    set((s) => {
      if (!won) return { bossBeaten: false, xp: s.xp + 40, todayDone: false };
      const lastWeek = s.week >= 4;
      return {
        bossBeaten: true,
        bossWins: s.bossWins + 1,
        xp: s.xp + 150,
        completed: [false, false, false, false, false, false, false],
        dayIndex: 0,
        todayDone: false,
        week: lastWeek ? 1 : s.week + 1,
        season: lastWeek ? s.season + 1 : s.season,
      };
    }),
  bumpRecordings: () => set((s) => ({ recordingsVersion: s.recordingsVersion + 1 })),
  resetDemo: () => set(fresh()),
}), { name: 'vojo-v1', storage: createJSONStorage(() => AsyncStorage) }));
