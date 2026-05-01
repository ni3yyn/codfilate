import React, { useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { getEffectiveWilayaIds } from "../../src/lib/profileUtils";
import { useRegionalManagerStore } from "../../src/stores/useRegionalManagerStore";
import StatCard from "../../src/components/ui/StatCard";
import Card from "../../src/components/ui/Card";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import { typography, spacing, borderRadius } from "../../src/theme/theme";
import { formatCurrency, formatRelativeTime } from "../../src/lib/utils";
import { REGIONAL_MANAGER_FEE } from "../../src/lib/constants";
import { useResponsive } from "../../src/hooks/useResponsive";

/**
 * Premium Regional Manager Dashboard.
 * Forest/Mint theme, solid surfaces, responsive layout.
 */
export default function RegionalManagerDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { isWide, maxContentWidth, contentPadding, listContentBottomPad } =
    useResponsive();
  const profile = useAuthStore((s) => s.profile);
  const { stats, fetchManagerStats, isLoading, fetchWilayaOrders, orders } =
    useRegionalManagerStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const wilayaIds = useMemo(() => getEffectiveWilayaIds(profile), [profile]);

  const loadData = useCallback(async () => {
    const ids = wilayaIds.length > 0 ? wilayaIds : null;
    await Promise.all([
      fetchManagerStats(ids || []),
      fetchWilayaOrders(ids, "pending"),
    ]);
  }, [wilayaIds, fetchManagerStats, fetchWilayaOrders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <>
        <UniversalHeader
          title="الرئيسية"
          subtitle={`${wilayaIds.length} ولاية موكلة`}
        />

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
          {/* Hero Earnings Section */}
          <Animated.View style={styles.heroSection}>
            <Card style={[styles.heroCard, { backgroundColor: theme.primary }]}>
              <View style={styles.heroContent}>
                <View style={styles.heroText}>
                  <Text style={styles.heroLabel}>أرباح الشهر المتراكمة</Text>
                  <Text style={styles.heroValue}>
                    {formatCurrency(stats.monthlyEarnings)}
                  </Text>
                  <View style={styles.heroTrend}>
                    <Ionicons name="stats-chart" size={14} color="#FFFFFF" />
                    <Text style={styles.heroTrendText}>
                      العمولة: {formatCurrency(REGIONAL_MANAGER_FEE)} / طلب
                    </Text>
                  </View>
                </View>
                <View style={styles.heroIconBox}>
                  <Ionicons
                    name="wallet"
                    size={32}
                    color="rgba(255,255,255,0.3)"
                  />
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Primary Metrics Grid */}
          <View style={styles.gridContainer}>
            <StatCard
              title="طلبات معلقة"
              value={String(stats.pendingOrders)}
              icon="time"
              color="#FDCB6E"
              animate
            />
            <StatCard
              title="مؤكدة اليوم"
              value={String(stats.confirmedToday)}
              icon="checkmark-circle"
              color={theme.primary}
              animate
            />
            <StatCard
              title="توصيل اليوم"
              value={String(stats.deliveredToday)}
              icon="airplane"
              color="#2D6A4F"
              animate
            />
            <StatCard
              title="قيد التوصيل"
              value={String(stats.inTransit)}
              icon="car"
              color="#0984E3"
              animate
            />
          </View>

          {/* Cash & Logistics Ribbon */}
          <View style={styles.ribbonContainer}>
            <View style={styles.ribbon}>
              <View style={styles.ribbonItem}>
                <Text style={[styles.ribbonLabel, { color: "#64748B" }]}>
                  COD محصّل
                </Text>
                <Text style={[styles.ribbonVal, { color: "#2D6A4F" }]}>
                  {stats.codCollected}
                </Text>
              </View>
              <View style={styles.ribbonDivider} />
              <View style={styles.ribbonItem}>
                <Text style={[styles.ribbonLabel, { color: "#64748B" }]}>
                  COD عالق
                </Text>
                <Text style={[styles.ribbonVal, { color: "#E17055" }]}>
                  {stats.codUncollected}
                </Text>
              </View>
              <View style={styles.ribbonDivider} />
              <View style={styles.ribbonItem}>
                <Text style={[styles.ribbonLabel, { color: "#64748B" }]}>
                  مرتجعة
                </Text>
                <Text style={[styles.ribbonVal, { color: "#D63031" }]}>
                  {stats.returnedOrders}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Center - Bento Style */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              مركز العمليات
            </Text>
          </View>
          <View style={styles.actionBento}>
            <TouchableOpacity
              style={[styles.bentoBox, { backgroundColor: "#FFFFFF" }]}
              onPress={() => router.push("/(regional_manager)/deliveries")}
            >
              <View
                style={[
                  styles.bentoIcon,
                  { backgroundColor: theme.primary + "10" },
                ]}
              >
                <Ionicons name="car" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.bentoTitle, { color: theme.colors.text }]}>
                إدارة التوصيلات
              </Text>
              <Text
                style={[
                  styles.bentoSubtitle,
                  { color: theme.colors.textTertiary },
                ]}
              >
                التحكم في المسارات
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bentoBox, { backgroundColor: "#FFFFFF" }]}
              onPress={() => router.push("/(regional_manager)/merchants")}
            >
              <View style={[styles.bentoIcon, { backgroundColor: "#6C5CE710" }]}>
                <Ionicons name="people" size={20} color="#6C5CE7" />
              </View>
              <Text style={[styles.bentoTitle, { color: theme.colors.text }]}>
                التجار النشطين
              </Text>
              <Text
                style={[
                  styles.bentoSubtitle,
                  { color: theme.colors.textTertiary },
                ]}
              >
                إدارة الشركاء
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pending Activity Feed */}
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text, marginBottom: 0 },
              ]}
            >
              طلبات بانتظار المراجعة
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(regional_manager)/orders")}
            >
              <Text style={[styles.viewAll, { color: theme.primary }]}>
                عرض الكل
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityFeed}>
            {pendingOrders.length === 0 ? (
              <View style={styles.emptyActivity}>
                <Ionicons
                  name="checkmark-done"
                  size={32}
                  color={theme.colors.textTertiary}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  لا توجد طلبات معلقة حالياً.
                </Text>
              </View>
            ) : (
              pendingOrders.slice(0, 5).map((order, idx) => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() =>
                    router.push(`/(regional_manager)/orders?id=${order.id}`)
                  }
                  style={[
                    styles.activityItem,
                    idx === Math.min(pendingOrders.length, 5) - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: "#FDCB6E15" },
                    ]}
                  >
                    <Ionicons name="hourglass" size={18} color="#FDCB6E" />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text
                        style={[styles.activityUser, { color: theme.colors.text }]}
                        numberOfLines={1}
                      >
                        {order.customer_name}
                      </Text>
                      <Text
                        style={[
                          styles.activityPrice,
                          { color: theme.primary },
                        ]}
                      >
                        {formatCurrency(order.total)}
                      </Text>
                    </View>
                    <View style={styles.activityFooter}>
                      <Text
                        style={[
                          styles.activityLoc,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {order.wilaya} · {order.commune}
                      </Text>
                      <Text
                        style={[
                          styles.activityTime,
                          { color: theme.colors.textTertiary },
                        ]}
                      >
                        {formatRelativeTime(order.created_at)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.md, paddingTop: spacing.sm },
  heroSection: { marginBottom: 12 },
  heroCard: { padding: 22, borderRadius: 24, borderVariant: 'none', shadowOpacity: 0.12 },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroText: { flex: 1 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  heroValue: { color: '#FFFFFF', fontSize: 30, fontFamily: 'Tajawal_800ExtraBold', marginTop: 4 },
  heroTrend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  heroTrendText: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  heroIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  ribbonContainer: { marginBottom: 15 },
  ribbon: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 18, alignItems: 'center', shadowOpacity: 0.04, borderWidth: 1, borderColor: '#F1F5F9' },
  ribbonItem: { flex: 1, alignItems: 'center', gap: 2 },
  ribbonDivider: { width: 1, height: 28, backgroundColor: '#F1F5F9' },
  ribbonVal: { fontSize: 18, fontFamily: 'Tajawal_800ExtraBold' },
  ribbonLabel: { fontSize: 10, fontFamily: 'Tajawal_700Bold', marginBottom: 2 },
  sectionTitle: { ...typography.bodyBold, fontSize: 18, marginBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 12 },
  viewAll: { ...typography.small, fontFamily: 'Tajawal_700Bold' },
  actionBento: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  bentoBox: { flex: 1, padding: 16, borderRadius: 20, shadowOpacity: 0.03, borderWidth: 1, borderColor: '#F1F5F9' },
  bentoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  bentoTitle: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  bentoSubtitle: { fontSize: 11, fontFamily: 'Tajawal_500Medium', marginTop: 2 },
  activityFeed: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 4, shadowOpacity: 0.04, borderWidth: 1, borderColor: '#F1F5F9' },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  activityIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activityContent: { flex: 1 },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityUser: { fontSize: 15, fontFamily: 'Tajawal_700Bold', flex: 1, marginEnd: 10 },
  activityPrice: { fontSize: 15, fontFamily: 'Tajawal_800ExtraBold' },
  activityFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  activityLoc: { fontSize: 11, fontFamily: 'Tajawal_500Medium', flex: 1 },
  activityTime: { fontSize: 11, fontFamily: 'Tajawal_400Regular' },
  emptyActivity: { padding: 40, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  bottomSpacer: { height: 60 },
  actionText: {
    flex: 1,
    ...typography.bodyBold,
    fontSize: 16,
  },
});
