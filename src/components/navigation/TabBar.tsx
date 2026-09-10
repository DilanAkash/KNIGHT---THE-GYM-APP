import { useEffect } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { layout, palette, radius, spring, timing } from '@/theme';

const TAB_ICONS: Record<string, IconName> = {
  index: 'bolt',
  train: 'layers',
  progress: 'activity',
  fuel: 'flame',
  body: 'user',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Today',
  train: 'Train',
  progress: 'Stats',
  fuel: 'Fuel',
  body: 'Body',
};

/**
 * Floating tab bar.
 *
 * A single lime dot slides between tabs instead of each tab lighting its own
 * indicator — one moving element reads as one object travelling, which is what
 * makes the bar feel built rather than assembled. The bar floats above content
 * with a blur so long lists stay visible behind it.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const barWidth = width - layout.gutter * 2;
  const tabWidth = barWidth / state.routes.length;
  const position = useSharedValue(state.index);

  useEffect(() => {
    position.value = withSpring(state.index, spring.snap);
  }, [state.index, position]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * tabWidth + tabWidth / 2 - 3 }],
  }));

  return (
    <View
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 10), width: barWidth, left: layout.gutter }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.tint} />

        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              name={route.name}
              focused={focused}
              onPress={onPress}
              width={tabWidth}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  name,
  focused,
  onPress,
  width,
}: {
  name: string;
  focused: boolean;
  onPress: () => void;
  width: number;
}) {
  const active = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    active.value = withTiming(focused ? 1 : 0, timing.base);
  }, [focused, active]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(active.value, [0, 1], [0, -2]) },
      { scale: interpolate(active.value, [0, 1], [1, 1.06]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(active.value, [0, 1], [0.55, 1]),
    color: interpolateColor(active.value, [0, 1], [palette.textTertiary, palette.textPrimary]),
  }));

  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.9}
      dimTo={1}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={TAB_LABELS[name] ?? name}
      style={[styles.tab, { width }]}
    >
      <Animated.View style={iconStyle}>
        <Icon
          name={TAB_ICONS[name] ?? 'home'}
          size={21}
          color={focused ? palette.accent : palette.textTertiary}
          strokeWidth={focused ? 2.1 : 1.7}
        />
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {TAB_LABELS[name] ?? name}
      </Animated.Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
  bar: {
    flexDirection: 'row',
    height: layout.tabBarHeight,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairlineStrong,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 20, 23, 0.82)',
  },
  indicator: {
    position: 'absolute',
    top: 7,
    left: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.accent,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: '100%',
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.2,
    fontFamily: 'Inter_500Medium',
  },
});
