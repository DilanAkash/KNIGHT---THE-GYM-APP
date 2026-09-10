import { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Text as RNText,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { palette, spring, timing, typography, type TypeToken } from '@/theme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
Animated.addWhitelistedNativeProps({ text: true });

export interface AnimatedNumberProps {
  value: number;
  /** Digits after the decimal point. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  variant?: TypeToken;
  color?: string;
  style?: StyleProp<TextStyle>;
  /** Springs (with overshoot) instead of easing. Good for hero stats. */
  bouncy?: boolean;
  /** Thousands separators. Off for timers and reps. */
  grouped?: boolean;
  /** Renders 17,290 as 17.3k. For tiles where a full number would overflow. */
  compact?: boolean;
}

function format(
  value: number,
  decimals: number,
  grouped: boolean,
  prefix: string,
  suffix: string,
  compact: boolean,
) {
  'worklet';
  if (compact && Math.abs(value) >= 1000) {
    const scaled = Math.abs(value) >= 1_000_000 ? value / 1_000_000 : value / 1000;
    const unit = Math.abs(value) >= 1_000_000 ? 'M' : 'k';
    return `${prefix}${scaled.toFixed(1)}${unit}${suffix}`;
  }
  const fixed = value.toFixed(decimals);
  if (!grouped) return `${prefix}${fixed}${suffix}`;
  const [whole, fraction] = fixed.split('.');
  const withSeparators = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${prefix}${fraction ? `${withSeparators}.${fraction}` : withSeparators}${suffix}`;
}

/**
 * Counts to its value instead of snapping.
 *
 * Driven entirely on the UI thread by writing to a read-only TextInput — a
 * React state update per frame would drop the count to ~15fps on the mid-range
 * Android phone this app actually runs on in a gym.
 *
 * A TextInput has no intrinsic content width and will happily eat every spare
 * pixel of a flex row, shoving whatever sits next to it off screen. So a hidden
 * Text holding the final value sets the layout width and the animated input is
 * laid over it. Counting up never exceeds the final width, so nothing clips.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  variant = 'numericLarge',
  color = palette.textPrimary,
  style,
  bouncy = false,
  grouped = true,
  compact = false,
}: AnimatedNumberProps) {
  const animated = useSharedValue(value);

  useEffect(() => {
    animated.value = bouncy
      ? withSpring(value, spring.counter)
      : withTiming(value, { ...timing.slow, duration: 700 });
  }, [value, bouncy, animated]);

  const animatedProps = useAnimatedProps(() => {
    const text = format(animated.value, decimals, grouped, prefix, suffix, compact);
    return { text, defaultValue: text };
  });

  const target = useMemo(
    () => format(value, decimals, grouped, prefix, suffix, compact),
    [value, decimals, grouped, prefix, suffix, compact],
  );

  const textStyle = [typography[variant], styles.text, { color }, style];

  return (
    <View style={styles.wrap}>
      <RNText style={[textStyle, styles.ghost]} numberOfLines={1} accessibilityLabel={target}>
        {target}
      </RNText>
      <AnimatedTextInput
        editable={false}
        pointerEvents="none"
        // The animated prop is invisible to screen readers; the ghost above
        // carries the accessible value.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        underlineColorAndroid="transparent"
        animatedProps={animatedProps}
        style={[textStyle, styles.input]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  text: {
    padding: 0,
    margin: 0,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  ghost: {
    opacity: 0,
  },
  input: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlignVertical: 'center',
  },
});
