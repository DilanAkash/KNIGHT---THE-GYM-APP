import { useCallback, useEffect, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { haptics } from '@/lib/haptics';
import { palette, radius, space, spring, timing, typography } from '@/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Segmented control with a single sliding pill.
 *
 * The pill is one shared element that springs between slots rather than each
 * segment fading its own background — that continuity is the entire reason
 * this reads as premium instead of as a row of buttons.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const position = useSharedValue(index);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const segmentWidth = width > 0 ? (width - 8) / options.length : 0;

  const pillStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: position.value * segmentWidth }],
  }));

  // Driven by the resolved index, so the pill stays correct even when the
  // value is changed from outside this component.
  useEffect(() => {
    position.value = withSpring(index, spring.snap);
  }, [index, position]);

  const select = (option: SegmentOption<T>) => {
    if (option.value === value) return;
    haptics.selection();
    onChange(option.value);
  };

  return (
    <View style={[styles.track, style]} onLayout={onLayout}>
      {segmentWidth > 0 ? <Animated.View style={[styles.pill, pillStyle]} /> : null}
      {options.map((option) => (
        <PressableScale
          key={option.value}
          haptic="none"
          scaleTo={0.94}
          dimTo={1}
          onPress={() => select(option)}
          accessibilityRole="tab"
          accessibilityState={{ selected: option.value === value }}
          style={styles.segment}
        >
          <Text
            variant="label"
            numberOfLines={1}
            style={{
              color: option.value === value ? palette.textPrimary : palette.textTertiary,
              fontFamily: option.value === value ? typography.subheading.fontFamily : typography.label.fontFamily,
            }}
          >
            {option.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Tints the chip with the accent instead of neutral when selected. */
  accent?: boolean;
  count?: number;
}

/** Filter chip. Selected state animates colour rather than swapping styles. */
export function Chip({ label, selected = false, onPress, icon, accent = false, count }: ChipProps) {
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, timing.fast);
  }, [selected, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [palette.surfaceHigh, accent ? palette.accent : palette.textPrimary],
    ),
    borderColor: interpolateColor(progress.value, [0, 1], [palette.hairline, 'transparent']),
  }));

  const textColor = selected ? palette.textOnAccent : palette.textSecondary;

  return (
    <PressableScale onPress={onPress} scaleTo={0.93} dimTo={0.9} haptic="selection">
      <Animated.View style={[styles.chip, animatedStyle]}>
        {icon ? <Icon name={icon} size={14} color={textColor} strokeWidth={2} /> : null}
        <Text variant="label" style={{ color: textColor }} numberOfLines={1}>
          {label}
        </Text>
        {count !== undefined ? (
          <View style={[styles.chipCount, { backgroundColor: selected ? 'rgba(10,11,13,0.16)' : palette.surface }]}>
            <Text variant="caption" style={{ color: textColor, fontSize: 11 }}>
              {count}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}

/** Horizontally scrolling chip row that bleeds to the screen edges. */
export function ChipRow({ children, gutter = 20 }: { children: React.ReactNode; gutter?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -gutter }}
      contentContainerStyle={{ paddingHorizontal: gutter, gap: space.sm }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  pill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: palette.surfaceHigh,
    borderRadius: radius.sm,
  },
  segment: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipCount: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
});
