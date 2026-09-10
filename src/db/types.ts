export type MuscleGroup =
  | 'chest'
  | 'lats'
  | 'upper_back'
  | 'traps'
  | 'lower_back'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'obliques'
  | 'cardio';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

/** Drives which input fields the logger shows for a given exercise. */
export type TrackingMode = 'weight_reps' | 'bodyweight_reps' | 'weighted_bodyweight' | 'duration' | 'distance_duration';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  tracking: TrackingMode;
  isCustom: boolean;
  isFavorite: boolean;
  /** One line of genuinely useful cueing, not a paragraph of filler. */
  cue: string | null;
  createdAt: number;
}

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface RoutineDay {
  id: string;
  routineId: string;
  name: string;
  sortOrder: number;
}

export interface RoutineExercise {
  id: string;
  dayId: string;
  exerciseId: string;
  sortOrder: number;
  targetSets: number;
  repsLow: number;
  repsHigh: number;
  restSeconds: number;
  /** Exercises sharing a group id are performed as a superset. */
  supersetGroup: string | null;
  notes: string | null;
}

export type WorkoutStatus = 'active' | 'completed';

export interface Workout {
  id: string;
  routineDayId: string | null;
  name: string;
  startedAt: number;
  endedAt: number | null;
  /** Excludes time the session spent paused. */
  durationSeconds: number;
  notes: string | null;
  totalVolume: number;
  status: WorkoutStatus;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  sortOrder: number;
  notes: string | null;
  supersetGroup: string | null;
  restSeconds: number;
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  rpe: number | null;
  type: SetType;
  completed: boolean;
  completedAt: number | null;
}

export type PrType = 'e1rm' | 'weight' | 'volume' | 'reps';

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  type: PrType;
  value: number;
  weight: number;
  reps: number;
  workoutId: string;
  achievedAt: number;
}

export interface BodyEntry {
  id: string;
  /** YYYY-MM-DD, one entry per day. */
  date: string;
  weight: number | null;
  bodyFat: number | null;
  notes: string | null;
  createdAt: number;
}

export type MeasurementSite =
  | 'neck'
  | 'chest'
  | 'left_arm'
  | 'right_arm'
  | 'waist'
  | 'hips'
  | 'left_thigh'
  | 'right_thigh'
  | 'left_calf'
  | 'right_calf';

export interface BodyMeasurement {
  id: string;
  entryId: string;
  site: MeasurementSite;
  value: number;
}

export interface ProgressPhoto {
  id: string;
  entryId: string;
  uri: string;
  pose: 'front' | 'side' | 'back';
  createdAt: number;
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isFavorite: boolean;
  timesUsed: number;
  createdAt: number;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface NutritionEntry {
  id: string;
  date: string;
  meal: MealSlot;
  foodId: string | null;
  name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: number;
}

export type WeightUnit = 'kg' | 'lb';
