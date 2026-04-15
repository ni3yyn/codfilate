import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  Platform,
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

/**
 * Premium Earnings Screen — Refined layout with overflow protection and strict RTL.
 */
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

  const loadData = useCallback(async () => {
    const storeId = profile?.store_id;
    await Promise.all([
      fetchAffiliateProfile(storeId),
      fetchAffiliateStats(),
      fetchCommissions(storeId),
    ]);
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
    const TotalEarningsCard = (
      <LinearGradient
        colors={gradients.primary}
        style={[styles.balanceCard, isDesktop && styles.desktopBalanceCard]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardCircle1} />
        <View style={styles.cardCircle2} />

        <View style={styles.balanceHeaderRow}>
          <Ionicons
            name="trending-up-outline"
            size={20}
            color="rgba(255,255,255,0.9)"
          />
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
    );

    const statsGrid = (
      <View style={isDesktop ? styles.desktopStatsGrid : styles.mobileStatsRow}>
        <StatCard
          title="قيد الانتظار"
          value={formatCurrency(totalPending)}
          icon="time"
          color="#FDCB6E"
          subtitle="عمولات معلقة"
        />
        <StatCard
          title="تم سحبها"
          value={formatCurrency(totalPaid)}
          icon="wallet"
          color={theme.primary}
          subtitle="مدفوعات مستلمة"
        />
      </View>
    );

    if (isDesktop) {
      return (
        <View style={styles.desktopHeroRow}>
          {TotalEarningsCard}
          <View style={{ flex: 1 }}>{statsGrid}</View>
        </View>
      );
    }

    return (
      <View style={styles.mobileHeroContainer}>
        {TotalEarningsCard}
        {statsGrid}
      </View>
    );
  };

  // --- RENDER COMMISSION LIST ITEM ---
  const renderCommission = ({ item }) => {
    const config = COMMISSION_ICONS[item.status] || COMMISSION_ICONS.pending;

    return (
      <Card
        style={[
          styles.commissionCard,
          isDesktop && styles.desktopCommissionCard,
          { borderRightColor: config.color, borderRightWidth: 3 }
        ]}
      >
        <View style={styles.commMainRow}>
          {/* Status Icon Pillar */}
          <View style={[styles.commIconBox, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>

          {/* Central Info Column (RTL Flex-Grow) */}
          <View style={styles.commInfo}>
            <Text
              style={[styles.commType, { color: theme.colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.orders?.customer_name
                ? `طلب من: ${item.orders.customer_name}`
                : "عمولة تسويق منصة"}
            </Text>
            <View style={styles.commMetaRow}>
              <Ionicons name="calendar-outline" size={12} color={theme.colors.textTertiary} />
              <Text style={[styles.commMetaText, { color: theme.colors.textTertiary }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>

          {/* Value Column (Left Side Anchor) */}
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
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="الأرباح"
        subtitle="ملخص العمولات والأرباح المحققة"
      />

      <View style={styles.centerWrapper}>
        <FlatList
          key={numColumns}
          data={commissions}
          renderItem={renderCommission}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={isDesktop ? styles.desktopColumnWrapper : null}
          style={styles.flatListBase}
          contentContainerStyle={[
            styles.contentContainer,
            { maxWidth: contentMaxWidth },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            <>
              {renderDashboardHeader()}
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                سجل العمولات
              </Text>
            </>
          }
          ListEmptyComponent={
            isLoading && commissions.length === 0 ? (
              <LoadingSpinner message="جارٍ تحميل العمولات..." />
            ) : (
              <EmptyState
                icon="cash-outline"
                title="لا توجد عمولات بعد"
                message="ستظهر العمولات الخاصة بك هنا بمجرد إتمام عملائك للطلبات."
              />
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
  contentContainer: {
    padding: spacing.md,
    paddingBottom: 120,
    width: "100%",
    alignSelf: "center",
  },

  // --- HERO SECTION ---
  desktopHeroRow: {
    flexDirection: "row-reverse",
    gap: spacing.lg,
    marginBottom: spacing.xl,
    width: "100%",
  },
  mobileHeroContainer: { width: "100%", marginBottom: spacing.lg },
  desktopBalanceCard: { flex: 1.5, marginBottom: 0 },
  desktopStatsGrid: { flex: 1, gap: spacing.md },
  mobileStatsRow: { 
    flexDirection: "row-reverse", 
    gap: spacing.sm, 
    marginTop: spacing.sm,
    width: "100%",
  },

  balanceCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  cardCircle1: {
    position: "absolute",
    top: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  cardCircle2: {
    position: "absolute",
    bottom: -60,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  balanceHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Tajawal_700Bold",
    fontSize: 14,
  },
  balanceValue: {
    color: "#FFFFFF",
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 34,
    textAlign: "right",
    letterSpacing: -0.5,
  },
  balanceFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  balanceSubtext: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontFamily: "Tajawal_500Medium",
    textAlign: "right",
  },

  // --- COMMISSION CARDS ---
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    marginVertical: spacing.md,
    textAlign: "right",
  },
  desktopColumnWrapper: { gap: spacing.lg, flexDirection: "row-reverse" },
  commissionCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    ...shadows.sm,
  },
  desktopCommissionCard: { flex: 1 },
  
  commMainRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    width: "100%",
  },
  commIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginStart: spacing.md,
  },
  commInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  commType: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
    marginBottom: 4,
  },
  commMetaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  commMetaText: {
    fontSize: 11,
    fontFamily: "Tajawal_500Medium",
  },
  commValueCol: {
    alignItems: "flex-start",
    minWidth: 90,
  },
  commAmountText: {
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 16,
    marginBottom: 4,
  },
});
