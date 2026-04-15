import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/hooks/useTheme";
import { useResponsive } from "../../src/hooks/useResponsive";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useThemeStore } from "../../src/stores/useThemeStore";
import { supabase } from "../../src/lib/supabase";
import StatCard from "../../src/components/ui/StatCard";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import CustomAlert from "../../src/components/ui/CustomAlert";
import { typography, spacing, borderRadius } from "../../src/theme/theme";
import { formatCurrency } from "../../src/lib/utils";

export default function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { isWide, maxContentWidth, contentPadding, listContentBottomPad } =
    useResponsive();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { mode, toggleMode } = useThemeStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [stats, setStats] = useState({
    stores: 0,
    activeStores: 0,
    users: 0,
    merchants: 0,
    affiliates: 0,
    regionalManagers: 0,
    orders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    returnedOrders: 0,
    cancelledOrders: 0,
    inTransitOrders: 0,
    revenue: 0,
    deliveredRevenue: 0,
    platformFees: 0,
    todayOrders: 0,
    todayRevenue: 0,
    monthRevenue: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      const [storesRes, ordersRes, usersRes, metricsRes] = await Promise.all([
        supabase.from("stores").select("id, is_active"),
        supabase.from("orders").select("total, status, created_at"),
        supabase.from("profiles").select("id, role"),
        supabase.rpc("get_admin_platform_metrics"),
      ]);

      const m = metricsRes.data;
      const stores = storesRes.data || [];
      const orders = ordersRes.data || [];
      const users = usersRes.data || [];

      const today = new Date().toISOString().split("T")[0];
      const thisMonth = new Date().toISOString().slice(0, 7);
      const deliveredOrders = orders.filter((o) => o.status === "delivered");

      setStats({
        stores: stores.length,
        activeStores: stores.filter((s) => s.is_active).length,
        users: users.length,
        merchants: users.filter((u) => u.role === "merchant").length,
        affiliates: users.filter((u) => u.role === "affiliate").length,
        regionalManagers: users.filter((u) => u.role === "regional_manager")
          .length,
        orders: m?.order_count != null ? Number(m.order_count) : orders.length,
        pendingOrders: orders.filter((o) => o.status === "pending").length,
        deliveredOrders: deliveredOrders.length,
        returnedOrders: orders.filter((o) => o.status === "returned").length,
        cancelledOrders: orders.filter((o) => o.status === "cancelled").length,
        inTransitOrders: orders.filter((o) => o.status === "in_transit").length,
        revenue:
          m?.gmv_total != null
            ? Number(m.gmv_total)
            : orders.reduce((s, o) => s + Number(o.total), 0),
        deliveredRevenue: deliveredOrders.reduce(
          (s, o) => s + Number(o.total),
          0,
        ),
        platformFees:
          m?.platform_fees_collected != null
            ? Number(m.platform_fees_collected)
            : 0,
        todayOrders: orders.filter((o) => o.created_at?.startsWith(today))
          .length,
        todayRevenue: orders
          .filter((o) => o.created_at?.startsWith(today))
          .reduce((s, o) => s + Number(o.total), 0),
        monthRevenue: orders
          .filter((o) => o.created_at?.startsWith(thisMonth))
          .reduce((s, o) => s + Number(o.total), 0),
      });
    } catch (err) {
      if (__DEV__) console.error("Stats error:", err);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleSignOut = () => setShowLogoutAlert(true);
  const confirmSignOut = async () => {
    setShowLogoutAlert(false);
    await signOut();
    // Root layout auth guard handles redirect reactively
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader title="لوحة التحكم الرئيسية" />
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
        {/* Today's Highlights */}
        <Card
          style={styles.todayCard}
          accentColor={theme.primary}
          accentPosition="left"
        >
          <View style={styles.todayRow}>
            <View
              style={[
                styles.todayIcon,
                { backgroundColor: theme.primary + "15" },
              ]}
            >
              <Ionicons name="today" size={24} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.todayLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                📅 إحصائيات اليوم
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  marginTop: 4,
                }}
              >
                <View>
                  <Text
                    style={[styles.todayValue, { color: theme.colors.text }]}
                  >
                    {stats.todayOrders}
                  </Text>
                  <Text
                    style={[
                      styles.todayMeta,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    طلب
                  </Text>
                </View>
                <View
                  style={{
                    width: 1,
                    height: 28,
                    backgroundColor: theme.colors.divider,
                  }}
                />
                <View>
                  <Text style={[styles.todayValue, { color: theme.primary }]}>
                    {formatCurrency(stats.todayRevenue)}
                  </Text>
                  <Text
                    style={[
                      styles.todayMeta,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    إيرادات
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Platform Overview */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          نظرة عامة على المنصة
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="إجمالي الطلبات"
            value={String(stats.orders)}
            icon="receipt"
            color="#FDCB6E"
            subtitle={`${stats.pendingOrders} قيد الانتظار`}
          />
          <StatCard
            title="حجم المبيعات"
            value={formatCurrency(stats.revenue)}
            icon="stats-chart"
            color="#00B894"
            subtitle={`هذا الشهر: ${formatCurrency(stats.monthRevenue)}`}
          />
          <StatCard
            title="تم التوصيل"
            value={String(stats.deliveredOrders)}
            icon="checkmark-done-circle"
            color="#2D6A4F"
            subtitle={formatCurrency(stats.deliveredRevenue)}
          />
          <StatCard
            title="قيد التوصيل"
            value={String(stats.inTransitOrders)}
            icon="car"
            color="#0984E3"
            subtitle={`${stats.returnedOrders} مرتجع · ${stats.cancelledOrders} ملغى`}
          />
        </View>

        {/* Revenue Card */}
        <Card
          style={styles.revenueCard}
          accentColor="#A29BFE"
          accentPosition="left"
        >
          <View style={styles.revenueRow}>
            <View style={styles.revenueInfo}>
              <Text style={styles.revenueLabel}>رسوم المنصة المحصّلة</Text>
              <Text style={[styles.revenueValue, { color: theme.colors.text }]}>
                {formatCurrency(stats.platformFees)}
              </Text>
            </View>
            <View
              style={[styles.revenueIcon, { backgroundColor: "#A29BFE20" }]}
            >
              <Ionicons name="wallet-outline" size={24} color="#A29BFE" />
            </View>
          </View>
        </Card>

        {/* Users Overview */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, marginTop: spacing.lg },
          ]}
        >
          المستخدمين
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="المتاجر"
            value={String(stats.stores)}
            icon="business"
            color={theme.primary}
            subtitle={`${stats.activeStores} نشط`}
          />
          <StatCard
            title="إجمالي المستخدمين"
            value={String(stats.users)}
            icon="people"
            color="#6C5CE7"
            subtitle={`${stats.merchants} تاجر`}
          />
          <StatCard
            title="المسوقين"
            value={String(stats.affiliates)}
            icon="megaphone"
            color="#00CEC9"
          />
          <StatCard
            title="المدراء الإقليميين"
            value={String(stats.regionalManagers)}
            icon="shield-checkmark"
            color="#E17055"
          />
        </View>

        {/* Quick Actions */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, marginTop: spacing.lg },
          ]}
        >
          إدارة النظام
        </Text>
        <Card style={styles.actionsCard}>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  borderRightWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: theme.colors.divider,
                },
              ]}
              onPress={() => router.push("/(admin)/pending-merchants")}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color={theme.primary}
              />
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                قبول التجار
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { borderBottomWidth: 1, borderColor: theme.colors.divider },
              ]}
              onPress={() => router.push("/(admin)/add-regional-manager")}
            >
              <Ionicons
                name="person-add-outline"
                size={24}
                color={theme.primary}
              />
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                المدراء
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { borderRightWidth: 1, borderColor: theme.colors.divider },
              ]}
              onPress={() => router.push("/(admin)/stores")}
            >
              <Ionicons
                name="storefront-outline"
                size={24}
                color={theme.primary}
              />
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                كل المتاجر
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={toggleMode}>
              <Ionicons
                name={mode === "dark" ? "sunny-outline" : "moon-outline"}
                size={24}
                color={theme.primary}
              />
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                المظهر
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Button
          title="تسجيل الخروج الآمن"
          variant="secondary"
          onPress={handleSignOut}
          style={styles.signOutBtn}
          textStyle={{ color: theme.error }}
          icon={
            <Ionicons name="log-out-outline" size={20} color={theme.error} />
          }
        />
        <View style={styles.bottomSpacer} />
      </ScrollView>

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

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  todayCard: { marginBottom: spacing.lg },
  todayRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  todayIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  todayLabel: { ...typography.caption, fontFamily: "Tajawal_700Bold" },
  todayValue: { ...typography.h2, fontSize: 22 },
  todayMeta: { ...typography.small, fontSize: 11 },
  revenueCard: { marginVertical: spacing.sm },
  revenueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  revenueInfo: { flex: 1 },
  revenueLabel: { ...typography.caption, marginBottom: 4 },
  revenueValue: { ...typography.h2, fontSize: 22 },
  revenueIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsCard: { padding: 0, overflow: "hidden" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap" },
  actionBtn: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionLabel: {
    ...typography.body,
    fontSize: 14,
    fontFamily: "Tajawal_700Bold",
  },
  signOutBtn: {
    marginTop: spacing.xxl,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderColor: "rgba(220, 38, 38, 0.12)",
    borderWidth: 1,
  },
  bottomSpacer: { height: 100 },
});
