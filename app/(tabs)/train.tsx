import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { Appear } from '@/components/ui/Appear';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, Section } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Input';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { getSetting, setSetting } from '@/db/client';
import { createRoutine, getRoutineDetail, listRoutines, type RoutineDetail } from '@/db/queries/routines';
import { listWorkouts, type WorkoutSummary } from '@/db/queries/workouts';
import { installTemplate } from '@/db/seed';
import { ROUTINE_TEMPLATES } from '@/db/routineTemplates';
import { useWorkout } from '@/store/workout';
import { useSettings } from '@/store/settings';
import { formatCompact, formatDurationLong } from '@/lib/strength';
import { friendlyDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space } from '@/theme';

export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { unit } = useSettings();
  const begin = useWorkout((state) => state.begin);

  const [routines, setRoutines] = useState<RoutineDetail[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [recent, setRecent] = useState<WorkoutSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [templatePicker, setTemplatePicker] = useState(false);
  const [newName, setNewName] = useState('');

  const reload = useCallback(async () => {
    const list = await listRoutines();
    const details = await Promise.all(list.map((routine) => getRoutineDetail(routine.id)));
    setRoutines(details.filter((item): item is RoutineDetail => item !== null));
    setActiveId(await getSetting('active_routine_id'));
    setRecent(await listWorkouts(4));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const startDay = useCallback(
    async (dayId: string, name: string) => {
      const id = await begin({ routineDayId: dayId, name });
      router.push(`/workout/${id}`);
    },
    [begin],
  );

  return (
    <View style={styles.root}>
      <Header
        title="Train"
        eyebrow="Your splits"
        scrollY={scrollY}
        right={
          <>
            <IconButton
              name="search"
              accessibilityLabel="Exercise library"
              onPress={() => router.push('/exercises')}
              size={40}
              background={palette.surface}
            />
            <IconButton
              name="plus"
              accessibilityLabel="New routine"
              onPress={() => setCreating(true)}
              size={40}
              background={palette.surface}
              color={palette.accent}
            />
          </>
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
        {routines.length === 0 ? (
          <EmptyState
            icon="layers"
            title="No routines"
            message="Start from a proven template or build your own from scratch."
            actionLabel="Browse templates"
            onAction={() => setTemplatePicker(true)}
          />
        ) : (
          routines.map((routine, index) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              index={index}
              active={routine.id === activeId}
              unit={unit}
              onSetActive={async () => {
                await setSetting('active_routine_id', routine.id);
                haptics.success();
                setActiveId(routine.id);
              }}
              onEdit={() => router.push(`/routine/${routine.id}`)}
              onStartDay={startDay}
            />
          ))
        )}

        <Section title="Add a routine">
          <View style={styles.addRow}>
            <PressableScale
              onPress={() => setTemplatePicker(true)}
              haptic="light"
              scaleTo={0.97}
              style={styles.addCard}
            >
              <Icon name="copy" size={19} color={palette.accent} />
              <Text variant="subheading">From template</Text>
              <Text variant="caption" color="tertiary">
                PPL, Upper/Lower, Full Body
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => setCreating(true)}
              haptic="light"
              scaleTo={0.97}
              style={styles.addCard}
            >
              <Icon name="plus" size={19} color={palette.textSecondary} />
              <Text variant="subheading">From scratch</Text>
              <Text variant="caption" color="tertiary">
                Build it your way
              </Text>
            </PressableScale>
          </View>
        </Section>

        {recent.length > 0 ? (
          <Section
            title="Recent sessions"
            action={
              <PressableScale onPress={() => router.push('/history')} haptic="light">
                <Text variant="label" color="accent">
                  All
                </Text>
              </PressableScale>
            }
          >
            <View style={{ gap: space.sm }}>
              {recent.map((workout, index) => (
                <Card
                  key={workout.id}
                  index={index}
                  padded={false}
                  onPress={() => router.push(`/history/${workout.id}`)}
                >
                  <View style={styles.recentRow}>
                    <View style={styles.recentIcon}>
                      <Icon name="dumbbell" size={16} color={palette.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="subheading" numberOfLines={1}>
                        {workout.name}
                      </Text>
                      <Text variant="caption" color="tertiary">
                        {friendlyDate(new Date(workout.startedAt))} ·{' '}
                        {formatDurationLong(workout.durationSeconds)} · {workout.setCount} sets
                      </Text>
                    </View>
                    {workout.prCount > 0 ? (
                      <View style={styles.prPill}>
                        <Icon name="trophy" size={11} color={palette.accent} />
                        <Text variant="caption" color="accent" style={{ fontSize: 10 }}>
                          {workout.prCount}
                        </Text>
                      </View>
                    ) : null}
                    <Text variant="numeric" color="secondary" style={{ fontSize: 14 }}>
                      {formatCompact(workout.totalVolume)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          </Section>
        ) : null}
      </Animated.ScrollView>

      <Sheet visible={creating} onClose={() => setCreating(false)} title="New routine">
        <View style={{ gap: space.base, paddingBottom: space.base }}>
          <Field
            label="Name"
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Winter Bulk"
            autoCapitalize="words"
          />
          <Button
            label="Create"
            size="lg"
            fullWidth
            disabled={!newName.trim()}
            onPress={async () => {
              const id = await createRoutine(newName);
              setNewName('');
              setCreating(false);
              haptics.success();
              router.push(`/routine/${id}`);
            }}
          />
        </View>
      </Sheet>

      <Sheet visible={templatePicker} onClose={() => setTemplatePicker(false)} title="Templates">
        <View style={{ gap: space.md, paddingBottom: space.base }}>
          {ROUTINE_TEMPLATES.map((template) => (
            <PressableScale
              key={template.key}
              haptic="medium"
              scaleTo={0.98}
              onPress={async () => {
                const id = await installTemplate(template);
                setTemplatePicker(false);
                haptics.success();
                await reload();
                router.push(`/routine/${id}`);
              }}
              style={styles.templateCard}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="heading">{template.name}</Text>
                <Text variant="caption" color="tertiary">
                  {template.description}
                </Text>
                <Text variant="caption" color="accent">
                  {template.daysPerWeek} days · {template.days.length} sessions
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={palette.textTertiary} />
            </PressableScale>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

function RoutineCard({
  routine,
  index,
  active,
  unit,
  onSetActive,
  onEdit,
  onStartDay,
}: {
  routine: RoutineDetail;
  index: number;
  active: boolean;
  unit: string;
  onSetActive: () => void;
  onEdit: () => void;
  onStartDay: (dayId: string, name: string) => void;
}) {
  const totalSets = routine.days.reduce(
    (sum, day) => sum + day.exercises.reduce((inner, ex) => inner + ex.targetSets, 0),
    0,
  );

  return (
    <Appear index={index}>
      <View style={[styles.routineCard, active ? styles.routineCardActive : null]}>
        <View style={styles.routineHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.routineTitleRow}>
              <Text variant="heading" numberOfLines={1}>
                {routine.name}
              </Text>
              {active ? (
                <View style={styles.activeBadge}>
                  <Text variant="caption" color="onAccent" style={styles.activeBadgeText}>
                    ACTIVE
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="caption" color="tertiary">
              {routine.days.length} sessions · {totalSets} sets per cycle
            </Text>
          </View>
          <IconButton
            name="edit"
            accessibilityLabel={`Edit ${routine.name}`}
            onPress={onEdit}
            size={34}
            iconSize={15}
            background="transparent"
          />
        </View>

        <View style={styles.dayGrid}>
          {routine.days.map((day) => (
            <PressableScale
              key={day.id}
              onPress={() => onStartDay(day.id, day.name)}
              haptic="medium"
              scaleTo={0.94}
              style={styles.dayChip}
              accessibilityLabel={`Start ${day.name}`}
            >
              <Text variant="label" numberOfLines={1}>
                {day.name}
              </Text>
              <Text variant="caption" color="tertiary" style={{ fontSize: 10 }}>
                {day.exercises.length} lifts
              </Text>
            </PressableScale>
          ))}
        </View>

        {!active ? (
          <PressableScale onPress={onSetActive} haptic="light" style={styles.makeActive}>
            <Icon name="target" size={14} color={palette.textSecondary} />
            <Text variant="label" color="secondary">
              Make active
            </Text>
          </PressableScale>
        ) : null}
      </View>
    </Appear>
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
  routineCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    padding: space.base,
    gap: space.md,
  },
  routineCardActive: {
    borderColor: palette.accentEdge,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  routineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: palette.accent,
  },
  activeBadgeText: {
    fontSize: 9,
    letterSpacing: 0.6,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  dayChip: {
    minWidth: '31%',
    flexGrow: 1,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
    gap: 1,
  },
  makeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  addRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  addCard: {
    flex: 1,
    gap: 4,
    padding: space.base,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.base,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: palette.accentSoft,
  },
});
