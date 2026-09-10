import { getDb } from '../client';
import type { Food, MealSlot, NutritionEntry } from '../types';
import { createId } from '@/lib/id';
import { dateKey } from '@/lib/date';

interface FoodRow {
  id: string;
  name: string;
  brand: string | null;
  serving_label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_favorite: number;
  times_used: number;
  created_at: number;
}

const mapFood = (row: FoodRow): Food => ({
  id: row.id,
  name: row.name,
  brand: row.brand,
  servingLabel: row.serving_label,
  calories: row.calories,
  protein: row.protein,
  carbs: row.carbs,
  fat: row.fat,
  isFavorite: row.is_favorite === 1,
  timesUsed: row.times_used,
  createdAt: row.created_at,
});

interface EntryRow {
  id: string;
  date: string;
  meal: string;
  food_id: string | null;
  name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: number;
}

const mapEntry = (row: EntryRow): NutritionEntry => ({
  id: row.id,
  date: row.date,
  meal: row.meal as MealSlot,
  foodId: row.food_id,
  name: row.name,
  servings: row.servings,
  calories: row.calories,
  protein: row.protein,
  carbs: row.carbs,
  fat: row.fat,
  createdAt: row.created_at,
});

/** Saved foods, most-used first — the whole point is one-tap re-logging. */
export async function listFoods(search = ''): Promise<Food[]> {
  const db = await getDb();
  if (search.trim()) {
    const rows = await db.getAllAsync<FoodRow>(
      `SELECT * FROM foods WHERE name LIKE ? OR brand LIKE ?
        ORDER BY is_favorite DESC, times_used DESC, name ASC LIMIT 60;`,
      [`%${search.trim()}%`, `%${search.trim()}%`],
    );
    return rows.map(mapFood);
  }
  const rows = await db.getAllAsync<FoodRow>(
    'SELECT * FROM foods ORDER BY is_favorite DESC, times_used DESC, name ASC LIMIT 60;',
  );
  return rows.map(mapFood);
}

export async function saveFood(input: {
  id?: string;
  name: string;
  brand?: string | null;
  servingLabel?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): Promise<string> {
  const db = await getDb();
  if (input.id) {
    await db.runAsync(
      `UPDATE foods SET name = ?, brand = ?, serving_label = ?, calories = ?, protein = ?, carbs = ?, fat = ?
        WHERE id = ?;`,
      [
        input.name.trim(),
        input.brand ?? null,
        input.servingLabel ?? '1 serving',
        input.calories,
        input.protein,
        input.carbs,
        input.fat,
        input.id,
      ],
    );
    return input.id;
  }
  const id = createId('fd_');
  await db.runAsync(
    `INSERT INTO foods (id, name, brand, serving_label, calories, protein, carbs, fat, is_favorite, times_used, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?);`,
    [
      id,
      input.name.trim(),
      input.brand ?? null,
      input.servingLabel ?? '1 serving',
      input.calories,
      input.protein,
      input.carbs,
      input.fat,
      Date.now(),
    ],
  );
  return id;
}

export async function toggleFoodFavorite(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE foods SET is_favorite = 1 - is_favorite WHERE id = ?;', [id]);
}

export async function deleteFood(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM foods WHERE id = ?;', [id]);
}

export async function logEntry(input: {
  date?: string;
  meal: MealSlot;
  foodId?: string | null;
  name: string;
  servings?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): Promise<string> {
  const db = await getDb();
  const id = createId('ne_');
  const servings = input.servings ?? 1;
  await db.runAsync(
    `INSERT INTO nutrition_entries (id, date, meal, food_id, name, servings, calories, protein, carbs, fat, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.date ?? dateKey(),
      input.meal,
      input.foodId ?? null,
      input.name.trim(),
      servings,
      input.calories * servings,
      input.protein * servings,
      input.carbs * servings,
      input.fat * servings,
      Date.now(),
    ],
  );
  if (input.foodId) {
    await db.runAsync('UPDATE foods SET times_used = times_used + 1 WHERE id = ?;', [input.foodId]);
  }
  return id;
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM nutrition_entries WHERE id = ?;', [id]);
}

export interface DayNutrition {
  date: string;
  entries: NutritionEntry[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  byMeal: Record<MealSlot, NutritionEntry[]>;
  waterMl: number;
}

export async function getDayNutrition(date = dateKey()): Promise<DayNutrition> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM nutrition_entries WHERE date = ? ORDER BY created_at ASC;',
    [date],
  );
  const entries = rows.map(mapEntry);

  const byMeal: Record<MealSlot, NutritionEntry[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const entry of entries) {
    byMeal[entry.meal].push(entry);
    totals.calories += entry.calories;
    totals.protein += entry.protein;
    totals.carbs += entry.carbs;
    totals.fat += entry.fat;
  }

  const water = await db.getFirstAsync<{ ml: number }>('SELECT ml FROM water_log WHERE date = ?;', [date]);

  return { date, entries, totals, byMeal, waterMl: water?.ml ?? 0 };
}

export async function addWater(ml: number, date = dateKey()): Promise<number> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO water_log (date, ml) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET ml = MAX(0, ml + excluded.ml);`,
    [date, ml],
  );
  const row = await db.getFirstAsync<{ ml: number }>('SELECT ml FROM water_log WHERE date = ?;', [date]);
  return row?.ml ?? 0;
}

export interface NutritionDayTotal {
  date: string;
  calories: number;
  protein: number;
}

export async function getNutritionHistory(days = 14): Promise<NutritionDayTotal[]> {
  const db = await getDb();
  return db.getAllAsync<NutritionDayTotal>(
    `SELECT date, SUM(calories) AS calories, SUM(protein) AS protein
       FROM nutrition_entries
      GROUP BY date
      ORDER BY date DESC
      LIMIT ?;`,
    [days],
  );
}

export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export const MEAL_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
