import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '@/db/client';
import { dateKey } from './date';

/**
 * Local-only data has exactly one failure mode that matters: losing the phone.
 * A plain JSON dump is the whole backup story — readable, portable, and
 * restorable without KNIGHT being installed anywhere in particular.
 */
const BACKUP_VERSION = 1;

/** Order matters on restore: parents before children, for the FK constraints. */
const TABLES = [
  'exercises',
  'routines',
  'routine_days',
  'routine_exercises',
  'workouts',
  'workout_exercises',
  'sets',
  'personal_records',
  'body_entries',
  'body_measurements',
  'progress_photos',
  'foods',
  'nutrition_entries',
  'water_log',
  'settings',
] as const;

export interface BackupFile {
  app: 'KNIGHT';
  version: number;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export async function buildBackup(): Promise<BackupFile> {
  const db = await getDb();
  const tables: Record<string, Record<string, unknown>[]> = {};

  for (const table of TABLES) {
    tables[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table};`);
  }

  return {
    app: 'KNIGHT',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export async function exportBackup(): Promise<{ shared: boolean; uri: string }> {
  const backup = await buildBackup();
  const file = new File(Paths.cache, `knight-backup-${dateKey()}.json`);

  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 2));

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save your KNIGHT backup',
      UTI: 'public.json',
    });
  }
  return { shared: canShare, uri: file.uri };
}

export async function importBackup(): Promise<{ imported: boolean }> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return { imported: false };

  const file = new File(picked.assets[0].uri);
  const raw = await file.text();

  let parsed: BackupFile;
  try {
    parsed = JSON.parse(raw) as BackupFile;
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (parsed.app !== 'KNIGHT' || typeof parsed.tables !== 'object') {
    throw new Error('That does not look like a KNIGHT backup.');
  }
  if (parsed.version > BACKUP_VERSION) {
    throw new Error('That backup was made by a newer version of KNIGHT.');
  }

  const db = await getDb();

  // Foreign keys go off for the duration: the restore writes tables in order,
  // but a partially populated database would still trip constraint checks.
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.withTransactionAsync(async () => {
      for (const table of [...TABLES].reverse()) {
        await db.runAsync(`DELETE FROM ${table};`);
      }

      for (const table of TABLES) {
        const rows = parsed.tables[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        for (const row of rows) {
          const columns = Object.keys(row);
          if (columns.length === 0) continue;
          const placeholders = columns.map(() => '?').join(', ');
          await db.runAsync(
            `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`,
            columns.map((column) => row[column] as string | number | null),
          );
        }
      }
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }

  return { imported: true };
}
