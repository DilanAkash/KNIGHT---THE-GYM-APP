import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { addDays, dateKey, startOfDay, startOfWeek } from '@/lib/date';
import { palette, radius, space } from '@/theme';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export interface WeekStripProps {
  /** date key -> session volume. Absent keys are untrained days. */
  days: Map<string, number>;
}

/**
 * The current training week at a glance.
 *
 * Seven marks is the fastest possible answer to "how am I doing", and unlike a
 * bare count it shows the shape of the week — three in a row then nothing since
 * Wednesday reads very differently from three spread out. Today gets a ring
 * whether or not it's been trained, so there's always a "you are here".
 */
export function WeekStrip({ days }: WeekStripProps) {
  const monday = startOfWeek();
  const today = startOfDay().getTime();

  return (
    <View style={styles.row}>
      {LETTERS.map((letter, index) => {
        const date = addDays(monday, index);
        const key = dateKey(date);
        const trained = (days.get(key) ?? 0) > 0;
        const isToday = date.getTime() === today;
        const isFuture = date.getTime() > today;

        return (
          <View key={key} style={styles.day}>
            <Text
              variant="caption"
              style={[
                styles.letter,
                { color: isToday ? palette.textPrimary : palette.textTertiary },
              ]}
            >
              {letter}
            </Text>
            <View
              style={[
                styles.mark,
                trained ? styles.marked : null,
                isToday && !trained ? styles.todayMark : null,
                isFuture ? styles.future : null,
              ]}
            >
              {trained ? (
                <Icon name="check" size={13} color={palette.textOnAccent} strokeWidth={3} />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
  },
  day: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  letter: {
    fontSize: 11,
  },
  mark: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  marked: {
    backgroundColor: palette.accent,
  },
  todayMark: {
    borderColor: palette.accentEdge,
    backgroundColor: palette.accentSoft,
  },
  future: {
    backgroundColor: 'transparent',
    borderColor: palette.hairline,
  },
});
