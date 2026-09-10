import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/**
 * Motion rules for KNIGHT.
 *
 * 1. Anything the finger is touching uses a spring — it should feel attached
 *    to the hand, not scheduled.
 * 2. Anything appearing/disappearing on its own uses a timing curve.
 * 3. Nothing eases linearly. Ever.
 * 4. Entrances decelerate (fast in, settle). Exits accelerate (leave quickly);
 *    the user has already moved on, so don't make them wait for it.
 */

export const duration = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 360,
  slower: 520,
  /** Celebrations, PR reveals — the only place a long duration is earned. */
  ceremony: 900,
} as const;

export const easing = {
  /** Workhorse. Strong initial velocity, long soft settle. */
  standard: Easing.bezier(0.22, 1, 0.36, 1),
  /** For things that need to feel deliberate and heavy. */
  emphasized: Easing.bezier(0.34, 0.01, 0, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
  /** Slight overshoot for confirmations. */
  overshoot: Easing.bezier(0.34, 1.4, 0.5, 1),
} as const;

export const spring = {
  /** Press states, chips, toggles. Fast, no visible bounce. */
  snap: { damping: 18, stiffness: 280, mass: 0.85 } satisfies WithSpringConfig,
  /** Layout shifts, cards settling into place. */
  gentle: { damping: 20, stiffness: 150, mass: 1 } satisfies WithSpringConfig,
  /** Rewards, PR badges, the set-complete tick. Visible overshoot is the point. */
  bouncy: { damping: 11, stiffness: 190, mass: 0.9 } satisfies WithSpringConfig,
  /** Sheets and drawers tracking a drag. */
  sheet: { damping: 30, stiffness: 320, mass: 1 } satisfies WithSpringConfig,
  /** Numbers counting up. Slow and heavy so the value stays readable. */
  counter: { damping: 26, stiffness: 90, mass: 1.1 } satisfies WithSpringConfig,
} as const;

export const timing = {
  fast: { duration: duration.fast, easing: easing.standard } satisfies WithTimingConfig,
  base: { duration: duration.base, easing: easing.standard } satisfies WithTimingConfig,
  slow: { duration: duration.slow, easing: easing.emphasized } satisfies WithTimingConfig,
  enter: { duration: duration.base, easing: easing.decelerate } satisfies WithTimingConfig,
  exit: { duration: duration.fast, easing: easing.accelerate } satisfies WithTimingConfig,
} as const;

/**
 * Staggered list entrances. Capped so a long list doesn't leave the last row
 * animating in a full second after the user started reading.
 */
export const stagger = (index: number, step = 45, cap = 8) =>
  Math.min(index, cap) * step;
