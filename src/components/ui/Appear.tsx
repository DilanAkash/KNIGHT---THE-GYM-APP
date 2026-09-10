import { type ReactNode, useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { spring, stagger, timing } from '@/theme';

export type AppearFrom = 'below' | 'above' | 'scale' | 'fade';

export interface AppearProps {
  children: ReactNode;
  /** Position in a list; drives the stagger delay. */
  index?: number;
  /** Explicit delay in ms. Overrides `index`. */
  delay?: number;
  from?: AppearFrom;
  distance?: number;
  style?: StyleProp<ViewStyle>;
  config?: WithSpringConfig;
  /** Set false to render immediately with no animation. */
  enabled?: boolean;
}

/**
 * Entrance animation for anything that sits in normal layout flow.
 *
 * Deliberately not Reanimated's `entering={FadeInDown}`: those layout
 * animations take the element out of flow while they run, which is fine on
 * native but leaves it absolutely positioned forever on web, collapsing the
 * page into a pile of overlapping cards. Animating opacity and transform
 * through a plain animated style never touches layout, so a card occupies its
 * final space from the first frame on every platform.
 */
export function Appear({
  children,
  index = 0,
  delay,
  from = 'below',
  distance = 14,
  style,
  config = spring.gentle,
  enabled = true,
}: AppearProps) {
  const progress = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay ?? stagger(index), withSpring(1, config));
  }, [enabled, delay, index, config, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const offset = (1 - progress.value) * distance;
    return {
      opacity: progress.value,
      transform:
        from === 'scale'
          ? [{ scale: 0.94 + progress.value * 0.06 }]
          : from === 'fade'
            ? []
            : [{ translateY: from === 'below' ? offset : -offset }],
    };
  });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/**
 * Same entrance as a style you can compose yourself — for cases where an extra
 * wrapping view would break a flex or absolute layout.
 */
export function useAppearStyle({
  index = 0,
  delay,
  distance = 14,
  from = 'below',
  enabled = true,
}: Omit<AppearProps, 'children' | 'style' | 'config'> = {}) {
  const progress = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay ?? stagger(index), withTiming(1, timing.enter));
  }, [enabled, delay, index, progress]);

  return useAnimatedStyle(() => {
    const offset = (1 - progress.value) * distance;
    return {
      opacity: progress.value,
      transform:
        from === 'scale'
          ? [{ scale: 0.94 + progress.value * 0.06 }]
          : from === 'fade'
            ? []
            : [{ translateY: from === 'below' ? offset : -offset }],
    };
  });
}
