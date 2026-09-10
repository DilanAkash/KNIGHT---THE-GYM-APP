import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getDb, getSetting } from '@/db/client';
import { getRoutineDetail, listRoutines, type RoutineDayDetail } from '@/db/queries/routines';
import { getActiveWorkout } from '@/db/queries/workouts';
import {
  getOverview,
  getTrainingDays,
  getWeeklyVolume,
  listPersonalRecords,
  type RecordEntry,
  type TrainingOverview,
  type VolumePoint,
} from '@/db/queries/stats';
import { getDayNutrition, type DayNutrition } from '@/db/queries/nutrition';
import type { Workout } from '@/db/types';

export interface TodayData {
  loading: boolean;
  overview: TrainingOverview | null;
  activeWorkout: Workout | null;
  routineName: string | null;
  nextDay: RoutineDayDetail | null;
  weekly: VolumePoint[];
  recentRecords: RecordEntry[];
  nutrition: DayNutrition | null;
  /** date key -> volume, for the week strip. */
  trainingDays: Map<string, number>;
  reload: () => Promise<void>;
}

/**
 * Works out which session is up next.
 *
 * Follows the routine order from whatever you did last rather than the
 * calendar — miss a Wednesday and the split should carry on from where you
 * actually are, not skip a day to stay on schedule.
 */
async function resolveNextDay(): Promise<{ routineName: string | null; nextDay: RoutineDayDetail | null }> {
  let routineId = await getSetting('active_routine_id');

  if (!routineId) {
    const routines = await listRoutines();
    routineId = routines[0]?.id ?? null;
  }
  if (!routineId) return { routineName: null, nextDay: null };

  const routine = await getRoutineDetail(routineId);
  if (!routine || routine.days.length === 0) return { routineName: routine?.name ?? null, nextDay: null };

  const db = await getDb();
  const last = await db.getFirstAsync<{ routine_day_id: string | null }>(
    `SELECT routine_day_id FROM workouts
      WHERE status = 'completed' AND routine_day_id IS NOT NULL
      ORDER BY started_at DESC LIMIT 1;`,
  );

  const lastIndex = last?.routine_day_id
    ? routine.days.findIndex((day) => day.id === last.routine_day_id)
    : -1;

  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % routine.days.length;
  return { routineName: routine.name, nextDay: routine.days[nextIndex] ?? null };
}

export function useToday(): TodayData {
  const [state, setState] = useState<Omit<TodayData, 'reload'>>({
    loading: true,
    overview: null,
    activeWorkout: null,
    routineName: null,
    nextDay: null,
    weekly: [],
    recentRecords: [],
    nutrition: null,
    trainingDays: new Map(),
  });

  const reload = useCallback(async () => {
    const [overview, activeWorkout, next, weekly, records, nutrition, trainingDays] =
      await Promise.all([
        getOverview(),
        getActiveWorkout(),
        resolveNextDay(),
        getWeeklyVolume(10),
        listPersonalRecords('e1rm'),
        getDayNutrition(),
        getTrainingDays(14),
      ]);

    setState({
      loading: false,
      overview,
      activeWorkout,
      routineName: next.routineName,
      nextDay: next.nextDay,
      weekly,
      recentRecords: records.slice(0, 3),
      nutrition,
      trainingDays,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { ...state, reload };
}
