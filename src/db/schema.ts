/**
 * Migrations run in order and are recorded in `_migrations`, so adding a new
 * entry to this array is the only supported way to change the schema.
 * Never edit a migration that has already shipped.
 */
export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'initial',
    sql: `
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        primary_muscle TEXT NOT NULL,
        secondary_muscles TEXT NOT NULL DEFAULT '',
        equipment TEXT NOT NULL,
        tracking TEXT NOT NULL DEFAULT 'weight_reps',
        is_custom INTEGER NOT NULL DEFAULT 0,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        cue TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(primary_muscle);
      CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);

      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS routine_days (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_days_routine ON routine_days(routine_id);

      CREATE TABLE IF NOT EXISTS routine_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        day_id TEXT NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        sort_order INTEGER NOT NULL DEFAULT 0,
        target_sets INTEGER NOT NULL DEFAULT 3,
        reps_low INTEGER NOT NULL DEFAULT 8,
        reps_high INTEGER NOT NULL DEFAULT 12,
        rest_seconds INTEGER NOT NULL DEFAULT 120,
        superset_group TEXT,
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_rex_day ON routine_exercises(day_id);

      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY NOT NULL,
        routine_day_id TEXT,
        name TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        total_volume REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active'
      );
      CREATE INDEX IF NOT EXISTS idx_workouts_started ON workouts(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        sort_order INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        superset_group TEXT,
        rest_seconds INTEGER NOT NULL DEFAULT 120
      );
      CREATE INDEX IF NOT EXISTS idx_wex_workout ON workout_exercises(workout_id);
      CREATE INDEX IF NOT EXISTS idx_wex_exercise ON workout_exercises(exercise_id);

      CREATE TABLE IF NOT EXISTS sets (
        id TEXT PRIMARY KEY NOT NULL,
        workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        set_index INTEGER NOT NULL,
        weight REAL NOT NULL DEFAULT 0,
        reps INTEGER NOT NULL DEFAULT 0,
        rpe REAL,
        type TEXT NOT NULL DEFAULT 'normal',
        completed INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_sets_wex ON sets(workout_exercise_id);

      CREATE TABLE IF NOT EXISTS personal_records (
        id TEXT PRIMARY KEY NOT NULL,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        value REAL NOT NULL,
        weight REAL NOT NULL DEFAULT 0,
        reps INTEGER NOT NULL DEFAULT 0,
        workout_id TEXT NOT NULL,
        achieved_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pr_exercise ON personal_records(exercise_id, type);

      CREATE TABLE IF NOT EXISTS body_entries (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL UNIQUE,
        weight REAL,
        body_fat REAL,
        notes TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_body_date ON body_entries(date DESC);

      CREATE TABLE IF NOT EXISTS body_measurements (
        id TEXT PRIMARY KEY NOT NULL,
        entry_id TEXT NOT NULL REFERENCES body_entries(id) ON DELETE CASCADE,
        site TEXT NOT NULL,
        value REAL NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_meas_entry ON body_measurements(entry_id);

      CREATE TABLE IF NOT EXISTS progress_photos (
        id TEXT PRIMARY KEY NOT NULL,
        entry_id TEXT NOT NULL REFERENCES body_entries(id) ON DELETE CASCADE,
        uri TEXT NOT NULL,
        pose TEXT NOT NULL DEFAULT 'front',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_photos_entry ON progress_photos(entry_id);

      CREATE TABLE IF NOT EXISTS foods (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        serving_label TEXT NOT NULL DEFAULT '1 serving',
        calories REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        times_used INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_foods_used ON foods(times_used DESC);

      CREATE TABLE IF NOT EXISTS nutrition_entries (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        meal TEXT NOT NULL,
        food_id TEXT,
        name TEXT NOT NULL,
        servings REAL NOT NULL DEFAULT 1,
        calories REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_nutrition_date ON nutrition_entries(date);

      CREATE TABLE IF NOT EXISTS water_log (
        date TEXT PRIMARY KEY NOT NULL,
        ml INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
];
