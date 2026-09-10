import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor } from 'react-native-reanimated';
import { IconButton } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { haptics } from '@/lib/haptics';
import { palette, radius, space, timing, typography } from '@/theme';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: IconName;
  suffix?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
}

/** Text field. The border animates to the accent on focus — the only signal
 *  a dark UI has that a field is live. */
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, hint, error, icon, suffix, style, inputStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const focus = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [error ? 'rgba(255,92,92,0.45)' : palette.hairline, palette.accentEdge],
    ),
    backgroundColor: interpolateColor(focus.value, [0, 1], [palette.surface, palette.surfaceHigh]),
  }));

  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text variant="overline" color="tertiary">
          {label}
        </Text>
      ) : null}
      <Animated.View style={[styles.field, borderStyle, inputStyle]}>
        {icon ? <Icon name={icon} size={17} color={palette.textTertiary} /> : null}
        <TextInput
          ref={ref}
          {...rest}
          placeholderTextColor={palette.textTertiary}
          selectionColor={palette.accent}
          cursorColor={palette.accent}
          onFocus={(event) => {
            focus.value = withTiming(1, timing.fast);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            focus.value = withTiming(0, timing.fast);
            onBlur?.(event);
          }}
          style={styles.input}
        />
        {suffix ? (
          <Text variant="label" color="tertiary">
            {suffix}
          </Text>
        ) : null}
      </Animated.View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  label?: string;
  suffix?: string;
}

/**
 * Plus/minus stepper for values you nudge rather than type — target sets,
 * rest seconds, servings. Faster than a keyboard for small adjustments and it
 * never covers half the screen.
 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  decimals = 0,
  label,
  suffix,
}: StepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 100) / 100));

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="overline" color="tertiary">
          {label}
        </Text>
      ) : null}
      <View style={styles.stepper}>
        <IconButton
          name="minus"
          accessibilityLabel={`Decrease ${label ?? 'value'}`}
          onPress={() => onChange(clamp(value - step))}
          size={38}
          background="transparent"
          disabled={value <= min}
        />
        <View style={styles.stepperValue}>
          <Text variant="numeric">{value.toFixed(decimals)}</Text>
          {suffix ? (
            <Text variant="caption" color="tertiary">
              {suffix}
            </Text>
          ) : null}
        </View>
        <IconButton
          name="plus"
          accessibilityLabel={`Increase ${label ?? 'value'}`}
          onPress={() => onChange(clamp(value + step))}
          size={38}
          background="transparent"
          disabled={value >= max}
        />
      </View>
    </View>
  );
}

export interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search', autoFocus }: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.search, focused ? { borderColor: palette.accentEdge } : null]}>
      <Icon name="search" size={18} color={focused ? palette.accent : palette.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textTertiary}
        selectionColor={palette.accent}
        cursorColor={palette.accent}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
      />
      {value.length > 0 ? (
        <IconButton
          name="close"
          accessibilityLabel="Clear search"
          onPress={() => {
            haptics.light();
            onChangeText('');
          }}
          size={28}
          iconSize={14}
          background="transparent"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 50,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: palette.textPrimary,
    paddingVertical: space.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingHorizontal: 4,
    height: 50,
  },
  stepperValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
});
