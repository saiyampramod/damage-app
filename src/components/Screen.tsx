import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, navClearance } from '@/theme/tokens';

import { DottedBackground } from './DottedBackground';

type Props = {
  children: ReactNode;
  /** Leave room for the floating nav bar (tab screens). */
  withNav?: boolean;
  scroll?: boolean;
};

/**
 * A white strip behind the status bar, so a page that scrolls under it doesn't run its text into
 * the clock and battery. Put it last, over the scrolling content.
 */
export function StatusShade() {
  const insets = useSafeAreaInsets();
  if (!insets.top) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.page }}
    />
  );
}

/** Dotted page with safe-area padding. Every screen starts here. */
export function Screen({ children, withNav = false, scroll = true }: Props) {
  const insets = useSafeAreaInsets();
  const top = insets.top + 12;
  const bottom = (withNav ? navClearance : 24) + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <DottedBackground />
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingTop: top, paddingBottom: bottom }}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: top, paddingBottom: bottom }}>{children}</View>
      )}
      {scroll ? <StatusShade /> : null}
    </View>
  );
}
