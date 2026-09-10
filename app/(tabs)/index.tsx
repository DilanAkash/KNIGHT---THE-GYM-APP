import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, Section } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { StatTile } from '@/components/ui/StatTile';
import { Text } from '@/components/ui/Text';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { EmptyState } from '@/components/ui/Feedback';
import { useToday } from '@/features/today/useToday';
import { useWorkout } from '@/store/workout';
import { useSettings } from '@/store/settings';
import { greeting } from '@/lib/date';
import { formatCompact, formatDurationLong } from '@/lib/strength';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space, typography } from '@/theme';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);

  const { overview, activeWorkout, routineName, nextDay, recentRecords, nutrition, reload } = useToday();
  const begin = useWorkout((state) => state.begin);
  const { weeklyGoal, displayName, unit, nutritionTargets } = useSettings();

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const startNext = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      const id = await begin({ routineDayId: nextDay?.id ?? null, name: nextDay?.name });
      router.push(`/workout/${id}`);
    } finally {
      setStarting(false);
    }
  }, [begin, nextDay, starting]);

  const startEmpty = useCallback(async () => {
    const id = await begin({ routineDayId: null, name: 'Empty Session' });
    router.push(`/workout/${id}`);
  }, [begin]);

  const sessions = overview?.workoutsThisWeek ?? 0;
  const goalProgress = weeklyGoal > 0 ? sessions / weeklyGoal : 0;
  const volumeDelta =
    overview && overview.volumeLastWeek > 0
      ? ((overview.volumeThisWeek - overview.volumeLastWeek) / overview.volumeLastWeek) * 100
      : null;

  return (
    <View style={styles.root}>
      <Header
        title="Today"
        eyebrow={displayName ? `${greeting()}, ${displayName}` : greeting()}
        scrollY={scrollY}
        right={
          <IconButton
            name="sliders"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
            size={40}
            background={palette.surface}
          />
        }
      />

      <AnimatedScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
            colors={[palette.accent]}
            progressBackgroundColor={palette.surface}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + layout.tabBarHeight + space.xxl },
        ]}
      >
        {activeWorkout ? (
          <Animated.View entering={FadeInDown.springify().damping(20)}>
            <PressableScale
              onPress={() => router.push(`/workout/${activeWorkout.id}`)}
              scaleTo={0.98}
              haptic="medium"
            >
              <View style={styles.resume}>
                <LinearGradient
                  colors={[palette.accent, palette.accentDim]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.resumePulse} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="overline" style={{ color: 'rgba(10,11,13,0.62)' }}>
                    Session in progress
                  </Text>
                  <Text variant="heading" color="onAccent" numberOfLines={1}>
                    {activeWorkout.name}
                  </Text>
                </View>
                <Icon name="arrowRight" size={22} color={palette.textOnAccent} strokeWidth={2.2} />
              </View>
            </PressableScale>
          </Animated.View>
        ) : (
          <NextSessionCard
            routineName={routineName}
            dayName={nextDay?.name ?? null}
            exerciseNames={nextDay?.exercises.map((item) => item.exercise.name) ?? []}
            setCount={nextDay?.exercises.reduce((sum, item) => sum + item.targetSets, 0) ?? 0}
            onStart={startNext}
            onBrowse={() => router.push('/(tabs)/train')}
            loading={starting}
          />
        )}

        <Section title="This week">
          <Card padded={false} index={1}>
            <View style={styles.weekRow}>
              <ProgressRing progress={goalProgress} size={78} thickness={7} gradient delay={120}>
                <View style={styles.ringCenter}>
                  <Text variant="numericLarge" style={{ fontSize: 22 }}>
                    {sessions}
                  </Text>
                  <Text variant="caption" color="tertiary" style={{ fontSize: 10 }}>
                    of {weeklyGoal}
                  </Text>
                </View>
              </ProgressRing>

              <View style={styles.weekStats}>
                <WeekStat
                  label="Volume"
                  value={formatCompact(overview?.volumeThisWeek ?? 0)}
                  suffix={unit}
                />
                <WeekStat label="Sets" value={String(overview?.totalSets ?? 0)} suffix="all time" />
                <WeekStat
                  label="Streak"
                  value={String(overview?.currentStreakWeeks ?? 0)}
                  suffix={overview?.currentStreakWeeks === 1 ? 'week' : 'weeks'}
                  accent={(overview?.currentStreakWeeks ?? 0) >= 2}
                />
              </View>
            </View>
          </Card>
        </Section>

        <View style={styles.tiles}>
          <StatTile
            label="Week volume"
            value={overview?.volumeThisWeek ?? 0}
            suffix={` ${unit}`}
            icon="barChart"
            delta={volumeDelta}
          />
          <StatTile
            label="Sessions"
            value={overview?.totalWorkouts ?? 0}
            icon="dumbbell"
            accent={(overview?.totalWorkouts ?? 0) > 0}
          />
        </View>

        {nutrition ? (
          <Section
            title="Fuel today"
            action={
              <PressableScale onPress={() => router.push('/(tabs)/fuel')} haptic="light">
                <Text variant="label" color="accent">
                  Log
                </Text>
              </PressableScale>
            }
          >
            <Card index={2} onPress={() => router.push('/(tabs)/fuel')}>
              <View style={styles.fuelRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.fuelValue}>
                    <AnimatedNumber
                      value={Math.round(nutrition.totals.calories)}
                      variant="numericLarge"
                      style={{ fontSize: 26 }}
                    />
                    <Text variant="label" color="tertiary">
                      / {nutritionTargets.calories} kcal
                    </Text>
                  </View>
                  <Text variant="caption" color="tertiary">
                    {Math.round(nutrition.totals.protein)}p · {Math.round(nutrition.totals.carbs)}c ·{' '}
                    {Math.round(nutrition.totals.fat)}f
                  </Text>
                </View>
                <ProgressRing
                  progress={nutrition.totals.calories / Math.max(1, nutritionTargets.calories)}
                  size={54}
                  thickness={5}
                  delay={220}
                >
                  <Icon name="flame" size={18} color={palette.accent} />
                </ProgressRing>
              </View>
            </Card>
          </Section>
        ) : null}

        {recentRecords.length > 0 ? (
          <Section
            title="Latest records"
            action={
              <PressableScale onPress={() => router.push('/(tabs)/progress')} haptic="light">
                <Text variant="label" color="accent">
                  All
                </Text>
              </PressableScale>
            }
          >
            <View style={{ gap: space.sm }}>
              {recentRecords.map((record, index) => (
                <Card key={record.id} index={index + 3} padded={false}>
                  <View style={styles.recordRow}>
                    <View style={styles.recordBadge}>
                      <Icon name="trophy" size={16} color={palette.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="subheading" numberOfLines={1}>
                        {record.exerciseName}
                      </Text>
                      <Text variant="caption" color="tertiary">
                        {record.weight > 0
                          ? `${Math.round(record.weight)} ${unit} × ${record.reps}`
                          : 'Volume record'}
                      </Text>
                    </View>
                    <Text variant="numeric" color="accent">
                      {Math.round(record.value)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Quick log">
          <View style={styles.quickRow}>
            <QuickAction icon="plus" label="Empty session" onPress={startEmpty} />
            <QuickAction icon="scale" label="Bodyweight" onPress={() => router.push('/(tabs)/body')} />
            <QuickAction icon="droplet" label="Water" onPress={() => router.push('/(tabs)/fuel')} />
          </View>
        </Section>

        {overview && overview.totalWorkouts === 0 ? (
          <Animated.View entering={FadeIn.delay(300)}>
            <EmptyState
              icon="bolt"
              title="Nothing logged yet"
              message="Start your first session and KNIGHT begins tracking volume, records and muscle balance automatically."
              compact
            />
          </Animated.View>
        ) : overview?.lastWorkoutAt ? (
          <Text variant="caption" color="tertiary" align="center">
            Last session {formatDurationLong((Date.now() - overview.lastWorkoutAt) / 1000)} ago
          </Text>
        ) : null}
      </AnimatedScrollView>
    </View>
  );
}

function NextSessionCard({
  routineName,
  dayName,
  exerciseNames,
  setCount,
  onStart,
  onBrowse,
  loading,
}: {
  routineName: string | null;
  dayName: string | null;
  exerciseNames: string[];
  setCount: number;
  onStart: () => void;
  onBrowse: () => void;
  loading: boolean;
}) {
  if (!dayName) {
    return (
      <Card index={0}>
        <EmptyState
          icon="layers"
          title="No routine yet"
          message="Build a split and KNIGHT will queue up the right session every time you open it."
          actionLabel="Build a routine"
          onAction={onBrowse}
          compact
        />
      </Card>
    );
  }

  return (
    <Animated.View entering={FadeInDown.springify().damping(19)}>
      <View style={styles.hero}>
        <LinearGradient
          colors={['rgba(199,255,60,0.10)', 'rgba(199,255,60,0.02)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.heroHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="overline" color="accent">
              Up next
            </Text>
            <Text variant="title" numberOfLines={1}>
              {dayName}
            </Text>
            {routineName ? (
              <Text variant="caption" color="tertiary" numberOfLines={1}>
                {routineName}
              </Text>
            ) : null}
          </View>
          <View style={styles.heroCount}>
            <Text variant="numericLarge" color="accent" style={{ fontSize: 24 }}>
              {setCount}
            </Text>
            <Text variant="caption" color="tertiary" style={{ fontSize: 10 }}>
              sets
            </Text>
          </View>
        </View>

        {exerciseNames.length > 0 ? (
          <View style={styles.heroList}>
            {exerciseNames.slice(0, 4).map((name, index) => (
              <View key={`${name}-${index}`} style={styles.heroItem}>
                <View style={styles.heroDot} />
                <Text variant="body" color="secondary" numberOfLines={1} style={{ flex: 1 }}>
                  {name}
                </Text>
              </View>
            ))}
            {exerciseNames.length > 4 ? (
              <Text variant="caption" color="tertiary" style={{ marginLeft: 16 }}>
                +{exerciseNames.length - 4} more
              </Text>
            ) : null}
          </View>
        ) : null}

        <Button
          label="Start session"
          icon="play"
          size="lg"
          fullWidth
          loading={loading}
          onPress={() => {
            haptics.heavy();
            onStart();
          }}
        />
      </View>
    </Animated.View>
  );
}

function WeekStat({
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
    <View style={styles.weekStat}>
      <Text variant="overline" color="tertiary">
        {label}
      </Text>
      <View style={styles.weekStatValue}>
        <Text style={[typography.numeric, { color: accent ? palette.accent : palette.textPrimary }]}>
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

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: 'plus' | 'scale' | 'droplet';
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.94} haptic="light" style={styles.quickAction}>
      <View style={styles.quickIcon}>
        <Icon name={icon} size={18} color={palette.textPrimary} />
      </View>
      <Text variant="caption" color="secondary" align="center" numberOfLines={2}>
        {label}
      </Text>
    </PressableScale>
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
    gap: space.xl,
  },
  hero: {
    borderRadius: radius.xl,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.accentEdge,
    padding: space.lg,
    gap: space.base,
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  heroCount: {
    alignItems: 'center',
    minWidth: 48,
  },
  heroList: {
    gap: 7,
  },
  heroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  heroDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: palette.textTertiary,
  },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.base,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 74,
  },
  resumePulse: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.base,
  },
  ringCenter: {
    alignItems: 'center',
  },
  weekStats: {
    flex: 1,
    gap: space.md,
  },
  weekStat: {
    gap: 1,
  },
  weekStatValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  tiles: {
    flexDirection: 'row',
    gap: space.md,
  },
  fuelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.base,
  },
  fuelValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
  recordBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.base,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
