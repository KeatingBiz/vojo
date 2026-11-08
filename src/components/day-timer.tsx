import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Hourglass } from '@/components/hourglass';
import { colors, fonts } from '@/constants/theme';

const DAY = 24 * 3600 * 1000;

function msToMidnight(now = new Date()) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return end.getTime() - now.getTime();
}

function format(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Counts down to local midnight. Ticks in its own component so the page around it never re-renders. */
export function DayTimer({ done }: { done: boolean }) {
  const [left, setLeft] = useState(() => msToMidnight());
  useEffect(() => {
    const id = setInterval(() => setLeft(msToMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  const urgent = !done && left < 2 * 3600 * 1000;
  return (
    <View style={[styles.card, urgent && styles.urgent]}>
      <Hourglass size={64} fraction={left / DAY} />
      <View>
        <Text style={[styles.time, urgent && { color: colors.accent }]}>{format(left)}</Text>
        <Text style={styles.sub}>{done ? 'until tomorrow’s prompt' : 'left to keep the flame lit'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(28,26,58,0.85)', borderWidth: 1.5, borderColor: colors.cardBorder, borderRadius: 22, paddingVertical: 8, paddingLeft: 10, paddingRight: 18, marginTop: 14 },
  urgent: { borderColor: colors.accentEdge },
  time: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 34, color: colors.text, fontVariant: ['tabular-nums'] },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
});
