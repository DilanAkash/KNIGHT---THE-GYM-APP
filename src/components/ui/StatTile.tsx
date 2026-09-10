import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AnimatedNumber } from './AnimatedNumber';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { palette, radius, space } from '@/theme';

export interface StatTileProps {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  icon?: IconName;
  /** Percentage change vs the previous period. Sign drives colour and arrow. */
  delta?: number | null;
  /** For deltas where down is good (bodyweight on a cut). */
  invertDelta?: boolean;
  accent?: boolean;
  /** Abbreviates 17,290 to 17.3k so a big total still fits the tile. */
  compact?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StatTile({
  label,
  value,
  decimals = 0,
  suffix,
  icon,
  delta,
  invertDelta = false,
  accent = false,
  compact = false,
  onPress,
  style,
}: StatTileProps) {
  const showDelta = delta !== null && delta !== undefined && Number.isFinite(delta) && Math.abs(delta) >= 0.5;
  const positive = (delta ?? 0) > 0;
  const good = invertDelta ? !positive : positive;

  const content = (
    <View
      style={[
        styles.tile,
        accent ? { borderColor: palette.accentEdge, backgroundColor: palette.accentSoft } : null,
        style,
      ]}
    >
      <View style={styles.header}>
        <Text variant="overline" color="tertiary" numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        {icon ? <Icon name={icon} size={15} color={palette.textTertiary} /> : null}
      </View>

      <AnimatedNumber
        value={value}
        decimals={decimals}
        suffix={suffix}
        variant="numericLarge"
        color={accent ? palette.accent : palette.textPrimary}
        compact={compact}
        style={styles.value}
      />

      {showDelta ? (
        <View style={styles.delta}>
          <Icon
            name={positive ? 'arrowUpRight' : 'arrowRight'}
            size={13}
            color={good ? palette.accent : palette.textTertiary}
            strokeWidth={2.2}
            style={positive ? undefined : styles.deltaDown}
          />
          <Text variant="caption" style={{ color: good ? palette.accent : palette.textTertiary }}>
            {Math.abs(delta ?? 0).toFixed(0)}% vs last week
          </Text>
        </View>
      ) : (
        <View style={styles.deltaPlaceholder} />
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} dimTo={0.92} style={style}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    padding: space.md,
    gap: 2,
    minHeight: 104,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
  },
  label: {
    flexShrink: 1,
  },
  value: {
    marginTop: 2,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 16,
  },
  deltaDown: {
    transform: [{ rotate: '45deg' }],
  },
  deltaPlaceholder: {
    minHeight: 16,
  },
});
