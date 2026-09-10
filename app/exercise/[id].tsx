import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Section } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { LineChart } from '@/components/charts/LineChart';
import {
  getExercise,
  getExerciseHistory,
  getExerciseRecords,
  toggleExerciseFavorite,
  type ExerciseRecords,
  type ExerciseSessionEntry,
} from '@/db/queries/exercises';
import { getExerciseProgress, type ProgressPoint } from '@/db/queries/stats';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/db/exerciseLibrary';
import type { Exercise } from '@/db/types';
import { useSettings } from '@/store/settings';
import { formatCompact } from '@/lib/strength';
import { friendlyDate, fromDateKey } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space } from '@/theme';

type Metric = 'e1rm' | 'topWeight' | 'volume';

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'e1rm', label: 'Est. 1RM' },
  { value: 'topWeight', label: 'Top set' },
  { value: 'volume', label: 'Volume' },
];

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { unit } = useSettings();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [progress, setProgress] = useState<ProgressPoint[]>([]);
  const [history, setHistory] = useState<ExerciseSessionEntry[]>([]);
  const [records, setRecords] = useState<ExerciseRecords | null>(null);
  const [metric, setMetric] = useState<Metric>('e1rm');

  const reload = useCallback(async () => {
    if (!id) return;
    const [ex, points, sessions, prs] = await Promise.all([
      getExercise(id),
      getExerciseProgress(id),
      getExerciseHistory(id),
      getExerciseRecords(id),
    ]);
    setExercise(ex);
    setProgress(points);
    setHistory(sessions);
    setRecords(prs);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  if (!exercise) return <View style={styles.root} />;

  const chartData = progress.map((point) => ({
    x: point.timestamp,
    y: metric === 'e1rm' ? point.e1rm : metric === 'topWeight' ? point.topWeight : point.volume,
    label: point.date,
  }));

  return (
    <View style={styles.root}>
      <Header
        title={exercise.name}
        eyebrow={`${MUSCLE_LABELS[exercise.primaryMuscle]} · ${EQUIPMENT_LABELS[exercise.equipment]}`}
        onBack={() => router.back()}
        scrollY={scrollY}
        right={
          <IconButton
            name="star"
            accessibilityLabel={exercise.isFavorite ? 'Remove favourite' : 'Add favourite'}
            onPress={async () => {
              await toggleExerciseFavorite(exercise.id);
              haptics.light();
              await reload();
            }}
            size={40}
            background={palette.surface}
            color={exercise.isFavorite ? palette.accent : palette.textSecondary}
          />
        }
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxxl }]}
      >
        {exercise.cue ? (
          <View style={styles.cue}>
            <Icon name="info" size={15} color={palette.accent} />
            <Text variant="body" color="secondary" style={{ flex: 1 }}>
              {exercise.cue}
            </Text>
          </View>
        ) : null}

        <View style={styles.recordGrid}>
          <RecordTile
            label="Est. 1RM"
            value={records?.bestE1rm ? `${Math.round(records.bestE1rm)}` : '—'}
            suffix={unit}
            accent
          />
          <RecordTile
            label="Heaviest"
            value={records?.bestWeight ? `${Math.round(records.bestWeight)}` : '—'}
            suffix={records?.bestWeightReps ? `× ${records.bestWeightReps}` : unit}
          />
          <RecordTile
            label="Sessions"
            value={String(records?.totalSessions ?? 0)}
            suffix="logged"
          />
        </View>

        <Section title="Progress">
          <Segmented options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
          <Card padded index={0}>
            <LineChart
              data={chartData}
              height={190}
              formatValue={(value) =>
                metric === 'volume' ? `${formatCompact(value)} ${unit}` : `${Math.round(value)} ${unit}`
              }
              formatLabel={(point) => friendlyDate(fromDateKey(point.label ?? ''))}
            />
          </Card>
        </Section>

        <Section title="History">
          {history.length === 0 ? (
            <EmptyState
              icon="clock"
              title="No sessions yet"
              message="Log this exercise once and its trend shows up here."
              compact
            />
          ) : (
            <View style={{ gap: space.sm }}>
              {history.map((session, index) => (
                <Card key={session.workoutId} index={index} padded={false}>
                  <View style={styles.sessionCard}>
                    <View style={styles.sessionHeader}>
                      <View style={{ flex: 1 }}>
                        <Text variant="subheading" numberOfLines={1}>
                          {session.workoutName}
                        </Text>
                        <Text variant="caption" color="tertiary">
                          {friendlyDate(new Date(session.startedAt))}
                        </Text>
                      </View>
                      <Text variant="numeric" color="secondary" style={{ fontSize: 14 }}>
                        {formatCompact(session.volume)} {unit}
                      </Text>
                    </View>
                    <View style={styles.setPills}>
                      {session.sets.map((set, setIndex) => (
                        <View
                          key={setIndex}
                          style={[
                            styles.setPill,
                            set.type === 'warmup' ? styles.setPillWarmup : null,
                          ]}
                        >
                          <Text
                            variant="caption"
                            color={set.type === 'warmup' ? 'tertiary' : 'secondary'}
                          >
                            {trim(set.weight)} × {set.reps}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </Section>
      </Animated.ScrollView>
    </View>
  );
}

function RecordTile({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.recordTile, accent ? styles.recordTileAccent : null]}>
      <Text variant="overline" color="tertiary">
        {label}
      </Text>
      <View style={styles.recordValue}>
        <Text variant="numeric" color={accent ? 'accent' : 'primary'} style={{ fontSize: 20 }}>
          {value}
        </Text>
        {suffix ? (
          <Text variant="caption" color="tertiary">
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const trim = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.sm,
    gap: space.xl,
  },
  cue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.accentEdge,
  },
  recordGrid: {
    flexDirection: 'row',
    gap: space.sm,
  },
  recordTile: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    gap: 2,
  },
  recordTileAccent: {
    borderColor: palette.accentEdge,
  },
  recordValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  sessionCard: {
    padding: space.md,
    gap: space.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  setPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  setPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    backgroundColor: palette.surfaceHigh,
  },
  setPillWarmup: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
});
