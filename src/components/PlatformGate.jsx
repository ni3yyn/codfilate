import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../stores/useAuthStore";
import { usePlatformControlsStore } from "../stores/usePlatformControlsStore";
import { typography, spacing, borderRadius } from "../theme/theme";

/**
 * PlatformGate — Overlay component placed at root level.
 * Renders blocking full-screen overlays when:
 *  - Platform is disabled
 *  - Maintenance mode is active
 *  - A mandatory update is required
 *  - An optional update is available (dismissible banner)
 *
 * Developer role bypasses all gates.
 * Renders nothing when everything is normal.
 */
export default function PlatformGate() {
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { controls, fetchControls, subscribe, unsubscribe } =
    usePlatformControlsStore();

  const [optionalDismissed, setOptionalDismissed] = useState(false);
  const bannerAnim = React.useRef(new Animated.Value(0)).current;

  // Fetch controls and subscribe on mount
  useEffect(() => {
    fetchControls();
    subscribe();
    return () => unsubscribe();
  }, []);

  // Animate optional update banner
  useEffect(() => {
    if (
      controls?.update_type === "optional" &&
      !optionalDismissed &&
      isAuthenticated &&
      profile?.role !== "developer"
    ) {
      Animated.spring(bannerAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else {
      bannerAnim.setValue(0);
    }
  }, [controls?.update_type, optionalDismissed, isAuthenticated, profile?.role]);

  // Developer bypasses everything
  if (profile?.role === "developer") return null;

  // Only gate authenticated users (let auth screens load normally)
  if (!isAuthenticated || !controls) return null;

  // ── GATE 1: Platform Disabled ────────────────────────────────────────────
  if (controls.platform_enabled === false) {
    return (
      <GateOverlay
        icon="power"
        iconColor="#DC2626"
        bgColor="#1A0A0A"
        accentColor="#DC2626"
        title="المنصة متوقفة مؤقتاً"
        message="تم إيقاف المنصة من قبل الإدارة. نعتذر عن الإزعاج ونعمل على إعادة الخدمة في أقرب وقت."
      />
    );
  }

  // ── GATE 2: Maintenance Mode ─────────────────────────────────────────────
  if (controls.maintenance_mode === true) {
    return (
      <GateOverlay
        icon="construct"
        iconColor="#F59E0B"
        bgColor="#0B1120"
        accentColor="#F59E0B"
        title="🔧 صيانة مجدولة"
        message={
          controls.maintenance_note ||
          "نقوم حالياً بإجراء تحسينات على النظام. يرجى المحاولة لاحقاً."
        }
      />
    );
  }

  // ── GATE 3: Mandatory Update ─────────────────────────────────────────────
  if (controls.update_type === "mandatory") {
    return (
      <GateOverlay
        icon="warning"
        iconColor="#DC2626"
        bgColor="#0B1120"
        accentColor="#DC2626"
        title="⚠️ تحديث إجباري مطلوب"
        message={
          controls.update_note ||
          "يرجى تحديث التطبيق إلى أحدث إصدار للاستمرار في الاستخدام."
        }
        showUpdateButton
      />
    );
  }

  // ── BANNER: Optional Update (dismissible) ────────────────────────────────
  if (controls.update_type === "optional" && !optionalDismissed) {
    return (
      <Animated.View
        style={[
          styles.optionalBanner,
          {
            opacity: bannerAnim,
            transform: [
              {
                translateY: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerIconBox}>
            <Ionicons name="arrow-up-circle" size={24} color="#F59E0B" />
          </View>
          <View style={styles.bannerTextBox}>
            <Text style={styles.bannerTitle}>تحديث جديد متاح 📦</Text>
            <Text style={styles.bannerMessage} numberOfLines={2}>
              {controls.update_note || "تتوفر نسخة جديدة بمزايا محسّنة!"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setOptionalDismissed(true);
              Animated.timing(bannerAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: Platform.OS !== "web",
              }).start();
            }}
            style={styles.bannerClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // Nothing to show
  return null;
}

// ─── Full-Screen Gate Overlay ────────────────────────────────────────────────
function GateOverlay({
  icon,
  iconColor,
  bgColor,
  accentColor,
  title,
  message,
  showUpdateButton = false,
}) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.gateContainer, { backgroundColor: bgColor }]}>
      <View style={[styles.gateCard, { borderColor: accentColor + "30" }]}>
        {/* Pulsing Icon */}
        <Animated.View
          style={[
            styles.gateIconCircle,
            {
              backgroundColor: accentColor + "15",
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Ionicons name={icon} size={48} color={iconColor} />
        </Animated.View>

        <Text style={styles.gateTitle}>{title}</Text>
        <Text style={styles.gateMessage}>{message}</Text>

        {showUpdateButton && (
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: accentColor }]}
            onPress={() => {
              if (Platform.OS === "android") {
                Linking.openURL(
                  "market://details?id=com.yourapp"
                ).catch(() =>
                  Linking.openURL(
                    "https://play.google.com/store/apps/details?id=com.yourapp"
                  )
                );
              } else if (Platform.OS === "ios") {
                Linking.openURL(
                  "itms-apps://apps.apple.com/app/idYOUR_APP_ID"
                );
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.updateBtnText}>تحديث التطبيق</Text>
          </TouchableOpacity>
        )}

        {/* Decorative dots */}
        <View style={styles.dotsRow}>
          <View
            style={[styles.dot, { backgroundColor: accentColor + "40" }]}
          />
          <View style={[styles.dot, { backgroundColor: accentColor }]} />
          <View
            style={[styles.dot, { backgroundColor: accentColor + "40" }]}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Gate overlay — covers everything
  gateContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 9999,
  },
  gateCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(19, 19, 43, 0.95)",
    borderRadius: 28,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
  },
  gateIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  gateTitle: {
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 22,
    color: "#F0F0FF",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  gateMessage: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 15,
    color: "#9CA3C0",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    marginBottom: 16,
  },
  updateBtnText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Optional update banner — floats at bottom
  optionalBanner: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 20 : 100,
    left: 16,
    right: 16,
    zIndex: 9998,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(19, 19, 43, 0.95)",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      web: { boxShadow: "0 8px 32px rgba(0,0,0,0.3)" },
    }),
  },
  bannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextBox: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 14,
    color: "#F0F0FF",
  },
  bannerMessage: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    color: "#9CA3C0",
    marginTop: 2,
  },
  bannerClose: {
    padding: 4,
  },
});
