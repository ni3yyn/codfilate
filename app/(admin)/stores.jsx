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
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Linking } from "react-native";

// Hooks & Stores
import { useTheme } from "../../src/hooks/useTheme";
import { useStoreStore } from "../../src/stores/useStoreStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import { supabase } from "../../src/lib/supabase";

// UI Components
import Avatar from "../../src/components/ui/Avatar";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import Button from "../../src/components/ui/Button";
import ResponsiveModal from "../../src/components/ui/ResponsiveModal";
import Badge from "../../src/components/ui/Badge";

// Theme & Utils
import { typography, spacing, borderRadius, shadows } from "../../src/theme/theme";
import { formatCompactNumber } from "../../src/lib/utils";

export default function AdminStores() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const { stores, isLoading, fetchAllStoresAdmin, toggleStoreStatus } = useStoreStore();
  const { showAlert, showConfirm } = useAlertStore();

  // Responsive Grid Logic
  const isDesktop = width > 1100;
  const isTablet = width > 700 && width <= 1100;
  const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [storeStats, setStoreStats] = useState({});
  const [filter, setFilter] = useState("all");

  // Loading & Modal States
  const [togglingStoreId, setTogglingStoreId] = useState(null);
  const [productsModalVisible, setProductsModalVisible] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadData = useCallback(async () => {
    await fetchAllStoresAdmin();
    try {
      const [{ data: orderData }, { data: productData }, { data: affiliateData }] =
        await Promise.all([
          supabase.from("orders").select("store_id, total, status"),
          supabase.from("products").select("store_id, id").eq("is_active", true),
          supabase.from("affiliates").select("store_id, id"),
        ]);

      const stats = {};
      const process = (data, key) => {
        data?.forEach((item) => {
          if (!stats[item.store_id])
            stats[item.store_id] = { orders: 0, revenue: 0, products: 0, affiliates: 0 };
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

  useEffect(() => { loadData(); }, [loadData]);

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
        setTogglingStoreId(store.id);
        const result = await toggleStoreStatus(store.id, newStatus);
        setTogglingStoreId(null);
        if (!result.success)
          showAlert({ title: "خطأ", message: result.error, type: "error" });
        else
          showAlert({ title: "تم", message: `تم ${newStatus ? "تفعيل" : "تعطيل"} المتجر بنجاح.`, type: "success" });
      },
    });
  };

  const handleShowProducts = async (store) => {
    setSelectedStore(store);
    setProductsModalVisible(true);
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      if (__DEV__) console.error("Products error:", err);
      showAlert({ title: "خطأ", message: "تعذر تحميل المنتجات", type: "error" });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCallStore = (phone) => {
    if (!phone) {
      showAlert({ title: "تنبيه", message: "رقم الهاتف غير متوفر لهذا المتجر", type: "warning" });
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const filteredStores = useMemo(() =>
    stores.filter((s) => {
      const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || (filter === "active" ? s.is_active : !s.is_active);
      return matchesSearch && matchesFilter;
    }),
    [stores, search, filter]
  );

  const platformStats = useMemo(() => {
    const active = stores.filter((s) => s.is_active).length;
    const totalRev = Object.values(storeStats).reduce((sum, s) => sum + s.revenue, 0);
    return { total: stores.length, active, inactive: stores.length - active, revenue: totalRev };
  }, [stores, storeStats]);

  const FILTERS = [
    { key: "all", label: "الكل", icon: "apps-outline" },
    { key: "active", label: "نشط", icon: "checkmark-circle-outline" },
    { key: "inactive", label: "معطل", icon: "close-circle-outline" },
  ];

  // ─── Summary Banner ──────────────────────────────────────────────────────────
  const SummaryBanner = () => (
    <View style={styles.summaryRow}>
      {[
        { label: "إجمالي المتاجر", value: platformStats.total, icon: "storefront-outline", color: theme.primary },
        { label: "نشطة", value: platformStats.active, icon: "checkmark-circle-outline", color: "#10B981" },
        { label: "معطلة", value: platformStats.inactive, icon: "close-circle-outline", color: "#EF4444" },
        { label: "إجمالي المبيعات", value: `${formatCompactNumber(platformStats.revenue)} دج`, icon: "cash-outline", color: "#8B5CF6" },
      ].map((item, i) => (
        <View key={i} style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.summaryIconBox, { backgroundColor: item.color + "15" }]}>
            <Ionicons name={item.icon} size={22} color={item.color} />
          </View>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{item.value}</Text>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  // ─── Store Card ──────────────────────────────────────────────────────────────
  const renderStore = ({ item }) => {
    const stats = storeStats[item.id] || { orders: 0, revenue: 0, products: 0, affiliates: 0 };
    const ownerProfile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    const accentColor = item.primary_color || theme.primary;
    const wilaya = item.wilayas?.name || item.wilaya || ownerProfile?.wilaya || "ولاية غير محددة";
    const phone = ownerProfile?.phone;
    const isToggling = togglingStoreId === item.id;

    return (
      <View style={isDesktop ? styles.cardWrapperDesktop : isTablet ? styles.cardWrapperTablet : styles.cardWrapperMobile}>
        <View style={[styles.storeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>

          {/* ── Colored header band ── */}
          <View style={[styles.cardBand, { backgroundColor: accentColor + "15" }]}>
            <View style={[styles.avatarRing, { borderColor: theme.colors.surface }]}>
              <Avatar name={ownerProfile?.full_name || item.name} imageUrl={item.logo_url} size={56} />
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: item.is_active ? "#10B98115" : "#EF444415",
                  borderColor: item.is_active ? "#10B981" : "#EF4444",
                },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: item.is_active ? "#10B981" : "#EF4444" }]} />
              <Text style={[styles.statusText, { color: item.is_active ? "#10B981" : "#EF4444" }]}>
                {item.is_active ? "نشط" : "معطل"}
              </Text>
            </View>
          </View>

          {/* ── Card body ── */}
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={[styles.storeName, { color: theme.colors.text }]}>
              {item.name}
            </Text>

            <View style={styles.metaContainer}>
              <View style={styles.ownerRow}>
                <Ionicons name="person-circle-outline" size={14} color={theme.colors.textTertiary} />
                <Text numberOfLines={1} style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {ownerProfile?.full_name || "تاجر مجهول"}
                </Text>
              </View>

              <View style={styles.ownerRow}>
                <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {wilaya}
                </Text>
              </View>
            </View>

            {/* ── Stats row ── */}
            <View style={[styles.statsRow, { borderColor: theme.colors.border }]}>
              {[
                { icon: "receipt-outline", value: stats.orders, label: "طلب", color: theme.primary },
                { icon: "cube-outline", value: stats.products, label: "منتج", color: "#8B5CF6" },
                { icon: "people-outline", value: stats.affiliates, label: "مسوق", color: "#10B981" },
                { icon: "cash-outline", value: `${formatCompactNumber(stats.revenue)}`, label: "دج", color: "#F59E0B" },
              ].map((stat, i, arr) => (
                <View key={i} style={[styles.statItem, i < arr.length - 1 && { borderEndWidth: 1, borderEndColor: theme.colors.border }]}>
                  <View style={[styles.statIconBox, { backgroundColor: stat.color + "15" }]}>
                    <Ionicons name={stat.icon} size={14} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Actions ── */}
            <View style={styles.actionsRow}>
              <Button
                title="عرض المنتجات"
                icon="cube-outline"
                onPress={() => handleShowProducts(item)}
                style={styles.primaryActionBtn}
                textStyle={{ fontSize: 13 }}
              />

              <TouchableOpacity
                onPress={() => !isToggling && handleToggleStatus(item)}
                disabled={isToggling}
                style={[
                  styles.toggleBtn,
                  item.is_active
                    ? { backgroundColor: "#EF444415", borderColor: "#EF444430" }
                    : { backgroundColor: "#10B98115", borderColor: "#10B98130" },
                  isToggling && { opacity: 0.7 }
                ]}
              >
                {isToggling ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={item.is_active ? "power-outline" : "checkmark-circle-outline"}
                      size={16}
                      color={item.is_active ? "#EF4444" : "#10B981"}
                    />
                    <Text style={[styles.toggleText, { color: item.is_active ? "#EF4444" : "#10B981" }]}>
                      {item.is_active ? "تعطيل" : "تفعيل"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleCallStore(phone)}
                style={[styles.callBtn, { backgroundColor: theme.primary + "15", borderColor: theme.primary + "30" }]}
              >
                <Ionicons name="call-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </View>
    );
  };

  // ─── List header ─────────────────────────────────────────────────────────────
  const ListHeader = () => (
    <>
      <SummaryBanner />

      <View style={styles.controlsWrap}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="ابحث عن اسم المتجر..."
            placeholderTextColor={theme.colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <View style={[styles.countBadge, { backgroundColor: theme.colors.surface2 }]}>
            <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
              {filteredStores.length} متجر
            </Text>
          </View>

          <View style={styles.chipsGroup}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[
                    styles.filterPill,
                    active
                      ? { backgroundColor: theme.primary, borderColor: theme.primary }
                      : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <Text style={[styles.filterText, { color: active ? "#FFF" : theme.colors.textSecondary }]}>
                    {f.label}
                  </Text>
                  <Ionicons name={f.icon} size={14} color={active ? "#FFF" : theme.colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <UniversalHeader title="إدارة المتاجر" subtitle="تحكم شامل في متاجر المنصة وحالتها" />

      {isLoading && !refreshing ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filteredStores}
          renderItem={renderStore}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState icon="storefront-outline" title="لا توجد متاجر" message="لم نجد أي متجر يطابق بحثك الحالي." />
          }
        />
      )}

      {/* ── Products Modal ── */}
      <ResponsiveModal
        visible={productsModalVisible}
        onClose={() => setProductsModalVisible(false)}
        title={`منتجات ${selectedStore?.name || ""}`}
        subtitle="عرض سريع لمنتجات المتجر"
        maxWidth={800}
      >
        <View style={styles.modalContent}>
          {loadingProducts ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="لا توجد منتجات"
              message="هذا المتجر لم يقم بإضافة أي منتجات بعد."
            />
          ) : (
            <View style={styles.productsGrid}>
              {products.map((product, index) => {
                const commission = product.commission_amount || 0;
                const netEarnings = product.price - commission;
                const isLast = index === products.length - 1;
                
                return (
                  <View key={product.id} style={[styles.productCard, { borderBottomColor: theme.colors.border }, isLast && { borderBottomWidth: 0 }]}>
                    <View style={styles.productInfo}>
                      <View style={styles.productHeader}>
                        <Text numberOfLines={1} style={[styles.productName, { color: theme.colors.text }]}>
                          {product.name}
                        </Text>
                        <Badge
                          label={product.is_active ? "نشط" : "معطل"}
                          variant={product.is_active ? "success" : "error"}
                        />
                      </View>
                      
                      <View style={styles.productMetricsRow}>
                        <View style={styles.productMetric}>
                          <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>السعر</Text>
                          <Text style={[styles.metricValue, { color: theme.colors.text }]}>{product.price} دج</Text>
                        </View>
                        <View style={styles.productMetric}>
                          <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>العمولة</Text>
                          <Text style={[styles.metricValue, { color: theme.primary }]}>{commission} دج</Text>
                        </View>
                        <View style={styles.productMetric}>
                          <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>صافي التاجر</Text>
                          <Text style={[styles.metricValue, { color: "#10B981" }]}>{netEarnings} دج</Text>
                        </View>
                      </View>
                    </View>
                    <Image 
                      source={{ uri: product.image_url }} 
                      style={styles.productImage} 
                      contentFit="cover"
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ResponsiveModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Summary Banner
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    minWidth: 150,
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: 6,
    ...shadows.sm,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  summaryValue: { fontFamily: "Tajawal_800ExtraBold", fontSize: 20, textAlign: "center" },
  summaryLabel: { fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "center" },

  // Controls
  controlsWrap: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "web" ? 12 : 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontFamily: "Tajawal_500Medium",
    textAlign: "right",
  },

  // Filter Row
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  chipsGroup: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterText: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  countBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  countText: { fontFamily: "Tajawal_700Bold", fontSize: 12 },

  // Grid / List
  list: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: 120,
    alignSelf: "center",
    width: "100%",
    maxWidth: 1400,
  },
  gridRow: {
    gap: spacing.md,
    justifyContent: 'flex-start',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },

  // Sizing
  cardWrapperDesktop: { flex: 1, maxWidth: '32.5%', minWidth: 320 },
  cardWrapperTablet: { flex: 1, maxWidth: '48.5%', minWidth: 300 },
  cardWrapperMobile: { width: '100%', marginBottom: spacing.md },

  // Store Card
  storeCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardBand: {
    height: 70,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: "Tajawal_700Bold", fontSize: 12 },

  avatarRing: {
    borderRadius: 36,
    borderWidth: 4,
    overflow: "hidden",
    marginTop: 10,
    backgroundColor: '#FFF',
  },

  cardBody: {
    padding: spacing.md,
    paddingTop: spacing.xs,
  },
  storeName: {
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 18,
    textAlign: "right",
    marginBottom: 6,
  },

  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 12,
    textAlign: "right",
  },

  // Stats Grid inside Card
  statsRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: 2,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: { fontFamily: "Tajawal_800ExtraBold", fontSize: 14, textAlign: "center" },
  statLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "center" },

  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  primaryActionBtn: {
    flex: 2,
    height: 44,
  },
  toggleBtn: {
    flex: 1.2,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  toggleText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 13,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal Styles
  modalContent: {
    padding: spacing.md,
    minHeight: 200,
  },
  productsGrid: {
    gap: spacing.sm,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  productInfo: {
    flex: 1,
    alignItems: "flex-start", // Right side in RTL
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
    width: '100%',
  },
  productName: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
    flex: 1,
    textAlign: "right",
  },
  productMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    width: '100%',
  },
  productMetric: {
    alignItems: "flex-start", // Right side in RTL
  },
  metricLabel: {
    fontFamily: "Tajawal: 500Medium",
    fontSize: 10,
    marginBottom: 2,
    textAlign: 'right',
  },
  metricValue: {
    fontFamily: "Tajawal_800ExtraBold",
    fontSize: 13,
    textAlign: 'right',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});