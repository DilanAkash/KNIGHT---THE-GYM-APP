import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { palette, radius, space, spring } from '@/theme';

export interface Bar {
  label: string;
  value: number;
  /** Marks the current period so it can be highlighted. */
  current?: boolean;
}

export interface BarChartProps {
  data: Bar[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
  onSelect?: (index: number) => void;
}

/**
 * Weekly volume bars.
 *
 * Bars grow from the baseline on mount with a staggered spring, which reads as
 * the data arriving rather than the screen simply appearing. Only the selected
 * or current bar carries the accent — everything else stays neutral so the eye
 * lands on the one that matters.
 */
export function BarChart({
  data,
  height = 150,
  color = palette.accent,
  formatValue = (v) => String(Math.round(v)),
  onSelect,
}: BarChartProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text variant="caption" color="tertiary">
          No sessions logged yet
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {data.map((bar, index) => (
          <BarColumn
            key={`${bar.label}-${index}`}
            bar={bar}
            index={index}
            ratio={bar.value / max}
            plotHeight={height}
            color={color}
            selected={selected === index}
            onPress={() => {
              setSelected((prev) => (prev === index ? null : index));
              onSelect?.(index);
            }}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Text variant="caption" color="tertiary">
          {data[0]?.label}
        </Text>
        {selected !== null && data[selected] ? (
          <Text variant="label" color="accent">
            {data[selected]!.label} · {formatValue(data[selected]!.value)}
          </Text>
        ) : null}
        <Text variant="caption" color="tertiary">
          {data[data.length - 1]?.label}
        </Text>
      </View>
    </View>
  );
}

function BarColumn({
  bar,
  index,
  ratio,
  plotHeight,
  color,
  selected,
  onPress,
}: {
  bar: Bar;
  index: number;
  ratio: number;
  plotHeight: number;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = withDelay(index * 40, withSpring(ratio, spring.gentle));
  }, [ratio, index, grow]);

  const animatedStyle = useAnimatedStyle(() => ({
    // Minimum sliver so an empty week is still a visible, tappable target.
    height: Math.max(3, grow.value * (plotHeight - 8)),
  }));

  const isAccent = selected || bar.current;

  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.9}
      dimTo={1}
      style={styles.column}
      accessibilityRole="button"
      accessibilityLabel={`${bar.label}, ${Math.round(bar.value)}`}
    >
      <Animated.View
        style={[
          styles.bar,
          animatedStyle,
          {
            backgroundColor: isAccent ? color : palette.surfaceHigh,
            borderWidth: bar.current && !selected ? 1 : 0,
            borderColor: palette.accentEdge,
          },
        ]}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  column: {
    flex: 1,
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: '100%',
    borderRadius: radius.xs,
    minHeight: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
