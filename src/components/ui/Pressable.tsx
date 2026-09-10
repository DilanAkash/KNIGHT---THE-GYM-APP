import { type ReactNode, useCallback } from 'react';
import { Pressable as RNPressable, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { spring, timing } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export type HapticStrength = 'none' | 'light' | 'medium' | 'heavy' | 'selection';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far it compresses. Big surfaces need less than small ones. */
  scaleTo?: number;
  /** Dim on press. Set 1 to keep full opacity (already-dark surfaces). */
  dimTo?: number;
  haptic?: HapticStrength;
}

/**
 * The app's one interactive surface.
 *
 * Touch devices have no hover, so the press state has to carry all the
 * affordance: it compresses on touch-down with a spring, and — crucially —
 * springs back on release rather than snapping. That release is what makes a
 * button feel physical instead of like a state toggle.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  dimTo = 0.85,
  haptic = 'light',
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: 1 - pressed.value * (1 - dimTo),
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      pressed.value = withTiming(1, timing.fast);
      if (haptic !== 'none') {
        if (haptic === 'selection') haptics.selection();
        else haptics[haptic]();
      }
      onPressIn?.(event);
    },
    [haptic, onPressIn, pressed],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      pressed.value = withSpring(0, spring.snap);
      onPressOut?.(event);
    },
    [onPressOut, pressed],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle, disabled ? { opacity: 0.4 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}
