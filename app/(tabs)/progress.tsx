import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { Appear } from '@/components/ui/Appear';
import { Card, Section } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/Pressable';
import { Segmented, Chip, ChipRow } from '@/components/ui/Segmented';
import { StatTile } from '@/components/ui/StatTile';
import { Text } from '@/components/ui/Text';
import { BarChart } from '@/components/charts/BarChart';
import { ConsistencyGrid } from '@/components/charts/ConsistencyGrid';
import { MuscleMap, MuscleMapLegend, MuscleLoadList, type MuscleView } from '@/components/charts/MuscleMap';
import {
  getMostTrained,
  getMuscleLoad,
  getOverview,
  getTrainingDays,
  getWeeklyVolume,
  listPersonalRecords,
  type ExerciseFrequency,
  type MuscleLoad,
  type RecordEntry,
  type TrainingOverview,
  type VolumePoint,
} from '@/db/queries/stats';
import type { MuscleGroup, PrType } from '@/db/types';
import { useSettings } from '@/store/settings';
import { formatCompact } from '@/lib/strength';
import { friendlyDate, fromDateKey, monthShort } from '@/lib/date';
import { layout, palette, radius, space } from '@/theme';

type Tab = 'overview' | 'muscles' | 'records';

const TABS = [
  { value: 'overview' as const, label: 'Overview' },
  { value: 'muscles' as const, label: 'Muscles' },
  { value: 'records' as const, label: 'Records' },
];

const PERIODS = [7, 14, 30];

const RECORD_TABS: { value: PrType; label: string }[] = [
  { value: 'e1rm', label: 'Est. 1RM' },
  { value: 'weight', label: 'Heaviest' },
  { value: 'volume', label: 'Volume' },
];

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { unit } = useSettings();

  const [tab, setTab] = useState<Tab>('overview');
  const [muscleView, setMuscleView] = useState<MuscleView>('front');
  const [period, setPeriod] = useState(7);
  const [recordType, setRecordType] = useState<PrType>('e1rm');

  const [overview, setOverview] = useState<TrainingOverview | null>(null);
  const [weekly, setWeekly] = useState<VolumePoint[]>([]);
  const [trainingDays, setTrainingDays] = useState<Map<string, number>>(new Map());
  const [muscles, setMuscles] = useState<MuscleLoad[]>([]);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [mostTrained, setMostTrained] = useState<ExerciseFrequency[]>([]);

  const reload = useCallback(async () => {
    const [ov, vol, days, load, prs, trained] = await Promise.all([
      getOverview(),
      getWeeklyVolume(12),
      getTrainingDays(140),
      getMuscleLoad(period),
      listPersonalRecords(recordType),
      getMostTrained(6),
    ]);
    setOverview(ov);
    setWeekly(vol);
    setTrainingDays(days);
    setMuscles(load);
    setRecords(prs);
    setMostTrained(trained);
  }, [period, recordType]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const muscleMap = new Map<MuscleGroup, number>(muscles.map((item) => [item.muscle, item.sets]));
  const hasData = (overview?.totalWorkouts ?? 0) > 0;

  const volumeDelta =
    overview && overview.volumeLastWeek > 0
      ? ((overview.volumeThisWeek - overview.volumeLastWeek) / overview.volumeLastWeek) * 100
      : null;

  return (
    <View style={styles.root}>
      <Header
        title="Stats"
        eyebrow="Where you actually are"
        scrollY={scrollY}
        right={
          <IconButton
            name="calendar"
            accessibilityLabel="Session history"
            onPress={() => router.push('/history')}
            size={40}
            background={palette.surface}
          />
        }
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + layout.tabBarHeight + space.xxl },
        ]}
      >
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {!hasData ? (
          <EmptyState
            icon="activity"
            title="No data yet"
            message="Finish a session and every chart here fills in on its own."
          />
        ) : tab === 'overview' ? (
          <Appear from="fade" style={styles.tabContent}>
            <View style={styles.tiles}>
              <StatTile
                label="Week volume"
                value={overview?.volumeThisWeek ?? 0}
                suffix={` ${unit}`}
                icon="barChart"
                compact
                delta={volumeDelta}
                accent
              />
              <StatTile
                label="Week streak"
                value={overview?.currentStreakWeeks ?? 0}
                icon="flame"
              />
            </View>
            <View style={styles.tiles}>
              <StatTile label="Sessions" value={overview?.totalWorkouts ?? 0} icon="dumbbell" />
              <StatTile label="Sets logged" value={overview?.totalSets ?? 0} icon="check" />
            </View>

            <Section title="Weekly volume">
              <Card padded index={0}>
                <BarChart
                  data={weekly.map((point, index) => ({
                    label: `${fromDateKey(point.weekStart).getDate()} ${monthShort(fromDateKey(point.weekStart))}`,
                    value: point.volume,
                    current: index === weekly.length - 1,
                  }))}
                  height={150}
                  formatValue={(value) => `${formatCompact(value)} ${unit}`}
                />
              </Card>
            </Section>

            <Section title="Consistency">
              <Card padded index={1}>
                <ConsistencyGrid days={trainingDays} weeks={20} />
              </Card>
            </Section>

            {mostTrained.length > 0 ? (
              <Section title="Most trained">
                <View style={{ gap: space.sm }}>
                  {mostTrained.map((entry, index) => (
                    <Card
                      key={entry.exerciseId}
                      index={index}
                      padded={false}
                      onPress={() => router.push(`/exercise/${entry.exerciseId}`)}
                    >
                      <View style={styles.trainedRow}>
                        <View style={styles.rank}>
                          <Text variant="numeric" color="tertiary" style={{ fontSize: 13 }}>
                            {index + 1}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="subheading" numberOfLines={1}>
                            {entry.name}
                          </Text>
                          <Text variant="caption" color="tertiary">
                            {entry.sessions} session{entry.sessions === 1 ? '' : 's'} ·{' '}
                            {formatCompact(entry.totalVolume ?? 0)} {unit}
                          </Text>
                        </View>
                        <Icon name="chevronRight" size={16} color={palette.textTertiary} />
                      </View>
                    </Card>
                  ))}
                </View>
              </Section>
            ) : null}
          </Appear>
        ) : tab === 'muscles' ? (
          <Appear from="fade" style={styles.tabContent}>
            <ChipRow>
              {PERIODS.map((days) => (
                <Chip
                  key={days}
                  label={`${days} days`}
                  selected={period === days}
                  onPress={() => setPeriod(days)}
                />
              ))}
            </ChipRow>

            <Card padded index={0}>
              <View style={{ gap: space.base }}>
                <Segmented
                  options={[
                    { value: 'front' as const, label: 'Front' },
                    { value: 'back' as const, label: 'Back' },
                  ]}
                  value={muscleView}
                  onChange={setMuscleView}
                />
                <MuscleMap load={muscleMap} view={muscleView} width={190} ceiling={period * 1.6} />
                <MuscleMapLegend ceiling={Math.round(period * 1.6)} />
              </View>
            </Card>

            <Section title="Weighted sets">
              <Card padded index={1}>
                {muscles.length === 0 ? (
                  <Text variant="caption" color="tertiary" align="center">
                    Nothing logged in this window
                  </Text>
                ) : (
                  <MuscleLoadList load={muscles} limit={10} />
                )}
              </Card>
              <Text variant="caption" color="tertiary">
                A set counts once for the prime mover and half for each assisting muscle.
              </Text>
            </Section>
          </Appear>
        ) : (
          <Appear from="fade" style={styles.tabContent}>
            <Segmented options={RECORD_TABS} value={recordType} onChange={setRecordType} />

            {records.length === 0 ? (
              <EmptyState
                icon="trophy"
                title="No records yet"
                message="Records appear the first time you log a set of an exercise."
                compact
              />
            ) : (
              <View style={{ gap: space.sm }}>
                {records.map((record, index) => (
                  <PressableScale
                    key={record.id}
                    onPress={() => router.push(`/exercise/${record.exerciseId}`)}
                    haptic="light"
                    scaleTo={0.98}
                    style={styles.recordRow}
                  >
                    <View style={styles.recordIcon}>
                      <Icon name="trophy" size={16} color={palette.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="subheading" numberOfLines={1}>
                        {record.exerciseName}
                      </Text>
                      <Text variant="caption" color="tertiary">
                        {friendlyDate(new Date(record.achievedAt))}
                        {record.type === 'weight' && record.reps > 0
                          ? ` · ${record.reps} reps`
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.recordValue}>
                      <Text variant="numeric" color="accent">
                        {record.type === 'volume'
                          ? formatCompact(record.value)
                          : Math.round(record.value)}
                      </Text>
                      <Text variant="caption" color="tertiary" style={{ fontSize: 10 }}>
                        {unit}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </View>
            )}
          </Appear>
        )}
      </Animated.ScrollView>
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
    gap: space.lg,
  },
  tabContent: {
    gap: space.xl,
  },
  tiles: {
    flexDirection: 'row',
    gap: space.md,
  },
  trainedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
  rank: {
    width: 26,
    height: 26,
    borderRadius: radius.xs,
    backgroundColor: palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordValue: {
    alignItems: 'flex-end',
  },
});
