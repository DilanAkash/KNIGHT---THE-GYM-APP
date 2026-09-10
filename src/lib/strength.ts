import type { WeightUnit } from '@/db/types';

/**
 * Estimated 1RM (Epley). Chosen over Brzycki because it stays sane at higher
 * rep counts, which matters when most of your sets sit in the 8-12 range.
 * Above ~12 reps the estimate drifts badly, so callers should treat those as
 * indicative only.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Weight you would need for a target rep count, given a known e1RM. */
export function weightForReps(oneRepMax: number, reps: number): number {
  if (oneRepMax <= 0 || reps <= 0) return 0;
  return oneRepMax / (1 + reps / 30);
}

export const KG_PER_LB = 0.45359237;

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function fromKg(valueKg: number, unit: WeightUnit): number {
  return unit === 'kg' ? valueKg : valueKg / KG_PER_LB;
}

/** Trims trailing zeros so 62.5 stays 62.5 but 60.0 renders as 60. */
export function formatWeight(value: number, unit: WeightUnit): string {
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(rounded * 10 % 1 === 0 ? 1 : 2);
  return `${text} ${unit}`;
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Compact volume display — 12,480 becomes 12.5k so it fits a stat tile. */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1000)}k`;
  if (Math.abs(value) >= 1_000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

export interface PlateLayout {
  /** Plates for ONE side of the bar, heaviest first. */
  perSide: number[];
  /** Weight that could not be made with the available plates. */
  remainder: number;
  barWeight: number;
  achievable: number;
}

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5];

/**
 * Greedy plate breakdown. Greedy is optimal here because commercial plate sets
 * are super-increasing at every step, and it matches how you'd actually load
 * a bar — heaviest on first.
 */
export function calculatePlates(
  target: number,
  barWeight: number,
  available: number[],
): PlateLayout {
  const perSide: number[] = [];
  let sideWeight = (target - barWeight) / 2;

  if (sideWeight <= 0) {
    return { perSide, remainder: Math.max(0, target - barWeight), barWeight, achievable: barWeight };
  }

  const plates = [...available].sort((a, b) => b - a);
  for (const plate of plates) {
    while (sideWeight >= plate - 1e-6) {
      perSide.push(plate);
      sideWeight -= plate;
    }
  }

  const loaded = perSide.reduce((sum, p) => sum + p, 0);
  return {
    perSide,
    remainder: Math.round(sideWeight * 100) / 100,
    barWeight,
    achievable: Math.round((barWeight + loaded * 2) * 100) / 100,
  };
}

/** Groups [25,25,10,5] into [{plate:25,count:2},{plate:10,count:1}...] for display. */
export function groupPlates(perSide: number[]): { plate: number; count: number }[] {
  const out: { plate: number; count: number }[] = [];
  for (const plate of perSide) {
    const last = out[out.length - 1];
    if (last && last.plate === plate) last.count += 1;
    else out.push({ plate, count: 1 });
  }
  return out;
}

/**
 * Volume for a set. Bodyweight movements still generate real load, so we count
 * added weight plus a bodyweight contribution rather than logging zero volume
 * for a set of weighted pull-ups.
 */
export function setVolume(weight: number, reps: number): number {
  return Math.max(0, weight) * Math.max(0, reps);
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** "1h 12m" style, for summaries where a running clock would be wrong. */
export function formatDurationLong(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.round((s % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}
