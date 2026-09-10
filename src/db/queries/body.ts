import { getDb } from '../client';
import type { BodyEntry, BodyMeasurement, MeasurementSite, ProgressPhoto } from '../types';
import { createId } from '@/lib/id';
import { dateKey } from '@/lib/date';

interface BodyRow {
  id: string;
  date: string;
  weight: number | null;
  body_fat: number | null;
  notes: string | null;
  created_at: number;
}

const mapEntry = (row: BodyRow): BodyEntry => ({
  id: row.id,
  date: row.date,
  weight: row.weight,
  bodyFat: row.body_fat,
  notes: row.notes,
  createdAt: row.created_at,
});

export interface BodyEntryDetail extends BodyEntry {
  measurements: BodyMeasurement[];
  photos: ProgressPhoto[];
}

export async function listBodyEntries(limit = 180): Promise<BodyEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BodyRow>(
    'SELECT * FROM body_entries ORDER BY date DESC LIMIT ?;',
    [limit],
  );
  return rows.map(mapEntry);
}

export async function getBodyEntry(date: string): Promise<BodyEntryDetail | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BodyRow>('SELECT * FROM body_entries WHERE date = ?;', [date]);
  if (!row) return null;

  const measurements = await db.getAllAsync<{ id: string; entry_id: string; site: string; value: number }>(
    'SELECT * FROM body_measurements WHERE entry_id = ?;',
    [row.id],
  );
  const photos = await db.getAllAsync<{
    id: string;
    entry_id: string;
    uri: string;
    pose: string;
    created_at: number;
  }>('SELECT * FROM progress_photos WHERE entry_id = ? ORDER BY created_at ASC;', [row.id]);

  return {
    ...mapEntry(row),
    measurements: measurements.map((m) => ({
      id: m.id,
      entryId: m.entry_id,
      site: m.site as MeasurementSite,
      value: m.value,
    })),
    photos: photos.map((p) => ({
      id: p.id,
      entryId: p.entry_id,
      uri: p.uri,
      pose: p.pose as ProgressPhoto['pose'],
      createdAt: p.created_at,
    })),
  };
}

/** One row per day — logging twice updates rather than duplicating. */
export async function upsertBodyEntry(input: {
  date?: string;
  weight?: number | null;
  bodyFat?: number | null;
  notes?: string | null;
}): Promise<string> {
  const db = await getDb();
  const date = input.date ?? dateKey();
  const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM body_entries WHERE date = ?;', [
    date,
  ]);

  if (existing) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (input.weight !== undefined) {
      fields.push('weight = ?');
      values.push(input.weight);
    }
    if (input.bodyFat !== undefined) {
      fields.push('body_fat = ?');
      values.push(input.bodyFat);
    }
    if (input.notes !== undefined) {
      fields.push('notes = ?');
      values.push(input.notes);
    }
    if (fields.length > 0) {
      values.push(existing.id);
      await db.runAsync(`UPDATE body_entries SET ${fields.join(', ')} WHERE id = ?;`, values);
    }
    return existing.id;
  }

  const id = createId('be_');
  await db.runAsync(
    'INSERT INTO body_entries (id, date, weight, body_fat, notes, created_at) VALUES (?, ?, ?, ?, ?, ?);',
    [id, date, input.weight ?? null, input.bodyFat ?? null, input.notes ?? null, Date.now()],
  );
  return id;
}

export async function setMeasurement(entryId: string, site: MeasurementSite, value: number): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM body_measurements WHERE entry_id = ? AND site = ?;',
    [entryId, site],
  );
  if (existing) {
    await db.runAsync('UPDATE body_measurements SET value = ? WHERE id = ?;', [value, existing.id]);
    return;
  }
  await db.runAsync('INSERT INTO body_measurements (id, entry_id, site, value) VALUES (?, ?, ?, ?);', [
    createId('bm_'),
    entryId,
    site,
    value,
  ]);
}

export async function addProgressPhoto(
  entryId: string,
  uri: string,
  pose: ProgressPhoto['pose'] = 'front',
): Promise<string> {
  const db = await getDb();
  const id = createId('pp_');
  await db.runAsync(
    'INSERT INTO progress_photos (id, entry_id, uri, pose, created_at) VALUES (?, ?, ?, ?, ?);',
    [id, entryId, uri, pose, Date.now()],
  );
  return id;
}

export async function deleteProgressPhoto(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM progress_photos WHERE id = ?;', [id]);
}

export async function deleteBodyEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM body_entries WHERE id = ?;', [id]);
}

export interface WeightPoint {
  date: string;
  weight: number;
  /** 7-point moving average — daily bodyweight is far too noisy to read raw. */
  trend: number;
}

export async function getWeightSeries(limit = 120): Promise<WeightPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string; weight: number }>(
    'SELECT date, weight FROM body_entries WHERE weight IS NOT NULL ORDER BY date ASC LIMIT ?;',
    [limit],
  );

  const window: number[] = [];
  return rows.map((row) => {
    window.push(row.weight);
    if (window.length > 7) window.shift();
    const trend = window.reduce((sum, v) => sum + v, 0) / window.length;
    return { date: row.date, weight: row.weight, trend: Math.round(trend * 100) / 100 };
  });
}

export async function listPhotoTimeline(limit = 60): Promise<(ProgressPhoto & { date: string })[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    entry_id: string;
    uri: string;
    pose: string;
    created_at: number;
    date: string;
  }>(
    `SELECT p.*, b.date FROM progress_photos p
       JOIN body_entries b ON b.id = p.entry_id
      ORDER BY b.date DESC LIMIT ?;`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    entryId: r.entry_id,
    uri: r.uri,
    pose: r.pose as ProgressPhoto['pose'],
    createdAt: r.created_at,
    date: r.date,
  }));
}

export const MEASUREMENT_LABELS: Record<MeasurementSite, string> = {
  neck: 'Neck',
  chest: 'Chest',
  left_arm: 'Left Arm',
  right_arm: 'Right Arm',
  waist: 'Waist',
  hips: 'Hips',
  left_thigh: 'Left Thigh',
  right_thigh: 'Right Thigh',
  left_calf: 'Left Calf',
  right_calf: 'Right Calf',
};

export const MEASUREMENT_ORDER: MeasurementSite[] = [
  'neck',
  'chest',
  'left_arm',
  'right_arm',
  'waist',
  'hips',
  'left_thigh',
  'right_thigh',
  'left_calf',
  'right_calf',
];
