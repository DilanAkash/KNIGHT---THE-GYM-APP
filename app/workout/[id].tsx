import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { Appear } from '@/components/ui/Appear';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { ExerciseCard } from '@/features/workout/ExerciseCard';
import { PlateSheet } from '@/features/workout/PlateSheet';
import { useWorkout } from '@/store/workout';
import { useSettings } from '@/store/settings';
import { useRestTimer } from '@/store/restTimer';
import { formatCompact, formatDuration } from '@/lib/strength';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space } from '@/theme';

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { detail, loading, previous, prSets, load } = useWorkout();
  const store = useWorkout();
  const { unit, keepAwake, defaultRestSeconds } = useSettings();
  const restTimer = useRestTimer();

  const [elapsed, setElapsed] = useState(0);
  const [plateFor, setPlateFor] = useState<number | null>(null);
  const [restEditing, setRestEditing] = useState<{ id: string; seconds: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const loadedFor = useRef<string | null>(null);

  useKeepAwakeWhen(keepAwake);

  useEffect(() => {
    if (!id || loadedFor.current === id) return;
    loadedFor.current = id;
    void load(id);
  }, [id, load]);

  // Recomputed from startedAt rather than incremented, so the clock stays
  // correct after the app has been backgrounded.
  useEffect(() => {
    if (!detail) return;
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - detail.startedAt) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [detail]);

  const stats = store.stats();

  const confirmDiscard = useCallback(() => {
    Alert.alert('Discard session?', 'Everything logged in this session will be deleted.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await store.discard();
          router.replace('/(tabs)');
        },
      },
    ]);
  }, [store]);

  const onFinish = useCallback(async () => {
    if (finishing) return;

    if (stats.completedSets === 0) {
      Alert.alert('Nothing logged', 'Complete at least one set, or discard the session.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: confirmDiscard },
      ]);
      return;
    }

    const incomplete = stats.totalSets - stats.completedSets;
    const finalise = async () => {
      setFinishing(true);
      try {
        const result = await store.finish();
        if (result) router.replace(`/workout/summary/${result.workoutId}`);
      } finally {
        setFinishing(false);
      }
    };

    if (incomplete > 0) {
      Alert.alert(
        'Finish session?',
        `${incomplete} set${incomplete === 1 ? '' : 's'} left unlogged. ${
          incomplete === 1 ? 'It' : 'They'
        } won't be saved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Finish', onPress: () => void finalise() },
        ],
      );
      return;
    }
    await finalise();
  }, [confirmDiscard, finishing, stats.completedSets, stats.totalSets, store]);

  if (loading || !detail) {
    return (
      <View style={styles.root}>
        <View style={{ paddingTop: insets.top + 60 }}>
          <EmptyState
            icon="clock"
            title={loading ? 'Loading session' : 'Session not found'}
            message={loading ? undefined : 'It may have been finished or discarded already.'}
            actionLabel={loading ? undefined : 'Back to Today'}
            onAction={loading ? undefined : () => router.replace('/(tabs)')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headerTop}>
          <IconButton
            name="chevronDown"
            accessibilityLabel="Minimise session"
            onPress={() => router.replace('/(tabs)')}
            size={38}
            background="transparent"
            color={palette.textPrimary}
          />
          <View style={styles.headerTitle}>
            <Text variant="subheading" numberOfLines={1} align="center">
              {detail.name}
            </Text>
          </View>
          <PressableScale onPress={confirmDiscard} haptic="light" hitSlop={10} style={styles.discard}>
            <Text variant="label" color="danger">
              Discard
            </Text>
          </PressableScale>
        </View>

        <View style={styles.liveStats}>
          <LiveStat icon="clock" value={formatDuration(elapsed)} label="elapsed" mono />
          <View style={styles.statDivider} />
          <LiveStat
            icon="barChart"
            value={`${formatCompact(stats.volume)} ${unit}`}
            label="volume"
            mono
          />
          <View style={styles.statDivider} />
          <LiveStat
            icon="check"
            value={`${stats.completedSets}/${stats.totalSets}`}
            label="sets"
            mono
            accent={stats.completedSets === stats.totalSets && stats.totalSets > 0}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 150 + (restTimer.endsAt ? 70 : 0) },
          ]}
        >
          {detail.exercises.length === 0 ? (
            <EmptyState
              icon="dumbbell"
              title="Empty session"
              message="Add your first exercise and start logging."
              actionLabel="Add exercise"
              onAction={() => router.push(`/exercises?mode=add&workoutId=${detail.id}`)}
            />
          ) : (
            detail.exercises.map((item, index) => (
              <ExerciseCard
                key={item.id}
                item={item}
                index={index}
                previous={previous.get(item.exerciseId) ?? []}
                prSets={prSets}
                unit={unit}
                onPatchSet={(setId, patch) => store.patchSet(setId, patch)}
                onCommitSet={(setId) => void store.commitSet(setId)}
                onToggleSet={(setId) => void store.toggleComplete(setId)}
                onDeleteSet={(setId) => void store.removeSet(setId)}
                onAddSet={() => void store.appendSet(item.id)}
                onRemove={() => void store.dropExercise(item.id)}
                onNotes={(notes) => void store.setExerciseNotes(item.id, notes)}
                onRest={() =>
                  setRestEditing({ id: item.id, seconds: item.restSeconds || defaultRestSeconds })
                }
                onOpenPlates={(weight) => setPlateFor(weight)}
                onOpenExercise={() => router.push(`/exercise/${item.exerciseId}`)}
              />
            ))
          )}

          {detail.exercises.length > 0 ? (
            <Appear from="fade" delay={200}>
              <PressableScale
                onPress={() => router.push(`/exercises?mode=add&workoutId=${detail.id}`)}
                haptic="medium"
                scaleTo={0.98}
                style={styles.addExercise}
              >
                <Icon name="plus" size={17} color={palette.accent} strokeWidth={2.2} />
                <Text variant="subheading" color="accent">
                  Add exercise
                </Text>
              </PressableScale>
            </Appear>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Appear style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button
          label={finishing ? 'Saving…' : 'Finish session'}
          icon="check"
          size="lg"
          fullWidth
          loading={finishing}
          onPress={() => {
            haptics.heavy();
            void onFinish();
          }}
        />
      </Appear>

      <PlateSheet
        visible={plateFor !== null}
        onClose={() => setPlateFor(null)}
        initialWeight={plateFor ?? 0}
      />

      <Sheet
        visible={restEditing !== null}
        onClose={() => setRestEditing(null)}
        title="Rest between sets"
      >
        <View style={{ gap: space.base, paddingBottom: space.base }}>
          <Stepper
            value={restEditing?.seconds ?? defaultRestSeconds}
            onChange={(value) =>
              setRestEditing((current) => (current ? { ...current, seconds: value } : current))
            }
            step={15}
            min={0}
            max={600}
            suffix="seconds"
          />
          <View style={styles.restPresets}>
            {[60, 90, 120, 180, 240].map((seconds) => (
              <PressableScale
                key={seconds}
                haptic="selection"
                scaleTo={0.92}
                onPress={() =>
                  setRestEditing((current) => (current ? { ...current, seconds } : current))
                }
                style={[
                  styles.restPreset,
                  restEditing?.seconds === seconds ? styles.restPresetActive : null,
                ]}
              >
                <Text
                  variant="label"
                  color={restEditing?.seconds === seconds ? 'onAccent' : 'secondary'}
                >
                  {formatDuration(seconds)}
                </Text>
              </PressableScale>
            ))}
          </View>
          <Button
            label="Save"
            fullWidth
            onPress={() => {
              if (restEditing) void store.setExerciseRest(restEditing.id, restEditing.seconds);
              setRestEditing(null);
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

/** Hook wrapper so keep-awake can be toggled from settings. */
function useKeepAwakeWhen(enabled: boolean) {
  useKeepAwake(enabled ? 'knight-session' : undefined);
}

function LiveStat({
  icon,
  value,
  label,
  mono,
  accent,
}: {
  icon: 'clock' | 'barChart' | 'check';
  value: string;
  label: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.liveStat}>
      <View style={styles.liveStatTop}>
        <Icon name={icon} size={12} color={palette.textTertiary} />
        <Text
          variant={mono ? 'numeric' : 'subheading'}
          style={{ fontSize: 15 }}
          color={accent ? 'accent' : 'primary'}
        >
          {value}
        </Text>
      </View>
      <Text variant="caption" color="tertiary" style={{ fontSize: 10 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: palette.void,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
    paddingBottom: space.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  headerTitle: {
    flex: 1,
    paddingHorizontal: space.sm,
  },
  discard: {
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  liveStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    paddingTop: space.xs,
  },
  liveStat: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  liveStatTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 26,
    backgroundColor: palette.hairline,
  },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.base,
    gap: space.base,
  },
  addExercise: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.accentEdge,
    backgroundColor: palette.accentSoft,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.gutter,
    paddingTop: space.md,
    backgroundColor: palette.void,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  restPresets: {
    flexDirection: 'row',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  restPreset: {
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restPresetActive: {
    backgroundColor: palette.accent,
  },
});
