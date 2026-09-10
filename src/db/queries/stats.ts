import { getDb } from '../client';
import type { MuscleGroup, PrType } from '../types';
import { addDays, dateKey, startOfDay, startOfWeek } from '@/lib/date';
import { estimateOneRepMax } from '@/lib/strength';

export interface TrainingOverview {
  totalWorkouts: number;
  workoutsThisWeek: number;
  currentStreakWeeks: number;
  totalVolume: number;
  volumeThisWeek: number;
  volumeLastWeek: number;
  totalSets: number;
  lastWorkoutAt: number | null;
}

export async function getOverview(): Promise<TrainingOverview> {
  const db = await getDb();
  const weekStart = startOfWeek().getTime();
  const lastWeekStart = addDays(startOfWeek(), -7).getTime();

  const totals = await db.getFirstAsync<{
    count: number;
    volume: number | null;
    last: number | null;
  }>(
    `SELECT COUNT(*) AS count, SUM(total_volume) AS volume, MAX(started_at) AS last
       FROM workouts WHERE status = 'completed';`,
  );

  const thisWeek = await db.getFirstAsync<{ count: number; volume: number | null }>(
    `SELECT COUNT(*) AS count, SUM(total_volume) AS volume
       FROM workouts WHERE status = 'completed' AND started_at >= ?;`,
    [weekStart],
  );

  const lastWeek = await db.getFirstAsync<{ volume: number | null }>(
    `SELECT SUM(total_volume) AS volume
       FROM workouts WHERE status = 'completed' AND started_at >= ? AND started_at < ?;`,
    [lastWeekStart, weekStart],
  );

  const sets = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
      WHERE w.status = 'completed' AND s.completed = 1;`,
  );

  return {
    totalWorkouts: totals?.count ?? 0,
    workoutsThisWeek: thisWeek?.count ?? 0,
    currentStreakWeeks: await getWeekStreak(),
    totalVolume: totals?.volume ?? 0,
    volumeThisWeek: thisWeek?.volume ?? 0,
    volumeLastWeek: lastWeek?.volume ?? 0,
    totalSets: sets?.count ?? 0,
    lastWorkoutAt: totals?.last ?? null,
  };
}

/**
 * Consecutive weeks with at least one session, counting back from this week.
 * Weeks rather than days on purpose — a daily streak punishes rest days, which
 * is exactly the wrong incentive for lifting.
 */
export async function getWeekStreak(): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ started_at: number }>(
    `SELECT started_at FROM workouts WHERE status = 'completed' ORDER BY started_at DESC LIMIT 400;`,
  );
  if (rows.length === 0) return 0;

  const weeks = new Set(rows.map((r) => startOfWeek(new Date(r.started_at)).getTime()));
  let streak = 0;
  let cursor = startOfWeek();

  // This week not being trained yet shouldn't break a streak mid-week.
  if (!weeks.has(cursor.getTime())) {
    cursor = addDays(cursor, -7);
    if (!weeks.has(cursor.getTime())) return 0;
  }

  while (weeks.has(cursor.getTime())) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export interface VolumePoint {
  /** Monday of the week, as a date key. */
  weekStart: string;
  volume: number;
  workouts: number;
}

export async function getWeeklyVolume(weeks = 12): Promise<VolumePoint[]> {
  const db = await getDb();
  const since = addDays(startOfWeek(), -(weeks - 1) * 7);
  const rows = await db.getAllAsync<{ started_at: number; total_volume: number }>(
    `SELECT started_at, total_volume FROM workouts
      WHERE status = 'completed' AND started_at >= ?
      ORDER BY started_at ASC;`,
    [since.getTime()],
  );

  const buckets = new Map<string, VolumePoint>();
  for (let i = 0; i < weeks; i += 1) {
    const start = addDays(since, i * 7);
    buckets.set(dateKey(start), { weekStart: dateKey(start), volume: 0, workouts: 0 });
  }
  for (const row of rows) {
    const key = dateKey(startOfWeek(new Date(row.started_at)));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.volume += row.total_volume;
    bucket.workouts += 1;
  }
  return [...buckets.values()];
}

export interface MuscleLoad {
  muscle: MuscleGroup;
  sets: number;
  volume: number;
}

/**
 * Weighted set counts per muscle. A secondary muscle gets half credit — it's
 * doing real work on a compound but not the same work as the prime mover.
 */
export async function getMuscleLoad(days = 7): Promise<MuscleLoad[]> {
  const db = await getDb();
  const since = addDays(startOfDay(), -(days - 1)).getTime();
  const rows = await db.getAllAsync<{
    primary_muscle: string;
    secondary_muscles: string;
    weight: number;
    reps: number;
  }>(
    `SELECT e.primary_muscle, e.secondary_muscles, s.weight, s.reps
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
       JOIN exercises e ON e.id = we.exercise_id
      WHERE w.status = 'completed' AND w.started_at >= ? AND s.completed = 1 AND s.type != 'warmup';`,
    [since],
  );

  const map = new Map<MuscleGroup, MuscleLoad>();
  const bump = (muscle: MuscleGroup, setWeight: number, volume: number) => {
    const entry = map.get(muscle) ?? { muscle, sets: 0, volume: 0 };
    entry.sets += setWeight;
    entry.volume += volume;
    map.set(muscle, entry);
  };

  for (const row of rows) {
    const volume = row.weight * row.reps;
    bump(row.primary_muscle as MuscleGroup, 1, volume);
    for (const secondary of row.secondary_muscles.split(',').filter(Boolean)) {
      bump(secondary as MuscleGroup, 0.5, volume * 0.5);
    }
  }

  return [...map.values()].sort((a, b) => b.sets - a.sets);
}

export interface ProgressPoint {
  date: string;
  timestamp: number;
  e1rm: number;
  topWeight: number;
  volume: number;
  reps: number;
}

/** Per-session bests for one exercise — the series behind the progress chart. */
export async function getExerciseProgress(exerciseId: string, limit = 40): Promise<ProgressPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    workout_id: string;
    started_at: number;
    weight: number;
    reps: number;
  }>(
    `SELECT w.id AS workout_id, w.started_at, s.weight, s.reps
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
      WHERE we.exercise_id = ? AND w.status = 'completed' AND s.completed = 1 AND s.type != 'warmup'
      ORDER BY w.started_at ASC;`,
    [exerciseId],
  );

  const sessions = new Map<string, ProgressPoint>();
  for (const row of rows) {
    const point = sessions.get(row.workout_id) ?? {
      date: dateKey(new Date(row.started_at)),
      timestamp: row.started_at,
      e1rm: 0,
      topWeight: 0,
      volume: 0,
      reps: 0,
    };
    point.e1rm = Math.max(point.e1rm, estimateOneRepMax(row.weight, row.reps));
    point.topWeight = Math.max(point.topWeight, row.weight);
    point.volume += row.weight * row.reps;
    point.reps += row.reps;
    sessions.set(row.workout_id, point);
  }

  return [...sessions.values()].slice(-limit);
}

export interface RecordEntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: PrType;
  value: number;
  weight: number;
  reps: number;
  achievedAt: number;
}

/** Current best per exercise/type — the PR wall. */
export async function listPersonalRecords(type: PrType = 'e1rm'): Promise<RecordEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    exercise_id: string;
    exercise_name: string;
    type: string;
    value: number;
    weight: number;
    reps: number;
    achieved_at: number;
  }>(
    `SELECT pr.id, pr.exercise_id, e.name AS exercise_name, pr.type, pr.value,
            pr.weight, pr.reps, pr.achieved_at
       FROM personal_records pr
       JOIN exercises e ON e.id = pr.exercise_id
      WHERE pr.type = ?
        AND pr.value = (SELECT MAX(value) FROM personal_records p2
                         WHERE p2.exercise_id = pr.exercise_id AND p2.type = pr.type)
      GROUP BY pr.exercise_id
      ORDER BY pr.achieved_at DESC;`,
    [type],
  );
  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    type: r.type as PrType,
    value: r.value,
    weight: r.weight,
    reps: r.reps,
    achievedAt: r.achieved_at,
  }));
}

/** Date keys that have a completed session, for the consistency calendar. */
export async function getTrainingDays(days = 120): Promise<Map<string, number>> {
  const db = await getDb();
  const since = addDays(startOfDay(), -days).getTime();
  const rows = await db.getAllAsync<{ started_at: number; total_volume: number }>(
    `SELECT started_at, total_volume FROM workouts WHERE status = 'completed' AND started_at >= ?;`,
    [since],
  );
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = dateKey(new Date(row.started_at));
    map.set(key, (map.get(key) ?? 0) + row.total_volume);
  }
  return map;
}

export interface ExerciseFrequency {
  exerciseId: string;
  name: string;
  sessions: number;
  totalVolume: number;
  lastPerformed: number;
}

export async function getMostTrained(limit = 8): Promise<ExerciseFrequency[]> {
  const db = await getDb();
  return db.getAllAsync<ExerciseFrequency>(
    `SELECT we.exercise_id AS exerciseId,
            e.name AS name,
            COUNT(DISTINCT we.workout_id) AS sessions,
            SUM(s.weight * s.reps) AS totalVolume,
            MAX(w.started_at) AS lastPerformed
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       JOIN exercises e ON e.id = we.exercise_id
       LEFT JOIN sets s ON s.workout_exercise_id = we.id AND s.completed = 1
      WHERE w.status = 'completed'
      GROUP BY we.exercise_id
      ORDER BY sessions DESC, totalVolume DESC
      LIMIT ?;`,
    [limit],
  );
}
