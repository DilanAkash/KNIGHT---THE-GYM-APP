import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appear } from '@/components/ui/Appear';
import { Sheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Banner } from '@/components/ui/Feedback';
import { useSettings } from '@/store/settings';
import { calculatePlates, groupPlates } from '@/lib/strength';
import { palette, radius, space } from '@/theme';

/** Plate colours follow the IWF/standard gym convention so the stack is
 *  recognisable at a glance rather than needing the label read. */
const PLATE_COLORS: Record<string, string> = {
  '25': '#E23B3B',
  '20': '#2F6BD8',
  '15': '#E0B23A',
  '10': '#3FA45C',
  '5': '#E8E8E8',
  '2.5': '#C0392B',
  '1.25': '#9AA3AE',
  '45': '#2F6BD8',
  '35': '#E0B23A',
};

export function PlateSheet({
  visible,
  onClose,
  initialWeight,
}: {
  visible: boolean;
  onClose: () => void;
  initialWeight: number;
}) {
  const { unit, barWeight, availablePlates, setBarWeight } = useSettings();
  const [target, setTarget] = useState(initialWeight);

  // Reset to whatever set was tapped each time the sheet is reopened.
  const [lastInitial, setLastInitial] = useState(initialWeight);
  if (lastInitial !== initialWeight) {
    setLastInitial(initialWeight);
    setTarget(initialWeight);
  }

  const layout = useMemo(
    () => calculatePlates(target, barWeight, availablePlates()),
    [target, barWeight, availablePlates],
  );
  const grouped = useMemo(() => groupPlates(layout.perSide), [layout.perSide]);
  const increment = unit === 'kg' ? 2.5 : 5;

  return (
    <Sheet visible={visible} onClose={onClose} title="Plate calculator">
      <View style={{ gap: space.lg, paddingBottom: space.base }}>
        <View style={styles.targetRow}>
          <Stepper
            label="Target"
            value={target}
            onChange={setTarget}
            step={increment}
            min={0}
            max={999}
            decimals={target % 1 === 0 ? 0 : 1}
            suffix={unit}
          />
          <Stepper
            label="Bar"
            value={barWeight}
            onChange={(value) => void setBarWeight(value)}
            step={unit === 'kg' ? 5 : 10}
            min={0}
            max={60}
            suffix={unit}
          />
        </View>

        <View style={styles.barView}>
          <View style={styles.sleeve} />
          {grouped.length === 0 ? (
            <Text variant="caption" color="tertiary" style={{ marginHorizontal: space.md }}>
              Empty bar
            </Text>
          ) : (
            grouped.map((group, index) => (
              <Appear
                key={`${group.plate}-${index}`}
                from="scale"
                delay={index * 50}
                style={styles.plateGroup}
              >
                {Array.from({ length: group.count }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.plate,
                      {
                        backgroundColor: PLATE_COLORS[String(group.plate)] ?? palette.surfaceHigh,
                        // Bigger plates are taller, like the real thing.
                        height: 40 + Math.min(46, group.plate * 1.6),
                      },
                    ]}
                  />
                ))}
                <Text variant="caption" color="tertiary" style={styles.plateLabel}>
                  {group.plate}
                </Text>
              </Appear>
            ))
          )}
          <View style={styles.collar} />
        </View>

        <Appear from="fade" style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text variant="overline" color="tertiary">
              Per side
            </Text>
            <Text variant="numeric">
              {grouped.length > 0
                ? grouped.map((g) => `${g.count}×${g.plate}`).join('  ')
                : '—'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="overline" color="tertiary">
              Total
            </Text>
            <Text variant="numeric" color="accent">
              {layout.achievable} {unit}
            </Text>
          </View>
        </Appear>

        {layout.remainder > 0 ? (
          <Banner
            tone="warn"
            title={`${layout.achievable} ${unit} is the closest you can load`}
            message={`Off by ${(layout.remainder * 2).toFixed(2)} ${unit} with the plates in your set.`}
          />
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  targetRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  barView: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 100,
    paddingVertical: space.base,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingHorizontal: space.md,
  },
  sleeve: {
    width: 26,
    height: 9,
    borderRadius: 2,
    backgroundColor: '#6C7480',
  },
  plateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  plate: {
    width: 11,
    borderRadius: 3,
    marginRight: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  plateLabel: {
    position: 'absolute',
    bottom: -14,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
  },
  collar: {
    width: 34,
    height: 9,
    borderRadius: 2,
    backgroundColor: '#6C7480',
    marginLeft: 2,
  },
  summary: {
    flexDirection: 'row',
    gap: space.lg,
  },
  summaryItem: {
    flex: 1,
    gap: 2,
  },
});
