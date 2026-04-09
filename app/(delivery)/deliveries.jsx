import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Linking, Platform, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDeliveryStore } from '../../src/stores/useDeliveryStore';
import Card from '../../src/components/ui/Card';
import StatCard from '../../src/components/ui/StatCard';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import Button from '../../src/components/ui/Button';
import BottomSheet from '../../src/components/ui/BottomSheet';
import { useAlertStore } from '../../src/stores/useAlertStore';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency } from '../../src/lib/utils';
import { TRACKING_STATUS_AR, ORDER_STATUS_COLORS } from '../../src/lib/constants';

const STATUS_FLOW = {
  pending: { next: 'picked_up', label: 'استلام الطرد', icon: 'cube-outline', color: '#6C5CE7' },
  assigned: { next: 'picked_up', label: 'استلام الطرد', icon: 'cube-outline', color: '#6C5CE7' },
  picked_up: { next: 'in_transit', label: 'في الطريق', icon: 'car-outline', color: '#00CEC9' },
  in_transit: { next: 'delivered', label: 'تم التوصيل ✓', icon: 'checkmark-circle-outline', color: '#2D6A4F' },
};

/**
 * Premium Delivery Management Screen.
 * Forest/Mint theme, solid surfaces, driver-optimized UI.
 */
export default function DeliveryScreen() {
  const theme = useTheme();
  const profile = useAuthStore(s => s.profile);
  const { deliveryRequests, fetchDeliveryRequests, updateDeliveryStatus, stats, fetchDeliveryStats, isLoading } = useDeliveryStore();
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert, showConfirm } = useAlertStore();

  const [failModalVisible, setFailModalVisible] = useState(false);
  const [failRequestId, setFailRequestId] = useState(null);
  const [failReason, setFailReason] = useState('');

  const loadData = useCallback(async () => {
    if (profile?.id) {
      await Promise.all([
        fetchDeliveryRequests(profile.id),
        fetchDeliveryStats(profile.id),
      ]);
    }
  }, [profile?.id, fetchDeliveryRequests, fetchDeliveryStats]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStatusUpdate = (requestId, newStatus) => {
    const label = newStatus === 'delivered' ? 'تأكيد التوصيل ✓' : TRACKING_STATUS_AR[newStatus];

    showConfirm({
      title: label,
      message: 'هل أنت متأكد من تغيير حالة التوصيل لهذا الطلب؟',
      confirmText: 'تأكيد',
      type: newStatus === 'delivered' ? 'success' : 'default',
      onConfirm: async () => {
        const res = await updateDeliveryStatus(requestId, newStatus);
        if (res.success) {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showAlert({ title: 'تم', message: 'تم تحديث حالة الطلب بنجاح ✓', type: 'success' });
          fetchDeliveryStats(profile.id);
        } else {
          showAlert({ title: 'خطأ', message: res.error, type: 'destructive' });
        }
      }
    });
  };

  const handleFail = async () => {
    if (!failReason.trim()) {
      return;
    }
    const res = await updateDeliveryStatus(failRequestId, 'failed', '', failReason.trim());
    if (res.success) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFailModalVisible(false);
      setFailReason('');
      showAlert({ title: 'تم', message: 'تم تسجيل فشل التوصيل بنجاح.', type: 'warning' });
      fetchDeliveryStats(profile.id);
    } else {
      showAlert({ title: 'خطأ', message: res.error, type: 'destructive' });
    }
  };

  const callCustomer = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const renderDelivery = ({ item }) => {
    const statusColor = ORDER_STATUS_COLORS[item.status] || '#9CA3AF';
    const statusLabel = TRACKING_STATUS_AR[item.status] || item.status;
    const nextAction = STATUS_FLOW[item.status];
    const order = item.orders;

    return (
      <Card style={styles.deliveryCard} accentColor={statusColor} accentPosition="left">
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '10' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={[styles.feeText, { color: theme.primary }]}>
            +{formatCurrency(item.delivery_fee || 0)}
          </Text>
        </View>

        <View style={styles.customerSection}>
          <Text style={[styles.customerName, { color: theme.colors.text }]}>
            {item.customer_name || order?.customer_name || 'عميل'}
          </Text>

          <TouchableOpacity
            style={[styles.phoneRow, { backgroundColor: theme.primary + '10' }]}
            onPress={() => callCustomer(item.customer_phone || order?.customer_phone)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={20} color={theme.primary} />
            <Text style={[styles.phoneText, { color: theme.primary }]}>
              {item.customer_phone || order?.customer_phone || '—'}
            </Text>
          </TouchableOpacity>

          {!!(item.customer_address || order?.customer_address) && (
            <View style={styles.addressRow}>
              <Ionicons name="location" size={16} color={theme.colors.textTertiary} />
              <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                {item.customer_address || order?.customer_address}
              </Text>
            </View>
          )}
        </View>

        {!!(order?.order_items?.length > 0) && (
          <View style={[styles.productsSection, { borderTopColor: theme.colors.border }]}>
            {order.order_items.map((oi, i) => (
              <Text key={i} style={[styles.productItem, { color: theme.colors.textTertiary }]}>
                • {oi.product_name} × {oi.quantity}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.deliveryMeta}>
           <View style={styles.metaItem}>
              <Ionicons name={item.delivery_type === 'office' ? 'business-outline' : 'home-outline'} size={14} color={theme.colors.textTertiary} />
              <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
                {item.delivery_type === 'office' ? 'توصيل للمكتب' : 'توصيل للمنزل'}
              </Text>
           </View>
           {item.wilayas && (
             <View style={styles.metaDivider}>
                <View style={[styles.dot, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>{item.wilayas.name}</Text>
             </View>
           )}
        </View>

        {/* Share Tracking Link */}
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}
          activeOpacity={0.7}
          onPress={() => {
            const trackingUrl = `https://codfilate.com/track/${item.order_id || order?.id}`;
            Clipboard.setString(trackingUrl);
            showAlert({ title: 'تم النسخ', message: 'تم نسخ رابط التتبع بنجاح.', type: 'success' });
          }}
        >
          <Ionicons name="share-social-outline" size={16} color={theme.primary} />
          <Text style={[styles.shareBtnText, { color: theme.primary }]}>نسخ رابط التتبع للعميل</Text>
        </TouchableOpacity>

        <View style={styles.actionsSection}>
          {nextAction && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: nextAction.color === '#00B894' ? theme.primary : nextAction.color }]}
              onPress={() => handleStatusUpdate(item.id, nextAction.next)}
              activeOpacity={0.8}
            >
              <Ionicons name={nextAction.icon} size={20} color="#fff" />
              <Text style={styles.actionBtnText}>{nextAction.label}</Text>
            </TouchableOpacity>
          )}

          {(item.status === 'picked_up' || item.status === 'in_transit') && (
            <TouchableOpacity
              style={[styles.failBtn, { borderColor: theme.error + '40' }]}
              onPress={() => {
                setFailRequestId(item.id);
                setFailModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={18} color={theme.error} />
              <Text style={[styles.failBtnText, { color: theme.error }]}>توصيل فاشل</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="التوصيلات" 
        subtitle={`${stats.pendingDeliveries} توصيلات نشطة حالياً`} 
      />

      <View style={styles.quickStats}>
        <StatCard
          title="نشطة"
          value={stats.pendingDeliveries}
          icon="time"
          color={theme.primary}
        />
        <StatCard
          title="أكملت اليوم"
          value={stats.completedToday}
          icon="checkmark-done"
          color="#00B894"
        />
        <StatCard
          title="الأرباح"
          value={formatCurrency(stats.totalEarned)}
          icon="wallet"
          color="#00CEC9"
        />
      </View>

      {isLoading && deliveryRequests.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={deliveryRequests}
          keyExtractor={item => item.id}
          renderItem={renderDelivery}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={theme.primary} 
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-done-circle-outline"
              title="لا توجد توصيلات حالياً"
              message="سيظهر أي طلب توصيل يتم تعيينه لك هنا"
            />
          }
        />
      )}

      {/* Fail Reason Sheet */}
      <BottomSheet
        visible={failModalVisible}
        onClose={() => {
          setFailModalVisible(false);
          setFailReason('');
        }}
        title="سبب فشل التوصيل"
        subtitle="يرجى توضيح سبب عدم القدرة على تسليم هذا الطلب"
      >
        <View style={styles.formContainer}>
          <TextInput
            style={[styles.modalInput, {
              color: theme.colors.text,
              backgroundColor: theme.colors.surface2,
              borderColor: theme.colors.border,
            }]}
            value={failReason}
            onChangeText={setFailReason}
            placeholder="مثال: العميل لا يرد أو العنوان خاطئ..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.modalFooter}>
            <Button
              title="تأكيد"
              onPress={handleFail}
              style={{ flex: 1 }}
            />
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setFailModalVisible(false);
                setFailReason('');
              }}
            >
              <Text style={{ color: theme.colors.textSecondary, fontFamily: 'Tajawal_700Bold' }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  quickStats: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: -spacing.lg,
  },
  listContent: { padding: spacing.md, paddingBottom: 100 },
  deliveryCard: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  feeText: { ...typography.bodyBold, fontSize: 18 },
  customerSection: { marginBottom: spacing.md },
  customerName: { ...typography.h3, marginBottom: 8 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  phoneText: { ...typography.h2, fontSize: 22, letterSpacing: 1 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressText: { ...typography.body, flex: 1, fontSize: 13 },
  productsSection: {
    paddingTop: 10,
    marginBottom: 12,
    borderTopWidth: 1,
  },
  productItem: { ...typography.caption, marginBottom: 4 },
  deliveryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaDivider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  metaText: { fontSize: 12, fontFamily: 'Tajawal_500Medium' },
  actionsSection: { gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  actionBtnText: { color: '#FFF', fontFamily: 'Tajawal_700Bold', fontSize: 16 },
  failBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  failBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 14 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  formContainer: { paddingVertical: spacing.sm },
  modalTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.md },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    minHeight: 100,
    ...typography.body,
    textAlign: 'right',
  },
  modalFooter: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  cancelBtn: { paddingHorizontal: 20 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  shareBtnText: {
    ...typography.small,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 13,
  },
});
