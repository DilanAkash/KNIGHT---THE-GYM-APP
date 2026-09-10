import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

const DB_NAME = 'knight.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // WAL keeps reads from blocking while a set is being written mid-workout.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS _migrations (
       id INTEGER PRIMARY KEY NOT NULL,
       name TEXT NOT NULL,
       applied_at INTEGER NOT NULL
     );`,
  );

  const applied = await db.getAllAsync<{ id: number }>('SELECT id FROM _migrations;');
  const done = new Set(applied.map((row) => row.id));

  for (const migration of MIGRATIONS) {
    if (done.has(migration.id)) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.runAsync('INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?);', [
        migration.id,
        migration.name,
        Date.now(),
      ]);
    });
  }
}

/** Single shared connection. Safe to call from anywhere; only opens once. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?;',
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
    [key, value],
  );
}

/** Wipes user data but keeps the seeded library. Used by Settings -> Reset. */
export async function resetUserData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM sets;
      DELETE FROM workout_exercises;
      DELETE FROM workouts;
      DELETE FROM personal_records;
      DELETE FROM progress_photos;
      DELETE FROM body_measurements;
      DELETE FROM body_entries;
      DELETE FROM nutrition_entries;
      DELETE FROM water_log;
    `);
  });
}
