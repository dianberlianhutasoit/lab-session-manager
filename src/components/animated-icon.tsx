import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Keyframe,
} from 'react-native-reanimated';
import { LaboraColors } from '@/constants/theme';

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  // Shared values for fluid, organic animations ("tidak kaku")
  const logoScale = useSharedValue(0.65);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(18);
  const overlayOpacity = useSharedValue(1);
  const overlayScale = useSharedValue(1);

  const startAnimation = () => {
    // 1. Logo emergence: bouncy and smooth elastic spring
    logoScale.value = withSpring(1, {
      damping: 10,
      stiffness: 90,
      mass: 0.8,
    });
    logoOpacity.value = withTiming(1, {
      duration: 450,
      easing: Easing.out(Easing.cubic),
    });

    // 2. Text emergence: staggered slide up & fade-in
    textTranslateY.value = withDelay(
      180,
      withSpring(0, {
        damping: 12,
        stiffness: 100,
      })
    );
    textOpacity.value = withDelay(
      180,
      withTiming(1, {
        duration: 450,
        easing: Easing.out(Easing.quad),
      })
    );

    // 3. Smooth exit transition ("keluar sehingga tidak kaku")
    // Subtle scale expansion + fade-out to reveal the main/login screen
    overlayScale.value = withDelay(
      1600,
      withTiming(1.06, {
        duration: 450,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    overlayOpacity.value = withDelay(
      1600,
      withTiming(
        0,
        {
          duration: 450,
          easing: Easing.out(Easing.quad),
        },
        (finished) => {
          if (finished) {
            runOnJS(setVisible)(false);
          }
        }
      )
    );
  };

  useEffect(() => {
    // Safety fallback so user is never stuck on splash
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          startAnimation();
        });
      }}
      style={[styles.splashOverlay, overlayAnimatedStyle]}
    >
      <View style={styles.centerContainer}>
        {/* Logo Icon */}
        <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/logo_labora.png')}
            style={styles.logoImage}
            contentFit="contain"
            transition={150}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// Kept for backward compatibility if referenced
const INITIAL_SCALE_FACTOR = 10;
const DURATION = 600;

const keyframe = new Keyframe({
  0: { transform: [{ scale: INITIAL_SCALE_FACTOR }] },
  100: { transform: [{ scale: 1 }], easing: Easing.elastic(0.7) },
});

const logoKeyframe = new Keyframe({
  0: { transform: [{ scale: 1.3 }], opacity: 0 },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.elastic(0.7) },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.iconImage} source={require('@/assets/images/logo_labora.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: LaboraColors.background, // Clean ivory/off-white #FAF7F8
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 124,
    height: 124,
  },
  textWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: LaboraColors.primary, // #661633 Maroon
    letterSpacing: 3,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F151A',
    letterSpacing: 0.2,
    marginTop: 4,
    textAlign: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: 76,
    height: 76,
  },
  background: {
    borderRadius: 40,
    backgroundColor: LaboraColors.primary,
    width: 128,
    height: 128,
    position: 'absolute',
  },
});
