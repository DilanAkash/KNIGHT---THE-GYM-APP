import { getDb } from '../client';
import type {
  Exercise,
  PersonalRecord,
  PrType,
  SetType,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '../types';
import { createId } from '@/lib/id';
import { estimateOneRepMax, setVolume } from '@/lib/strength';
import { getRoutineDetail } from './routines';

interface WorkoutRow {
  id: string;
  routine_day_id: string | null;
  name: string;
  started_at: number;
  ended_at: number | null;
  duration_seconds: number;
  notes: string | null;
  total_volume: number;
  status: string;
}

const mapWorkout = (row: WorkoutRow): Workout => ({
  id: row.id,
  routineDayId: row.routine_day_id,
  name: row.name,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  durationSeconds: row.duration_seconds,
  notes: row.notes,
  totalVolume: row.total_volume,
  status: row.status as Workout['status'],
});

export interface WorkoutExerciseDetail extends WorkoutExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
  /** Target range carried over from the routine, shown as a ghost hint. */
  targetSets: number | null;
  repsLow: number | null;
  repsHigh: number | null;
}

export interface WorkoutDetail extends Workout {
  exercises: WorkoutExerciseDetail[];
}

export async function getActiveWorkout(): Promise<Workout | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<WorkoutRow>(
    `SELECT * FROM workouts WHERE status = 'active' ORDER BY started_at DESC LIMIT 1;`,
  );
  return row ? mapWorkout(row) : null;
}

/**
 * Starts a session. Passing a routine day pre-builds every exercise and its
 * empty sets so you can walk in and start typing numbers immediately.
 */
export async function startWorkout(options: {
  routineDayId?: string | null;
  name?: string;
}): Promise<string> {
  const db = await getDb();
  const workoutId = createId('w_');
  const now = Date.now();
  let name = options.name ?? 'Empty Session';

  let planned: {
    exerciseId: string;
    sets: number;
    repsLow: number;
    repsHigh: number;
    rest: number;
    supersetGroup: string | null;
  }[] = [];

  if (options.routineDayId) {
    const day = await db.getFirstAsync<{ name: string; routine_id: string }>(
      'SELECT name, routine_id FROM routine_days WHERE id = ?;',
      [options.routineDayId],
    );
    if (day) {
      name = options.name ?? day.name;
      const detail = await getRoutineDetail(day.routine_id);
      const dayDetail = detail?.days.find((d) => d.id === options.routineDayId);
      planned =
        dayDetail?.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.targetSets,
          repsLow: ex.repsLow,
          repsHigh: ex.repsHigh,
          rest: ex.restSeconds,
          supersetGroup: ex.supersetGroup,
        })) ?? [];
    }
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO workouts (id, routine_day_id, name, started_at, ended_at, duration_seconds, notes, total_volume, status)
       VALUES (?, ?, ?, ?, NULL, 0, NULL, 0, 'active');`,
      [workoutId, options.routineDayId ?? null, name, now],
    );

    for (let i = 0; i < planned.length; i += 1) {
      const item = planned[i]!;
      const wexId = createId('wx_');
      await db.runAsync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, sort_order, notes, superset_group, rest_seconds)
         VALUES (?, ?, ?, ?, NULL, ?, ?);`,
        [wexId, workoutId, item.exerciseId, i, item.supersetGroup, item.rest],
      );
      for (let s = 0; s < item.sets; s += 1) {
        await db.runAsync(
          `INSERT INTO sets (id, workout_exercise_id, set_index, weight, reps, rpe, type, completed, completed_at)
           VALUES (?, ?, ?, 0, 0, NULL, 'normal', 0, NULL);`,
          [createId('s_'), wexId, s],
        );
      }
    }
  });

  return workoutId;
}

export async function getWorkoutDetail(workoutId: string): Promise<WorkoutDetail | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?;', [workoutId]);
  if (!row) return null;

  const exerciseRows = await db.getAllAsync<{
    id: string;
    exercise_id: string;
    sort_order: number;
    notes: string | null;
    superset_group: string | null;
    rest_seconds: number;
    name: string;
    primary_muscle: string;
    secondary_muscles: string;
    equipment: string;
    tracking: string;
    is_custom: number;
    is_favorite: number;
    cue: string | null;
  }>(
    `SELECT we.id, we.exercise_id, we.sort_order, we.notes, we.superset_group, we.rest_seconds,
            e.name, e.primary_muscle, e.secondary_muscles, e.equipment, e.tracking,
            e.is_custom, e.is_favorite, e.cue
       FROM workout_exercises we
       JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = ?
      ORDER BY we.sort_order ASC;`,
    [workoutId],
  );

  const setRows = await db.getAllAsync<{
    id: string;
    workout_exercise_id: string;
    set_index: number;
    weight: number;
    reps: number;
    rpe: number | null;
    type: string;
    completed: number;
    completed_at: number | null;
  }>(
    `SELECT s.* FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
      WHERE we.workout_id = ?
      ORDER BY s.set_index ASC;`,
    [workoutId],
  );

  const setsByExercise = new Map<string, WorkoutSet[]>();
  for (const s of setRows) {
    const list = setsByExercise.get(s.workout_exercise_id) ?? [];
    list.push({
      id: s.id,
      workoutExerciseId: s.workout_exercise_id,
      setIndex: s.set_index,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
      type: s.type as SetType,
      completed: s.completed === 1,
      completedAt: s.completed_at,
    });
    setsByExercise.set(s.workout_exercise_id, list);
  }

  // Target ranges live on the routine, not the session — look them up once.
  const targets = new Map<string, { sets: number; low: number; high: number }>();
  if (row.routine_day_id) {
    const targetRows = await db.getAllAsync<{
      exercise_id: string;
      target_sets: number;
      reps_low: number;
      reps_high: number;
    }>(
      'SELECT exercise_id, target_sets, reps_low, reps_high FROM routine_exercises WHERE day_id = ?;',
      [row.routine_day_id],
    );
    for (const t of targetRows) {
      targets.set(t.exercise_id, { sets: t.target_sets, low: t.reps_low, high: t.reps_high });
    }
  }

  const exercises: WorkoutExerciseDetail[] = exerciseRows.map((r) => {
    const target = targets.get(r.exercise_id);
    return {
      id: r.id,
      workoutId,
      exerciseId: r.exercise_id,
      sortOrder: r.sort_order,
      notes: r.notes,
      supersetGroup: r.superset_group,
      restSeconds: r.rest_seconds,
      targetSets: target?.sets ?? null,
      repsLow: target?.low ?? null,
      repsHigh: target?.high ?? null,
      sets: setsByExercise.get(r.id) ?? [],
      exercise: {
        id: r.exercise_id,
        name: r.name,
        primaryMuscle: r.primary_muscle as never,
        secondaryMuscles: r.secondary_muscles ? (r.secondary_muscles.split(',').filter(Boolean) as never) : [],
        equipment: r.equipment as never,
        tracking: r.tracking as never,
        isCustom: r.is_custom === 1,
        isFavorite: r.is_favorite === 1,
        cue: r.cue,
        createdAt: 0,
      },
    };
  });

  return { ...mapWorkout(row), exercises };
}

export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
  initialSets = 3,
): Promise<string> {
  const db = await getDb();
  const id = createId('wx_');
  const max = await db.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(sort_order) AS max FROM workout_exercises WHERE workout_id = ?;',
    [workoutId],
  );
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, sort_order, notes, superset_group, rest_seconds)
       VALUES (?, ?, ?, ?, NULL, NULL, 120);`,
      [id, workoutId, exerciseId, (max?.max ?? -1) + 1],
    );
    for (let s = 0; s < initialSets; s += 1) {
      await db.runAsync(
        `INSERT INTO sets (id, workout_exercise_id, set_index, weight, reps, rpe, type, completed, completed_at)
         VALUES (?, ?, ?, 0, 0, NULL, 'normal', 0, NULL);`,
        [createId('s_'), id, s],
      );
    }
  });
  return id;
}

export async function removeWorkoutExercise(workoutExerciseId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM workout_exercises WHERE id = ?;', [workoutExerciseId]);
}

export async function setWorkoutExerciseNotes(id: string, notes: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE workout_exercises SET notes = ? WHERE id = ?;', [notes, id]);
}

export async function setWorkoutExerciseRest(id: string, seconds: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE workout_exercises SET rest_seconds = ? WHERE id = ?;', [seconds, id]);
}

/** Copies the last set's numbers so adding a set doesn't mean retyping them. */
export async function addSet(workoutExerciseId: string): Promise<string> {
  const db = await getDb();
  const last = await db.getFirstAsync<{ set_index: number; weight: number; reps: number; type: string }>(
    'SELECT set_index, weight, reps, type FROM sets WHERE workout_exercise_id = ? ORDER BY set_index DESC LIMIT 1;',
    [workoutExerciseId],
  );
  const id = createId('s_');
  await db.runAsync(
    `INSERT INTO sets (id, workout_exercise_id, set_index, weight, reps, rpe, type, completed, completed_at)
     VALUES (?, ?, ?, ?, ?, NULL, 'normal', 0, NULL);`,
    [id, workoutExerciseId, (last?.set_index ?? -1) + 1, last?.weight ?? 0, last?.reps ?? 0],
  );
  return id;
}

export async function updateSet(
  setId: string,
  patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'rpe' | 'type' | 'completed'>>,
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.weight !== undefined) {
    fields.push('weight = ?');
    values.push(patch.weight);
  }
  if (patch.reps !== undefined) {
    fields.push('reps = ?');
    values.push(patch.reps);
  }
  if (patch.rpe !== undefined) {
    fields.push('rpe = ?');
    values.push(patch.rpe);
  }
  if (patch.type !== undefined) {
    fields.push('type = ?');
    values.push(patch.type);
  }
  if (patch.completed !== undefined) {
    fields.push('completed = ?', 'completed_at = ?');
    values.push(patch.completed ? 1 : 0, patch.completed ? Date.now() : null);
  }
  if (fields.length === 0) return;

  values.push(setId);
  await db.runAsync(`UPDATE sets SET ${fields.join(', ')} WHERE id = ?;`, values);
}

export async function deleteSet(setId: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ workout_exercise_id: string }>(
    'SELECT workout_exercise_id FROM sets WHERE id = ?;',
    [setId],
  );
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sets WHERE id = ?;', [setId]);
    if (row) {
      // Re-index so set numbers stay 1..n with no gaps.
      const remaining = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM sets WHERE workout_exercise_id = ? ORDER BY set_index ASC;',
        [row.workout_exercise_id],
      );
      for (let i = 0; i < remaining.length; i += 1) {
        await db.runAsync('UPDATE sets SET set_index = ? WHERE id = ?;', [i, remaining[i]!.id]);
      }
    }
  });
}

export async function reorderWorkoutExercises(workoutId: string, orderedIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await db.runAsync('UPDATE workout_exercises SET sort_order = ? WHERE id = ? AND workout_id = ?;', [
        i,
        orderedIds[i]!,
        workoutId,
      ]);
    }
  });
}

export interface NewRecord extends PersonalRecord {
  exerciseName: string;
  /** Value of the record this beat, or null if it's the first one logged. */
  previousValue: number | null;
}

export interface FinishResult {
  workoutId: string;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  durationSeconds: number;
  records: NewRecord[];
}

/**
 * Closes the session: drops empty sets, totals volume, and works out which
 * records fell. PR detection runs here rather than per-set so a mid-workout
 * correction can't fire a false celebration.
 */
export async function finishWorkout(workoutId: string, durationSeconds: number): Promise<FinishResult> {
  const db = await getDb();
  const now = Date.now();

  await db.runAsync(
    `DELETE FROM sets
      WHERE workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = ?)
        AND completed = 0;`,
    [workoutId],
  );
  await db.runAsync(
    `DELETE FROM workout_exercises
      WHERE workout_id = ?
        AND id NOT IN (SELECT DISTINCT workout_exercise_id FROM sets);`,
    [workoutId],
  );

  const rows = await db.getAllAsync<{
    exercise_id: string;
    exercise_name: string;
    weight: number;
    reps: number;
    type: string;
  }>(
    `SELECT we.exercise_id, e.name AS exercise_name, s.weight, s.reps, s.type
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = ? AND s.completed = 1;`,
    [workoutId],
  );

  let totalVolume = 0;
  let totalReps = 0;
  const best = new Map<
    string,
    { name: string; e1rm: number; weight: number; volume: number; bestWeightReps: number; e1rmWeight: number; e1rmReps: number }
  >();

  for (const row of rows) {
    const volume = setVolume(row.weight, row.reps);
    totalVolume += volume;
    totalReps += row.reps;
    if (row.type === 'warmup') continue;

    const e1rm = estimateOneRepMax(row.weight, row.reps);
    const entry = best.get(row.exercise_id) ?? {
      name: row.exercise_name,
      e1rm: 0,
      weight: 0,
      volume: 0,
      bestWeightReps: 0,
      e1rmWeight: 0,
      e1rmReps: 0,
    };
    entry.volume += volume;
    if (e1rm > entry.e1rm) {
      entry.e1rm = e1rm;
      entry.e1rmWeight = row.weight;
      entry.e1rmReps = row.reps;
    }
    if (row.weight > entry.weight) {
      entry.weight = row.weight;
      entry.bestWeightReps = row.reps;
    }
    best.set(row.exercise_id, entry);
  }

  const records: NewRecord[] = [];

  await db.withTransactionAsync(async () => {
    for (const [exerciseId, entry] of best) {
      const candidates: { type: PrType; value: number; weight: number; reps: number }[] = [
        { type: 'e1rm', value: entry.e1rm, weight: entry.e1rmWeight, reps: entry.e1rmReps },
        { type: 'weight', value: entry.weight, weight: entry.weight, reps: entry.bestWeightReps },
        { type: 'volume', value: entry.volume, weight: 0, reps: 0 },
      ];

      for (const candidate of candidates) {
        if (candidate.value <= 0) continue;
        const existing = await db.getFirstAsync<{ value: number }>(
          'SELECT value FROM personal_records WHERE exercise_id = ? AND type = ? ORDER BY value DESC LIMIT 1;',
          [exerciseId, candidate.type],
        );
        // Small epsilon so a re-entered identical number doesn't count.
        if (existing && candidate.value <= existing.value + 1e-6) continue;

        const record: PersonalRecord = {
          id: createId('pr_'),
          exerciseId,
          type: candidate.type,
          value: candidate.value,
          weight: candidate.weight,
          reps: candidate.reps,
          workoutId,
          achievedAt: now,
        };
        await db.runAsync(
          `INSERT INTO personal_records
             (id, exercise_id, type, value, weight, reps, workout_id, achieved_at, is_baseline)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            record.id,
            record.exerciseId,
            record.type,
            record.value,
            record.weight,
            record.reps,
            record.workoutId,
            record.achievedAt,
            existing ? 0 : 1,
          ],
        );
        // The first time an exercise is logged it sets a baseline, not a
        // record — you haven't beaten anything yet. Store it so the next
        // session has something to compare against, but don't celebrate it.
        if (existing) {
          records.push({ ...record, exerciseName: entry.name, previousValue: existing.value });
        }
      }
    }

    await db.runAsync(
      `UPDATE workouts
          SET status = 'completed', ended_at = ?, duration_seconds = ?, total_volume = ?
        WHERE id = ?;`,
      [now, durationSeconds, totalVolume, workoutId],
    );
  });

  return {
    workoutId,
    totalVolume,
    totalSets: rows.filter((r) => r.type !== 'warmup').length,
    totalReps,
    durationSeconds,
    records: headlineRecords(records),
  };
}

/**
 * One record per exercise for the summary.
 *
 * A heavy top set usually breaks e1RM, heaviest-weight and session-volume at
 * once. Three cards saying the same thing about one lift devalues all of them,
 * so only the most meaningful survives.
 */
const RECORD_PRIORITY: Record<PrType, number> = { e1rm: 0, weight: 1, reps: 2, volume: 3 };

function headlineRecords(records: NewRecord[]): NewRecord[] {
  const best = new Map<string, NewRecord>();
  for (const record of records) {
    const current = best.get(record.exerciseId);
    if (!current || RECORD_PRIORITY[record.type] < RECORD_PRIORITY[current.type]) {
      best.set(record.exerciseId, record);
    }
  }
  return [...best.values()].sort(
    (a, b) => RECORD_PRIORITY[a.type] - RECORD_PRIORITY[b.type] || b.value - a.value,
  );
}

export async function discardWorkout(workoutId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM workouts WHERE id = ?;', [workoutId]);
}

export async function setWorkoutNotes(workoutId: string, notes: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE workouts SET notes = ? WHERE id = ?;', [notes, workoutId]);
}

export interface WorkoutSummary extends Workout {
  exerciseCount: number;
  setCount: number;
  prCount: number;
}

export async function listWorkouts(limit = 50, offset = 0): Promise<WorkoutSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<WorkoutRow & { exercise_count: number; set_count: number; pr_count: number }>(
    `SELECT w.*,
            (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id) AS exercise_count,
            (SELECT COUNT(*) FROM sets s
               JOIN workout_exercises we2 ON we2.id = s.workout_exercise_id
              WHERE we2.workout_id = w.id AND s.completed = 1) AS set_count,
            (SELECT COUNT(DISTINCT pr.exercise_id) FROM personal_records pr
              WHERE pr.workout_id = w.id AND pr.is_baseline = 0) AS pr_count
       FROM workouts w
      WHERE w.status = 'completed'
      ORDER BY w.started_at DESC
      LIMIT ? OFFSET ?;`,
    [limit, offset],
  );
  return rows.map((r) => ({
    ...mapWorkout(r),
    exerciseCount: r.exercise_count,
    setCount: r.set_count,
    prCount: r.pr_count,
  }));
}

export interface CompletedSummary {
  workout: Workout;
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
  records: NewRecord[];
  /** Per-exercise breakdown for the summary list. */
  breakdown: { name: string; sets: number; volume: number; topSet: string }[];
}

/**
 * Rebuilds a finished session for the summary screen.
 *
 * Queried fresh rather than passed through navigation params so the screen
 * also works when opened later from history.
 */
export async function getCompletedSummary(workoutId: string): Promise<CompletedSummary | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?;', [workoutId]);
  if (!row) return null;

  const sets = await db.getAllAsync<{
    name: string;
    weight: number;
    reps: number;
    type: string;
    exercise_id: string;
  }>(
    `SELECT e.name, s.weight, s.reps, s.type, we.exercise_id
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = ? AND s.completed = 1
      ORDER BY we.sort_order ASC, s.set_index ASC;`,
    [workoutId],
  );

  const grouped = new Map<string, { name: string; sets: number; volume: number; best: number; bestReps: number }>();
  let totalReps = 0;

  for (const set of sets) {
    totalReps += set.reps;
    const entry = grouped.get(set.exercise_id) ?? {
      name: set.name,
      sets: 0,
      volume: 0,
      best: 0,
      bestReps: 0,
    };
    entry.sets += 1;
    entry.volume += set.weight * set.reps;
    if (set.weight > entry.best) {
      entry.best = set.weight;
      entry.bestReps = set.reps;
    }
    grouped.set(set.exercise_id, entry);
  }

  const recordRows = await db.getAllAsync<{
    id: string;
    exercise_id: string;
    type: string;
    value: number;
    weight: number;
    reps: number;
    achieved_at: number;
    name: string;
  }>(
    `SELECT pr.*, e.name FROM personal_records pr
       JOIN exercises e ON e.id = pr.exercise_id
      WHERE pr.workout_id = ? AND pr.is_baseline = 0
      ORDER BY pr.value DESC;`,
    [workoutId],
  );

  return {
    workout: mapWorkout(row),
    totalSets: sets.length,
    totalReps,
    exerciseCount: grouped.size,
    records: headlineRecords(
      recordRows.map((r) => ({
        id: r.id,
        exerciseId: r.exercise_id,
        type: r.type as PrType,
        value: r.value,
        weight: r.weight,
        reps: r.reps,
        workoutId,
        achievedAt: r.achieved_at,
        exerciseName: r.name,
        previousValue: null,
      })),
    ),
    breakdown: [...grouped.values()].map((entry) => ({
      name: entry.name,
      sets: entry.sets,
      volume: entry.volume,
      topSet: entry.best > 0 ? `${trimNumber(entry.best)} × ${entry.bestReps}` : `${entry.bestReps} reps`,
    })),
  };
}

const trimNumber = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
