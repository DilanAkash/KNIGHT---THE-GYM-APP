import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appear } from '@/components/ui/Appear';
import { Text } from '@/components/ui/Text';
import { addDays, dateKey, monthShort, startOfDay, startOfWeek } from '@/lib/date';
import { heatRamp, palette, space } from '@/theme';

export interface ConsistencyGridProps {
  /** date key -> volume for that day. Absent keys are rest days. */
  days: Map<string, number>;
  weeks?: number;
  cell?: number;
}

/**
 * Training consistency at a glance, one column per week.
 *
 * Colour encodes session volume rather than a simple yes/no, so a light
 * technique day and a brutal squat session don't look identical. It scrolls
 * to the right edge by default because the present is the interesting end.
 */
export function ConsistencyGrid({ days, weeks = 20, cell = 13 }: ConsistencyGridProps) {
  const { columns, monthMarks, max } = useMemo(() => {
    const start = addDays(startOfWeek(), -(weeks - 1) * 7);
    const cols: { key: string; volume: number | null; isFuture: boolean }[][] = [];
    const marks: { index: number; label: string }[] = [];
    const today = startOfDay();
    let peak = 0;

    for (let w = 0; w < weeks; w += 1) {
      const column: { key: string; volume: number | null; isFuture: boolean }[] = [];
      for (let d = 0; d < 7; d += 1) {
        const date = addDays(start, w * 7 + d);
        const key = dateKey(date);
        const volume = days.get(key) ?? null;
        if (volume && volume > peak) peak = volume;
        column.push({ key, volume, isFuture: date.getTime() > today.getTime() });
      }
      cols.push(column);

      const firstOfWeek = addDays(start, w * 7);
      const previous = addDays(start, (w - 1) * 7);
      if (w === 0 || firstOfWeek.getMonth() !== previous.getMonth()) {
        marks.push({ index: w, label: monthShort(firstOfWeek) });
      }
    }
    return { columns: cols, monthMarks: marks, max: peak };
  }, [days, weeks]);

  const colorFor = (volume: number | null, isFuture: boolean): string => {
    if (isFuture) return 'transparent';
    if (volume === null || volume <= 0) return heatRamp[0];
    const ratio = max > 0 ? volume / max : 0;
    const index = Math.min(heatRamp.length - 1, 2 + Math.floor(ratio * (heatRamp.length - 3)));
    return heatRamp[index]!;
  };

  return (
    <View style={{ gap: space.sm }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Newest weeks are what you actually want to see first.
        contentOffset={{ x: weeks * (cell + 3), y: 0 }}
      >
        <View>
          <View style={[styles.months, { height: 14 }]}>
            {monthMarks.map((mark) => (
              <Text
                key={`${mark.label}-${mark.index}`}
                variant="caption"
                color="tertiary"
                style={{ position: 'absolute', left: mark.index * (cell + 3), fontSize: 10 }}
              >
                {mark.label}
              </Text>
            ))}
          </View>
          <Appear from="fade" style={styles.grid}>
            {columns.map((column, columnIndex) => (
              <View key={columnIndex} style={{ gap: 3 }}>
                {column.map((day) => (
                  <View
                    key={day.key}
                    style={{
                      width: cell,
                      height: cell,
                      borderRadius: 3,
                      backgroundColor: colorFor(day.volume, day.isFuture),
                      borderWidth: day.isFuture ? StyleSheet.hairlineWidth : 0,
                      borderColor: palette.hairline,
                    }}
                  />
                ))}
              </View>
            ))}
          </Appear>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  months: {
    position: 'relative',
    marginBottom: 2,
  },
  grid: {
    flexDirection: 'row',
    gap: 3,
  },
});
