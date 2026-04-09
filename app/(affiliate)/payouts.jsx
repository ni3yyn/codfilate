import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Linking,
  useWindowDimensions,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';
import { usePlatformSettingsStore } from '../../src/stores/usePlatformSettingsStore';
import { useWalletStore } from '../../src/stores/useWalletStore';
import { useAlertStore } from '../../src/stores/useAlertStore';

import UniversalHeader from '../../src/components/ui/UniversalHeader';
import FAB from '../../src/components/ui/FAB';
import BottomSheet from '../../src/components/ui/BottomSheet';
import Card from '../../src/components/ui/Card';
import Badge from '../../src/components/ui/Badge';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';

import { typography, spacing, borderRadius, gradients } from '../../src/theme/theme';
import { formatCurrency, formatDate } from '../../src/lib/utils';

const PAYOUT_METHODS = [
  { id: 'ccp', label: 'CCP / بريد الجزائر', icon: 'card-outline' },
  { id: 'baridimob', label: 'BaridiMob', icon: 'phone-portrait-outline' },
  { id: 'flexy', label: 'Flexy', icon: 'cellular-outline' },
];

const PAYOUT_STATUS_AR = {
  pending: 'قيد الانتظار',
  paid: 'تم الدفع',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
};

const PAYOUT_BADGE = {
  pending: 'warning',
  paid: 'success',
  rejected: 'error',
  cancelled: 'neutral',
};

export default function AffiliatePayouts() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  
  // Responsive Layout Logic (Enhanced for Web Dashboard)
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;
  const isWebModal = Platform.OS === 'web' && width > 768;
  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 850 : '100%';

  const profile = useAuthStore((s) => s.profile);
  const fetchPlatformSettings = usePlatformSettingsStore((s) => s.fetchSettings);
  const minPayout = usePlatformSettingsStore((s) => s.getFees().min_payout_amount);
  const { wallet, ledger, fetchWallet, fetchLedger } = useWalletStore();
  const { showAlert } = useAlertStore();
  
  const {
    affiliateProfile,
    payoutRequests,
    fetchAffiliateProfile,
    fetchPayoutRequests,
    createPayoutRequest,
    isLoading,
  } = useAffiliateStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('ccp');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation Value for Web Fade
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    await fetchPlatformSettings();
    if (profile?.user_id) {
      await Promise.all([
        fetchWallet(profile.user_id),
        fetchLedger(profile.user_id),
      ]);
    }
    if (profile?.store_id) {
      await fetchAffiliateProfile(profile.store_id);
    }
    if (profile?.user_id) {
      await fetchPayoutRequests({ requesterUserId: profile.user_id });
    }
  }, [profile, fetchPlatformSettings, fetchWallet, fetchLedger, fetchAffiliateProfile, fetchPayoutRequests]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle Web Fade Animation
  useEffect(() => {
    if (isWebModal) {
      Animated.timing(fadeAnim, {
        toValue: showForm ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showForm, isWebModal]);

  // Auto-fill details based on selected method
  useEffect(() => {
    if (!profile) return;
    if (method === 'ccp') setDetails(profile.ccp_number || '');
    else if (method === 'baridimob') setDetails(profile.baridimob_number || '');
    else if (method === 'flexy') setDetails(profile.flexy_number || '');
  }, [method, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openModal = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowForm(true);
  };

  const closeModal = () => {
    if (isWebModal) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowForm(false);
      });
    } else {
      setShowForm(false);
    }
  };

  const handleRequest = async () => {
    const min = Number(minPayout) || 100;
    if (!amount || isNaN(amount) || Number(amount) < min) {
      showAlert({ title: 'خطأ', message: `يرجى إدخال مبلغ صالح (أقل مبلغ ${min} د.ج)`, type: 'error' });
      return;
    }

    if (!details.trim()) {
      showAlert({ title: 'خطأ', message: 'يرجى إدخال معلومات الدفع (رقم الحساب مثلاً)', type: 'error' });
      return;
    }

    const walletBal = Number(wallet?.balance ?? 0);
    const pendingOut = payoutRequests
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const available = walletBal - pendingOut;

    if (Number(amount) > available) {
      showAlert({ title: 'خطأ', message: 'المبلغ المطلوب أكبر من الرصيد المتاح', type: 'error' });
      return;
    }

    if (!affiliateProfile?.id) {
      showAlert({ title: 'خطأ', message: 'تعذر تحميل ملف المسوق. حاول لاحقاً.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    const result = await createPayoutRequest({
      store_id: profile.store_id || null,
      affiliate_id: affiliateProfile.id,
      requester_user_id: profile.user_id,
      amount: Number(amount),
      method,
      payment_details: details.trim(),
    });

    if (result.success) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showAlert({ title: 'نجاح', message: 'تم إرسال طلب السحب بنجاح', type: 'success' });
      setAmount('');
      closeModal();
    } else {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showAlert({ title: 'خطأ', message: result.error, type: 'error' });
    }
    setIsSubmitting(false);
  };

  // Financial Calculations
  const pendingAmount = payoutRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount), 0);
  const paidAmount = payoutRequests.filter(r => r.status === 'paid').reduce((sum, r) => sum + Number(r.amount), 0);
  const availableBalance = Number(wallet?.balance ?? 0) - pendingAmount;

  // Render Ledger Row
  const renderLedgerRow = (row, index, isLast) => {
    const isIncome = Number(row.amount) >= 0;
    const amountColor = isIncome ? '#00B894' : theme.colors.text;
    const IconName = isIncome ? 'arrow-down-outline' : 'arrow-up-outline';
    const IconBg = isIncome ? '#00B89415' : theme.colors.surface2;

    return (
      <View key={row.id} style={[styles.ledgerRow, !isLast && { borderBottomColor: theme.colors.border, borderBottomWidth: 1 }]}>
        <View style={styles.ledgerInfo}>
          <View style={[styles.ledgerIconWrap, { backgroundColor: IconBg }]}>
            <Ionicons name={IconName} size={16} color={isIncome ? '#00B894' : theme.colors.textSecondary} />
          </View>
          <View style={styles.ledgerTextWrap}>
            <Text style={[styles.ledgerTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {row.ledger_type === 'affiliate_commission' ? 'عمولة تسويق' : row.ledger_type === 'payout' ? 'سحب أرباح' : row.ledger_type}
            </Text>
            {!!row.ref_id && (
              <Text style={[styles.ledgerSub, { color: theme.colors.textTertiary }]}>
                مرجع: {row.ref_id.slice(0, 8).toUpperCase()}
              </Text>
            )}
          </View>
        </View>
        <Text style={[styles.ledgerAmount, { color: amountColor }]}>
          {isIncome ? '+' : ''}{formatCurrency(row.amount)}
        </Text>
      </View>
    );
  };

  // Render Payout Request Card
  const renderPayout = ({ item }) => (
    <Card style={styles.payoutCard} activeOpacity={0.9}>
      <View style={styles.payoutHeader}>
        <View style={styles.payoutMethodRow}>
          <View style={[styles.payoutIconWrap, { backgroundColor: theme.colors.surface2 }]}>
            <Ionicons name={PAYOUT_METHODS.find(m => m.id === item.method)?.icon || 'wallet-outline'} size={18} color={theme.colors.textSecondary} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.payoutMethodName, { color: theme.colors.text }]}>
              {PAYOUT_METHODS.find(m => m.id === item.method)?.label || item.method}
            </Text>
            <Text style={[styles.payoutDate, { color: theme.colors.textTertiary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
        <Badge
          label={PAYOUT_STATUS_AR[item.status] || item.status}
          variant={PAYOUT_BADGE[item.status] || 'neutral'}
          pulse={item.status === 'pending'}
        />
      </View>
      
      <View style={[styles.payoutBody, { borderTopColor: theme.colors.border }]}>
        <View style={styles.payoutAmountRow}>
          <Text style={[typography.body, { color: theme.colors.textSecondary }]}>المبلغ المطلوب:</Text>
          <Text style={[typography.h3, { color: theme.colors.text, writingDirection: 'rtl' }]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        {(item.admin_notes || item.external_ref || item.payout_proof_url) && (
          <View style={[styles.payoutNotesWrapper, { backgroundColor: theme.primary + '0A', borderColor: theme.primary + '20' }]}>
            {item.admin_notes && (
              <Text style={[styles.notesText, { color: theme.colors.textSecondary }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} /> {item.admin_notes}
              </Text>
            )}
            {item.external_ref && (
              <Text style={[styles.notesText, { color: theme.primary, fontFamily: 'Tajawal_700Bold', marginTop: 4 }]}>
                <Ionicons name="receipt-outline" size={14} /> مرجع الدفع: {item.external_ref}
              </Text>
            )}
            {item.payout_proof_url && (
              <TouchableOpacity onPress={() => Linking.openURL(item.payout_proof_url)} style={[styles.proofBtn, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="document-attach-outline" size={16} color={theme.primary} />
                <Text style={[styles.proofBtnText, { color: theme.primary }]}>عرض إيصال الدفع</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Card>
  );

  // --- REUSABLE FORM CONTENT ---
  const renderFormContent = () => (
    <View style={styles.formContainer}>
      <Input
        label="المبلغ المطلوب (DZD)"
        value={amount}
        onChangeText={setAmount}
        placeholder="مثال: 5000"
        keyboardType="numeric"
        icon="cash-outline"
      />
      
      <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>طريقة السحب</Text>
      <View style={styles.methodGrid}>
        {PAYOUT_METHODS.map((m) => {
          const isSelected = method === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                setMethod(m.id);
              }}
              activeOpacity={0.7}
              style={[
                styles.methodBtn,
                { 
                  borderColor: isSelected ? theme.primary : theme.colors.border,
                  backgroundColor: isSelected ? theme.primary + '0A' : theme.colors.surface,
                },
              ]}
            >
              <View style={styles.methodIconRow}>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                ) : <View style={{ width: 20 }} />}
                <Ionicons name={m.icon} size={20} color={isSelected ? theme.primary : theme.colors.textSecondary} />
              </View>
              <Text style={[styles.methodText, { color: isSelected ? theme.primary : theme.colors.text }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Input
        label={
          method === 'ccp' ? 'رقم الحساب البريدي (CCP)' :
          method === 'baridimob' ? 'رقم بريدي موب (RIP/BaridiMob)' :
          'رقم الهاتف للفليكسي'
        }
        value={details}
        onChangeText={setDetails}
        placeholder="أدخل معلوماتك هنا..."
        icon={PAYOUT_METHODS.find(m => m.id === method)?.icon}
      />
      
      {!details && (
        <View style={[styles.helperBox, { backgroundColor: theme.colors.surface2 }]}>
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
            يمكنك حفظ بيانات الدفع في الصفحة الشخصية لتظهر هنا تلقائياً.
          </Text>
          <Ionicons name="bulb-outline" size={16} color={theme.colors.textSecondary} />
        </View>
      )}

      <Button
        title="تأكيد وإرسال الطلب"
        onPress={handleRequest}
        loading={isSubmitting}
        variant="gradient"
        style={{ marginTop: spacing.lg }}
      />
    </View>
  );

  // --- RENDER WEB OVERLAY (CENTERED MODAL WITH FLEX HEADER) ---
  const renderWebOverlay = () => {
    if (!isWebModal || !showForm) return null;
    return (
      <Modal transparent visible={showForm} animationType="none">
        <Animated.View style={[styles.webModalOverlay, { opacity: fadeAnim }]}>
          <View style={[styles.webModalContainer, { backgroundColor: theme.colors.surface }]}>
            
            {/* Proper Web Header with aligned Close Button */}
            <View style={styles.webModalHeaderRow}>
              <TouchableOpacity onPress={closeModal} style={[styles.webModalCloseBtn, { backgroundColor: theme.colors.surface2 }]}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
              <View style={styles.webModalHeaderTexts}>
                <Text style={[styles.webModalTitle, { color: theme.colors.text }]}>طلب سحب جديد</Text>
                <Text style={[styles.webModalSubtitle, { color: theme.colors.textSecondary }]}>سيتم مراجعة طلبك وتحويل المبلغ للطريقة المختارة</Text>
              </View>
            </View>

            {renderFormContent()}
          </View>
        </Animated.View>
      </Modal>
    );
  };

  // --- RENDER MOBILE BOTTOM SHEET (SLIDE IN) ---
  const renderMobileSheet = () => {
    if (isWebModal || !showForm) return null;
    return (
      <BottomSheet
        visible={showForm}
        onClose={closeModal}
        title="طلب سحب جديد"
        subtitle="سيتم مراجعة طلبك وتحويل المبلغ للطريقة المختارة"
      >
        {renderFormContent()}
      </BottomSheet>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="المالية والسحوبات" 
        subtitle="إدارة وتبسيط عمليات سحب مستحقاتك"
      />

      <View style={styles.centerWrapper}>
        <ScrollView 
          style={styles.container}
          contentContainerStyle={[styles.contentContainer, { maxWidth: contentMaxWidth }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO DASHBOARD SECTION */}
          <View style={[styles.heroSection, isDesktop && styles.desktopHeroRow]}>
            <LinearGradient 
              colors={gradients.primary} 
              style={[styles.balanceCard, isDesktop && styles.desktopBalanceCard]} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }}
            >
              {/* Decorative Background Elements */}
              <View style={styles.cardCircle1} />
              <View style={styles.cardCircle2} />
              
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>الرصيد المتاح للسحب</Text>
                <Ionicons name="wallet-outline" size={24} color="rgba(255,255,255,0.8)" />
              </View>
              <Text style={[styles.balanceValue, { writingDirection: 'rtl' }]}>
                {formatCurrency(availableBalance)}
              </Text>
              <View style={styles.balanceFooter}>
                <Text style={styles.balanceSubtext}>الحد الأدنى: {Number(minPayout) || 100} د.ج</Text>
              </View>
            </LinearGradient>

            <View style={[styles.statsRow, isDesktop && styles.desktopStatsStack]}>
               {/* Pending Stat Card */}
               <Card style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={styles.statHeader}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>في الانتظار</Text>
                    <View style={[styles.statIconWrap, { backgroundColor: '#FDCB6E15' }]}>
                      <Ionicons name="time-outline" size={18} color="#FDCB6E" />
                    </View>
                  </View>
                  <Text style={[styles.statValue, { color: '#FDCB6E', writingDirection: 'rtl' }]}>
                    {formatCurrency(pendingAmount)}
                  </Text>
               </Card>
               
               {/* Paid Stat Card */}
               <Card style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={styles.statHeader}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>إجمالي المسحوب</Text>
                    <View style={[styles.statIconWrap, { backgroundColor: '#00B89415' }]}>
                      <Ionicons name="checkmark-done-outline" size={18} color="#00B894" />
                    </View>
                  </View>
                  <Text style={[styles.statValue, { color: '#00B894', writingDirection: 'rtl' }]}>
                    {formatCurrency(paidAmount)}
                  </Text>
               </Card>
            </View>
          </View>

          {/* MAIN CONTENT DASHBOARD GRID (For Web Multi-Column) */}
          <View style={isDesktop ? styles.desktopContentRow : null}>
            
            {/* Right Column: Payout History */}
            <View style={[styles.sectionWrapper, isDesktop && styles.desktopHistoryCol]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>سجل السحوبات</Text>
              
              {isLoading && payoutRequests.length === 0 ? (
                <LoadingSpinner />
              ) : payoutRequests.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="لا توجد طلبات سحب"
                  message="ستظهر طلبات السحب والحوالات الخاصة بك هنا."
                />
              ) : (
                payoutRequests.map((item) => <View key={item.id}>{renderPayout({ item })}</View>)
              )}
            </View>

            {/* Left Column: Ledger */}
            {ledger.length > 0 && (
              <View style={[styles.sectionWrapper, isDesktop && styles.desktopLedgerCol]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>حركة المحفظة</Text>
                <Card style={[styles.ledgerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  {ledger.slice(0, 8).map((row, index) => renderLedgerRow(row, index, index === Math.min(ledger.length - 1, 7)))}
                </Card>
              </View>
            )}

          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      <FAB 
        label="سحب أرباح" 
        icon="cash-outline"
        onPress={openModal} 
        visible={!showForm && availableBalance >= (Number(minPayout) || 100)}
      />

      {renderWebOverlay()}
      {renderMobileSheet()}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centerWrapper: { flex: 1, alignItems: 'center' },
  container: { flex: 1, width: '100%' },
  contentContainer: { padding: spacing.md, alignSelf: 'center', width: '100%' },
  
  // Mobile Hero Default
  heroSection: { marginBottom: spacing.xl },
  balanceCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    marginBottom: spacing.sm,
  },
  
  // Desktop Hero Adjustments
  desktopHeroRow: { flexDirection: 'row-reverse', gap: spacing.lg, alignItems: 'stretch' },
  desktopBalanceCard: { flex: 1.5, marginBottom: 0 },
  desktopStatsStack: { flex: 1, flexDirection: 'column', gap: spacing.md },

  // Background Elements
  cardCircle1: { position: 'absolute', top: -50, right: -20, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)' },
  cardCircle2: { position: 'absolute', bottom: -80, left: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' },
  
  balanceHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  balanceLabel: { ...typography.body, color: 'rgba(255,255,255,0.8)', fontFamily: 'Tajawal_500Medium' },
  balanceValue: { fontFamily: 'Tajawal_800ExtraBold', color: '#FFFFFF', fontSize: 38, textAlign: 'right', marginVertical: spacing.xs },
  balanceFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: spacing.sm, marginTop: spacing.sm },
  balanceSubtext: { ...typography.caption, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },

  // Stats Card Layout (Strict Right-To-Left Alignments)
  statsRow: { flexDirection: 'row-reverse', gap: spacing.sm },
  statCard: { 
    flex: 1, 
    borderWidth: 1, 
    padding: spacing.md, 
    borderRadius: borderRadius.lg,
    alignItems: 'flex-end', // Crucial: Anchors children to right edge
    justifyContent: 'center',
  },
  statHeader: { 
    flexDirection: 'row-reverse', // Icon on Right, Text on Left
    justifyContent: 'flex-start', 
    alignItems: 'center', 
    gap: spacing.sm,
    width: '100%', 
    marginBottom: spacing.xs 
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statLabel: { ...typography.caption, textAlign: 'right', fontFamily: 'Tajawal_500Medium' },
  statValue: { ...typography.h3, textAlign: 'right', width: '100%' },

  // Desktop Content Layout Split
  desktopContentRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: spacing.xl },
  desktopHistoryCol: { flex: 1.5, marginBottom: 0 },
  desktopLedgerCol: { flex: 1, marginBottom: 0 },

  // Shared Section Styles
  sectionWrapper: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md, textAlign: 'right' },

  // Ledger Styles
  ledgerCard: { paddingHorizontal: spacing.md, borderWidth: 1 },
  ledgerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  ledgerInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, flex: 1 },
  ledgerIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ledgerTextWrap: { flex: 1, alignItems: 'flex-end' },
  ledgerTitle: { ...typography.bodyBold, fontSize: 14, textAlign: 'right' },
  ledgerSub: { ...typography.caption, marginTop: 2, textAlign: 'right' },
  ledgerAmount: { fontFamily: 'Tajawal_700Bold', fontSize: 15, writingDirection: 'rtl' },

  // Payout History Styles
  payoutCard: { marginBottom: spacing.md, padding: 0, borderWidth: 1, borderColor: 'transparent' },
  payoutHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  payoutMethodRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  payoutIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payoutMethodName: { ...typography.bodyBold, textAlign: 'right' },
  payoutDate: { ...typography.caption, textAlign: 'right', marginTop: 2 },
  
  payoutBody: { padding: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1 },
  payoutAmountRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  
  payoutNotesWrapper: { marginTop: spacing.md, padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1 },
  notesText: { ...typography.small, textAlign: 'right', lineHeight: 22 },
  proofBtn: { marginTop: 8, flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  proofBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 12 },

  // --- FORM STYLES ---
  formContainer: { paddingVertical: spacing.sm, width: '100%' },
  formLabel: { ...typography.small, marginBottom: spacing.sm, marginTop: spacing.md, textAlign: 'right', fontFamily: 'Tajawal_700Bold' },
  
  methodGrid: { flexDirection: 'row-reverse', gap: spacing.sm, marginBottom: spacing.lg },
  methodBtn: { flex: 1, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1.5, alignItems: 'flex-end' },
  methodIconRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%', marginBottom: spacing.sm },
  methodText: { ...typography.small, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  
  helperBox: { flexDirection: 'row-reverse', alignItems: 'center', padding: spacing.sm, borderRadius: borderRadius.md, gap: spacing.sm, marginTop: -spacing.xs, marginBottom: spacing.md },
  helperText: { flex: 1, ...typography.caption, textAlign: 'right', lineHeight: 20 },

  // --- WEB OVERLAY SPECIFIC STYLES ---
  webModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  webModalContainer: {
    width: 550, // Professional desktop dialog width
    maxWidth: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
  },
  webModalHeaderRow: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  webModalHeaderTexts: { flex: 1, alignItems: 'flex-end', marginEnd: spacing.md },
  webModalTitle: { ...typography.h2, textAlign: 'right', marginBottom: spacing.xs },
  webModalSubtitle: { ...typography.body, textAlign: 'right' },
  webModalCloseBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center',
  },

  bottomSpacer: { height: 120 },
});