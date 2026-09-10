import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts as useSpaceGrotesk,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInter,
} from '@expo-google-fonts/inter';
import { ensureSeeded } from '@/db/seed';
import { useSettings } from '@/store/settings';
import { RestTimerHost } from '@/features/workout/RestTimerHost';
import { palette } from '@/theme';

void SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(palette.void);

export default function RootLayout() {
  const [dataReady, setDataReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const hydrate = useSettings((state) => state.hydrate);

  const [groteskLoaded] = useSpaceGrotesk({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureSeeded();
        await hydrate();
        if (!cancelled) setDataReady(true);
      } catch (error) {
        // A migration failure must surface, not silently show an empty app.
        if (!cancelled) setFatal(error instanceof Error ? error.message : String(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const ready = dataReady && groteskLoaded && interLoaded;

  const onLayout = useCallback(() => {
    if (ready || fatal) void SplashScreen.hideAsync();
  }, [ready, fatal]);

  if (!ready && !fatal) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root} onLayout={onLayout}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.void },
              // Native stack animation; the app's own transitions layer on top.
              animation: 'slide_from_right',
              animationDuration: 260,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="workout/[id]"
              options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
            />
            <Stack.Screen
              name="workout/summary/[id]"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen name="exercises" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
          <RestTimerHost />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
});
