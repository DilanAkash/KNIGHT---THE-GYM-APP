import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, palette, space } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Adds bottom padding for the floating tab bar. Off for full-screen views. */
  tabBarPadding?: boolean;
  style?: StyleProp<ViewStyle>;
  edges?: { top?: boolean; bottom?: boolean };
}

export function Screen({ children, style, edges = { top: true } }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: edges.top ? insets.top : 0,
          paddingBottom: edges.bottom ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface ScrollScreenProps extends Omit<ScrollViewProps, 'style'> {
  children: ReactNode;
  tabBarPadding?: boolean;
  gutter?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  header?: ReactNode;
}

/**
 * Standard scrolling screen. Bottom padding accounts for the floating tab bar
 * plus the gesture inset so the last card is never trapped under it.
 */
export function ScrollScreen({
  children,
  tabBarPadding = true,
  gutter = true,
  style,
  contentStyle,
  header,
  ...rest
}: ScrollScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, style]}>
      {header}
      <ScrollView
        {...rest}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          {
            paddingTop: header ? space.sm : insets.top + space.sm,
            paddingHorizontal: gutter ? layout.gutter : 0,
            paddingBottom: tabBarPadding
              ? insets.bottom + layout.tabBarHeight + space.xxl
              : insets.bottom + space.xxl,
            gap: space.lg,
          },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
  scroll: {
    flex: 1,
  },
});
