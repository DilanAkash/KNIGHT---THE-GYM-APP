import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { palette, typography, type TypeToken } from '@/theme';

type ColorToken =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'onAccent'
  | 'danger'
  | 'warn'
  | 'info';

const COLORS: Record<ColorToken, string> = {
  primary: palette.textPrimary,
  secondary: palette.textSecondary,
  tertiary: palette.textTertiary,
  accent: palette.accent,
  onAccent: palette.textOnAccent,
  danger: palette.danger,
  warn: palette.warn,
  info: palette.info,
};

export interface TextProps extends RNTextProps {
  variant?: TypeToken;
  color?: ColorToken | string;
  align?: TextStyle['textAlign'];
  /** Nudge opacity without inventing another colour token. */
  dim?: number;
}

/**
 * Every string in the app goes through here. Raw <Text> with inline styles is
 * how a type scale quietly falls apart.
 */
export const Text = memo(function Text({
  variant = 'body',
  color = 'primary',
  align,
  dim,
  style,
  ...rest
}: TextProps) {
  const resolved = color in COLORS ? COLORS[color as ColorToken] : color;
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: resolved },
        align ? { textAlign: align } : null,
        dim !== undefined ? { opacity: dim } : null,
        style,
      ]}
    />
  );
});
