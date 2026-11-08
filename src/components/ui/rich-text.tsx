import { Text, type StyleProp, type TextStyle } from 'react-native';

import { colors, fonts } from '@/constants/theme';

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Extra words to light up even when the coach did not mark them (e.g. the filler words themselves). */
  terms?: string[];
  highlightColor?: string;
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Renders `**marked**` spans (and any `terms`) in bold display type and a brand color. */
export function RichText({ text, style, terms = [], highlightColor = colors.accent }: Props) {
  const parts: { t: string; hi: boolean }[] = [];
  text.split(/(\*\*[^*]+\*\*)/g).forEach((seg) => {
    if (!seg) return;
    if (seg.startsWith('**') && seg.endsWith('**')) {
      parts.push({ t: seg.slice(2, -2), hi: true });
      return;
    }
    if (terms.length) {
      const re = new RegExp(`\\b(${terms.map(esc).join('|')})\\b`, 'gi');
      seg.split(re).forEach((piece, i) => piece && parts.push({ t: piece, hi: i % 2 === 1 }));
    } else {
      parts.push({ t: seg, hi: false });
    }
  });
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.hi ? (
          <Text key={i} style={{ fontFamily: fonts.displayBold, color: highlightColor }}>{p.t}</Text>
        ) : (
          <Text key={i}>{p.t}</Text>
        ),
      )}
    </Text>
  );
}
