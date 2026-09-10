import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { MUSCLE_LABELS } from '@/db/exerciseLibrary';
import type { MuscleGroup } from '@/db/types';
import { heatRamp, palette, space } from '@/theme';

export type MuscleView = 'front' | 'back';

export interface MuscleMapProps {
  /** Weighted set counts keyed by muscle. Missing keys read as untrained. */
  load: Map<MuscleGroup, number>;
  view: MuscleView;
  width?: number;
  /** Sets per week that counts as fully worked. Above this it stays max heat. */
  ceiling?: number;
  onSelect?: (muscle: MuscleGroup) => void;
}

/**
 * Muscle heat map.
 *
 * Deliberately a diagram, not an illustration: each group is its own clean
 * geometric block with the non-muscle parts (head, hands, feet) rendered as
 * neutral spacers. A stylised chart like this reads as intentional, where a
 * half-accurate anatomical drawing just reads as a bad anatomical drawing.
 */
export function MuscleMap({ load, view, width = 220, ceiling = 12, onSelect }: MuscleMapProps) {
  const height = width * 2;

  const colorFor = useMemo(() => {
    return (muscle: MuscleGroup): string => {
      const sets = load.get(muscle) ?? 0;
      if (sets <= 0) return heatRamp[0];
      const ratio = Math.min(1, sets / ceiling);
      // Bucket into the ramp rather than interpolating — discrete steps make
      // "worked twice" vs "worked six times" legible at a glance.
      const index = Math.min(heatRamp.length - 1, 1 + Math.floor(ratio * (heatRamp.length - 2)));
      return heatRamp[index]!;
    };
  }, [load, ceiling]);

  const muscle = (name: MuscleGroup) => ({
    fill: colorFor(name),
    onPress: onSelect ? () => onSelect(name) : undefined,
    stroke: palette.void,
    strokeWidth: 1.2,
  });

  const neutral = { fill: '#15181C', stroke: palette.void, strokeWidth: 1.2 };

  return (
    <View style={{ width, height, alignSelf: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 100 200">
        {view === 'front' ? (
          <G>
            <Circle cx={50} cy={12} r={8.5} {...neutral} />
            <Rect x={46} y={19} width={8} height={7} rx={3} {...neutral} />

            {/* Delts sit outboard of the chest with a gap. Overlapping them
                turns the whole shoulder line into one unreadable slab. */}
            <Ellipse cx={26} cy={35} rx={7.5} ry={7} {...muscle('front_delts')} />
            <Ellipse cx={74} cy={35} rx={7.5} ry={7} {...muscle('front_delts')} />

            <Rect x={36} y={27.5} width={13} height={20} rx={5} {...muscle('chest')} />
            <Rect x={51} y={27.5} width={13} height={20} rx={5} {...muscle('chest')} />

            <Ellipse cx={22} cy={55} rx={5.5} ry={11} {...muscle('biceps')} />
            <Ellipse cx={78} cy={55} rx={5.5} ry={11} {...muscle('biceps')} />

            <Ellipse cx={17.5} cy={79} rx={5} ry={12.5} {...muscle('forearms')} />
            <Ellipse cx={82.5} cy={79} rx={5} ry={12.5} {...muscle('forearms')} />

            <Circle cx={15.5} cy={95} r={4} {...neutral} />
            <Circle cx={84.5} cy={95} r={4} {...neutral} />

            <Rect x={42} y={49.5} width={16} height={28} rx={5} {...muscle('abs')} />
            <Rect x={35} y={51.5} width={6} height={24} rx={3} {...muscle('obliques')} />
            <Rect x={59} y={51.5} width={6} height={24} rx={3} {...muscle('obliques')} />

            <Rect x={37} y={78.5} width={26} height={8} rx={4} {...neutral} />

            <Ellipse cx={41} cy={109} rx={8.5} ry={23} {...muscle('quads')} />
            <Ellipse cx={59} cy={109} rx={8.5} ry={23} {...muscle('quads')} />

            <Circle cx={41} cy={137} r={5.5} {...neutral} />
            <Circle cx={59} cy={137} r={5.5} {...neutral} />

            <Ellipse cx={40.5} cy={160} rx={7} ry={16} {...muscle('calves')} />
            <Ellipse cx={59.5} cy={160} rx={7} ry={16} {...muscle('calves')} />

            <Rect x={35} y={180} width={11} height={8} rx={3.5} {...neutral} />
            <Rect x={54} y={180} width={11} height={8} rx={3.5} {...neutral} />
          </G>
        ) : (
          <G>
            <Circle cx={50} cy={12} r={8.5} {...neutral} />

            {/* Traps: a kite from the neck out to the shoulder line. */}
            <Path d="M50 19 L63 31 L57.5 46 L42.5 46 L37 31 Z" {...muscle('traps')} />

            <Ellipse cx={26} cy={35} rx={7.5} ry={7} {...muscle('rear_delts')} />
            <Ellipse cx={74} cy={35} rx={7.5} ry={7} {...muscle('rear_delts')} />

            {/* Lats taper from the armpit down into the waist. */}
            <Path d="M37 34 L44.5 34 L45.5 63 L37.5 69 L32 49 Z" {...muscle('lats')} />
            <Path d="M63 34 L55.5 34 L54.5 63 L62.5 69 L68 49 Z" {...muscle('lats')} />

            <Rect x={43} y={46.5} width={14} height={13} rx={4} {...muscle('upper_back')} />

            <Ellipse cx={22} cy={55} rx={5.5} ry={11} {...muscle('triceps')} />
            <Ellipse cx={78} cy={55} rx={5.5} ry={11} {...muscle('triceps')} />

            <Ellipse cx={17.5} cy={79} rx={5} ry={12.5} {...muscle('forearms')} />
            <Ellipse cx={82.5} cy={79} rx={5} ry={12.5} {...muscle('forearms')} />

            <Circle cx={15.5} cy={95} r={4} {...neutral} />
            <Circle cx={84.5} cy={95} r={4} {...neutral} />

            <Rect x={42} y={61} width={16} height={16} rx={5} {...muscle('lower_back')} />

            <Ellipse cx={42} cy={87} rx={8.5} ry={9} {...muscle('glutes')} />
            <Ellipse cx={58} cy={87} rx={8.5} ry={9} {...muscle('glutes')} />

            <Ellipse cx={41} cy={116} rx={8.5} ry={20} {...muscle('hamstrings')} />
            <Ellipse cx={59} cy={116} rx={8.5} ry={20} {...muscle('hamstrings')} />

            <Circle cx={41} cy={140} r={5.5} {...neutral} />
            <Circle cx={59} cy={140} r={5.5} {...neutral} />

            <Ellipse cx={40.5} cy={161} rx={7} ry={16} {...muscle('calves')} />
            <Ellipse cx={59.5} cy={161} rx={7} ry={16} {...muscle('calves')} />

            <Rect x={35} y={180} width={11} height={8} rx={3.5} {...neutral} />
            <Rect x={54} y={180} width={11} height={8} rx={3.5} {...neutral} />
          </G>
        )}
      </Svg>
    </View>
  );
}

/** Discrete legend that matches the bucketing used by the map itself. */
export function MuscleMapLegend({ ceiling = 12 }: { ceiling?: number }) {
  return (
    <View style={styles.legend}>
      <Text variant="caption" color="tertiary">
        Rest
      </Text>
      <View style={styles.ramp}>
        {heatRamp.map((color) => (
          <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
        ))}
      </View>
      <Text variant="caption" color="tertiary">
        {ceiling}+ sets
      </Text>
    </View>
  );
}

/** Ranked list beside the map — the map shows balance, this shows numbers. */
export function MuscleLoadList({
  load,
  limit = 6,
}: {
  load: { muscle: MuscleGroup; sets: number }[];
  limit?: number;
}) {
  const max = Math.max(1, ...load.map((l) => l.sets));
  return (
    <View style={{ gap: space.sm }}>
      {load.slice(0, limit).map((entry) => (
        <View key={entry.muscle} style={styles.row}>
          <Text variant="label" color="secondary" style={styles.rowLabel} numberOfLines={1}>
            {MUSCLE_LABELS[entry.muscle]}
          </Text>
          <View style={styles.rowTrack}>
            <View
              style={[
                styles.rowFill,
                { width: `${Math.max(4, (entry.sets / max) * 100)}%` },
              ]}
            />
          </View>
          <Text variant="numeric" style={styles.rowValue}>
            {entry.sets % 1 === 0 ? entry.sets : entry.sets.toFixed(1)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  ramp: {
    flexDirection: 'row',
    gap: 3,
  },
  swatch: {
    width: 16,
    height: 8,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rowLabel: {
    width: 84,
  },
  rowTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.surfaceHigh,
    overflow: 'hidden',
  },
  rowFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: palette.accent,
  },
  rowValue: {
    fontSize: 14,
    width: 34,
    textAlign: 'right',
  },
});
