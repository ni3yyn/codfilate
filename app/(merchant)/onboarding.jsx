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
} from 'react-native-reanimated';
import anime from 'animejs';

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

const STEPS = [
  { id: 1, title: "ترحيب", icon: "sparkles-outline" },
  { id: 2, title: "بيانات المتجر", icon: "business-outline" },
  { id: 3, title: "التحقق", icon: "shield-checkmark-outline" },
];

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
      
      // Only upload if it's a local URI (starts with file:// or contains /cache/)
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
        rejected_at: null, // Clear rejection status
        rejection_reason: null, // Clear reason
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
  const welcomeTextRef = React.useRef(null);
  const storeTitleRef = React.useRef(null);
  const storeCardRef = React.useRef(null);
  const storeBtnRowRef = React.useRef(null);
  const verifyTitleRef = React.useRef(null);
  const verifyCardRef = React.useRef(null);
  const verifyBtnRowRef = React.useRef(null);

  useEffect(() => {
    if (!isWeb || !anime) return;

    if (currentStep === 1) {
      if (rocketRef.current) {
        anime({
          targets: rocketRef.current,
          translateY: [-10, 10],
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutSine',
          duration: 1800
        });
      }
    }
  }, [currentStep]);

  const rocketOffset = useSharedValue(0);

  useEffect(() => {
    if (!isWeb) {
      rocketOffset.value = withRepeat(
        withTiming(10, { duration: 1500 }),
        -1,
        true
      );
    }
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
          <Animated.View style={[styles.iconInnerRing, { backgroundColor: theme.primary + '15' }, !isWeb && nativeRocketStyle]}>
            <View ref={rocketRef}>
              <Ionicons name="rocket" size={42} color={theme.primary} />
            </View>
          </Animated.View>
        </View>
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Text style={[styles.title, { color: theme.colors.text }]}>أهلاً بك أيها المورد 🏭</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            نحن سعداء بانضمامك إلينا. لنقم بإعداد متجرك الإلكتروني في بضع خطوات بسيطة لنبدأ عرض منتجاتك للمسوقين.
          </Text>
        </Animated.View>
      </View>
      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <Button
          title="لنبدأ الإعداد"
          onPress={nextStep}
          variant="gradient"
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
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>هوية المتجر</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>أدخل البيانات الأساسية لمتجرك.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <Card style={styles.card}>
        <TouchableOpacity 
          style={[styles.logoPicker, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
          onPress={() => pickImage('logo')}
        >
          {logoUri ? (
            <View style={styles.logoPreviewWrap}>
               <Ionicons name="checkmark-circle" size={24} color="#00B894" />
               <Text style={{ color: theme.colors.text, fontFamily: 'Tajawal_700Bold' }}>تم اختيار الشعار</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="image-outline" size={32} color={theme.colors.textTertiary} />
              <Text style={{ color: theme.colors.textTertiary, fontSize: 12, fontFamily: 'Tajawal_500Medium' }}>شعار المتجر (اختياري)</Text>
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

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>ولاية النشاط *</Text>
        <TouchableOpacity
          style={[styles.picker, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
          onPress={() => setWilayaModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={18} color={theme.primary} />
          <Text style={[styles.pickerText, { color: selectedWilaya ? theme.colors.text : theme.colors.textTertiary }]}>
            {selectedWilaya ? `${selectedWilaya.code} — ${selectedWilaya.name}` : "اختر الولاية"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </Card>
      </Animated.View>

      <Animated.View style={styles.btnRow} entering={FadeInDown.delay(400).springify()}>
        <Button title="التالي" onPress={nextStep} variant="gradient" style={{ flex: 2 }} />
        <Button title="رجوع" onPress={prevStep} variant="secondary" style={{ flex: 1 }} />
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
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>التحقق من الهوية</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>نحتاج لبعض الوثائق الرسمية لتفعيل حساب المورد الخاص بك.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).springify()}>
      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>الوثائق المطلوبة</Text>
        <Text style={[styles.cardDesc, { color: theme.colors.textTertiary }]}>
          يرجى تصوير وتحميل الوثائق بوضوح لضمان سرعة تفعيل الحساب.
        </Text>

        <View style={styles.docsRow}>
          <TouchableOpacity 
            style={[styles.docBtn, { borderColor: idCardUri ? '#00B894' : theme.colors.border, backgroundColor: idCardUri ? '#00B89410' : theme.colors.surface2 }]}
            onPress={() => pickImage('id')}
          >
            <Ionicons name={idCardUri ? "checkmark-circle" : "card-outline"} size={28} color={idCardUri ? '#00B894' : theme.colors.textSecondary} />
            <Text style={[styles.docBtnText, { color: theme.colors.text }]}>بطاقة التعريف</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.docBtn, { borderColor: registerUri ? '#00B894' : theme.colors.border, backgroundColor: registerUri ? '#00B89410' : theme.colors.surface2 }]}
            onPress={() => pickImage('register')}
          >
            <Ionicons name={registerUri ? "checkmark-circle" : "ribbon-outline"} size={28} color={registerUri ? '#00B894' : theme.colors.textSecondary} />
            <Text style={[styles.docBtnText, { color: theme.colors.text }]}>السجل التجاري</Text>
          </TouchableOpacity>
        </View>
      </Card>
      </Animated.View>

      {loading && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.loadingBox}>
          <LoadingSpinner size="small" color={theme.primary} />
          <Text style={[styles.uploadStatus, { color: theme.primary }]}>{uploadStatus}</Text>
        </Animated.View>
      )}

      <Animated.View style={styles.btnRow} entering={FadeInDown.delay(400).springify()}>
        <Button
          title="إرسال الطلب للتفعيل"
          onPress={finish}
          loading={loading}
          variant="gradient"
          style={{ flex: 2 }}
          icon="shield-checkmark-outline"
        />
        <Button title="رجوع" onPress={prevStep} variant="secondary" style={{ flex: 1 }} disabled={loading} />
      </Animated.View>
    </Animated.View>
  );

  const ProgressIndicator = ({ currentStep, theme }) => {
    const activeIconRef = React.useRef(null);

    useEffect(() => {
      if (isWeb && anime && activeIconRef.current) {
        anime({
          targets: activeIconRef.current,
          translateY: [-2, 2],
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutSine',
          duration: 1000
        });
      }
    }, [currentStep]);

    return (
      <View style={styles.progressContainer}>
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <React.Fragment key={step.id}>
              <View ref={isActive ? activeIconRef : null} style={styles.stepItem}>
                <Animated.View 
                  layout={LinearTransition}
                  style={[
                    styles.stepIcon,
                    { 
                      backgroundColor: isCompleted ? '#00B894' : isActive ? theme.primary : theme.colors.surface2,
                      transform: [{ scale: isActive ? withSpring(1.2) : withSpring(1) }]
                    }
                  ]}
                >
                  <Ionicons 
                    name={isCompleted ? "checkmark" : step.icon} 
                    size={18} 
                    color={isActive || isCompleted ? "#FFF" : theme.colors.textTertiary} 
                  />
                </Animated.View>
                <Text style={[styles.stepLabel, { color: isActive ? theme.primary : theme.colors.textTertiary }]}>
                  {step.title}
                </Text>
              </View>
              {idx < STEPS.length - 1 && (
                <View style={styles.stepLineContainer}>
                  <View style={[styles.stepLine, { backgroundColor: theme.colors.border }]} />
                  <Animated.View 
                    style={[
                      styles.stepLineActive, 
                      { 
                        backgroundColor: '#00B894',
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
      <LinearGradient
        colors={theme.isDark ? ["#1A1040", "#0A0A1A"] : ["#E8E5FF", "#F5F6FA"]}
        style={StyleSheet.absoluteFill}
      />
      
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
        <View style={{ gap: spacing.md }}>
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
                style={[styles.wRow, { borderBottomColor: theme.colors.divider }]}
                onPress={() => {
                  setSelectedWilaya(item);
                  setWilayaModal(false);
                  setWilayaSearch("");
                }}
              >
                <Text style={styles.wRowText}>{item.code} — {item.name}</Text>
                {selectedWilaya?.id === item.id && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
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
  scrollContent: { padding: spacing.lg, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  
  // Progress Bar
  progressContainer: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  stepItem: { alignItems: 'center', gap: 6, zIndex: 2 },
  stepIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  stepLabel: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  stepLineContainer: { flex: 1, height: 3, marginHorizontal: -5, marginTop: -15, position: 'relative', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2 },
  stepLine: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  stepLineActive: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 2 },

  stepContainer: { width: '100%', paddingBottom: 20 },
  
  // Header
  header: { alignItems: "center", marginBottom: spacing.xl },
  iconOuterRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.03)', alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  iconInnerRing: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  title: { ...typography.h1, textAlign: "center", marginBottom: spacing.sm, fontFamily: 'Tajawal_800ExtraBold' },
  subtitle: { ...typography.body, textAlign: "center", lineHeight: 24, paddingHorizontal: 10, fontFamily: 'Tajawal_500Medium' },
  
  // Sections
  sectionTitle: { ...typography.h2, textAlign: "right", marginBottom: 4, fontFamily: 'Tajawal_700Bold' },
  sectionSubtitle: { ...typography.body, textAlign: "right", marginBottom: spacing.lg, fontFamily: 'Tajawal_500Medium' },

  card: { padding: spacing.md, borderRadius: borderRadius.xl, marginBottom: spacing.lg },
  cardTitle: { ...typography.h3, marginBottom: spacing.sm, textAlign: 'right', fontFamily: 'Tajawal_700Bold' },
  cardDesc: { ...typography.caption, marginBottom: spacing.md, textAlign: 'right', lineHeight: 18 },
  
  label: { ...typography.caption, marginBottom: 6, marginTop: spacing.xs, fontFamily: "Tajawal_700Bold", textAlign: 'right' },
  picker: { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderRadius: borderRadius.md, borderWidth: 1, gap: spacing.sm },
  pickerText: { flex: 1, textAlign: 'right', fontFamily: 'Tajawal_500Medium' },
  
  logoPicker: { width: '100%', height: 100, borderRadius: borderRadius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoPreviewWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },

  docsRow: { flexDirection: 'row-reverse', gap: spacing.sm },
  docBtn: { flex: 1, height: 110, borderRadius: borderRadius.lg, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  docBtnText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },

  loadingBox: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: spacing.md },
  uploadStatus: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  
  btnRow: { flexDirection: 'row-reverse', gap: spacing.md, marginTop: spacing.md },
  mainBtn: { height: 56 },

  wRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4 },
  wRowText: { color: '#333', fontFamily: "Tajawal_700Bold", fontSize: 16, textAlign: 'right', flex: 1 },
});
