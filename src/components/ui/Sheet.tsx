import { type ReactNode, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { IconButton } from './Button';
import { Text } from './Text';
import { palette, radius, space, spring, timing } from '@/theme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Fraction of screen height. The sheet never exceeds this. */
  maxHeight?: number;
  /** Hides the drag handle and close button for confirm-style sheets. */
  compact?: boolean;
}

/**
 * Bottom sheet.
 *
 * The drag tracks your finger 1:1 and decides on release using velocity as
 * well as distance — a fast short flick dismisses, a slow long drag springs
 * back. Distance alone feels unresponsive to a quick flick.
 */
export function Sheet({ visible, onClose, title, children, maxHeight = 0.88, compact = false }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useSharedValue(screenHeight);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, spring.sheet);
      backdrop.value = withTiming(1, timing.base);
    } else {
      translateY.value = withTiming(screenHeight, timing.exit);
      backdrop.value = withTiming(0, timing.exit);
    }
  }, [visible, screenHeight, translateY, backdrop]);

  const dismiss = () => {
    translateY.value = withTiming(screenHeight, timing.exit, (finished) => {
      if (finished) runOnJS(onClose)();
    });
    backdrop.value = withTiming(0, timing.exit);
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      // Resist upward drag instead of blocking it — a hard stop feels broken.
      translateY.value = event.translationY > 0 ? event.translationY : event.translationY * 0.2;
    })
    .onEnd((event) => {
      'worklet';
      const shouldClose = event.translationY > 120 || event.velocityY > 900;
      if (shouldClose) {
        translateY.value = withTiming(screenHeight, timing.exit, (finished) => {
          if (finished) runOnJS(onClose)();
        });
        backdrop.value = withTiming(0, timing.exit);
      } else {
        translateY.value = withSpring(0, spring.sheet);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]}
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.sheet,
              {
                maxHeight: screenHeight * maxHeight,
                paddingBottom: insets.bottom + space.base,
              },
              sheetStyle,
            ]}
          >
            {!compact ? <View style={styles.handle} /> : null}
            {title ? (
              <View style={styles.header}>
                <Text variant="heading">{title}</Text>
                <IconButton
                  name="close"
                  onPress={dismiss}
                  size={34}
                  background="transparent"
                  accessibilityLabel="Close"
                />
              </View>
            ) : null}
            <View style={styles.body}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.surfaceSheet,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairlineStrong,
    paddingTop: space.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.hairlineStrong,
    marginBottom: space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  body: {
    paddingHorizontal: space.lg,
  },
});
