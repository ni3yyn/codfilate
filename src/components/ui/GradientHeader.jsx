import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { typography, spacing } from '../../theme/theme';

export default function GradientHeader({
  title,
  subtitle,
  rightContent,
  children,
  compact = false,
}) {
  const theme = useTheme();
  const { isWide, maxContentWidth, contentPadding } = useResponsive();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark ? '#0A0A1A' : '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
        compact && styles.compact
      ]}
    >
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View
          style={[
            styles.inner,
            isWide && { maxWidth: maxContentWidth, width: '100%', alignSelf: 'center' },
            { paddingHorizontal: isWide ? contentPadding : spacing.md },
          ]}
        >
        <View style={styles.row}>
          <View style={styles.textContainer}>
            {subtitle && (
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {subtitle}
              </Text>
            )}
            {title && (
              <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            )}
          </View>
          {rightContent && (
            <View style={styles.rightContent}>{rightContent}</View>
          )}
        </View>
        {children && <View style={styles.children}>{children}</View>}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  inner: {},
  compact: {
    paddingBottom: spacing.xs,
  },
  safeArea: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.caption,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightContent: {},
  children: {
    marginTop: spacing.sm,
  },
});
