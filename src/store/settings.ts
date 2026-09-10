import { create } from 'zustand';
import { getSetting, setSetting } from '@/db/client';
import type { WeightUnit } from '@/db/types';
import { DEFAULT_PLATES_KG, DEFAULT_PLATES_LB } from '@/lib/strength';
import { setHapticsEnabled } from '@/lib/haptics';
import { setSoundEnabled } from '@/lib/sound';

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
}

export interface SettingsState {
  hydrated: boolean;
  unit: WeightUnit;
  /** Empty-bar weight used by the plate calculator. */
  barWeight: number;
  defaultRestSeconds: number;
  restTimerAutoStart: boolean;
  restTimerSound: boolean;
  hapticsOn: boolean;
  keepAwake: boolean;
  weeklyGoal: number;
  nutritionTargets: NutritionTargets;
  displayName: string;

  hydrate: () => Promise<void>;
  setUnit: (unit: WeightUnit) => Promise<void>;
  setBarWeight: (weight: number) => Promise<void>;
  setDefaultRest: (seconds: number) => Promise<void>;
  setRestAutoStart: (value: boolean) => Promise<void>;
  setRestSound: (value: boolean) => Promise<void>;
  setHaptics: (value: boolean) => Promise<void>;
  setKeepAwake: (value: boolean) => Promise<void>;
  setWeeklyGoal: (value: number) => Promise<void>;
  setNutritionTargets: (targets: Partial<NutritionTargets>) => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
  availablePlates: () => number[];
}

const DEFAULT_TARGETS: NutritionTargets = {
  calories: 2600,
  protein: 180,
  carbs: 280,
  fat: 80,
  waterMl: 3000,
};

const num = (value: string | null, fallback: number) => {
  const parsed = value === null ? NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value: string | null, fallback: boolean) =>
  value === null ? fallback : value === '1';

export const useSettings = create<SettingsState>((set, get) => ({
  hydrated: false,
  unit: 'kg',
  barWeight: 20,
  defaultRestSeconds: 120,
  restTimerAutoStart: true,
  restTimerSound: true,
  hapticsOn: true,
  keepAwake: true,
  weeklyGoal: 6,
  nutritionTargets: DEFAULT_TARGETS,
  displayName: '',

  hydrate: async () => {
    const [
      unit,
      barWeight,
      rest,
      autoStart,
      sound,
      haptics,
      keepAwake,
      goal,
      targets,
      name,
    ] = await Promise.all([
      getSetting('unit'),
      getSetting('bar_weight'),
      getSetting('default_rest'),
      getSetting('rest_auto_start'),
      getSetting('rest_sound'),
      getSetting('haptics'),
      getSetting('keep_awake'),
      getSetting('weekly_goal'),
      getSetting('nutrition_targets'),
      getSetting('display_name'),
    ]);

    let parsedTargets = DEFAULT_TARGETS;
    if (targets) {
      try {
        parsedTargets = { ...DEFAULT_TARGETS, ...(JSON.parse(targets) as Partial<NutritionTargets>) };
      } catch {
        // Corrupt value — fall back rather than blocking app start.
      }
    }

    const hapticsOn = bool(haptics, true);
    const soundOn = bool(sound, true);
    setHapticsEnabled(hapticsOn);
    setSoundEnabled(soundOn);

    set({
      hydrated: true,
      unit: unit === 'lb' ? 'lb' : 'kg',
      barWeight: num(barWeight, unit === 'lb' ? 45 : 20),
      defaultRestSeconds: num(rest, 120),
      restTimerAutoStart: bool(autoStart, true),
      restTimerSound: soundOn,
      hapticsOn,
      keepAwake: bool(keepAwake, true),
      weeklyGoal: num(goal, 6),
      nutritionTargets: parsedTargets,
      displayName: name ?? '',
    });
  },

  setUnit: async (unit) => {
    // Bar weight is unit-specific; move it to the standard bar for the new unit
    // unless it has been customised away from the previous standard.
    const { barWeight } = get();
    const nextBar = barWeight === 20 && unit === 'lb' ? 45 : barWeight === 45 && unit === 'kg' ? 20 : barWeight;
    set({ unit, barWeight: nextBar });
    await Promise.all([setSetting('unit', unit), setSetting('bar_weight', String(nextBar))]);
  },

  setBarWeight: async (weight) => {
    set({ barWeight: weight });
    await setSetting('bar_weight', String(weight));
  },

  setDefaultRest: async (seconds) => {
    set({ defaultRestSeconds: seconds });
    await setSetting('default_rest', String(seconds));
  },

  setRestAutoStart: async (value) => {
    set({ restTimerAutoStart: value });
    await setSetting('rest_auto_start', value ? '1' : '0');
  },

  setRestSound: async (value) => {
    set({ restTimerSound: value });
    setSoundEnabled(value);
    await setSetting('rest_sound', value ? '1' : '0');
  },

  setHaptics: async (value) => {
    set({ hapticsOn: value });
    setHapticsEnabled(value);
    await setSetting('haptics', value ? '1' : '0');
  },

  setKeepAwake: async (value) => {
    set({ keepAwake: value });
    await setSetting('keep_awake', value ? '1' : '0');
  },

  setWeeklyGoal: async (value) => {
    set({ weeklyGoal: value });
    await setSetting('weekly_goal', String(value));
  },

  setNutritionTargets: async (targets) => {
    const next = { ...get().nutritionTargets, ...targets };
    set({ nutritionTargets: next });
    await setSetting('nutrition_targets', JSON.stringify(next));
  },

  setDisplayName: async (name) => {
    set({ displayName: name });
    await setSetting('display_name', name);
  },

  availablePlates: () => (get().unit === 'kg' ? DEFAULT_PLATES_KG : DEFAULT_PLATES_LB),
}));
