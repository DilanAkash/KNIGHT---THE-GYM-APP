import type { SQLiteDatabase } from 'expo-sqlite';
import { createId } from '@/lib/id';
import { getDb, getSetting, setSetting } from './client';
import { EXERCISE_LIBRARY } from './exerciseLibrary';
import { CUT_SPLIT_TEMPLATE, PPL_TEMPLATE, type RoutineTemplate } from './routineTemplates';

const SEED_KEY = 'library_version';
/** Marks the one-time install of the cut split for pre-existing databases. */
const CUT_SPLIT_KEY = 'cut_split_installed';
/** Bump when EXERCISE_LIBRARY gains entries so existing installs pick them up. */
const LIBRARY_VERSION = '2';

async function seedExercises(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const item of EXERCISE_LIBRARY) {
      // OR IGNORE so a re-seed never clobbers a favourite the user has set.
      await db.runAsync(
        `INSERT OR IGNORE INTO exercises
           (id, name, primary_muscle, secondary_muscles, equipment, tracking, is_custom, is_favorite, cue, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?);`,
        [
          item.id,
          item.name,
          item.primary,
          item.secondary.join(','),
          item.equipment,
          item.tracking ?? 'weight_reps',
          item.cue ?? null,
          now,
        ],
      );
    }
  });
}

/** Materialises a template into real, fully editable routine rows. */
export async function installTemplate(
  template: RoutineTemplate,
  options: { name?: string } = {},
): Promise<string> {
  const db = await getDb();
  const routineId = createId('rt_');
  const now = Date.now();

  const existing = await db.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(sort_order) AS max FROM routines;',
  );
  const sortOrder = (existing?.max ?? -1) + 1;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO routines (id, name, description, is_archived, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?, ?);`,
      [routineId, options.name ?? template.name, template.description, sortOrder, now, now],
    );

    for (let dayIndex = 0; dayIndex < template.days.length; dayIndex += 1) {
      const day = template.days[dayIndex]!;
      const dayId = createId('rd_');
      await db.runAsync(
        'INSERT INTO routine_days (id, routine_id, name, sort_order) VALUES (?, ?, ?, ?);',
        [dayId, routineId, day.name, dayIndex],
      );

      for (let i = 0; i < day.exercises.length; i += 1) {
        const ex = day.exercises[i]!;
        await db.runAsync(
          `INSERT INTO routine_exercises
             (id, day_id, exercise_id, sort_order, target_sets, reps_low, reps_high, rest_seconds, superset_group, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            createId('re_'),
            dayId,
            ex.exerciseId,
            i,
            ex.sets,
            ex.repsLow,
            ex.repsHigh,
            ex.rest,
            ex.supersetGroup ?? null,
            ex.notes ?? null,
          ],
        );
      }
    }
  });

  return routineId;
}

/**
 * Runs once on first launch, then only again when LIBRARY_VERSION changes.
 * The default routine is only created when there are genuinely no routines,
 * so wiping your routines on purpose doesn't resurrect PPL behind your back.
 */
export async function ensureSeeded(): Promise<void> {
  const db = await getDb();
  const current = await getSetting(SEED_KEY);

  if (current !== LIBRARY_VERSION) {
    await seedExercises(db);
    await setSetting(SEED_KEY, LIBRARY_VERSION);
  }

  const routineCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM routines;',
  );
  if ((routineCount?.count ?? 0) === 0) {
    const routineId = await installTemplate(CUT_SPLIT_TEMPLATE);
    await setSetting('active_routine_id', routineId);
    await setSetting(CUT_SPLIT_KEY, 'installed');
    return;
  }

  // Installs that predate the cut split get it added once, without wiping
  // whatever they already had. The flag is what stops it reappearing every
  // launch after the routine is deleted on purpose.
  if ((await getSetting(CUT_SPLIT_KEY)) === null) {
    const routineId = await installTemplate(CUT_SPLIT_TEMPLATE);
    await setSetting('active_routine_id', routineId);
    await setSetting(CUT_SPLIT_KEY, 'installed');
  }
}
