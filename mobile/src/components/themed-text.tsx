import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, ThemeColor, Typography } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useTextScale } from '@/contexts/text-scale-context';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

function scaleTextStyle(style: TextStyle, textScale: number): TextStyle {
  if (textScale === 1) {
    return style;
  }

  return {
    ...style,
    ...(typeof style.fontSize === 'number' ? { fontSize: style.fontSize * textScale } : {}),
    ...(typeof style.lineHeight === 'number' ? { lineHeight: style.lineHeight * textScale } : {}),
  };
}

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { isRtl } = useLanguage();
  const { textScale } = useTextScale();
  const textStyle = StyleSheet.flatten([
    { color: theme[themeColor ?? 'text'], textAlign: isRtl ? 'right' : 'left', writingDirection: isRtl ? 'rtl' : 'ltr' },
    type === 'default' && styles.default,
    type === 'title' && styles.title,
    type === 'small' && styles.small,
    type === 'smallBold' && styles.smallBold,
    type === 'subtitle' && styles.subtitle,
    type === 'link' && styles.link,
    type === 'linkPrimary' && [styles.linkPrimary, { color: theme.info }],
    type === 'code' && styles.code,
    style,
  ]) as TextStyle;

  return (
    <Text
      style={scaleTextStyle(textStyle, textScale)}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  smallBold: {
    fontFamily: Fonts.sansBold,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  default: {
    fontFamily: Fonts.sans,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  title: {
    fontFamily: Fonts.sansHeavy,
    fontSize: Typography.fontSize.xl,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.tight,
  },
  subtitle: {
    fontFamily: Fonts.sansHeavy,
    fontSize: Typography.fontSize.xxl,
    lineHeight: Typography.fontSize.xxl * Typography.lineHeight.tight,
  },
  link: {
    fontFamily: Fonts.sansMedium,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
    fontSize: Typography.fontSize.sm,
  },
  linkPrimary: {
    fontFamily: Fonts.sansMedium,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
    fontSize: Typography.fontSize.sm,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});