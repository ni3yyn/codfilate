import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  Clipboard,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useStoreStore } from '../../src/stores/useStoreStore';
import { useOrderStore } from '../../src/stores/useOrderStore';
import Card from '../../src/components/ui/Card';
import Badge from '../../src/components/ui/Badge';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency, formatRelativeTime, formatDate } from '../../src/lib/utils';
import { ORDER_STATUS_AR } from '../../src/lib/constants';

const STATUS_FILTERS = [
  { key: null, label: 'الكل', icon: 'list' },
  { key: 'pending', label: 'معلقة', icon: 'time-outline' },
  { key: 'confirmed_by_manager', label: 'مؤكدة', icon: 'checkmark-circle-outline' },
  { key: 'in_transit', label: 'قيد التوصيل', icon: 'bicycle-outline' },
  { key: 'delivered', label: 'تم التوصيل', icon: 'cube-outline' },
  { key: 'returned', label: 'مرتجعة', icon: 'arrow-undo-outline' },
  { key: 'cancelled', label: 'ملغاة', icon: 'close-circle-outline' },
];

const STATUS_CONFIG = {
  pending: { variant: 'warning', color: '#F2994A', icon: 'time' },
  confirmed_by_manager: { variant: 'success', color: '#27AE60', icon: 'checkmark-done-circle' },
  in_transit: { variant: 'primary', color: '#2F80ED', icon: 'car' },
  delivered: { variant: 'success', color: '#219653', icon: 'checkmark-circle' },
  returned: { variant: 'error', color: '#EB5757', icon: 'return-down-back' },
  cancelled: { variant: 'error', color: '#828282', icon: 'close-circle' },
};

export default function OrdersScreen() {
  const theme = useTheme();
  const currentStore = useStoreStore((s) => s.currentStore);
  const { orders, isLoading, fetchOrders } = useOrderStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [search, setSearch] = useState('');

  const loadOrders = useCallback(async () => {
    if (currentStore) await fetchOrders(currentStore.id, activeFilter);
  }, [currentStore, activeFilter]);

  useEffect(() => {
    loadOrders();
  }, [activeFilter, currentStore]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const affiliateName = o.affiliates?.profiles?.full_name || '';
    return (
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').includes(q) ||
      (o.referral_code || '').toLowerCase().includes(q) ||
      affiliateName.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  const renderOrder = ({ item }) => {
    const isExpanded = expandedOrder === item.id;
    const config = STATUS_CONFIG[item.status] || { color: theme.colors.textSecondary, icon: 'receipt' };
    const affiliateName = item.affiliates?.profiles?.full_name;

    return (
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => setExpandedOrder(isExpanded ? null : item.id)}
      >
        <Card style={[styles.orderCard, isExpanded && styles.expandedCard]}>
          {/* Status Accent Line */}
          <View style={[styles.statusAccent, { backgroundColor: config.color }]} />

          <View style={styles.cardMain}>
            <View style={styles.cardHeader}>
              <View style={styles.customerInfoSection}>
                <Text style={[styles.customerName, { color: theme.colors.text }]}>
                  {item.customer_name}
                </Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-sharp" size={12} color={theme.colors.textTertiary} />
                  <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                    {item.wilaya || 'غير محدد'} • {item.commune || ''}
                  </Text>
                </View>
              </View>

              <View style={[styles.priceTag, { backgroundColor: theme.primary + '10' }]}>
                <Text style={[styles.priceText, { color: theme.primary }]}>
                  {formatCurrency(item.total)}
                </Text>
              </View>
            </View>

            <View style={styles.middleRow}>
                <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={12} color={theme.colors.textTertiary} />
                    <Text style={[styles.timeText, { color: theme.colors.textTertiary }]}>
                        {formatRelativeTime(item.created_at)}
                    </Text>
                </View>
                <Badge
                    label={ORDER_STATUS_AR[item.status] || item.status}
                    variant={config.variant}
                    style={styles.statusBadge}
                />
            </View>

            <View style={styles.actionStrip}>
                <TouchableOpacity 
                    style={[styles.quickCall, { backgroundColor: '#27AE6015' }]}
                    onPress={() => Linking.openURL(`tel:${item.customer_phone}`)}
                >
                    <Ionicons name="call" size={14} color="#27AE60" />
                    <Text style={[styles.quickCallText, { color: '#27AE60' }]}>{item.customer_phone}</Text>
                </TouchableOpacity>
                
                <View style={styles.tagsContainer}>
                   {!!affiliateName && (
                     <View style={styles.miniTag}>
                        <Ionicons name="person-outline" size={10} color={theme.colors.textSecondary} />
                        <Text numberOfLines={1} style={[styles.miniTagText, { color: theme.colors.textSecondary }]}>{affiliateName}</Text>
                     </View>
                   )}
                </View>
            </View>

            {isExpanded && (
              <View style={[styles.detailsSection, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>تفاصيل المنتجات</Text>
                
                {item.order_items?.map((oi, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemMain}>
                        <Text style={[styles.itemName, { color: theme.colors.text }]}>{oi.product_name}</Text>
                        <Text style={[styles.itemQty, { color: theme.colors.textTertiary }]}>الكمية: {oi.quantity}</Text>
                    </View>
                    <Text style={[styles.itemPrice, { color: theme.colors.text }]}>{formatCurrency(oi.unit_price)}</Text>
                  </View>
                ))}

                {!!item.customer_address && (
                  <View style={styles.detailBox}>
                    <Ionicons name="map-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>{item.customer_address}</Text>
                  </View>
                )}

                {!!item.notes && (
                  <View style={[styles.detailBox, { backgroundColor: theme.colors.shimmer }]}>
                    <Ionicons name="document-text-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.detailText, { color: theme.colors.textSecondary, fontStyle: 'italic' }]}>{item.notes}</Text>
                  </View>
                )}

                <View style={styles.footerActions}>
                    <TouchableOpacity
                        style={[styles.shareBtn, { borderColor: theme.colors.border }]}
                        onPress={() => {
                            const trackingUrl = `https://codfilate.com/track/${item.id}`;
                            Clipboard.setString(trackingUrl);
                            Alert.alert('تم النسخ', 'تم نسخ رابط التتبع.');
                        }}
                    >
                        <Ionicons name="copy-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.shareBtnText, { color: theme.colors.textSecondary }]}>نسخ رابط التتبع</Text>
                    </TouchableOpacity>
                    <View style={styles.dateLabel}>
                         <Text style={[styles.dateLabelText, { color: theme.colors.textTertiary }]}>بتاريخ: {formatDate(item.created_at)}</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader title="الطلبات" />

      {/* Quick Summary Section */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>الكل</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F2994A15' }]}>
            <Text style={[styles.statValue, { color: '#F2994A' }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: '#F2994A' }]}>معلق</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#21965315' }]}>
            <Text style={[styles.statValue, { color: '#219653' }]}>{stats.delivered}</Text>
            <Text style={[styles.statLabel, { color: '#219653' }]}>تم التوصيل</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={[styles.searchWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="بحث بالاسم أو الهاتف..."
          placeholderTextColor={theme.colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter Tabs */}
      <View>
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((f) => {
            const isSelected = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key || 'all'}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.filterPill,
                  { 
                    backgroundColor: isSelected ? theme.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.primary : theme.colors.border 
                  },
                ]}
              >
                <Ionicons 
                    name={f.icon} 
                    size={14} 
                    color={isSelected ? '#FFF' : theme.colors.textSecondary} 
                    style={{ marginEnd: 4 }}
                />
                <Text style={[styles.filterLabel, { color: isSelected ? '#FFF' : theme.colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && orders.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="لا توجد طلبات"
              message="لا توجد طلبات في هذا القسم حالياً"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { ...typography.h3, lineHeight: 24 },
  statLabel: { ...typography.small, fontSize: 10, fontFamily: 'Tajawal_700Bold' },

  searchWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    height: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    textAlign: 'right',
    paddingHorizontal: spacing.sm,
    ...typography.body,
  },

  filterScroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xs,
    flexDirection: 'row-reverse',
  },
  filterPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterLabel: { ...typography.small, fontFamily: 'Tajawal_700Bold' },

  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: 100,
  },

  orderCard: {
    marginBottom: spacing.sm,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  expandedCard: {
    elevation: 4,
    transform: [{ scale: 1.01 }],
  },
  statusAccent: {
    width: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  cardMain: {
    padding: spacing.md,
    paddingLeft: spacing.md + 4,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerInfoSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  customerName: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.small,
    fontSize: 12,
  },
  priceTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginStart: spacing.sm,
  },
  priceText: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  middleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  timeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    ...typography.small,
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  actionStrip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    justifyContent: 'space-between',
  },
  quickCall: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    gap: 6,
  },
  quickCallText: {
    fontSize: 12,
    fontFamily: 'Tajawal_700Bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  miniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: 100,
  },
  miniTagText: {
    fontSize: 10,
    fontFamily: 'Tajawal_500Medium',
  },

  detailsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  sectionTitle: {
    ...typography.small,
    fontFamily: 'Tajawal_700Bold',
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  itemMain: {
    alignItems: 'flex-end',
  },
  itemName: {
    ...typography.body,
    fontSize: 13,
  },
  itemQty: {
    fontSize: 11,
  },
  itemPrice: {
    ...typography.small,
    fontFamily: 'Tajawal_700Bold',
  },
  detailBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  detailText: {
    ...typography.small,
    flex: 1,
    textAlign: 'right',
  },
  footerActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  shareBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 12,
    fontFamily: 'Tajawal_700Bold',
  },
  dateLabel: {
    opacity: 0.7,
  },
  dateLabelText: {
    fontSize: 10,
  },
});