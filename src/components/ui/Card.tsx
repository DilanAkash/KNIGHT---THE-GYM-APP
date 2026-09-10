import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Appear } from './Appear';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { elevation, palette, radius, space } from '@/theme';

export interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  /** Raised cards sit on top of other cards — nested lists, sheets. */
  raised?: boolean;
  /** Lime hairline + tint. Reserve for the one live/important card on screen. */
  highlighted?: boolean;
  /** Index in a list; drives the entrance stagger. */
  index?: number;
  animate?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
  raised = false,
  highlighted = false,
  index = 0,
  animate = true,
}: CardProps) {
  const body = (
    <View
      style={[
        styles.card,
        { backgroundColor: raised ? palette.surfaceRaised : palette.surface },
        highlighted ? styles.highlighted : null,
        padded ? styles.padded : null,
        style,
      ]}
    >
      {highlighted ? (
        <LinearGradient
          colors={[palette.accentSoft, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );

  const content = onPress ? (
    <PressableScale onPress={onPress} scaleTo={0.985} dimTo={0.94} style={styles.pressWrap}>
      {body}
    </PressableScale>
  ) : (
    body
  );

  if (!animate) return content;

  return <Appear index={index}>{content}</Appear>;
}

/** Section wrapper: an overline label, optional action, then the content. */
export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? <SectionTitle>{title}</SectionTitle> : <View />}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text variant="overline" color="tertiary">
      {children}
    </Text>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    overflow: 'hidden',
    ...elevation.card,
  },
  padded: {
    padding: space.base,
  },
  highlighted: {
    borderColor: palette.accentEdge,
  },
  pressWrap: {
    borderRadius: radius.lg,
  },
  section: {
    gap: space.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
  },
});
