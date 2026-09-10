/** 4pt grid. Use the token, never a raw number, or the rhythm drifts. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 34,
  pill: 999,
} as const;

/** Screens keep a consistent inset so cards align down the whole app. */
export const layout = {
  gutter: 20,
  cardPadding: 16,
  tabBarHeight: 64,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
  /** Minimum touch target. Anything smaller gets padded up to this. */
  minTouch: 44,
} as const;

/**
 * Dark UI can't lean on drop shadows — they're invisible. Elevation here is
 * carried by surface lightness plus a hairline; the shadow only adds a little
 * separation on Android where it actually renders.
 */
export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
} as const;
