import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { duration, easing, palette } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** 0..1. Clamped for the arc, but callers may pass more to mean "over target". */
  progress: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
  /** Stagger, for rings that appear as a group. */
  delay?: number;
  gradient?: boolean;
}

/**
 * Circular progress. Starts at 12 o'clock and sweeps clockwise — the only
 * orientation people read intuitively as "how much of this is done".
 */
export function ProgressRing({
  progress,
  size = 72,
  thickness = 7,
  color = palette.accent,
  trackColor = palette.surfaceHigh,
  children,
  delay = 0,
  gradient = false,
}: ProgressRingProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    animated.value = withDelay(
      delay,
      withTiming(clamped, { duration: duration.slower, easing: easing.standard }),
    );
  }, [clamped, delay, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  const gradientId = `ring-${size}-${thickness}`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {gradient ? (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={palette.accentDim} />
              <Stop offset="1" stopColor={palette.accent} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={thickness} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={gradient ? `url(#${gradientId})` : color}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

export interface ProgressBarProps {
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
  delay?: number;
  rounded?: boolean;
}

/** Scales on the UI thread rather than animating width, which would relayout. */
export function ProgressBar({
  progress,
  height = 6,
  color = palette.accent,
  trackColor = palette.surfaceHigh,
  delay = 0,
  rounded = true,
}: ProgressBarProps) {
  const animated = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    animated.value = withDelay(
      delay,
      withTiming(clamped, { duration: duration.slow, easing: easing.standard }),
    );
  }, [clamped, delay, animated]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.0001, animated.value) }],
  }));

  return (
    <View
      style={{
        height,
        backgroundColor: trackColor,
        borderRadius: rounded ? height / 2 : 0,
        overflow: 'hidden',
      }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            borderRadius: rounded ? height / 2 : 0,
            transformOrigin: 'left',
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
