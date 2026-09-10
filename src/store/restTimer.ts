import { create } from 'zustand';
import { haptics } from '@/lib/haptics';
import { sounds } from '@/lib/sound';

export interface RestTimerState {
  /** Epoch ms the timer finishes at, or null when idle. */
  endsAt: number | null;
  durationSeconds: number;
  remaining: number;
  /** Label of whatever set kicked the timer off, shown in the pill. */
  context: string | null;
  finished: boolean;

  start: (seconds: number, context?: string | null) => void;
  adjust: (deltaSeconds: number) => void;
  stop: () => void;
  tick: () => void;
}

/**
 * Rest timer.
 *
 * State is an absolute end timestamp rather than a decrementing counter, so
 * backgrounding the app, locking the phone, or a dropped JS frame can't make
 * the timer drift. `tick` just recomputes from the clock.
 */
export const useRestTimer = create<RestTimerState>((set, get) => ({
  endsAt: null,
  durationSeconds: 0,
  remaining: 0,
  context: null,
  finished: false,

  start: (seconds, context = null) => {
    if (seconds <= 0) return;
    // Warm the audio players now so the chime is not late in 90 seconds.
    sounds.prepare();
    set({
      endsAt: Date.now() + seconds * 1000,
      durationSeconds: seconds,
      remaining: seconds,
      context,
      finished: false,
    });
  },

  adjust: (deltaSeconds) => {
    const { endsAt, durationSeconds } = get();
    if (endsAt === null) return;
    const nextEnd = endsAt + deltaSeconds * 1000;
    // Never let a -15 push the timer into the past; land on "done" instead.
    if (nextEnd <= Date.now()) {
      set({ endsAt: null, remaining: 0, finished: true });
      return;
    }
    set({
      endsAt: nextEnd,
      durationSeconds: Math.max(1, durationSeconds + deltaSeconds),
      remaining: Math.ceil((nextEnd - Date.now()) / 1000),
    });
  },

  stop: () => set({ endsAt: null, remaining: 0, context: null, finished: false, durationSeconds: 0 }),

  tick: () => {
    const { endsAt, remaining } = get();
    if (endsAt === null) return;

    const next = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    if (next === remaining) return;

    if (next === 0) {
      haptics.celebrate();
      sounds.restOver();
      set({ remaining: 0, endsAt: null, finished: true });
      return;
    }
    // Countdown pulses on the last three seconds so you can feel it land.
    if (next <= 3) {
      haptics.light();
      sounds.tick();
    }
    set({ remaining: next });
  },
}));
