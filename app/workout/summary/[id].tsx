import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Appear } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { getCompletedSummary, type CompletedSummary } from '@/db/queries/workouts';
import { useSettings } from '@/store/settings';
import { formatCompact, formatDurationLong } from '@/lib/strength';
import { friendlyDate, timeOfDay } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { duration, layout, palette, radius, space, spring } from '@/theme';

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { unit } = useSettings();
  const [summary, setSummary] = useState<CompletedSummary | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const result = await getCompletedSummary(id);
      setSummary(result);
      if (result && result.records.length > 0) haptics.celebrate();
      else haptics.success();
    })();
  }, [id]);

  if (!summary) return <View style={styles.root} />;

  const { workout, records, breakdown, totalSets, totalReps, exerciseCount } = summary;
  const started = new Date(workout.startedAt);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <Appear from="fade" style={styles.hero}>
          <Halo active={records.length > 0} />

          <TickBadge />

          <Text variant="overline" color="accent">
            Session complete
          </Text>
          <Text variant="title" align="center" numberOfLines={2}>
            {workout.name}
          </Text>
          <Text variant="caption" color="tertiary">
            {friendlyDate(started)} · {timeOfDay(started)}
          </Text>
        </Appear>

        <Appear delay={160}>
          <View style={styles.volumeCard}>
            <LinearGradient
              colors={['rgba(199,255,60,0.13)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text variant="overline" color="tertiary">
              Total volume
            </Text>
            <View style={styles.volumeRow}>
              <AnimatedNumber
                value={Math.round(workout.totalVolume)}
                variant="hero"
                color={palette.accent}
                bouncy
              />
              <Text variant="heading" color="tertiary" style={{ marginBottom: 6 }}>
                {unit}
              </Text>
            </View>
          </View>
        </Appear>

        <Appear delay={240} style={styles.statRow}>
          <SummaryStat label="Duration" value={formatDurationLong(workout.durationSeconds)} />
          <SummaryStat label="Sets" value={String(totalSets)} />
          <SummaryStat label="Reps" value={String(totalReps)} />
          <SummaryStat label="Lifts" value={String(exerciseCount)} />
        </Appear>

        {records.length > 0 ? (
          <View style={{ gap: space.md }}>
            <View style={styles.prHeader}>
              <Icon name="trophy" size={17} color={palette.accent} />
              <Text variant="heading" color="accent">
                {records.length} new record{records.length === 1 ? '' : 's'}
              </Text>
            </View>
            {records.map((record, index) => (
              <Appear key={record.id} delay={360 + index * 90}>
                <View style={styles.prCard}>
                  <View style={styles.prIcon}>
                    <Icon name="star" size={16} color={palette.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="subheading" numberOfLines={1}>
                      {record.exerciseName}
                    </Text>
                    <Text variant="caption" color="tertiary">
                      {recordLabel(record.type)}
                    </Text>
                  </View>
                  <View style={styles.prValue}>
                    <Text variant="numeric" color="accent">
                      {record.type === 'volume'
                        ? formatCompact(record.value)
                        : Math.round(record.value)}
                    </Text>
                    <Text variant="caption" color="tertiary" style={{ fontSize: 10 }}>
                      {record.type === 'weight' && record.reps > 0 ? `× ${record.reps}` : unit}
                    </Text>
                  </View>
                </View>
              </Appear>
            ))}
          </View>
        ) : null}

        {breakdown.length > 0 ? (
          <View style={{ gap: space.md }}>
            <Text variant="overline" color="tertiary">
              Breakdown
            </Text>
            {breakdown.map((entry, index) => (
              <Card key={`${entry.name}-${index}`} index={index} padded={false}>
                <View style={styles.breakdownRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="subheading" numberOfLines={1}>
                      {entry.name}
                    </Text>
                    <Text variant="caption" color="tertiary">
                      {entry.sets} set{entry.sets === 1 ? '' : 's'} · top {entry.topSet}
                    </Text>
                  </View>
                  <Text variant="numeric" color="secondary" style={{ fontSize: 15 }}>
                    {formatCompact(entry.volume)}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button label="Done" size="lg" fullWidth onPress={() => router.replace('/(tabs)')} />
      </View>
    </View>
  );
}

/** The tick pops in with an overshoot - the one place a bouncy spring is
 *  earned, because finishing a session should land like an arrival. */
function TickBadge() {
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withDelay(120, withSpring(1, spring.bouncy));
  }, [pop]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 2),
    transform: [{ scale: 0.3 + pop.value * 0.7 }],
  }));

  return (
    <Animated.View style={[styles.heroBadge, style]}>
      <Icon name="check" size={26} color={palette.textOnAccent} strokeWidth={2.6} />
    </Animated.View>
  );
}

/** Slow breathing glow behind the tick. Only when a record was set — otherwise
 *  the celebration stops meaning anything. */
function Halo({ active }: { active: boolean }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    pulse.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration.ceremony, easing: Easing.out(Easing.quad) }),
          withTiming(0.35, { duration: duration.ceremony, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
  }, [active, pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.1 + pulse.value * 0.22,
    transform: [{ scale: 0.9 + pulse.value * 0.25 }],
  }));

  if (!active) return null;
  return <Animated.View style={[styles.halo, style]} pointerEvents="none" />;
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text variant="numeric" style={{ fontSize: 16 }}>
        {value}
      </Text>
      <Text variant="caption" color="tertiary" style={{ fontSize: 10 }}>
        {label}
      </Text>
    </View>
  );
}

function recordLabel(type: string): string {
  switch (type) {
    case 'e1rm':
      return 'Estimated 1 rep max';
    case 'weight':
      return 'Heaviest set';
    case 'volume':
      return 'Most volume in a session';
    default:
      return 'Personal record';
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
  content: {
    paddingHorizontal: layout.gutter,
    gap: space.xl,
  },
  hero: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: space.sm,
  },
  halo: {
    position: 'absolute',
    top: -30,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: palette.accent,
  },
  heroBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  volumeCard: {
    borderRadius: radius.xl,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.accentEdge,
    padding: space.lg,
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingVertical: space.md,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.accentEdge,
  },
  prIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(199,255,60,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prValue: {
    alignItems: 'flex-end',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
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
});
