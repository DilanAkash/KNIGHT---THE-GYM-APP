import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appear } from '@/components/ui/Appear';
import { EmptyState } from '@/components/ui/Feedback';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { listWorkouts, type WorkoutSummary } from '@/db/queries/workouts';
import { useSettings } from '@/store/settings';
import { formatCompact, formatDurationLong } from '@/lib/strength';
import { monthShort, weekdayShort } from '@/lib/date';
import { layout, palette, radius, space } from '@/theme';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { unit } = useSettings();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);

  const reload = useCallback(async () => {
    setWorkouts(await listWorkouts(200));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const sections = useMemo(() => {
    const byMonth = new Map<string, WorkoutSummary[]>();
    for (const workout of workouts) {
      const date = new Date(workout.startedAt);
      const key = `${monthShort(date)} ${date.getFullYear()}`;
      const list = byMonth.get(key) ?? [];
      list.push(workout);
      byMonth.set(key, list);
    }
    return [...byMonth.entries()].map(([title, data]) => ({ title, data }));
  }, [workouts]);

  const totalVolume = workouts.reduce((sum, workout) => sum + workout.totalVolume, 0);

  return (
    <View style={styles.root}>
      <Header
        title="History"
        eyebrow={
          workouts.length > 0
            ? `${workouts.length} sessions · ${formatCompact(totalVolume)} ${unit} lifted`
            : 'Every session you have logged'
        }
        onBack={() => router.back()}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.xxxl }]}
        renderSectionHeader={({ section }) => (
          <Text variant="overline" color="tertiary" style={styles.sectionHeader}>
            {section.title}
          </Text>
        )}
        renderItem={({ item, index }) => {
          const date = new Date(item.startedAt);
          return (
            <Appear index={index} from="fade">
              <PressableScale
                onPress={() => router.push(`/history/${item.id}`)}
                haptic="light"
                scaleTo={0.98}
                style={styles.row}
              >
                <View style={styles.dateBlock}>
                  <Text variant="caption" color="tertiary" style={{ fontSize: 10 }}>
                    {weekdayShort(date).toUpperCase()}
                  </Text>
                  <Text variant="numeric" style={{ fontSize: 18 }}>
                    {date.getDate()}
                  </Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="subheading" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {formatDurationLong(item.durationSeconds)} · {item.setCount} sets ·{' '}
                    {item.exerciseCount} lifts
                  </Text>
                </View>

                <View style={styles.rowRight}>
                  {item.prCount > 0 ? (
                    <View style={styles.prPill}>
                      <Icon name="trophy" size={10} color={palette.accent} />
                      <Text variant="caption" color="accent" style={{ fontSize: 10 }}>
                        {item.prCount}
                      </Text>
                    </View>
                  ) : null}
                  <Text variant="numeric" color="secondary" style={{ fontSize: 14 }}>
                    {formatCompact(item.totalVolume)}
                  </Text>
                </View>
              </PressableScale>
            </Appear>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title="No sessions yet"
            message="Finished sessions show up here with everything you lifted."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
  list: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.sm,
  },
  sectionHeader: {
    paddingTop: space.base,
    paddingBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  dateBlock: {
    width: 42,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: radius.xs,
    backgroundColor: palette.surfaceHigh,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  prPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: palette.accentSoft,
  },
});
