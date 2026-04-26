import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BrandHeader({ subtitle = Brand.tagline }: { subtitle?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.brandRow}>
      <View style={[styles.brandMark, { backgroundColor: theme.primary }]}>
        <ThemedText style={styles.brandLetter}>B</ThemedText>
      </View>
      <View style={styles.brandCopy}>
        <ThemedText type="smallBold" style={styles.brandName}>
          {Brand.appNameArabic}
          <ThemedText type="small" themeColor="textSecondary">
            {'  '}
            {Brand.appName}
          </ThemedText>
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      </View>
    </View>
  );
}

export function ScreenShell({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.shell}>
      <View style={[styles.content, { backgroundColor: theme.background }]}>{children}</View>
    </ThemedView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }, style]}>
      {children}
    </ThemedView>
  );
}

export function PrimaryButton({
  children,
  disabled,
  ...props
}: PressableProps & { children: ReactNode; disabled?: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: disabled ? theme.backgroundSelected : theme.primary },
        pressed && !disabled ? styles.pressed : null,
      ]}
      {...props}>
      <ThemedText style={styles.buttonText}>{children}</ThemedText>
    </Pressable>
  );
}

export function SecondaryButton({
  children,
  selected = false,
  ...props
}: PressableProps & { children: ReactNode; selected?: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.secondaryButton,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.primary : theme.border,
        },
        pressed ? styles.pressed : null,
      ]}
      {...props}>
      <ThemedText type="smallBold" style={{ color: selected ? theme.primary : theme.text }}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.statTile}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="subtitle">{value}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  brandCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  brandLetter: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 26,
  },
  brandMark: {
    alignItems: 'center',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  brandName: {
    fontSize: 18,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: Spacing.three,
  },
  button: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.four,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 800,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  content: {
    flex: 1,
    gap: Spacing.three,
    maxWidth: 800,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    width: '100%',
  },
  pressed: {
    opacity: 0.78,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.two,
  },
  shell: {
    alignItems: 'center',
    flex: 1,
  },
  statTile: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 112,
  },
});
