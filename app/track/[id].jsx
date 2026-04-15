import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { supabase } from "../../src/lib/supabase";
import {
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../../src/theme/theme";
import Button from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import Avatar from "../../src/components/ui/Avatar";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import EmptyState from "../../src/components/ui/EmptyState";
import { formatCurrency, formatLongDate } from "../../src/lib/utils";

const STATUS_CONFIG = {
  awaiting_marketer: {
    label: "بانتظار موافقة المسوق",
    icon: "person-outline",
    color: "#A29BFE",
  },
  pending: {
    label: "قيد المراجعة",
    icon: "hourglass-outline",
    color: "#FDCB6E",
  },
  confirmed: {
    label: "تم تأكيد الطلب",
    icon: "checkmark-circle-outline",
    color: "#00B894",
  },
  confirmed_by_manager: {
    label: "تمت معالجة الطلب",
    icon: "shield-checkmark-outline",
    color: "#00B894",
  },
  picked_up: {
    label: "تم استلام الطرد",
    icon: "cube-outline",
    color: "#0984E3",
  },
  shipped: {
    label: "تم شحن الطرد",
    icon: "airplane-outline",
    color: "#6C5CE7",
  },
  in_transit: {
    label: "الطرد في الطريق إليك",
    icon: "car-outline",
    color: "#0984E3",
  },
  delivered: {
    label: "تم التسليم بنجاح ✅",
    icon: "gift-outline",
    color: "#2D6A4F",
  },
  returned: {
    label: "تم إرجاع الطلب ↩️",
    icon: "return-down-back-outline",
    color: "#E17055",
  },
  failed: { label: "تعذر التوصيل", icon: "warning-outline", color: "#D63031" },
  cancelled: {
    label: "تم إلغاء الطلب ❌",
    icon: "close-circle-outline",
    color: "#FF7675",
  },
  paid: { label: "عملية مكتملة", icon: "cash-outline", color: "#2D6A4F" },
};

export default function OrderTrackingDetail() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const fetchTracking = async () => {
    try {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc(
        "get_public_order_tracking",
        {
          p_search_term: id,
        },
      );

      if (rpcError) throw rpcError;
      if (!data) setError("لم يتم العثور على الطلب. يرجى التأكد من الرمز.");
      else setOrder(data);
    } catch (err) {
      console.error("Tracking fetch error:", err);
      setError("حدث خطأ أثناء تحميل بيانات التتبع.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTracking();
  }, [id]);

  const handleCallSupport = () => {
    if (order?.rm_phone) {
      Linking.openURL(`tel:${order.rm_phone}`);
    }
  };

  const handleWhatsAppSupport = () => {
    if (order?.rm_phone) {
      const msg = `مرحباً، أود الاستفسار عن طلبي رقم ${order.id?.substring(0, 8)}...`;
      Linking.openURL(
        `https://wa.me/${order.rm_phone}?text=${encodeURIComponent(msg)}`,
      );
    }
  };

  if (loading) return <LoadingSpinner message="جارٍ جلب حالة الطلب..." />;

  if (error || !order) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <EmptyState
            icon="search-outline"
            title="طلب غير موجود"
            message={error || "رقم الطلب أو الهاتف الذي أدخلته غير صحيح."}
          />
          <Button
            title="حاول مرة أخرى"
            onPress={() => router.replace("/track")}
            variant="primary"
            style={{ width: 200, marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const accentColor = order.store_primary_color || theme.primary;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header Store Info */}
        <View style={styles.storeHeader}>
          <Avatar
            name={order.store_name}
            imageUrl={order.store_logo}
            size={60}
            showRing
            ringColor={accentColor}
          />
          <View style={styles.storeText}>
            <Text style={[styles.storeName, { color: theme.colors.text }]}>
              متجر: {order.store_name}
            </Text>
            <Text
              style={[styles.orderId, { color: theme.colors.textTertiary }]}
            >
              رقم الطلب: #{order.id.substring(0, 8)}
            </Text>
          </View>
        </View>

        {/* Current Status Highlight */}
        <Card
          style={[
            styles.statusCard,
            {
              borderColor: currentStatus.color + "40",
              backgroundColor: theme.isDark ? theme.colors.surface : "#FFF",
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: currentStatus.color + "20" },
            ]}
          >
            <Ionicons
              name={currentStatus.icon}
              size={32}
              color={currentStatus.color}
            />
          </View>
          <Text
            style={[styles.statusLabel, { color: theme.colors.textSecondary }]}
          >
            حالة طلبك الحالية:
          </Text>
          <Text style={[styles.statusTitle, { color: currentStatus.color }]}>
            {currentStatus.label}
          </Text>
        </Card>

        {/* Support Section - RM Contact */}
        {order.rm_phone && (
          <Card style={styles.supportCard}>
            <View style={styles.supportHeader}>
              <Ionicons
                name="headset-outline"
                size={24}
                color={theme.primary}
              />
              <Text style={[styles.supportTitle, { color: theme.colors.text }]}>
                هل تحتاج للمساعدة؟
              </Text>
            </View>
            <Text
              style={[
                styles.supportDesc,
                { color: theme.colors.textSecondary },
              ]}
            >
              يمكنك التواصل مع مدير مدير المنطقة لمساعدتك في استفسارك.
            </Text>
            <View style={styles.supportActions}>
              <TouchableOpacity
                onPress={handleWhatsAppSupport}
                style={[styles.supportBtn, { backgroundColor: "#25D366" }]}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                <Text style={styles.supportBtnText}>تواصل واتساب</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCallSupport}
                style={[styles.supportBtn, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="call" size={20} color="#FFF" />
                <Text style={styles.supportBtnText}>اتصال مباشر</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Timeline */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          تاريخ الطلب
        </Text>
        <Card style={styles.timelineCard}>
          {order.history.map((h, index) => {
            const config = STATUS_CONFIG[h.status] || STATUS_CONFIG.pending;
            const isLast = index === order.history.length - 1;
            return (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: config.color },
                    ]}
                  />
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        { backgroundColor: theme.colors.border },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineStatus,
                      { color: theme.colors.text },
                    ]}
                  >
                    {config.label}
                  </Text>
                  <Text
                    style={[
                      styles.timelineDate,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    {formatLongDate(h.created_at)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Order Summary */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          تفاصيل الطلب
        </Text>
        <Card style={styles.detailsCard}>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text
                style={[styles.itemName, { color: theme.colors.textSecondary }]}
              >
                {item.product_name}
              </Text>
              <Text
                style={[styles.itemQty, { color: theme.colors.textTertiary }]}
              >
                x{item.quantity}
              </Text>
              <Text style={[styles.itemPrice, { color: theme.colors.text }]}>
                {formatCurrency(item.unit_price * item.quantity)}
              </Text>
            </View>
          ))}
          <View
            style={[
              styles.totalDivider,
              { backgroundColor: theme.colors.divider },
            ]}
          />
          <View style={styles.totalRow}>
            <Text
              style={[styles.totalLabel, { color: theme.colors.textTertiary }]}
            >
              الإجمالي
            </Text>
            <Text style={[styles.totalValue, { color: theme.primary }]}>
              {formatCurrency(order.total)}
            </Text>
          </View>
        </Card>

        <TouchableOpacity
          onPress={() => router.replace("/track")}
          style={styles.trackAnother}
        >
          <Text style={{ color: theme.primary, fontFamily: "Tajawal_700Bold" }}>
            تتبع طلب آخر
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    padding: spacing.md,
    paddingBottom: 60,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  storeHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  storeText: {
    marginEnd: spacing.md,
    alignItems: "flex-start",
  },
  storeName: { ...typography.bodyBold, fontSize: 18 },
  orderId: { ...typography.caption, marginTop: 2 },
  statusCard: {
    alignItems: "center",
    padding: spacing.xl,
    borderRadius: borderRadius.xxl,
    borderWidth: 2,
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  statusLabel: { ...typography.small, marginBottom: spacing.xs },
  statusTitle: { ...typography.h1, fontSize: 28 },
  supportCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    backgroundColor: "#6C5CE710",
    borderWidth: 0,
  },
  supportHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  supportTitle: { ...typography.bodyBold },
  supportDesc: {
    ...typography.small,
    textAlign: "right",
    marginBottom: spacing.md,
  },
  supportActions: { flexDirection: "row", gap: spacing.sm },
  supportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  supportBtnText: {
    color: "#FFF",
    fontFamily: "Tajawal_700Bold",
    fontSize: 12,
  },
  sectionTitle: {
    ...typography.h3,
    marginVertical: spacing.md,
    textAlign: "right",
  },
  timelineCard: { padding: spacing.lg, borderRadius: borderRadius.xl },
  timelineItem: { flexDirection: "row-reverse", marginBottom: spacing.lg },
  timelineLeft: { alignItems: "center", width: 24 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  timelineLine: {
    position: "absolute",
    top: 12,
    bottom: -spacing.lg,
    width: 2,
  },
  timelineContent: { marginEnd: spacing.md, flex: 1, alignItems: "flex-start" },
  timelineStatus: { ...typography.bodyBold, textAlign: "right" },
  timelineDate: { ...typography.caption, textAlign: "right" },
  detailsCard: { padding: spacing.lg, borderRadius: borderRadius.xl },
  itemRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  itemName: { ...typography.body, flex: 1, textAlign: "right" },
  itemQty: { ...typography.small, marginHorizontal: spacing.md },
  itemPrice: { ...typography.bodyBold },
  totalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  totalLabel: { ...typography.body },
  totalValue: { ...typography.h3 },
  totalDivider: { height: 1, marginVertical: spacing.sm },
  trackAnother: { padding: spacing.xl, alignItems: "center" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
});
