import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, Platform, ScrollView, Clipboard, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { getEffectiveWilayaIds } from '../../src/lib/profileUtils';
import { useRegionalManagerStore } from '../../src/stores/useRegionalManagerStore';
import { useAlertStore } from '../../src/stores/useAlertStore';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import BottomSheet from '../../src/components/ui/BottomSheet';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Badge from '../../src/components/ui/Badge';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency } from '../../src/lib/utils';
import { ORDER_STATUS_AR, ORDER_STATUS_COLORS } from '../../src/lib/constants';

const STATUS_FILTERS = [
  { key: null, label: 'الكل', icon: 'list' },
  { key: 'pending', label: 'طلبات جديدة', icon: 'alert-circle' },
  { key: 'confirmed_by_manager', label: 'مؤكدة', icon: 'checkmark-circle' },
  { key: 'in_transit', label: 'قيد التوصيل', icon: 'bicycle' },
  { key: 'delivered', label: 'تم التوصيل', icon: 'gift' },
  { key: 'returned', label: 'مرتجعة', icon: 'return-down-back' },
];

// Helper map to determine what the "Undo/Step Back" status should be
const PREVIOUS_STATUS_MAP = {
  confirmed_by_manager: 'pending',
  in_transit: 'confirmed_by_manager',
  delivered: 'in_transit',
  returned: 'in_transit',
  cancelled: 'pending',
};

export default function RegionalManagerOrders() {
  const theme = useTheme();
  const { highlight } = useLocalSearchParams();
  const profile = useAuthStore(s => s.profile);
  const { 
    orders, fetchWilayaOrders, confirmOrder, updateOrderLifecycleStatus, 
    isLoading, fetchInventory, inventory, fulfillFromStock
  } = useRegionalManagerStore();
  const { showAlert, showConfirm } = useAlertStore();
  
  const [statusFilter, setStatusFilter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Bottom Sheet States
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Track currently processing order for loading states
  const [processingOrderId, setProcessingOrderId] = useState(null);
  
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState(null);
  const [returnReason, setReturnReason] = useState('');

  const wilayaIds = useMemo(() => getEffectiveWilayaIds(profile), [profile]);

  const loadOrders = useCallback(async () => {
    const ids = wilayaIds.length > 0 ? wilayaIds : null;
    await Promise.all([fetchWilayaOrders(ids, statusFilter), fetchInventory(ids)]);
  }, [wilayaIds, statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (highlight && orders.some((o) => o.id === highlight)) {
      setExpandedId(highlight);
    }
  }, [highlight, orders]);

  const onRefresh = async () => { 
    setRefreshing(true); 
    await loadOrders(); 
    setRefreshing(false); 
  };

  // --- ACTIONS ---

  const handleConfirmOrder = (order) => {
    showConfirm({
      title: 'تأكيد الطلب',
      message: `هل أنت متأكد من تأكيد طلب العميل ${order.customer_name}؟`,
      confirmText: 'تأكيد الطلب',
      cancelText: 'تراجع',
      type: 'success',
      onConfirm: async () => {
        setProcessingOrderId(order.id);
        const res = await confirmOrder(order.id, profile.id, order.wilaya_id, order.store_id, order);
        if (res.success) {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showAlert({ title: 'نجاح', message: 'تم تأكيد الطلب وجاري تجهيزه.', type: 'success' });
          await loadOrders();
        } else {
          showAlert({ title: 'خطأ', message: res.error, type: 'error' });
        }
        setProcessingOrderId(null);
      }
    });
  };

  const handleFastTrack = (order) => {
    showConfirm({
      title: 'شحن فوري',
      message: 'المنتجات متوفرة في مستودعك. هل تريد خصم المخزون وشحن الطلب فوراً؟',
      confirmText: 'نعم، شحن الآن',
      cancelText: 'إلغاء',
      type: 'info',
      onConfirm: async () => {
        setProcessingOrderId(order.id);
        const res = await fulfillFromStock(order.id, profile.id);
        if (res.success) {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showAlert({ title: 'نجاح', message: 'تم التجهيز والشحن فوراً.', type: 'success' });
          await loadOrders();
        } else {
          showAlert({ title: 'خطأ', message: res.error, type: 'error' });
        }
        setProcessingOrderId(null);
      }
    });
  };

  const handleStatusAdvance = async (orderId, nextStatus, successMessage) => {
    setProcessingOrderId(orderId);
    const res = await updateOrderLifecycleStatus(orderId, nextStatus);
    if (res.success) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showAlert({ title: 'تم التحديث', message: successMessage, type: 'success' });
      await loadOrders();
    } else {
      showAlert({ title: 'خطأ', message: res.error, type: 'error' });
    }
    setProcessingOrderId(null);
  };

  // The New "Undo / Step Back" Function
  const handleRevertStatus = (order) => {
    const prevStatus = PREVIOUS_STATUS_MAP[order.status];
    if (!prevStatus) return;

    const prevLabel = ORDER_STATUS_AR[prevStatus] || prevStatus;

    showConfirm({
      title: 'تراجع عن الحالة',
      message: `هل أنت متأكد من إرجاع حالة الطلب إلى "${prevLabel}"؟`,
      confirmText: 'نعم، تراجع',
      cancelText: 'إلغاء',
      type: 'warning',
      onConfirm: async () => {
        setProcessingOrderId(order.id);
        const res = await updateOrderLifecycleStatus(order.id, prevStatus, 'تراجع المشرف للحالة السابقة');
        if (res.success) {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showAlert({ title: 'نجاح', message: 'تم إرجاع حالة الطلب بنجاح.', type: 'info' });
          await loadOrders();
        } else {
          showAlert({ title: 'خطأ', message: res.error, type: 'error' });
        }
        setProcessingOrderId(null);
      }
    });
  };

  const handleRejectOrReturn = async (orderId, type, reason) => {
    setProcessingOrderId(orderId);
    const nextStatus = type === 'cancel' ? 'cancelled' : 'returned';
    const res = await updateOrderLifecycleStatus(orderId, nextStatus, reason);
    if (res.success) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRejectModalVisible(false);
      setReturnModalVisible(false);
      setRejectReason('');
      setReturnReason('');
      showAlert({ title: 'تم', message: `تم تحديث الطلب كـ ${ORDER_STATUS_AR[nextStatus]}.`, type: 'success' });
      await loadOrders();
    } else {
      showAlert({ title: 'خطأ', message: res.error, type: 'error' });
    }
    setProcessingOrderId(null);
  };

  const renderOrder = ({ item: order }) => {
    const isExpanded = expandedId === order.id;
    const statusColor = ORDER_STATUS_COLORS[order.status] || '#9CA3AF';
    const isNew = ['pending', 'awaiting_marketer'].includes(order.status);

    const canFastTrack = order.order_items?.every(item => 
      inventory.find(i => i.product_id === item.product_id && i.quantity >= item.quantity)
    );

    const prevStatus = PREVIOUS_STATUS_MAP[order.status];

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => setExpandedId(isExpanded ? null : order.id)} style={styles.cardWrapper}>
        <Card style={[styles.orderCard, isExpanded && styles.expandedCard]}>
          <View style={[styles.statusAccent, { backgroundColor: statusColor }]} />
          
          <View style={styles.cardMain}>
            <View style={styles.headerRow}>
              <View style={styles.custInfo}>
                <Text style={[styles.custName, { color: theme.colors.text }]}>{order.customer_name}</Text>
                <View style={styles.locationRow}>
                   <Ionicons name="location-outline" size={12} color={theme.colors.textTertiary} />
                   <Text style={[styles.custMeta, { color: theme.colors.textSecondary }]}>{order.wilaya} • {order.commune}</Text>
                </View>
              </View>
              <View style={[styles.priceTag, { backgroundColor: theme.primary + '10' }]}>
                <Text style={[styles.priceText, { color: theme.primary }]}>{formatCurrency(order.sale_price || order.total)}</Text>
              </View>
            </View>

            <View style={styles.itemsSummary}>
               {order.order_items?.map((item, i) => (
                  <View key={i} style={styles.itemPill}>
                    <Text style={[styles.itemPillText, { color: theme.colors.textSecondary }]}>{item.product_name} × {item.quantity}</Text>
                  </View>
               ))}
            </View>

            <View style={styles.footerRow}>
               <View style={styles.dateBox}>
                 <Ionicons name="time-outline" size={12} color={theme.colors.textTertiary} />
                 <Text style={[styles.dateText, { color: theme.colors.textTertiary }]}>{new Date(order.created_at).toLocaleDateString('ar-DZ')}</Text>
               </View>
               <Badge label={ORDER_STATUS_AR[order.status]} color={statusColor} variant="outline" />
            </View>

            {isExpanded && (
              <View style={[styles.expandedArea, { borderTopColor: theme.colors.border }]}>
                {/* Fast Call Button Row */}
                <View style={styles.contactRow}>
                  <View style={styles.phoneBox}>
                    <Ionicons name="phone-portrait-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.phoneText, { color: theme.colors.text }]}>{order.customer_phone}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.fastCallBtn}
                    onPress={() => Linking.openURL(`tel:${order.customer_phone}`)}
                  >
                    <Ionicons name="call" size={14} color="#FFF" />
                    <Text style={styles.fastCallText}>إتصال سريع</Text>
                  </TouchableOpacity>
                </View>

                {!!order.affiliates?.profiles?.full_name && (
                  <View style={styles.affiliateBox}>
                    <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.affiliateText, { color: theme.colors.textSecondary }]}>المسوق: {order.affiliates.profiles.full_name}</Text>
                  </View>
                )}

                {!!order.customer_address && (
                  <View style={styles.addressBox}>
                     <Ionicons name="map-outline" size={14} color={theme.colors.textSecondary} />
                     <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>{order.customer_address}</Text>
                  </View>
                )}

                {/* Status-Based Actions */}
                <View style={styles.actionsContainer}>
                  {isNew && (
                    <View style={{ gap: spacing.sm }}>
                      {canFastTrack && (
                        <TouchableOpacity 
                          style={[styles.fastTrackBtn, { backgroundColor: theme.primary, opacity: processingOrderId === order.id ? 0.7 : 1 }]} 
                          onPress={() => handleFastTrack(order)}
                          disabled={processingOrderId === order.id}
                        >
                          {processingOrderId === order.id ? (
                            <LoadingSpinner size="small" color="#FFF" />
                          ) : (
                            <>
                              <Ionicons name="flash" size={16} color="#FFF" />
                              <Text style={styles.fastTrackText}>شحن فوري من المستودع 🚀</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                      <View style={styles.actionButtonsRow}>
                        <Button 
                          title="تأكيد الطلب ✓" 
                          variant="outline" 
                          style={{ flex: 1 }} 
                          onPress={() => handleConfirmOrder(order)} 
                          loading={processingOrderId === order.id} 
                        />
                        <TouchableOpacity 
                          style={[styles.outlineActionIcon, { borderColor: theme.colors.error }]} 
                          onPress={() => { setRejectOrderId(order.id); setRejectModalVisible(true); }}
                        >
                          <Ionicons name="close" size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {order.status === 'confirmed_by_manager' && (
                    <Button 
                      title="بدء التوصيل 🚚" 
                      variant="primary" 
                      onPress={() => handleStatusAdvance(order.id, 'in_transit', 'تم تحويل الطلب إلى قيد التوصيل')} 
                      loading={processingOrderId === order.id} 
                    />
                  )}

                  {order.status === 'in_transit' && (
                    <View style={styles.actionButtonsRow}>
                      <Button 
                        title="تم التوصيل 📦" 
                        variant="gradient" 
                        style={{ flex: 1 }} 
                        onPress={() => handleStatusAdvance(order.id, 'delivered', 'تم تسجيل الطلب كمسلّم')} 
                        loading={processingOrderId === order.id} 
                      />
                      <TouchableOpacity 
                        style={[styles.outlineActionBtn, { borderColor: '#E17055' }]} 
                        onPress={() => { setReturnOrderId(order.id); setReturnModalVisible(true); }}
                      >
                        <Text style={{ color: '#E17055', fontFamily: 'Tajawal_700Bold', fontSize: 13 }}>إرجاع</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Copy Tracking & Revert (Undo Step) Row */}
                  <View style={styles.secondaryActionsRow}>
                    <TouchableOpacity
                      style={[styles.copyLinkBtn, { borderColor: theme.colors.border }]}
                      onPress={() => {
                        Clipboard.setString(`https://codfilatepromo.web.app/track/${order.id}`);
                        showAlert({ title: 'تم', message: 'تم نسخ رابط التتبع بنجاح', type: 'success' });
                      }}
                    >
                      <Ionicons name="copy-outline" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>نسخ رابط التتبع</Text>
                    </TouchableOpacity>

                    {/* Step Back / Revert Button */}
                    {prevStatus && (
                      <TouchableOpacity
                        style={[styles.revertBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, opacity: processingOrderId === order.id ? 0.7 : 1 }]}
                        onPress={() => handleRevertStatus(order)}
                        disabled={processingOrderId === order.id}
                      >
                        {processingOrderId === order.id ? (
                          <LoadingSpinner size="small" color={theme.colors.textSecondary} />
                        ) : (
                          <>
                            <Ionicons name="arrow-undo-outline" size={14} color={theme.colors.textSecondary} />
                            <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>تراجع للحالة السابقة</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <UniversalHeader title="إدارة الطلبات" subtitle="مراجعة وتأكيد طلبات المسوقين" />
      
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {STATUS_FILTERS.map(f => {
            const isActive = statusFilter === f.key;
            return (
              <TouchableOpacity 
                key={f.key || 'all'} 
                style={[styles.pill, { backgroundColor: isActive ? theme.primary : theme.colors.surface, borderColor: isActive ? theme.primary : theme.colors.border }]}
                onPress={() => setStatusFilter(f.key)}
              >
                <Text style={[styles.pillText, { color: isActive ? '#FFF' : theme.colors.textSecondary }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList 
        data={orders} 
        renderItem={renderOrder} 
        keyExtractor={item => item.id} 
        contentContainerStyle={styles.list} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} 
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="لا يوجد طلبات" />} 
      />

      {/* Reject Bottom Sheet */}
      <BottomSheet visible={rejectModalVisible} onClose={() => setRejectModalVisible(false)} title="إلغاء الطلب">
        <View style={styles.sheetBody}>
          <TextInput 
            style={[styles.sheetInput, { color: theme.colors.text, borderColor: theme.colors.border }]} 
            placeholder="سبب الإلغاء (سيظهر للمسوق)..." 
            placeholderTextColor={theme.colors.textTertiary}
            value={rejectReason} 
            onChangeText={setRejectReason} 
            multiline
          />
          <Button 
            title="تأكيد الإلغاء نهائياً" 
            variant="destructive" 
            loading={processingOrderId === rejectOrderId}
            onPress={() => {
              if(!rejectReason.trim()) return showAlert({ title: 'تنبيه', message: 'يرجى كتابة سبب الإلغاء', type: 'error' });
              showConfirm({
                title: 'تأكيد الإلغاء',
                message: 'هل أنت متأكد من إلغاء هذا الطلب؟',
                confirmText: 'نعم، إلغاء',
                cancelText: 'تراجع',
                type: 'error',
                onConfirm: () => handleRejectOrReturn(rejectOrderId, 'cancel', rejectReason)
              });
            }} 
          />
        </View>
      </BottomSheet>

      {/* Return Bottom Sheet */}
      <BottomSheet visible={returnModalVisible} onClose={() => setReturnModalVisible(false)} title="إرجاع الطلب">
        <View style={styles.sheetBody}>
          <TextInput 
            style={[styles.sheetInput, { color: theme.colors.text, borderColor: theme.colors.border }]} 
            placeholder="سبب الإرجاع..." 
            placeholderTextColor={theme.colors.textTertiary}
            value={returnReason} 
            onChangeText={setReturnReason} 
            multiline
          />
          <Button 
            title="تأكيد المرتجع" 
            variant="primary" 
            loading={processingOrderId === returnOrderId}
            onPress={() => {
              showConfirm({
                title: 'تأكيد المرتجع',
                message: 'سيتم تحويل الطلب لمرتجع وإعادته للمستودع. متأكد؟',
                confirmText: 'تأكيد',
                cancelText: 'إلغاء',
                type: 'info',
                onConfirm: () => handleRejectOrReturn(returnOrderId, 'return', returnReason)
              });
            }} 
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  filters: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.xs, flexDirection: 'row-reverse' },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1 },
  pillText: { ...typography.small, fontFamily: 'Tajawal_700Bold' },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 100 },
  
  cardWrapper: { marginBottom: spacing.sm },
  orderCard: { padding: 0, overflow: 'hidden', borderWidth: 0, elevation: 2 },
  expandedCard: { elevation: 4 },
  statusAccent: { width: 4, position: 'absolute', left: 0, top: 0, bottom: 0 },
  cardMain: { padding: spacing.md, paddingLeft: spacing.md + 4 },
  
  headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  custInfo: { flex: 1, alignItems: 'flex-end' },
  custName: { ...typography.bodyBold, fontSize: 16 },
  locationRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 },
  custMeta: { fontSize: 12 },
  priceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginStart: spacing.sm },
  priceText: { ...typography.bodyBold, fontSize: 14 },
  
  itemsSummary: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  itemPill: { backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  itemPillText: { fontSize: 11, fontFamily: 'Tajawal_500Medium' },

  footerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  dateBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11 },

  expandedArea: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, gap: spacing.sm },
  contactRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9F9F9', padding: spacing.sm, borderRadius: borderRadius.sm },
  phoneBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  phoneText: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  fastCallBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#27AE60', paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm },
  fastCallText: { color: '#FFF', fontSize: 12, fontFamily: 'Tajawal_700Bold' },

  affiliateBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  affiliateText: { fontSize: 13 },
  addressBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  addressText: { fontSize: 13, flex: 1, textAlign: 'right' },

  actionsContainer: { marginTop: spacing.xs, gap: spacing.sm },
  actionButtonsRow: { flexDirection: 'row-reverse', gap: spacing.sm },
  outlineActionIcon: { width: 48, borderRadius: borderRadius.md, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  outlineActionBtn: { paddingHorizontal: 16, borderRadius: borderRadius.md, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  fastTrackBtn: { flexDirection: 'row-reverse', height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', gap: 8 },
  fastTrackText: { color: '#FFF', fontFamily: 'Tajawal_700Bold', fontSize: 13 },

  secondaryActionsRow: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.xs },
  copyLinkBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderDashArray: [4, 4], borderWidth: 1, borderRadius: borderRadius.md, gap: 8 },
  revertBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderWidth: 1, borderRadius: borderRadius.md, gap: 6 },
  secondaryBtnText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },

  sheetBody: { paddingBottom: spacing.xl },
  sheetInput: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, height: 100, textAlign: 'right', marginBottom: spacing.md },
});