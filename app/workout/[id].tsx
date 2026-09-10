import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
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
import { useKeyboardHeight } from '@/lib/useKeyboard';
import { formatCompact, formatDuration } from '@/lib/strength';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space } from '@/theme';

const FOOTER_HEIGHT = 56 + 12 + 12;

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  // Narrow selectors: subscribing to the whole store re-rendered this screen —
  // and every exercise card under it — on each keystroke.
  const loading = useWorkout((state) => state.loading);
  const workoutId = useWorkout((state) => state.detail?.id ?? null);
  const workoutName = useWorkout((state) => state.detail?.name ?? '');
  const startedAt = useWorkout((state) => state.detail?.startedAt ?? 0);
  // A joined string of ids only changes when exercises are added or removed,
  // never when a value inside one of them is edited.
  const exerciseKey = useWorkout(
    (state) => state.detail?.exercises.map((exercise) => exercise.id).join('|') ?? '',
  );

  const load = useWorkout((state) => state.load);
  const discard = useWorkout((state) => state.discard);
  const finish = useWorkout((state) => state.finish);
  const setExerciseRest = useWorkout((state) => state.setExerciseRest);

  const { unit, keepAwake, defaultRestSeconds } = useSettings();
  const restTimerActive = useRestTimer((state) => state.endsAt !== null);

  const [plateFor, setPlateFor] = useState<number | null>(null);
  const [restEditing, setRestEditing] = useState<{ id: string; seconds: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const exerciseIds = useMemo(() => (exerciseKey ? exerciseKey.split('|') : []), [exerciseKey]);

  useKeepAwakeWhen(keepAwake);

  useEffect(() => {
    if (!id || loadedFor.current === id) return;
    loadedFor.current = id;
    void load(id);
  }, [id, load]);

  const openPlates = useCallback((weight: number) => setPlateFor(weight), []);
  const openRest = useCallback(
    (workoutExerciseId: string, seconds: number) =>
      setRestEditing({ id: workoutExerciseId, seconds: seconds || defaultRestSeconds }),
    [defaultRestSeconds],
  );
  const openExercise = useCallback((exerciseId: string) => {
    router.push(`/exercise/${exerciseId}`);
  }, []);

  const confirmDiscard = useCallback(() => {
    Alert.alert('Discard session?', 'Everything logged in this session will be deleted.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await discard();
          router.replace('/(tabs)');
        },
      },
    ]);
  }, [discard]);

  const onFinish = useCallback(async () => {
    if (finishing) return;
    Keyboard.dismiss();

    const { completedSets, totalSets } = useWorkout.getState().stats();

    if (completedSets === 0) {
      Alert.alert('Nothing logged', 'Complete at least one set, or discard the session.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: confirmDiscard },
      ]);
      return;
    }

    const finalise = async () => {
      setFinishing(true);
      try {
        const result = await finish();
        if (result) router.replace(`/workout/summary/${result.workoutId}`);
      } finally {
        setFinishing(false);
      }
    };

    const incomplete = totalSets - completedSets;
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
  }, [confirmDiscard, finishing, finish]);

  if (loading || !workoutId) {
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

  const keyboardOpen = keyboardHeight > 0;

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
              {workoutName}
            </Text>
          </View>
          <PressableScale onPress={confirmDiscard} haptic="light" hitSlop={10} style={styles.discard}>
            <Text variant="label" color="danger">
              Discard
            </Text>
          </PressableScale>
        </View>

        <View style={styles.liveStats}>
          <SessionClock startedAt={startedAt} />
          <View style={styles.statDivider} />
          <LiveStats unit={unit} />
        </View>
      </View>

      <ScrollView
        // Shrinking the scroll viewport by the keyboard height is what makes
        // Android scroll the focused input into view. Under edge-to-edge the
        // window no longer resizes on its own, so nothing else does this.
        style={[styles.flex, { marginBottom: keyboardHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              (keyboardOpen ? space.xxl : insets.bottom + FOOTER_HEIGHT + space.xl) +
              (restTimerActive && !keyboardOpen ? 76 : 0),
          },
        ]}
      >
        {exerciseIds.length === 0 ? (
          <EmptyState
            icon="dumbbell"
            title="Empty session"
            message="Add your first exercise and start logging."
            actionLabel="Add exercise"
            onAction={() => router.push(`/exercises?mode=add&workoutId=${workoutId}`)}
          />
        ) : (
          exerciseIds.map((workoutExerciseId, index) => (
            <ExerciseCard
              key={workoutExerciseId}
              workoutExerciseId={workoutExerciseId}
              index={index}
              unit={unit}
              onOpenPlates={openPlates}
              onOpenRest={openRest}
              onOpenExercise={openExercise}
            />
          ))
        )}

        {exerciseIds.length > 0 ? (
          <Appear from="fade" delay={200}>
            <PressableScale
              onPress={() => router.push(`/exercises?mode=add&workoutId=${workoutId}`)}
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

      {/* Hidden while typing: it would sit behind the keyboard, and the list
          needs every pixel it can get. */}
      {!keyboardOpen ? (
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
      ) : null}

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
              if (restEditing) void setExerciseRest(restEditing.id, restEditing.seconds);
              setRestEditing(null);
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

/**
 * Isolated so the once-a-second tick repaints three characters instead of the
 * entire session. Recomputed from startedAt rather than incremented, so the
 * clock stays correct after the app has been backgrounded.
 */
function SessionClock({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(() =>
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0,
  );

  useEffect(() => {
    if (!startedAt) return;
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <LiveStat icon="clock" value={formatDuration(elapsed)} label="elapsed" />;
}

function LiveStats({ unit }: { unit: string }) {
  const volume = useWorkout((state) => state.stats().volume);
  const completedSets = useWorkout((state) => state.stats().completedSets);
  const totalSets = useWorkout((state) => state.stats().totalSets);

  return (
    <>
      <LiveStat icon="barChart" value={`${formatCompact(volume)} ${unit}`} label="volume" />
      <View style={styles.statDivider} />
      <LiveStat
        icon="check"
        value={`${completedSets}/${totalSets}`}
        label="sets"
        accent={completedSets === totalSets && totalSets > 0}
      />
    </>
  );
}

/** Hook wrapper so keep-awake can be toggled from settings. Uses the
 *  imperative API because `useKeepAwake` wants one stable tag for its whole
 *  lifetime, and both calls swallow errors so a device without wake-lock
 *  support cannot take the logger down. */
function useKeepAwakeWhen(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let released = false;

    void activateKeepAwakeAsync('knight-session').catch(() => {
      released = true;
    });

    return () => {
      if (released) return;
      try {
        void Promise.resolve(deactivateKeepAwake('knight-session')).catch(() => undefined);
      } catch {
        // Lock was never granted; nothing to release.
      }
    };
  }, [enabled]);
}

function LiveStat({
  icon,
  value,
  label,
  accent,
}: {
  icon: 'clock' | 'barChart' | 'check';
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.liveStat}>
      <View style={styles.liveStatTop}>
        <Icon name={icon} size={12} color={palette.textTertiary} />
        <Text variant="numeric" style={{ fontSize: 15 }} color={accent ? 'accent' : 'primary'}>
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
