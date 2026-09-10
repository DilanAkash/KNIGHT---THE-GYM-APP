import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { Appear } from '@/components/ui/Appear';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, Section } from '@/components/ui/Card';
import { Field, SearchBar } from '@/components/ui/Input';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { ProgressBar, ProgressRing } from '@/components/ui/ProgressRing';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import {
  addWater,
  deleteEntry,
  getDayNutrition,
  listFoods,
  logEntry,
  saveFood,
  MEAL_LABELS,
  MEAL_ORDER,
  type DayNutrition,
} from '@/db/queries/nutrition';
import type { Food, MealSlot } from '@/db/types';
import { useSettings } from '@/store/settings';
import { addDays, dateKey, friendlyDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { layout, macroColors, palette, radius, space } from '@/theme';

const WATER_STEPS = [250, 500, 750];

export default function FuelScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { nutritionTargets } = useSettings();

  const [date, setDate] = useState(dateKey());
  const [day, setDay] = useState<DayNutrition | null>(null);
  const [adding, setAdding] = useState<MealSlot | null>(null);

  const reload = useCallback(async () => {
    setDay(await getDayNutrition(date));
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const shiftDate = (delta: number) => {
    const next = addDays(new Date(`${date}T12:00:00`), delta);
    // Never let the log run into the future.
    if (delta > 0 && dateKey(next) > dateKey()) return;
    haptics.selection();
    setDate(dateKey(next));
  };

  const totals = day?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const remaining = Math.max(0, nutritionTargets.calories - totals.calories);
  const isToday = date === dateKey();

  return (
    <View style={styles.root}>
      <Header
        title="Fuel"
        eyebrow={friendlyDate(new Date(`${date}T12:00:00`))}
        scrollY={scrollY}
        right={
          <>
            <IconButton
              name="chevronLeft"
              accessibilityLabel="Previous day"
              onPress={() => shiftDate(-1)}
              size={40}
              background={palette.surface}
            />
            <IconButton
              name="chevronRight"
              accessibilityLabel="Next day"
              onPress={() => shiftDate(1)}
              size={40}
              background={palette.surface}
              disabled={isToday}
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
        <Card padded index={0} highlighted>
          <View style={styles.calorieRow}>
            <ProgressRing
              progress={totals.calories / Math.max(1, nutritionTargets.calories)}
              size={104}
              thickness={9}
              gradient
              delay={120}
            >
              <View style={styles.ringCenter}>
                <AnimatedNumber
                  value={Math.round(remaining)}
                  variant="numericLarge"
                  style={{ fontSize: 24 }}
                />
                <Text variant="caption" color="tertiary" style={{ fontSize: 10 }}>
                  left
                </Text>
              </View>
            </ProgressRing>

            <View style={styles.macros}>
              <MacroBar
                label="Protein"
                value={totals.protein}
                target={nutritionTargets.protein}
                color={macroColors.protein}
                delay={200}
              />
              <MacroBar
                label="Carbs"
                value={totals.carbs}
                target={nutritionTargets.carbs}
                color={macroColors.carbs}
                delay={260}
              />
              <MacroBar
                label="Fat"
                value={totals.fat}
                target={nutritionTargets.fat}
                color={macroColors.fat}
                delay={320}
              />
            </View>
          </View>

          <View style={styles.calorieFooter}>
            <Text variant="caption" color="tertiary">
              {Math.round(totals.calories)} of {nutritionTargets.calories} kcal
            </Text>
            {totals.calories > nutritionTargets.calories ? (
              <Text variant="caption" color="warn">
                {Math.round(totals.calories - nutritionTargets.calories)} over
              </Text>
            ) : null}
          </View>
        </Card>

        <Section title="Water">
          <Card padded index={1}>
            <View style={styles.waterRow}>
              <View style={{ flex: 1, gap: space.sm }}>
                <View style={styles.waterValue}>
                  <Icon name="droplet" size={16} color={palette.info} />
                  <AnimatedNumber
                    value={day?.waterMl ?? 0}
                    variant="numeric"
                    suffix=" ml"
                    style={{ fontSize: 18 }}
                  />
                  <Text variant="caption" color="tertiary">
                    / {nutritionTargets.waterMl} ml
                  </Text>
                </View>
                <ProgressBar
                  progress={(day?.waterMl ?? 0) / Math.max(1, nutritionTargets.waterMl)}
                  color={palette.info}
                  height={7}
                  delay={200}
                />
              </View>
            </View>

            <View style={styles.waterButtons}>
              {WATER_STEPS.map((ml) => (
                <PressableScale
                  key={ml}
                  onPress={async () => {
                    await addWater(ml, date);
                    haptics.light();
                    await reload();
                  }}
                  haptic="none"
                  scaleTo={0.93}
                  style={styles.waterButton}
                >
                  <Text variant="label" color="secondary">
                    +{ml}
                  </Text>
                </PressableScale>
              ))}
              <PressableScale
                onPress={async () => {
                  await addWater(-250, date);
                  haptics.light();
                  await reload();
                }}
                haptic="none"
                scaleTo={0.93}
                style={styles.waterButton}
                accessibilityLabel="Remove 250 millilitres"
              >
                <Icon name="minus" size={15} color={palette.textTertiary} />
              </PressableScale>
            </View>
          </Card>
        </Section>

        {MEAL_ORDER.map((meal, index) => {
          const entries = day?.byMeal[meal] ?? [];
          const mealCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);

          return (
            <View key={meal}>
              <Section
                title={MEAL_LABELS[meal]}
                action={
                  <Text variant="label" color="tertiary">
                    {Math.round(mealCalories)} kcal
                  </Text>
                }
              >
                <View style={{ gap: space.sm }}>
                  {entries.map((entry) => (
                    <Appear key={entry.id} from="fade" delay={0}>
                      <View style={styles.entryRow}>
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyStrong" numberOfLines={1}>
                            {entry.name}
                          </Text>
                          <Text variant="caption" color="tertiary">
                            {Math.round(entry.protein)}p · {Math.round(entry.carbs)}c ·{' '}
                            {Math.round(entry.fat)}f
                            {entry.servings !== 1 ? ` · ${entry.servings}×` : ''}
                          </Text>
                        </View>
                        <Text variant="numeric" style={{ fontSize: 15 }}>
                          {Math.round(entry.calories)}
                        </Text>
                        <IconButton
                          name="close"
                          accessibilityLabel={`Remove ${entry.name}`}
                          onPress={async () => {
                            await deleteEntry(entry.id);
                            haptics.warning();
                            await reload();
                          }}
                          size={28}
                          iconSize={13}
                          background="transparent"
                        />
                      </View>
                    </Appear>
                  ))}

                  <PressableScale
                    onPress={() => setAdding(meal)}
                    haptic="light"
                    scaleTo={0.97}
                    style={styles.addEntry}
                  >
                    <Icon name="plus" size={15} color={palette.textSecondary} strokeWidth={2.2} />
                    <Text variant="label" color="secondary">
                      Add to {MEAL_LABELS[meal].toLowerCase()}
                    </Text>
                  </PressableScale>
                </View>
              </Section>
            </View>
          );
        })}
      </Animated.ScrollView>

      <AddFoodSheet
        meal={adding}
        date={date}
        onClose={() => setAdding(null)}
        onLogged={async () => {
          setAdding(null);
          await reload();
        }}
      />
    </View>
  );
}

function MacroBar({
  label,
  value,
  target,
  color,
  delay,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  delay: number;
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.macroHeader}>
        <Text variant="caption" color="secondary">
          {label}
        </Text>
        <Text variant="caption" color="tertiary">
          {Math.round(value)}/{target}g
        </Text>
      </View>
      <ProgressBar progress={value / Math.max(1, target)} color={color} height={5} delay={delay} />
    </View>
  );
}

function AddFoodSheet({
  meal,
  date,
  onClose,
  onLogged,
}: {
  meal: MealSlot | null;
  date: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [manual, setManual] = useState(false);
  const [draft, setDraft] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  const load = useCallback(async () => {
    setFoods(await listFoods(query));
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => foods, [foods]);

  const logSaved = async (food: Food) => {
    if (!meal) return;
    await logEntry({
      date,
      meal,
      foodId: food.id,
      name: food.name,
      servings: 1,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    haptics.success();
    onLogged();
  };

  const logManual = async () => {
    if (!meal || !draft.name.trim()) return;
    const values = {
      calories: Number(draft.calories) || 0,
      protein: Number(draft.protein) || 0,
      carbs: Number(draft.carbs) || 0,
      fat: Number(draft.fat) || 0,
    };
    let foodId: string | null = null;
    if (saveToLibrary) {
      foodId = await saveFood({ name: draft.name, ...values });
    }
    await logEntry({ date, meal, foodId, name: draft.name, servings: 1, ...values });
    haptics.success();
    setDraft({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    setManual(false);
    onLogged();
  };

  return (
    <Sheet
      visible={meal !== null}
      onClose={onClose}
      title={meal ? `Add to ${MEAL_LABELS[meal].toLowerCase()}` : ''}
    >
      <View style={{ gap: space.base, paddingBottom: space.base }}>
        {manual ? (
          <>
            <Field
              label="Food"
              value={draft.name}
              onChangeText={(value) => setDraft((d) => ({ ...d, name: value }))}
              placeholder="e.g. Chicken and rice"
              autoCapitalize="sentences"
            />
            <View style={styles.macroGrid}>
              <Field
                label="Kcal"
                value={draft.calories}
                onChangeText={(value) => setDraft((d) => ({ ...d, calories: value }))}
                keyboardType="number-pad"
                placeholder="0"
                style={styles.macroField}
              />
              <Field
                label="Protein"
                value={draft.protein}
                onChangeText={(value) => setDraft((d) => ({ ...d, protein: value }))}
                keyboardType="number-pad"
                placeholder="0"
                style={styles.macroField}
              />
            </View>
            <View style={styles.macroGrid}>
              <Field
                label="Carbs"
                value={draft.carbs}
                onChangeText={(value) => setDraft((d) => ({ ...d, carbs: value }))}
                keyboardType="number-pad"
                placeholder="0"
                style={styles.macroField}
              />
              <Field
                label="Fat"
                value={draft.fat}
                onChangeText={(value) => setDraft((d) => ({ ...d, fat: value }))}
                keyboardType="number-pad"
                placeholder="0"
                style={styles.macroField}
              />
            </View>

            <PressableScale
              onPress={() => setSaveToLibrary((value) => !value)}
              haptic="selection"
              scaleTo={0.98}
              style={styles.toggleRow}
            >
              <View style={[styles.checkbox, saveToLibrary ? styles.checkboxOn : null]}>
                {saveToLibrary ? (
                  <Icon name="check" size={13} color={palette.textOnAccent} strokeWidth={2.6} />
                ) : null}
              </View>
              <Text variant="label" color="secondary">
                Save for one-tap logging later
              </Text>
            </PressableScale>

            <Button
              label="Log it"
              size="lg"
              fullWidth
              disabled={!draft.name.trim()}
              onPress={() => void logManual()}
            />
            <Button label="Back to saved foods" variant="ghost" fullWidth onPress={() => setManual(false)} />
          </>
        ) : (
          <>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search saved foods" />

            <View style={{ gap: space.sm, maxHeight: 320 }}>
              {filtered.length === 0 ? (
                <View style={styles.emptyFoods}>
                  <Text variant="body" color="tertiary" align="center">
                    {query ? 'No matches' : 'Nothing saved yet'}
                  </Text>
                  <Text variant="caption" color="tertiary" align="center">
                    Log something once and it will be here next time.
                  </Text>
                </View>
              ) : (
                filtered.slice(0, 6).map((food) => (
                  <PressableScale
                    key={food.id}
                    onPress={() => void logSaved(food)}
                    haptic="medium"
                    scaleTo={0.98}
                    style={styles.foodRow}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {food.name}
                      </Text>
                      <Text variant="caption" color="tertiary">
                        {Math.round(food.protein)}p · {Math.round(food.carbs)}c ·{' '}
                        {Math.round(food.fat)}f
                      </Text>
                    </View>
                    <Text variant="numeric" style={{ fontSize: 15 }}>
                      {Math.round(food.calories)}
                    </Text>
                    <Icon name="plus" size={16} color={palette.accent} strokeWidth={2.2} />
                  </PressableScale>
                ))
              )}
            </View>

            <Button label="Enter macros manually" icon="edit" fullWidth size="lg" onPress={() => setManual(true)} />
          </>
        )}
      </View>
    </Sheet>
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
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  ringCenter: {
    alignItems: 'center',
  },
  macros: {
    flex: 1,
    gap: space.md,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calorieFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waterButtons: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },
  waterButton: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingLeft: space.md,
    paddingRight: space.xs,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  addEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: palette.hairlineStrong,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  emptyFoods: {
    paddingVertical: space.xl,
    gap: 4,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: space.md,
  },
  macroField: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: palette.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
});
