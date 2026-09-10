import { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale, type HapticStrength } from './Pressable';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { palette, radius, space, typography } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: HapticStrength;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 38, md: 48, lg: 56 };
const PADDING: Record<ButtonSize, number> = { sm: 14, md: 20, lg: 24 };
const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

function surfaceFor(variant: ButtonVariant): ViewStyle {
  switch (variant) {
    case 'primary':
      return { backgroundColor: palette.accent };
    case 'secondary':
      return { backgroundColor: palette.surfaceHigh };
    case 'danger':
      return { backgroundColor: palette.dangerSoft, borderWidth: 1, borderColor: 'rgba(255,92,92,0.3)' };
    case 'outline':
      return { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.hairlineStrong };
    case 'ghost':
    default:
      return { backgroundColor: 'transparent' };
  }
}

function contentColor(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return palette.textOnAccent;
    case 'danger':
      return palette.danger;
    case 'ghost':
      return palette.textSecondary;
    default:
      return palette.textPrimary;
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  loading,
  fullWidth,
  haptic,
  style,
}: ButtonProps) {
  const color = contentColor(variant);
  const iconSize = ICON_SIZE[size];
  const busy = loading === true;

  return (
    <PressableScale
      onPress={busy ? undefined : onPress}
      disabled={disabled || busy}
      haptic={haptic ?? (variant === 'primary' ? 'medium' : 'light')}
      // Large primary buttons need a subtler squash or they look rubbery.
      scaleTo={size === 'lg' ? 0.975 : 0.955}
      dimTo={variant === 'ghost' ? 0.6 : 0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={[
        styles.base,
        surfaceFor(variant),
        {
          height: HEIGHTS[size],
          paddingHorizontal: PADDING[size],
          borderRadius: size === 'sm' ? radius.sm : radius.md,
        },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={iconSize} color={color} strokeWidth={2} /> : null}
          <Text
            style={[
              size === 'sm' ? typography.label : typography.subheading,
              { color, letterSpacing: variant === 'primary' ? -0.1 : -0.2 },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconRight ? <Icon name={iconRight} size={iconSize} color={color} strokeWidth={2} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

/** Square icon-only button — headers, set rows, anywhere a label won't fit. */
export function IconButton({
  name,
  onPress,
  size = 42,
  iconSize,
  color = palette.textSecondary,
  background = palette.surfaceHigh,
  disabled,
  haptic = 'light',
  accessibilityLabel,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
  disabled?: boolean;
  haptic?: HapticStrength;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius.sm,
          backgroundColor: background,
        },
        style,
      ]}
    >
      <Icon name={name} size={iconSize ?? Math.round(size * 0.48)} color={color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
