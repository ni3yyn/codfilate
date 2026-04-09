import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useRegionalManagerStore } from '../../src/stores/useRegionalManagerStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';
import { useAlertStore } from '../../src/stores/useAlertStore';
import Card from '../../src/components/ui/Card';
import Badge from '../../src/components/ui/Badge';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import Avatar from '../../src/components/ui/Avatar';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import EmptyState from '../../src/components/ui/EmptyState';
import { typography, spacing, borderRadius, gradients } from '../../src/theme/theme';
import { formatCurrency, formatDate } from '../../src/lib/utils';

const STATUS_MAP = {
  pending: { label: 'قيد الانتظار', variant: 'warning', icon: 'time-outline', color: '#FDCB6E' },
  paid: { label: 'تم الدفع', variant: 'success', icon: 'checkmark-circle-outline', color: '#00B894' },
  rejected: { label: 'مرفوض', variant: 'error', icon: 'close-circle-outline', color: '#FF6B6B' },
  cancelled: { label: 'ملغى', variant: 'neutral', icon: 'ban-outline', color: '#9CA3AF' },
};

const METHOD_LABELS = {
  ccp: 'بريد الجزائر (CCP)',
  baridimob: 'BaridiMob',
  flexy: 'فليكسي (Flexy)',
  paysera: 'Paysera',
};

const METHOD_ICONS = {
  ccp: 'card-outline',
  baridimob: 'phone-portrait-outline',
  flexy: 'cellular-outline',
  paysera: 'globe-outline',
};

export default function RegionalManagerPayouts() {
  const theme = useTheme();
  const { isWide, isDesktop } = useResponsive();
  const { width } = useWindowDimensions();
  const profile = useAuthStore((s) => s.profile);
  const { fetchWilayaPayoutRequests } = useRegionalManagerStore();
  const { updatePayoutStatus } = useAffiliateStore();
  const { showAlert } = useAlertStore();

  const [requests, setRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');

  const [adminNotes, setAdminNotes] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setDataReady(false);
    try {
      if (profile?.assigned_wilayas) {
        const { data } = await fetchWilayaPayoutRequests(profile.assigned_wilayas);
        if (data) setRequests(data);
      }
    } catch (e) {
      if (__DEV__) console.error('❌ [RMPayouts.loadData]', e);
    } finally {
      setDataReady(true);
    }
  }, [profile?.assigned_wilayas]);

  useEffect(() => {
    if (profile?.assigned_wilayas) loadData();
  }, [profile?.assigned_wilayas]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // Reset form when expanding a different card
  useEffect(() => {
    setAdminNotes('');
    setExternalRef('');
    setProofUrl('');
  }, [expandedId]);

  const copyToClipboard = async (text, label) => {
    await Clipboard.setStringAsync(text);
    showAlert({ title: 'تم النسخ', message: `تم نسخ ${label} إلى الحافظة`, type: 'info' });
  };

  const performUpdate = async (payoutId, status) => {
    if (status === 'paid' && !externalRef.trim()) {
      Alert.alert('تنبيه', 'يُفضل إدخال مرجع العملية للتوثيق. المتابعة؟', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'موافق', onPress: () => runUpdate(payoutId, status) },
      ]);
      return;
    }
    runUpdate(payoutId, status);
  };

  const runUpdate = async (payoutId, status) => {
    setIsSubmitting(true);
    const extra = status === 'paid' ? {
      external_ref: externalRef.trim() || null,
      payout_proof_url: proofUrl.trim() || null,
    } : {};

    const result = await updatePayoutStatus(payoutId, status, adminNotes.trim() || null, extra);
    if (result.success) {
      showAlert({ title: 'نجاح', message: 'تم تحديث حالة الطلب بنجاح', type: 'success' });
      setExpandedId(null);
      loadData(true);
    } else {
      showAlert({ title: 'خطأ', message: result.error, type: 'error' });
    }
    setIsSubmitting(false);
  };

  // --- Stats ---
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const paidRequests = requests.filter(r => r.status === 'paid');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');
  const totalPending = pendingRequests.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalPaid = paidRequests.reduce((sum, r) => sum + Number(r.amount), 0);

  // --- Filtered ---
  const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  // --- Grid ---
  const getCardWidth = () => {
    if (!isWide) return '100%';
    const totalPadding = spacing.md * 2;
    const cols = isDesktop ? 4 : 2;
    const gapSize = spacing.md * (cols - 1);
    const availableWidth = Math.min(width, 1400) - totalPadding - gapSize;
    return availableWidth / cols;
  };

  // --- Stat Cards ---
  const statCards = [
    { label: 'إجمالي الطلبات', value: requests.length, icon: 'receipt-outline', color: theme.primary },
    { label: 'في الانتظار', value: pendingRequests.length, sub: formatCurrency(totalPending), icon: 'time-outline', color: '#FDCB6E' },
    { label: 'تم الدفع', value: paidRequests.length, sub: formatCurrency(totalPaid), icon: 'checkmark-circle-outline', color: '#00B894' },
    { label: 'مرفوض', value: rejectedRequests.length, icon: 'close-circle-outline', color: '#FF6B6B' },
  ];

  const renderStatCards = () => (
    <View style={[styles.statsRow, isWide && styles.statsRowWide]}>
      {statCards.map((stat, i) => (
        <Card key={i} style={[styles.statCard, isWide && { flex: 1 }]}>
          <View style={[styles.statIconContainer, { backgroundColor: stat.color + '15' }]}>
            <Ionicons name={stat.icon} size={20} color={stat.color} />
          </View>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{stat.value}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{stat.label}</Text>
          {stat.sub && (
            <Text style={[styles.statSub, { color: stat.color }]}>{stat.sub}</Text>
          )}
        </Card>
      ))}
    </View>
  );

  // --- Filter Tabs ---
  const renderFilterTabs = () => {
    const filters = [
      { key: 'all', label: 'الكل', count: requests.length },
      { key: 'pending', label: 'بانتظار', count: pendingRequests.length },
      { key: 'paid', label: 'مدفوع', count: paidRequests.length },
      { key: 'rejected', label: 'مرفوض', count: rejectedRequests.length },
    ];
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
        {filters.map((f) => {
          const isActive = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isActive ? theme.primary : theme.colors.card,
                  borderColor: isActive ? theme.primary : theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.filterLabel, { color: isActive ? '#FFF' : theme.colors.textSecondary }]}>
                {f.label}
              </Text>
              {f.count > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : theme.colors.shimmer }]}>
                  <Text style={[styles.filterBadgeText, { color: isActive ? '#FFF' : theme.colors.textTertiary }]}>
                    {f.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // --- Payout Card ---
  const renderPayoutCard = (item) => {
    const isExpanded = expandedId === item.id;
    const canAction = item.status === 'pending';
    const status = STATUS_MAP[item.status] || STATUS_MAP.pending;
    const roleString = item.requester?.role === 'merchant' ? 'مورد' : 'مسوق';
    const storeName = item.stores?.name || 'متجر غير معروف';
    const cardWidth = getCardWidth();

    return (
      <View key={item.id} style={{ width: cardWidth, marginBottom: spacing.md }}>
        <Card
          noPadding
          style={styles.payoutCard}
          borderVariant={canAction ? 'thick' : 'default'}
          accentColor={canAction ? theme.primary : null}
        >
          {/* Card Header */}
          <View style={styles.cardInfo}>
            <View style={styles.topRow}>
              <Text style={[styles.amount, { color: theme.colors.text }]}>
                {formatCurrency(item.amount)}
              </Text>
              <Badge label={status.label} variant={status.variant} size="sm" pulse={canAction} />
            </View>

            {/* Requester Info */}
            <View style={styles.requesterSection}>
              <Avatar name={item.requester?.full_name || '?'} size={36} />
              <View style={{ flex: 1, marginStart: 10 }}>
                <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.requester?.full_name || 'طالب مجهول'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <View style={[styles.roleBadge, { backgroundColor: item.requester?.role === 'merchant' ? theme.primary + '20' : '#6C5CE720' }]}>
                    <Text style={{ fontSize: 9, fontFamily: 'Tajawal_700Bold', color: item.requester?.role === 'merchant' ? theme.primary : '#6C5CE7' }}>
                      {roleString}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="storefront-outline" size={11} color={theme.colors.textTertiary} />
                    <Text style={[styles.storeName, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                      {storeName}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Method + Date Row */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name={METHOD_ICONS[item.method] || 'card-outline'} size={13} color={theme.colors.textTertiary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {METHOD_LABELS[item.method] || item.method}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={13} color={theme.colors.textTertiary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
            </View>

            {/* Admin notes / proof (for already-processed payouts) */}
            {!canAction && (item.admin_notes || item.external_ref || item.payout_proof_url) && (
              <View style={[styles.existingNotes, { borderTopColor: theme.colors.divider }]}>
                {item.admin_notes && (
                  <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
                    💬 {item.admin_notes}
                  </Text>
                )}
                {item.external_ref && (
                  <Text style={[styles.noteText, { color: theme.primary }]}>
                    🧾 مرجع: {item.external_ref}
                  </Text>
                )}
              </View>
            )}

            {/* Expanded Section — Action Form */}
            {isExpanded && canAction && (
              <View style={styles.expandedContent}>
                <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                {/* Payment Details (copy-able) */}
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textTertiary }]}>بيانات الدفع:</Text>
                  <TouchableOpacity onPress={() => copyToClipboard(item.payment_details, 'بيانات الدفع')}>
                    <Text style={[styles.detailValue, { color: theme.primary }]}>
                      {item.payment_details} <Ionicons name="copy-outline" size={12} />
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Input Fields */}
                <View style={styles.formSection}>
                  <Input
                    label="ملاحظات (اختياري)"
                    placeholder="مثال: تم إرسال المبلغ عبر بريدي موب"
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    icon="chatbubble-ellipses-outline"
                  />
                  <Input
                    label="رقم العملية / المرجع"
                    placeholder="TID-12345"
                    value={externalRef}
                    onChangeText={setExternalRef}
                    icon="document-text-outline"
                  />
                  <Input
                    label="رابط إيصال الدفع (اختياري)"
                    placeholder="https://..."
                    value={proofUrl}
                    onChangeText={setProofUrl}
                    icon="link-outline"
                    textAlign="left"
                  />

                  <View style={styles.actionBtns}>
                    <Button
                      title="✅ تأكيد الدفع"
                      onPress={() => performUpdate(item.id, 'paid')}
                      loading={isSubmitting}
                      variant="gradient"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="❌ رفض"
                      onPress={() => performUpdate(item.id, 'rejected')}
                      loading={isSubmitting}
                      variant="secondary"
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Bottom Expand Button */}
          {canAction && (
            <TouchableOpacity
              style={[styles.expandBtn, { backgroundColor: isExpanded ? theme.colors.surface2 : theme.colors.card }]}
              onPress={() => setExpandedId(isExpanded ? null : item.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.expandLabel, { color: isExpanded ? theme.primary : theme.colors.textSecondary }]}>
                {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل ومعالجة الطلب'}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={isExpanded ? theme.primary : theme.colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader
        title="الخزينة المركزية 🏦"
        subtitle="إدارة مسحوبات الموردين والمسوقين في ولاياتك"
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={[styles.scrollContent, isWide && styles.wideScroll]}
        showsVerticalScrollIndicator={false}
      >
        {!dataReady ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Stats Cards */}
            {renderStatCards()}

            {/* Filter Tabs */}
            {requests.length > 0 && renderFilterTabs()}

            {/* Payout List / Grid */}
            {filteredRequests.length === 0 ? (
              <EmptyState
                icon="wallet-outline"
                title="لا توجد طلبات سحب"
                message={filter !== 'all' ? 'لا توجد طلبات في هذا التصنيف. جرب تصنيفاً آخر.' : 'لا يوجد طلبات سحب من المتاجر أو المسوقين في نطاق عملك حالياً.'}
              />
            ) : (
              <View style={[styles.grid, isWide && styles.wideGrid]}>
                {filteredRequests.map(renderPayoutCard)}
              </View>
            )}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { padding: spacing.md },
  wideScroll: { maxWidth: 1400, alignSelf: 'center', width: '100%' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statsRowWide: {
    flexWrap: 'nowrap',
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { ...typography.h3, fontSize: 22 },
  statLabel: { ...typography.caption, fontSize: 11, textAlign: 'center' },
  statSub: { ...typography.caption, fontSize: 11, fontFamily: 'Tajawal_700Bold', marginTop: 2 },

  // Filters
  filterScroll: { marginBottom: spacing.lg },
  filterContainer: { gap: spacing.xs, paddingHorizontal: 2 },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  filterLabel: { ...typography.small, fontFamily: 'Tajawal_700Bold' },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: { fontSize: 10, fontFamily: 'Tajawal_700Bold' },

  // Grid
  grid: { gap: spacing.md },
  wideGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  // Payout Card
  payoutCard: { overflow: 'hidden' },
  cardInfo: { padding: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  amount: { ...typography.h3, fontSize: 20 },
  requesterSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  userName: { ...typography.bodyBold, fontSize: 14 },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  storeName: { ...typography.caption, fontSize: 10 },

  // Meta row
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.caption, fontSize: 11, fontFamily: 'Tajawal_500Medium' },

  // Existing notes
  existingNotes: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, gap: 4 },
  noteText: { ...typography.small, fontStyle: 'italic' },

  // Expanded
  expandedContent: { marginTop: 12 },
  divider: { height: 1, marginBottom: 12 },
  detailRow: { marginBottom: 12 },
  detailLabel: { ...typography.caption, fontSize: 10, marginBottom: 2 },
  detailValue: { ...typography.body, fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  formSection: { gap: 4 },
  actionBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },

  // Expand button
  expandBtn: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  expandLabel: { ...typography.caption, fontSize: 11, fontFamily: 'Tajawal_700Bold' },
});
