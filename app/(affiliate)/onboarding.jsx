import React, { useState } from "react";
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

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
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
            <View style={styles.header}>
              <View style={styles.iconOuterRing}>
                <View style={[styles.iconInnerRing, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="rocket" size={42} color={theme.primary} />
                </View>
              </View>

              <View style={[styles.stepBadge, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.stepText, { color: theme.primary }]}>الخطوة الأخيرة</Text>
              </View>

              <Text style={[styles.title, { color: theme.colors.text }]}>أهلاً بك في شبكتنا</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                أنت الآن جزء من شبكة المسوقين الرائدة. لنكمل إعداد حسابك لضمان وصول أرباحك في الوقت المحدد.
              </Text>
            </View>

            {/* Clean Form Area */}
            <View style={styles.formContainer}>

              <View style={styles.formHeader}>
                <Text style={[styles.formTitle, { color: theme.colors.text }]}>إعداد معلومات الدفع</Text>
                <Text style={[styles.formDesc, { color: theme.colors.textTertiary }]}>
                  أضف وسيلة واحدة أو أكثر لاستلام أرباحك براحة.
                </Text>
              </View>

              {/* Informational Banner */}
              <View style={[styles.infoBanner, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}>
                <Ionicons name="information-circle" size={20} color={theme.primary} style={{ marginStart: 8 }} />
                <Text style={[styles.infoText, { color: theme.primary }]}>
                  البيانات التي تدخلها هنا محمية تماماً وتستخدم فقط لتحويل مستحقاتك المالية.
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

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <Button
                title="حفظ وبدء العمل"
                onPress={handleFinish}
                loading={loading}
                disabled={skipLoading}
                variant="gradient"
                icon="checkmark-circle-outline"
                style={styles.primaryButton}
              />

              <Button
                title="تخطي مؤقتاً"
                onPress={handleSkip}
                loading={skipLoading}
                disabled={loading}
                variant="secondary"
                icon="arrow-forward-outline"
                style={styles.skipButton}
              />
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  keyboardView: { flex: 1 },

  // Layout constraints
  scrollContent: {
    padding: spacing.xl,
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
    marginBottom: spacing.xxl,
    marginTop: Platform.OS === 'web' ? spacing.xxl : spacing.md,
  },
  iconOuterRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  iconInnerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  stepText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 12,
  },
  title: {
    ...typography.h1,
    fontFamily: 'Tajawal_800ExtraBold',
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    fontFamily: 'Tajawal_500Medium',
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },

  // Clean Form Area
  formContainer: {
    marginBottom: spacing.xl,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  formTitle: {
    ...typography.h3,
    fontFamily: 'Tajawal_700Bold',
    marginBottom: 6,
    textAlign: 'center'
  },
  formDesc: {
    ...typography.body,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center'
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.caption,
    fontFamily: 'Tajawal_500Medium',
    flex: 1,
    textAlign: 'right',
    lineHeight: 20,
  },

  // Inputs
  inputMargin: {
    marginBottom: spacing.md,
  },
  ccpRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  ccpMainInput: {
    flex: 3,
  },
  ccpKeyInput: {
    flex: 1,
  },

  // Actions
  actionsContainer: {
    gap: spacing.sm,
  },
  primaryButton: {
    height: 54,
  },
  skipButton: {
    height: 54,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});