import { Platform, type TextStyle } from 'react-native';

/**
 * Two families, strict division of labour:
 *   Space Grotesk  -> numbers, stats, screen titles. It has the odd, slightly
 *                     mechanical letterforms that keep this from looking like
 *                     every other rounded-sans fitness app.
 *   Inter          -> everything you actually read. Invisible on purpose.
 */
export const fontFamily = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  displaySemi: 'SpaceGrotesk_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/** Locks digit widths so a running timer or a rep count never jitters. */
export const tabular: TextStyle = Platform.select({
  ios: { fontVariant: ['tabular-nums'] },
  default: { fontVariant: ['tabular-nums'] },
}) as TextStyle;

export const type = {
  /** The one big number on a screen — session volume, timer, bodyweight. */
  hero: {
    fontFamily: fontFamily.display,
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -2,
  },
  display: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.1,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.7,
  },
  heading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.4,
  },
  subheading: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  bodyStrong: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0,
  },
  /** Section eyebrows. Wide tracking is what makes these feel considered. */
  overline: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.3,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  /** Numerals inside table-like rows (set logger, history lists). */
  numeric: {
    fontFamily: fontFamily.displayMedium,
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.3,
    ...tabular,
  },
  numericLarge: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -1,
    ...tabular,
  },
} as const;

export type TypeToken = keyof typeof type;
