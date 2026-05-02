import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe, Easing } from 'react-native-reanimated';

import { Logo } from '@/components/brand/logo';
import { Colors, Radius } from '@/constants/theme';

const DURATION = 300;
const splashEasing = Easing.out(Easing.cubic);

export function AnimatedSplashOverlay() {
  return null;
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: 0 }],
  },
  60: {
    transform: [{ scale: 1 }],
    easing: splashEasing,
  },
  100: {
    transform: [{ scale: 1 }],
    easing: splashEasing,
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
  },
  60: {
    transform: [{ scale: 1 }],
    opacity: 0,
    easing: splashEasing,
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
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
  container: {
    alignItems: 'center',
    width: '100%',
    zIndex: 1000,
    position: 'absolute',
    top: 128 / 2 + 138,
  },
  iconContainer: {
    alignItems: 'center',
    height: 128,
    justifyContent: 'center',
    width: 128,
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
});