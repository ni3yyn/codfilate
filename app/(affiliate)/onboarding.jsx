import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing
} from 'react-native-reanimated';

// Hooks & Stores
import { useTheme } from "../../src/hooks/useTheme";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import { useResponsive } from "../../src/hooks/useResponsive";

// UI Components
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";

// Utils & Theme
import { typography, spacing, borderRadius } from "../../src/theme/theme";

const isWeb = Platform.OS === 'web';

// Premium Hardcoded Tokens for Exact Match
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

// Purely Circular Ambient Geometry for Onboarding
const AffiliateCinematicBackground = ({ isDark }) => {
  const spinVal = useSharedValue(0);
  const floatVal = useSharedValue(0);

  useEffect(() => {
    spinVal.value = withRepeat(
      withTiming(1, { duration: 90000, easing: Easing.linear }),
      -1,
      false
    );
    floatVal.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [spinVal, floatVal]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinVal.value * 360}deg` }]
  }));

  const spinReverseStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(1 - spinVal.value) * 360}deg` }]
  }));

  const floatSpinStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -40 * floatVal.value },
      { rotate: `${spinVal.value * 360}deg` }
    ]
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <Animated.View style={[
        styles.bgRing1,
        { borderColor: isDark ? 'rgba(116, 198, 157, 0.06)' : 'rgba(45, 106, 79, 0.04)' },
        spinReverseStyle
      ]} />
      <Animated.View style={[
        styles.bgRing2,
        { borderColor: isDark ? 'rgba(116, 198, 157, 0.04)' : 'rgba(45, 106, 79, 0.03)' },
        spinStyle
      ]} />
      <Animated.View style={[
        styles.bgCircle,
        { backgroundColor: isDark ? 'rgba(116, 198, 157, 0.03)' : 'rgba(116, 198, 157, 0.06)' },
        floatSpinStyle
      ]} />
    </View>
  );
};

export default function AffiliateOnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isWide } = useResponsive();

  const { updateProfile, fetchProfile } = useAuthStore();
  const { showAlert } = useAlertStore();

  // Form State
  const [ccp, setCcp] = useState("");
  const [ccpKey, setCcpKey] = useState("");
  const [baridimob, setBaridimob] = useState("");
  const [flexy, setFlexy] = useState("");

  // Loading States
  const [loading, setLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);

  // Main submission (Requires at least one payment method)
  const handleFinish = async () => {
    if (!ccp.trim() && !baridimob.trim() && !flexy.trim()) {
      showAlert({
        title: "معلومات مفقودة",
        message: "يرجى إضافة وسيلة دفع واحدة على الأقل لنتمكن من تحويل أرباحك لاحقاً.",
        type: "warning"
      });
      return;
    }

    setLoading(true);
    const res = await updateProfile({
      ccp_number: ccp.trim() || null,
      ccp_key: ccpKey.trim() || null,
      baridimob_number: baridimob.trim() || null,
      flexy_number: flexy.trim() || null,
      onboarding_completed: true,
    });

    if (res.success) {
      await fetchProfile();
      router.replace("/(affiliate)/dashboard");
    } else {
      showAlert({ title: "خطأ", message: res.error, type: "error" });
    }
    setLoading(false);
  };

  // Skip logic (Saves onboarding status so auth guard doesn't loop them back)
  const handleSkip = async () => {
    setSkipLoading(true);
    const res = await updateProfile({
      onboarding_completed: true,
    });

    if (res.success) {
      await fetchProfile();
      router.replace("/(affiliate)/dashboard");
    } else {
      showAlert({ title: "خطأ", message: res.error, type: "error" });
    }
    setSkipLoading(false);
  };

  // Floating Rocket Animation
  const rocketRef = React.useRef(null);
  const rocketOffset = useSharedValue(0);

  useEffect(() => {
    rocketOffset.value = withRepeat(
      withTiming(10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const nativeRocketStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rocketOffset.value }]
  }));

  return (
    <View style={[styles.root, { backgroundColor: theme.isDark ? '#0A0A1A' : COLORS.bgMain }]}>
      <AffiliateCinematicBackground isDark={theme.isDark} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              isWide && styles.scrollContentWide,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* Header Section */}
            <Animated.View entering={FadeInUp.duration(600).springify()} style={styles.header}>
              <View style={styles.iconOuterRing}>
                <Animated.View style={[styles.iconInnerRing, { backgroundColor: COLORS.primary }, !isWeb && nativeRocketStyle]}>
                  <View ref={rocketRef}>
                    <Ionicons name="rocket" size={42} color={COLORS.bgWhite} />
                  </View>
                </Animated.View>
              </View>

              <View style={[styles.stepBadge, { backgroundColor: theme.isDark ? '#1E293B' : COLORS.bgWhite, borderColor: theme.isDark ? '#334155' : COLORS.border }]}>
                <Text style={[styles.stepText, { color: COLORS.primary }]}>الخطوة الأخيرة</Text>
              </View>

              <Text style={[styles.title, { color: theme.isDark ? COLORS.bgWhite : COLORS.textMain }]}>أهلاً بك في شبكتنا</Text>
              <Text style={[styles.subtitle, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>
                أنت الآن جزء من شبكة المسوقين الرائدة. لنكمل إعداد حسابك لضمان وصول أرباحك في الوقت المحدد.
              </Text>
            </Animated.View>

            {/* Clean Form Area */}
            <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.formContainer}>
              <View style={[
                styles.glassCard,
                Platform.OS === 'web' && { className: 'glass-panel' },
                { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.85)", borderColor: theme.isDark ? "rgba(255, 255, 255, 0.05)" : COLORS.border }
              ]}>

                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { color: theme.isDark ? COLORS.bgWhite : COLORS.textMain }]}>إعداد معلومات الدفع</Text>
                  <Text style={[styles.formDesc, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>
                    أضف وسيلة واحدة أو أكثر لاستلام أرباحك براحة.
                  </Text>
                </View>

                {/* Informational Banner */}
                <View style={[styles.infoBanner, { backgroundColor: theme.isDark ? 'rgba(116, 198, 157, 0.1)' : COLORS.primaryLight, borderColor: theme.isDark ? 'rgba(116, 198, 157, 0.2)' : 'rgba(116, 198, 157, 0.3)' }]}>
                  <Ionicons name="information-circle" size={24} color={COLORS.primary} style={{ marginStart: 12 }} />
                  <Text style={[styles.infoText, { color: COLORS.primary }]}>
                    البيانات التي تدخلها هنا محمية تماماً وتستخدم فقط لتحويل مستحقاتك المالية بشكل دوري.
                  </Text>
                </View>

                {/* CCP Row */}
                <View style={styles.ccpRow}>
                  <View style={styles.ccpMainInput}>
                    <Input
                      label="رقم حساب CCP"
                      value={ccp}
                      onChangeText={setCcp}
                      placeholder="00XXXXXXXX"
                      keyboardType="numeric"
                      icon="card-outline"
                    />
                  </View>
                  <View style={styles.ccpKeyInput}>
                    <Input
                      label="المفتاح"
                      value={ccpKey}
                      onChangeText={setCcpKey}
                      placeholder="XX"
                      keyboardType="numeric"
                      maxLength={2}
                      textAlign="center"
                    />
                  </View>
                </View>

                <Input
                  label="رقم بريدي موب (RIP)"
                  value={baridimob}
                  onChangeText={setBaridimob}
                  placeholder="00799999XXXXXXXXXXXX"
                  keyboardType="numeric"
                  icon="phone-portrait-outline"
                  containerStyle={styles.inputMargin}
                />

                <Input
                  label="رقم الفليكسي (Flexy)"
                  value={flexy}
                  onChangeText={setFlexy}
                  placeholder="05XX XX XX XX"
                  keyboardType="numeric"
                  icon="cellular-outline"
                  containerStyle={styles.inputMargin}
                />
              </View>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View entering={FadeInDown.delay(400).duration(600).springify()} style={styles.actionsContainer}>
              <Button
                title="حفظ وبدء العمل"
                onPress={handleFinish}
                loading={loading}
                disabled={skipLoading}
                variant="primary"
                icon="checkmark-circle-outline"
                style={styles.primaryButton}
              />

              <Button
                title="تخطي مؤقتاً"
                onPress={handleSkip}
                loading={skipLoading}
                disabled={loading}
                variant="ghost"
                icon="arrow-forward-outline"
                style={styles.skipButton}
              />
            </Animated.View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  root: { flex: 1 },
  bgRing1: { position: 'absolute', width: 900, height: 900, borderRadius: 450, borderWidth: 2, top: '-10%', left: '-20%' },
  bgRing2: { position: 'absolute', width: 700, height: 700, borderRadius: 350, borderWidth: 1, bottom: '20%', right: '-30%' },
  bgCircle: { position: 'absolute', width: 600, height: 600, borderRadius: 300, bottom: '-5%', right: '-10%' },

  safe: { flex: 1, zIndex: 10 },
  keyboardView: { flex: 1 },

  // Layout constraints
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
    flexGrow: 1,
    justifyContent: 'center'
  },
  scrollContentWide: {
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: Platform.OS === 'web' ? 40 : 20,
  },
  iconOuterRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(116, 198, 157, 0.1)',
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconInnerRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primaryHover,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  stepBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 1,
  },
  stepText: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 14,
  },
  title: {
    fontFamily: 'Tajawal_900Black',
    fontSize: 32,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 16,
  },

  // Form Area
  formContainer: {
    marginBottom: 24,
  },
  glassCard: {
    padding: 32,
    borderRadius: 30, // Premium aesthetic shape
    borderWidth: 1,
    shadowColor: COLORS.primaryHover,
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 5,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontFamily: 'Tajawal_900Black',
    fontSize: 24,
    marginBottom: 6,
    textAlign: 'center'
  },
  formDesc: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 14,
    textAlign: 'center'
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20, // Circular matching aesthetic
    borderWidth: 1,
    marginBottom: 32,
  },
  infoText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    lineHeight: 22,
  },

  // Inputs
  inputMargin: {
    marginBottom: 0,
  },
  ccpRow: {
    flexDirection: "row-reverse", // Strict RTL (Main input on right, Key on left)
    gap: 16,
    marginBottom: 0,
  },
  ccpMainInput: {
    flex: 3,
  },
  ccpKeyInput: {
    flex: 1,
  },

  // Actions
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    height: 64, // Large tap target
  },
  skipButton: {
    height: 56,
  },
});