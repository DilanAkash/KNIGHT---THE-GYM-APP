import { memo, useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Appear } from '@/components/ui/Appear';
import { IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { SetRow, SetRowHeader } from './SetRow';
import { MUSCLE_LABELS } from '@/db/exerciseLibrary';
import type { SetType } from '@/db/types';
import { useWorkout } from '@/store/workout';
import { formatDuration } from '@/lib/strength';
import { elevation, palette, radius, space, typography } from '@/theme';

const TYPE_CYCLE: SetType[] = ['normal', 'warmup', 'drop', 'failure'];

export interface ExerciseCardProps {
  workoutExerciseId: string;
  index: number;
  unit: string;
  onOpenPlates: (weight: number) => void;
  onOpenRest: (workoutExerciseId: string, seconds: number) => void;
  onOpenExercise: (exerciseId: string) => void;
}

/**
 * One exercise in the live session.
 *
 * Subscribes to its own slice of the store rather than receiving it from the
 * screen. Combined with `patchSet` preserving the identity of untouched
 * exercises, that means a keystroke in one card re-renders only that card —
 * with six exercises on screen, re-rendering all of them per character was
 * what made typing feel laggy.
 */
export const ExerciseCard = memo(function ExerciseCard({
  workoutExerciseId,
  index,
  unit,
  onOpenPlates,
  onOpenRest,
  onOpenExercise,
}: ExerciseCardProps) {
  const item = useWorkout((state) =>
    state.detail?.exercises.find((exercise) => exercise.id === workoutExerciseId),
  );
  const previousByExercise = useWorkout((state) => state.previous);
  const prSets = useWorkout((state) => state.prSets);

  const patchSet = useWorkout((state) => state.patchSet);
  const commitSet = useWorkout((state) => state.commitSet);
  const toggleComplete = useWorkout((state) => state.toggleComplete);
  const removeSet = useWorkout((state) => state.removeSet);
  const appendSet = useWorkout((state) => state.appendSet);
  const dropExercise = useWorkout((state) => state.dropExercise);
  const setExerciseNotes = useWorkout((state) => state.setExerciseNotes);

  const [showNotes, setShowNotes] = useState(Boolean(item?.notes));
  const [noteText, setNoteText] = useState(item?.notes ?? '');
  const [menuOpen, setMenuOpen] = useState(false);

  // Stable identities so SetRow's memo holds across renders.
  const handleCommit = useCallback((setId: string) => void commitSet(setId), [commitSet]);
  const handleToggle = useCallback((setId: string) => void toggleComplete(setId), [toggleComplete]);
  const handleDelete = useCallback((setId: string) => void removeSet(setId), [removeSet]);
  const handleCycleType = useCallback(
    (setId: string, current: SetType) => {
      const next = TYPE_CYCLE[(TYPE_CYCLE.indexOf(current) + 1) % TYPE_CYCLE.length]!;
      patchSet(setId, { type: next });
      void commitSet(setId);
    },
    [patchSet, commitSet],
  );

  if (!item) return null;

  const done = item.sets.filter((set) => set.completed).length;
  const target = item.targetSets ?? item.sets.length;
  const range = item.repsLow && item.repsHigh ? `${item.repsLow}–${item.repsHigh}` : null;
  const previous = previousByExercise.get(item.exerciseId) ?? [];

  return (
    <Appear index={index} style={styles.card}>
      <View style={styles.header}>
        <PressableScale
          onPress={() => onOpenExercise(item.exerciseId)}
          haptic="light"
          scaleTo={0.98}
          dimTo={0.8}
          style={styles.titleBlock}
        >
          <Text variant="heading" numberOfLines={2}>
            {item.exercise.name}
          </Text>
          <View style={styles.meta}>
            <Text variant="caption" color="tertiary">
              {MUSCLE_LABELS[item.exercise.primaryMuscle]}
            </Text>
            {range ? (
              <>
                <View style={styles.dot} />
                <Text variant="caption" color="tertiary">
                  {target} × {range}
                </Text>
              </>
            ) : null}
            <View style={styles.dot} />
            <PressableScale
              onPress={() => onOpenRest(item.id, item.restSeconds)}
              haptic="light"
              hitSlop={8}
            >
              <View style={styles.restChip}>
                <Icon name="clock" size={11} color={palette.textTertiary} />
                <Text variant="caption" color="tertiary">
                  {formatDuration(item.restSeconds)}
                </Text>
              </View>
            </PressableScale>
          </View>
        </PressableScale>

        <View style={styles.headerActions}>
          <View style={styles.progressPill}>
            <Text
              variant="numeric"
              style={styles.progressText}
              color={done === target ? 'accent' : 'secondary'}
            >
              {done}
            </Text>
            <Text variant="caption" color="tertiary">
              /{target}
            </Text>
          </View>
          <IconButton
            name="more"
            accessibilityLabel={`Options for ${item.exercise.name}`}
            onPress={() => setMenuOpen((open) => !open)}
            size={34}
            iconSize={16}
            background="transparent"
          />
        </View>
      </View>

      {menuOpen ? (
        <Appear delay={0} distance={6} style={styles.menu}>
          <MenuItem
            icon="note"
            label={showNotes ? 'Hide note' : 'Add note'}
            onPress={() => {
              setShowNotes((value) => !value);
              setMenuOpen(false);
            }}
          />
          <MenuItem
            icon="clock"
            label="Rest time"
            onPress={() => {
              onOpenRest(item.id, item.restSeconds);
              setMenuOpen(false);
            }}
          />
          <MenuItem
            icon="activity"
            label="History"
            onPress={() => {
              onOpenExercise(item.exerciseId);
              setMenuOpen(false);
            }}
          />
          <MenuItem
            icon="trash"
            label="Remove"
            danger
            onPress={() => {
              void dropExercise(item.id);
              setMenuOpen(false);
            }}
          />
        </Appear>
      ) : null}

      {item.exercise.cue && !showNotes ? (
        <View style={styles.cue}>
          <Icon name="info" size={13} color={palette.textTertiary} />
          <Text variant="caption" color="tertiary" style={{ flex: 1 }}>
            {item.exercise.cue}
          </Text>
        </View>
      ) : null}

      {showNotes ? (
        <TextInput
          value={noteText}
          onChangeText={setNoteText}
          onBlur={() => void setExerciseNotes(item.id, noteText)}
          placeholder="Note for this exercise…"
          placeholderTextColor={palette.textTertiary}
          selectionColor={palette.accent}
          cursorColor={palette.accent}
          multiline
          style={styles.noteInput}
        />
      ) : null}

      <SetRowHeader unit={unit} />

      <View>
        {item.sets.map((set, setIndex) => (
          <SetRow
            key={set.id}
            set={set}
            index={setIndex}
            previous={previous[setIndex]}
            isPr={prSets.has(set.id)}
            unit={unit}
            onChange={patchSet}
            onCommit={handleCommit}
            onToggle={handleToggle}
            onCycleType={handleCycleType}
            onDelete={handleDelete}
            onOpenPlates={onOpenPlates}
          />
        ))}
      </View>

      <PressableScale
        onPress={() => void appendSet(item.id)}
        haptic="light"
        scaleTo={0.97}
        style={styles.addSet}
      >
        <Icon name="plus" size={15} color={palette.textSecondary} strokeWidth={2.2} />
        <Text variant="label" color="secondary">
          Add set
        </Text>
      </PressableScale>
    </Appear>
  );
});

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: 'note' | 'clock' | 'activity' | 'trash';
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} haptic="light" scaleTo={0.96} style={styles.menuItem}>
      <Icon name={icon} size={15} color={danger ? palette.danger : palette.textSecondary} />
      <Text variant="label" color={danger ? 'danger' : 'secondary'}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingVertical: space.md,
    gap: space.sm,
    ...elevation.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: space.base,
    gap: space.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.textTertiary,
  },
  restChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.xs,
    backgroundColor: palette.surfaceHigh,
  },
  progressText: {
    fontSize: 14,
  },
  menu: {
    marginHorizontal: space.base,
    backgroundColor: palette.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  cue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginHorizontal: space.base,
    paddingVertical: 2,
  },
  noteInput: {
    marginHorizontal: space.base,
    minHeight: 40,
    maxHeight: 120,
    padding: space.sm,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
    ...typography.body,
    color: palette.textPrimary,
    textAlignVertical: 'top',
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: space.base,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
  },
});
