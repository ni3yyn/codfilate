import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useTheme } from '../../src/hooks/useTheme';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import { typography, spacing, gradients, borderRadius } from '../../src/theme/theme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { navigateToRoleHome } from '../../src/lib/roleRouter';
import { appConfig } from '../../src/lib/appConfig';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isWide } = useResponsive();
  const signIn = useAuthStore((s) => s.signIn);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Logo spring in
    Animated.spring(logoAnim, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();

    // Form slide up
    Animated.parallel([
      Animated.timing(formAnim, {
        toValue: 0,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.2,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    const result = await signIn(email.trim(), password);
    if (!result.success) {
      setError(result.error);
      return;
    }

    await fetchProfile();
    const profile = useAuthStore.getState().profile;
    if (profile) {
      navigateToRoleHome(router, profile);
    } else {
      setError('هذا الحساب تالف أو تم حذفه من قاعدة البيانات. سيتم تسجيل خروجك لإنشاء حساب جديد.');
      await useAuthStore.getState().signOut();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={
          theme.isDark
            ? ['#1A1040', '#0A0A1A', '#0A0A1A']
            : ['#E8E5FF', '#F5F6FA', '#F5F6FA']
        }
        style={styles.topGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              isWide && styles.scrollWide,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: logoAnim,
                  transform: [{ scale: logoAnim }],
                },
              ]}
            >
              {/* Glow */}
              <Animated.View
                style={[styles.glow, { backgroundColor: theme.primary, opacity: glowAnim }]}
              />
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logo}
              >
                <Text style={styles.logoText}>{appConfig.logoInitial}</Text>
              </LinearGradient>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                مرحباً بعودتك
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                تسجيل الدخول إلى حسابك
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View
              style={[
                styles.formCard,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(19, 19, 43, 0.6)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(0, 0, 0, 0.04)',
                  opacity: formOpacity,
                  transform: [{ translateY: formAnim }],
                },
              ]}
            >
              <Input
                label="البريد الإلكتروني"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                icon="mail-outline"
              />
              <Input
                label="كلمة المرور"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                icon="lock-closed-outline"
              />

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="تسجيل الدخول"
                onPress={handleLogin}
                loading={isLoading}
                variant="gradient"
                style={styles.button}
              />
            </Animated.View>

            {/* Footer */}
            <Animated.View
              style={[styles.footer, { opacity: formOpacity }]}
            >
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                ليس لديك حساب؟{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={[styles.link, { color: theme.primary }]}>
                  إنشاء حساب
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  scrollWide: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -10,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: 36,
    fontFamily: 'Tajawal_800ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#FF6B6B',
    ...typography.caption,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...typography.body,
  },
  link: {
    ...typography.bodyBold,
  },
});
