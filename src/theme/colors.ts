/**
 * KNIGHT palette.
 *
 * One accent carries the entire app. Everything else is a neutral, so the lime
 * only ever appears where something is live, achieved, or actionable. If the
 * accent starts showing up on decoration, the hierarchy is broken.
 */

export const palette = {
  /** Page background. Near-black with a trace of blue so it doesn't read as grey. */
  void: '#0A0B0D',
  /** Default card. */
  surface: '#121417',
  /** Card sitting on a card. */
  surfaceRaised: '#191C21',
  /** Pressed / hovered / input fill. */
  surfaceHigh: '#21252B',
  /** Sheets and overlays that need to feel closer to the eye. */
  surfaceSheet: '#16191E',

  hairline: 'rgba(255, 255, 255, 0.07)',
  hairlineStrong: 'rgba(255, 255, 255, 0.13)',

  textPrimary: '#F5F7F9',
  textSecondary: '#98A1AC',
  textTertiary: '#5E6772',
  textOnAccent: '#0A0B0D',

  accent: '#C7FF3C',
  accentDim: '#A3D42E',
  accentDeep: '#6F9418',
  accentSoft: 'rgba(199, 255, 60, 0.13)',
  accentEdge: 'rgba(199, 255, 60, 0.32)',
  accentGlow: 'rgba(199, 255, 60, 0.55)',

  danger: '#FF5C5C',
  dangerSoft: 'rgba(255, 92, 92, 0.14)',
  warn: '#FFB020',
  warnSoft: 'rgba(255, 176, 32, 0.14)',
  info: '#57C7FF',
  infoSoft: 'rgba(87, 199, 255, 0.14)',

  scrim: 'rgba(4, 5, 6, 0.72)',
} as const;

/**
 * Macro identities. Kept deliberately desaturated so a nutrition ring never
 * out-shouts the lime, which belongs to training.
 */
export const macroColors = {
  protein: '#7FD1FF',
  carbs: '#FFC46B',
  fat: '#FF8FA3',
  calories: palette.accent,
} as const;

/**
 * Heat ramp for the muscle map: unworked -> hammered this week.
 * Steps through neutral before it picks up any accent, so a rest week reads
 * as genuinely cold rather than dim-green.
 */
export const heatRamp = [
  '#1A1D22',
  '#26333A',
  '#3A5540',
  '#5C8A34',
  '#8FC22C',
  '#C7FF3C',
] as const;

export type Palette = typeof palette;
