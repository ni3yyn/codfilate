import React, { useEffect, useCallback, useRef } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, I18nManager, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold
} from '@expo-google-fonts/tajawal';

import { useAuthStore } from '../src/stores/useAuthStore';
import { usePushRegistration } from '../src/hooks/usePushNotifications';
import { useThemeStore } from '../src/stores/useThemeStore';
import { useAlertStore } from '../src/stores/useAlertStore';
import GlobalAlert from '../src/components/ui/GlobalAlert';
import { getHomeForRole } from '../src/lib/roleRouter';
import { colors, typography, spacing, borderRadius } from '../src/theme/theme';

// Keep splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

// Enforce RTL universally for the Arabic UI (Safe Management)
function useRTL() {
  useEffect(() => {
    try {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
      
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.documentElement.dir = 'rtl';
        document.body.dir = 'rtl';
      }
    } catch (e) {
      console.warn('RTL Setup Error:', e);
    }
  }, []);
}

// Error Boundary Class Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const themeColors = colors.dark; // Fallback to dark theme for error
      return (
        <View style={[errorStyles.container, { backgroundColor: themeColors.background }]}>
          <View style={errorStyles.content}>
            <Ionicons name="warning-outline" size={48} color="#FDCB6E" />
            <Text style={errorStyles.title}>حدث خطأ غير متوقع</Text>
            <Text style={errorStyles.message}>
              {__DEV__ ? this.state.error?.message : 'يرجى إعادة تشغيل التطبيق.'}
            </Text>
            <TouchableOpacity
              style={errorStyles.button}
              onPress={() => this.setState({ hasError: false, error: null })}
              activeOpacity={0.8}
            >
              <Text style={errorStyles.buttonText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(19, 19, 43, 0.8)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    width: '100%',
  },
  title: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 20,
    color: '#F0F0FF',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 14,
    color: '#9CA3C0',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#2D664F', // Forest Green
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 14,
  },
  buttonText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default function RootLayout() {
  useRTL();
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const userId = useAuthStore((s) => s.user?.id);
  const profile = useAuthStore((s) => s.profile);
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const hasNavigated = useRef(false);

  usePushRegistration(userId);
  const mode = useThemeStore((s) => s.mode);
  const themeColors = mode === 'dark' ? colors.dark : colors.light;

  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });

  useEffect(() => {
    initialize();
  }, []);

  // Reset navigation guard when auth state changes significantly
  useEffect(() => {
    hasNavigated.current = false;
  }, [isAuthenticated, profile?.role]);

  useEffect(() => {
    // Wait for everything to be ready (NAV-5 fix)
    if (isLoading || !fontsLoaded) return;
    if (!navigationState?.key) return; // Navigation tree not mounted yet
    if (hasNavigated.current) return; // Already redirected this cycle

    const inAuthGroup = segments[0] === '(auth)';
    const isPublicRoute = segments[0] === 'track' || segments[0] === 'c' 
      || segments[0] === 'submit-order' || segments[0] === undefined || segments[0] === '';

    if (!isAuthenticated && !inAuthGroup && !isPublicRoute) {
      // Unauthenticated user on a protected route → login
      hasNavigated.current = true;
      router.replace('/(auth)/login');
    } else if (isAuthenticated && profile) {
      if (inAuthGroup) {
        // Authenticated user on auth page → redirect to their role home (NAV-3 fix)
        hasNavigated.current = true;
        router.replace(getHomeForRole(profile.role));
      } else if (!isPublicRoute) {
        // Role-based protection: verify user belongs to the current route group
        const roleProtection = {
          '(admin)': 'admin',
          '(merchant)': 'merchant',
          '(regional_manager)': 'regional_manager',
          '(delivery)': 'delivery',
          '(affiliate)': 'affiliate',
        };
        
        const currentGroup = segments[0];
        const requiredRole = roleProtection[currentGroup];
        
        if (requiredRole && profile.role !== requiredRole) {
          hasNavigated.current = true;
          router.replace(getHomeForRole(profile.role));
        }
      }
    }
  }, [isAuthenticated, segments.join(','), isLoading, fontsLoaded, !!profile, navigationState?.key]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <View
        style={[
          styles.container,
          { backgroundColor: themeColors.background },
          Platform.OS === 'web' && styles.webRoot,
        ]}
        onLayout={onLayoutRootView}
      >
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: themeColors.background },
            animation: 'ios',
            animationDuration: 200,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="c" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(merchant)" />
          <Stack.Screen name="(affiliate)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(regional_manager)" />
          <Stack.Screen name="(delivery)" />
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        </Stack>
        <GlobalAlert />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webRoot: {
    minHeight: '100vh',
    width: '100%',
    maxWidth: '100%',
  },
});
