import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appear } from '@/components/ui/Appear';
import { Button, IconButton } from '@/components/ui/Button';
import { Chip, ChipRow } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/Feedback';
import { Field, SearchBar } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import {
  createCustomExercise,
  listExercises,
  toggleExerciseFavorite,
} from '@/db/queries/exercises';
import { addExerciseToDay } from '@/db/queries/routines';
import { EQUIPMENT_LABELS, MUSCLE_LABELS, MUSCLE_REGIONS } from '@/db/exerciseLibrary';
import type { Equipment, Exercise, MuscleGroup } from '@/db/types';
import { useWorkout } from '@/store/workout';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space } from '@/theme';

const REGIONS = Object.keys(MUSCLE_REGIONS);
const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

export default function ExerciseLibraryScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; workoutId?: string; dayId?: string }>();
  const picking = params.mode === 'add';

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [creating, setCreating] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const addExercise = useWorkout((state) => state.addExercise);

  const reload = useCallback(async () => {
    setExercises(await listExercises());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const allowed = region ? new Set(MUSCLE_REGIONS[region] ?? []) : null;

    const filtered = exercises.filter((exercise) => {
      if (favoritesOnly && !exercise.isFavorite) return false;
      if (equipment && exercise.equipment !== equipment) return false;
      if (allowed && !allowed.has(exercise.primaryMuscle)) return false;
      if (needle && !exercise.name.toLowerCase().includes(needle)) return false;
      return true;
    });

    // Favourites break out into their own section; everything else groups by
    // muscle so scanning for "what else hits chest" is one glance.
    const favorites = filtered.filter((item) => item.isFavorite);
    const rest = filtered.filter((item) => !item.isFavorite);

    const byMuscle = new Map<MuscleGroup, Exercise[]>();
    for (const exercise of rest) {
      const list = byMuscle.get(exercise.primaryMuscle) ?? [];
      list.push(exercise);
      byMuscle.set(exercise.primaryMuscle, list);
    }

    const out: { title: string; data: Exercise[] }[] = [];
    if (favorites.length > 0) out.push({ title: 'Favourites', data: favorites });
    for (const [muscle, list] of [...byMuscle.entries()].sort((a, b) =>
      MUSCLE_LABELS[a[0]].localeCompare(MUSCLE_LABELS[b[0]]),
    )) {
      out.push({ title: MUSCLE_LABELS[muscle], data: list });
    }
    return out;
  }, [exercises, query, region, equipment, favoritesOnly]);

  const onPick = useCallback(
    async (exercise: Exercise) => {
      if (!picking) {
        router.push(`/exercise/${exercise.id}`);
        return;
      }
      if (params.dayId) {
        await addExerciseToDay(params.dayId, exercise.id);
      } else {
        await addExercise(exercise.id);
      }
      haptics.medium();
      setAdded((current) => new Set(current).add(exercise.id));
    },
    [addExercise, params.dayId, picking],
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headerRow}>
          <IconButton
            name="chevronLeft"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            size={38}
            background="transparent"
            color={palette.textPrimary}
          />
          <Text variant="heading" style={{ flex: 1 }}>
            {picking ? 'Add exercise' : 'Exercises'}
          </Text>
          <IconButton
            name="plus"
            accessibilityLabel="Create custom exercise"
            onPress={() => setCreating(true)}
            size={38}
            background={palette.surface}
            color={palette.accent}
          />
        </View>

        <View style={styles.search}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search 100+ exercises" />
        </View>

        <ChipRow>
          <Chip
            label="Favourites"
            icon="star"
            selected={favoritesOnly}
            onPress={() => setFavoritesOnly((value) => !value)}
          />
          {REGIONS.map((name) => (
            <Chip
              key={name}
              label={name}
              selected={region === name}
              onPress={() => setRegion((current) => (current === name ? null : name))}
            />
          ))}
          {EQUIPMENT.map((item) => (
            <Chip
              key={item}
              label={EQUIPMENT_LABELS[item]}
              selected={equipment === item}
              onPress={() => setEquipment((current) => (current === item ? null : item))}
            />
          ))}
        </ChipRow>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (picking ? 100 : space.xxxl) },
        ]}
        renderSectionHeader={({ section }) => (
          <Text variant="overline" color="tertiary" style={styles.sectionHeader}>
            {section.title}
          </Text>
        )}
        renderItem={({ item, index }) => (
          <ExerciseRow
            exercise={item}
            index={index}
            picking={picking}
            added={added.has(item.id)}
            onPress={() => void onPick(item)}
            onFavorite={async () => {
              await toggleExerciseFavorite(item.id);
              haptics.light();
              await reload();
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title="Nothing matches"
            message="Try a different filter, or create your own exercise."
            actionLabel="Create exercise"
            onAction={() => setCreating(true)}
          />
        }
      />

      {picking && added.size > 0 ? (
        <Appear style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          <Button
            label={`Done · ${added.size} added`}
            size="lg"
            fullWidth
            onPress={() => router.back()}
          />
        </Appear>
      ) : null}

      <CreateExerciseSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={async () => {
          setCreating(false);
          await reload();
        }}
      />
    </View>
  );
}

function ExerciseRow({
  exercise,
  index,
  picking,
  added,
  onPress,
  onFavorite,
}: {
  exercise: Exercise;
  index: number;
  picking: boolean;
  added: boolean;
  onPress: () => void;
  onFavorite: () => void;
}) {
  return (
    <Appear index={index} from="fade">
      <PressableScale onPress={onPress} scaleTo={0.98} haptic="light" style={styles.row}>
        <View style={[styles.rowIcon, added ? styles.rowIconAdded : null]}>
          <Icon
            name={added ? 'check' : equipmentIcon(exercise.equipment)}
            size={17}
            color={added ? palette.textOnAccent : palette.textSecondary}
            strokeWidth={added ? 2.6 : 1.8}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="subheading" numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text variant="caption" color="tertiary" numberOfLines={1}>
            {MUSCLE_LABELS[exercise.primaryMuscle]}
            {exercise.secondaryMuscles.length > 0
              ? ` · ${exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}`
              : ''}
          </Text>
        </View>

        <PressableScale
          onPress={onFavorite}
          haptic="light"
          scaleTo={0.85}
          hitSlop={10}
          style={styles.favorite}
          accessibilityLabel={exercise.isFavorite ? 'Remove favourite' : 'Add favourite'}
        >
          <Icon
            name="star"
            size={17}
            color={exercise.isFavorite ? palette.accent : palette.textTertiary}
          />
        </PressableScale>

        {picking ? null : <Icon name="chevronRight" size={16} color={palette.textTertiary} />}
      </PressableScale>
    </Appear>
  );
}

function CreateExerciseSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await createCustomExercise({ name, primaryMuscle: muscle, equipment });
      haptics.success();
      setName('');
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Custom exercise">
      <View style={{ gap: space.base, paddingBottom: space.base }}>
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Landmine Press"
          autoCapitalize="words"
        />

        <View style={{ gap: 6 }}>
          <Text variant="overline" color="tertiary">
            Primary muscle
          </Text>
          <ChipRow gutter={0}>
            {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((item) => (
              <Chip
                key={item}
                label={MUSCLE_LABELS[item]}
                selected={muscle === item}
                onPress={() => setMuscle(item)}
              />
            ))}
          </ChipRow>
        </View>

        <View style={{ gap: 6 }}>
          <Text variant="overline" color="tertiary">
            Equipment
          </Text>
          <ChipRow gutter={0}>
            {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((item) => (
              <Chip
                key={item}
                label={EQUIPMENT_LABELS[item]}
                selected={equipment === item}
                onPress={() => setEquipment(item)}
              />
            ))}
          </ChipRow>
        </View>

        <Button
          label="Create exercise"
          fullWidth
          size="lg"
          disabled={!name.trim()}
          loading={saving}
          onPress={() => void save()}
        />
      </View>
    </Sheet>
  );
}

function equipmentIcon(equipment: Equipment) {
  switch (equipment) {
    case 'barbell':
      return 'dumbbell' as const;
    case 'dumbbell':
      return 'dumbbell' as const;
    case 'machine':
      return 'layers' as const;
    case 'cable':
      return 'swap' as const;
    case 'bodyweight':
      return 'user' as const;
    default:
      return 'plate' as const;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
  header: {
    gap: space.md,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  search: {
    paddingHorizontal: layout.gutter,
  },
  list: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.base,
  },
  sectionHeader: {
    paddingTop: space.base,
    paddingBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    marginBottom: space.sm,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconAdded: {
    backgroundColor: palette.accent,
  },
  favorite: {
    padding: 4,
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
