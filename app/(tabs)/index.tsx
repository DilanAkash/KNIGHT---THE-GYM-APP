import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Appear } from '@/components/ui/Appear';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, Section } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { StatTile } from '@/components/ui/StatTile';
import { Text } from '@/components/ui/Text';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { WeekStrip } from '@/features/today/WeekStrip';
import { useToday } from '@/features/today/useToday';
import { useWorkout } from '@/store/workout';
import { useSettings } from '@/store/settings';
import { dateKey, greeting, longDate } from '@/lib/date';
import { formatCompact } from '@/lib/strength';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space, typography } from '@/theme';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);

  const { overview, activeWorkout, routineName, nextDay, recentRecords, nutrition, trainingDays, reload } =
    useToday();
  const begin = useWorkout((state) => state.begin);
  const { weeklyGoal, displayName, unit, nutritionTargets } = useSettings();

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
  const trainedToday = (trainingDays.get(dateKey()) ?? 0) > 0;
  const volumeDelta =
    overview && overview.volumeLastWeek > 0
      ? ((overview.volumeThisWeek - overview.volumeLastWeek) / overview.volumeLastWeek) * 100
      : null;

  const status = useMemo(
    () => weekStatus({ sessions, goal: weeklyGoal, trainedToday, hasActive: Boolean(activeWorkout) }),
    [sessions, weeklyGoal, trainedToday, activeWorkout],
  );

  return (
    <View style={styles.root}>
      <ScrollView
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
          {
            paddingTop: insets.top + space.base,
            paddingBottom: insets.bottom + layout.tabBarHeight + space.xxl,
          },
        ]}
      >
        {/* A greeting by name, today's date and the week so far. The screen
            should answer "where am I" before it asks anything of you. */}
        <Appear from="fade">
          <View style={styles.welcome}>
            <View style={styles.welcomeText}>
              <Text variant="label" color="tertiary">
                {longDate()}
              </Text>
              <Text variant="display" numberOfLines={1}>
                {displayName ? `${greeting()}, ${displayName.split(' ')[0]}` : greeting()}
              </Text>
            </View>
            <IconButton
              name="sliders"
              accessibilityLabel="Settings"
              onPress={() => router.push('/settings')}
              size={42}
              background={palette.surface}
            />
          </View>
        </Appear>

        <Appear index={1}>
          <View style={styles.weekCard}>
            <WeekStrip days={trainingDays} />
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, status.tone === 'accent' ? styles.statusDotOn : null]} />
              <Text variant="body" color={status.tone === 'accent' ? 'accent' : 'secondary'} style={{ flex: 1 }}>
                {status.text}
              </Text>
              <Text variant="numeric" color="tertiary" style={{ fontSize: 13 }}>
                {sessions}/{weeklyGoal}
              </Text>
            </View>
          </View>
        </Appear>

        {activeWorkout ? (
          <Appear index={2}>
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
          </Appear>
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

        {!displayName ? (
          <Appear index={3}>
            <PressableScale
              onPress={() => router.push('/settings')}
              haptic="light"
              scaleTo={0.98}
              style={styles.namePrompt}
            >
              <Icon name="user" size={17} color={palette.textSecondary} />
              <Text variant="body" color="secondary" style={{ flex: 1 }}>
                Tell KNIGHT your name
              </Text>
              <Icon name="chevronRight" size={16} color={palette.textTertiary} />
            </PressableScale>
          </Appear>
        ) : null}

        <View style={styles.tiles}>
          <StatTile
            label="Week volume"
            value={overview?.volumeThisWeek ?? 0}
            suffix={` ${unit}`}
            icon="barChart"
            compact
            delta={volumeDelta}
          />
          <StatTile
            label="Week streak"
            value={overview?.currentStreakWeeks ?? 0}
            icon="flame"
            accent={(overview?.currentStreakWeeks ?? 0) >= 2}
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
            <Card index={4} onPress={() => router.push('/(tabs)/fuel')}>
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
                <Card key={record.id} index={index + 5} padded={false}>
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
      </ScrollView>
    </View>
  );
}

/**
 * One line of plain language about the week.
 *
 * Deliberately never scolds — an app that opens with what you failed to do is
 * one you stop opening. A quiet week gets an invitation, not a guilt trip.
 */
function weekStatus({
  sessions,
  goal,
  trainedToday,
  hasActive,
}: {
  sessions: number;
  goal: number;
  trainedToday: boolean;
  hasActive: boolean;
}): { text: string; tone: 'accent' | 'muted' } {
  if (hasActive) return { text: 'You have a session running.', tone: 'accent' };
  if (goal > 0 && sessions >= goal) {
    return { text: `Week's target hit. ${sessions} in the bank.`, tone: 'accent' };
  }
  if (trainedToday) return { text: 'Trained today. Rest is part of it.', tone: 'accent' };
  if (sessions === 0) return { text: 'Fresh week. Nothing logged yet.', tone: 'muted' };

  const left = Math.max(0, goal - sessions);
  return {
    text: `${sessions} down, ${left} to go this week.`,
    tone: 'muted',
  };
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
      <Appear index={2}>
        <View style={styles.hero}>
          <Text variant="overline" color="accent">
            No routine yet
          </Text>
          <Text variant="body" color="secondary">
            Pick a split and KNIGHT queues the right session every time you open it.
          </Text>
          <Button label="Browse templates" icon="layers" size="lg" fullWidth onPress={onBrowse} />
        </View>
      </Appear>
    );
  }

  return (
    <Appear index={2}>
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
            <Text variant="title" numberOfLines={2}>
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
    </Appear>
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
    gap: space.lg,
  },
  welcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingBottom: space.xs,
  },
  welcomeText: {
    flex: 1,
    gap: 2,
  },
  weekCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    padding: space.base,
    gap: space.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.textTertiary,
  },
  statusDotOn: {
    backgroundColor: palette.accent,
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
  namePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.base,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
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
