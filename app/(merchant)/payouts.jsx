import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Hooks & Stores
import { useTheme } from "../../src/hooks/useTheme";
import { useResponsive } from "../../src/hooks/useResponsive";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useAffiliateStore } from "../../src/stores/useAffiliateStore";
import { usePlatformSettingsStore } from "../../src/stores/usePlatformSettingsStore";
import { useWalletStore } from "../../src/stores/useWalletStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import { useFAB } from "../../src/hooks/useFAB";

// UI Components
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import Modal from "../../src/components/ui/Modal";
import BottomSheet from "../../src/components/ui/BottomSheet";
import ResponsiveModal from "../../src/components/ui/ResponsiveModal";
import Card from "../../src/components/ui/Card";
import Badge from "../../src/components/ui/Badge";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";

// Utils & Theme
import { typography, spacing, borderRadius, gradients } from "../../src/theme/theme";
import { formatCurrency, formatDate } from "../../src/lib/utils";

const PAYOUT_METHODS = [
  { id: "ccp", label: "CCP / بريد الجزائر", icon: "card-outline" },
  { id: "baridimob", label: "BaridiMob", icon: "phone-portrait-outline" },
  { id: "flexy", label: "Flexy / فليكسي", icon: "cellular-outline" },
];

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

// --- Extracted Helper Components ---

const PayoutHistoryCard = React.memo(({ item, theme }) => (
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
    accentPosition="right"
  >
    <View style={styles.payoutHeader}>
      <View style={styles.payoutMethodRow}>
        <View style={[styles.payoutIconWrap, { backgroundColor: theme.colors.surface2 }]}>
          <Ionicons
            name={PAYOUT_METHODS.find((m) => m.id === item.method)?.icon || "wallet-outline"}
            size={20}
            color={theme.primary}
          />
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.payoutMethodName, { color: theme.colors.text }]}>
            {PAYOUT_METHODS.find((m) => m.id === item.method)?.label || item.method}
          </Text>
          <Text style={[styles.payoutDate, { color: theme.colors.textTertiary }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
      <Badge
        label={PAYOUT_STATUS_AR[item.status] || item.status}
        variant={PAYOUT_BADGE[item.status] || "neutral"}
        pulse={item.status === "pending"}
        size="small"
      />
    </View>

    <View style={styles.payoutBody}>
      <View style={styles.payoutDetailsRow}>
        <View style={styles.payoutDetailItem}>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {formatCurrency(item.amount)}
          </Text>
          <Text style={[styles.detailLabel, { color: theme.colors.textTertiary }]}>المبلغ الإجمالي</Text>
        </View>
        <View style={[styles.payoutDetailItem, { borderRightWidth: 1, borderRightColor: theme.colors.divider, paddingRight: spacing.md }]}>
          <Text style={[styles.detailValueSecondary, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.payment_details || "---"}
          </Text>
          <Text style={[styles.detailLabel, { color: theme.colors.textTertiary }]}>بيانات التحويل</Text>
        </View>
      </View>
    </View>

    {(item.admin_notes || item.external_ref || item.payout_proof_url) && (
      <View style={[styles.notesBox, { borderTopColor: theme.colors.divider }]}>
        {item.admin_notes && (
          <View style={styles.noteLine}>
             <Ionicons name="chatbubble-outline" size={14} color={theme.colors.textSecondary} />
             <Text style={[styles.notesText, { color: theme.colors.textSecondary }]}>
               {item.admin_notes}
             </Text>
          </View>
        )}
        {item.external_ref && (
          <View style={styles.noteLine}>
             <Ionicons name="receipt-outline" size={14} color={theme.primary} />
             <Text style={[styles.refText, { color: theme.primary }]}>
               مرجع: {item.external_ref}
             </Text>
          </View>
        )}
        {item.payout_proof_url && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL(item.payout_proof_url)}
            style={[styles.proofBtn, { backgroundColor: theme.primary + "10" }]}
          >
            <Ionicons name="cloud-download-outline" size={16} color={theme.primary} />
            <Text style={[styles.proofBtnText, { color: theme.primary }]}>إيصال الدفع</Text>
          </TouchableOpacity>
        )}
      </View>
    )}
  </Card>
));

// --- Main Component ---

export default function MerchantPayouts() {
  const theme = useTheme();
  const { isWide } = useResponsive();

  const profile = useAuthStore((s) => s.profile);
  const fetchPlatformSettings = usePlatformSettingsStore((s) => s.fetchSettings);
  const minPayout = usePlatformSettingsStore((s) => s.getFees().min_payout_amount);

  const { wallet, ledger, fetchWallet, fetchLedger } = useWalletStore();
  const { showAlert } = useAlertStore();

  const { payoutRequests, fetchPayoutRequests, createPayoutRequest, isLoading } = useAffiliateStore();

  const [refreshing, setRefreshing] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("ccp");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNoBalanceModal, setShowNoBalanceModal] = useState(false);

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
    [profile?.user_id]
  );

  useEffect(() => {
    if (profile?.user_id) loadData();
  }, [profile?.user_id, loadData]);

  // Exact auto-fill logic restored
  useEffect(() => {
    if (!profile) return;
    if (method === "ccp") {
      const ccp = profile.ccp_number || "";
      const key = profile.ccp_key || "";
      setDetails(key ? `${ccp} / ${key}` : ccp);
    }
    else if (method === "baridimob") setDetails(profile.baridimob_number || "");
    else if (method === "flexy") setDetails(profile.flexy_number || "");
  }, [method, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // Exact Memoized Balance Calculations
  const pendingOut = useMemo(() =>
    payoutRequests.filter((r) => r.status === "pending").reduce((sum, r) => sum + Number(r.amount), 0),
    [payoutRequests]);

  const paidOut = useMemo(() =>
    payoutRequests.filter((r) => r.status === "paid").reduce((sum, r) => sum + Number(r.amount), 0),
    [payoutRequests]);

  const availableBalance = Number(wallet?.balance ?? 0) - pendingOut;

  useFAB({
    icon: "cash-outline",
    label: "سحب أموال",
    onPress: () => {
      if (availableBalance <= 0) {
        setShowNoBalanceModal(true);
      } else {
        setShowForm(true);
      }
    },
    visible: !showForm && dataReady,
  });

  const handleRequest = async () => {
    const min = Number(minPayout) || 1000;

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

    if (Number(amount) > availableBalance) {
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
      await loadData(true);
    } else {
      showAlert({ title: "خطأ", message: result.error, type: "error" });
    }
    setIsSubmitting(false);
  };

  const renderNoBalanceContent = () => (
    <View style={styles.noBalanceContent}>
      <View style={[styles.infoIconWrap, { backgroundColor: theme.primary + "15" }]}>
        <Ionicons name="information-circle-outline" size={48} color={theme.primary} />
      </View>
      <Text style={[styles.infoTitle, { color: theme.colors.text }]}>لا يوجد رصيد متاح للسحب</Text>
      <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
        عذراً، رصيدك الحالي هو {formatCurrency(0)}. لتتمكن من طلب سحب، يجب أن تكون لديك مبيعات ناجحة تم توصيلها للزبائن وتحصيل ثمنها.
      </Text>
      <View style={[styles.stepBox, { backgroundColor: theme.colors.surface2 }]}>
        <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>
          ✅ أضف منتجاتك في تبويب المنتجات.{"\n"}
          ✅ سيقوم المسوقون بالترويج لها.{"\n"}
          ✅ عند تسليم الطلب، تضاف الأرباح لرصيدك فوراً.
        </Text>
      </View>
      <Button
        title="فهمت"
        onPress={() => setShowNoBalanceModal(false)}
        variant="primary"
        style={{ marginTop: spacing.xl, width: "100%" }}
      />
    </View>
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
                borderColor: method === m.id ? theme.primary : theme.colors.border,
                backgroundColor: method === m.id ? theme.primary + "10" : theme.colors.surface,
              },
            ]}
          >
            <Ionicons
              name={m.icon}
              size={20}
              color={method === m.id ? theme.primary : theme.colors.textSecondary}
              style={{ marginStart: spacing.xs }}
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
        <Text style={[styles.helperCaption, { color: theme.colors.textTertiary }]}>
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <UniversalHeader
        title="سحب أموال المبيعات"
        subtitle="إدارة وتبسيط عمليات سحب مستحقاتك من المنصة"
        actionHint="أطلب سحب رصيدك من الزر بالأسفل"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {!dataReady ? (
          <LoadingSpinner />
        ) : (
          <View style={[styles.grid, isWide && styles.gridWide]}>

            {/* Sidebar / Top Section (Stats & Ledger) */}
            <View style={[styles.sidebar, isWide && styles.sidebarWide]}>
              <View style={[styles.helperBox, { backgroundColor: theme.primary + "10" }]}>
                <Ionicons name="information-circle-outline" size={22} color={theme.primary} />
                <Text style={[styles.helperText, { color: theme.primary }]}>
                  تقوم بطلب أموال المبيعات الناجحة من المدير الإقليمي لولايتك مباشرة.
                </Text>
              </View>

              <View style={styles.balanceRow}>
                <Card gradient gradientColors={gradients.primary} style={[styles.balanceCard, { flex: 1 }]}>
                  <Text style={styles.balanceLabel}>الرصيد المتاح للسحب</Text>
                  <Text style={styles.balanceValue}>{formatCurrency(availableBalance)}</Text>
                  <View style={styles.balanceDivider} />
                  <Text style={styles.balanceSubtext}>الحد الأدنى: {Number(minPayout) || 100} دج</Text>
                </Card>

                <View style={styles.metricsColumn}>
                  <Card style={styles.metricCard}>
                    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>في الانتظار</Text>
                    <Text style={[styles.metricValue, { color: "#FDCB6E" }]}>{formatCurrency(pendingOut)}</Text>
                  </Card>
                  <Card style={styles.metricCard}>
                    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>إجمالي المسحوب</Text>
                    <Text style={[styles.metricValue, { color: "#00B894" }]}>{formatCurrency(paidOut)}</Text>
                  </Card>
                </View>
              </View>

              {/* Added ScrollView here for Ledger items */}
              {ledger.length > 0 && (
                <Card style={styles.ledgerCard}>
                  <Text style={[styles.ledgerTitle, { color: theme.colors.text }]}>
                    حركة حساب المورد
                  </Text>
                  <ScrollView
                    style={styles.ledgerScrollContainer}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    {ledger.slice(0, 15).map((row) => {
                      const isPositive = Number(row.amount) >= 0;
                      return (
                        <View key={row.id} style={styles.ledgerRow}>
                          <View style={styles.ledgerIdentity}>
                            <View style={[styles.ledgerIcon, { backgroundColor: isPositive ? "#00B89415" : "#FF6B6B15" }]}>
                              <Ionicons 
                                name={isPositive ? "arrow-down-circle-outline" : "arrow-up-circle-outline"} 
                                size={14} 
                                color={isPositive ? "#00B894" : "#FF6B6B"} 
                              />
                            </View>
                            <Text style={[styles.ledgerRowText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                              {row.ledger_type === 'credit_settlement' ? 'تسوية رصيد' : row.ledger_type} {row.ref_id ? `· ${row.ref_id.slice(0, 8)}` : ""}
                            </Text>
                          </View>
                          <Text style={[styles.ledgerRowAmount, { color: isPositive ? "#00B894" : "#FF6B6B" }]}>
                            {isPositive ? "+" : ""}
                            {formatCurrency(row.amount)}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </Card>
              )}
            </View>

            {/* Main Content Section (History) */}
            <View style={[styles.mainContent, isWide && styles.mainContentWide]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                سجل السحوبات
              </Text>

              {isLoading && payoutRequests.length === 0 ? (
                <LoadingSpinner />
              ) : payoutRequests.length === 0 ? (
                <EmptyState icon="wallet-outline" title="لا توجد طلبات سحب" message="ستظهر طلبات السحب الخاصة بك هنا." />
              ) : (
                payoutRequests.map((item) => <PayoutHistoryCard key={item.id} item={item} theme={theme} />)
              )}
            </View>
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modals with internal constrained sizing managed via ScrollView */}
      <ResponsiveModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="طلب سحب جديد"
        subtitle="سيتم مراجعة طلبك وتحويل المبلغ خلال ساعات العمل"
        maxWidth={600}
      >
        {renderPayoutForm()}
      </ResponsiveModal>

      <ResponsiveModal
        visible={showNoBalanceModal}
        onClose={() => setShowNoBalanceModal(false)}
        title="رصيدك الحالي صفر"
        subtitle="كيف يمكنك البدء في سحب الأموال؟"
        maxWidth={500}
      >
        {renderNoBalanceContent()}
      </ResponsiveModal>

    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { padding: spacing.md },

  // Responsive Grid
  grid: { flex: 1, flexDirection: "column", gap: spacing.lg },
  gridWide: { flexDirection: "row", alignItems: "flex-start" },
  sidebar: { width: "100%", flexDirection: "column", gap: spacing.md },
  sidebarWide: { width: "38%", position: "sticky", top: spacing.md },
  mainContent: { width: "100%", flex: 1 },
  mainContentWide: { width: "60%" },

  // Helper Banner
  helperBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm
  },
  helperText: {
    ...typography.small,
    fontFamily: "Tajawal_500Medium",
    flex: 1,
    textAlign: "right",
    lineHeight: 20,
  },

  // Balance Card Restored Row Layout
  balanceRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  metricsColumn: { gap: spacing.md, width: "38%" },

  balanceCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  balanceLabel: {
    ...typography.caption,
    fontFamily: "Tajawal_500Medium",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  balanceValue: {
    ...typography.h1,
    fontFamily: "Tajawal_700Bold",
    color: "#FFFFFF",
    fontSize: 28,
  },
  balanceDivider: {
    width: 30,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 1,
    marginVertical: spacing.sm,
  },
  balanceSubtext: {
    ...typography.caption,
    fontFamily: "Tajawal_500Medium",
    color: "rgba(255,255,255,0.6)",
    fontSize: 10
  },

  // Mini Metric Cards
  metricCard: { flex: 1, padding: spacing.sm, justifyContent: "center", alignItems: "center", borderLeftWidth: 3 },
  metricLabel: { ...typography.caption, fontFamily: "Tajawal_500Medium", fontSize: 11 },
  metricValue: { ...typography.bodyBold, fontFamily: "Tajawal_700Bold", marginTop: 2, fontSize: 14 },

  // Ledger Section
  ledgerCard: { padding: spacing.md, marginBottom: spacing.md },
  ledgerTitle: { ...typography.bodyBold, fontFamily: "Tajawal_700Bold", marginBottom: spacing.md, textAlign: "right" },
  ledgerScrollContainer: { maxHeight: 260 },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  ledgerIdentity: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  ledgerIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  ledgerRowAmount: { ...typography.caption, fontFamily: "Tajawal_700Bold", textAlign: "left" },
  ledgerRowText: { ...typography.caption, fontFamily: "Tajawal_500Medium", flex: 1, textAlign: "right", fontSize: 11 },

  // History Titles
  sectionTitle: {
    ...typography.h4,
    fontFamily: "Tajawal_700Bold",
    marginBottom: spacing.md,
    textAlign: "right",
  },

  // Payout History Card
  payoutCard: { marginBottom: spacing.md, padding: 0, overflow: "hidden" },
  payoutHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.03)" },
  payoutMethodRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  payoutIconWrap: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: "center", justifyContent: "center" },
  payoutMethodName: { ...typography.bodyBold, fontFamily: "Tajawal_700Bold", textAlign: "right", fontSize: 14 },
  payoutDate: { ...typography.caption, fontFamily: "Tajawal_400Regular", textAlign: "right", marginTop: 2, fontSize: 11 },

  payoutBody: { padding: spacing.md },
  payoutDetailsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  payoutDetailItem: { flex: 1, alignItems: "flex-end" },
  detailLabel: { ...typography.caption, fontFamily: "Tajawal_400Regular", marginTop: 2, textAlign: "right", color: 'rgba(0,0,0,0.4)' },
  detailValue: { fontFamily: "Tajawal_700Bold", fontSize: 20, textAlign: "right" },
  detailValueSecondary: { ...typography.small, fontFamily: "Tajawal_500Medium", textAlign: "right", opacity: 0.8 },

  notesBox: { padding: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, backgroundColor: "rgba(0,0,0,0.01)", gap: 6 },
  noteLine: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  notesText: { ...typography.small, fontFamily: "Tajawal_400Regular", textAlign: "right", flex: 1 },
  refText: { ...typography.small, fontFamily: "Tajawal_500Medium", textAlign: "right" },
  proofBtn: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: 6
  },
  proofBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 12 },

  // Form Styles (In ScrollView)
  formContainer: { paddingVertical: spacing.sm, flexGrow: 1, paddingHorizontal: 4 },
  label: { ...typography.small, fontFamily: "Tajawal_500Medium", marginBottom: spacing.xs, marginTop: spacing.sm, textAlign: "right" },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  methodBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    minWidth: "45%",
    flex: 1,
    gap: 8
  },
  methodText: { ...typography.small, fontFamily: "Tajawal_500Medium" },
  helperCaption: { ...typography.caption, fontFamily: "Tajawal_400Regular", marginTop: -spacing.xs, marginBottom: spacing.md, textAlign: "right" },

  // No Balance Empty State
  noBalanceContent: { alignItems: "center", paddingVertical: spacing.md, flexGrow: 1, paddingHorizontal: 4 },
  infoIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  infoTitle: { ...typography.h3, fontFamily: "Tajawal_700Bold", marginBottom: spacing.sm, textAlign: "center" },
  infoText: { ...typography.body, fontFamily: "Tajawal_400Regular", textAlign: "center", marginBottom: spacing.lg, lineHeight: 24 },
  stepBox: { padding: spacing.md, borderRadius: borderRadius.lg, width: "100%", borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" },
  stepText: { ...typography.small, fontFamily: "Tajawal_500Medium", lineHeight: 26, textAlign: "right" },

  bottomSpacer: { height: 120 },
});