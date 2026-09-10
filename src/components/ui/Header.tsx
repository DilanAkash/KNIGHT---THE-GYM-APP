import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { IconButton } from './Button';
import { Text } from './Text';
import { layout, palette, space } from '@/theme';

export interface HeaderProps {
  title: string;
  /** Small line above the title — greeting, date, breadcrumb. */
  eyebrow?: string;
  right?: ReactNode;
  onBack?: () => void;
  /** Scroll offset. Collapses the big title into a compact bar as you scroll. */
  scrollY?: SharedValue<number>;
  large?: boolean;
}

/**
 * Screen header.
 *
 * When given a scroll position the large title shrinks and fades into a
 * compact bar with a hairline. It's the one place in the app where a
 * scroll-linked animation earns its cost: it buys back vertical space on a
 * phone without hiding where you are.
 */
export function Header({ title, eyebrow, right, onBack, scrollY, large = true }: HeaderProps) {
  const insets = useSafeAreaInsets();

  const largeStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    return {
      opacity: interpolate(scrollY.value, [0, 46], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(scrollY.value, [0, 46], [0, -10], Extrapolation.CLAMP) },
      ],
    };
  });

  const compactStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 0 };
    return {
      opacity: interpolate(scrollY.value, [30, 62], [0, 1], Extrapolation.CLAMP),
    };
  });

  const borderStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 0 };
    return { opacity: interpolate(scrollY.value, [20, 60], [0, 1], Extrapolation.CLAMP) };
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View style={styles.left}>
          {onBack ? (
            <IconButton
              name="chevronLeft"
              accessibilityLabel="Go back"
              onPress={onBack}
              size={38}
              background="transparent"
              color={palette.textPrimary}
              style={styles.back}
            />
          ) : null}
          {scrollY ? (
            <Animated.View style={compactStyle} pointerEvents="none">
              <Text variant="subheading" numberOfLines={1}>
                {title}
              </Text>
            </Animated.View>
          ) : !large ? (
            <Text variant="subheading" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>{right}</View>
      </View>

      {large ? (
        <Animated.View style={[styles.large, largeStyle]}>
          {eyebrow ? (
            <Text variant="label" color="tertiary">
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="display" numberOfLines={1}>
            {title}
          </Text>
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.border, borderStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: palette.void,
    zIndex: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: layout.gutter,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flex: 1,
  },
  back: {
    marginLeft: -10,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  large: {
    paddingHorizontal: layout.gutter,
    paddingTop: 2,
    paddingBottom: space.md,
    gap: 2,
  },
  border: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
  },
});
