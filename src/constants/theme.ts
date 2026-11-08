// Vojo design tokens. Every screen reads from here; no raw hex in components.
export const colors = {
  bg: '#0F0F23',
  bgRaised: '#161432',
  card: '#1C1A3A',
  cardBorder: '#2A2750',
  cardEdge: '#120F2B',
  primary: '#7C3AED',
  primaryEdge: '#4C1D95',
  primarySoft: '#A78BFA',
  accent: '#F97316',
  accentEdge: '#B4530F',
  accentSoft: '#FDBA74',
  text: '#FFFFFF',
  muted: '#A5A3C4',
  faint: '#6E6B93',
  success: '#34D399',
  danger: '#F87171',
  cyan: '#8FE3FF',
  boss: '#0E6B6B',
  bossDeep: '#073B3F',
  water: '#12243D',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'Nunito_400Regular',
  bodyMedium: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.displayBold, fontSize: 34, lineHeight: 40, color: colors.text },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.text },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 25, color: colors.text },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  small: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: colors.muted },
} as const;
