import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../src/hooks/useTheme";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useAffiliateStore } from "../../src/stores/useAffiliateStore";
import { usePlatformSettingsStore } from "../../src/stores/usePlatformSettingsStore";
import { useWalletStore } from "../../src/stores/useWalletStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import { useFAB } from "../../src/hooks/useFAB";
import BottomSheet from "../../src/components/ui/BottomSheet";
import Modal from "../../src/components/ui/Modal";
import Card from "../../src/components/ui/Card";
import Badge from "../../src/components/ui/Badge";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import {
  typography,
  spacing,
  borderRadius,
  gradients,
} from "../../src/theme/theme";
import { formatCurrency, formatDate } from "../../src/lib/utils";

const PAYOUT_METHODS = [
  { id: "ccp", label: "CCP / بريد الجزائر", icon: "card-outline" },
  { id: "baridimob", label: "BaridiMob", icon: "phone-portrait-outline" },
  { id: "flexy", label: "Flexy / فليكسي", icon: "cellular-outline" },
];

export default function MerchantPayouts() {
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const fetchPlatformSettings = usePlatformSettingsStore(
    (s) => s.fetchSettings,
  );
  const minPayout = usePlatformSettingsStore(
    (s) => s.getFees().min_payout_amount,
  );
  const { wallet, ledger, fetchWallet, fetchLedger } = useWalletStore();
  const { showAlert } = useAlertStore();

  // Note: We use useAffiliateStore for the generic payout request CRUD functions
  const {
    payoutRequests,
    fetchPayoutRequests,
    createPayoutRequest,
    isLoading,
  } = useAffiliateStore();

  const [refreshing, setRefreshing] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("ccp");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setDataReady(false);
      try {
        await fetchPlatformSettings();
        if (profile?.user_id) {
          await Promise.all([
            fetchWallet(profile.user_id),
            fetchLedger(profile.user_id),
            fetchPayoutRequests(),
          ]);
        }
      } catch (e) {
        if (__DEV__) console.error("❌ [MerchantPayouts.loadData]", e);
      } finally {
        setDataReady(true);
      }
    },
    [profile?.user_id],
  );

  useEffect(() => {
    if (profile?.user_id) loadData();
  }, [profile?.user_id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // Auto-fill details based on selected method
  useEffect(() => {
    if (!profile) return;
    if (method === "ccp") setDetails(profile.ccp_number || "");
    else if (method === "baridimob") setDetails(profile.baridimob_number || "");
    else if (method === "flexy") setDetails(profile.flexy_number || "");
  }, [method, profile]);

  // Register the FAB for this screen
  useFAB({
    icon: 'cash-outline',
    label: 'سحب أموال',
    onPress: () => setShowForm(true),
    visible: !showForm,
  });

  const handleRequest = async () => {
    const min = Number(minPayout) || 1000; // Merchants typically have higher minimums, fallback to 1000
    if (!amount || isNaN(amount) || Number(amount) < min) {
      showAlert({
        title: "خطأ",
        message: `يرجى إدخال مبلغ صالح (أقل مبلغ ${min} دج)`,
        type: "error",
      });
      return;
    }

    if (!details.trim()) {
      showAlert({
        title: "خطأ",
        message: "يرجى إدخال معلومات الدفع (رقم الحساب مثلاً)",
        type: "error",
      });
      return;
    }

    if (!profile.store_id) {
      showAlert({
        title: "خطأ",
        message: "لم يتم ربط حسابك بمتجر. يرجى التواصل مع الإدارة.",
        type: "error",
      });
      return;
    }

    const walletBal = Number(wallet?.balance ?? 0);
    const pendingOut = payoutRequests
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const available = walletBal - pendingOut;

    if (Number(amount) > available) {
      showAlert({
        title: "خطأ",
        message: "المبلغ المطلوب أكبر من الرصيد المتاح",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await createPayoutRequest({
      store_id: profile.store_id,
      affiliate_id: null,
      requester_user_id: profile.user_id,
      amount: Number(amount),
      method,
      payment_details: details.trim(),
    });

    if (result.success) {
      showAlert({
        title: "نجاح",
        message: "تم إرسال طلب السحب للمدير الإقليمي بنجاح",
        type: "success",
      });
      setAmount("");
      setDetails("");
      setShowForm(false);
      await loadData(true); // Refresh data to update balance
    } else {
      showAlert({ title: "خطأ", message: result.error, type: "error" });
    }
    setIsSubmitting(false);
  };

  const availableBalance =
    Number(wallet?.balance ?? 0) -
    payoutRequests
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + Number(r.amount), 0);

  const PAYOUT_STATUS_AR = {
    pending: "قيد الانتظار",
    paid: "تم الدفع",
    rejected: "مرفوض",
    cancelled: "ملغى",
  };

  const PAYOUT_BADGE = {
    pending: "warning",
    paid: "success",
    rejected: "error",
    cancelled: "neutral",
  };

  const renderPayout = ({ item }) => (
    <Card
      style={styles.payoutCard}
      accentColor={
        item.status === "paid"
          ? "#00B894"
          : item.status === "pending"
            ? "#FDCB6E"
            : item.status === "rejected"
              ? "#FF6B6B"
              : "#9CA3AF"
      }
      accentPosition="left"
    >
      <View style={styles.payoutRow}>
        <View style={styles.payoutInfo}>
          <Text style={[styles.payoutAmount, { color: theme.colors.text }]}>
            {formatCurrency(item.amount)}
          </Text>
          <Text
            style={[styles.payoutDate, { color: theme.colors.textTertiary }]}
          >
            {formatDate(item.created_at)}
          </Text>
          <Text
            style={[styles.payoutMethod, { color: theme.colors.textSecondary }]}
          >
            {PAYOUT_METHODS.find((m) => m.id === item.method)?.label ||
              item.method}
          </Text>
        </View>
        <Badge
          label={PAYOUT_STATUS_AR[item.status] || item.status}
          variant={PAYOUT_BADGE[item.status] || "neutral"}
          pulse={item.status === "pending"}
        />
      </View>
      {(item.admin_notes || item.external_ref || item.payout_proof_url) && (
        <View
          style={[styles.notesBox, { borderTopColor: theme.colors.divider }]}
        >
          {item.admin_notes && (
            <Text
              style={[styles.notesText, { color: theme.colors.textSecondary }]}
            >
              💬 ملاحظة: {item.admin_notes}
            </Text>
          )}
          {item.external_ref && (
            <Text
              style={[
                styles.notesText,
                {
                  color: theme.primary,
                  marginTop: 4,
                  fontFamily: "Tajawal_500Medium",
                },
              ]}
            >
              🧾 مرجع الدفع: {item.external_ref}
            </Text>
          )}
          {item.payout_proof_url && (
            <TouchableOpacity
              onPress={() => Linking.openURL(item.payout_proof_url)}
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

  const renderPayoutForm = () => (
    <View style={styles.formContainer}>
      <Input
        label="المبلغ المطلوب (DZD)"
        value={amount}
        onChangeText={setAmount}
        placeholder="مثال: 15000"
        keyboardType="numeric"
        icon="cash-outline"
      />

      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        طريقة السحب
      </Text>
      <View style={styles.methodGrid}>
        {PAYOUT_METHODS.map((m) => (
          <TouchableOpacity
            key={m.id}
            onPress={() => setMethod(m.id)}
            activeOpacity={0.7}
            style={[
              styles.methodBtn,
              {
                borderColor:
                  method === m.id ? theme.primary : theme.colors.border,
                backgroundColor:
                  method === m.id ? theme.primary + "10" : "transparent",
              },
            ]}
          >
            <Ionicons
              name={m.icon}
              size={18}
              color={
                method === m.id ? theme.primary : theme.colors.textSecondary
              }
              style={styles.methodIcon}
            />
            <Text
              style={[
                styles.methodText,
                { color: method === m.id ? theme.primary : theme.colors.text },
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input
        label={
          method === "ccp"
            ? "رقم الحساب البريدي (CCP)"
            : method === "baridimob"
              ? "رقم بريدي موب (BaridiMob)"
              : "رقم الهاتف للفليكسي"
        }
        value={details}
        onChangeText={setDetails}
        placeholder="أدخل معلوماتك هنا..."
        icon={PAYOUT_METHODS.find((m) => m.id === method)?.icon}
      />

      {!details && (
        <Text
          style={{
            ...typography.caption,
            color: theme.colors.textTertiary,
            marginTop: -spacing.xs,
            marginBottom: spacing.md,
            marginHorizontal: 4,
          }}
        >
          💡 يمكنك حفظ بيانات الدفع في الإعدادات لتظهر هنا تلقائياً.
        </Text>
      )}

      <Button
        title="إرسال الطلب للمدير"
        onPress={handleRequest}
        loading={isSubmitting}
        variant="gradient"
        style={{ marginTop: spacing.md }}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="سحب أموال المبيعات"
        subtitle="إدارة وتبسيط عمليات سحب مستحقاتك من المنصة"
        actionHint={!showForm ? "أطلب سحب رصيدك من الزر بالأسفل" : null}
      />

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {!dataReady ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Helper Note for Merchant workflow */}
            <View
              style={[
                styles.helperBox,
                { backgroundColor: theme.primary + "10" },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.helperText, { color: theme.primary }]}>
                تقوم بطلب أموال المبيعات الناجحة من المدير الإقليمي لولايتك
                مباشرة.
              </Text>
            </View>

            {/* Balance Card Section */}
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                marginBottom: spacing.lg,
              }}
            >
              <Card
                gradient
                gradientColors={gradients.primary}
                style={[styles.balanceCard, { flex: 1 }]}
              >
                <Text style={styles.balanceLabel}>الرصيد المتاح للسحب</Text>
                <Text style={styles.balanceValue}>
                  {formatCurrency(availableBalance)}
                </Text>
                <View style={styles.balanceDivider} />
                <Text style={styles.balanceSubtext}>
                  الحد الأدنى: {Number(minPayout) || 100} دج
                </Text>
              </Card>

              <View style={{ gap: spacing.sm, width: "38%" }}>
                <Card
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      ...typography.caption,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    في الانتظار
                  </Text>
                  <Text
                    style={{
                      ...typography.bodyBold,
                      color: "#FDCB6E",
                      marginTop: 4,
                    }}
                  >
                    {formatCurrency(
                      payoutRequests
                        .filter((r) => r.status === "pending")
                        .reduce((sum, r) => sum + Number(r.amount), 0),
                    )}
                  </Text>
                </Card>
                <Card
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      ...typography.caption,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    إجمالي المسحوب
                  </Text>
                  <Text
                    style={{
                      ...typography.bodyBold,
                      color: "#00B894",
                      marginTop: 4,
                    }}
                  >
                    {formatCurrency(
                      payoutRequests
                        .filter((r) => r.status === "paid")
                        .reduce((sum, r) => sum + Number(r.amount), 0),
                    )}
                  </Text>
                </Card>
              </View>
            </View>

            {ledger.length > 0 && (
              <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
                <Text
                  style={[
                    typography.bodyBold,
                    { color: theme.colors.text, marginBottom: spacing.sm },
                  ]}
                >
                  حركة حساب المورد
                </Text>
                {ledger.slice(0, 12).map((row) => (
                  <View
                    key={row.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.caption,
                        color: theme.colors.textSecondary,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {row.ledger_type}{" "}
                      {row.ref_id ? `· ${row.ref_id.slice(0, 8)}` : ""}
                    </Text>
                    <Text
                      style={{
                        ...typography.caption,
                        color: Number(row.amount) >= 0 ? "#00B894" : "#FF6B6B",
                        fontFamily: "Tajawal_700Bold",
                      }}
                    >
                      {Number(row.amount) >= 0 ? "+" : ""}
                      {formatCurrency(row.amount)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {Platform.OS === "web" ? (
              <Modal
                visible={showForm}
                onClose={() => setShowForm(false)}
                title="طلب سحب جديد"
                subtitle="سيتم مراجعة طلبك وتحويل المبلغ خلال ساعات العمل"
                maxWidth={600}
              >
                {renderPayoutForm()}
              </Modal>
            ) : (
              <BottomSheet
                visible={showForm}
                onClose={() => setShowForm(false)}
                title="طلب سحب جديد"
                subtitle="سيتم مراجعة طلبك وتحويل المبلغ خلال ساعات العمل"
              >
                {renderPayoutForm()}
              </BottomSheet>
            )}

            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              سجل السحوبات
            </Text>

            {isLoading && payoutRequests.length === 0 ? (
              <LoadingSpinner />
            ) : payoutRequests.length === 0 ? (
              <EmptyState
                icon="wallet-outline"
                title="لا توجد طلبات سحب"
                message="ستظهر طلبات السحب الخاصة بك هنا."
              />
            ) : (
              payoutRequests.map((item) => (
                <View key={item.id}>{renderPayout({ item })}</View>
              ))
            )}

            <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: spacing.md },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  helperBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  helperText: {
    ...typography.small,
    fontFamily: "Tajawal_500Medium",
    flex: 1,
    marginStart: 8,
  },
  balanceCard: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    ...typography.body,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 4,
  },
  balanceValue: { ...typography.h1, color: "#FFFFFF", fontSize: 34 },
  balanceDivider: {
    width: 40,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 1,
    marginVertical: spacing.sm,
  },
  balanceSubtext: { ...typography.caption, color: "rgba(255,255,255,0.5)" },
  formContainer: { paddingVertical: spacing.sm },
  formTitle: { ...typography.h3, marginBottom: spacing.md },
  label: {
    ...typography.small,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  methodBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    minWidth: "48%",
    flex: 1,
  },
  methodIcon: { marginEnd: spacing.xs },
  methodText: { ...typography.small, fontFamily: "Tajawal_500Medium" },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  payoutCard: { marginBottom: spacing.sm },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payoutInfo: { flex: 1, gap: 2 },
  payoutAmount: { ...typography.bodyBold },
  payoutDate: { ...typography.caption },
  payoutMethod: { ...typography.caption },
  notesBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  notesText: { ...typography.small, fontStyle: "italic" },
  bottomSpacer: { height: 100 },
});
