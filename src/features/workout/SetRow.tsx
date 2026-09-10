import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import type { SetType, WorkoutSet } from '@/db/types';
import type { PreviousSet } from '@/db/queries/exercises';
import { palette, radius, space, spring, timing, typography } from '@/theme';

const TYPE_LABEL: Record<SetType, string> = {
  normal: '',
  warmup: 'W',
  drop: 'D',
  failure: 'F',
};

const TYPE_COLOR: Record<SetType, string> = {
  normal: palette.textTertiary,
  warmup: palette.info,
  drop: palette.warn,
  failure: palette.danger,
};

export interface SetRowProps {
  set: WorkoutSet;
  index: number;
  previous: PreviousSet | undefined;
  isPr: boolean;
  unit: string;
  onChange: (patch: Partial<Pick<WorkoutSet, 'weight' | 'reps'>>) => void;
  onCommit: () => void;
  onToggle: () => void;
  onCycleType: () => void;
  onDelete: () => void;
  onOpenPlates: (weight: number) => void;
}

/**
 * One logged set.
 *
 * Two rules drive the whole design:
 *  1. Typing never waits on the database. The inputs hold local text while
 *     focused and only commit on blur, so a slow write can't eat a keystroke.
 *  2. The previous session's numbers sit inline, tappable to copy. Beating
 *     last time is the entire point of writing any of this down.
 */
export const SetRow = memo(function SetRow({
  set,
  index,
  previous,
  isPr,
  unit,
  onChange,
  onCommit,
  onToggle,
  onCycleType,
  onDelete,
  onOpenPlates,
}: SetRowProps) {
  const [weightText, setWeightText] = useState(set.weight > 0 ? String(set.weight) : '');
  const [repsText, setRepsText] = useState(set.reps > 0 ? String(set.reps) : '');
  const editing = useRef(false);

  const completed = useSharedValue(set.completed ? 1 : 0);
  const offsetX = useSharedValue(0);

  useEffect(() => {
    completed.value = withTiming(set.completed ? 1 : 0, timing.base);
  }, [set.completed, completed]);

  // Re-sync when the row's data changes underneath us (undo, reorder, reload),
  // but never while the user has a field open.
  useEffect(() => {
    if (editing.current) return;
    setWeightText(set.weight > 0 ? String(set.weight) : '');
    setRepsText(set.reps > 0 ? String(set.reps) : '');
  }, [set.weight, set.reps]);

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      completed.value,
      [0, 1],
      ['transparent', 'rgba(199, 255, 60, 0.07)'],
    ),
    transform: [{ translateX: offsetX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -offsetX.value / 60)),
  }));

  const swipe = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      'worklet';
      // Left-only, and resisted past the delete threshold.
      offsetX.value = event.translationX < 0 ? Math.max(event.translationX, -110) : 0;
    })
    .onEnd(() => {
      'worklet';
      if (offsetX.value < -78) {
        offsetX.value = withTiming(-400, { duration: 180 }, (finished) => {
          if (finished) runOnJS(onDelete)();
        });
      } else {
        offsetX.value = withSpring(0, spring.snap);
      }
    });

  const applyPrevious = () => {
    if (!previous) return;
    setWeightText(String(previous.weight));
    setRepsText(String(previous.reps));
    onChange({ weight: previous.weight, reps: previous.reps });
    onCommit();
  };

  const parseWeight = (text: string) => {
    const parsed = parseFloat(text.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseReps = (text: string) => {
    const parsed = parseInt(text, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // Every keystroke updates the store (cheap, in memory) but only blur writes
  // to SQLite. Deferring both would mean tapping the tick straight after typing
  // could log the previous value if blur has not landed yet.
  const changeWeight = (text: string) => {
    setWeightText(text);
    onChange({ weight: parseWeight(text) });
  };

  const changeReps = (text: string) => {
    setRepsText(text);
    onChange({ reps: parseReps(text) });
  };

  const commit = () => {
    editing.current = false;
    onCommit();
  };

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.deleteHint, deleteStyle]} pointerEvents="none">
        <Icon name="trash" size={17} color={palette.danger} />
      </Animated.View>

      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.row, rowStyle]}>
          <PressableScale
            onPress={onCycleType}
            haptic="selection"
            scaleTo={0.85}
            style={styles.indexCell}
            accessibilityLabel={`Set ${index + 1}, change type`}
            accessibilityRole="button"
          >
            <Text
              variant="numeric"
              style={{
                fontSize: 14,
                color: set.type === 'normal' ? palette.textSecondary : TYPE_COLOR[set.type],
              }}
            >
              {set.type === 'normal' ? index + 1 : TYPE_LABEL[set.type]}
            </Text>
          </PressableScale>

          <PressableScale
            onPress={applyPrevious}
            disabled={!previous}
            haptic="light"
            scaleTo={0.94}
            dimTo={0.7}
            style={styles.previousCell}
            accessibilityLabel={
              previous ? `Copy previous set, ${previous.weight} by ${previous.reps}` : 'No previous set'
            }
          >
            <Text variant="caption" color={previous ? 'secondary' : 'tertiary'} numberOfLines={1}>
              {previous ? `${trim(previous.weight)}×${previous.reps}` : '—'}
            </Text>
          </PressableScale>

          <View style={styles.inputCell}>
            <TextInput
              value={weightText}
              onChangeText={changeWeight}
              onFocus={() => {
                editing.current = true;
              }}
              onBlur={commit}
              keyboardType="decimal-pad"
              placeholder={previous ? trim(previous.weight) : '0'}
              placeholderTextColor={palette.textTertiary}
              selectionColor={palette.accent}
              cursorColor={palette.accent}
              selectTextOnFocus
              style={[styles.input, set.completed ? styles.inputDone : null]}
              accessibilityLabel={`Weight in ${unit}`}
            />
          </View>

          <View style={styles.inputCell}>
            <TextInput
              value={repsText}
              onChangeText={changeReps}
              onFocus={() => {
                editing.current = true;
              }}
              onBlur={commit}
              keyboardType="number-pad"
              placeholder={previous ? String(previous.reps) : '0'}
              placeholderTextColor={palette.textTertiary}
              selectionColor={palette.accent}
              cursorColor={palette.accent}
              selectTextOnFocus
              style={[styles.input, set.completed ? styles.inputDone : null]}
              accessibilityLabel="Reps"
            />
          </View>

          <PressableScale
            onPress={() => onOpenPlates(set.weight)}
            haptic="light"
            scaleTo={0.85}
            style={styles.plateCell}
            accessibilityLabel="Plate calculator"
            accessibilityRole="button"
          >
            <Icon name="plate" size={16} color={palette.textTertiary} />
          </PressableScale>

          <CompleteButton completed={set.completed} onPress={onToggle} index={index} />

          {isPr ? <PrBadge /> : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

/** Pops in when a set beats a record. Scale only — it sits in an absolutely
 *  positioned corner and must not disturb the row. */
function PrBadge() {
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, spring.bouncy);
  }, [pop]);

  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.4 + pop.value * 0.6 }],
  }));

  return (
    <Animated.View style={[styles.prBadge, style]}>
      <Text variant="caption" color="onAccent" style={styles.prText}>
        PR
      </Text>
    </Animated.View>
  );
}

function CompleteButton({
  completed,
  onPress,
  index,
}: {
  completed: boolean;
  onPress: () => void;
  index: number;
}) {
  const value = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    value.value = completed ? withSpring(1, spring.bouncy) : withTiming(0, timing.fast);
  }, [completed, value]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(value.value, [0, 1], [palette.surfaceHigh, palette.accent]),
    borderColor: interpolateColor(value.value, [0, 1], [palette.hairlineStrong, palette.accent]),
    transform: [{ scale: 0.9 + value.value * 0.1 }],
  }));

  const tickStyle = useAnimatedStyle(() => ({
    opacity: value.value,
    transform: [{ scale: 0.5 + value.value * 0.5 }],
  }));

  return (
    <PressableScale
      onPress={onPress}
      haptic="none"
      scaleTo={0.82}
      dimTo={1}
      style={styles.checkCell}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessibilityLabel={`Complete set ${index + 1}`}
    >
      <Animated.View style={[styles.check, boxStyle]}>
        <Animated.View style={tickStyle}>
          <Icon name="check" size={15} color={palette.textOnAccent} strokeWidth={2.6} />
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
}

/** Column headings. Kept in this file so the widths can never drift apart
 *  from the cells they label. */
export function SetRowHeader({ unit }: { unit: string }) {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <View style={[styles.indexCell, styles.headerCell]}>
        <Text variant="overline" color="tertiary" style={styles.headerText}>
          Set
        </Text>
      </View>
      <View style={[styles.previousCell, styles.headerCell]}>
        <Text variant="overline" color="tertiary" style={styles.headerText}>
          Prev
        </Text>
      </View>
      <View style={[styles.inputCell, styles.headerCell]}>
        <Text variant="overline" color="tertiary" style={styles.headerText}>
          {unit}
        </Text>
      </View>
      <View style={[styles.inputCell, styles.headerCell]}>
        <Text variant="overline" color="tertiary" style={styles.headerText}>
          Reps
        </Text>
      </View>
      <View style={[styles.plateCell, styles.headerCell]} />
      <View style={[styles.checkCell, styles.headerCell]} />
    </View>
  );
}

const trim = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  deleteHint: {
    position: 'absolute',
    right: space.base,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: 3,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
  },
  headerRow: {
    paddingVertical: 0,
    paddingBottom: 2,
  },
  // Headers only need to label the column, not reserve a row's worth of height.
  headerCell: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 10,
  },
  indexCell: {
    width: 30,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousCell: {
    width: 62,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCell: {
    flex: 1,
    height: 38,
  },
  input: {
    flex: 1,
    textAlign: 'center',
    ...typography.numeric,
    color: palette.textPrimary,
    backgroundColor: palette.surfaceHigh,
    borderRadius: radius.xs,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  inputDone: {
    backgroundColor: 'transparent',
    color: palette.textSecondary,
  },
  plateCell: {
    width: 30,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCell: {
    width: 40,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prBadge: {
    position: 'absolute',
    left: 22,
    top: 0,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: palette.accent,
  },
  prText: {
    fontSize: 9,
    fontFamily: typography.overline.fontFamily,
    letterSpacing: 0.4,
  },
});
