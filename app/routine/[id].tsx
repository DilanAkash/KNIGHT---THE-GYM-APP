import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { Appear } from '@/components/ui/Appear';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Field, Stepper } from '@/components/ui/Input';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import {
  addRoutineDay,
  deleteRoutine,
  deleteRoutineDay,
  getRoutineDetail,
  removeRoutineExercise,
  renameRoutine,
  renameRoutineDay,
  updateRoutineExercise,
  type DayExerciseDetail,
  type RoutineDetail,
} from '@/db/queries/routines';
import { MUSCLE_LABELS } from '@/db/exerciseLibrary';
import { formatDuration } from '@/lib/strength';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space } from '@/theme';

export default function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [dayDraft, setDayDraft] = useState<{ id: string | null; name: string } | null>(null);
  const [editingExercise, setEditingExercise] = useState<DayExerciseDetail | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setRoutine(await getRoutineDetail(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const confirmDelete = useCallback(() => {
    if (!routine) return;
    Alert.alert('Delete routine?', `"${routine.name}" and all its sessions will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRoutine(routine.id);
          haptics.warning();
          router.back();
        },
      },
    ]);
  }, [routine]);

  if (!routine) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <Header
        title={routine.name}
        eyebrow={`${routine.days.length} sessions`}
        onBack={() => router.back()}
        scrollY={scrollY}
        right={
          <>
            <IconButton
              name="edit"
              accessibilityLabel="Rename routine"
              onPress={() => {
                setNameDraft(routine.name);
                setEditingName(true);
              }}
              size={40}
              background={palette.surface}
            />
            <IconButton
              name="trash"
              accessibilityLabel="Delete routine"
              onPress={confirmDelete}
              size={40}
              background={palette.surface}
              color={palette.danger}
            />
          </>
        }
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxxl }]}
      >
        {routine.days.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No sessions yet"
            message="Add a training day — Push, Legs, Upper, whatever you call it."
            actionLabel="Add session"
            onAction={() => setDayDraft({ id: null, name: '' })}
          />
        ) : (
          routine.days.map((day, dayIndex) => (
            <Appear key={day.id} index={dayIndex} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <PressableScale
                  onPress={() => setDayDraft({ id: day.id, name: day.name })}
                  haptic="light"
                  scaleTo={0.98}
                  style={{ flex: 1 }}
                >
                  <Text variant="heading" numberOfLines={1}>
                    {day.name}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {day.exercises.length} exercises ·{' '}
                    {day.exercises.reduce((sum, ex) => sum + ex.targetSets, 0)} sets
                  </Text>
                </PressableScale>
                <IconButton
                  name="trash"
                  accessibilityLabel={`Delete ${day.name}`}
                  onPress={() => {
                    Alert.alert('Delete session?', `"${day.name}" will be removed.`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          await deleteRoutineDay(day.id);
                          haptics.warning();
                          await reload();
                        },
                      },
                    ]);
                  }}
                  size={32}
                  iconSize={15}
                  background="transparent"
                  color={palette.textTertiary}
                />
              </View>

              {day.exercises.map((exercise) => (
                <PressableScale
                  key={exercise.id}
                  onPress={() => setEditingExercise(exercise)}
                  haptic="light"
                  scaleTo={0.985}
                  style={styles.exerciseRow}
                >
                  <View style={styles.exerciseIndex}>
                    <Icon name="grip" size={14} color={palette.textTertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {exercise.exercise.name}
                    </Text>
                    <Text variant="caption" color="tertiary">
                      {MUSCLE_LABELS[exercise.exercise.primaryMuscle]} ·{' '}
                      {formatDuration(exercise.restSeconds)} rest
                    </Text>
                  </View>
                  <View style={styles.exerciseTarget}>
                    <Text variant="numeric" style={{ fontSize: 14 }}>
                      {exercise.targetSets}×{exercise.repsLow}–{exercise.repsHigh}
                    </Text>
                  </View>
                </PressableScale>
              ))}

              <PressableScale
                onPress={() => router.push(`/exercises?mode=add&dayId=${day.id}`)}
                haptic="light"
                scaleTo={0.97}
                style={styles.addExercise}
              >
                <Icon name="plus" size={15} color={palette.textSecondary} strokeWidth={2.2} />
                <Text variant="label" color="secondary">
                  Add exercise
                </Text>
              </PressableScale>
            </Appear>
          ))
        )}

        <Button
          label="Add session"
          icon="plus"
          variant="outline"
          size="lg"
          fullWidth
          onPress={() => setDayDraft({ id: null, name: '' })}
        />
      </Animated.ScrollView>

      <Sheet visible={editingName} onClose={() => setEditingName(false)} title="Rename routine">
        <View style={{ gap: space.base, paddingBottom: space.base }}>
          <Field label="Name" value={nameDraft} onChangeText={setNameDraft} autoCapitalize="words" />
          <Button
            label="Save"
            fullWidth
            size="lg"
            disabled={!nameDraft.trim()}
            onPress={async () => {
              await renameRoutine(routine.id, nameDraft);
              setEditingName(false);
              await reload();
            }}
          />
        </View>
      </Sheet>

      <Sheet
        visible={dayDraft !== null}
        onClose={() => setDayDraft(null)}
        title={dayDraft?.id ? 'Rename session' : 'New session'}
      >
        <View style={{ gap: space.base, paddingBottom: space.base }}>
          <Field
            label="Name"
            value={dayDraft?.name ?? ''}
            onChangeText={(value) =>
              setDayDraft((current) => (current ? { ...current, name: value } : current))
            }
            placeholder="e.g. Push A"
            autoCapitalize="words"
          />
          <Button
            label="Save"
            fullWidth
            size="lg"
            disabled={!dayDraft?.name.trim()}
            onPress={async () => {
              if (!dayDraft?.name.trim()) return;
              if (dayDraft.id) await renameRoutineDay(dayDraft.id, dayDraft.name);
              else await addRoutineDay(routine.id, dayDraft.name);
              haptics.success();
              setDayDraft(null);
              await reload();
            }}
          />
        </View>
      </Sheet>

      <Sheet
        visible={editingExercise !== null}
        onClose={() => setEditingExercise(null)}
        title={editingExercise?.exercise.name}
      >
        {editingExercise ? (
          <ExerciseTargetEditor
            exercise={editingExercise}
            onSave={async (patch) => {
              await updateRoutineExercise(editingExercise.id, patch);
              haptics.success();
              setEditingExercise(null);
              await reload();
            }}
            onRemove={async () => {
              await removeRoutineExercise(editingExercise.id);
              haptics.warning();
              setEditingExercise(null);
              await reload();
            }}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

function ExerciseTargetEditor({
  exercise,
  onSave,
  onRemove,
}: {
  exercise: DayExerciseDetail;
  onSave: (patch: {
    targetSets: number;
    repsLow: number;
    repsHigh: number;
    restSeconds: number;
  }) => void;
  onRemove: () => void;
}) {
  const [sets, setSets] = useState(exercise.targetSets);
  const [low, setLow] = useState(exercise.repsLow);
  const [high, setHigh] = useState(exercise.repsHigh);
  const [rest, setRest] = useState(exercise.restSeconds);

  return (
    <View style={{ gap: space.base, paddingBottom: space.base }}>
      <View style={styles.editorRow}>
        <Stepper label="Sets" value={sets} onChange={setSets} min={1} max={12} />
        <Stepper label="Rest" value={rest} onChange={setRest} step={15} min={0} max={600} suffix="s" />
      </View>
      <View style={styles.editorRow}>
        <Stepper
          label="Reps from"
          value={low}
          onChange={(value) => {
            setLow(value);
            // Keep the range coherent without making the user fix it.
            if (value > high) setHigh(value);
          }}
          min={1}
          max={50}
        />
        <Stepper
          label="Reps to"
          value={high}
          onChange={(value) => {
            setHigh(value);
            if (value < low) setLow(value);
          }}
          min={1}
          max={50}
        />
      </View>

      <Button
        label="Save"
        size="lg"
        fullWidth
        onPress={() => onSave({ targetSets: sets, repsLow: low, repsHigh: high, restSeconds: rest })}
      />
      <Button label="Remove from session" variant="danger" fullWidth onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.sm,
    gap: space.base,
  },
  dayCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    padding: space.md,
    gap: space.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingBottom: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceRaised,
  },
  exerciseIndex: {
    width: 22,
    alignItems: 'center',
  },
  exerciseTarget: {
    alignItems: 'flex-end',
  },
  addExercise: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
  },
  editorRow: {
    flexDirection: 'row',
    gap: space.md,
  },
});
