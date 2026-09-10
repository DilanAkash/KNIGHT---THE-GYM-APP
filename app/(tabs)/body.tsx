import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Button, IconButton } from '@/components/ui/Button';
import { Appear } from '@/components/ui/Appear';
import { Card, Section } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Input';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { LineChart } from '@/components/charts/LineChart';
import {
  addProgressPhoto,
  deleteProgressPhoto,
  getBodyEntry,
  getWeightSeries,
  listPhotoTimeline,
  setMeasurement,
  upsertBodyEntry,
  MEASUREMENT_LABELS,
  MEASUREMENT_ORDER,
  type BodyEntryDetail,
  type WeightPoint,
} from '@/db/queries/body';
import type { MeasurementSite, ProgressPhoto } from '@/db/types';
import { useSettings } from '@/store/settings';
import { dateKey, friendlyDate, fromDateKey } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space } from '@/theme';

type Tab = 'weight' | 'measure' | 'photos';

const TABS = [
  { value: 'weight' as const, label: 'Weight' },
  { value: 'measure' as const, label: 'Measurements' },
  { value: 'photos' as const, label: 'Photos' },
];

export default function BodyScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { unit } = useSettings();

  const [tab, setTab] = useState<Tab>('weight');
  const [series, setSeries] = useState<WeightPoint[]>([]);
  const [today, setToday] = useState<BodyEntryDetail | null>(null);
  const [photos, setPhotos] = useState<(ProgressPhoto & { date: string })[]>([]);
  const [logging, setLogging] = useState(false);
  const [weightDraft, setWeightDraft] = useState('');
  const [fatDraft, setFatDraft] = useState('');
  const [measuring, setMeasuring] = useState<MeasurementSite | null>(null);
  const [measureDraft, setMeasureDraft] = useState('');

  const reload = useCallback(async () => {
    const [points, entry, timeline] = await Promise.all([
      getWeightSeries(),
      getBodyEntry(dateKey()),
      listPhotoTimeline(),
    ]);
    setSeries(points);
    setToday(entry);
    setPhotos(timeline);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const latest = series[series.length - 1];
  const first = series[0];
  const change = latest && first ? latest.trend - first.trend : 0;

  const addPhoto = useCallback(
    async (pose: ProgressPhoto['pose']) => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo access to attach progress pictures.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;

      const entryId = await upsertBodyEntry({ date: dateKey() });
      await addProgressPhoto(entryId, result.assets[0].uri, pose);
      haptics.success();
      await reload();
    },
    [reload],
  );

  return (
    <View style={styles.root}>
      <Header
        title="Body"
        eyebrow="Where the work shows up"
        scrollY={scrollY}
        right={
          <IconButton
            name="plus"
            accessibilityLabel="Log bodyweight"
            onPress={() => {
              setWeightDraft(today?.weight ? String(today.weight) : '');
              setFatDraft(today?.bodyFat ? String(today.bodyFat) : '');
              setLogging(true);
            }}
            size={40}
            background={palette.surface}
            color={palette.accent}
          />
        }
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + layout.tabBarHeight + space.xxl },
        ]}
      >
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'weight' ? (
          <Appear from="fade" style={styles.tabContent}>
            {series.length === 0 ? (
              <EmptyState
                icon="scale"
                title="No weigh-ins yet"
                message="Log your weight a few mornings in a row and the trend line does the rest."
                actionLabel="Log weight"
                onAction={() => setLogging(true)}
              />
            ) : (
              <>
                <Card padded index={0} highlighted>
                  <View style={styles.currentRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="overline" color="tertiary">
                        Current
                      </Text>
                      <View style={styles.currentValue}>
                        <Text variant="display" color="accent">
                          {latest?.weight.toFixed(1)}
                        </Text>
                        <Text variant="heading" color="tertiary">
                          {unit}
                        </Text>
                      </View>
                      <Text variant="caption" color="tertiary">
                        Trend {latest?.trend.toFixed(1)} {unit}
                        {change !== 0
                          ? ` · ${change > 0 ? '+' : ''}${change.toFixed(1)} overall`
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.trendBadge}>
                      <Icon
                        name={change > 0 ? 'arrowUpRight' : 'arrowRight'}
                        size={18}
                        color={palette.accent}
                        strokeWidth={2.2}
                        style={change <= 0 ? styles.trendDown : undefined}
                      />
                    </View>
                  </View>
                </Card>

                <Section title="Trend">
                  <Card padded index={1}>
                    <LineChart
                      data={series.map((point) => ({
                        x: fromDateKey(point.date).getTime(),
                        y: point.weight,
                        label: point.date,
                      }))}
                      overlay={series.map((point) => ({
                        x: fromDateKey(point.date).getTime(),
                        y: point.trend,
                      }))}
                      height={200}
                      formatValue={(value) => `${value.toFixed(1)} ${unit}`}
                      formatLabel={(point) => friendlyDate(fromDateKey(point.label ?? ''))}
                    />
                    <View style={styles.legend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendSwatch, { backgroundColor: palette.accent }]} />
                        <Text variant="caption" color="tertiary">
                          Daily
                        </Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDash]} />
                        <Text variant="caption" color="tertiary">
                          7-day average
                        </Text>
                      </View>
                    </View>
                  </Card>
                  <Text variant="caption" color="tertiary">
                    Daily weight swings with water and food. Judge progress off the average.
                  </Text>
                </Section>
              </>
            )}
          </Appear>
        ) : tab === 'measure' ? (
          <Appear from="fade" style={styles.tabContent}>
            <View style={styles.measureGrid}>
              {MEASUREMENT_ORDER.map((site) => {
                const value = today?.measurements.find((m) => m.site === site)?.value;
                return (
                  <PressableScale
                    key={site}
                    onPress={() => {
                      setMeasureDraft(value ? String(value) : '');
                      setMeasuring(site);
                    }}
                    haptic="light"
                    scaleTo={0.96}
                    style={styles.measureTile}
                  >
                    <Text variant="overline" color="tertiary" numberOfLines={1}>
                      {MEASUREMENT_LABELS[site]}
                    </Text>
                    <View style={styles.measureValue}>
                      <Text variant="numeric" color={value ? 'primary' : 'tertiary'}>
                        {value ? value.toFixed(1) : '—'}
                      </Text>
                      {value ? (
                        <Text variant="caption" color="tertiary">
                          cm
                        </Text>
                      ) : null}
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            <Text variant="caption" color="tertiary" align="center">
              Measure at the same time of day, relaxed, same spot each time.
            </Text>
          </Appear>
        ) : (
          <Appear from="fade" style={styles.tabContent}>
            <View style={styles.poseRow}>
              {(['front', 'side', 'back'] as const).map((pose) => (
                <PressableScale
                  key={pose}
                  onPress={() => void addPhoto(pose)}
                  haptic="medium"
                  scaleTo={0.95}
                  style={styles.poseButton}
                >
                  <Icon name="camera" size={18} color={palette.textSecondary} />
                  <Text variant="label" color="secondary" style={{ textTransform: 'capitalize' }}>
                    {pose}
                  </Text>
                </PressableScale>
              ))}
            </View>

            {photos.length === 0 ? (
              <EmptyState
                icon="camera"
                title="No progress photos"
                message="Same lighting, same pose, same time of day. Monthly is plenty."
                compact
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -layout.gutter }}
                contentContainerStyle={styles.photoStrip}
              >
                {photos.map((photo) => (
                  <View key={photo.id} style={styles.photoCard}>
                    <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
                    <View style={styles.photoOverlay}>
                      <Text variant="caption" color="primary">
                        {friendlyDate(fromDateKey(photo.date))}
                      </Text>
                      <Text variant="caption" color="tertiary" style={{ textTransform: 'capitalize' }}>
                        {photo.pose}
                      </Text>
                    </View>
                    <IconButton
                      name="close"
                      accessibilityLabel="Delete photo"
                      onPress={async () => {
                        await deleteProgressPhoto(photo.id);
                        haptics.warning();
                        await reload();
                      }}
                      size={28}
                      iconSize={13}
                      background="rgba(10,11,13,0.7)"
                      style={styles.photoDelete}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </Appear>
        )}
      </Animated.ScrollView>

      <Sheet visible={logging} onClose={() => setLogging(false)} title="Log today">
        <View style={{ gap: space.base, paddingBottom: space.base }}>
          <Field
            label={`Bodyweight (${unit})`}
            value={weightDraft}
            onChangeText={setWeightDraft}
            keyboardType="decimal-pad"
            placeholder="0.0"
            icon="scale"
          />
          <Field
            label="Body fat % (optional)"
            value={fatDraft}
            onChangeText={setFatDraft}
            keyboardType="decimal-pad"
            placeholder="—"
          />
          <Button
            label="Save"
            size="lg"
            fullWidth
            disabled={!weightDraft.trim()}
            onPress={async () => {
              const weight = parseFloat(weightDraft.replace(',', '.'));
              const fat = parseFloat(fatDraft.replace(',', '.'));
              await upsertBodyEntry({
                weight: Number.isFinite(weight) ? weight : null,
                bodyFat: Number.isFinite(fat) ? fat : null,
              });
              haptics.success();
              setLogging(false);
              await reload();
            }}
          />
        </View>
      </Sheet>

      <Sheet
        visible={measuring !== null}
        onClose={() => setMeasuring(null)}
        title={measuring ? MEASUREMENT_LABELS[measuring] : ''}
      >
        <View style={{ gap: space.base, paddingBottom: space.base }}>
          <Field
            label="Centimetres"
            value={measureDraft}
            onChangeText={setMeasureDraft}
            keyboardType="decimal-pad"
            placeholder="0.0"
            suffix="cm"
          />
          <Button
            label="Save"
            size="lg"
            fullWidth
            disabled={!measureDraft.trim()}
            onPress={async () => {
              if (!measuring) return;
              const value = parseFloat(measureDraft.replace(',', '.'));
              if (!Number.isFinite(value)) return;
              const entryId = await upsertBodyEntry({ date: dateKey() });
              await setMeasurement(entryId, measuring, value);
              haptics.success();
              setMeasuring(null);
              await reload();
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.sm,
    gap: space.lg,
  },
  tabContent: {
    gap: space.xl,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  currentValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  trendBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendDown: {
    transform: [{ rotate: '45deg' }],
  },
  legend: {
    flexDirection: 'row',
    gap: space.base,
    marginTop: space.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendDash: {
    width: 14,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.textTertiary,
  },
  measureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  measureTile: {
    width: '48.5%',
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    gap: 2,
  },
  measureValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  poseRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  poseButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.base,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  photoStrip: {
    paddingHorizontal: layout.gutter,
    gap: space.md,
  },
  photoCard: {
    width: 180,
    height: 260,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: palette.surface,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.md,
    backgroundColor: 'rgba(10,11,13,0.72)',
  },
  photoDelete: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
  },
});
