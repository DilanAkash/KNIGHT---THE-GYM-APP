import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Appear } from './Appear';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { palette, radius, space } from '@/theme';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  /** One line that says what to do next, not what went wrong. */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
  style,
}: EmptyStateProps) {
  return (
    <Appear from="fade" style={[styles.empty, compact ? styles.emptyCompact : null, style]}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={compact ? 20 : 26} color={palette.textTertiary} />
      </View>
      <View style={styles.emptyText}>
        <Text variant={compact ? 'subheading' : 'heading'} align="center">
          {title}
        </Text>
        {message ? (
          <Text variant="body" color="tertiary" align="center">
            {message}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" />
      ) : null}
    </Appear>
  );
}

export type BannerTone = 'info' | 'accent' | 'warn' | 'danger';

const TONES: Record<BannerTone, { bg: string; border: string; color: string; icon: IconName }> = {
  info: { bg: palette.infoSoft, border: 'rgba(87,199,255,0.3)', color: palette.info, icon: 'info' },
  accent: { bg: palette.accentSoft, border: palette.accentEdge, color: palette.accent, icon: 'bolt' },
  warn: { bg: palette.warnSoft, border: 'rgba(255,176,32,0.3)', color: palette.warn, icon: 'alert' },
  danger: { bg: palette.dangerSoft, border: 'rgba(255,92,92,0.3)', color: palette.danger, icon: 'alert' },
};

export function Banner({
  tone = 'info',
  title,
  message,
  action,
  icon,
}: {
  tone?: BannerTone;
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  const config = TONES[tone];
  return (
    <Appear style={[styles.banner, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Icon name={icon ?? config.icon} size={18} color={config.color} />
      <View style={styles.bannerText}>
        <Text variant="subheading" style={{ color: config.color }}>
          {title}
        </Text>
        {message ? (
          <Text variant="caption" color="secondary">
            {message}
          </Text>
        ) : null}
      </View>
      {action}
    </Appear>
  );
}

/** Shimmer-free skeleton: a pulsing block. Shimmer sweeps look dated. */
export function Skeleton({
  width,
  height = 16,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: height > 24 ? radius.sm : 4,
          backgroundColor: palette.surfaceHigh,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: space.base,
    paddingVertical: space.xxxl,
    paddingHorizontal: space.lg,
  },
  emptyCompact: {
    paddingVertical: space.xl,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    gap: 6,
    maxWidth: 300,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
});
