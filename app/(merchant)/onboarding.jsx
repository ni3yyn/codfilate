import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  FadeInRight,
  FadeInLeft,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Layout,
  LinearTransition,
  Easing
} from 'react-native-reanimated';

const isWeb = Platform.OS === 'web';

// Hooks & Stores
import { useTheme } from "../../src/hooks/useTheme";
import { useStoreStore } from "../../src/stores/useStoreStore";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useWilayaStore } from "../../src/stores/useWilayaStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import { useResponsive } from "../../src/hooks/useResponsive";

// UI Components
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import Card from "../../src/components/ui/Card";
import BottomSheet from "../../src/components/ui/BottomSheet";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";

// Utils & Theme
import { typography, spacing, borderRadius } from "../../src/theme/theme";

// Premium Tokens
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

const STEPS = [
  { id: 1, title: "ترحيب", icon: "sparkles-outline" },
  { id: 2, title: "بيانات المتجر", icon: "business-outline" },
  { id: 3, title: "التحقق", icon: "shield-checkmark-outline" },
];

// Purely Circular Ambient Geometry for Onboarding
const OnboardingCinematicBackground = ({ isDark }) => {
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

export default function MerchantOnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isWide, maxContentWidth } = useResponsive();

  const createStore = useStoreStore((s) => s.createStore);
  const updateStore = useStoreStore((s) => s.updateStore);
  const currentStore = useStoreStore((s) => s.currentStore);
  const uploadFile = useStoreStore((s) => s.uploadFile);
  const fetchMyStore = useStoreStore((s) => s.fetchMyStore);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const { wilayas, fetchWilayas } = useWilayaStore();
  const { showAlert } = useAlertStore();

  const [currentStep, setCurrentStep] = useState(1);
  const isReapplying = !!(currentStore?.rejected_at);

  // Form State
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [idCardUri, setIdCardUri] = useState(null);
  const [registerUri, setRegisterUri] = useState(null);
  const [logoUri, setLogoUri] = useState(null);

  // UI States
  const [wilayaModal, setWilayaModal] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  useEffect(() => {
    fetchWilayas();
    fetchMyStore();
  }, [fetchWilayas, fetchMyStore]);

  useEffect(() => {
    if (currentStore) {
      setName(currentStore.name || "");
      setDesc(currentStore.description || "");
      setIdCardUri(currentStore.id_card_url || null);
      setRegisterUri(currentStore.commercial_register_url || null);
      setLogoUri(currentStore.logo_url || null);
      if (currentStore.wilaya_id && wilayas.length > 0) {
        const w = wilayas.find(w => w.id === currentStore.wilaya_id);
        if (w) setSelectedWilaya(w);
      }
    }
  }, [currentStore, wilayas]);

  const filteredWilayas = wilayas.filter((w) => {
    if (!wilayaSearch) return true;
    const q = wilayaSearch.toLowerCase();
    return (
      w.name.includes(wilayaSearch) ||
      (w.name_fr || "").toLowerCase().includes(q) ||
      w.code.includes(q)
    );
  });

  const pickImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (type === 'id') setIdCardUri(uri);
        else if (type === 'register') setRegisterUri(uri);
        else if (type === 'logo') setLogoUri(uri);
      }
    } catch (err) {
      showAlert({ title: "خطأ", message: "تعذر اختيار الصورة", type: "error" });
    }
  };

  const nextStep = () => {
    if (currentStep === 2) {
      if (!name.trim()) {
        showAlert({ title: "خطأ", message: "يرجى إدخال اسم المتجر", type: "error" });
        return;
      }
      if (!selectedWilaya) {
        showAlert({ title: "خطأ", message: "يرجى اختيار ولاية النشاط", type: "error" });
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  const finish = async () => {
    if (!idCardUri || !registerUri) {
      showAlert({
        title: "وثائق مفقودة",
        message: "يرجى تحميل بطاقة التعريف والسجل التجاري لتفعيل حسابك.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      setUploadStatus("جاري رفع الوثائق...");

      const isLocal = (u) => u && (u.startsWith('file://') || u.includes('ExponentExperienceData') || u.includes('cache'));

      let idUrlString = idCardUri;
      if (isLocal(idCardUri)) {
        const idRes = await uploadFile(idCardUri, "verification");
        if (!idRes.success) throw new Error("فشل رفع بطاقة التعريف");
        idUrlString = idRes.url;
      }

      let regUrlString = registerUri;
      if (isLocal(registerUri)) {
        const regRes = await uploadFile(registerUri, "verification");
        if (!regRes.success) throw new Error("فشل رفع السجل التجاري");
        regUrlString = regRes.url;
      }

      let logoUrlString = logoUri;
      if (isLocal(logoUri)) {
        const logoRes = await uploadFile(logoUri, "stores");
        if (logoRes.success) logoUrlString = logoRes.url;
      }

      setUploadStatus(currentStore ? "جاري تحديث البيانات..." : "جاري إنشاء المتجر...");

      const storePayload = {
        name: name.trim(),
        description: desc.trim() || null,
        is_active: false,
        wilaya_id: selectedWilaya.id,
        logo_url: logoUrlString,
        id_card_url: idUrlString,
        commercial_register_url: regUrlString,
        rejected_at: null,
        rejection_reason: null,
      };

      const res = currentStore
        ? await updateStore(currentStore.id, storePayload)
        : await createStore(storePayload);

      if (res.success) {
        await fetchProfile();
        showAlert({
          title: isReapplying ? "تمت إعادة إرسال الطلب" : "تم إرسال الطلب",
          message: "تم حفظ بيانات متجرك ووثائقك. سيتم مراجعة طلبك وتفعيل حسابك خلال 24 ساعة.",
          type: "success",
        });
        router.replace("/(merchant)/dashboard");
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      showAlert({ title: "خطأ", message: err.message, type: "error" });
    } finally {
      setLoading(false);
      setUploadStatus("");
    }
  };

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

  const renderWelcomeStep = () => (
    <Animated.View
      entering={FadeInRight.duration(400)}
      exiting={FadeOut.duration(300)}
      style={styles.stepContainer}
    >
      <View style={styles.header}>
        <View style={styles.iconOuterRing}>
          <Animated.View style={[styles.iconInnerRing, { backgroundColor: COLORS.primary }, !isWeb && nativeRocketStyle]}>
            <View ref={rocketRef}>
              <Ionicons name="rocket" size={42} color={COLORS.bgWhite} />
            </View>
          </Animated.View>
        </View>
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Text style={[styles.title, { color: theme.isDark ? COLORS.bgWhite : COLORS.textMain }]}>أهلاً بك أيها المورد 🏭</Text>
          <Text style={[styles.subtitle, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>
            نحن سعداء بانضمامك إلينا. لنقم بإعداد متجرك الإلكتروني في بضع خطوات بسيطة لنبدأ عرض منتجاتك للمسوقين.
          </Text>
        </Animated.View>
      </View>
      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <Button
          title="لنبدأ الإعداد"
          onPress={nextStep}
          variant="primary"
          icon="arrow-back"
          style={styles.mainBtn}
        />
      </Animated.View>
    </Animated.View>
  );

  const renderStoreStep = () => (
    <Animated.View
      entering={FadeInLeft.duration(400)}
      exiting={FadeOut.duration(300)}
      style={styles.stepContainer}
    >
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Text style={[styles.sectionTitle, { color: theme.isDark ? COLORS.bgWhite : COLORS.textMain }]}>هوية المتجر</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>أدخل البيانات الأساسية لمتجرك.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <View style={[
          styles.glassCard,
          Platform.OS === 'web' && { className: 'glass-panel' },
          { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.85)", borderColor: theme.isDark ? "rgba(255, 255, 255, 0.05)" : COLORS.border }
        ]}>
          <TouchableOpacity
            style={[styles.logoPicker, { borderColor: theme.isDark ? '#334155' : COLORS.border, backgroundColor: theme.isDark ? '#1E293B' : COLORS.bgMain }]}
            onPress={() => pickImage('logo')}
          >
            {logoUri ? (
              <View style={styles.logoPreviewWrap}>
                <Ionicons name="checkmark-circle" size={28} color={COLORS.accentMint} />
                <Text style={{ color: theme.isDark ? '#FFFFFF' : COLORS.textMain, fontFamily: 'Tajawal_800ExtraBold', fontSize: 16 }}>تم اختيار الشعار</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Ionicons name="image-outline" size={36} color={COLORS.textLight} />
                <Text style={{ color: COLORS.textLight, fontSize: 14, fontFamily: 'Tajawal_700Bold' }}>ارفع شعار المتجر (اختياري)</Text>
              </View>
            )}
          </TouchableOpacity>

          <Input
            label="اسم المتجر *"
            value={name}
            onChangeText={setName}
            placeholder="مثال: الجزائر للإلكترونيات"
            icon="business-outline"
          />
          <Input
            label="وصف النشاط"
            value={desc}
            onChangeText={setDesc}
            placeholder="ما هي المنتجات التي توفرها؟"
            multiline
            numberOfLines={2}
            icon="document-text-outline"
          />

          <Text style={[styles.label, { color: theme.isDark ? '#CBD5E1' : COLORS.textMain }]}>ولاية النشاط *</Text>
          <TouchableOpacity
            style={[styles.picker, { borderColor: theme.isDark ? '#334155' : COLORS.border, backgroundColor: theme.isDark ? '#1E293B' : COLORS.bgMain }]}
            onPress={() => setWilayaModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="location-outline" size={22} color={COLORS.textLight} />
            <Text style={[styles.pickerText, { color: selectedWilaya ? (theme.isDark ? '#FFFFFF' : COLORS.textMain) : COLORS.textLight }]}>
              {selectedWilaya ? `${selectedWilaya.code} — ${selectedWilaya.name}` : "اختر الولاية"}
            </Text>
            <Ionicons name="chevron-down" size={22} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View style={styles.btnRow} entering={FadeInDown.delay(400).springify()}>
        <Button title="رجوع" onPress={prevStep} variant="secondary" style={{ flex: 1 }} />
        <Button title="التالي" onPress={nextStep} variant="primary" style={{ flex: 2 }} />
      </Animated.View>
    </Animated.View>
  );

  const renderVerificationStep = () => (
    <Animated.View
      entering={FadeInLeft.duration(400)}
      exiting={FadeOut.duration(300)}
      style={styles.stepContainer}
    >
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Text style={[styles.sectionTitle, { color: theme.isDark ? COLORS.bgWhite : COLORS.textMain }]}>التحقق من الهوية</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>نحتاج لبعض الوثائق الرسمية لتفعيل حساب المورد الخاص بك.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <View style={[
          styles.glassCard,
          Platform.OS === 'web' && { className: 'glass-panel' },
          { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.85)", borderColor: theme.isDark ? "rgba(255, 255, 255, 0.05)" : COLORS.border }
        ]}>
          <Text style={[styles.cardTitle, { color: theme.isDark ? COLORS.bgWhite : COLORS.textMain }]}>الوثائق المطلوبة</Text>
          <Text style={[styles.cardDesc, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>
            يرجى تصوير وتحميل الوثائق بوضوح لضمان سرعة تفعيل الحساب.
          </Text>

          <View style={styles.docsRow}>
            <TouchableOpacity
              style={[styles.docBtn, { borderColor: idCardUri ? COLORS.accentMint : (theme.isDark ? '#334155' : COLORS.border), backgroundColor: idCardUri ? 'rgba(116, 198, 157, 0.1)' : (theme.isDark ? '#1E293B' : COLORS.bgMain) }]}
              onPress={() => pickImage('id')}
              activeOpacity={0.8}
            >
              <Ionicons name={idCardUri ? "checkmark-circle" : "card-outline"} size={32} color={idCardUri ? COLORS.accentMint : COLORS.textLight} />
              <Text style={[styles.docBtnText, { color: idCardUri ? COLORS.primary : (theme.isDark ? COLORS.bgWhite : COLORS.textMain) }]}>بطاقة التعريف</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.docBtn, { borderColor: registerUri ? COLORS.accentMint : (theme.isDark ? '#334155' : COLORS.border), backgroundColor: registerUri ? 'rgba(116, 198, 157, 0.1)' : (theme.isDark ? '#1E293B' : COLORS.bgMain) }]}
              onPress={() => pickImage('register')}
              activeOpacity={0.8}
            >
              <Ionicons name={registerUri ? "checkmark-circle" : "ribbon-outline"} size={32} color={registerUri ? COLORS.accentMint : COLORS.textLight} />
              <Text style={[styles.docBtnText, { color: registerUri ? COLORS.primary : (theme.isDark ? COLORS.bgWhite : COLORS.textMain) }]}>السجل التجاري</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {loading && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.loadingBox}>
          <LoadingSpinner size="small" color={COLORS.primary} />
          <Text style={[styles.uploadStatus, { color: COLORS.primary }]}>{uploadStatus}</Text>
        </Animated.View>
      )}

      <Animated.View style={styles.btnRow} entering={FadeInDown.delay(400).springify()}>
        <Button title="رجوع" onPress={prevStep} variant="secondary" style={{ flex: 1 }} disabled={loading} />
        <Button
          title="إرسال الطلب للتفعيل"
          onPress={finish}
          loading={loading}
          variant="primary"
          style={{ flex: 2 }}
          icon="shield-checkmark-outline"
        />
      </Animated.View>
    </Animated.View>
  );

  const ProgressIndicator = ({ currentStep, theme }) => {
    return (
      <View style={styles.progressContainer}>
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <React.Fragment key={step.id}>
              <View style={styles.stepItem}>
                <Animated.View
                  layout={LinearTransition}
                  style={[
                    styles.stepIcon,
                    {
                      backgroundColor: isCompleted ? COLORS.accentMint : isActive ? COLORS.primary : (theme.isDark ? '#334155' : COLORS.border),
                      transform: [{ scale: isActive ? withSpring(1.15, { damping: 12 }) : withSpring(1) }]
                    }
                  ]}
                >
                  <Ionicons
                    name={isCompleted ? "checkmark" : step.icon}
                    size={20}
                    color={isActive || isCompleted ? COLORS.bgWhite : COLORS.textLight}
                  />
                </Animated.View>
                <Text style={[styles.stepLabel, { color: isActive ? COLORS.primary : (isCompleted ? COLORS.accentMint : COLORS.textLight) }]}>
                  {step.title}
                </Text>
              </View>
              {idx < STEPS.length - 1 && (
                <View style={styles.stepLineContainer}>
                  <View style={[styles.stepLine, { backgroundColor: theme.isDark ? '#334155' : COLORS.border }]} />
                  <Animated.View
                    style={[
                      styles.stepLineActive,
                      {
                        backgroundColor: COLORS.accentMint,
                        width: isCompleted ? '100%' : '0%'
                      }
                    ]}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.isDark ? '#0A0A1A' : COLORS.bgMain }]} edges={["top", "bottom"]}>
      <OnboardingCinematicBackground isDark={theme.isDark} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ProgressIndicator currentStep={currentStep} theme={theme} />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isWide && { maxWidth: maxContentWidth, alignSelf: "center", width: "100%" },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderWelcomeStep()}
          {currentStep === 2 && renderStoreStep()}
          {currentStep === 3 && renderVerificationStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={wilayaModal}
        onClose={() => setWilayaModal(false)}
        title="اختر الولاية"
        subtitle="ولاية النشاط والمستودع الإقليمي"
      >
        <View style={{ gap: spacing.md, paddingBottom: 40, paddingTop: 10 }}>
          <Input
            value={wilayaSearch}
            onChangeText={setWilayaSearch}
            placeholder="بحث عن ولاية..."
            icon="search-outline"
          />
          <FlatList
            data={filteredWilayas}
            keyExtractor={(item) => item.id.toString()}
            style={{ maxHeight: 400 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.wRow, { borderBottomColor: theme.isDark ? '#334155' : COLORS.border }]}
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
            )}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bgRing1: { position: 'absolute', width: 900, height: 900, borderRadius: 450, borderWidth: 2, top: '-10%', left: '-20%' },
  bgRing2: { position: 'absolute', width: 700, height: 700, borderRadius: 350, borderWidth: 1, bottom: '20%', right: '-30%' },
  bgCircle: { position: 'absolute', width: 600, height: 600, borderRadius: 300, bottom: '-5%', right: '-10%' },

  scrollContent: { padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },

  // Progress Bar
  progressContainer: {
    flexDirection: 'row-reverse', // Strict RTL logic
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  stepItem: { alignItems: 'center', gap: 8, zIndex: 2 },
  stepIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primaryHover, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  stepLabel: { fontSize: 13, fontFamily: 'Tajawal_800ExtraBold' },
  stepLineContainer: { flex: 1, height: 4, marginHorizontal: -5, marginTop: -20, position: 'relative', overflow: 'hidden', borderRadius: 2 },
  stepLine: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  stepLineActive: { position: 'absolute', top: 0, right: 0, bottom: 0, borderRadius: 2 }, // Animates from Right to Left for Arabic

  stepContainer: { width: '100%', paddingBottom: 20 },

  // Header
  header: { alignItems: "center", marginBottom: 40 },
  iconOuterRing: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(116, 198, 157, 0.1)', alignItems: "center", justifyContent: "center", marginBottom: 24 },
  iconInnerRing: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primaryHover, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  title: { fontFamily: 'Tajawal_900Black', fontSize: 32, textAlign: "center", marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Tajawal_500Medium', fontSize: 16, textAlign: "center", lineHeight: 26, paddingHorizontal: 10 },

  // Sections
  sectionTitle: { fontFamily: 'Tajawal_900Black', fontSize: 28, textAlign: "right", marginBottom: 6 },
  sectionSubtitle: { fontFamily: 'Tajawal_500Medium', fontSize: 16, textAlign: "right", marginBottom: 24 },

  glassCard: { padding: 32, borderRadius: 30, borderWidth: 1, marginBottom: 32, shadowColor: COLORS.primaryHover, shadowOpacity: 0.05, shadowRadius: 30, elevation: 5 },
  cardTitle: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 20, marginBottom: 8, textAlign: 'right' },
  cardDesc: { fontFamily: 'Tajawal_500Medium', fontSize: 14, marginBottom: 24, textAlign: 'right', lineHeight: 22 },

  label: { fontFamily: "Tajawal_800ExtraBold", fontSize: 16, marginBottom: 10, marginTop: 8, textAlign: 'right' },
  picker: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, height: 64, marginBottom: 16 },
  pickerText: { flex: 1, textAlign: 'right', fontFamily: 'Tajawal_500Medium', fontSize: 16, marginHorizontal: 12 },

  logoPicker: { width: '100%', height: 120, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoPreviewWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },

  docsRow: { flexDirection: 'row-reverse', gap: 16 },
  docBtn: { flex: 1, height: 130, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 12 },
  docBtnText: { fontSize: 15, fontFamily: 'Tajawal_800ExtraBold' },

  loadingBox: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 },
  uploadStatus: { fontSize: 14, fontFamily: 'Tajawal_800ExtraBold' },

  btnRow: { flexDirection: 'row-reverse', gap: 16, marginTop: 10 },
  mainBtn: { height: 64 },

  wRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, paddingHorizontal: 8 },
  wRowText: { fontFamily: "Tajawal_700Bold", fontSize: 16, textAlign: 'right', flex: 1 },
});