import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { haptics } from '@/lib/haptics';
import { palette, radius, space } from '@/theme';

export interface LinePoint {
  x: number;
  y: number;
  label?: string;
}

export interface LineChartProps {
  data: LinePoint[];
  height?: number;
  color?: string;
  /** Formats the scrub callout value. */
  formatValue?: (value: number) => string;
  formatLabel?: (point: LinePoint) => string;
  /** Draws a dashed horizontal line, e.g. a target or current bodyweight. */
  reference?: { value: number; label?: string };
  /** Secondary series drawn behind the main one — used for weight trend lines. */
  overlay?: LinePoint[];
  overlayColor?: string;
}

/**
 * Line chart with drag-to-scrub.
 *
 * Catmull-Rom smoothing rather than a plain polyline: strength data is noisy
 * session to session and hard corners make a good trend look erratic. The
 * smoothing is mild enough that it never invents a peak that isn't there.
 */
export function LineChart({
  data,
  height = 180,
  color = palette.accent,
  formatValue = (v) => String(Math.round(v)),
  formatLabel,
  reference,
  overlay,
  overlayColor = palette.textTertiary,
}: LineChartProps) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const padding = { top: 18, right: 6, bottom: 6, left: 6 };
  const plotWidth = Math.max(0, width - padding.left - padding.right);
  const plotHeight = height - padding.top - padding.bottom;

  const scale = useMemo(() => {
    const values = [...data.map((d) => d.y), ...(overlay ?? []).map((d) => d.y)];
    if (reference) values.push(reference.value);
    if (values.length === 0) return { min: 0, max: 1 };

    let min = Math.min(...values);
    let max = Math.max(...values);
    if (max === min) {
      // A flat series still deserves a readable band rather than a divide by zero.
      max += Math.abs(max) * 0.1 || 1;
      min -= Math.abs(min) * 0.1 || 1;
    } else {
      const pad = (max - min) * 0.15;
      min -= pad;
      max += pad;
    }
    return { min, max };
  }, [data, overlay, reference]);

  const toPoint = (point: LinePoint, index: number, count: number) => ({
    x: padding.left + (count <= 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth),
    y: padding.top + plotHeight - ((point.y - scale.min) / (scale.max - scale.min)) * plotHeight,
  });

  const coords = useMemo(
    () => data.map((point, i) => toPoint(point, i, data.length)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, width, height, scale.min, scale.max],
  );

  const overlayCoords = useMemo(
    () => (overlay ?? []).map((point, i) => toPoint(point, i, overlay?.length ?? 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overlay, width, height, scale.min, scale.max],
  );

  const linePath = useMemo(() => buildSmoothPath(coords), [coords]);
  const overlayPath = useMemo(() => buildSmoothPath(overlayCoords), [overlayCoords]);
  const areaPath = useMemo(() => {
    if (coords.length === 0 || !linePath) return '';
    const first = coords[0]!;
    const last = coords[coords.length - 1]!;
    const baseline = padding.top + plotHeight;
    return `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  }, [linePath, coords, plotHeight, padding.top]);

  const referenceY =
    reference !== undefined
      ? padding.top + plotHeight - ((reference.value - scale.min) / (scale.max - scale.min)) * plotHeight
      : null;

  const pan = Gesture.Pan()
    .onBegin((event) => {
      'worklet';
      runOnJS(scrub)(event.x);
    })
    .onUpdate((event) => {
      'worklet';
      runOnJS(scrub)(event.x);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(setActiveIndex)(null);
    });

  function scrub(x: number) {
    if (coords.length === 0 || plotWidth <= 0) return;
    const ratio = Math.max(0, Math.min(1, (x - padding.left) / plotWidth));
    const index = Math.round(ratio * (coords.length - 1));
    setActiveIndex((previous) => {
      if (previous !== index) haptics.selection();
      return index;
    });
  }

  const active = activeIndex !== null ? data[activeIndex] : undefined;
  const activeCoord = activeIndex !== null ? coords[activeIndex] : undefined;

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text variant="caption" color="tertiary">
          Not enough data yet
        </Text>
      </View>
    );
  }

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <GestureDetector gesture={pan}>
        <View style={{ height }}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={0.22} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {referenceY !== null ? (
                <Line
                  x1={padding.left}
                  y1={referenceY}
                  x2={width - padding.right}
                  y2={referenceY}
                  stroke={palette.hairlineStrong}
                  strokeWidth={1}
                  strokeDasharray="4 5"
                />
              ) : null}

              {areaPath ? <Path d={areaPath} fill="url(#lineFill)" /> : null}

              {overlayPath ? (
                <Path
                  d={overlayPath}
                  stroke={overlayColor}
                  strokeWidth={1.5}
                  strokeDasharray="3 4"
                  fill="none"
                  strokeLinecap="round"
                />
              ) : null}

              {linePath ? (
                <Path
                  d={linePath}
                  stroke={color}
                  strokeWidth={2.4}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {activeCoord ? (
                <>
                  <Line
                    x1={activeCoord.x}
                    y1={padding.top}
                    x2={activeCoord.x}
                    y2={padding.top + plotHeight}
                    stroke={palette.hairlineStrong}
                    strokeWidth={1}
                  />
                  <Circle cx={activeCoord.x} cy={activeCoord.y} r={7} fill={color} fillOpacity={0.22} />
                  <Circle
                    cx={activeCoord.x}
                    cy={activeCoord.y}
                    r={4}
                    fill={palette.void}
                    stroke={color}
                    strokeWidth={2.4}
                  />
                </>
              ) : (
                coords.length > 0 && (
                  <Circle
                    cx={coords[coords.length - 1]!.x}
                    cy={coords[coords.length - 1]!.y}
                    r={4}
                    fill={palette.void}
                    stroke={color}
                    strokeWidth={2.4}
                  />
                )
              )}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>

      {active ? (
        <View
          style={[
            styles.callout,
            {
              left: Math.max(
                0,
                Math.min((activeCoord?.x ?? 0) - 56, Math.max(0, width - 112)),
              ),
            },
          ]}
          pointerEvents="none"
        >
          <Text variant="numeric" style={{ fontSize: 15 }}>
            {formatValue(active.y)}
          </Text>
          {formatLabel ? (
            <Text variant="caption" color="tertiary">
              {formatLabel(active)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Catmull-Rom to cubic Bezier. Tension 0.5 keeps the curve close enough to the
 * data that it stays honest.
 */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  if (points.length === 2) return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;

  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  callout: {
    position: 'absolute',
    top: -6,
    width: 112,
    alignItems: 'center',
    backgroundColor: palette.surfaceHigh,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
});
