import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { MobileTopBar, PrimaryButton, ScreenShell, SecondaryButton } from '@/components/ecopest-ui';
import { ThemedText } from '@/components/themed-text';
import { EcoPestIcon } from '@/components/icons';
import { Radius, Spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser } from '@/lib/auth';
import { apiGet, ApiClientError } from '@/lib/sync/api-client';
import type { AiInsightsResult } from '@/lib/sync/types';
import { isMobileAdminRole } from '@/lib/auth-routes';

export default function InsightsScreen() {
  const theme = useTheme();
  const { strings } = useLanguage();
  const t = strings.insights;
  const currentUser = useCurrentUser();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<AiInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<AiInsightsResult>('/api/mobile/insights', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      setInsights(data);
    } catch (insightsError: unknown) {
      if (insightsError instanceof ApiClientError) {
        setError(insightsError.message);
      } else {
        setError(t.unavailable);
      }
    } finally {
      setLoading(false);
    }
  }, [t.unavailable]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (!isMobileAdminRole(currentUser.profile.role)) {
      router.replace('/(tabs)');
      return;
    }

    void loadInsights();
  }, [currentUser, loadInsights, router]);

  if (!currentUser) return null;

  return (
    <ScreenShell>
      <Stack.Screen options={{ title: t.title, headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <MobileTopBar
          leftIcon="arrow-left"
          leftLabel={strings.actions.back}
          onLeftPress={() => router.push('/(tabs)')}
          title={t.title}
        />
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: theme.primaryLight }]}>
              <EcoPestIcon color={theme.primary} name="brain" size={32} />
          </View>
          <ThemedText style={styles.title} type="title">
            {t.title}
          </ThemedText>
          <ThemedText style={styles.subtitle} type="default">
            {t.subtitle}
          </ThemedText>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.primary} size="large" />
            <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>{t.generating}</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <EcoPestIcon color={theme.dangerStrong} name="alert-circle" size={40} />
            <ThemedText style={{ marginTop: Spacing.md, textAlign: 'center' }}>{error}</ThemedText>
            <PrimaryButton onPress={() => void loadInsights()}>{strings.actions.retry}</PrimaryButton>
          </View>
        ) : insights ? (
          <View style={styles.content}>
            <View style={[styles.card, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <EcoPestIcon color={theme.primary} name="dashboard" size={20} />
                <ThemedText style={styles.cardTitle} type="smallBold">{t.overview}</ThemedText>
              </View>
              <ThemedText>{insights.summary}</ThemedText>
            </View>

            {insights.alerts.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <EcoPestIcon color={theme.dangerStrong} name="alert-circle" size={20} />
                  <ThemedText style={[styles.cardTitle, { color: theme.dangerStrong }]} type="smallBold">{t.alerts}</ThemedText>
                </View>
                {insights.alerts.map((alert, i) => (
                  <View key={`alert-${i}`} style={styles.listItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.dangerStrong }]} />
                    <ThemedText style={styles.listText}>{alert}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            {insights.recommendations.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <EcoPestIcon color={theme.successStrong} name="check-circle" size={20} />
                  <ThemedText style={[styles.cardTitle, { color: theme.successStrong }]} type="smallBold">{t.recommendations}</ThemedText>
                </View>
                {insights.recommendations.map((rec, i) => (
                  <View key={`rec-${i}`} style={styles.listItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.successStrong }]} />
                    <ThemedText style={styles.listText}>{rec}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.footerInfo}>
              <ThemedText style={[styles.footerText, { color: theme.textSecondary }]} type="small">
                {insights.source === 'gemini' ? t.sourceGemini : t.sourceFallback}
              </ThemedText>
              <ThemedText style={[styles.footerText, { color: theme.textSecondary }]} type="small">
                {t.generatedAt}: {insights.generatedAt}
              </ThemedText>
              {insights.note && (
                <ThemedText style={[styles.footerText, { color: theme.textSecondary, marginTop: Spacing.xs }]} type="small">
                  {insights.note}
                </ThemedText>
              )}
            </View>
            
            <SecondaryButton onPress={() => void loadInsights()}>{t.generate}</SecondaryButton>
          </View>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  headerIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 64,
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    width: 64,
  },
  title: {
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    opacity: 0.8,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  content: {
    gap: Spacing.lg,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 18,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingRight: Spacing.sm, // RTL Support
  },
  bullet: {
    borderRadius: 4,
    height: 8,
    marginRight: Spacing.sm,
    marginTop: 8,
    width: 8,
  },
  listText: {
    flex: 1,
    lineHeight: 24,
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    textAlign: 'center',
  },
});
