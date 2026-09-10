import { create } from 'zustand';
import type { SetType, WorkoutSet } from '@/db/types';
import { getPreviousSets, type PreviousSet } from '@/db/queries/exercises';
import {
  addExerciseToWorkout,
  addSet as dbAddSet,
  deleteSet as dbDeleteSet,
  discardWorkout,
  finishWorkout,
  getActiveWorkout,
  getWorkoutDetail,
  removeWorkoutExercise,
  setWorkoutExerciseNotes,
  setWorkoutExerciseRest,
  setWorkoutNotes,
  startWorkout,
  updateSet,
  type FinishResult,
  type WorkoutDetail,
} from '@/db/queries/workouts';
import { getDb } from '@/db/client';
import { estimateOneRepMax, setVolume } from '@/lib/strength';
import { haptics } from '@/lib/haptics';
import { useRestTimer } from './restTimer';
import { useSettings } from './settings';

export interface WorkoutState {
  detail: WorkoutDetail | null;
  loading: boolean;
  /** exerciseId -> what you did last time. Drives the ghost hints. */
  previous: Map<string, PreviousSet[]>;
  /** exerciseId -> best e1RM ever, for live PR flagging. */
  bestE1rm: Map<string, number>;
  /** setIds that beat a record in this session, so the badge persists. */
  prSets: Set<string>;

  load: (workoutId: string) => Promise<void>;
  resume: () => Promise<string | null>;
  begin: (options: { routineDayId?: string | null; name?: string }) => Promise<string>;
  refresh: () => Promise<void>;

  patchSet: (setId: string, patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'rpe' | 'type'>>) => void;
  commitSet: (setId: string) => Promise<void>;
  toggleComplete: (setId: string) => Promise<void>;
  appendSet: (workoutExerciseId: string) => Promise<void>;
  removeSet: (setId: string) => Promise<void>;
  addExercise: (exerciseId: string) => Promise<void>;
  dropExercise: (workoutExerciseId: string) => Promise<void>;
  setExerciseNotes: (workoutExerciseId: string, notes: string) => Promise<void>;
  setExerciseRest: (workoutExerciseId: string, seconds: number) => Promise<void>;
  setNotes: (notes: string) => Promise<void>;

  finish: () => Promise<FinishResult | null>;
  discard: () => Promise<void>;

  elapsedSeconds: () => number;
  stats: () => { volume: number; completedSets: number; totalSets: number };
}

async function loadContext(detail: WorkoutDetail) {
  const previous = new Map<string, PreviousSet[]>();
  const bestE1rm = new Map<string, number>();
  const db = await getDb();

  for (const item of detail.exercises) {
    previous.set(item.exerciseId, await getPreviousSets(item.exerciseId, detail.id));
    const record = await db.getFirstAsync<{ value: number }>(
      `SELECT MAX(value) AS value FROM personal_records WHERE exercise_id = ? AND type = 'e1rm';`,
      [item.exerciseId],
    );
    bestE1rm.set(item.exerciseId, record?.value ?? 0);
  }
  return { previous, bestE1rm };
}

export const useWorkout = create<WorkoutState>((set, get) => ({
  detail: null,
  loading: false,
  previous: new Map(),
  bestE1rm: new Map(),
  prSets: new Set(),

  load: async (workoutId) => {
    set({ loading: true });
    const detail = await getWorkoutDetail(workoutId);
    if (!detail) {
      set({ detail: null, loading: false });
      return;
    }
    const { previous, bestE1rm } = await loadContext(detail);
    set({ detail, previous, bestE1rm, loading: false });
  },

  resume: async () => {
    const active = await getActiveWorkout();
    if (!active) return null;
    await get().load(active.id);
    return active.id;
  },

  begin: async (options) => {
    const id = await startWorkout(options);
    haptics.heavy();
    await get().load(id);
    return id;
  },

  refresh: async () => {
    const id = get().detail?.id;
    if (id) await get().load(id);
  },

  /**
   * Local-only write. Typing in a weight field must never wait on SQLite, so
   * the store is the source of truth while the field has focus and `commitSet`
   * persists on blur.
   */
  patchSet: (setId, patch) => {
    const detail = get().detail;
    if (!detail) return;
    set({
      detail: {
        ...detail,
        exercises: detail.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((item) => (item.id === setId ? { ...item, ...patch } : item)),
        })),
      },
    });
  },

  commitSet: async (setId) => {
    const detail = get().detail;
    if (!detail) return;
    for (const exercise of detail.exercises) {
      const target = exercise.sets.find((item) => item.id === setId);
      if (!target) continue;
      await updateSet(setId, {
        weight: target.weight,
        reps: target.reps,
        rpe: target.rpe,
        type: target.type,
      });
      return;
    }
  },

  toggleComplete: async (setId) => {
    const detail = get().detail;
    if (!detail) return;

    const exercise = detail.exercises.find((item) => item.sets.some((s) => s.id === setId));
    const target = exercise?.sets.find((s) => s.id === setId);
    if (!exercise || !target) return;

    const nextCompleted = !target.completed;

    // Persist the numbers alongside the tick — the field may still have focus.
    await updateSet(setId, {
      weight: target.weight,
      reps: target.reps,
      completed: nextCompleted,
    });

    const prSets = new Set(get().prSets);
    if (nextCompleted) {
      haptics.medium();
      const best = get().bestE1rm.get(exercise.exerciseId) ?? 0;
      const e1rm = estimateOneRepMax(target.weight, target.reps);
      if (target.type !== 'warmup' && e1rm > best && best > 0) {
        prSets.add(setId);
        haptics.celebrate();
      }

      const { restTimerAutoStart, defaultRestSeconds } = useSettings.getState();
      if (restTimerAutoStart && target.type !== 'warmup') {
        useRestTimer
          .getState()
          .start(exercise.restSeconds || defaultRestSeconds, exercise.exercise.name);
      }
    } else {
      prSets.delete(setId);
    }

    set({
      prSets,
      detail: {
        ...detail,
        exercises: detail.exercises.map((item) =>
          item.id !== exercise.id
            ? item
            : {
                ...item,
                sets: item.sets.map((s) =>
                  s.id === setId
                    ? { ...s, completed: nextCompleted, completedAt: nextCompleted ? Date.now() : null }
                    : s,
                ),
              },
        ),
      },
    });
  },

  appendSet: async (workoutExerciseId) => {
    await dbAddSet(workoutExerciseId);
    haptics.light();
    await get().refresh();
  },

  removeSet: async (setId) => {
    await dbDeleteSet(setId);
    haptics.warning();
    await get().refresh();
  },

  addExercise: async (exerciseId) => {
    const detail = get().detail;
    if (!detail) return;
    await addExerciseToWorkout(detail.id, exerciseId);
    haptics.medium();
    await get().refresh();
  },

  dropExercise: async (workoutExerciseId) => {
    await removeWorkoutExercise(workoutExerciseId);
    haptics.warning();
    await get().refresh();
  },

  setExerciseNotes: async (workoutExerciseId, notes) => {
    await setWorkoutExerciseNotes(workoutExerciseId, notes.trim() || null);
    await get().refresh();
  },

  setExerciseRest: async (workoutExerciseId, seconds) => {
    await setWorkoutExerciseRest(workoutExerciseId, seconds);
    await get().refresh();
  },

  setNotes: async (notes) => {
    const detail = get().detail;
    if (!detail) return;
    await setWorkoutNotes(detail.id, notes.trim() || null);
    set({ detail: { ...detail, notes: notes.trim() || null } });
  },

  finish: async () => {
    const detail = get().detail;
    if (!detail) return null;
    const result = await finishWorkout(detail.id, get().elapsedSeconds());
    useRestTimer.getState().stop();
    haptics.success();
    set({ detail: null, previous: new Map(), bestE1rm: new Map(), prSets: new Set() });
    return result;
  },

  discard: async () => {
    const detail = get().detail;
    if (!detail) return;
    await discardWorkout(detail.id);
    useRestTimer.getState().stop();
    set({ detail: null, previous: new Map(), bestE1rm: new Map(), prSets: new Set() });
  },

  elapsedSeconds: () => {
    const detail = get().detail;
    if (!detail) return 0;
    return Math.max(0, Math.floor((Date.now() - detail.startedAt) / 1000));
  },

  stats: () => {
    const detail = get().detail;
    if (!detail) return { volume: 0, completedSets: 0, totalSets: 0 };

    let volume = 0;
    let completedSets = 0;
    let totalSets = 0;

    for (const exercise of detail.exercises) {
      for (const item of exercise.sets) {
        totalSets += 1;
        if (!item.completed) continue;
        completedSets += 1;
        volume += setVolume(item.weight, item.reps);
      }
    }
    return { volume, completedSets, totalSets };
  },
}));

export type { SetType, WorkoutDetail, FinishResult };
