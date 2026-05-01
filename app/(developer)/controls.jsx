import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
  Animated,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { useResponsive } from "../../src/hooks/useResponsive";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useThemeStore } from "../../src/stores/useThemeStore";
import { usePlatformControlsStore } from "../../src/stores/usePlatformControlsStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import SignOutButton from "../../src/components/ui/SignOutButton";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import CustomAlert from "../../src/components/ui/CustomAlert";
import { typography, spacing, borderRadius, colors } from "../../src/theme/theme";

// ─── Update Type Radio Options ──────────────────────────────────────────────
const UPDATE_OPTIONS = [
  { value: null, label: "لا يوجد تحديث", icon: "checkmark-circle", color: "#00B894", desc: "لا يوجد تحديث نشط حالياً" },
  { value: "optional", label: "تحديث اختياري", icon: "arrow-up-circle", color: "#F59E0B", desc: "يظهر بانر قابل للإغلاق للمستخدمين" },
  { value: "mandatory", label: "تحديث إجباري", icon: "warning", color: "#DC2626", desc: "يمنع الوصول حتى يتم التحديث" },
];

// ─── Status Indicator Pill ──────────────────────────────────────────────────
function StatusPill({ label, active, color }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: active ? color + "18" : theme.colors.surface2,
          borderColor: active ? color + "40" : theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          { backgroundColor: active ? color : theme.colors.textTertiary + "60" },
        ]}
      />
      <Text
        style={[
          styles.statusPillText,
          {
            color: active ? color : theme.colors.textTertiary,
            fontFamily: active ? "Tajawal_700Bold" : "Tajawal_500Medium",
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Confirmation Dialog Types ──────────────────────────────────────────────
const CONFIRM_ACTIONS = {
  PLATFORM_OFF: {
    title: "⚠️ إيقاف المنصة",
    message: "سيتم حظر الوصول عن جميع المستخدمين فوراً. هل أنت متأكد؟",
    type: "destructive",
  },
  MAINTENANCE_ON: {
    title: "🔧 تفعيل وضع الصيانة",
    message: "سيتم عرض شاشة الصيانة لجميع المستخدمين. المنصة ستبقى نشطة تقنياً.",
    type: "warning",
  },
  MANDATORY_UPDATE: {
    title: "🚨 تحديث إجباري",
    message: "سيتم حظر جميع المستخدمين الذين لم يحدّثوا التطبيق. هل أنت متأكد؟",
    type: "destructive",
  },
};

export default function DeveloperControls() {
  const theme = useTheme();
  const { isWide, maxContentWidth, contentPadding, listContentBottomPad } =
    useResponsive();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { mode, toggleMode } = useThemeStore();
  const showAlert = useAlertStore((s) => s.showAlert);

  const { controls, isLoading, isSaving, fetchControls, updateControls } =
    usePlatformControlsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // pending confirmation

  // Local form state (synced from controls on load)
  const [platformEnabled, setPlatformEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceNote, setMaintenanceNote] = useState("");
  const [updateType, setUpdateType] = useState(null);
  const [updateNote, setUpdateNote] = useState("");
  const [minAppVersion, setMinAppVersion] = useState("1.0.0");

  // Track if user has unsaved changes
  const [dirty, setDirty] = useState(false);

  // Pulse animation for live indicator
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchControls();
    // Pulse animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== "web" }),
      ])
    ).start();
  }, []);

  // Sync local state from store
  useEffect(() => {
    if (controls) {
      setPlatformEnabled(controls.platform_enabled);
      setMaintenanceMode(controls.maintenance_mode);
      setMaintenanceNote(controls.maintenance_note || "");
      setUpdateType(controls.update_type);
      setUpdateNote(controls.update_note || "");
      setMinAppVersion(controls.min_app_version || "1.0.0");
      setDirty(false);
    }
  }, [controls]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchControls();
    setRefreshing(false);
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handlePlatformToggle = (val) => {
    if (!val) {
      // Turning OFF — needs confirmation
      setConfirmAction({
        ...CONFIRM_ACTIONS.PLATFORM_OFF,
        onConfirm: () => {
          setPlatformEnabled(false);
          setDirty(true);
          setConfirmAction(null);
        },
      });
      return;
    }
    setPlatformEnabled(val);
    setDirty(true);
  };

  const handleMaintenanceToggle = (val) => {
    if (val) {
      setConfirmAction({
        ...CONFIRM_ACTIONS.MAINTENANCE_ON,
        onConfirm: () => {
          setMaintenanceMode(true);
          setDirty(true);
          setConfirmAction(null);
        },
      });
      return;
    }
    setMaintenanceMode(val);
    setDirty(true);
  };

  const handleMaintenanceNoteChange = (text) => {
    setMaintenanceNote(text);
    setDirty(true);
  };

  const handleUpdateTypeChange = (val) => {
    if (val === "mandatory") {
      setConfirmAction({
        ...CONFIRM_ACTIONS.MANDATORY_UPDATE,
        onConfirm: () => {
          setUpdateType("mandatory");
          setDirty(true);
          setConfirmAction(null);
        },
      });
      return;
    }
    setUpdateType(val);
    setDirty(true);
  };

  const handleUpdateNoteChange = (text) => {
    setUpdateNote(text);
    setDirty(true);
  };

  const handleMinVersionChange = (text) => {
    setMinAppVersion(text);
    setDirty(true);
  };

  const handleSaveAll = async () => {
    const result = await updateControls({
      platform_enabled: platformEnabled,
      maintenance_mode: maintenanceMode,
      maintenance_note: maintenanceNote,
      update_type: updateType,
      update_note: updateNote,
      min_app_version: minAppVersion,
    });

    if (result.success) {
      showAlert("success", "تم الحفظ بنجاح", "تم تحديث إعدادات المنصة. التغييرات سارية فوراً.");
      setDirty(false);
    } else {
      showAlert("error", "خطأ في الحفظ", result.error || "حدث خطأ غير متوقع.");
    }
  };

  const handleSignOut = () => setShowLogoutAlert(true);
  const confirmSignOut = async () => {
    setShowLogoutAlert(false);
    await signOut();
  };

  // ─── Format timestamp ─────────────────────────────────────────────────────
  const formatTimestamp = (ts) => {
    if (!ts) return "—";
    try {
      const date = new Date(ts);
      return date.toLocaleDateString("ar-DZ", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader title="لوحة تحكم المطوّر" subtitle="إدارة المنصة والتحديثات" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isWide && {
            maxWidth: maxContentWidth,
            alignSelf: "center",
            width: "100%",
            paddingHorizontal: contentPadding,
            paddingBottom: listContentBottomPad,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Live Status Dashboard ── */}
        <Card
          style={styles.statusCard}
          accentColor={platformEnabled ? "#00B894" : "#DC2626"}
          accentPosition="left"
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIcon,
                {
                  backgroundColor: platformEnabled
                    ? "rgba(0,184,148,0.12)"
                    : "rgba(220,38,38,0.12)",
                },
              ]}
            >
              <Ionicons
                name={platformEnabled ? "pulse" : "power"}
                size={28}
                color={platformEnabled ? "#00B894" : "#DC2626"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.statusTitleRow}>
                <Text
                  style={[styles.statusTitle, { color: theme.colors.text }]}
                >
                  {platformEnabled ? "المنصة تعمل" : "المنصة متوقفة"}
                </Text>
                <Animated.View
                  style={[
                    styles.liveDot,
                    {
                      backgroundColor: platformEnabled ? "#00B894" : "#DC2626",
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.statusSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {maintenanceMode
                  ? "🔧 وضع الصيانة مفعّل"
                  : updateType === "mandatory"
                  ? "⚠️ تحديث إجباري نشط"
                  : updateType === "optional"
                  ? "📦 تحديث اختياري متاح"
                  : "جميع الأنظمة تعمل بشكل طبيعي"}
              </Text>
            </View>
          </View>

          {/* Status Pills */}
          <View style={styles.pillsRow}>
            <StatusPill label="المنصة" active={platformEnabled} color="#00B894" />
            <StatusPill label="الصيانة" active={maintenanceMode} color="#F59E0B" />
            <StatusPill
              label="تحديث"
              active={updateType !== null}
              color={updateType === "mandatory" ? "#DC2626" : "#F59E0B"}
            />
          </View>
        </Card>

        {/* ── Security Badge ── */}
        <Card style={styles.securityBadge}>
          <View style={styles.securityRow}>
            <View style={styles.securityIconBox}>
              <Ionicons name="shield-checkmark" size={20} color="#00B894" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.securityTitle, { color: theme.colors.text }]}>
                حساب مطوّر معزول
              </Text>
              <Text style={[styles.securityDesc, { color: theme.colors.textSecondary }]}>
                {profile?.email} — هذا الدور لا يمكن تسجيله من شاشة التسجيل
              </Text>
            </View>
            <View style={[styles.securityChip, { backgroundColor: "#00B89418" }]}>
              <Text style={styles.securityChipText}>مؤمّن</Text>
            </View>
          </View>
        </Card>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* ── 1. Platform Power Switch ── */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          تشغيل المنصة
        </Text>
        <Card style={styles.controlCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <View
                style={[
                  styles.controlIcon,
                  {
                    backgroundColor: platformEnabled
                      ? "rgba(0,184,148,0.12)"
                      : "rgba(220,38,38,0.12)",
                  },
                ]}
              >
                <Ionicons
                  name="power"
                  size={22}
                  color={platformEnabled ? "#00B894" : "#DC2626"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.controlLabel, { color: theme.colors.text }]}
                >
                  تشغيل / إيقاف المنصة
                </Text>
                <Text
                  style={[
                    styles.controlDesc,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  عند الإيقاف، لن يتمكن أي مستخدم من الوصول للتطبيق
                </Text>
              </View>
            </View>
            <Switch
              value={platformEnabled}
              onValueChange={handlePlatformToggle}
              trackColor={{
                false: theme.isDark ? "#334155" : "#E5E7EB",
                true: "#00B89460",
              }}
              thumbColor={platformEnabled ? "#00B894" : "#94A3B8"}
              ios_backgroundColor={theme.isDark ? "#334155" : "#E5E7EB"}
            />
          </View>

          {/* Warning when platform is OFF */}
          {!platformEnabled && (
            <View style={styles.warningBanner}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.warningText}>
                المنصة متوقفة حالياً — جميع المستخدمين محظورون
              </Text>
            </View>
          )}
        </Card>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* ── 2. Maintenance Mode ── */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, marginTop: spacing.lg },
          ]}
        >
          وضع الصيانة
        </Text>
        <Card style={styles.controlCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <View
                style={[
                  styles.controlIcon,
                  {
                    backgroundColor: maintenanceMode
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(100,116,139,0.12)",
                  },
                ]}
              >
                <Ionicons
                  name="construct"
                  size={22}
                  color={maintenanceMode ? "#F59E0B" : "#64748B"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.controlLabel, { color: theme.colors.text }]}
                >
                  تفعيل وضع الصيانة
                </Text>
                <Text
                  style={[
                    styles.controlDesc,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  يعرض رسالة صيانة لجميع المستخدمين مع إبقاء المنصة تقنياً نشطة
                </Text>
              </View>
            </View>
            <Switch
              value={maintenanceMode}
              onValueChange={handleMaintenanceToggle}
              trackColor={{
                false: theme.isDark ? "#334155" : "#E5E7EB",
                true: "#F59E0B60",
              }}
              thumbColor={maintenanceMode ? "#F59E0B" : "#94A3B8"}
              ios_backgroundColor={theme.isDark ? "#334155" : "#E5E7EB"}
            />
          </View>

          {maintenanceMode && (
            <View style={styles.noteSection}>
              <View style={styles.noteDivider} />
              <Input
                label="رسالة الصيانة (تظهر للمستخدمين)"
                placeholder="مثال: نقوم بتحديث النظام، نعود قريباً..."
                value={maintenanceNote}
                onChangeText={handleMaintenanceNoteChange}
                multiline
                numberOfLines={3}
                icon="chatbubble-ellipses-outline"
              />
            </View>
          )}
        </Card>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* ── 3. Update Management ── */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, marginTop: spacing.lg },
          ]}
        >
          إدارة التحديثات
        </Text>
        <Card style={styles.controlCard}>
          <Text
            style={[
              styles.controlDesc,
              { color: theme.colors.textSecondary, marginBottom: spacing.md },
            ]}
          >
            اختر نوع التحديث لإرساله لجميع مستخدمي التطبيق
          </Text>

          {/* Radio Options */}
          {UPDATE_OPTIONS.map((opt) => {
            const isActive = updateType === opt.value;
            return (
              <TouchableOpacity
                key={String(opt.value)}
                style={[
                  styles.radioOption,
                  {
                    backgroundColor: isActive
                      ? opt.color + "12"
                      : theme.colors.surface2,
                    borderColor: isActive ? opt.color + "40" : theme.colors.border,
                    borderWidth: isActive ? 1.5 : 1,
                  },
                ]}
                onPress={() => handleUpdateTypeChange(opt.value)}
                activeOpacity={0.7}
              >
                <View style={styles.radioRow}>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isActive ? opt.color : theme.colors.textTertiary,
                        backgroundColor: isActive ? opt.color : "transparent",
                      },
                    ]}
                  >
                    {isActive && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View
                    style={[
                      styles.radioIcon,
                      { backgroundColor: opt.color + "15" },
                    ]}
                  >
                    <Ionicons name={opt.icon} size={20} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.radioLabel,
                        {
                          color: isActive ? opt.color : theme.colors.text,
                          fontFamily: isActive
                            ? "Tajawal_700Bold"
                            : "Tajawal_500Medium",
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.radioDesc,
                        { color: theme.colors.textTertiary },
                      ]}
                    >
                      {opt.desc}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Update Note + Min Version */}
          {updateType && (
            <View style={[styles.noteSection, { marginTop: spacing.md }]}>
              <Input
                label="رسالة التحديث (تظهر للمستخدمين)"
                placeholder={
                  updateType === "mandatory"
                    ? "مثال: يرجى تحديث التطبيق للاستمرار في الاستخدام."
                    : "مثال: تتوفر نسخة جديدة بمزايا محسّنة!"
                }
                value={updateNote}
                onChangeText={handleUpdateNoteChange}
                multiline
                numberOfLines={3}
                icon="document-text-outline"
              />

              {updateType === "mandatory" && (
                <View style={{ marginTop: spacing.md }}>
                  <Input
                    label="الحد الأدنى لإصدار التطبيق"
                    placeholder="مثال: 2.0.0"
                    value={minAppVersion}
                    onChangeText={handleMinVersionChange}
                    icon="code-slash-outline"
                    keyboardType="default"
                  />
                  <Text
                    style={[
                      styles.versionHint,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    المستخدمون بإصدار أقدم من هذا سيُطلب منهم التحديث
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* ── Save Button ── */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Button
          title={isSaving ? "جاري الحفظ..." : "حفظ جميع التغييرات"}
          onPress={handleSaveAll}
          loading={isSaving}
          disabled={!dirty || isSaving}
          icon={<Ionicons name="save-outline" size={20} color="#FFFFFF" />}
          style={{ marginTop: spacing.lg }}
        />

        {dirty && (
          <View style={[styles.dirtyBanner, { borderColor: theme.primary + "30" }]}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.primary} />
            <Text
              style={[
                styles.dirtyHint,
                { color: theme.primary },
              ]}
            >
              لديك تغييرات غير محفوظة — اضغط حفظ لتطبيقها فوراً
            </Text>
          </View>
        )}

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* ── Platform Info ── */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, marginTop: spacing.xxl },
          ]}
        >
          معلومات المنصة
        </Text>
        <Card style={styles.infoCard}>
          <InfoRow
            theme={theme}
            icon="time-outline"
            label="آخر تحديث للإعدادات"
            value={formatTimestamp(controls?.updated_at)}
          />
          <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
          <InfoRow
            theme={theme}
            icon="code-slash-outline"
            label="إصدار التطبيق الأدنى"
            value={controls?.min_app_version || "1.0.0"}
          />
          <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
          <InfoRow
            theme={theme}
            icon="person-outline"
            label="البريد الإلكتروني"
            value={profile?.email || "—"}
          />
          <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
          <InfoRow
            theme={theme}
            icon="finger-print-outline"
            label="دور الحساب"
            value="مطوّر (Developer)"
            valueColor="#00B894"
          />
        </Card>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* ── Quick Actions ── */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, marginTop: spacing.xxl },
          ]}
        >
          إجراءات سريعة
        </Text>
        <Card style={styles.actionsCard}>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  borderLeftWidth: 1,
                  borderColor: theme.colors.divider,
                },
              ]}
              onPress={toggleMode}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: theme.primary + "15" }]}>
                <Ionicons
                  name={mode === "dark" ? "sunny-outline" : "moon-outline"}
                  size={22}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                {mode === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={async () => {
                await updateControls({
                  update_type: null,
                  update_note: "",
                });
                showAlert("success", "تم المسح", "تم إلغاء جميع التحديثات النشطة.");
              }}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: "rgba(220,38,38,0.1)" }]}>
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color="#DC2626"
                />
              </View>
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                مسح التحديثات
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderColor: theme.colors.divider,
                },
              ]}
              onPress={async () => {
                await updateControls({
                  maintenance_mode: false,
                  maintenance_note: "",
                });
                showAlert("success", "تم الإنهاء", "تم إيقاف وضع الصيانة.");
              }}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: "rgba(245,158,11,0.1)" }]}>
                <Ionicons name="hammer-outline" size={22} color="#F59E0B" />
              </View>
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                إنهاء الصيانة
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  borderTopWidth: 1,
                  borderColor: theme.colors.divider,
                },
              ]}
              onPress={onRefresh}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: "rgba(99,102,241,0.1)" }]}>
                <Ionicons name="refresh-outline" size={22} color="#6366F1" />
              </View>
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                تحديث البيانات
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Sign Out ── */}
        <SignOutButton onPress={handleSignOut} label="تسجيل الخروج الآمن" />
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Confirmation Dialog ── */}
      <CustomAlert
        visible={!!confirmAction}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        confirmText="تأكيد"
        cancelText="إلغاء"
        type={confirmAction?.type || "warning"}
        onConfirm={() => confirmAction?.onConfirm?.()}
        onCancel={() => setConfirmAction(null)}
      />

      <CustomAlert
        visible={showLogoutAlert}
        title="تسجيل الخروج"
        message="هل أنت متأكد أنك تريد إنهاء الجلسة الحالية؟"
        confirmText="خروج"
        cancelText="إلغاء"
        type="destructive"
        onConfirm={confirmSignOut}
        onCancel={() => setShowLogoutAlert(false)}
      />
    </SafeAreaView>
  );
}

// ─── Info Row Component ─────────────────────────────────────────────────────
function InfoRow({ theme, icon, label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconBox, { backgroundColor: theme.primary + "12" }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
        <Text
          style={[
            styles.infoValue,
            { color: valueColor || theme.colors.text },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },

  // Status card
  statusCard: { marginBottom: spacing.sm },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  statusTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    ...typography.h3,
    fontSize: 18,
  },
  statusSub: {
    ...typography.caption,
    marginTop: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.md,
    flexWrap: "wrap",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 12,
  },

  // Security badge
  securityBadge: {
    marginBottom: spacing.lg,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  securityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0,184,148,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  securityDesc: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  securityChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  securityChipText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 11,
    color: "#00B894",
  },

  // Control cards
  controlCard: {
    marginBottom: spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginEnd: 12,
  },
  controlIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  controlDesc: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 18,
  },

  // Warning banner
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.15)",
  },
  warningText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 12,
    color: "#DC2626",
    flex: 1,
  },

  // Note section
  noteSection: {
    marginTop: spacing.md,
  },
  noteDivider: {
    height: 1,
    backgroundColor: "rgba(128,128,128,0.1)",
    marginBottom: spacing.md,
  },

  // Radio options
  radioOption: {
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  radioIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radioLabel: {
    ...typography.body,
    fontSize: 15,
  },
  radioDesc: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },

  // Version hint
  versionHint: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 4,
    fontFamily: "Tajawal_500Medium",
  },

  // Dirty hint
  dirtyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  dirtyHint: {
    ...typography.caption,
    fontFamily: "Tajawal_700Bold",
    flex: 1,
  },

  // Info card
  infoCard: {
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  infoValue: {
    ...typography.bodyBold,
    fontSize: 14,
    marginTop: 1,
  },
  infoDivider: {
    height: 1,
    opacity: 0.3,
    marginVertical: 4,
  },

  // Actions
  actionsCard: { padding: 0, overflow: "hidden" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap" },
  actionBtn: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    ...typography.body,
    fontSize: 13,
    fontFamily: "Tajawal_700Bold",
  },

  bottomSpacer: { height: 100 },
});
