import { CameraView, useCameraPermissions, type FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton } from '@/components/CircleButton';
import { DottedBackground } from '@/components/DottedBackground';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { bills } from '@/data/mock';
import { colors, gutter, radius, shadow, stroke } from '@/theme/tokens';

type Flash = 'auto' | 'on' | 'off';
const FLASH_NEXT: Record<Flash, Flash> = { auto: 'on', on: 'off', off: 'auto' };
const FLASH_LABEL: Record<Flash, string> = { auto: 'Auto', on: 'On', off: 'Off' };

const CORNER = 40;
const INSET = 14;
const SHUTTER = 72;
/** Room kept clear at the bottom of the camera for the hint and the buttons. */
const CONTROLS_H = 150;
/** How long a hint stays up before it fades away. */
const HINT_MS = 2600;

function buzz() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Lime guide corners. Dimmed until the camera is live. */
function Corners({ live }: { live: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * live.get() }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <View style={[styles.corner, styles.cA]} />
      <View style={[styles.corner, styles.cB]} />
      <View style={[styles.corner, styles.cC]} />
      <View style={[styles.corner, styles.cD]} />
    </Animated.View>
  );
}

/** A short message over the camera that fades in, waits, then fades away. */
function Hint({ text, nonce }: { text: string; nonce: number }) {
  const shown = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: (1 - shown.get()) * 8 }],
  }));

  useEffect(() => {
    if (!nonce) return;
    shown.set(0);
    shown.set(
      withSequence(
        withTiming(1, { duration: 180 }),
        withDelay(HINT_MS, withTiming(0, { duration: 260 })),
      ),
    );
  }, [nonce, shown]);

  return (
    <Animated.View pointerEvents="none" style={[styles.hint, style]}>
      <Txt variant="label">{text}</Txt>
    </Animated.View>
  );
}

/**
 * Snap the bill. Opens from the tear button on Home.
 * The camera sits in a card on the dotted paper, with the flash inside it, the lime shutter
 * and upload over the bottom of it, and "Manual bill" on the paper below.
 */
export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ group?: string }>();
  const [groupId, setGroupId] = useState(params.group);
  const group = groupId ? bills.find((b) => b.id === groupId) : undefined;

  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(true);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState<Flash>('auto');
  const [hint, setHint] = useState({ text: 'Point at the receipt', nonce: 0 });

  const camera = useRef<CameraView>(null);
  const busy = useRef(false);
  const flashed = useSharedValue(0);
  const live = useSharedValue(0);

  // Only one camera can run at a time: drop it while another screen is on top.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setReady(false);
        live.set(0);
      };
    }, [live]),
  );

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashed.get() }));

  function say(text: string) {
    setHint((h) => ({ text, nonce: h.nonce + 1 }));
  }

  function openReview(extra: Record<string, string>) {
    router.push({ pathname: '/review', params: { ...extra, ...(groupId ? { group: groupId } : {}) } });
  }

  function onReady() {
    setReady(true);
    live.set(withSpring(1, { damping: 14, stiffness: 220 }));
    say('Point at the receipt');
  }

  async function askCamera() {
    if (permission && !permission.canAskAgain) {
      Linking.openSettings();
      return;
    }
    await requestPermission();
  }

  async function snap() {
    if (busy.current) return;
    if (!permission?.granted) {
      askCamera();
      return;
    }
    if (!camera.current || !ready) return;
    busy.current = true;
    buzz();
    flashed.set(1);
    flashed.set(withTiming(0, { duration: 280 }));
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) openReview({ photo: photo.uri });
    } catch {
      say('That didn’t work. Try again');
    } finally {
      busy.current = false;
    }
  }

  async function upload() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) openReview({ photo: asset.uri });
  }

  const showCamera = permission?.granted && focused;
  const asking = permission && !permission.granted;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 16 }]}>
      <DottedBackground />

      <View style={styles.top}>
        <CircleButton size={44} accessibilityLabel="Close" onPress={() => router.back()}>
          <Icon name="close" size={22} />
        </CircleButton>
        <Txt variant="title" accessibilityRole="header">
          Snap the bill
        </Txt>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.camera}>
        {showCamera ? (
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
            flash={flash as FlashMode}
            onCameraReady={onReady}
          />
        ) : null}

        <Corners live={live} />

        {asking ? (
          <View style={styles.ask}>
            <Txt variant="bodyStrong" color={colors.onAction} style={styles.center}>
              Let Damage use the camera
            </Txt>
            <Txt variant="body" color={colors.onAction} style={styles.center}>
              So you can snap the bill. You can also upload a photo or type it in.
            </Txt>
            <Pressable
              onPress={askCamera}
              accessibilityRole="button"
              style={({ pressed }) => [styles.askButton, pressed && { transform: [{ scale: 0.97 }] }]}>
              <Txt variant="label">{permission.canAskAgain ? 'Turn on camera' : 'Open settings'}</Txt>
            </Pressable>
          </View>
        ) : null}

        {group ? (
          <View style={styles.chipRow} pointerEvents="box-none">
            <View style={styles.chip}>
              <Txt variant="label" numberOfLines={1} style={styles.chipText}>
                Into {group.name}
              </Txt>
              <Pressable
                onPress={() => setGroupId(undefined)}
                accessibilityRole="button"
                accessibilityLabel={`Don't add this to ${group.name}`}
                hitSlop={10}>
                <Icon name="close" size={16} strokeWidth={3} />
              </Pressable>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() => setFlash(FLASH_NEXT[flash])}
          accessibilityRole="button"
          accessibilityLabel={`Flash: ${FLASH_LABEL[flash]}. Tap to change.`}
          hitSlop={6}
          style={({ pressed }) => [
            styles.flashButton,
            flash === 'on' && styles.flashOn,
            pressed && styles.pressed,
          ]}>
          <Icon name={flash === 'off' ? 'boltOff' : 'bolt'} size={20} strokeWidth={2.4} />
          {flash === 'auto' ? (
            <View style={styles.autoBadge}>
              <Txt variant="micro" color={colors.onAction}>
                A
              </Txt>
            </View>
          ) : null}
        </Pressable>

        {showCamera ? <Hint text={hint.text} nonce={hint.nonce} /> : null}

        <View style={styles.controls}>
          <Pressable
            onPress={snap}
            accessibilityRole="button"
            accessibilityLabel="Snap the bill"
            hitSlop={8}
            style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.92 }] }]}
          />
          <Pressable
            onPress={upload}
            accessibilityRole="button"
            accessibilityLabel="Upload a photo of the bill"
            style={({ pressed }) => [styles.upload, pressed && styles.pressed]}>
            <Icon name="upload" size={24} strokeWidth={2.6} />
          </Pressable>
        </View>

        <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
      </View>

      <Pressable
        onPress={() => openReview({ manual: '1' })}
        accessibilityRole="button"
        accessibilityLabel="Manual bill. No receipt? Type it in."
        style={({ pressed }) => [styles.manual, pressed && styles.pressed]}>
        <View style={styles.rupee}>
          <Txt variant="title">₹</Txt>
        </View>
        <View style={styles.grow}>
          <Txt variant="bodyStrong">Manual bill</Txt>
          <Txt variant="body">No receipt? Type it in</Txt>
        </View>
        <Icon name="chevron" size={24} strokeWidth={2.8} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  grow: { flex: 1 },
  top: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
  },
  /** Same width as the close button, so the title sits in the middle. */
  topSpacer: { width: 44 },
  camera: {
    flex: 1,
    minHeight: 260,
    marginTop: 10,
    marginHorizontal: gutter,
    borderRadius: 22,
    borderWidth: stroke.l,
    borderColor: colors.line,
    backgroundColor: colors.viewfinder,
    boxShadow: `6px 6px 0px ${colors.viewfinderShadow}`,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.viewfinderGuide,
  },
  cA: { left: INSET, top: INSET, borderTopWidth: 6, borderLeftWidth: 6, borderTopLeftRadius: 13 },
  cB: { right: INSET, top: INSET, borderTopWidth: 6, borderRightWidth: 6, borderTopRightRadius: 13 },
  cC: { left: INSET, bottom: INSET, borderBottomWidth: 6, borderLeftWidth: 6, borderBottomLeftRadius: 13 },
  cD: { right: INSET, bottom: INSET, borderBottomWidth: 6, borderRightWidth: 6, borderBottomRightRadius: 13 },
  ask: {
    ...StyleSheet.absoluteFill,
    bottom: CONTROLS_H - 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  center: { textAlign: 'center' },
  askButton: {
    marginTop: 8,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.actionOnDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { position: 'absolute', top: 18, left: 66, right: 66, alignItems: 'center' },
  chip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 10,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.brand,
  },
  chipText: { flexShrink: 1 },
  /** Sits inside the top-right corner bracket. */
  flashButton: {
    position: 'absolute',
    top: INSET + 12,
    right: INSET + 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashOn: { backgroundColor: colors.brand },
  autoBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 112,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    height: SHUTTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: stroke.l,
    borderColor: colors.line,
    backgroundColor: colors.brand,
  },
  upload: {
    position: 'absolute',
    left: '50%',
    marginLeft: SHUTTER / 2 + 34,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    boxShadow: `3px 3px 0px ${colors.viewfinderShadow}`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manual: {
    marginTop: 22,
    marginHorizontal: gutter,
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 8,
    paddingRight: 18,
    borderRadius: radius.pill,
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    boxShadow: shadow.m,
  },
  rupee: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: 'none' },
  flash: { ...StyleSheet.absoluteFill, backgroundColor: colors.paper },
});
