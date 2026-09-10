import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import * as Application from 'expo-application';
import { Button } from '@/components/ui/Button';
import { Card, Divider, Section } from '@/components/ui/Card';
import { Field, Stepper } from '@/components/ui/Input';
import { Header } from '@/components/ui/Header';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/Pressable';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { resetUserData } from '@/db/client';
import { exportBackup, importBackup } from '@/lib/backup';
import { useSettings } from '@/store/settings';
import { formatDuration } from '@/lib/strength';
import { haptics } from '@/lib/haptics';
import { layout, palette, radius, space } from '@/theme';

const COMPANY_URL = 'https://swizzknight.vercel.app/';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const settings = useSettings();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(settings.displayName);
  const [editingTargets, setEditingTargets] = useState(false);
  const [busy, setBusy] = useState(false);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const onExport = useCallback(async () => {
    setBusy(true);
    try {
      const result = await exportBackup();
      if (result.shared) haptics.success();
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }, []);

  const onImport = useCallback(async () => {
    Alert.alert(
      'Restore from backup?',
      'This replaces everything currently in the app with the contents of the backup file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          onPress: async () => {
            setBusy(true);
            try {
              const result = await importBackup();
              if (result.imported) {
                haptics.success();
                Alert.alert('Restored', 'Your data is back. Reopen the app to see everything.');
              }
            } catch (error) {
              Alert.alert('Restore failed', error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, []);

  const onReset = useCallback(() => {
    Alert.alert(
      'Delete all training data?',
      'Sessions, records, body log and nutrition will be erased. Your routines and exercise library stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await resetUserData();
            haptics.warning();
            Alert.alert('Done', 'Training data cleared.');
          },
        },
      ],
    );
  }, []);

  return (
    <View style={styles.root}>
      <Header title="Settings" onBack={() => router.back()} scrollY={scrollY} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxxl }]}
      >
        <Section title="You">
          <Card padded={false} index={0}>
            <Row
              icon="user"
              label="Name"
              value={settings.displayName || 'Not set'}
              onPress={() => {
                setNameDraft(settings.displayName);
                setEditingName(true);
              }}
            />
            <Divider />
            <View style={styles.rowStatic}>
              <RowIcon name="scale" />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                Units
              </Text>
              <Segmented
                options={[
                  { value: 'kg' as const, label: 'kg' },
                  { value: 'lb' as const, label: 'lb' },
                ]}
                value={settings.unit}
                onChange={(value) => void settings.setUnit(value)}
                style={styles.unitToggle}
              />
            </View>
          </Card>
        </Section>

        <Section title="Training">
          <Card padded index={1}>
            <View style={{ gap: space.base }}>
              <Stepper
                label="Sessions per week goal"
                value={settings.weeklyGoal}
                onChange={(value) => void settings.setWeeklyGoal(value)}
                min={1}
                max={14}
                suffix="per week"
              />
              <Stepper
                label="Default rest"
                value={settings.defaultRestSeconds}
                onChange={(value) => void settings.setDefaultRest(value)}
                step={15}
                min={0}
                max={600}
                suffix={formatDuration(settings.defaultRestSeconds)}
              />
              <Stepper
                label={`Empty bar weight (${settings.unit})`}
                value={settings.barWeight}
                onChange={(value) => void settings.setBarWeight(value)}
                step={settings.unit === 'kg' ? 2.5 : 5}
                min={0}
                max={60}
                decimals={settings.barWeight % 1 === 0 ? 0 : 1}
                suffix={settings.unit}
              />
            </View>
          </Card>

          <Card padded={false} index={2}>
            <ToggleRow
              icon="clock"
              label="Auto-start rest timer"
              hint="Starts the moment you tick a set"
              value={settings.restTimerAutoStart}
              onChange={(value) => void settings.setRestAutoStart(value)}
            />
            <Divider />
            <ToggleRow
              icon="alert"
              label="Timer chime"
              hint="Ducks your music rather than stopping it"
              value={settings.restTimerSound}
              onChange={(value) => void settings.setRestSound(value)}
            />
            <Divider />
            <ToggleRow
              icon="bolt"
              label="Haptics"
              hint="Taps, ticks and the record celebration"
              value={settings.hapticsOn}
              onChange={(value) => void settings.setHaptics(value)}
            />
            <Divider />
            <ToggleRow
              icon="info"
              label="Keep screen awake"
              hint="Stops the screen sleeping mid-session"
              value={settings.keepAwake}
              onChange={(value) => void settings.setKeepAwake(value)}
            />
          </Card>
        </Section>

        <Section title="Nutrition">
          <Card padded={false} index={3}>
            <Row
              icon="flame"
              label="Daily targets"
              value={`${settings.nutritionTargets.calories} kcal · ${settings.nutritionTargets.protein}p`}
              onPress={() => setEditingTargets(true)}
            />
          </Card>
        </Section>

        <Section title="Data">
          <Card padded={false} index={4}>
            <Row
              icon="copy"
              label="Export backup"
              value="Save a JSON file"
              onPress={() => void onExport()}
              disabled={busy}
            />
            <Divider />
            <Row
              icon="refresh"
              label="Restore backup"
              value="Replace everything"
              onPress={() => void onImport()}
              disabled={busy}
            />
            <Divider />
            <Row icon="trash" label="Clear training data" value="" danger onPress={onReset} />
          </Card>
          <Text variant="caption" color="tertiary">
            Everything lives on this phone. Nothing is uploaded anywhere, so a backup is the only
            way to move to a new device.
          </Text>
        </Section>

        <Section title="About">
          <Card padded index={5}>
            <View style={styles.about}>
              <View style={styles.wordmark}>
                <Text variant="display" style={styles.wordmarkText}>
                  KNIGHT
                </Text>
                <View style={styles.wordmarkRule} />
              </View>
              <Text variant="caption" color="tertiary" align="center">
                Version {Application.nativeApplicationVersion ?? '1.0.0'}
              </Text>
              <PressableScale
                onPress={() => void Linking.openURL(COMPANY_URL)}
                haptic="light"
                scaleTo={0.96}
                style={styles.companyLink}
              >
                <Text variant="label" color="secondary">
                  by SwizzKnight
                </Text>
                <Icon name="arrowUpRight" size={14} color={palette.accent} strokeWidth={2.2} />
              </PressableScale>
            </View>
          </Card>
        </Section>
      </Animated.ScrollView>

      <Sheet visible={editingName} onClose={() => setEditingName(false)} title="Your name">
        <View style={{ gap: space.base, paddingBottom: space.base }}>
          <Field
            label="Name"
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="What should KNIGHT call you?"
            autoCapitalize="words"
          />
          <Button
            label="Save"
            size="lg"
            fullWidth
            onPress={async () => {
              await settings.setDisplayName(nameDraft.trim());
              setEditingName(false);
            }}
          />
        </View>
      </Sheet>

      <TargetSheet visible={editingTargets} onClose={() => setEditingTargets(false)} />
    </View>
  );
}

function TargetSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { nutritionTargets, setNutritionTargets } = useSettings();
  const [draft, setDraft] = useState(nutritionTargets);

  return (
    <Sheet visible={visible} onClose={onClose} title="Daily targets">
      <View style={{ gap: space.base, paddingBottom: space.base }}>
        <View style={styles.targetRow}>
          <Stepper
            label="Calories"
            value={draft.calories}
            onChange={(value) => setDraft((d) => ({ ...d, calories: value }))}
            step={50}
            min={800}
            max={6000}
          />
          <Stepper
            label="Protein"
            value={draft.protein}
            onChange={(value) => setDraft((d) => ({ ...d, protein: value }))}
            step={5}
            min={0}
            max={400}
            suffix="g"
          />
        </View>
        <View style={styles.targetRow}>
          <Stepper
            label="Carbs"
            value={draft.carbs}
            onChange={(value) => setDraft((d) => ({ ...d, carbs: value }))}
            step={10}
            min={0}
            max={800}
            suffix="g"
          />
          <Stepper
            label="Fat"
            value={draft.fat}
            onChange={(value) => setDraft((d) => ({ ...d, fat: value }))}
            step={5}
            min={0}
            max={300}
            suffix="g"
          />
        </View>
        <Stepper
          label="Water"
          value={draft.waterMl}
          onChange={(value) => setDraft((d) => ({ ...d, waterMl: value }))}
          step={250}
          min={0}
          max={8000}
          suffix="ml"
        />
        <Button
          label="Save targets"
          size="lg"
          fullWidth
          onPress={async () => {
            await setNutritionTargets(draft);
            haptics.success();
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

function RowIcon({ name, danger }: { name: IconName; danger?: boolean }) {
  return (
    <View style={[styles.rowIcon, danger ? styles.rowIconDanger : null]}>
      <Icon name={name} size={16} color={danger ? palette.danger : palette.textSecondary} />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  danger,
  disabled,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      scaleTo={0.99}
      style={styles.row}
      accessibilityRole="button"
    >
      <RowIcon name={icon} danger={danger} />
      <Text variant="bodyStrong" color={danger ? 'danger' : 'primary'} style={{ flex: 1 }}>
        {label}
      </Text>
      {value ? (
        <Text variant="caption" color="tertiary" numberOfLines={1} style={styles.rowValue}>
          {value}
        </Text>
      ) : null}
      <Icon name="chevronRight" size={15} color={palette.textTertiary} />
    </PressableScale>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.rowStatic}>
      <RowIcon name={icon} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" color="tertiary">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(next) => {
          haptics.selection();
          onChange(next);
        }}
        trackColor={{ false: palette.surfaceHigh, true: palette.accentDeep }}
        thumbColor={value ? palette.accent : palette.textTertiary}
      />
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
    gap: space.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.base,
  },
  rowStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    minHeight: 60,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    backgroundColor: palette.dangerSoft,
  },
  rowValue: {
    maxWidth: 150,
  },
  unitToggle: {
    width: 108,
  },
  targetRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  about: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
  },
  wordmark: {
    alignItems: 'center',
    gap: 6,
  },
  wordmarkText: {
    letterSpacing: 4,
    fontSize: 26,
  },
  wordmarkRule: {
    width: 46,
    height: 2,
    borderRadius: 1,
    backgroundColor: palette.accent,
  },
  companyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceHigh,
    marginTop: space.xs,
  },
});
