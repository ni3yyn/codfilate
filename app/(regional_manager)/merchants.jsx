import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { useRegionalManagerStore } from "../../src/stores/useRegionalManagerStore";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import { getEffectiveWilayaIds } from "../../src/lib/profileUtils";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import StatCard from "../../src/components/ui/StatCard";
import BottomSheet from "../../src/components/ui/BottomSheet";
import { typography, spacing, borderRadius } from "../../src/theme/theme";
import { formatRelativeTime } from "../../src/lib/utils";
import { useResponsive } from "../../src/hooks/useResponsive";

/**
 * Merchants Management Hub for Regional Managers.
 * Features tabs for Pending (Approvals) and Assigned (Active) stores.
 */
export default function MerchantsScreen() {
  const theme = useTheme();
  const { isWide, maxContentWidth } = useResponsive();
  const profile = useAuthStore((s) => s.profile);
  const wilayaIds = useMemo(() => getEffectiveWilayaIds(profile), [profile]);

  const {
    fetchPendingMerchantStores,
    fetchAssignedMerchantStores,
    activateMerchantStore,
    fetchStoreDetails,
  } = useRegionalManagerStore();

  const { showAlert, showConfirm } = useAlertStore();

  const [activeTab, setActiveTab] = useState("pending"); // 'pending' or 'assigned'
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(null);

  // Store Details Modal State
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeDetails, setStoreDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res =
      activeTab === "pending"
        ? await fetchPendingMerchantStores()
        : await fetchAssignedMerchantStores();

    if (res.success) {
      setRows(res.data || []);
    }
    setLoading(false);
  }, [activeTab, fetchPendingMerchantStores, fetchAssignedMerchantStores]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleActivate = async (store) => {
    showConfirm({
      title: "تفعيل المتجر",
      message: `هل توافق على تفعيل متجر «${store.name}»؟ سيتمكن المسوقون من اختيار منتجاته في منطقتك.`,
      confirmText: "تفعيل الآن",
      type: "success",
      onConfirm: async () => {
        setActing(store.id);
        const res = await activateMerchantStore(store.id);
        setActing(null);
        if (res.success) {
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showAlert({
            title: "تم التفعيل",
            message: "المتجر متاح الآن في ولايتك.",
            type: "success",
          });
          loadData();
        } else {
          showAlert({ title: "خطأ", message: res.error, type: "destructive" });
        }
      },
    });
  };

  const openStoreDetails = async (store) => {
    setSelectedStore(store);
    setDetailsLoading(true);
    const res = await fetchStoreDetails(store.id, wilayaIds);
    if (res.success) {
      setStoreDetails(res.data);
    }
    setDetailsLoading(false);
  };

  const renderMerchantItem = ({ item }) => {
    const isPending = activeTab === "pending";
    const owner = item.profiles?.[0];

    return (
      <Card
        style={styles.card}
        accentColor={isPending ? "#FDCB6E" : theme.primary}
        accentPosition="left"
        onPress={!isPending ? () => openStoreDetails(item) : undefined}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.storeName, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
              {owner?.full_name || "تاجر غير معروف"} ·{" "}
              {owner?.phone || "بدون رقم"}
            </Text>
          </View>
          {item.logo_url && (
            <Image source={{ uri: item.logo_url }} style={styles.storeLogo} />
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.time, { color: theme.colors.textTertiary }]}>
            {isPending
              ? `طلب منذ ${formatRelativeTime(item.created_at)}`
              : `نشط منذ ${formatRelativeTime(item.rm_activated_at)}`}
          </Text>

          {isPending ? (
            <Button
              title="تفعيل"
              size="small"
              variant="primary"
              loading={acting === item.id}
              onPress={() => handleActivate(item)}
              style={{ width: 100 }}
            />
          ) : (
            <TouchableOpacity
              style={[
                styles.detailsBtn,
                { backgroundColor: theme.colors.surfaceElevated },
              ]}
              onPress={() => openStoreDetails(item)}
            >
              <Text style={[styles.detailsBtnText, { color: theme.primary }]}>
                التفاصيل
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={theme.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="إدارة التجار"
        subtitle="متابعة وتفعيل المتاجر في ولاياتك"
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "pending" && {
              borderBottomColor: theme.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("pending")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "pending"
                    ? theme.primary
                    : theme.colors.textTertiary,
              },
            ]}
          >
            بانتظار التفعيل
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "assigned" && {
              borderBottomColor: theme.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("assigned")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "assigned"
                    ? theme.primary
                    : theme.colors.textTertiary,
              },
            ]}
          >
            المتاجر المفعّلة
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={renderMerchantItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={[
          styles.list,
          isWide && {
            maxWidth: maxContentWidth,
            alignSelf: "center",
            width: "100%",
          },
        ]}
        ListEmptyComponent={
          loading ? (
            <LoadingSpinner />
          ) : (
            <EmptyState
              icon="business-outline"
              title={
                activeTab === "pending"
                  ? "لا يوجد تجار بانتظار التفعيل"
                  : "لم يتم تفعيل أي متجر بعد"
              }
              message={
                activeTab === "pending"
                  ? "ستظهر المتاجر الجديدة التي تسجل في منطقتك هنا للموافقة عليها."
                  : "المتاجر التي توافق عليها ستنتقل إلى هذه القائمة."
              }
            />
          )
        }
      />

      {/* Store Details Sheet */}
      <BottomSheet
        visible={!!selectedStore}
        onClose={() => setSelectedStore(null)}
        title="تفاصيل المتجر"
        subtitle={selectedStore?.name}
      >
        {detailsLoading ? (
          <LoadingSpinner />
        ) : (
          <View style={{ gap: spacing.lg }}>
            <View
              style={[
                styles.storeCard,
                { backgroundColor: theme.colors.surfaceElevated },
              ]}
            >
              <View style={styles.storeMainInfo}>
                <View style={styles.logoCircle}>
                  {selectedStore?.logo_url ? (
                    <Image
                      source={{ uri: selectedStore.logo_url }}
                      style={styles.fullLogo}
                    />
                  ) : (
                    <Ionicons
                      name="business"
                      size={32}
                      color={theme.colors.textTertiary}
                    />
                  )}
                </View>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    style={[styles.storeTitle, { color: theme.colors.text }]}
                  >
                    {selectedStore?.name}
                  </Text>
                  <Text
                    style={[
                      styles.storeOwner,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {selectedStore?.profiles?.[0]?.full_name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.callBtn, { backgroundColor: theme.primary }]}
                  onPress={() =>
                    Linking.openURL(
                      `tel:${selectedStore?.profiles?.[0]?.phone}`,
                    )
                  }
                >
                  <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                title="إجمالي الطلبات"
                value={storeDetails?.stats?.totalOrders || 0}
                icon="receipt"
                color={theme.primary}
                size="small"
              />
              <StatCard
                title="نسبة التوصيل"
                value={`${storeDetails?.stats?.successfulOrders || 0}`}
                icon="checkmark-circle"
                color="#27AE60"
                size="small"
              />
              <StatCard
                title="المداخيل (DA)"
                value={
                  storeDetails?.stats?.totalRevenue?.toLocaleString() || "0"
                }
                icon="wallet"
                color="#F39C12"
                size="small"
              />
            </View>

            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                كتالوج المنتجات
              </Text>
              {storeDetails?.products?.length === 0 ? (
                <Text
                  style={{
                    textAlign: "center",
                    color: theme.colors.textTertiary,
                    marginTop: 20,
                  }}
                >
                  لا توجد منتجات نشطة
                </Text>
              ) : (
                storeDetails?.products.map((p) => (
                  <View
                    key={p.id}
                    style={[
                      styles.productRow,
                      { borderBottomColor: theme.colors.divider },
                    ]}
                  >
                    {p.image_url ? (
                      <Image
                        source={{ uri: p.image_url }}
                        style={styles.miniProdImg}
                      />
                    ) : (
                      <View style={styles.miniProdPlaceholder}>
                        <Ionicons
                          name="cube"
                          size={14}
                          color={theme.colors.textTertiary}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.prodName, { color: theme.colors.text }]}
                      >
                        {p.name}
                      </Text>
                      <Text
                        style={[
                          styles.prodCategory,
                          { color: theme.colors.textTertiary },
                        ]}
                      >
                        {p.category}
                      </Text>
                    </View>
                    <Text style={[styles.prodPrice, { color: theme.primary }]}>
                      {p.price} DA
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "transparent",
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  tabText: { ...typography.bodyBold, fontSize: 15 },
  list: { padding: spacing.md, paddingBottom: 120 },
  card: { padding: spacing.sm, marginBottom: spacing.sm },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  storeName: { ...typography.bodyBold, fontSize: 18 },
  meta: { ...typography.small, marginTop: 4 },
  storeLogo: { width: 50, height: 50, borderRadius: 25 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  time: { ...typography.caption },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  detailsBtnText: { fontSize: 12, fontFamily: "Tajawal_700Bold" },
  storeCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  storeMainInfo: { flexDirection: "row", alignItems: "center" },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fullLogo: { width: "100%", height: "100%" },
  storeTitle: { ...typography.h3, fontSize: 22 },
  storeOwner: { ...typography.body, fontSize: 14 },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  miniProdImg: { width: 48, height: 48, borderRadius: 10 },
  miniProdPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  prodName: { ...typography.bodyBold, fontSize: 15 },
  prodCategory: { ...typography.caption },
  prodPrice: { ...typography.bodyBold, fontSize: 14 },
});
