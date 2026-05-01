import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { createClient } from "@supabase/supabase-js";

// Hooks & Stores
import { useTheme } from "../../src/hooks/useTheme";
import { supabase } from "../../src/lib/supabase";
import { appConfig } from "../../src/lib/appConfig";
import { useAlertStore } from "../../src/stores/useAlertStore";
import { useAuthStore } from "../../src/stores/useAuthStore";

// UI Components
import Button from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import Input from "../../src/components/ui/Input";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import UniversalHeader from "../../src/components/ui/UniversalHeader";

// Theme & Utils
import { typography, spacing, borderRadius, shadows } from "../../src/theme/theme";

// Create a one-off client to sign up the new user WITHOUT logging out the admin
const tempSupabase = createClient(appConfig.supabase.url, appConfig.supabase.anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export default function AdminAddRegionalManagerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { showAlert } = useAlertStore();
  const signUp = useAuthStore((s) => s.signUp);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [wilayas, setWilayas] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isDesktop = width > 1100;
  const isTablet = width > 700 && width <= 1100;
  const numColumns = isDesktop ? 4 : isTablet ? 3 : 2;

  const loadWilayas = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wilayas")
        .select("id, name, code")
        .order("code");
      
      if (error) throw error;
      setWilayas(data || []);
    } catch (err) {
      if (__DEV__) console.error("Fetch wilayas error:", err);
      showAlert({ title: "خطأ", message: "تعذر تحميل قائمة الولايات", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadWilayas();
  }, [loadWilayas]);

  const toggleWilaya = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSave = async () => {
    const ids = [...selected]
      .map((id) => (typeof id === "string" ? parseInt(id, 10) : id))
      .filter((n) => n != null && !Number.isNaN(n));

    if (!email.trim() || !password.trim()) {
      showAlert({ title: "تنبيه", message: "يرجى إدخال البريد الإلكتروني وكلمة المرور للمدير", type: "warning" });
      return;
    }
    if (password.length < 6) {
      showAlert({ title: "تنبيه", message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", type: "warning" });
      return;
    }
    if (ids.length === 0) {
      showAlert({ title: "تنبيه", message: "يرجى اختيار ولاية واحدة على الأقل للمدير", type: "warning" });
      return;
    }

    setSaving(true);
    try {
      console.log("=== SUPABASE AUTH SIGNUP ATTEMPT ===");
      // Use tempSupabase so we don't accidentally log the Admin out!
      const { data: signUpData, error: signUpError } = await tempSupabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            role: "affiliate", // Fallback role for initial creation, RPC will upgrade this instantly
            full_name: fullName.trim(),
            phone: "0000000000", // Placeholder phone
            wilaya_id: ids[0], // First wilaya
            onboarding_completed: false,
          },
        },
      });

      // We ignore "already registered" so admins can re-assign existing accounts to be Regional Managers
      if (signUpError && !signUpError.message.includes("already registered") && !signUpError.message.includes("بالفعل")) {
        console.error("SignUp Error details:", signUpError);
        throw new Error(`تعذر إنشاء حساب: ${signUpError.message}`);
      }

      // 2. Call the admin RPC to assign wilayas and ensure profile exists with correct role
      const { error: rpcError } = await supabase.rpc("admin_provision_regional_manager", {
        p_email: email.trim(),
        p_full_name: fullName.trim(),
        p_assigned_wilayas: ids,
      });

      if (rpcError) throw rpcError;

      showAlert({
        title: "تم بنجاح",
        message: "تم إنشاء حساب المدير الإقليمي وتعيين الولايات بنجاح.",
        type: "success"
      });
      router.back();
    } catch (err) {
      if (__DEV__) console.error("Save RM error:", err);
      // We will show the raw JSON of the error so we can debug the exact trigger failure
      const errorDetail = err?.message || "Unknown error";
      const fullDetail = JSON.stringify(err, Object.getOwnPropertyNames(err));
      showAlert({ 
        title: "خطأ", 
        message: `${errorDetail}\n\n[تفاصيل للمطورين]:\n${fullDetail}`, 
        type: "error" 
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredWilayas = useMemo(() => {
    if (!searchQuery) return wilayas;
    return wilayas.filter(w => 
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      w.code.toString().includes(searchQuery)
    );
  }, [wilayas, searchQuery]);

  if (loading) return <LoadingSpinner message="جارٍ تحميل البيانات..." />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <UniversalHeader
        title="إضافة مدير إقليمي"
        subtitle="إنشاء حساب جديد وتعيين الولايات"
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          
          {/* ── Guidance Card ── */}
          <Card style={[styles.guideCard, { backgroundColor: theme.primary + '08', borderColor: theme.primary + '20' }]}>
            <View style={styles.guideHeader}>
              <Ionicons name="information-circle" size={24} color={theme.primary} />
              <Text style={[styles.guideTitle, { color: theme.primary }]}>تعليمات الإعداد</Text>
            </View>
            <Text style={[styles.guideText, { color: theme.colors.textSecondary }]}>
              أدخل بيانات المدير الجديد وسيتم إنشاء حسابه مباشرة مع صلاحيات "مدير إقليمي". يمكنك أيضاً إدخال بريد إلكتروني لحساب موجود مسبقاً لترقيته وتعيين الولايات له.
            </Text>
          </Card>

          {/* ── Basic Info Section ── */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>معلومات الحساب</Text>
          <Card style={styles.formCard}>
            <Input
              label="البريد الإلكتروني"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="example@codfilate.com"
              icon="mail-outline"
            />
            <View style={{ height: spacing.md }} />
            <Input
              label="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              icon="lock-closed-outline"
            />
            <View style={{ height: spacing.md }} />
            <Input
              label="الاسم الكامل"
              value={fullName}
              onChangeText={setFullName}
              placeholder="الاسم الثلاثي للمدير"
              icon="person-outline"
            />
          </Card>

          {/* ── Wilayas Selection Section ── */}
          <View style={styles.wilayaSectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>الولايات المعيّنة</Text>
            <View style={[styles.selectionCount, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.countText, { color: theme.primary }]}>{selected.size} مختارة</Text>
            </View>
          </View>

          {/* ── Search Bar for Wilayas ── */}
          <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="ابحث عن ولاية..."
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={[styles.wilayaGrid, { gap: spacing.sm }]}>
            {filteredWilayas.map((w) => {
              const isActive = selected.has(w.id);
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => toggleWilaya(w.id)}
                  activeOpacity={0.7}
                  style={[
                    styles.wilayaCard,
                    { 
                      width: `${100 / numColumns - 2}%`,
                      backgroundColor: isActive ? theme.primary + '10' : theme.colors.surface,
                      borderColor: isActive ? theme.primary : theme.colors.border,
                    }
                  ]}
                >
                  <View style={styles.wilayaRow}>
                    <Text style={[styles.wilayaCode, { color: theme.colors.textTertiary }]}>{w.code}</Text>
                    <Text style={[styles.wilayaName, { color: theme.colors.text }]} numberOfLines={1}>
                      {w.name}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={[styles.checkIcon, { backgroundColor: theme.primary }]}>
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredWilayas.length === 0 && (
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={48} color={theme.colors.border} />
              <Text style={{ color: theme.colors.textTertiary, fontFamily: 'Tajawal_500Medium', marginTop: 8 }}>
                لا توجد نتائج تطابق بحثك
              </Text>
            </View>
          )}

          <Button
            title="حفظ وتعيين المدير"
            onPress={handleSave}
            loading={saving}
            variant="gradient"
            style={styles.saveBtn}
            icon="shield-checkmark-outline"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 60 },
  container: {
    padding: spacing.md,
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
  },
  
  // Guide Card
  guideCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: spacing.lg,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  guideTitle: { fontFamily: "Tajawal_800ExtraBold", fontSize: 16 },
  guideText: { fontFamily: "Tajawal_500Medium", fontSize: 13, lineHeight: 20, textAlign: 'right' },

  sectionTitle: {
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 17,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  formCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },

  wilayaSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  selectionCount: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  countText: { fontFamily: 'Tajawal_700Bold', fontSize: 12 },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    textAlign: "right",
  },

  // Wilaya Grid
  wilayaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  wilayaCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    marginRight: '2%', // Small gap
  },
  wilayaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wilayaCode: { fontFamily: 'Tajawal_700Bold', fontSize: 12, opacity: 0.6 },
  wilayaName: { fontFamily: 'Tajawal_700Bold', fontSize: 14 },
  checkIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptySearch: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.md,
  },

  saveBtn: {
    marginTop: spacing.xxl,
    height: 56,
    borderRadius: borderRadius.lg,
  },
});
