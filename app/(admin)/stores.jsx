import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { useStoreStore } from "../../src/stores/useStoreStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import { supabase } from "../../src/lib/supabase";
import Card from "../../src/components/ui/Card";
import Badge from "../../src/components/ui/Badge";
import Avatar from "../../src/components/ui/Avatar";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import Button from "../../src/components/ui/Button";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import {
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../../src/theme/theme";
import { formatCurrency, formatCompactNumber } from "../../src/lib/utils";

export default function AdminStores() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { stores, isLoading, fetchAllStoresAdmin, toggleStoreStatus } =
    useStoreStore();
  const { showAlert, showConfirm } = useAlertStore();

  const isDesktop = width > 1100;
  const isTablet = width > 700;
  const numColumns = isDesktop ? 4 : isTablet ? 2 : 1;

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedStore, setExpandedStore] = useState(null);
  const [storeStats, setStoreStats] = useState({});
  const [filter, setFilter] = useState("all");

  const loadData = useCallback(async () => {
    await fetchAllStoresAdmin();
    try {
      const [
        { data: orderData },
        { data: productData },
        { data: affiliateData },
      ] = await Promise.all([
        supabase.from("orders").select("store_id, total, status"),
        supabase.from("products").select("store_id, id").eq("is_active", true),
        supabase.from("affiliates").select("store_id, id"),
      ]);

      const stats = {};
      const process = (data, key) => {
        data?.forEach((item) => {
          if (!stats[item.store_id])
            stats[item.store_id] = {
              orders: 0,
              revenue: 0,
              products: 0,
              affiliates: 0,
            };
          if (key === "revenue") {
            stats[item.store_id].revenue += Number(item.total || 0);
            stats[item.store_id].orders++;
          } else {
            stats[item.store_id][key]++;
          }
        });
      };

      process(orderData, "revenue");
      process(productData, "products");
      process(affiliateData, "affiliates");
      setStoreStats(stats);
    } catch (err) {
      if (__DEV__) console.error("Stats error:", err);
    }
  }, [fetchAllStoresAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleStatus = (store) => {
    const newStatus = !store.is_active;
    showConfirm({
      title: newStatus ? "تفعيل المتجر" : "تعطيل المتجر",
      message: `هل أنت متأكد من ${newStatus ? "تفعيل" : "تعطيل"} "${store.name}"؟`,
      confirmText: "تأكيد",
      type: newStatus ? "success" : "destructive",
      onConfirm: async () => {
        const result = await toggleStoreStatus(store.id, newStatus);
        if (!result.success)
          showAlert({ title: "خطأ", message: result.error, type: "error" });
        else
          showAlert({
            title: "تم",
            message: `تم ${newStatus ? "تفعيل" : "تعطيل"} المتجر بنجاح.`,
            type: "success",
          });
      },
    });
  };

  const filteredStores = useMemo(
    () =>
      stores.filter((s) => {
        const matchesSearch =
          !search || s.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter =
          filter === "all" ||
          (filter === "active" ? s.is_active : !s.is_active);
        return matchesSearch && matchesFilter;
      }),
    [stores, search, filter],
  );

  const platformStats = useMemo(() => {
    const active = stores.filter((s) => s.is_active).length;
    const totalRev = Object.values(storeStats).reduce(
      (sum, s) => sum + s.revenue,
      0,
    );
    return { total: stores.length, active, revenue: totalRev };
  }, [stores, storeStats]);

  const FILTERS = [
    { key: "all", label: "الكل" },
    { key: "active", label: "نشط" },
    { key: "inactive", label: "معطل" },
  ];

  const SummaryHeader = () => (
    <View style={styles.summaryContainer}>
      <Card style={styles.summaryCard}>
        <Text
          style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}
        >
          إجمالي المتاجر
        </Text>
        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
          {platformStats.total}
        </Text>
      </Card>
      <Card style={styles.summaryCard}>
        <Text
          style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}
        >
          المتاجر النشطة
        </Text>
        <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
          {platformStats.active}
        </Text>
      </Card>
      <Card style={[styles.summaryCard, { flex: 1.5 }]}>
        <Text
          style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}
        >
          إجمالي المبيعات
        </Text>
        <Text style={[styles.summaryValue, { color: theme.primary }]}>
          {formatCompactNumber(platformStats.revenue)} دج
        </Text>
      </Card>
    </View>
  );

  const renderStore = ({ item }) => {
    const isExpanded = expandedStore === item.id;
    const stats = storeStats[item.id] || {
      orders: 0,
      revenue: 0,
      products: 0,
      affiliates: 0,
    };
    const ownerProfile = Array.isArray(item.profiles)
      ? item.profiles[0]
      : item.profiles;

    // Fixed width for desktop columns to prevent overflow
    const cardWidth = isDesktop
      ? (Math.min(width, 1400) - spacing.xl * 2) / 4 - spacing.md
      : isTablet
        ? (width - spacing.xl) / 2 - spacing.md
        : width - spacing.md * 2;

    return (
      <View style={{ width: cardWidth, margin: spacing.xs }}>
        <Card
          style={styles.storeCard}
          accentColor={item.primary_color || theme.primary}
          accentPosition="left"
        >
          <View style={styles.cardHeader}>
            <View style={styles.avatarWrapper}>
              <Avatar
                name={ownerProfile?.full_name || item.name}
                imageUrl={item.logo_url}
                size={52}
                showRing
                ringColor={item.primary_color || theme.primary}
              />
              <TouchableOpacity
                style={[
                  styles.infoCircle,
                  { backgroundColor: theme.primary + "15" },
                ]}
                onPress={() =>
                  showAlert({
                    title: item.name,
                    message:
                      item.description || "لا يوجد وصف متاح لهذا المتجر.",
                    type: "info",
                  })
                }
              >
                <Ionicons
                  name="information-circle"
                  size={16}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.headerText}>
              <Text
                numberOfLines={1}
                style={[styles.storeName, { color: theme.colors.text }]}
              >
                {item.name}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.ownerName,
                  { color: theme.colors.textSecondary },
                ]}
              >
                👤 {ownerProfile?.full_name || "تاجر مجهول"}
              </Text>
            </View>

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: item.is_active
                    ? theme.colors.success
                    : theme.colors.error,
                },
              ]}
            />
          </View>

          {/* Quick Stats Grid */}
          <View
            style={[
              styles.statsGrid,
              { backgroundColor: theme.colors.shimmer },
            ]}
          >
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: theme.colors.text }]}>
                {stats.orders}
              </Text>
              <Text
                style={[styles.statName, { color: theme.colors.textTertiary }]}
              >
                طلب
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: theme.colors.text }]}>
                {stats.products}
              </Text>
              <Text
                style={[styles.statName, { color: theme.colors.textTertiary }]}
              >
                منتج
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: theme.primary }]}>
                {formatCompactNumber(stats.revenue)}
              </Text>
              <Text
                style={[styles.statName, { color: theme.colors.textTertiary }]}
              >
                دج
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={item.is_active ? "تعطيل" : "تفعيل"}
              onPress={() => handleToggleStatus(item)}
              variant={item.is_active ? "ghost" : "success"}
              size="small"
              style={{ flex: 1, height: 34 }}
            />
            <TouchableOpacity
              onPress={() => setExpandedStore(isExpanded ? null : item.id)}
              style={[
                styles.expandToggle,
                { backgroundColor: theme.colors.surface2 },
              ]}
            >
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {isExpanded && (
            <View style={styles.expanded}>
              <View style={styles.expItem}>
                <Ionicons
                  name="people-outline"
                  size={14}
                  color={theme.colors.textTertiary}
                />
                <Text
                  style={[
                    styles.expText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  المسوقين: {stats.affiliates}
                </Text>
              </View>
              {ownerProfile?.phone && (
                <View style={styles.expItem}>
                  <Ionicons
                    name="call-outline"
                    size={14}
                    color={theme.colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.expText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {ownerProfile.phone}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="إدارة المتاجر"
        rightAction={
          <Badge label={`${filteredStores.length} متجر`} variant="primary" />
        }
      />

      <FlatList
        data={filteredStores}
        renderItem={renderStore}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        ListHeaderComponent={
          <>
            <SummaryHeader />
            <View style={styles.controls}>
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="search"
                  size={18}
                  color={theme.colors.textTertiary}
                />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="ابحث عن متجر..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <View style={styles.filterRow}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[
                      styles.filterBtn,
                      {
                        backgroundColor:
                          filter === f.key
                            ? theme.primary
                            : theme.colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color:
                            filter === f.key
                              ? "#FFF"
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="لا توجد متاجر"
            message="لم نجد أي متجر يطابق بحثك."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: "center",
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  summaryLabel: { ...typography.small, marginBottom: 4 },
  summaryValue: {
    ...typography.h3,
    fontSize: 18,
    fontFamily: "Tajawal_800ExtraBold",
  },
  controls: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginStart: 8,
    ...typography.body,
    textAlign: "right",
  },
  filterRow: { flexDirection: "row", gap: spacing.xs },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  filterText: { ...typography.small, fontFamily: "Tajawal_700Bold" },
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: 100,
    alignSelf: "center",
    width: "100%",
    maxWidth: 1400,
  },
  storeCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  avatarWrapper: {
    position: "relative",
  },
  infoCircle: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  headerText: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  storeName: { ...typography.bodyBold, fontSize: 16 },
  ownerName: { ...typography.caption, fontSize: 11 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statNum: {
    ...typography.small,
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 13,
  },
  statName: { ...typography.small, fontSize: 9, marginTop: -2 },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  expandToggle: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  expanded: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    gap: 4,
  },
  expItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  expText: { ...typography.caption, fontSize: 12 },
});
