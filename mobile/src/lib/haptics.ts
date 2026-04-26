import * as Haptics from 'expo-haptics';

async function runHaptic(effect: () => Promise<void>): Promise<void> {
  if (process.env.EXPO_OS === 'web') {
    return;
  }

  try {
    await effect();
  } catch {
    // Haptics are best-effort and should never block field work.
  }
}

export function selectionHaptic(): Promise<void> {
  return runHaptic(() => Haptics.selectionAsync());
}

export function successHaptic(): Promise<void> {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningHaptic(): Promise<void> {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function errorHaptic(): Promise<void> {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
