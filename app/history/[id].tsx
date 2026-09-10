import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { Card, Section } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { discardWorkout, getCompletedSummary, type CompletedSummary } from '@/db/queries/workouts';
import { useSettings } from '@/store/settings';
import { formatCompact, formatDurationLong } from '@/lib/strength';
import { friendlyDate, timeOfDay } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space } from '@/theme';

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { unit } = useSettings();
  const [summary, setSummary] = useState<CompletedSummary | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setSummary(await getCompletedSummary(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  if (!summary) return <View style={styles.root} />;

  const { workout, records, breakdown, totalSets, totalReps } = summary;
  const started = new Date(workout.startedAt);

  const confirmDelete = () => {
    Alert.alert('Delete session?', 'This removes the session and everything logged in it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await discardWorkout(workout.id);
          haptics.warning();
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <Header
        title={workout.name}
        eyebrow={`${friendlyDate(started)} · ${timeOfDay(started)}`}
        onBack={() => router.back()}
        scrollY={scrollY}
        right={
          <IconButton
            name="trash"
            accessibilityLabel="Delete session"
            onPress={confirmDelete}
            size={40}
            background={palette.surface}
            color={palette.danger}
          />
        }
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxxl }]}
      >
        <View style={styles.statRow}>
          <Stat label="Volume" value={`${formatCompact(workout.totalVolume)} ${unit}`} accent />
          <Stat label="Duration" value={formatDurationLong(workout.durationSeconds)} />
          <Stat label="Sets" value={String(totalSets)} />
          <Stat label="Reps" value={String(totalReps)} />
        </View>

        {workout.notes ? (
          <Card padded index={0}>
            <View style={styles.notes}>
              <Icon name="note" size={15} color={palette.textTertiary} />
              <Text variant="body" color="secondary" style={{ flex: 1 }}>
                {workout.notes}
              </Text>
            </View>
          </Card>
        ) : null}

        {records.length > 0 ? (
          <Section title="Records set">
            <View style={{ gap: space.sm }}>
              {records.map((record) => (
                <View key={record.id} style={styles.recordRow}>
                  <Icon name="trophy" size={15} color={palette.accent} />
                  <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {record.exerciseName}
                  </Text>
                  <Text variant="numeric" color="accent" style={{ fontSize: 14 }}>
                    {record.type === 'volume'
                      ? formatCompact(record.value)
                      : Math.round(record.value)}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Exercises">
          <View style={{ gap: space.sm }}>
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
        </Section>
      </Animated.ScrollView>
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text variant="numeric" style={{ fontSize: 15 }} color={accent ? 'accent' : 'primary'}>
        {value}
      </Text>
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
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.sm,
    gap: space.xl,
  },
  statRow: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingVertical: space.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  notes: {
    flexDirection: 'row',
    gap: space.sm,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.accentEdge,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
});
