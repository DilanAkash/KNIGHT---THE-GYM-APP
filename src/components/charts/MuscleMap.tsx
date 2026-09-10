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
            <Circle cx={50} cy={13} r={9.5} {...neutral} />
            <Rect x={45.5} y={21} width={9} height={6} rx={2.5} {...neutral} />

            <Ellipse cx={29.5} cy={36} rx={8.5} ry={7.5} {...muscle('front_delts')} />
            <Ellipse cx={70.5} cy={36} rx={8.5} ry={7.5} {...muscle('front_delts')} />

            <Rect x={35.5} y={28.5} width={13.5} height={20} rx={5} {...muscle('chest')} />
            <Rect x={51} y={28.5} width={13.5} height={20} rx={5} {...muscle('chest')} />

            <Ellipse cx={23} cy={55} rx={6} ry={11} {...muscle('biceps')} />
            <Ellipse cx={77} cy={55} rx={6} ry={11} {...muscle('biceps')} />

            <Ellipse cx={18.5} cy={78} rx={5.5} ry={13} {...muscle('forearms')} />
            <Ellipse cx={81.5} cy={78} rx={5.5} ry={13} {...muscle('forearms')} />

            <Circle cx={16} cy={94} r={4.5} {...neutral} />
            <Circle cx={84} cy={94} r={4.5} {...neutral} />

            <Rect x={42} y={50.5} width={16} height={27} rx={5} {...muscle('abs')} />
            <Rect x={34.5} y={52.5} width={6.5} height={24} rx={3} {...muscle('obliques')} />
            <Rect x={59} y={52.5} width={6.5} height={24} rx={3} {...muscle('obliques')} />

            <Rect x={37} y={78.5} width={26} height={8} rx={4} {...neutral} />

            <Ellipse cx={40} cy={108} rx={11} ry={24} {...muscle('quads')} />
            <Ellipse cx={60} cy={108} rx={11} ry={24} {...muscle('quads')} />

            <Circle cx={40} cy={136} r={6} {...neutral} />
            <Circle cx={60} cy={136} r={6} {...neutral} />

            <Ellipse cx={39.5} cy={160} rx={8} ry={17} {...muscle('calves')} />
            <Ellipse cx={60.5} cy={160} rx={8} ry={17} {...muscle('calves')} />

            <Rect x={34} y={181} width={11} height={8} rx={3.5} {...neutral} />
            <Rect x={55} y={181} width={11} height={8} rx={3.5} {...neutral} />
          </G>
        ) : (
          <G>
            <Circle cx={50} cy={13} r={9.5} {...neutral} />

            <Path d="M50 20.5 L65 32 L58.5 47 L41.5 47 L35 32 Z" {...muscle('traps')} />

            <Ellipse cx={29.5} cy={36} rx={8.5} ry={7.5} {...muscle('rear_delts')} />
            <Ellipse cx={70.5} cy={36} rx={8.5} ry={7.5} {...muscle('rear_delts')} />

            <Path d="M36 35 L44 35 L46 64 L36.5 70 L30.5 50 Z" {...muscle('lats')} />
            <Path d="M64 35 L56 35 L54 64 L63.5 70 L69.5 50 Z" {...muscle('lats')} />

            <Rect x={42} y={47.5} width={16} height={13} rx={4} {...muscle('upper_back')} />

            <Ellipse cx={23} cy={55} rx={6} ry={11} {...muscle('triceps')} />
            <Ellipse cx={77} cy={55} rx={6} ry={11} {...muscle('triceps')} />

            <Ellipse cx={18.5} cy={78} rx={5.5} ry={13} {...muscle('forearms')} />
            <Ellipse cx={81.5} cy={78} rx={5.5} ry={13} {...muscle('forearms')} />

            <Circle cx={16} cy={94} r={4.5} {...neutral} />
            <Circle cx={84} cy={94} r={4.5} {...neutral} />

            <Rect x={41.5} y={62} width={17} height={15} rx={5} {...muscle('lower_back')} />

            <Ellipse cx={41.5} cy={87} rx={10} ry={9.5} {...muscle('glutes')} />
            <Ellipse cx={58.5} cy={87} rx={10} ry={9.5} {...muscle('glutes')} />

            <Ellipse cx={40} cy={115} rx={11} ry={21} {...muscle('hamstrings')} />
            <Ellipse cx={60} cy={115} rx={11} ry={21} {...muscle('hamstrings')} />

            <Circle cx={40} cy={139} r={6} {...neutral} />
            <Circle cx={60} cy={139} r={6} {...neutral} />

            <Ellipse cx={39.5} cy={161} rx={8} ry={17} {...muscle('calves')} />
            <Ellipse cx={60.5} cy={161} rx={8} ry={17} {...muscle('calves')} />

            <Rect x={34} y={181} width={11} height={8} rx={3.5} {...neutral} />
            <Rect x={55} y={181} width={11} height={8} rx={3.5} {...neutral} />
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
