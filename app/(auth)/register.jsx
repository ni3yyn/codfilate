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
  useWindowDimensions,
  I18nManager
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useTheme } from "../../src/hooks/useTheme";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import { useWilayaStore } from "../../src/stores/useWilayaStore";
import BottomSheet from "../../src/components/ui/BottomSheet";
import FlatList from "react-native-gesture-handler"; // Or just FlatList from react-native
import {
  typography,
  spacing,
  borderRadius,
  gradients,
} from "../../src/theme/theme";
import { ROLES } from "../../src/lib/constants";
import {
  SELF_REGISTRATION_ROLES,
  navigateToRoleHome,
} from "../../src/lib/roleRouter";
import { useResponsive } from "../../src/hooks/useResponsive";

// Hardcoded Premium Tokens to ensure exact match with App.js aesthetics
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

// Purely Circular Cinematic Background
const RegisterCinematicBackground = ({ isDark }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 90000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 10000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 10000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ])).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinReverse = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <Animated.View style={[styles.bgRing1, { borderColor: isDark ? 'rgba(116, 198, 157, 0.06)' : 'rgba(45, 106, 79, 0.04)', transform: [{ rotate: spinReverse }] }]} />
      <Animated.View style={[styles.bgRing2, { borderColor: isDark ? 'rgba(116, 198, 157, 0.04)' : 'rgba(45, 106, 79, 0.03)', transform: [{ rotate: spin }] }]} />
      <Animated.View style={[styles.bgCircle, { backgroundColor: isDark ? 'rgba(116, 198, 157, 0.03)' : 'rgba(116, 198, 157, 0.06)', transform: [{ translateY }, { rotate: spin }] }]} />
    </View>
  );
};

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { isWide } = useResponsive();

  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(ROLES.AFFILIATE);
  const [error, setError] = useState("");

  const { wilayas, fetchWilayas } = useWilayaStore();
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [wilayaModal, setWilayaModal] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState("");

  useEffect(() => {
    fetchWilayas();
  }, [fetchWilayas]);

  const filteredWilayas = wilayas.filter((w) => {
    if (!wilayaSearch) return true;
    const q = wilayaSearch.toLowerCase();
    return (
      w.name.includes(wilayaSearch) ||
      (w.name_fr || "").toLowerCase().includes(q) ||
      w.code.includes(q)
    );
  });

  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.9)).current;
  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(headerScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();

    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(formAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ])
    ]).start();
  }, []);

  const handleRegister = async () => {
    setError("");
    if (!fullName.trim() || !email.trim() || !password.trim() || !phone.trim() || !selectedWilaya) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    if (password.length < 6) {
      setError("يجب أن تتكون كلمة المرور من 6 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    // SEC-1: Validate role against allowlist before sending to server
    if (!SELF_REGISTRATION_ROLES.includes(role)) {
      setError("نوع الحساب غير مسموح به");
      return;
    }

    const result = await signUp(email.trim(), password, role, fullName.trim(), phone.trim(), selectedWilaya?.id);
    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.requiresVerification) {
      router.replace("/(auth)/login");
      return;
    }

    const profile = useAuthStore.getState().profile;
    if (role === ROLES.MERCHANT && profile?.onboarding_completed === false) {
      router.replace("/(merchant)/onboarding");
    } else if (role === ROLES.AFFILIATE && profile?.onboarding_completed === false) {
      router.replace("/(affiliate)/onboarding");
    } else {
      navigateToRoleHome(router, profile || { role });
    }
  };

  const RoleOption = ({ value, label, icon, description }) => {
    const isSelected = role === value;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]).start();
      setRole(value);
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.9}
          style={[
            styles.roleOption,
            {
              backgroundColor: isSelected ? 'rgba(116, 198, 157, 0.08)' : (theme.isDark ? '#1E293B' : COLORS.bgWhite),
              borderColor: isSelected ? COLORS.primary : (theme.isDark ? '#334155' : COLORS.border),
            },
            isSelected && styles.roleOptionActiveShadow
          ]}
        >
          {/* Radio Button (Right Side for RTL natural flow) */}
          <View style={[
            styles.radio,
            {
              borderColor: isSelected ? COLORS.primary : COLORS.textLight,
              backgroundColor: isSelected ? COLORS.primary : "transparent",
            },
          ]}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color={COLORS.bgWhite} />}
          </View>

          {/* Text Content (Right Aligned, Next to Radio) */}
          <View style={styles.roleInfo}>
            <Text style={[styles.roleLabel, { color: isSelected ? COLORS.primary : (theme.isDark ? COLORS.bgWhite : COLORS.textMain) }]}>
              {label}
            </Text>
            <Text style={[styles.roleDesc, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>
              {description}
            </Text>
          </View>

          {/* Icon (Far Left Side) */}
          <View style={[styles.roleIcon, { backgroundColor: isSelected ? COLORS.primary : (theme.isDark ? '#334155' : COLORS.bgMain) }]}>
            <Ionicons
              name={icon}
              size={24}
              color={isSelected ? COLORS.bgWhite : COLORS.textLight}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.isDark ? '#0A0A1A' : COLORS.bgMain }]}>
      <RegisterCinematicBackground isDark={theme.isDark} />

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
            <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ scale: headerScale }] }]}>
              <View style={[styles.logoPulse, { width: isMobile ? 60 : 80, height: isMobile ? 60 : 80, borderRadius: isMobile ? 30 : 40 }]}>
                <MaterialIcons name="person-add" size={isMobile ? 30 : 40} color={COLORS.bgWhite} />
              </View>
              <Text style={[styles.title, { color: theme.isDark ? COLORS.bgWhite : COLORS.textMain, marginTop: isMobile ? 16 : 24 }]}>
                إنشاء <Text style={{ color: COLORS.primary }}>حساب</Text>
              </Text>
              <Text style={[styles.subtitle, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>
                ابدأ رحلتك معنا واختر مسارك
              </Text>
            </Animated.View>

            {/* Role Selection Blocks */}
            <Animated.View
              style={[
                styles.roleContainer,
                { opacity: formOpacity, transform: [{ translateY: formAnim }] },
              ]}
            >
              <RoleOption
                value={ROLES.MERCHANT}
                label="تسجيل كتاجر"
                icon="storefront-outline"
                description="لدي منتجات أريد عرضها وبيعها في المنصة"
              />
              <RoleOption
                value={ROLES.AFFILIATE}
                label="تسجيل كمسوق"
                icon="megaphone-outline"
                description="أريد تسويق المنتجات وجني العمولات"
              />
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
                label="الاسم الكامل"
                value={fullName}
                onChangeText={setFullName}
                placeholder="أدخل اسمك الكامل"
                icon="person-outline"
              />
              <Input
                label="البريد الإلكتروني"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                icon="mail-outline"
              />
              <Input
                label="رقم الهاتف"
                value={phone}
                onChangeText={setPhone}
                placeholder="0XXXXXXXXX"
                keyboardType="phone-pad"
                icon="call-outline"
              />

              <Input
                label="كلمة المرور"
                value={password}
                onChangeText={setPassword}
                placeholder="6 أحرف كحد أدنى"
                secureTextEntry
                icon="lock-closed-outline"
              />

              <Input
                label="تأكيد كلمة المرور"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="أعد كتابة كلمة المرور"
                secureTextEntry
                icon="lock-closed-outline"
              />

              <Text style={[styles.label, { color: theme.isDark ? '#CBD5E1' : COLORS.textMain }]}>الولاية</Text>
              <TouchableOpacity
                style={[
                  styles.picker,
                  {
                    backgroundColor: theme.isDark ? '#1E293B' : COLORS.bgMain,
                    borderColor: theme.isDark ? '#334155' : COLORS.border,
                  },
                ]}
                onPress={() => setWilayaModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="location-outline" size={22} color={COLORS.textLight} />
                <Text
                  style={[
                    styles.pickerText,
                    { color: selectedWilaya ? (theme.isDark ? '#FFFFFF' : COLORS.textMain) : COLORS.textLight }
                  ]}
                >
                  {selectedWilaya ? `${selectedWilaya.code} — ${selectedWilaya.name}` : "اختر ولايتك"}
                </Text>
                <Ionicons name="chevron-down" size={22} color={COLORS.textLight} />
              </TouchableOpacity>

              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={20} color={COLORS.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="إنشاء حساب"
                onPress={handleRegister}
                loading={isLoading}
                variant="primary"
                style={styles.button}
                icon="arrow-back"
              />
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footer, { opacity: formOpacity }]}>
              <Text style={[styles.footerText, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>
                لديك حساب بالفعل؟
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={[styles.link, { color: COLORS.primary }]}>
                  تسجيل الدخول
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <BottomSheet
              visible={wilayaModal}
              onClose={() => setWilayaModal(false)}
              title="اختر الولاية"
            >
              <View style={{ gap: spacing.md, paddingBottom: 40, paddingTop: 10 }}>
                <Input
                  value={wilayaSearch}
                  onChangeText={setWilayaSearch}
                  placeholder="ابحث عن ولاية..."
                  icon="search-outline"
                />
                <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                  {filteredWilayas.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.wRow,
                        { borderBottomColor: theme.isDark ? '#334155' : COLORS.border },
                      ]}
                      onPress={() => {
                        setSelectedWilaya(item);
                        setWilayaModal(false);
                        setWilayaSearch("");
                      }}
                    >
                      <Text style={[styles.wRowText, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}>
                        {item.code} — {item.name}
                      </Text>
                      {selectedWilaya?.id === item.id && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} style={{ marginLeft: 10 }} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </BottomSheet>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgRing1: { position: 'absolute', width: 900, height: 900, borderRadius: 450, borderWidth: 2, top: '-10%', left: '-20%' },
  bgRing2: { position: 'absolute', width: 700, height: 700, borderRadius: 350, borderWidth: 1, bottom: '20%', right: '-30%' },
  bgCircle: { position: 'absolute', width: 600, height: 600, borderRadius: 300, bottom: '-5%', right: '-10%' },

  safe: { flex: 1, zIndex: 10 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  scrollWide: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 500, // Widened for breathing room
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
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
  roleContainer: {
    gap: 16,
    marginBottom: 32,
  },
  roleOption: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'row-reverse', // Fixes double-flip on Expo Web with dir="rtl"
    alignItems: "center",
    padding: 20,
    borderRadius: 24, // Matches premium feel
    borderWidth: 1.5,
    gap: 16,
  },
  roleOptionActiveShadow: {
    shadowColor: COLORS.primaryHover,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  roleInfo: {
    flex: 1,
    justifyContent: 'center', // Allow stretching horizontally so textAlign right works
  },
  roleLabel: {
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 18,
    marginBottom: 4,
    textAlign: 'right',
  },
  roleDesc: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    textAlign: 'right',
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28, // Perfect circle
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 32,
    marginBottom: 32,
    shadowColor: COLORS.primaryHover,
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 5,
  },
  label: {
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 16,
    marginBottom: 10,
    marginTop: 8,
    textAlign: 'right', // Force RTL alignment
    writingDirection: 'rtl',
  },
  picker: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'row-reverse',
    alignItems: "center",
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    height: 64, // Taller touch target
    marginBottom: 24,
  },
  pickerText: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 16,
    flex: 1,
    textAlign: 'right',
    marginHorizontal: 12,
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
    flexDirection: Platform.OS === 'web' ? 'row' : 'row-reverse',
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
    gap: 6,
  },
  footerText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 16,
  },
  link: {
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 16,
  },
  wRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'row-reverse',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  wRowText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 16,
    textAlign: 'right',
    flex: 1,
  }
});