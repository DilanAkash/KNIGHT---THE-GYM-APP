import { getDb } from '../client';
import type { Exercise, Routine, RoutineDay, RoutineExercise } from '../types';
import { createId } from '@/lib/id';

interface RoutineRow {
  id: string;
  name: string;
  description: string | null;
  is_archived: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

const mapRoutine = (row: RoutineRow): Routine => ({
  id: row.id,
  name: row.name,
  description: row.description,
  isArchived: row.is_archived === 1,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface DayExerciseDetail extends RoutineExercise {
  exercise: Exercise;
}

export interface RoutineDayDetail extends RoutineDay {
  exercises: DayExerciseDetail[];
}

export interface RoutineDetail extends Routine {
  days: RoutineDayDetail[];
}

export async function listRoutines(): Promise<Routine[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RoutineRow>(
    'SELECT * FROM routines WHERE is_archived = 0 ORDER BY sort_order ASC, created_at ASC;',
  );
  return rows.map(mapRoutine);
}

interface JoinedRow {
  re_id: string | null;
  day_id: string;
  day_name: string;
  day_sort: number;
  exercise_id: string | null;
  sort_order: number | null;
  target_sets: number | null;
  reps_low: number | null;
  reps_high: number | null;
  rest_seconds: number | null;
  superset_group: string | null;
  notes: string | null;
  ex_name: string | null;
  ex_primary: string | null;
  ex_secondary: string | null;
  ex_equipment: string | null;
  ex_tracking: string | null;
  ex_custom: number | null;
  ex_favorite: number | null;
  ex_cue: string | null;
}

/** One query for the whole routine tree — routines screens open instantly. */
export async function getRoutineDetail(routineId: string): Promise<RoutineDetail | null> {
  const db = await getDb();
  const routineRow = await db.getFirstAsync<RoutineRow>('SELECT * FROM routines WHERE id = ?;', [
    routineId,
  ]);
  if (!routineRow) return null;

  const rows = await db.getAllAsync<JoinedRow>(
    `SELECT rd.id AS day_id, rd.name AS day_name, rd.sort_order AS day_sort,
            re.id AS re_id, re.exercise_id, re.sort_order, re.target_sets,
            re.reps_low, re.reps_high, re.rest_seconds, re.superset_group, re.notes,
            e.name AS ex_name, e.primary_muscle AS ex_primary, e.secondary_muscles AS ex_secondary,
            e.equipment AS ex_equipment, e.tracking AS ex_tracking, e.is_custom AS ex_custom,
            e.is_favorite AS ex_favorite, e.cue AS ex_cue
       FROM routine_days rd
       LEFT JOIN routine_exercises re ON re.day_id = rd.id
       LEFT JOIN exercises e ON e.id = re.exercise_id
      WHERE rd.routine_id = ?
      ORDER BY rd.sort_order ASC, re.sort_order ASC;`,
    [routineId],
  );

  const dayMap = new Map<string, RoutineDayDetail>();
  for (const row of rows) {
    let day = dayMap.get(row.day_id);
    if (!day) {
      day = {
        id: row.day_id,
        routineId,
        name: row.day_name,
        sortOrder: row.day_sort,
        exercises: [],
      };
      dayMap.set(row.day_id, day);
    }
    if (!row.re_id || !row.exercise_id || !row.ex_name) continue;
    day.exercises.push({
      id: row.re_id,
      dayId: row.day_id,
      exerciseId: row.exercise_id,
      sortOrder: row.sort_order ?? 0,
      targetSets: row.target_sets ?? 3,
      repsLow: row.reps_low ?? 8,
      repsHigh: row.reps_high ?? 12,
      restSeconds: row.rest_seconds ?? 120,
      supersetGroup: row.superset_group,
      notes: row.notes,
      exercise: {
        id: row.exercise_id,
        name: row.ex_name,
        primaryMuscle: row.ex_primary as never,
        secondaryMuscles: row.ex_secondary ? (row.ex_secondary.split(',').filter(Boolean) as never) : [],
        equipment: row.ex_equipment as never,
        tracking: row.ex_tracking as never,
        isCustom: row.ex_custom === 1,
        isFavorite: row.ex_favorite === 1,
        cue: row.ex_cue,
        createdAt: 0,
      },
    });
  }

  return { ...mapRoutine(routineRow), days: [...dayMap.values()] };
}

export async function listRoutineDays(routineId: string): Promise<RoutineDay[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; routine_id: string; name: string; sort_order: number }>(
    'SELECT * FROM routine_days WHERE routine_id = ? ORDER BY sort_order ASC;',
    [routineId],
  );
  return rows.map((r) => ({ id: r.id, routineId: r.routine_id, name: r.name, sortOrder: r.sort_order }));
}

export async function createRoutine(name: string, description?: string): Promise<string> {
  const db = await getDb();
  const id = createId('rt_');
  const now = Date.now();
  const max = await db.getFirstAsync<{ max: number | null }>('SELECT MAX(sort_order) AS max FROM routines;');
  await db.runAsync(
    `INSERT INTO routines (id, name, description, is_archived, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?);`,
    [id, name.trim(), description ?? null, (max?.max ?? -1) + 1, now, now],
  );
  return id;
}

export async function renameRoutine(routineId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE routines SET name = ?, updated_at = ? WHERE id = ?;', [
    name.trim(),
    Date.now(),
    routineId,
  ]);
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM routines WHERE id = ?;', [routineId]);
}

export async function addRoutineDay(routineId: string, name: string): Promise<string> {
  const db = await getDb();
  const id = createId('rd_');
  const max = await db.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(sort_order) AS max FROM routine_days WHERE routine_id = ?;',
    [routineId],
  );
  await db.runAsync('INSERT INTO routine_days (id, routine_id, name, sort_order) VALUES (?, ?, ?, ?);', [
    id,
    routineId,
    name.trim(),
    (max?.max ?? -1) + 1,
  ]);
  return id;
}

export async function renameRoutineDay(dayId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE routine_days SET name = ? WHERE id = ?;', [name.trim(), dayId]);
}

export async function deleteRoutineDay(dayId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM routine_days WHERE id = ?;', [dayId]);
}

export async function addExerciseToDay(
  dayId: string,
  exerciseId: string,
  defaults: Partial<Pick<RoutineExercise, 'targetSets' | 'repsLow' | 'repsHigh' | 'restSeconds'>> = {},
): Promise<string> {
  const db = await getDb();
  const id = createId('re_');
  const max = await db.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(sort_order) AS max FROM routine_exercises WHERE day_id = ?;',
    [dayId],
  );
  await db.runAsync(
    `INSERT INTO routine_exercises
       (id, day_id, exercise_id, sort_order, target_sets, reps_low, reps_high, rest_seconds, superset_group, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL);`,
    [
      id,
      dayId,
      exerciseId,
      (max?.max ?? -1) + 1,
      defaults.targetSets ?? 3,
      defaults.repsLow ?? 8,
      defaults.repsHigh ?? 12,
      defaults.restSeconds ?? 120,
    ],
  );
  return id;
}

export async function updateRoutineExercise(
  id: string,
  patch: Partial<Pick<RoutineExercise, 'targetSets' | 'repsLow' | 'repsHigh' | 'restSeconds' | 'notes'>>,
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  const map: Record<string, string> = {
    targetSets: 'target_sets',
    repsLow: 'reps_low',
    repsHigh: 'reps_high',
    restSeconds: 'rest_seconds',
    notes: 'notes',
  };
  for (const [key, column] of Object.entries(map)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    fields.push(`${column} = ?`);
    values.push(value as string | number | null);
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE routine_exercises SET ${fields.join(', ')} WHERE id = ?;`, values);
}

export async function removeRoutineExercise(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM routine_exercises WHERE id = ?;', [id]);
}

/** Persists a full drag-to-reorder result in one transaction. */
export async function reorderDayExercises(dayId: string, orderedIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await db.runAsync('UPDATE routine_exercises SET sort_order = ? WHERE id = ? AND day_id = ?;', [
        i,
        orderedIds[i]!,
        dayId,
      ]);
    }
  });
}
