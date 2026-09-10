import type { Equipment, MuscleGroup, TrackingMode } from './types';

export interface SeedExercise {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment;
  tracking?: TrackingMode;
  /** One cue that actually changes how the set feels. No paragraphs. */
  cue?: string;
}

/**
 * Curated library — deliberately not exhaustive. Every entry is something
 * you'd realistically program, ordered roughly by how often it gets used.
 */
export const EXERCISE_LIBRARY: SeedExercise[] = [
  // ---------------------------------------------------------------- chest
  { id: 'ex_bench_press', name: 'Barbell Bench Press', primary: 'chest', secondary: ['triceps', 'front_delts'], equipment: 'barbell', cue: 'Drive your feet and keep the bar over your mid-chest, not your throat.' },
  { id: 'ex_incline_bench', name: 'Incline Barbell Press', primary: 'chest', secondary: ['front_delts', 'triceps'], equipment: 'barbell', cue: '30 degrees. Any steeper and it turns into a shoulder press.' },
  { id: 'ex_db_bench', name: 'Dumbbell Bench Press', primary: 'chest', secondary: ['triceps', 'front_delts'], equipment: 'dumbbell', cue: 'Let the dumbbells drift together at the top for the extra squeeze.' },
  { id: 'ex_incline_db_press', name: 'Incline Dumbbell Press', primary: 'chest', secondary: ['front_delts', 'triceps'], equipment: 'dumbbell', cue: 'Stop just short of lockout to keep tension on the upper chest.' },
  { id: 'ex_decline_bench', name: 'Decline Bench Press', primary: 'chest', secondary: ['triceps'], equipment: 'barbell' },
  { id: 'ex_machine_chest_press', name: 'Machine Chest Press', primary: 'chest', secondary: ['triceps', 'front_delts'], equipment: 'machine', cue: 'Set the handles level with your nipples before you sit down.' },
  { id: 'ex_db_fly', name: 'Dumbbell Fly', primary: 'chest', secondary: [], equipment: 'dumbbell', cue: 'Soft elbows at a fixed angle. This is a hug, not a press.' },
  { id: 'ex_cable_fly_high', name: 'Cable Fly (High to Low)', primary: 'chest', secondary: [], equipment: 'cable', cue: 'Finish with your hands crossing below your sternum.' },
  { id: 'ex_cable_fly_low', name: 'Cable Fly (Low to High)', primary: 'chest', secondary: ['front_delts'], equipment: 'cable' },
  { id: 'ex_pec_deck', name: 'Pec Deck', primary: 'chest', secondary: [], equipment: 'machine' },
  { id: 'ex_pushup', name: 'Push-Up', primary: 'chest', secondary: ['triceps', 'abs'], equipment: 'bodyweight', tracking: 'bodyweight_reps' },
  { id: 'ex_chest_dip', name: 'Chest Dip', primary: 'chest', secondary: ['triceps', 'front_delts'], equipment: 'bodyweight', tracking: 'weighted_bodyweight', cue: 'Lean forward about 30 degrees or it becomes a triceps dip.' },

  // ----------------------------------------------------------------- back
  { id: 'ex_deadlift', name: 'Deadlift', primary: 'lower_back', secondary: ['hamstrings', 'glutes', 'traps', 'lats'], equipment: 'barbell', cue: 'Take the slack out of the bar before you pull. No jerking it off the floor.' },
  { id: 'ex_pullup', name: 'Pull-Up', primary: 'lats', secondary: ['biceps', 'upper_back'], equipment: 'bodyweight', tracking: 'weighted_bodyweight', cue: 'Lead with your chest to the bar, not your chin over it.' },
  { id: 'ex_chinup', name: 'Chin-Up', primary: 'lats', secondary: ['biceps'], equipment: 'bodyweight', tracking: 'weighted_bodyweight' },
  { id: 'ex_lat_pulldown', name: 'Lat Pulldown', primary: 'lats', secondary: ['biceps', 'upper_back'], equipment: 'cable', cue: 'Drive your elbows down into your back pockets.' },
  { id: 'ex_pulldown_close', name: 'Close-Grip Pulldown', primary: 'lats', secondary: ['biceps'], equipment: 'cable' },
  { id: 'ex_barbell_row', name: 'Bent-Over Barbell Row', primary: 'upper_back', secondary: ['lats', 'biceps', 'lower_back'], equipment: 'barbell', cue: 'Torso at 45 degrees and hold it there — no rowing with your hips.' },
  { id: 'ex_pendlay_row', name: 'Pendlay Row', primary: 'upper_back', secondary: ['lats', 'traps'], equipment: 'barbell', cue: 'Dead stop on the floor every rep. Explosive up, controlled down.' },
  { id: 'ex_db_row', name: 'Dumbbell Row', primary: 'lats', secondary: ['upper_back', 'biceps'], equipment: 'dumbbell', cue: 'Pull to your hip, not your armpit.' },
  { id: 'ex_chest_supported_row', name: 'Chest-Supported Row', primary: 'upper_back', secondary: ['lats', 'rear_delts'], equipment: 'machine', cue: 'The pad takes your lower back out of it — go heavier than you think.' },
  { id: 'ex_tbar_row', name: 'T-Bar Row', primary: 'upper_back', secondary: ['lats', 'biceps'], equipment: 'barbell' },
  { id: 'ex_seated_cable_row', name: 'Seated Cable Row', primary: 'upper_back', secondary: ['lats', 'biceps'], equipment: 'cable', cue: 'Let the stretch happen at the front. Do not lock your torso rigid.' },
  { id: 'ex_machine_row', name: 'Machine Row', primary: 'upper_back', secondary: ['lats'], equipment: 'machine' },
  { id: 'ex_straight_arm_pulldown', name: 'Straight-Arm Pulldown', primary: 'lats', secondary: ['abs'], equipment: 'cable', cue: 'The one lat isolation that works. Keep the elbows locked.' },
  { id: 'ex_rack_pull', name: 'Rack Pull', primary: 'traps', secondary: ['lower_back', 'lats'], equipment: 'barbell' },
  { id: 'ex_meadows_row', name: 'Meadows Row', primary: 'lats', secondary: ['upper_back', 'rear_delts'], equipment: 'barbell' },
  { id: 'ex_barbell_shrug', name: 'Barbell Shrug', primary: 'traps', secondary: ['forearms'], equipment: 'barbell', cue: 'Straight up, pause at the top. Rolling your shoulders does nothing.' },
  { id: 'ex_db_shrug', name: 'Dumbbell Shrug', primary: 'traps', secondary: ['forearms'], equipment: 'dumbbell' },

  // ------------------------------------------------------------ shoulders
  { id: 'ex_ohp', name: 'Overhead Press', primary: 'front_delts', secondary: ['triceps', 'side_delts', 'abs'], equipment: 'barbell', cue: 'Head back, then through the window as the bar passes your forehead.' },
  { id: 'ex_db_shoulder_press', name: 'Seated Dumbbell Press', primary: 'front_delts', secondary: ['triceps', 'side_delts'], equipment: 'dumbbell' },
  { id: 'ex_arnold_press', name: 'Arnold Press', primary: 'front_delts', secondary: ['side_delts', 'triceps'], equipment: 'dumbbell' },
  { id: 'ex_machine_shoulder_press', name: 'Machine Shoulder Press', primary: 'front_delts', secondary: ['triceps'], equipment: 'machine' },
  { id: 'ex_lateral_raise', name: 'Dumbbell Lateral Raise', primary: 'side_delts', secondary: [], equipment: 'dumbbell', cue: 'Lighter than your ego wants. Lead with the elbow, stop at shoulder height.' },
  { id: 'ex_cable_lateral', name: 'Cable Lateral Raise', primary: 'side_delts', secondary: [], equipment: 'cable', cue: 'Constant tension through the whole arc — the best side-delt movement there is.' },
  { id: 'ex_machine_lateral', name: 'Machine Lateral Raise', primary: 'side_delts', secondary: [], equipment: 'machine' },
  { id: 'ex_front_raise', name: 'Front Raise', primary: 'front_delts', secondary: [], equipment: 'dumbbell' },
  { id: 'ex_rear_delt_fly', name: 'Rear Delt Fly', primary: 'rear_delts', secondary: ['upper_back'], equipment: 'dumbbell', cue: 'Thumbs down, pull wide. If you feel traps, drop the weight.' },
  { id: 'ex_reverse_pec_deck', name: 'Reverse Pec Deck', primary: 'rear_delts', secondary: ['upper_back'], equipment: 'machine' },
  { id: 'ex_face_pull', name: 'Face Pull', primary: 'rear_delts', secondary: ['traps', 'upper_back'], equipment: 'cable', cue: 'Pull to your eyebrows and rotate outward. Your shoulders will thank you.' },
  { id: 'ex_upright_row', name: 'Upright Row', primary: 'side_delts', secondary: ['traps', 'biceps'], equipment: 'barbell' },

  // --------------------------------------------------------------- biceps
  { id: 'ex_barbell_curl', name: 'Barbell Curl', primary: 'biceps', secondary: ['forearms'], equipment: 'barbell', cue: 'Elbows pinned to your ribs. If they drift forward the set is over.' },
  { id: 'ex_ez_curl', name: 'EZ-Bar Curl', primary: 'biceps', secondary: ['forearms'], equipment: 'barbell' },
  { id: 'ex_db_curl', name: 'Dumbbell Curl', primary: 'biceps', secondary: ['forearms'], equipment: 'dumbbell' },
  { id: 'ex_incline_curl', name: 'Incline Dumbbell Curl', primary: 'biceps', secondary: [], equipment: 'dumbbell', cue: 'The stretched position is the whole point. Let the arms hang back.' },
  { id: 'ex_hammer_curl', name: 'Hammer Curl', primary: 'biceps', secondary: ['forearms'], equipment: 'dumbbell', cue: 'Hits the brachialis — this is what actually makes the arm look thicker.' },
  { id: 'ex_preacher_curl', name: 'Preacher Curl', primary: 'biceps', secondary: [], equipment: 'barbell' },
  { id: 'ex_cable_curl', name: 'Cable Curl', primary: 'biceps', secondary: ['forearms'], equipment: 'cable' },
  { id: 'ex_concentration_curl', name: 'Concentration Curl', primary: 'biceps', secondary: [], equipment: 'dumbbell' },
  { id: 'ex_spider_curl', name: 'Spider Curl', primary: 'biceps', secondary: [], equipment: 'dumbbell' },

  // -------------------------------------------------------------- triceps
  { id: 'ex_close_grip_bench', name: 'Close-Grip Bench Press', primary: 'triceps', secondary: ['chest', 'front_delts'], equipment: 'barbell', cue: 'Shoulder-width grip. Narrower just wrecks your wrists.' },
  { id: 'ex_pushdown_rope', name: 'Rope Pushdown', primary: 'triceps', secondary: [], equipment: 'cable', cue: 'Spread the rope apart at the bottom and hold for a beat.' },
  { id: 'ex_pushdown_bar', name: 'Bar Pushdown', primary: 'triceps', secondary: [], equipment: 'cable' },
  { id: 'ex_overhead_cable_ext', name: 'Overhead Cable Extension', primary: 'triceps', secondary: [], equipment: 'cable', cue: 'Overhead work trains the long head — the one that fills out the arm.' },
  { id: 'ex_skullcrusher', name: 'Skull Crusher', primary: 'triceps', secondary: [], equipment: 'barbell', cue: 'Aim behind your head, not at your forehead.' },
  { id: 'ex_db_overhead_ext', name: 'Dumbbell Overhead Extension', primary: 'triceps', secondary: [], equipment: 'dumbbell' },
  { id: 'ex_triceps_dip', name: 'Triceps Dip', primary: 'triceps', secondary: ['chest'], equipment: 'bodyweight', tracking: 'weighted_bodyweight', cue: 'Stay upright and vertical to keep the load on the triceps.' },
  { id: 'ex_cable_kickback', name: 'Cable Kickback', primary: 'triceps', secondary: [], equipment: 'cable' },

  // ------------------------------------------------------------- forearms
  { id: 'ex_wrist_curl', name: 'Wrist Curl', primary: 'forearms', secondary: [], equipment: 'dumbbell' },
  { id: 'ex_reverse_curl', name: 'Reverse Curl', primary: 'forearms', secondary: ['biceps'], equipment: 'barbell' },
  { id: 'ex_farmers_walk', name: 'Farmer Walk', primary: 'forearms', secondary: ['traps', 'abs'], equipment: 'dumbbell', tracking: 'duration', cue: 'Grip fails first. That is the exercise working.' },

  // ----------------------------------------------------------------- legs
  { id: 'ex_back_squat', name: 'Back Squat', primary: 'quads', secondary: ['glutes', 'hamstrings', 'lower_back'], equipment: 'barbell', cue: 'Brace hard before you unrack, not after you have started descending.' },
  { id: 'ex_front_squat', name: 'Front Squat', primary: 'quads', secondary: ['glutes', 'abs'], equipment: 'barbell', cue: 'Elbows high. The moment they drop, the bar rolls.' },
  { id: 'ex_hack_squat', name: 'Hack Squat', primary: 'quads', secondary: ['glutes'], equipment: 'machine', cue: 'Feet lower on the platform biases the quads harder.' },
  { id: 'ex_leg_press', name: 'Leg Press', primary: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'machine', cue: 'Do not let your lower back round off the pad at the bottom.' },
  { id: 'ex_goblet_squat', name: 'Goblet Squat', primary: 'quads', secondary: ['glutes', 'abs'], equipment: 'dumbbell' },
  { id: 'ex_bulgarian_split', name: 'Bulgarian Split Squat', primary: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell', cue: 'Front foot far enough out that your shin stays near vertical.' },
  { id: 'ex_walking_lunge', name: 'Walking Lunge', primary: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell' },
  { id: 'ex_step_up', name: 'Step-Up', primary: 'quads', secondary: ['glutes'], equipment: 'dumbbell' },
  { id: 'ex_leg_extension', name: 'Leg Extension', primary: 'quads', secondary: [], equipment: 'machine', cue: 'Pause at full extension. That top squeeze is where the growth is.' },
  { id: 'ex_smith_squat', name: 'Smith Machine Squat', primary: 'quads', secondary: ['glutes'], equipment: 'machine' },
  { id: 'ex_rdl', name: 'Romanian Deadlift', primary: 'hamstrings', secondary: ['glutes', 'lower_back'], equipment: 'barbell', cue: 'Push your hips back until you feel the stretch, then stop. Depth is not the goal.' },
  { id: 'ex_stiff_leg_dl', name: 'Stiff-Leg Deadlift', primary: 'hamstrings', secondary: ['glutes', 'lower_back'], equipment: 'barbell' },
  { id: 'ex_lying_leg_curl', name: 'Lying Leg Curl', primary: 'hamstrings', secondary: ['calves'], equipment: 'machine' },
  { id: 'ex_seated_leg_curl', name: 'Seated Leg Curl', primary: 'hamstrings', secondary: [], equipment: 'machine', cue: 'Trains the hamstring stretched — slightly better than lying.' },
  { id: 'ex_good_morning', name: 'Good Morning', primary: 'hamstrings', secondary: ['lower_back', 'glutes'], equipment: 'barbell' },
  { id: 'ex_nordic_curl', name: 'Nordic Curl', primary: 'hamstrings', secondary: [], equipment: 'bodyweight', tracking: 'bodyweight_reps' },
  { id: 'ex_hip_thrust', name: 'Barbell Hip Thrust', primary: 'glutes', secondary: ['hamstrings'], equipment: 'barbell', cue: 'Chin tucked, ribs down. Finish with a hard lockout, not more range.' },
  { id: 'ex_glute_bridge', name: 'Glute Bridge', primary: 'glutes', secondary: ['hamstrings'], equipment: 'barbell' },
  { id: 'ex_sumo_deadlift', name: 'Sumo Deadlift', primary: 'glutes', secondary: ['quads', 'hamstrings', 'traps'], equipment: 'barbell' },
  { id: 'ex_cable_glute_kickback', name: 'Cable Glute Kickback', primary: 'glutes', secondary: ['hamstrings'], equipment: 'cable' },
  { id: 'ex_standing_calf_raise', name: 'Standing Calf Raise', primary: 'calves', secondary: [], equipment: 'machine', cue: 'Full stretch at the bottom, two-second pause at the top.' },
  { id: 'ex_seated_calf_raise', name: 'Seated Calf Raise', primary: 'calves', secondary: [], equipment: 'machine', cue: 'Bent knee shifts it to the soleus. Both variations matter.' },
  { id: 'ex_leg_press_calf', name: 'Leg Press Calf Raise', primary: 'calves', secondary: [], equipment: 'machine' },

  // ----------------------------------------------------------------- core
  { id: 'ex_hanging_leg_raise', name: 'Hanging Leg Raise', primary: 'abs', secondary: ['obliques', 'forearms'], equipment: 'bodyweight', tracking: 'weighted_bodyweight', cue: 'Curl your pelvis up. Swinging your legs is a hip flexor exercise.' },
  { id: 'ex_cable_crunch', name: 'Cable Crunch', primary: 'abs', secondary: ['obliques'], equipment: 'cable', cue: 'The only ab movement you can progressively overload properly.' },
  { id: 'ex_ab_wheel', name: 'Ab Wheel Rollout', primary: 'abs', secondary: ['lats', 'lower_back'], equipment: 'other', tracking: 'bodyweight_reps' },
  { id: 'ex_plank', name: 'Plank', primary: 'abs', secondary: ['obliques'], equipment: 'bodyweight', tracking: 'duration' },
  { id: 'ex_side_plank', name: 'Side Plank', primary: 'obliques', secondary: ['abs'], equipment: 'bodyweight', tracking: 'duration' },
  { id: 'ex_russian_twist', name: 'Russian Twist', primary: 'obliques', secondary: ['abs'], equipment: 'other' },
  { id: 'ex_decline_situp', name: 'Decline Sit-Up', primary: 'abs', secondary: [], equipment: 'bodyweight', tracking: 'weighted_bodyweight' },
  { id: 'ex_dead_bug', name: 'Dead Bug', primary: 'abs', secondary: [], equipment: 'bodyweight', tracking: 'bodyweight_reps' },

  // --------------------------------------------------------------- cardio
  { id: 'ex_treadmill', name: 'Treadmill Run', primary: 'cardio', secondary: ['quads', 'calves'], equipment: 'machine', tracking: 'distance_duration' },
  { id: 'ex_incline_walk', name: 'Incline Walk', primary: 'cardio', secondary: ['glutes', 'calves'], equipment: 'machine', tracking: 'distance_duration', cue: '12 percent incline, 5 km/h. Boring, effective, joint-friendly.' },
  { id: 'ex_stationary_bike', name: 'Stationary Bike', primary: 'cardio', secondary: ['quads'], equipment: 'machine', tracking: 'distance_duration' },
  { id: 'ex_rowing_machine', name: 'Rowing Machine', primary: 'cardio', secondary: ['upper_back', 'quads'], equipment: 'machine', tracking: 'distance_duration' },
  { id: 'ex_stairmaster', name: 'Stair Master', primary: 'cardio', secondary: ['glutes', 'quads'], equipment: 'machine', tracking: 'duration' },
  { id: 'ex_elliptical', name: 'Elliptical', primary: 'cardio', secondary: [], equipment: 'machine', tracking: 'distance_duration' },
  { id: 'ex_jump_rope', name: 'Jump Rope', primary: 'cardio', secondary: ['calves'], equipment: 'other', tracking: 'duration' },

  // ------------------------------------------------- added for the cut split
  { id: 'ex_v_step_db_squat', name: 'V-Step Dumbbell Squat', primary: 'quads', secondary: ['glutes'], equipment: 'dumbbell', cue: 'Step out on the diagonal and keep the trailing hip square.' },
  { id: 'ex_smith_single_leg_press', name: 'Smith Machine Single-Leg Press', primary: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'machine', cue: 'One leg at a time under the bar — control the descent, do not bounce.' },
  { id: 'ex_v_bar_shrug', name: 'V-Bar Shrug', primary: 'traps', secondary: ['forearms'], equipment: 'cable', cue: 'Straight up and pause. The V-bar keeps the load close to your centre.' },
  { id: 'ex_cable_high_pull', name: 'Cable High Pull', primary: 'traps', secondary: ['rear_delts', 'side_delts'], equipment: 'cable', cue: 'Lead with the elbows and finish high, around collarbone height.' },
  { id: 'ex_behind_neck_press', name: 'Behind-the-Neck Press', primary: 'front_delts', secondary: ['side_delts', 'triceps'], equipment: 'barbell', cue: 'Only go as low as your shoulders allow comfortably. Ego has no place here.' },
  { id: 'ex_db_reverse_shrug', name: 'Dumbbell Reverse Shrug', primary: 'traps', secondary: ['rear_delts'], equipment: 'dumbbell', cue: 'Shrug back and down rather than straight up — hits the lower traps.' },

  { id: 'ex_reverse_lat_pulldown', name: 'Reverse-Grip Lat Pulldown', primary: 'lats', secondary: ['biceps'], equipment: 'cable', cue: 'Underhand grip shortens the lever and lets the lats do more.' },
  { id: 'ex_incline_rear_delt_raise', name: 'Incline Dumbbell Rear Delt Raise', primary: 'rear_delts', secondary: ['upper_back'], equipment: 'dumbbell', cue: 'Chest on the pad so momentum is off the table.' },
  { id: 'ex_cable_row_low_high', name: 'Standing Low-to-High Cable Row', primary: 'upper_back', secondary: ['rear_delts', 'lats'], equipment: 'cable', cue: 'Pull from low to high and squeeze at chest height.' },
  { id: 'ex_db_deadlift', name: 'Dumbbell Deadlift', primary: 'hamstrings', secondary: ['glutes', 'lower_back', 'traps'], equipment: 'dumbbell', cue: 'Dumbbells travel close to the shins. Hips back, not down.' },
  { id: 'ex_reverse_cable_curl', name: 'Reverse-Grip Cable Curl', primary: 'forearms', secondary: ['biceps'], equipment: 'cable', cue: 'Overhand grip. Lighter than a normal curl — the wrists decide.' },

  { id: 'ex_high_cable_pullover', name: 'High Cable Pullover', primary: 'chest', secondary: ['lats'], equipment: 'cable', cue: 'Slight forward lean, arms nearly straight, pull down in an arc.' },
  { id: 'ex_decline_cable_fly', name: 'Decline Cable Fly', primary: 'chest', secondary: [], equipment: 'cable', cue: 'High anchors, hands finish low and together across the hips.' },
  { id: 'ex_reverse_pushdown', name: 'Reverse-Grip Pushdown', primary: 'triceps', secondary: [], equipment: 'cable', cue: 'Underhand grip biases the medial head. Keep the wrists neutral.' },
  { id: 'ex_short_bar_overhead_ext', name: 'Short Bar Overhead Extension', primary: 'triceps', secondary: [], equipment: 'cable', cue: 'Overhead puts the long head on stretch — that is the whole point.' },
  { id: 'ex_db_kickback', name: 'Dumbbell Kickback', primary: 'triceps', secondary: [], equipment: 'dumbbell', cue: 'Upper arm pinned parallel to the floor. Only the forearm moves.' },
];

/** Human labels for muscle groups, used everywhere in the UI. */
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  lats: 'Lats',
  upper_back: 'Upper Back',
  traps: 'Traps',
  lower_back: 'Lower Back',
  front_delts: 'Front Delts',
  side_delts: 'Side Delts',
  rear_delts: 'Rear Delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  obliques: 'Obliques',
  cardio: 'Cardio',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  other: 'Other',
};

/** Coarse grouping for filter chips and the muscle map. */
export const MUSCLE_REGIONS: Record<string, MuscleGroup[]> = {
  Chest: ['chest'],
  Back: ['lats', 'upper_back', 'traps', 'lower_back'],
  Shoulders: ['front_delts', 'side_delts', 'rear_delts'],
  Arms: ['biceps', 'triceps', 'forearms'],
  Legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  Core: ['abs', 'obliques'],
  Cardio: ['cardio'],
};
