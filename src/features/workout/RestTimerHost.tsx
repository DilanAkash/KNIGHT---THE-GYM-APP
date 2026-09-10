import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { IconButton } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/Pressable';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { useRestTimer } from '@/store/restTimer';
import { formatDuration } from '@/lib/strength';
import { layout, palette, radius, space } from '@/theme';

/**
 * Global rest timer.
 *
 * Mounted at the root rather than inside the logger so it survives navigating
 * to the exercise library mid-rest — losing your timer because you went to add
 * an exercise would be infuriating.
 */
export function RestTimerHost() {
  const { endsAt, remaining, durationSeconds, context, tick, stop, adjust } = useRestTimer();
  const insets = useSafeAreaInsets();
  const active = endsAt !== null;

  useEffect(() => {
    if (!active) return;
    // 250ms rather than 1s so the displayed second never lags the real one.
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [active, tick]);

  if (!active) return null;

  const progress = durationSeconds > 0 ? remaining / durationSeconds : 0;
  const urgent = remaining <= 10;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(22)}
      exiting={SlideOutDown.duration(200)}
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom, 10) + layout.tabBarHeight + space.sm },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, urgent ? styles.pillUrgent : null]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />

        <ProgressRing
          progress={progress}
          size={38}
          thickness={3.5}
          color={urgent ? palette.warn : palette.accent}
          trackColor="rgba(255,255,255,0.09)"
        />

        <View style={styles.info}>
          <Text variant="numeric" style={{ fontSize: 19 }} color={urgent ? 'warn' : 'primary'}>
            {formatDuration(remaining)}
          </Text>
          <Text variant="caption" color="tertiary" numberOfLines={1}>
            {context ? `Rest · ${context}` : 'Rest'}
          </Text>
        </View>

        <View style={styles.actions}>
          <PressableScale
            onPress={() => adjust(-15)}
            haptic="light"
            scaleTo={0.88}
            style={styles.adjust}
            accessibilityLabel="Subtract 15 seconds"
            accessibilityRole="button"
          >
            <Text variant="label" color="secondary">
              −15
            </Text>
          </PressableScale>
          <PressableScale
            onPress={() => adjust(15)}
            haptic="light"
            scaleTo={0.88}
            style={styles.adjust}
            accessibilityLabel="Add 15 seconds"
            accessibilityRole="button"
          >
            <Text variant="label" color="secondary">
              +15
            </Text>
          </PressableScale>
          <IconButton
            name="close"
            accessibilityLabel="Skip rest"
            onPress={stop}
            size={32}
            iconSize={15}
            background="transparent"
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: layout.gutter,
    right: layout.gutter,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.md,
    paddingRight: space.sm,
    height: 60,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.accentEdge,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  pillUrgent: {
    borderColor: 'rgba(255,176,32,0.45)',
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 20, 23, 0.86)',
  },
  info: {
    flex: 1,
    gap: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  adjust: {
    paddingHorizontal: 8,
    height: 32,
    justifyContent: 'center',
  },
});
