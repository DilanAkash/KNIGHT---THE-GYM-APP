export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  repsLow: number;
  repsHigh: number;
  rest: number;
  supersetGroup?: string;
  notes?: string;
}

export interface TemplateDay {
  name: string;
  exercises: TemplateExercise[];
}

export interface RoutineTemplate {
  key: string;
  name: string;
  description: string;
  daysPerWeek: number;
  days: TemplateDay[];
}

const e = (
  exerciseId: string,
  sets: number,
  repsLow: number,
  repsHigh: number,
  rest: number,
  extra: Partial<TemplateExercise> = {},
): TemplateExercise => ({ exerciseId, sets, repsLow, repsHigh, rest, ...extra });

/**
 * Push / Pull / Legs, run twice a week.
 * A-days lead with a heavy compound in a low rep range; B-days rotate the
 * emphasis so nothing gets hammered from the same angle twice in a week.
 */
export const PPL_TEMPLATE: RoutineTemplate = {
  key: 'ppl',
  name: 'Push / Pull / Legs',
  description: 'Six days, two rotations. Heavy compound first, isolation to finish.',
  daysPerWeek: 6,
  days: [
    {
      name: 'Push A',
      exercises: [
        e('ex_bench_press', 4, 5, 8, 180, { notes: 'Top set then back-offs. Leave one in the tank.' }),
        e('ex_db_shoulder_press', 3, 8, 12, 120),
        e('ex_incline_db_press', 3, 8, 12, 120),
        e('ex_cable_lateral', 4, 12, 20, 60),
        e('ex_pushdown_rope', 3, 10, 15, 60),
        e('ex_overhead_cable_ext', 3, 10, 15, 60),
      ],
    },
    {
      name: 'Pull A',
      exercises: [
        e('ex_pullup', 4, 6, 10, 150, { notes: 'Add weight once you clear 10 clean reps.' }),
        e('ex_barbell_row', 4, 6, 10, 150),
        e('ex_seated_cable_row', 3, 10, 12, 90),
        e('ex_face_pull', 3, 15, 20, 60),
        e('ex_incline_curl', 3, 8, 12, 60),
        e('ex_hammer_curl', 3, 10, 15, 60),
      ],
    },
    {
      name: 'Legs A',
      exercises: [
        e('ex_back_squat', 4, 5, 8, 210),
        e('ex_rdl', 3, 8, 12, 150),
        e('ex_leg_press', 3, 10, 15, 120),
        e('ex_seated_leg_curl', 3, 10, 15, 90),
        e('ex_standing_calf_raise', 4, 10, 15, 60),
        e('ex_hanging_leg_raise', 3, 10, 15, 60),
      ],
    },
    {
      name: 'Push B',
      exercises: [
        e('ex_ohp', 4, 5, 8, 180),
        e('ex_incline_bench', 3, 8, 12, 150),
        e('ex_cable_fly_high', 3, 12, 15, 75),
        e('ex_lateral_raise', 4, 12, 20, 60),
        e('ex_close_grip_bench', 3, 8, 12, 120),
        e('ex_pushdown_bar', 3, 12, 15, 60),
      ],
    },
    {
      name: 'Pull B',
      exercises: [
        e('ex_deadlift', 3, 3, 5, 240, { notes: 'Stop the set the moment bar speed drops.' }),
        e('ex_lat_pulldown', 4, 8, 12, 120),
        e('ex_chest_supported_row', 3, 10, 12, 90),
        e('ex_reverse_pec_deck', 3, 15, 20, 60),
        e('ex_barbell_curl', 3, 8, 12, 75),
        e('ex_cable_curl', 3, 12, 15, 60),
      ],
    },
    {
      name: 'Legs B',
      exercises: [
        e('ex_front_squat', 4, 6, 10, 180),
        e('ex_hip_thrust', 3, 8, 12, 120),
        e('ex_bulgarian_split', 3, 8, 12, 120),
        e('ex_lying_leg_curl', 3, 10, 15, 90),
        e('ex_seated_calf_raise', 4, 12, 20, 60),
        e('ex_cable_crunch', 3, 12, 15, 60),
      ],
    },
  ],
};

export const UPPER_LOWER_TEMPLATE: RoutineTemplate = {
  key: 'upper_lower',
  name: 'Upper / Lower',
  description: 'Four days. The best return per session if you cannot train six.',
  daysPerWeek: 4,
  days: [
    {
      name: 'Upper A',
      exercises: [
        e('ex_bench_press', 4, 5, 8, 180),
        e('ex_barbell_row', 4, 6, 10, 150),
        e('ex_db_shoulder_press', 3, 8, 12, 120),
        e('ex_lat_pulldown', 3, 10, 12, 90),
        e('ex_lateral_raise', 3, 12, 20, 60),
        e('ex_ez_curl', 3, 8, 12, 60),
        e('ex_pushdown_rope', 3, 10, 15, 60),
      ],
    },
    {
      name: 'Lower A',
      exercises: [
        e('ex_back_squat', 4, 5, 8, 210),
        e('ex_rdl', 3, 8, 12, 150),
        e('ex_leg_press', 3, 10, 15, 120),
        e('ex_lying_leg_curl', 3, 10, 15, 90),
        e('ex_standing_calf_raise', 4, 10, 15, 60),
        e('ex_cable_crunch', 3, 12, 15, 60),
      ],
    },
    {
      name: 'Upper B',
      exercises: [
        e('ex_ohp', 4, 5, 8, 180),
        e('ex_pullup', 4, 6, 10, 150),
        e('ex_incline_db_press', 3, 8, 12, 120),
        e('ex_chest_supported_row', 3, 10, 12, 90),
        e('ex_face_pull', 3, 15, 20, 60),
        e('ex_hammer_curl', 3, 10, 15, 60),
        e('ex_overhead_cable_ext', 3, 10, 15, 60),
      ],
    },
    {
      name: 'Lower B',
      exercises: [
        e('ex_deadlift', 3, 3, 5, 240),
        e('ex_front_squat', 3, 6, 10, 180),
        e('ex_bulgarian_split', 3, 8, 12, 120),
        e('ex_seated_leg_curl', 3, 10, 15, 90),
        e('ex_seated_calf_raise', 4, 12, 20, 60),
        e('ex_hanging_leg_raise', 3, 10, 15, 60),
      ],
    },
  ],
};

export const FULL_BODY_TEMPLATE: RoutineTemplate = {
  key: 'full_body',
  name: 'Full Body',
  description: 'Three days. Every session hits everything — hard to skip a muscle.',
  daysPerWeek: 3,
  days: [
    {
      name: 'Full Body A',
      exercises: [
        e('ex_back_squat', 3, 5, 8, 180),
        e('ex_bench_press', 3, 5, 8, 180),
        e('ex_barbell_row', 3, 6, 10, 150),
        e('ex_lateral_raise', 3, 12, 20, 60),
        e('ex_ez_curl', 2, 10, 15, 60),
        e('ex_pushdown_rope', 2, 10, 15, 60),
      ],
    },
    {
      name: 'Full Body B',
      exercises: [
        e('ex_deadlift', 3, 3, 5, 240),
        e('ex_ohp', 3, 6, 10, 150),
        e('ex_lat_pulldown', 3, 8, 12, 120),
        e('ex_leg_press', 3, 10, 15, 120),
        e('ex_face_pull', 3, 15, 20, 60),
        e('ex_cable_crunch', 3, 12, 15, 60),
      ],
    },
    {
      name: 'Full Body C',
      exercises: [
        e('ex_front_squat', 3, 6, 10, 180),
        e('ex_incline_db_press', 3, 8, 12, 120),
        e('ex_chest_supported_row', 3, 10, 12, 90),
        e('ex_rdl', 3, 8, 12, 150),
        e('ex_standing_calf_raise', 3, 10, 15, 60),
        e('ex_hammer_curl', 2, 10, 15, 60),
      ],
    },
  ],
};


/**
 * Dilan's cut split: three sessions, two muscle groups each, high reps
 * throughout. Transcribed from his own programme — the naming is cleaned up
 * but the exercise order, set counts and rep targets are exactly as written.
 */
export const CUT_SPLIT_TEMPLATE: RoutineTemplate = {
  key: 'cut_split',
  name: 'Cut Split',
  description: 'Legs/Shoulders, Back/Biceps, Chest/Triceps. High rep, short rest.',
  daysPerWeek: 3,
  days: [
    {
      name: 'Legs & Shoulders',
      exercises: [
        e('ex_leg_extension', 3, 20, 20, 60),
        e('ex_v_step_db_squat', 3, 15, 15, 60, { notes: '15 each side.' }),
        e('ex_smith_single_leg_press', 3, 15, 15, 60, { notes: '15 each leg.' }),
        e('ex_leg_press', 3, 15, 15, 90),
        e('ex_standing_calf_raise', 3, 25, 25, 45),
        e('ex_v_bar_shrug', 3, 15, 15, 60),
        e('ex_cable_high_pull', 3, 15, 15, 60),
        e('ex_behind_neck_press', 3, 15, 15, 75),
        e('ex_barbell_shrug', 3, 15, 15, 60),
        e('ex_db_reverse_shrug', 3, 15, 15, 60),
      ],
    },
    {
      name: 'Back & Biceps',
      exercises: [
        e('ex_reverse_lat_pulldown', 3, 15, 15, 75),
        e('ex_barbell_row', 3, 15, 15, 75),
        e('ex_incline_rear_delt_raise', 3, 15, 15, 60),
        e('ex_cable_row_low_high', 3, 15, 15, 60),
        e('ex_db_deadlift', 3, 15, 15, 90),
        e('ex_db_curl', 3, 15, 15, 60, { notes: 'Elbow stays back.' }),
        e('ex_barbell_curl', 3, 15, 15, 60, { notes: 'Keep a gap between the bar and your body.' }),
        e('ex_hammer_curl', 3, 15, 15, 60),
        e('ex_reverse_curl', 3, 15, 15, 60),
        e('ex_reverse_cable_curl', 3, 15, 15, 60),
      ],
    },
    {
      name: 'Chest & Triceps',
      exercises: [
        e('ex_cable_fly_high', 3, 8, 12, 75, { notes: 'Climbing weight: 12, 10, 8.' }),
        e('ex_high_cable_pullover', 3, 15, 15, 60),
        e('ex_db_bench', 3, 15, 15, 90),
        e('ex_decline_bench', 3, 15, 15, 90),
        e('ex_decline_cable_fly', 3, 15, 15, 60),
        e('ex_db_overhead_ext', 5, 15, 15, 60),
        e('ex_pushdown_rope', 3, 15, 15, 60, { notes: 'Close grip.' }),
        e('ex_reverse_pushdown', 3, 15, 15, 60),
        e('ex_short_bar_overhead_ext', 3, 15, 15, 60, { notes: 'Upper chest of the triceps — long head.' }),
        e('ex_db_kickback', 3, 15, 15, 45),
      ],
    },
  ],
};

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  CUT_SPLIT_TEMPLATE,
  PPL_TEMPLATE,
  UPPER_LOWER_TEMPLATE,
  FULL_BODY_TEMPLATE,
];
