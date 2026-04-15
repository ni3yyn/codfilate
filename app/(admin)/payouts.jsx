import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../../src/hooks/useTheme";
import { useResponsive } from "../../src/hooks/useResponsive";
import { useAffiliateStore } from "../../src/stores/useAffiliateStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import Card from "../../src/components/ui/Card";
import Badge from "../../src/components/ui/Badge";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import Avatar from "../../src/components/ui/Avatar";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import EmptyState from "../../src/components/ui/EmptyState";
import { typography, spacing, borderRadius } from "../../src/theme/theme";
import { formatCurrency, formatDate } from "../../src/lib/utils";

const STATUS_MAP = {
  pending: { label: "قيد الانتظار", variant: "warning", icon: "time-outline" },
  paid: {
    label: "تم الدفع",
    variant: "success",
    icon: "checkmark-circle-outline",
  },
  rejected: { label: "مرفوض", variant: "error", icon: "close-circle-outline" },
  cancelled: { label: "ملغى", variant: "neutral", icon: "ban-outline" },
};

const METHOD_LABELS = {
  ccp: "بريد الجزائر (CCP)",
  baridimob: "BaridiMob",
  flexy: "فليكسي (Flexy)",
  paysera: "Paysera",
};

export default function AdminPayoutsScreen() {
  const theme = useTheme();
  const { isWide } = useResponsive();
  const { width } = useWindowDimensions();
  const { showAlert } = useAlertStore();
  const { updatePayoutStatus, fetchPayoutRequests, payoutRequests, isLoading } =
    useAffiliateStore();

  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [externalRef, setExternalRef] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    await fetchPayoutRequests({ isAdmin: true });
  }, [fetchPayoutRequests]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const copyToClipboard = async (text, label) => {
    await Clipboard.setStringAsync(text);
    showAlert({
      title: "تم النسخ",
      message: `تم نسخ ${label} إلى الحافظة`,
      type: "info",
    });
  };

  const performUpdate = async (id, status) => {
    if (status === "paid" && !externalRef.trim()) {
      Alert.alert("تنبيه", "يُفضل إدخال مرجع العملية للتوثيق. المتابعة؟", [
        { text: "إلغاء", style: "cancel" },
        { text: "موافق", onPress: () => runUpdate(id, status) },
      ]);
      return;
    }
    runUpdate(id, status);
  };

  const runUpdate = async (id, status) => {
    setIsSubmitting(true);
    const result = await updatePayoutStatus(id, status, null, {
      external_ref: externalRef.trim() || null,
      payout_proof_url: proofUrl.trim() || null,
    });
    if (result.success) {
      showAlert({
        title: "تم",
        message: "تم تحديث حالة الطلب",
        type: "success",
      });
      setExpandedId(null);
      setExternalRef("");
      setProofUrl("");
      load();
    } else showAlert({ title: "خطأ", message: result.error, type: "error" });
    setIsSubmitting(false);
  };

  // Grid calculation: 4 columns on wide, 1 on mobile
  const getCardWidth = () => {
    if (!isWide) return "100%";
    const totalPadding = spacing.md * 2;
    const gapSize = spacing.md * 3;
    const availableWidth = Math.min(width, 1400) - totalPadding - gapSize;
    return availableWidth / 4;
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="إدارة سحوبات الأموال"
        subtitle="مراجعة ومعالجة طلبات السحب من لوحة التحكم"
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.wideScroll,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && payoutRequests.length === 0 ? (
          <LoadingSpinner />
        ) : payoutRequests.length === 0 ? (
          <EmptyState icon="wallet-outline" title="لا توجد طلبات سحب" />
        ) : (
          <View style={[styles.grid, isWide && styles.wideGrid]}>
            {payoutRequests.map((item) => {
              const isExpanded = expandedId === item.id;
              const status = STATUS_MAP[item.status] || STATUS_MAP.pending;
              const cardWidth = getCardWidth();

              return (
                <View
                  key={item.id}
                  style={{ width: cardWidth, marginBottom: spacing.md }}
                >
                  <Card
                    noPadding
                    style={[styles.payoutCard]}
                    borderVariant={
                      item.status === "pending" ? "thick" : "default"
                    }
                    accentColor={
                      item.status === "pending" ? theme.primary : null
                    }
                  >
                    {/* Header Info */}
                    <View style={styles.cardInfo}>
                      <View style={styles.topRow}>
                        <Text
                          style={[styles.amount, { color: theme.colors.text }]}
                        >
                          {formatCurrency(item.amount)}
                        </Text>
                        <Badge
                          label={status.label}
                          variant={status.variant}
                          size="sm"
                        />
                      </View>

                      <View style={styles.requesterSection}>
                        <Avatar
                          name={item.requester?.full_name || "?"}
                          size={32}
                        />
                        <View style={{ flex: 1, marginStart: 8 }}>
                          <Text
                            style={[
                              styles.userName,
                              { color: theme.colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {item.requester?.full_name || "مجهول"}
                          </Text>
                          <Text
                            style={[
                              styles.userRole,
                              { color: theme.colors.textTertiary },
                            ]}
                          >
                            {item.requester?.role === "merchant"
                              ? "مورد"
                              : "مسوق"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.methodBox}>
                        <Text
                          style={[
                            styles.methodLabel,
                            { color: theme.colors.textTertiary },
                          ]}
                        >
                          العملية:
                        </Text>
                        <Text
                          style={[
                            styles.methodValue,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {METHOD_LABELS[item.method] || item.method}
                        </Text>
                      </View>

                      {isExpanded && (
                        <View style={styles.expandedContent}>
                          <View style={styles.divider} />
                          <View style={styles.detailRow}>
                            <Text
                              style={[
                                styles.detailLabel,
                                { color: theme.colors.textTertiary },
                              ]}
                            >
                              بيانات الدفع:
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                copyToClipboard(
                                  item.payment_details,
                                  "بيانات الدفع",
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.detailValue,
                                  {
                                    color: theme.primary,
                                    fontFamily: "Tajawal_700Bold",
                                  },
                                ]}
                              >
                                {item.payment_details}{" "}
                                <Ionicons name="copy-outline" size={12} />
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.adminInputs}>
                            <Input
                              label="رقم المرجع"
                              placeholder="TID..."
                              value={externalRef}
                              onChangeText={setExternalRef}
                              style={{ marginBottom: 4 }}
                            />
                            <View style={styles.hActionRow}>
                              <Button
                                title="تأكيد"
                                size="sm"
                                variant="gradient"
                                style={{ flex: 1 }}
                                onPress={() => performUpdate(item.id, "paid")}
                                loading={isSubmitting}
                              />
                              <Button
                                title="رفض"
                                size="sm"
                                variant="secondary"
                                style={{ flex: 1 }}
                                onPress={() =>
                                  performUpdate(item.id, "rejected")
                                }
                              />
                            </View>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* WIDE EXPAND BUTTON AT THE BOTTOM */}
                    {item.status === "pending" && (
                      <TouchableOpacity
                        style={[
                          styles.expandBtn,
                          {
                            backgroundColor: isExpanded
                              ? theme.colors.surface2
                              : theme.colors.card,
                          },
                        ]}
                        onPress={() =>
                          setExpandedId(isExpanded ? null : item.id)
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.expandLabel,
                            {
                              color: isExpanded
                                ? theme.primary
                                : theme.colors.textSecondary,
                            },
                          ]}
                        >
                          {isExpanded
                            ? "إخفاء التفاصيل"
                            : "عرض التفاصيل ومعالجة الطلب"}
                        </Text>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color={
                            isExpanded
                              ? theme.primary
                              : theme.colors.textTertiary
                          }
                        />
                      </TouchableOpacity>
                    )}
                  </Card>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { padding: spacing.md },
  wideScroll: { maxWidth: 1400, alignSelf: "center", width: "100%" },
  grid: { gap: spacing.md },
  wideGrid: { flexDirection: "row", flexWrap: "wrap" },
  payoutCard: { overflow: "hidden" },
  cardInfo: { padding: spacing.md },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  amount: { ...typography.h3, fontSize: 20 },
  requesterSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userName: { ...typography.bodyBold, fontSize: 14 },
  userRole: { ...typography.caption, fontSize: 10 },
  methodBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  methodLabel: { ...typography.caption, fontSize: 10 },
  methodValue: {
    ...typography.caption,
    fontSize: 11,
    fontFamily: "Tajawal_500Medium",
  },
  expandedContent: { marginTop: 12 },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginBottom: 12 },
  detailRow: { marginBottom: 12 },
  detailLabel: { ...typography.caption, fontSize: 10, marginBottom: 2 },
  detailValue: { ...typography.body, fontSize: 12 },
  adminInputs: { gap: 8 },
  hActionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  expandBtn: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  expandLabel: {
    ...typography.caption,
    fontSize: 11,
    fontFamily: "Tajawal_700Bold",
  },
});
