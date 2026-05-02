import { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Logo } from '@/components/brand/logo';
import { Colors, Radius } from '@/constants/theme';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;
const splashEasing = Easing.out(Easing.cubic);

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: INITIAL_SCALE_FACTOR }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: splashEasing,
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: splashEasing,
    },
  });

  return (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.backgroundSolidColor}
    />
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: splashEasing,
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: splashEasing,
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: splashEasing,
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={keyframe.duration(DURATION)} style={styles.markShell} />
      <Animated.View entering={logoKeyframe.duration(DURATION)} style={styles.logoContainer}>
        <Logo layout="stacked" size={96} theme="dark" variant="mark" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    height: 128,
    justifyContent: 'center',
    width: 128,
    zIndex: 100,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  markShell: {
    backgroundColor: Colors.dark.backgroundElement,
    borderColor: Colors.dark.primary,
    borderRadius: Radius.xl,
    borderWidth: 1,
    height: 128,
    position: 'absolute',
    width: 128,
  },
  backgroundSolidColor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.dark.background,
    zIndex: 1000,
  },
});