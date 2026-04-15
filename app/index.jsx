import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useTheme } from "../src/hooks/useTheme";
import { navigateToRoleHome } from "../src/lib/roleRouter";
import { appConfig } from "../src/lib/appConfig";
import { typography, spacing } from "../src/theme/theme";

/**
 * Premium Splash Screen.
 * Forest/Mint theme, clean animations, solid brand presence.
 */
export default function Index() {
  const router = useRouter();
  const { isLoading, isAuthenticated, profile } = useAuthStore();
  const theme = useTheme();
  const hasNavigated = useRef(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const dotsAnim = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Loading dots animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dotsAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    if (isLoading || hasNavigated.current) return;

    if (!isAuthenticated) {
      hasNavigated.current = true;
      router.replace("/(auth)/login");
      return;
    }

    if (profile) {
      hasNavigated.current = true;
      navigateToRoleHome(router, profile);
    }
    // If authenticated but profile is still loading (null), wait —
    // don't sign out aggressively, let the auth store finish fetching.
  }, [isLoading, isAuthenticated, profile]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Brand Mark */}
        <View
          style={[styles.logoContainer, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.logoText}>{appConfig.logoInitial}</Text>
        </View>

        {/* App Identity */}
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {appConfig.appName}
        </Text>

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {appConfig.tagline}
        </Text>

        {/* Loading State */}
        <View style={styles.loaderContainer}>
          <Animated.View style={[styles.loadingDots, { opacity: dotsAnim }]}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: theme.primary }]}
              />
            ))}
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 8px 24px rgba(45, 106, 79, 0.2)",
      },
    }),
  },
  logoText: {
    fontSize: 50,
    fontFamily: "Tajawal_800ExtraBold",
    color: "#FFFFFF",
  },
  title: {
    ...typography.h1,
    fontSize: 42,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    ...typography.body,
    fontSize: 16,
    fontFamily: "Tajawal_500Medium",
    letterSpacing: 2,
    opacity: 0.8,
  },
  loaderContainer: {
    marginTop: 60,
    height: 20,
    justifyContent: "center",
  },
  loadingDots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
