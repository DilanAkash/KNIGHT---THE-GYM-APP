import { getDb } from '../client';
import type { Equipment, Exercise, MuscleGroup, TrackingMode } from '../types';
import { createId } from '@/lib/id';

interface ExerciseRow {
  id: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string;
  equipment: string;
  tracking: string;
  is_custom: number;
  is_favorite: number;
  cue: string | null;
  created_at: number;
}

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    primaryMuscle: row.primary_muscle as MuscleGroup,
    secondaryMuscles: row.secondary_muscles
      ? (row.secondary_muscles.split(',').filter(Boolean) as MuscleGroup[])
      : [],
    equipment: row.equipment as Equipment,
    tracking: row.tracking as TrackingMode,
    isCustom: row.is_custom === 1,
    isFavorite: row.is_favorite === 1,
    cue: row.cue,
    createdAt: row.created_at,
  };
}

export async function listExercises(): Promise<Exercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExerciseRow>(
    'SELECT * FROM exercises ORDER BY is_favorite DESC, name ASC;',
  );
  return rows.map(mapExercise);
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ExerciseRow>('SELECT * FROM exercises WHERE id = ?;', [id]);
  return row ? mapExercise(row) : null;
}

export async function toggleExerciseFavorite(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE exercises SET is_favorite = 1 - is_favorite WHERE id = ?;', [id]);
}

export async function createCustomExercise(input: {
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: Equipment;
  tracking?: TrackingMode;
  cue?: string | null;
}): Promise<string> {
  const db = await getDb();
  const id = createId('ex_c_');
  await db.runAsync(
    `INSERT INTO exercises
       (id, name, primary_muscle, secondary_muscles, equipment, tracking, is_custom, is_favorite, cue, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?);`,
    [
      id,
      input.name.trim(),
      input.primaryMuscle,
      (input.secondaryMuscles ?? []).join(','),
      input.equipment,
      input.tracking ?? 'weight_reps',
      input.cue ?? null,
      Date.now(),
    ],
  );
  return id;
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM exercises WHERE id = ? AND is_custom = 1;', [id]);
}

/**
 * The last time each exercise was performed, for the "last session" hint the
 * logger shows next to every set. One query beats N round trips mid-workout.
 */
export async function getLastPerformed(): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ exercise_id: string; last: number }>(
    `SELECT we.exercise_id AS exercise_id, MAX(w.started_at) AS last
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
      WHERE w.status = 'completed'
      GROUP BY we.exercise_id;`,
  );
  return new Map(rows.map((r) => [r.exercise_id, r.last]));
}

export interface PreviousSet {
  weight: number;
  reps: number;
  setIndex: number;
}

/**
 * Sets from the most recent completed session of this exercise. This is the
 * single most useful number in the whole app — it's what you're trying to beat.
 */
export async function getPreviousSets(exerciseId: string, excludeWorkoutId?: string): Promise<PreviousSet[]> {
  const db = await getDb();
  const previous = await db.getFirstAsync<{ id: string }>(
    `SELECT we.id AS id
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
      WHERE we.exercise_id = ?
        AND w.status = 'completed'
        AND (? IS NULL OR w.id != ?)
      ORDER BY w.started_at DESC
      LIMIT 1;`,
    [exerciseId, excludeWorkoutId ?? null, excludeWorkoutId ?? null],
  );
  if (!previous) return [];

  return db.getAllAsync<PreviousSet>(
    `SELECT weight, reps, set_index AS setIndex
       FROM sets
      WHERE workout_exercise_id = ? AND completed = 1 AND type != 'warmup'
      ORDER BY set_index ASC;`,
    [previous.id],
  );
}
