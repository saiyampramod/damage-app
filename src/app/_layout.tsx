import { BowlbyOne_400Regular } from '@expo-google-fonts/bowlby-one';
import {
  RethinkSans_500Medium,
  RethinkSans_700Bold,
  RethinkSans_800ExtraBold,
} from '@expo-google-fonts/rethink-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastHost } from '@/components/Toast';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Font keys here must match `fonts` in src/theme/tokens.ts.
  const [loaded, error] = useFonts({
    BowlbyOne_400Regular,
    RethinkSans_500Medium,
    RethinkSans_700Bold,
    RethinkSans_800ExtraBold,
    'ArchivoExpanded-Black': require('../../assets/fonts/ArchivoExpanded-Black.ttf'),
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="scan"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        {/* Screens opened from a full-screen one (the + screen, the camera) are full screens too.
            Left as plain pushes, iOS shows them as a pull-down card on top. */}
        <Stack.Screen name="review" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="activity" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="bill/[id]" />
        <Stack.Screen name="person/[id]" />
        <Stack.Screen
          name="group/new"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="recurring"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
      <ToastHost />
    </GestureHandlerRootView>
  );
}
