import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/hooks/useTheme";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useRegionalManagerStore } from "../../src/stores/useRegionalManagerStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import { getEffectiveWilayaIds } from "../../src/lib/profileUtils";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import { typography, spacing, borderRadius } from "../../src/theme/theme";
import { formatCurrency } from "../../src/lib/utils";
import { ORDER_STATUS_AR, ORDER_STATUS_COLORS } from "../../src/lib/constants";

export default function ManageDeliveries() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const {
    deliveries,
    fetchManagerDeliveries,
    updateOrderLifecycleStatus,
    confirmCodCollected,
    isLoading,
  } = useRegionalManagerStore();
  const { showAlert } = useAlertStore();
  const [refreshing, setRefreshing] = useState(false);
  const [segment, setSegment] = useState("active"); // 'active' | 'history'

  const loadData = useCallback(async () => {
    if (profile?.id) {
      await fetchManagerDeliveries(profile.id, segment);
    }
  }, [profile?.id, segment, fetchManagerDeliveries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConfirmCod = async (orderId) => {
    const res = await confirmCodCollected(orderId);
    if (res.success) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert({
        title: "تم التحصيل",
        message: "تم تأكيد استلام المبلغ المالي بنجاح.",
        type: "success",
      });
      await loadData();
    } else {
      showAlert({ title: "خطأ", message: res.error, type: "destructive" });
    }
  };

  const handleStatusUpdate = async (orderId, nextStatus) => {
    const res = await updateOrderLifecycleStatus(orderId, nextStatus);
    if (res.success) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert({
        title: "تم",
        message: "تم تحديث حالة التوصيل بنجاح.",
        type: "success",
      });
      await loadData();
    } else {
      showAlert({ title: "خطأ", message: res.error, type: "destructive" });
    }
  };

  const renderDelivery = ({ item }) => {
    // Sync order status with display
    const status = item.orders?.status || item.status;
    const color = ORDER_STATUS_COLORS[status] || theme.primary;
    const label = ORDER_STATUS_AR[status] || status;

    return (
      <Card
        style={styles.deliveryCard}
        accentColor={color}
        accentPosition="left"
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customerName, { color: theme.colors.text }]}>
              {item.customer_name || item.orders?.customer_name || "عميل"}
            </Text>
            <Text
              style={[styles.orderMeta, { color: theme.colors.textSecondary }]}
            >
              📍 {item.wilayas?.name || ""} ·{" "}
              {item.delivery_type === "office" ? "مكتب" : "منزل"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: color + "15" }]}>
            <Text style={[styles.statusText, { color: color }]}>{label}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.priceRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>المنتج:</Text>
            <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{formatCurrency(item.orders?.sale_price || 0)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>التوصيل:</Text>
            <Text style={[styles.detailValue, { color: '#00CEC9' }]}>+{formatCurrency(item.orders?.delivery_fee || 0)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.detailTotalLabel, { color: theme.colors.text }]}>التحصيل:</Text>
            <Text style={[styles.totalAmount, { color: theme.primary }]}>
              {formatCurrency(item.orders?.total || 0)}
            </Text>
          </View>
          <View style={styles.dateBox}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={theme.colors.textTertiary}
            />
            <Text
              style={[styles.dateText, { color: theme.colors.textTertiary }]}
            >
              {new Date(item.created_at).toLocaleDateString("ar-DZ")}
            </Text>
          </View>
        </View>

        {/* Operational Actions */}
        <View style={styles.actionRow}>
          {(status === "confirmed_by_manager" || status === "assigned") && (
            <Button
              title="🚚 شحن (قيد التوصيل)"
              onPress={() => handleStatusUpdate(item.order_id, "in_transit")}
              size="small"
              variant="primary"
              style={{ flex: 1 }}
            />
          )}
          {status === "in_transit" && (
            <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
              <Button
                title="📦 تم التوصيل"
                onPress={() => handleStatusUpdate(item.order_id, "delivered")}
                size="small"
                variant="gradient"
                style={{ flex: 1 }}
              />
              <TouchableOpacity
                style={styles.returnBtn}
                onPress={() => handleStatusUpdate(item.order_id, "returned")}
              >
                <Text style={styles.returnBtnText}>إرجاع</Text>
              </TouchableOpacity>
            </View>
          )}
          {status === "delivered" && (
            <View style={{ flex: 1 }}>
              {item.orders?.cod_confirmed_at ? (
                <View style={styles.collectedBadge}>
                  <Ionicons name="cash-outline" size={16} color="#2D6A4F" />
                  <Text style={styles.collectedText}>تم تحصيل المبلغ</Text>
                </View>
              ) : (
                <Button
                  title="💰 تأكيد تحصيل المبلغ"
                  onPress={() => handleConfirmCod(item.order_id)}
                  size="small"
                  variant="outline"
                  style={{ borderColor: theme.primary }}
                />
              )}
            </View>
          )}
        </View>

        {item.failed_reason && (
          <View
            style={[styles.errorBox, { backgroundColor: theme.error + "10" }]}
          >
            <Ionicons name="alert-circle" size={14} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>
              {item.failed_reason}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="إدارة التوصيلات"
        showAvatar={false}
        rightAction={
          <TouchableOpacity
            onPress={() => router.push("/(regional_manager)/dashboard")}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <View
        style={[
          styles.tabs,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            segment === "active" && { borderBottomColor: theme.primary },
          ]}
          onPress={() => setSegment("active")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  segment === "active"
                    ? theme.primary
                    : theme.colors.textSecondary,
              },
            ]}
          >
            نشطة (🚚)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            segment === "history" && { borderBottomColor: theme.primary },
          ]}
          onPress={() => setSegment("history")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  segment === "history"
                    ? theme.primary
                    : theme.colors.textSecondary,
              },
            ]}
          >
            الأرشيف (📦)
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && deliveries.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item.id}
          renderItem={renderDelivery}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="car-outline"
              title="لا توجد توصيلات"
              message={
                segment === "active"
                  ? "لا توجد عمليات توصيل جارية حالياً"
                  : "سجل التوصيلات فارغ"
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { ...typography.bodyBold, fontSize: 15 },
  listContent: { padding: spacing.md, paddingBottom: 100 },
  deliveryCard: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  customerName: { ...typography.bodyBold, fontSize: 16 },
  orderMeta: { ...typography.caption, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Tajawal_700Bold" },
  cardDetails: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    gap: 4
  },
  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 6, marginTop: 4 },
  detailLabel: { fontSize: 13, fontFamily: "Tajawal_500Medium" },
  detailValue: { fontSize: 13, fontFamily: "Tajawal_700Bold" },
  detailTotalLabel: { fontSize: 14, fontFamily: "Tajawal_700Bold" },
  totalAmount: { ...typography.bodyBold, fontSize: 16 },
  dateBox: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: 8 },
  dateText: { fontSize: 12, fontFamily: "Tajawal_500Medium" },
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: spacing.md,
    gap: 8,
  },
  returnBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#E17055",
    alignItems: "center",
    justifyContent: "center",
  },
  returnBtnText: {
    ...typography.small,
    color: "#E17055",
    fontFamily: "Tajawal_700Bold",
  },
  errorBox: {
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: { ...typography.small, flex: 1 },
  collectedBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: "rgba(45, 106, 79, 0.1)",
    borderRadius: borderRadius.sm,
  },
  collectedText: {
    fontSize: 13,
    fontFamily: "Tajawal_700Bold",
    color: "#2D6A4F",
  },
});
