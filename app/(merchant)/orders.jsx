import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Hooks & Stores
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useStoreStore } from '../../src/stores/useStoreStore';
import { useOrderStore } from '../../src/stores/useOrderStore';

// UI Components
import Card from '../../src/components/ui/Card';
import Badge from '../../src/components/ui/Badge';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import UniversalHeader from '../../src/components/ui/UniversalHeader';

// Utils & Theme
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency, formatRelativeTime, formatDate } from '../../src/lib/utils';
import { ORDER_STATUS_AR } from '../../src/lib/constants';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Configuration ---
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

// --- Extracted Memoized Order Card (Massive Performance Boost) ---
const OrderCard = React.memo(({ item, isExpanded, onToggle, theme, isWide }) => {
  const config = STATUS_CONFIG[item.status] || { color: theme.colors.textSecondary, icon: 'receipt' };
  const affiliateName = item.affiliates?.profiles?.full_name;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onToggle(item.id)}
      style={isWide ? styles.cardWrapperWide : styles.cardWrapperMobile}
    >
      <Card style={[styles.orderCard, isExpanded && styles.expandedCard]}>
        {/* Status Accent Line */}
        <View style={[styles.statusAccent, { backgroundColor: config.color }]} />

        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <View style={styles.customerInfoSection}>
              <Text style={[styles.customerName, { color: theme.colors.text }]} numberOfLines={1}>
                {item.customer_name}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={14} color={theme.colors.textTertiary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {item.wilaya || 'غير محدد'} • {item.commune || ''}
                </Text>
              </View>
            </View>

            <View style={[styles.priceTag, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.priceText, { color: theme.primary }]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          </View>

          <View style={styles.middleRow}>
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textTertiary} />
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

          <View style={[styles.actionStrip, { borderTopColor: theme.colors.divider }]}>
            <TouchableOpacity
              style={[styles.quickCall, { backgroundColor: '#27AE6015' }]}
              onPress={() => Linking.openURL(`tel:${item.customer_phone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={14} color="#27AE60" />
              <Text style={[styles.quickCallText, { color: '#27AE60' }]}>{item.customer_phone}</Text>
            </TouchableOpacity>

            <View style={styles.tagsContainer}>
              {!!affiliateName && (
                <View style={[styles.miniTag, { backgroundColor: theme.colors.surface2 }]}>
                  <Ionicons name="person-outline" size={12} color={theme.colors.textSecondary} />
                  <Text numberOfLines={1} style={[styles.miniTagText, { color: theme.colors.textSecondary }]}>
                    {affiliateName}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Expanded Section with Smooth Reveal */}
          {isExpanded && (
            <View style={[styles.detailsSection, { borderTopColor: theme.colors.divider }]}>
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
                <View style={[styles.detailBox, { backgroundColor: theme.colors.surface2 }]}>
                  <Ionicons name="map-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>{item.customer_address}</Text>
                </View>
              )}

              {!!item.notes && (
                <View style={[styles.detailBox, { backgroundColor: theme.colors.warning + '15' }]}>
                  <Ionicons name="document-text-outline" size={16} color={theme.colors.warning} />
                  <Text style={[styles.detailText, { color: theme.colors.warning, fontStyle: 'italic' }]}>{item.notes}</Text>
                </View>
              )}

              <View style={styles.footerActions}>
                <TouchableOpacity
                  style={[styles.shareBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                  onPress={() => {
                    const trackingUrl = `https://codfilatepromo.web.app/track/${item.id}`;
                    Clipboard.setString(trackingUrl);
                    Alert.alert('تم النسخ', 'تم نسخ رابط التتبع بنجاح.');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.shareBtnText, { color: theme.colors.textSecondary }]}>نسخ رابط التتبع</Text>
                </TouchableOpacity>
                <View style={styles.dateLabel}>
                  <Text style={[styles.dateLabelText, { color: theme.colors.textTertiary }]}>
                    بتاريخ: {formatDate(item.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
});

// --- Main Component ---
export default function OrdersScreen() {
  const theme = useTheme();
  const { isWide } = useResponsive();

  const currentStore = useStoreStore((s) => s.currentStore);
  const { orders, isLoading, fetchOrders } = useOrderStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [search, setSearch] = useState('');

  const loadOrders = useCallback(async () => {
    if (currentStore) await fetchOrders(currentStore.id, activeFilter);
  }, [currentStore, activeFilter, fetchOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  // Smooth accordion toggle using LayoutAnimation
  const handleToggleOrder = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrder((prev) => (prev === id ? null : id));
  }, []);

  // Filter logic memoized
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
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
  }, [orders, search]);

  // Derived Stats
  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  }), [orders]);

  const renderItem = useCallback(({ item }) => (
    <OrderCard
      item={item}
      isExpanded={expandedOrder === item.id}
      onToggle={handleToggleOrder}
      theme={theme}
      isWide={isWide}
    />
  ), [expandedOrder, handleToggleOrder, theme, isWide]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader title="الطلبات" subtitle="متابعة وإدارة حالة الطلبات الخاصة بمتجرك" />

      {/* Main Container constrained for desktop */}
      <View style={[styles.contentWrapper, isWide && styles.contentWrapperWide]}>

        {/* Quick Summary Dashboard */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="layers-outline" size={20} color={theme.colors.textSecondary} style={styles.statIcon} />
            <View style={styles.statTextWrap}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>الكل</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F2994A15' }]}>
            <Ionicons name="time-outline" size={20} color="#F2994A" style={styles.statIcon} />
            <View style={styles.statTextWrap}>
              <Text style={[styles.statValue, { color: '#F2994A' }]}>{stats.pending}</Text>
              <Text style={[styles.statLabel, { color: '#F2994A' }]}>معلق</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#21965315' }]}>
            <Ionicons name="checkmark-done-outline" size={20} color="#219653" style={styles.statIcon} />
            <View style={styles.statTextWrap}>
              <Text style={[styles.statValue, { color: '#219653' }]}>{stats.delivered}</Text>
              <Text style={[styles.statLabel, { color: '#219653' }]}>تم التوصيل</Text>
            </View>
          </View>
        </View>

        {/* Smart Search Bar */}
        <View style={[
          styles.searchWrapper,
          { backgroundColor: theme.colors.surface, borderColor: search ? theme.primary : theme.colors.border }
        ]}>
          <Ionicons name="search" size={20} color={search ? theme.primary : theme.colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="ابحث بالاسم، رقم الهاتف، أو المسوق..."
            placeholderTextColor={theme.colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.6}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Status Filters */}
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
                  activeOpacity={0.7}
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
                    size={16}
                    color={isSelected ? '#FFF' : theme.colors.textSecondary}
                    style={{ marginStart: 6 }} // Arabic RTL spacing
                  />
                  <Text style={[styles.filterLabel, { color: isSelected ? '#FFF' : theme.colors.textSecondary }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Orders List/Grid */}
        {isLoading && orders.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <FlatList
            key={isWide ? 'grid' : 'list'} // Forces remount when layout changes so numColumns applies cleanly
            data={filteredOrders}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            numColumns={isWide ? 2 : 1}
            columnWrapperStyle={isWide ? styles.gridRow : undefined}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            ListEmptyComponent={
              <EmptyState
                icon="receipt-outline"
                title="لا توجد طلبات"
                message={search ? "لا توجد طلبات تطابق بحثك الحالي" : "لا توجد طلبات في هذا القسم حالياً"}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1 },
  contentWrapperWide: { maxWidth: 1200, width: '100%', alignSelf: 'center' },

  // Dashboard Stats
  statsRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statIcon: { marginEnd: spacing.sm },
  statTextWrap: { flex: 1, alignItems: 'flex-start' }, // Right aligned conceptually due to row-reverse
  statValue: { ...typography.h3, fontFamily: 'Tajawal_700Bold', lineHeight: 28 },
  statLabel: { ...typography.caption, fontFamily: 'Tajawal_500Medium' },

  // Search Bar
  searchWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    height: 50,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    textAlign: 'right',
    paddingHorizontal: spacing.sm,
    ...typography.body,
    fontFamily: 'Tajawal_500Medium',
  },

  // Filters
  filterScroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row-reverse',
  },
  filterPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  filterLabel: { ...typography.small, fontFamily: 'Tajawal_700Bold' },

  // FlatList Content
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: 120,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  // Order Card Container
  cardWrapperMobile: { width: '100%', marginBottom: spacing.sm },
  cardWrapperWide: { flex: 1, maxWidth: '49%', marginBottom: spacing.md },

  orderCard: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 0,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  expandedCard: {
    elevation: 6,
    shadowOpacity: 0.15,
  },
  statusAccent: {
    width: 5,
    position: 'absolute',
    right: 0, // Mirrored to right for RTL compliance
    top: 0,
    bottom: 0,
  },
  cardMain: {
    padding: spacing.md,
    paddingRight: spacing.md + 6, // Offset for the accent line
  },

  // Card Header (Name & Price)
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerInfoSection: { flex: 1, alignItems: 'flex-end' },
  customerName: {
    ...typography.h4,
    fontFamily: 'Tajawal_700Bold',
    marginBottom: 4,
  },
  locationRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  metaText: { ...typography.small, fontFamily: 'Tajawal_500Medium' },

  priceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginStart: spacing.sm,
  },
  priceText: { ...typography.bodyBold, fontFamily: 'Tajawal_700Bold' },

  // Middle Row (Time & Status)
  middleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  timeBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  timeText: { ...typography.caption, fontFamily: 'Tajawal_500Medium' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4 },

  // Action Strip (Phone & Affiliate Tag)
  actionStrip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    justifyContent: 'space-between',
  },
  quickCall: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    gap: 8,
  },
  quickCallText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  tagsContainer: { flexDirection: 'row-reverse', gap: 6, flex: 1, justifyContent: 'flex-end' },
  miniTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    maxWidth: 120,
  },
  miniTagText: { fontSize: 11, fontFamily: 'Tajawal_500Medium' },

  // Expanded Details Section
  detailsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  sectionTitle: {
    ...typography.small,
    fontFamily: 'Tajawal_700Bold',
    marginBottom: spacing.md,
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  itemMain: { alignItems: 'flex-end', flex: 1 },
  itemName: { ...typography.body, fontFamily: 'Tajawal_500Medium', marginBottom: 2, textAlign: 'right' },
  itemQty: { ...typography.caption, fontFamily: 'Tajawal_400Regular' },
  itemPrice: { ...typography.bodyBold, fontFamily: 'Tajawal_700Bold', marginStart: spacing.sm },

  detailBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  detailText: {
    ...typography.small,
    fontFamily: 'Tajawal_500Medium',
    flex: 1,
    textAlign: 'right',
    lineHeight: 20,
  },

  // Footer inside Expanded Section
  footerActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.sm,
  },
  shareBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  shareBtnText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  dateLabel: { opacity: 0.8 },
  dateLabelText: { ...typography.caption, fontFamily: 'Tajawal_500Medium' },
});