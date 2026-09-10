import { useEffect } from 'react';
import { StyleSheet, TextInput, type TextStyle, type StyleProp } from 'react-native';
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
}

/**
 * Counts to its value instead of snapping.
 *
 * Driven entirely on the UI thread by writing to a read-only TextInput — a
 * React state update per frame would drop the count to ~15fps on a mid-range
 * Android phone, which is exactly the device this app runs on in a gym.
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
}: AnimatedNumberProps) {
  const animated = useSharedValue(value);

  useEffect(() => {
    animated.value = bouncy
      ? withSpring(value, spring.counter)
      : withTiming(value, { ...timing.slow, duration: 700 });
  }, [value, bouncy, animated]);

  const animatedProps = useAnimatedProps(() => {
    const current = animated.value;
    const fixed = current.toFixed(decimals);
    let text = fixed;

    if (grouped) {
      const [whole, fraction] = fixed.split('.');
      const withSeparators = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      text = fraction ? `${withSeparators}.${fraction}` : withSeparators;
    }

    return { text: `${prefix}${text}${suffix}`, defaultValue: `${prefix}${text}${suffix}` };
  });

  return (
    <AnimatedTextInput
      editable={false}
      // Static fallback for screen readers, which don't see the animated prop.
      accessibilityLabel={`${prefix}${value.toFixed(decimals)}${suffix}`}
      underlineColorAndroid="transparent"
      animatedProps={animatedProps}
      style={[typography[variant], styles.input, { color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 0,
    margin: 0,
    // Android TextInput reserves vertical padding we never want here.
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
