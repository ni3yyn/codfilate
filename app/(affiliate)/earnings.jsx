import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../../src/hooks/useTheme";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useAffiliateStore } from "../../src/stores/useAffiliateStore";

import UniversalHeader from "../../src/components/ui/UniversalHeader";
import Card from "../../src/components/ui/Card";
import Badge from "../../src/components/ui/Badge";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import StatCard from "../../src/components/ui/StatCard";

import {
  typography,
  spacing,
  borderRadius,
  gradients,
  shadows,
} from "../../src/theme/theme";
import { formatCurrency, formatDate } from "../../src/lib/utils";

export default function EarningsScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;
  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 900 : "100%";
  const numColumns = isDesktop ? 2 : 1;

  const profile = useAuthStore((s) => s.profile);
  const {
    stats,
    commissions,
    fetchAffiliateProfile,
    fetchAffiliateStats,
    fetchCommissions,
    isLoading,
  } = useAffiliateStore();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const storeId = profile?.store_id;
      await fetchAffiliateProfile(storeId);
      await fetchAffiliateStats();
      // Fetch all commissions regardless of store to ensure "new order commission" is seen
      await fetchCommissions(); 
    } catch (e) {
      if (__DEV__) console.warn('[Earnings] loadData error:', e);
    } finally {
      setInitialLoaded(true);
    }
  }, [profile, fetchAffiliateProfile, fetchAffiliateStats, fetchCommissions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalPaid = stats.total_paid || 0;

  const COMMISSION_BADGE = {
    pending: "warning",
    approved: "info",
    paid: "success",
    rejected: "error",
  };

  const COMMISSION_STATUS_AR = {
    pending: "قيد الانتظار",
    approved: "مقبول",
    paid: "مدفوع",
    rejected: "مرفوض",
  };

  const COMMISSION_ICONS = {
    pending: { icon: "time", color: "#FDCB6E", bg: "#FDCB6E15" },
    approved: {
      icon: "checkmark-circle",
      color: "#74B9FF",
      bg: "#74B9FF15",
    },
    paid: { icon: "wallet", color: theme.primary, bg: theme.primary + "15" },
    rejected: {
      icon: "close-circle",
      color: "#FF6B6B",
      bg: "#FF6B6B15",
    },
  };

  // --- RENDER DASHBOARD HERO ---
  const renderDashboardHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <Animated.View style={styles.heroWrapper}>
          <LinearGradient
            colors={gradients.primary}
            style={styles.balanceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardCircle1} />
            <View style={styles.cardCircle2} />

            <View style={styles.balanceHeaderRow}>
              <Ionicons name="trending-up-outline" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.balanceLabel}>إجمالي الأرباح المحققة</Text>
            </View>
            <Text style={styles.balanceValue}>
              {formatCurrency(stats.earnings || 0)}
            </Text>
            <View style={styles.balanceFooter}>
              <Text style={styles.balanceSubtext}>
                 يتم تحديث الرصيد تلقائياً بعد توصيل الطلبيات
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.statsGrid}>
          <StatCard
            title="قيد الانتظار"
            value={formatCurrency(totalPending)}
            icon="time"
            color="#FDCB6E"
            animate
          />
          <StatCard
            title="تم سحبها"
            value={formatCurrency(totalPaid)}
            icon="wallet"
            color={theme.primary}
            animate
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          سجل العمولات
        </Text>
      </View>
    );
  };

  const renderCommission = ({ item }) => {
    const config = COMMISSION_ICONS[item.status] || COMMISSION_ICONS.pending;

    return (
      <Card
        style={[
          styles.commissionCard,
          isDesktop && styles.desktopCommissionCard,
          { borderLeftColor: config.color, borderLeftWidth: 3 }
        ]}
      >
        <View style={styles.commMainRow}>
          <View style={[styles.commIconBox, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>

          <View style={styles.commInfo}>
            <Text
              style={[styles.commType, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {item.orders?.customer_name
                ? `طلب: ${item.orders.customer_name}`
                : "عمولة تسويق"}
            </Text>
            <View style={styles.commMetaRow}>
              <Ionicons name="calendar-outline" size={12} color={theme.colors.textTertiary} />
              <Text style={[styles.commMetaText, { color: theme.colors.textTertiary }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>

          <View style={styles.commValueCol}>
            <Text style={[styles.commAmountText, { color: theme.colors.text }]}>
              {formatCurrency(item.amount)}
            </Text>
            <Badge
              label={COMMISSION_STATUS_AR[item.status] || item.status}
              variant={COMMISSION_BADGE[item.status] || "neutral"}
              size="small"
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <UniversalHeader title="الأرباح" subtitle="ملخص العمولات والأرباح المحققة" />

      <View style={styles.centerWrapper}>
        <FlatList
          key={numColumns}
          data={commissions}
          renderItem={renderCommission}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={isDesktop ? styles.desktopColumnWrapper : null}
          style={styles.flatListBase}
          contentContainerStyle={[styles.contentContainer, { maxWidth: contentMaxWidth }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
          ListHeaderComponent={renderDashboardHeader()}
          ListEmptyComponent={
            !initialLoaded && isLoading ? (
              <LoadingSpinner message="جارٍ تحميل العمولات..." />
            ) : (
              <EmptyState icon="cash-outline" title="لا توجد عمولات بعد" message="ستظهر العمولات الخاصة بك هنا بمجرد إتمام عملائك للطلبات." />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centerWrapper: { flex: 1, alignItems: "center", width: "100%" },
  flatListBase: { flex: 1, width: "100%" },
  contentContainer: { padding: spacing.md, paddingBottom: 100, width: "100%", alignSelf: "center" },
  headerContainer: { width: "100%", marginBottom: spacing.xs },
  heroWrapper: { marginBottom: 12 },
  balanceCard: { padding: 20, borderRadius: 24, overflow: "hidden", ...shadows.md },
  cardCircle1: { position: "absolute", top: -40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.12)" },
  cardCircle2: { position: "absolute", bottom: -60, right: -20, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.06)" },
  balanceHeaderRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 4 },
  balanceLabel: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 13 },
  balanceValue: { color: "#FFFFFF", fontFamily: "Tajawal_800ExtraBold", fontSize: 32, textAlign: "right" },
  balanceFooter: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)" },
  balanceSubtext: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontFamily: "Tajawal_500Medium", textAlign: "right" },
  statsGrid: { flexDirection: "row-reverse", gap: 10, marginBottom: 20 },
  sectionTitle: { ...typography.bodyBold, fontSize: 18, marginBottom: 12, textAlign: "right" },
  desktopColumnWrapper: { gap: spacing.md, flexDirection: "row-reverse" },
  commissionCard: { padding: 16, marginBottom: 10, borderRadius: 20, borderVariant: 'none', shadowOpacity: 0.04, borderWidth: 1, borderColor: '#F1F5F9' },
  desktopCommissionCard: { flex: 1 },
  commMainRow: { flexDirection: "row-reverse", alignItems: "center", width: "100%" },
  commIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginStart: 12 },
  commInfo: { flex: 1, alignItems: "flex-end" },
  commType: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 4 },
  commMetaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  commMetaText: { fontSize: 11, fontFamily: "Tajawal_500Medium" },
  commValueCol: { alignItems: "flex-start", minWidth: 100 },
  commAmountText: { fontFamily: "Tajawal_800ExtraBold", fontSize: 17, marginBottom: 4 },
});

