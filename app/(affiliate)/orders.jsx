import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  StyleSheet, 
  Clipboard, 
  ScrollView, 
  Linking 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useOrderStore } from '../../src/stores/useOrderStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';
import { useAlertStore } from '../../src/stores/useAlertStore';
import Card from '../../src/components/ui/Card';
import Badge from '../../src/components/ui/Badge';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency, formatRelativeTime } from '../../src/lib/utils';
import { ORDER_STATUS_AR } from '../../src/lib/constants';

const STATUS_FILTERS = [
  { key: null, label: 'الكل', icon: 'list' },
  { key: 'pending', label: 'بانتظار التأكيد', icon: 'time-outline' },
  { key: 'confirmed', label: 'مؤكد', icon: 'checkmark-circle-outline' },
  { key: 'shipped', label: 'مشحون', icon: 'car-outline' },
  { key: 'delivered', label: 'تم التوصيل', icon: 'gift-outline' },
  { key: 'cancelled', label: 'ملغى', icon: 'close-circle-outline' },
];

const STATUS_CONFIG = {
  awaiting_marketer: { variant: 'warning', color: '#F2994A', label: 'قيد المراجعة' },
  pending: { variant: 'warning', color: '#F2994A', label: 'بانتظار التأكيد' },
  confirmed: { variant: 'info', color: '#3498DB', label: 'مؤكد' },
  shipped: { variant: 'primary', color: '#8E44AD', label: 'مشحون' },
  delivered: { variant: 'success', color: '#27AE60', label: 'تم التوصيل' },
  cancelled: { variant: 'error', color: '#E74C3C', label: 'ملغى' },
};

export default function AffiliateOrdersScreen() {
  const theme = useTheme();
  const { highlight } = useLocalSearchParams();
  const { orders, isLoading, fetchAffiliateOrders } = useOrderStore();
  const affiliateProfile = useAffiliateStore((s) => s.affiliateProfile);
  const { showAlert } = useAlertStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const loadOrders = useCallback(async () => { 
    await fetchAffiliateOrders(undefined, activeFilter); 
  }, [activeFilter, fetchAffiliateOrders]);
  
  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (highlight && orders.some((o) => o.id === highlight)) setExpandedOrder(highlight);
  }, [highlight, orders]);
  
  const onRefresh = async () => { setRefreshing(true); await loadOrders(); setRefreshing(false); };

  const renderOrder = ({ item }) => {
    const isExpanded = expandedOrder === item.id;
    const config = STATUS_CONFIG[item.status] || { variant: 'neutral', color: '#95A5A6', label: item.status };
    const productNames = item.order_items?.map(oi => oi.product_name).join('، ') || 'منتج غير معروف';

    return (
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => setExpandedOrder(isExpanded ? null : item.id)}
        style={styles.cardWrapper}
      >
        <Card style={[styles.orderCard, isExpanded && styles.expandedCard]}>
          <View style={[styles.statusAccent, { backgroundColor: config.color }]} />

          <View style={styles.cardBody}>
            <View style={styles.topRow}>
              <View style={styles.clientInfo}>
                <Text style={[styles.clientName, { color: theme.colors.text }]}>{item.customer_name}</Text>
                <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
                  {item.wilaya} {item.commune ? `• ${item.commune}` : ''}
                </Text>
              </View>
              <View style={[styles.priceTag, { backgroundColor: theme.primary + '10' }]}>
                <Text style={[styles.priceText, { color: theme.primary }]}>{formatCurrency(item.total)}</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
               <Text style={[styles.timeText, { color: theme.colors.textTertiary }]}>{formatRelativeTime(item.created_at)}</Text>
               <Badge label={config.label} variant={config.variant} />
            </View>

            {isExpanded && (
              <View style={[styles.expandedArea, { borderTopColor: theme.colors.border }]}>
                <View style={styles.detailItem}>
                  <Ionicons name="cube-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{productNames}</Text>
                </View>

                {item.tracking_id && (
                  <View style={[styles.detailItem, { backgroundColor: theme.primary + '08', padding: 8, borderRadius: 6 }]}>
                    <Ionicons name="car-sport-outline" size={14} color={theme.primary} />
                    <Text style={[styles.detailValue, { color: theme.primary, fontFamily: 'Tajawal_700Bold' }]}>تتبع: {item.tracking_id}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.copyBtn, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    Clipboard.setString(`https://codfilate.com/track/${item.id}`);
                    showAlert({ title: 'تم النسخ', message: 'رابط التتبع جاهز للإرسال للعميل.', type: 'success' });
                  }}
                >
                  <Ionicons name="copy-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.copyBtnText, { color: theme.colors.textSecondary }]}>نسخ رابط التتبع</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <UniversalHeader title="طلباتي" subtitle="متابعة مبيعاتك وعمولاتك" />
      
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key || 'all'}
              onPress={() => setActiveFilter(f.key)}
              style={[styles.filterPill, { 
                backgroundColor: activeFilter === f.key ? theme.primary : theme.colors.surface,
                borderColor: activeFilter === f.key ? theme.primary : theme.colors.border 
              }]}
            >
              <Text style={[styles.filterLabel, { color: activeFilter === f.key ? '#FFF' : theme.colors.textSecondary }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="لا توجد طلبات" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  filterBar: { paddingHorizontal: spacing.md, marginTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.xs, flexDirection: 'row-reverse' },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1 },
  filterLabel: { ...typography.small, fontFamily: 'Tajawal_700Bold' },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 100 },
  cardWrapper: { marginBottom: spacing.sm },
  orderCard: { padding: 0, overflow: 'hidden', borderWidth: 0, elevation: 2 },
  expandedCard: { elevation: 4 },
  statusAccent: { width: 4, position: 'absolute', left: 0, top: 0, bottom: 0 },
  cardBody: { padding: spacing.md, paddingLeft: spacing.md + 4 },
  topRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  clientInfo: { flex: 1, alignItems: 'flex-end' },
  clientName: { ...typography.bodyBold, fontSize: 16 },
  locationText: { fontSize: 12 },
  priceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  priceText: { ...typography.bodyBold, fontSize: 14 },
  statusRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  timeText: { fontSize: 11 },
  expandedArea: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, gap: spacing.sm },
  detailItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  detailValue: { fontSize: 13, flex: 1, textAlign: 'right' },
  copyBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: borderRadius.md, borderWidth: 1, gap: 8, marginTop: spacing.xs },
  copyBtnText: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
});