// ===== CRASH TRACER (temporary) — remove after debugging =====
console.log('🔵 [BOOT-0] _layout.jsx module evaluation started');

import React, { useEffect, useCallback, useRef } from 'react';
console.log('🔵 [BOOT-1] React loaded');

import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
console.log('🔵 [BOOT-2] expo-router loaded');

import { StatusBar } from 'expo-status-bar';
console.log('🔵 [BOOT-3] expo-status-bar loaded');

import { View, Text, StyleSheet, I18nManager, TouchableOpacity, Platform } from 'react-native';
console.log('🔵 [BOOT-4] react-native loaded');

import { Ionicons } from '@expo/vector-icons';
console.log('🔵 [BOOT-5] @expo/vector-icons loaded');

import * as SplashScreen from 'expo-splash-screen';
console.log('🔵 [BOOT-6] expo-splash-screen loaded');

import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold
} from '@expo-google-fonts/tajawal';
console.log('🔵 [BOOT-7] @expo-google-fonts/tajawal loaded');

import { useAuthStore } from '../src/stores/useAuthStore';
console.log('🔵 [BOOT-8] useAuthStore loaded');

import { usePushRegistration } from '../src/hooks/usePushNotifications';
console.log('🔵 [BOOT-9] usePushNotifications loaded');

import { useThemeStore } from '../src/stores/useThemeStore';
console.log('🔵 [BOOT-10] useThemeStore loaded');

import { useAlertStore } from '../src/stores/useAlertStore';
console.log('🔵 [BOOT-11] useAlertStore loaded');

import GlobalAlert from '../src/components/ui/GlobalAlert';
console.log('🔵 [BOOT-12] GlobalAlert loaded');

import { getHomeForRole } from '../src/lib/roleRouter';
console.log('🔵 [BOOT-13] roleRouter loaded');

import { colors, typography, spacing, borderRadius } from '../src/theme/theme';
console.log('🔵 [BOOT-14] theme loaded');

import { appConfig } from '../src/lib/appConfig';
console.log('🔵 [BOOT-15] appConfig loaded');

import { securityShield } from '../src/lib/security.js';
console.log('🔵 [BOOT-16] security loaded');

// ADD THIS IMPORT FOR ANDROID NAVIGATION BAR
import * as NavigationBar from 'expo-navigation-bar';
console.log('🔵 [BOOT-17] expo-navigation-bar loaded');

// Keep splash screen visible while loading resources
console.log('🔵 [BOOT-18] All imports done, calling preventAutoHideAsync');
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

function DiagnosticScreen({ title, subtitle }) {
  const info = appConfig.debugInfo;
  return (
    <View style={[diagnosticStyles.container, { backgroundColor: '#0A0A1A' }]}>
      <View style={diagnosticStyles.card}>
        <Ionicons name="bug" size={48} color="#FF7675" />
        <Text style={diagnosticStyles.title}>{title || 'تنبيه: خطأ في التهيئة'}</Text>
        <Text style={diagnosticStyles.subtitle}>{subtitle || 'التطبيق غير مهيأ بشكل صحيح للعمل في بيئة الإنتاج.'}</Text>

        <View style={diagnosticStyles.logs}>
          <Text style={diagnosticStyles.logLine}>• Constants.expoConfig: {info.hasConstants ? '✅ OK' : '❌ Missing'}</Text>
          <Text style={diagnosticStyles.logLine}>• Manifest2 Detail: {info.hasManifest2 ? '✅ OK' : '❌ Missing'}</Text>
          <Text style={diagnosticStyles.logLine}>• Customer Data: {info.hasCustomerConfig ? '✅ OK' : '❌ Missing'}</Text>
          <Text style={diagnosticStyles.logLine}>• Target Customer: {info.customerId}</Text>
          <Text style={diagnosticStyles.logLine}>• Supabase Status: {appConfig.isConfigured ? '✅ OK' : '❌ NOT Configured'}</Text>
        </View>

        <Text style={diagnosticStyles.footer}>
          يرجى التحقق من ملفات app.config.js و config.json أثناء عملية البناء.
        </Text>
      </View>
    </View>
  );
}

const diagnosticStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#13132B', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  title: { fontFamily: 'Tajawal_700Bold', fontSize: 22, color: '#F0F0FF', marginTop: 16, textAlign: 'center' },
  subtitle: { fontFamily: 'Tajawal_400Regular', fontSize: 14, color: '#9CA3C0', marginVertical: 12, textAlign: 'center' },
  logs: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, marginVertical: 16 },
  logLine: { fontFamily: 'monospace', fontSize: 13, color: '#55EFC4', marginBottom: 4 },
  footer: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#636E72', textAlign: 'center', marginTop: 8 }
});

function SecurityBreachScreen({ threats }) {
  return (
    <View style={[diagnosticStyles.container, { backgroundColor: '#1A0A0A' }]}>
      <View style={[diagnosticStyles.card, { borderColor: '#FF7675' }]}>
        <Ionicons name="shield-half-outline" size={64} color="#FF7675" />
        <Text style={diagnosticStyles.title}>تنبيه أمني: بيئة غير آمنة</Text>
        <Text style={diagnosticStyles.subtitle}>يمنع هذا التطبيق التشغيل في البيئات التي قد تعرض بيانات المستخدمين أو كود المصدر للخطر.</Text>

        <View style={diagnosticStyles.logs}>
          {threats.map(t => (
            <Text key={t} style={[diagnosticStyles.logLine, { color: '#FF7675' }]}>
              • {t === 'COMPROMISED_OS' ? 'تم اكتشاف نظام روت/جيلبريك' :
                t === 'DEBUGGER_ATTACHED' ? 'تم كشف محاولة تصحيح برمجية (Debugger)' :
                  t === 'EMULATOR_DETECTED' ? 'يمنع تشغيل التطبيق في المحاكيات' : t}
            </Text>
          ))}
        </View>

        <Text style={diagnosticStyles.footer}>
          لأسباب أمنية، يرجى تشغيل التطبيق على هاتف حقيقي ونظام تشغيل أصلي.
        </Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  console.log('🟢 [RENDER-0] RootLayout function called');

  useRTL();
  console.log('🟢 [RENDER-1] useRTL done');

  const initialize = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const userId = useAuthStore((s) => s.user?.id);
  const profile = useAuthStore((s) => s.profile);
  console.log('🟢 [RENDER-2] useAuthStore done');

  const segments = useSegments();
  console.log('🟢 [RENDER-3] useSegments done');

  const router = useRouter();
  console.log('🟢 [RENDER-4] useRouter done');

  const navigationState = useRootNavigationState();
  console.log('🟢 [RENDER-5] useRootNavigationState done');

  const hasNavigated = useRef(false);

  usePushRegistration(userId);
  console.log('🟢 [RENDER-6] usePushRegistration done');

  const mode = useThemeStore((s) => s.mode);
  const themeColors = mode === 'dark' ? colors.dark : colors.light;
  console.log('🟢 [RENDER-7] useThemeStore done');

  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });
  console.log('🟢 [RENDER-8] useFonts done, loaded:', fontsLoaded, 'error:', fontError);

  const [securityStatus, setSecurityStatus] = React.useState({ isSecure: true, threats: [] });
  const [initError, setInitError] = React.useState(null);
  console.log('🟢 [RENDER-9] useState done');

  useEffect(() => {
    console.log('🟡 [EFFECT-1] startApp useEffect fired');
    async function startApp() {
      try {
        console.log('🟡 [EFFECT-1a] calling initialize()');
        await initialize();
        console.log('🟡 [EFFECT-1b] initialize() done');

        // STB-4: Perform security audit safely
        console.log('🟡 [EFFECT-1c] calling securityShield.checkEnvironment()');
        const res = await securityShield.checkEnvironment();
        console.log('🟡 [EFFECT-1d] security check done:', res);
        setSecurityStatus(res);
      } catch (err) {
        console.warn('[RootLayout] Init failed:', err);
        setInitError(err);
      }
    }

    startApp();
  }, []);

  // Enhanced Android Navigation Bar handling for edge-to-edge & theme sync
  useEffect(() => {
    if (Platform.OS === 'android') {
      const setupAndroidNavigation = async () => {
        try {
          // 1. Button styling (Dark nav buttons on light theme, light on dark)
          // This is still required and supported even in edge-to-edge mode
          const barStyle = mode === 'dark' ? 'light' : 'dark';
          await NavigationBar.setButtonStyleAsync(barStyle);
          
          console.log(`✅ Android navigation buttons synced with ${mode} theme`);
        } catch (error) {
          console.warn('NavigationBar setup failed:', error);
        }
      };

      setupAndroidNavigation();
    }
  }, [mode]);

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

  console.log('🟢 [RENDER-10] About to return JSX, fontsLoaded:', fontsLoaded, 'fontError:', fontError);

  if (!fontsLoaded && !fontError) {
    console.log('🟢 [RENDER-11] Returning null (fonts not loaded yet)');
    return null;
  }

  // DIAGNOSTIC CHECK: If app is misconfigured in production, show the error interface
  if (!appConfig.isConfigured && !__DEV__) {
    return <DiagnosticScreen />;
  }

  // SECURITY CHECK: If app is running in a compromised environment, halt execution
  if (!securityStatus.isSecure && !__DEV__) {
    return <SecurityBreachScreen threats={securityStatus.threats} />;
  }

  // STB-5: Catch initialization fatal errors
  if (initError && !__DEV__) {
    return <DiagnosticScreen title="خطأ فادح في البداية" subtitle={initError.message} />;
  }

  console.log('🟢 [RENDER-12] Past all guards, about to render Stack');

  // Catch any native-level errors during route resolution
  const origHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('🔴🔴🔴 [GLOBAL-CRASH] Fatal:', isFatal, 'Message:', error?.message || error);
    console.error('🔴🔴🔴 [GLOBAL-CRASH] Stack:', error?.stack?.substring(0, 1000));
    origHandler(error, isFatal);
  });

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
            animation: 'default',
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