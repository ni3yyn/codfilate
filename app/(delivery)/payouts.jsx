import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../src/hooks/useTheme";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useAffiliateStore } from "../../src/stores/useAffiliateStore";
import { useWalletStore } from "../../src/stores/useWalletStore";
import { usePlatformSettingsStore } from "../../src/stores/usePlatformSettingsStore";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import CustomAlert from "../../src/components/ui/CustomAlert";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import { useFAB } from "../../src/hooks/useFAB";
import BottomSheet from "../../src/components/ui/BottomSheet";
import { typography, spacing, borderRadius } from "../../src/theme/theme";
import { formatCurrency, formatDate } from "../../src/lib/utils";

/**
 * Premium Delivery Payouts Screen.
 * Forest/Mint theme, wallet-centric design, CustomAlert support.
 */
export default function DeliveryPayouts() {
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const fetchPlatformSettings = usePlatformSettingsStore(
    (s) => s.fetchSettings,
  );
  const minPayout = usePlatformSettingsStore(
    (s) => s.getFees().min_payout_amount,
  );

  const { wallet, ledger, fetchWallet, fetchLedger } = useWalletStore();
  const {
    payoutRequests,
    fetchPayoutRequests,
    createPayoutRequest,
    isLoading,
  } = useAffiliateStore();

  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);



  // Custom Alert state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const load = useCallback(async () => {
    await fetchPlatformSettings();
    if (!profile?.user_id) return;
    await Promise.all([
      fetchWallet(profile.user_id),
      fetchLedger(profile.user_id),
      fetchPayoutRequests({ requesterUserId: profile.user_id }),
    ]);
  }, [
    profile?.user_id,
    fetchPlatformSettings,
    fetchWallet,
    fetchLedger,
    fetchPayoutRequests,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const showAlert = (title, message, type = "info") => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const handleSubmit = async () => {
    const min = Number(minPayout) || 100;
    const n = Number(amount);

    if (!n || n < min) {
      showAlert(
        "خطأ في المبلغ",
        `الحد الأدنى للسحب هو ${formatCurrency(min)}`,
        "error",
      );
      return;
    }

    if (!details.trim()) {
      showAlert(
        "معلومات ناقصة",
        "يرجى إدخال معلومات الدفع (رقم الحساب/CCP)",
        "error",
      );
      return;
    }

    const pendingSum = payoutRequests
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + Number(r.amount), 0);

    if (n > Number(wallet?.balance ?? 0) - pendingSum) {
      showAlert(
        "رصيد غير كافٍ",
        "المبلغ المطلوب أكبر من الرصيد المتاح حالياً",
        "error",
      );
      return;
    }

    setSubmitting(true);
    const res = await createPayoutRequest({
      store_id: null,
      affiliate_id: null,
      requester_user_id: profile.user_id,
      amount: n,
      method: "ccp",
      payment_details: details.trim(),
    });
    setSubmitting(false);

    if (res.success) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert(
        "تم بنجاح",
        "لقد تم إرسال طلب السحب بنجاح. سيتم مراجعته قريباً.",
        "success",
      );
      setAmount("");
      setDetails("");
      setShowForm(false);
      load();
    } else {
      showAlert("فشل الطلب", res.error, "error");
    }
  };

  const pendingAmount = useMemo(
    () =>
      payoutRequests
        .filter((r) => r.status === "pending")
        .reduce((s, r) => s + Number(r.amount), 0),
    [payoutRequests],
  );

  const availableBalance = Number(wallet?.balance ?? 0) - pendingAmount;

  // Register the FAB for this screen
  useFAB({
    icon: 'wallet-outline',
    label: 'سحب أرباح',
    onPress: () => setShowForm(true),
    visible: !showForm,
  });

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="سحب الأجور"
        subtitle="محفظة السائق"
        actionHint={!showForm ? "أطلب سحب مستحقاتك من الزر بالأسفل" : null}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
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
        {/* Wallet Overview */}
        <Card
          style={styles.walletCard}
          accentColor={theme.primary}
          accentPosition="left"
        >
          <View style={styles.walletInner}>
            <View>
              <Text
                style={[
                  styles.balanceLabel,
                  { color: theme.colors.textTertiary },
                ]}
              >
                الرصيد المتاح للسحب
              </Text>
              <Text style={[styles.balanceValue, { color: theme.primary }]}>
                {formatCurrency(availableBalance)}
              </Text>
            </View>
            <View style={styles.balanceInfo}>
              <View style={styles.infoRow}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: theme.colors.textTertiary },
                  ]}
                />
                <Text
                  style={[
                    styles.infoText,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  إجمالي الرصيد: {formatCurrency(wallet?.balance ?? 0)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <View style={[styles.dot, { backgroundColor: "#FDCB6E" }]} />
                <Text style={[styles.infoText, { color: "#FDCB6E" }]}>
                  قيد الانتظار: {formatCurrency(pendingAmount)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Withdrawal Form */}
        {/* Withdrawal Form in BottomSheet */}
        <BottomSheet
          visible={showForm}
          onClose={() => setShowForm(false)}
          title="طلب سحب جديد"
          subtitle="سيتم مراجعة طلبك وتحويل المبلغ للمحفظة المختارة"
        >
          <View style={styles.formContainer}>
            <Input
              label="المبلغ المطلوب (دج)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={`الحد الأدنى ${minPayout || 100} دج`}
              icon="cash-outline"
            />
            <Input
              label="معلومات الدفع (CCP / رقم الحساب)"
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={3}
              placeholder="يرجى إدخال رقم الـ CCP والاسم الكامل..."
              icon="information-circle-outline"
            />
            <Button
              title="إرسال طلب السحب"
              onPress={handleSubmit}
              loading={submitting}
              style={styles.submitBtn}
            />
            <Text style={styles.formHint}>
              * تخضع جميع الطلبات للمراجعة قبل التحويل.
            </Text>
          </View>
        </BottomSheet>

        {/* Recent Payouts */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, marginTop: spacing.lg },
          ]}
        >
          سجل السحوبات
        </Text>
        {payoutRequests.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text
              style={{ color: theme.colors.textSecondary, textAlign: "center" }}
            >
              لا توجد طلبات سحب سابقة.
            </Text>
          </Card>
        ) : (
          payoutRequests.slice(0, 5).map((p) => {
            const statusColor =
              p.status === "paid"
                ? theme.primary
                : p.status === "pending"
                  ? "#FDCB6E"
                  : theme.error;
            return (
              <Card
                key={p.id}
                style={styles.payoutItem}
                borderVariant="default"
              >
                <View style={styles.payoutRow}>
                  <View>
                    <Text
                      style={[
                        styles.payoutAmount,
                        { color: theme.colors.text },
                      ]}
                    >
                      {formatCurrency(p.amount)}
                    </Text>
                    <Text
                      style={[
                        styles.payoutDate,
                        { color: theme.colors.textTertiary },
                      ]}
                    >
                      {formatDate(p.created_at)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColor + "15" },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {p.status === "paid"
                        ? "تم الدفع"
                        : p.status === "pending"
                          ? "قيد الانتظار"
                          : "مرفوض"}
                    </Text>
                  </View>
                </View>
                {(p.admin_notes || p.external_ref || p.payout_proof_url) && (
                  <View
                    style={{
                      marginTop: spacing.sm,
                      paddingTop: spacing.sm,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.divider,
                    }}
                  >
                    {p.admin_notes && (
                      <Text
                        style={{
                          ...typography.small,
                          color: theme.colors.textSecondary,
                          fontStyle: "italic",
                        }}
                      >
                        💬 ملاحظة: {p.admin_notes}
                      </Text>
                    )}
                    {p.external_ref && (
                      <Text
                        style={{
                          ...typography.small,
                          color: theme.primary,
                          marginTop: 4,
                          fontFamily: "Tajawal_500Medium",
                        }}
                      >
                        🧾 مرجع الدفع: {p.external_ref}
                      </Text>
                    )}
                    {p.payout_proof_url && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(p.payout_proof_url)}
                        style={{
                          marginTop: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: theme.primary + "15",
                          alignSelf: "flex-start",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                      >
                        <Ionicons
                          name="document-attach-outline"
                          size={16}
                          color={theme.primary}
                        />
                        <Text
                          style={{
                            color: theme.primary,
                            fontFamily: "Tajawal_700Bold",
                            marginStart: 6,
                            fontSize: 12,
                          }}
                        >
                          عرض إيصال الدفع
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </Card>
            );
          })
        )}

        {/* Ledger Movement */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, marginTop: spacing.lg },
          ]}
        >
          حركات المحفظة الأخيرة
        </Text>
        <Card style={styles.ledgerCard}>
          {ledger.length === 0 ? (
            <Text
              style={{ textAlign: "center", color: theme.colors.textTertiary }}
            >
              لا توجد حركات مؤخراً.
            </Text>
          ) : (
            ledger.slice(0, 10).map((row) => (
              <View
                key={row.id}
                style={[
                  styles.ledgerRow,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <View>
                  <Text
                    style={[styles.ledgerType, { color: theme.colors.text }]}
                  >
                    {row.ledger_type === "delivery_fee"
                      ? "أجرة توصيل"
                      : row.ledger_type}
                  </Text>
                  <Text
                    style={[
                      styles.ledgerDate,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    {formatDate(row.created_at)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.ledgerAmount,
                    {
                      color:
                        Number(row.amount) >= 0 ? theme.primary : theme.error,
                    },
                  ]}
                >
                  {Number(row.amount) >= 0 ? "+" : ""}
                  {formatCurrency(row.amount)}
                </Text>
              </View>
            ))
          )}
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>



      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={() => setAlertConfig((p) => ({ ...p, visible: false }))}
        onClose={() => setAlertConfig((p) => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  walletBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  walletCard: {
    marginTop: -spacing.lg,
    marginBottom: spacing.lg,
  },
  walletInner: { padding: 4 },
  balanceLabel: {
    fontSize: 12,
    fontFamily: "Tajawal_500Medium",
    marginBottom: 4,
  },
  balanceValue: { fontFamily: "Tajawal_800ExtraBold", fontSize: 32 },
  balanceInfo: { marginTop: 12, gap: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  infoText: { fontSize: 11, fontFamily: "Tajawal_500Medium" },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  formContainer: { paddingVertical: spacing.sm },
  submitBtn: { marginTop: spacing.md },
  formHint: {
    ...typography.caption,
    textAlign: "center",
    marginTop: 12,
    opacity: 0.6,
  },
  payoutItem: { marginBottom: spacing.sm },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payoutAmount: { ...typography.bodyBold, fontSize: 16 },
  payoutDate: { ...typography.caption, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontFamily: "Tajawal_700Bold" },
  ledgerCard: { padding: spacing.sm },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  ledgerType: { ...typography.bodyBold, fontSize: 14 },
  ledgerDate: { fontSize: 11, fontFamily: "Tajawal_500Medium", marginTop: 2 },
  ledgerAmount: { fontFamily: "Tajawal_700Bold", fontSize: 15 },
  emptyCard: { padding: spacing.xl, alignItems: "center" },
  bottomSpacer: { height: 100 },
});
