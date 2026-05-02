import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useTheme } from "../../src/hooks/useTheme";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import {
  typography,
  spacing,
  gradients,
  borderRadius,
} from "../../src/theme/theme";
import { useResponsive } from "../../src/hooks/useResponsive";
import { navigateToRoleHome } from "../../src/lib/roleRouter";
import { appConfig } from "../../src/lib/appConfig";
import { MaterialIcons } from '@expo/vector-icons';

// Hardcoded Premium Tokens from App.js to ensure exact match
const COLORS = {
  primary: '#2D6A4F',
  primaryHover: '#1B4332',
  primaryLight: '#E8F5E9',
  accentMint: '#74C69D',
  bgMain: '#F8F9FA',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#475569',
  textLight: '#94A3B8',
  danger: '#EF4444',
  border: 'rgba(15, 23, 42, 0.08)',
};

// Purely Circular Ambient Geometry for the Login Screen
const LoginCinematicBackground = ({ isDark }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 80000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ])).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinReverse = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <Animated.View style={[styles.bgRing1, { borderColor: isDark ? 'rgba(116, 198, 157, 0.08)' : 'rgba(45, 106, 79, 0.04)', transform: [{ rotate: spin }] }]} />
      <Animated.View style={[styles.bgRing2, { borderColor: isDark ? 'rgba(116, 198, 157, 0.05)' : 'rgba(45, 106, 79, 0.03)', transform: [{ rotate: spinReverse }] }]} />
      <Animated.View style={[styles.bgCircle, { backgroundColor: isDark ? 'rgba(116, 198, 157, 0.04)' : 'rgba(116, 198, 157, 0.08)', transform: [{ translateY }, { rotate: spinReverse }] }]} />
    </View>
  );
};

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { isWide } = useResponsive();

  const signIn = useAuthStore((s) => s.signIn);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const logoScale = useRef(new Animated.Value(0.01)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Orchestrated Cinematic Entrance matching App.js
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Form slide up with delay
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(formAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ])
    ]).start();
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("يرجى ملء جميع الحقول");
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
      setError("هذا الحساب تالف أو تم حذفه من قاعدة البيانات. سيتم تسجيل خروجك لإنشاء حساب جديد.");
      await useAuthStore.getState().signOut();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.isDark ? '#0A0A1A' : COLORS.bgMain }]}>
      <LoginCinematicBackground isDark={theme.isDark} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Orchestrated Header */}
            <Animated.View style={[styles.header, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
              <View style={[styles.logoPulse, { width: isMobile ? 70 : 90, height: isMobile ? 70 : 90, borderRadius: isMobile ? 35 : 45 }]}>
                <MaterialIcons name="local-fire-department" size={isMobile ? 36 : 48} color={COLORS.bgWhite} />
              </View>
              <Text style={[styles.title, { color: theme.isDark ? COLORS.bgWhite : COLORS.textMain, marginTop: isMobile ? 20 : 28 }]}>
                مرحباً بعودتك
              </Text>
              <Text style={[styles.subtitle, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>
                قم بتسجيل الدخول للمتابعة إلى لوحة التحكم
              </Text>
            </Animated.View>

            {/* Premium Form Card */}
            <Animated.View
              style={[
                styles.formCard,
                Platform.OS === 'web' && { className: 'glass-panel' },
                {
                  backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.85)",
                  borderColor: theme.isDark ? "rgba(255, 255, 255, 0.05)" : COLORS.border,
                  opacity: formOpacity,
                  transform: [{ translateY: formAnim }],
                },
              ]}
            >
              <Input
                label="البريد الإلكتروني"
                value={email}
                onChangeText={setEmail}
                placeholder="أدخل بريدك الإلكتروني"
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
                  <MaterialIcons name="error-outline" size={20} color={COLORS.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="تسجيل الدخول"
                onPress={handleLogin}
                loading={isLoading}
                variant="primary"
                style={styles.button}
                icon="arrow-back"
              />
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footer, { opacity: formOpacity }]}>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={[styles.link, { color: COLORS.primary }]}>
                  أنشئ حسابك مجاناً
                </Text>
              </TouchableOpacity>
              <Text style={[styles.footerText, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>
                ليس لديك حساب؟{" "}
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgRing1: { position: 'absolute', width: 800, height: 800, borderRadius: 400, borderWidth: 2, top: '-10%', right: '-20%' },
  bgRing2: { position: 'absolute', width: 600, height: 600, borderRadius: 300, borderWidth: 1, top: '40%', left: '-30%' },
  bgCircle: { position: 'absolute', width: 500, height: 500, borderRadius: 250, bottom: '-5%', left: '-20%' },

  safe: { flex: 1, zIndex: 10 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  scrollWide: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 500, // Widened slightly to match the premium spacious feel
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoPulse: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primaryHover,
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 15,
  },
  title: {
    fontFamily: "Tajawal_900Black",
    fontWeight: "900",
    fontSize: 36,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
  formCard: {
    borderRadius: 30, // Premium landing page shape
    borderWidth: 1,
    padding: 32, // Spacious padding
    marginBottom: 32,
    shadowColor: COLORS.primaryHover,
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 5,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 14,
    textAlign: "right",
    flexShrink: 1,
  },
  button: {
    marginTop: 10,
  },
  footer: {
    flexDirection: "row-reverse", // Enforce Arabic natural reading context
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  footerText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 16,
  },
  link: {
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 16,
  },
});