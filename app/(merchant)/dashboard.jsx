import React, { useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Animated,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';

// Hooks & Stores
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useStoreStore } from '../../src/stores/useStoreStore';
import { useOrderStore } from '../../src/stores/useOrderStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';
import { useProductStore } from '../../src/stores/useProductStore';

// UI Components
import StatCard from '../../src/components/ui/StatCard';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import Card from '../../src/components/ui/Card';

// Utils, Theme & Constants
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency, formatRelativeTime } from '../../src/lib/utils';
import { ORDER_STATUS_COLORS, ORDER_STATUS_AR } from '../../src/lib/constants';

// --- Extracted Sub-Components ---

const ActivityFeedItem = React.memo(({ order, isLast, theme }) => (
  <View style={[styles.activityItem, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.activityContent}>
      <View style={styles.activityHeader}>
        <Text style={[styles.activityUser, { color: theme.colors.text }]} numberOfLines={1}>
          {order.customer_name}
        </Text>
        <Text style={[styles.activityPrice, { color: theme.colors.text }]}>
          {formatCurrency(order.total)}
        </Text>
      </View>
      <View style={styles.activityFooter}>
        <Text style={[styles.activityStatus, { color: ORDER_STATUS_COLORS[order.status] }]}>
          {ORDER_STATUS_AR[order.status]}
        </Text>
        <Text style={[styles.activityTime, { color: theme.colors.textTertiary }]}>
          {formatRelativeTime(order.created_at)}
        </Text>
      </View>
    </View>
    <View style={[styles.activityIcon, { backgroundColor: ORDER_STATUS_COLORS[order.status] + '15' }]}>
      <Ionicons name="cube" size={18} color={ORDER_STATUS_COLORS[order.status]} />
    </View>
  </View>
));

const LogisticsRibbon = React.memo(({ stats }) => (
  <View style={styles.ribbonContainer}>
    <View style={styles.ribbon}>
      <View style={styles.ribbonItem}>
        <Ionicons name="checkmark-circle" size={18} color="#2D6A4F" />
        <Text style={[styles.ribbonVal, { color: '#2D6A4F' }]}>{stats.delivered || 0}</Text>
        <Text style={styles.ribbonLabel}>مُسلّمة</Text>
      </View>
      <View style={styles.ribbonDivider} />
      <View style={styles.ribbonItem}>
        <Ionicons name="bicycle" size={18} color="#0984E3" />
        <Text style={[styles.ribbonVal, { color: '#0984E3' }]}>{stats.in_transit || 0}</Text>
        <Text style={styles.ribbonLabel}>في الطريق</Text>
      </View>
      <View style={styles.ribbonDivider} />
      <View style={styles.ribbonItem}>
        <Ionicons name="refresh-circle" size={18} color="#E17055" />
        <Text style={[styles.ribbonVal, { color: '#E17055' }]}>{stats.returned || 0}</Text>
        <Text style={styles.ribbonLabel}>مرتجعة</Text>
      </View>
    </View>
  </View>
));

const StockAlertsPanel = React.memo(({ outOfStockProducts, lowStockProducts, theme }) => {
  if (outOfStockProducts.length === 0 && lowStockProducts.length === 0) return null;
  return (
    <View style={styles.stockPanel}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>تنبيهات المخزون</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stockScroll}
      >
        {outOfStockProducts.map(p => (
          <View key={p.id} style={[styles.stockTag, { backgroundColor: '#d6303115', borderColor: '#d6303130' }]}>
            <Text style={[styles.stockTagName, { color: '#d63031' }]}>{p.name}</Text>
            <Ionicons name="alert-circle" size={16} color="#d63031" />
          </View>
        ))}
        {lowStockProducts.map(p => (
          <View key={p.id} style={[styles.stockTag, { backgroundColor: '#fdcb6e15', borderColor: '#fdcb6e30' }]}>
            <Text style={[styles.stockTagName, { color: '#e1b12c' }]}>{p.name}</Text>
            <Ionicons name="warning" size={16} color="#e1b12c" />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});


// --- Main Dashboard Component ---

export default function MerchantDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { isWide, maxContentWidth, contentPadding, listContentBottomPad } = useResponsive();

  const profile = useAuthStore((s) => s.profile);
  const { currentStore, fetchMyStore, isLoading: storeLoading } = useStoreStore();
  const { orders, fetchOrders, fetchOrderStats, stats } = useOrderStore();
  const { affiliates, fetchStoreAffiliates } = useAffiliateStore();
  const { products, fetchAllStoreProducts } = useProductStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const loadData = useCallback(async () => {
    await fetchMyStore();
    const store = useStoreStore.getState().currentStore;
    if (store) {
      await Promise.all([
        fetchOrders(store.id),
        fetchOrderStats(store.id),
        fetchStoreAffiliates(store.id),
        fetchAllStoreProducts(store.id),
      ]);
    }
  }, [fetchMyStore, fetchOrders, fetchOrderStats, fetchStoreAffiliates, fetchAllStoreProducts]);

  const needsMerchantOnboarding = profile?.role === 'merchant' && profile?.onboarding_completed === false;

  useLayoutEffect(() => {
    if (needsMerchantOnboarding) router.replace('/(merchant)/onboarding');
  }, [needsMerchantOnboarding, router]);

  useEffect(() => {
    if (needsMerchantOnboarding) return;
    loadData();
  }, [needsMerchantOnboarding, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // --- Derived Calculations (Memoized) ---
  const storePendingRm = useMemo(() =>
    currentStore && Object.prototype.hasOwnProperty.call(currentStore, 'rm_activated_at') && currentStore.rm_activated_at == null,
    [currentStore]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const lowStockProducts = useMemo(() =>
    (products || []).filter(p => p.stock != null && p.stock > 0 && p.stock <= 5 && p.is_active),
    [products]);

  const outOfStockProducts = useMemo(() =>
    (products || []).filter(p => p.stock != null && p.stock === 0 && p.is_active),
    [products]);

  const chartDataConfig = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }).reverse();

    const chartData = last7Days.map(dateStr => {
      const dayTotal = orders.filter(o => {
        if (!o.created_at) return false;
        const oDate = new Date(o.created_at);
        return `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}` === dateStr;
      }).reduce((sum, o) => sum + Number(o.total || 0), 0);
      return { value: dayTotal, label: dateStr.split('-')[2], dataPointText: dayTotal > 0 ? String(dayTotal) : '' };
    });

    const maxVal = Math.max(...chartData.map(d => d.value), 1000);
    return { chartData, maxVal };
  }, [orders]);


  if (needsMerchantOnboarding) return <LoadingSpinner message="جارٍ إعداد متجرك الخاص..." />;
  if (storeLoading && !currentStore) return <LoadingSpinner message="جارٍ تحميل بيانات المتجر..." />;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader
        title="الرئيسية"
        subtitle={currentStore?.name || 'متجر جديد'}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isWide && {
            maxWidth: maxContentWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
            paddingBottom: listContentBottomPad,
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {currentStore?.rejected_at && (
          <View style={[styles.rejectionCard, { backgroundColor: theme.isDark ? '#2D1F1F' : '#FFF5F5', borderColor: '#FFCDD2' }]}>
            <View style={styles.rejectionHeader}>
               <View style={styles.rejectionIconWrap}>
                 <Ionicons name="alert-circle" size={28} color="#D32F2F" />
               </View>
               <View style={styles.rejectionTitleRow}>
                 <Text style={[styles.rejectionTitle, { color: '#D32F2F' }]}>تم رفض طلب الانضمام</Text>
                 <Text style={[styles.rejectionDate, { color: theme.colors.textTertiary }]}>
                   {formatRelativeTime(currentStore.rejected_at)}
                 </Text>
               </View>
            </View>

            <View style={styles.rejectionBody}>
               <Text style={[styles.rejectionReasonLabel, { color: theme.colors.text }]}>سبب الرفض:</Text>
               <Text style={[styles.rejectionReasonText, { color: theme.colors.textSecondary }]}>
                 {currentStore.rejection_reason || "لم يتم توضيح السبب بدقة من قبل الإدارة."}
               </Text>
            </View>

            <TouchableOpacity 
              style={[styles.premiumReapplyBtn, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/(merchant)/onboarding')}
              activeOpacity={0.8}
            >
              <Text style={styles.reapplyBtnText}>تعديل البيانات وإعادة التقديم</Text>
              <Ionicons name="arrow-back" size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {storePendingRm && !currentStore?.rejected_at && (
          <Card style={[styles.pendingRmBanner, { backgroundColor: theme.isDark ? '#2D281F' : '#FFFBEB' }]} accentColor="#e1b12c" accentPosition="right">
            <View style={styles.bannerRow}>
              <Ionicons name="alert-circle" size={28} color="#e1b12c" />
              <View style={styles.bannerTextWrap}>
                <Text style={[typography.bodyBold, { color: theme.colors.text, textAlign: 'right' }]}>بانتظار تفعيل المتجر</Text>
                <Text style={[typography.caption, { color: theme.colors.textSecondary, marginTop: 4, textAlign: 'right' }]}>
                  سيقوم المدير الإقليمي بمراجعة وتفعيل حسابك قريباً.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Dashboard Grid (Shifts to 2-column on Desktop) */}
        <View style={[styles.dashboardLayout, isWide && styles.dashboardLayoutWide]}>

          {/* Main Column (Right side on Arabic Web) */}
          <View style={[styles.mainColumn, isWide && styles.mainColumnWide]}>

            {/* Hero Revenue Section */}
            <Card style={[styles.heroCard, { backgroundColor: theme.primary }]} noPadding>
              <View style={styles.heroContent}>
                <View style={styles.heroIconBox}>
                  <Ionicons name="wallet" size={36} color="rgba(255,255,255,0.2)" />
                </View>
                <View style={styles.heroText}>
                  <Text style={styles.heroLabel}>إجمالي الإيرادات</Text>
                  <Text style={styles.heroValue}>{formatCurrency(stats.totalRevenue || 0)}</Text>
                  <View style={styles.heroTrend}>
                    <Ionicons name="trending-up" size={14} color="#FFFFFF" />
                    <Text style={styles.heroTrendText}>اليوم: {formatCurrency(stats.todayRevenue || 0)}</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Primary Stats Grid */}
            <View style={styles.gridContainer}>
              <View style={styles.gridRow}>
                <View style={{ flex: 1 }}><StatCard title="الطلبات" value={String(stats.total || 0)} icon="cart" color="#6C5CE7" subtitle={`+${stats.todayOrders || 0} اليوم`} animate /></View>
                <View style={{ flex: 1 }}><StatCard title="المسوقين" value={String(affiliates.length || 0)} icon="people" color="#00CEC9" animate /></View>
              </View>
              <View style={styles.gridRow}>
                <View style={{ flex: 1 }}><StatCard title="التحويل" value={`${stats.conversionRate || 0}%`} icon="analytics" color="#0984E3" animate /></View>
                <View style={{ flex: 1 }}><StatCard title="متوسط الطلب" value={formatCurrency(stats.avgOrderValue || 0)} icon="cash" color="#FDCB6E" animate /></View>
              </View>
            </View>

            {/* Performance Chart */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>تحليل المبيعات الأسبوعي</Text>
            </View>
            <Card style={styles.chartCard}>
              <LineChart
                data={chartDataConfig.chartData}
                height={220}
                width={isWide ? 550 : 310} // Adjusted for inner padding and columns
                initialSpacing={20}
                spacing={isWide ? 85 : 45}
                color={theme.primary}
                thickness={4}
                startFillColor={theme.primary}
                endFillColor="transparent"
                startOpacity={0.2}
                endOpacity={0}
                curved
                isAnimated
                noOfSections={4}
                maxValue={chartDataConfig.maxVal + (chartDataConfig.maxVal * 0.2)}
                areaChart
                yAxisTextStyle={{ color: theme.colors.textTertiary, fontSize: 10, fontFamily: 'Tajawal_500Medium' }}
                xAxisLabelTextStyle={{ color: theme.colors.textTertiary, fontSize: 10, fontFamily: 'Tajawal_500Medium' }}
                dataPointsColor={theme.primary}
                dataPointsRadius={4}
                focusEnabled
                showVerticalLines
                verticalLinesColor="rgba(0,0,0,0.03)"
              />
            </Card>
          </View>

          {/* Secondary Column (Left side on Arabic Web) */}
          <View style={[styles.sideColumn, isWide && styles.sideColumnWide]}>

            <LogisticsRibbon stats={stats} />
            <StockAlertsPanel outOfStockProducts={outOfStockProducts} lowStockProducts={lowStockProducts} theme={theme} />

            {/* Activity Feed */}
            <View style={styles.sectionHeader}>
              <TouchableOpacity onPress={() => router.push('/(merchant)/orders')}>
                <Text style={[styles.viewAll, { color: theme.primary }]}>السجل الكامل</Text>
              </TouchableOpacity>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>أحدث النشاطات</Text>
            </View>

            <View style={[styles.activityFeed, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {recentOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>لا يوجد نشاط حالي.</Text>
                </View>
              ) : (
                recentOrders.map((order, idx) => (
                  <ActivityFeedItem key={order.id} order={order} isLast={idx === recentOrders.length - 1} theme={theme} />
                ))
              )}
            </View>

          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.md, paddingTop: spacing.sm },

  // Dashboard Smart Layout
  dashboardLayout: { flexDirection: 'column', gap: spacing.lg },
  dashboardLayoutWide: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  mainColumn: { width: '100%', flexDirection: 'column', gap: spacing.md },
  mainColumnWide: { width: '60%' },
  sideColumn: { width: '100%', flexDirection: 'column', gap: spacing.md },
  sideColumnWide: { width: '37%', position: 'sticky', top: spacing.sm },

  // Alerts
  pendingRmBanner: { marginBottom: spacing.md, backgroundColor: '#FFFBEB' },
  bannerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-start',
    width: '100%',
  },
  bannerTextWrap: { 
    flex: 1,
    marginRight: spacing.md 
  },

  // Hero Card
  heroCard: {
    borderRadius: borderRadius.xl,
    borderVariant: 'none',
    shadowOpacity: 0.2,
    marginBottom: spacing.xs,
    width: '100%',
    alignSelf: 'stretch',
  },
  heroContent: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    width: '100%',
    padding: spacing.xl,
  },
  heroText: { 
    alignItems: 'flex-start',
    flex: 1,
  },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'Tajawal_500Medium', marginBottom: 4, textAlign: 'left' },
  heroValue: { color: '#FFFFFF', fontSize: 36, fontFamily: 'Tajawal_800ExtraBold', marginBottom: spacing.sm, textAlign: 'left' },
  heroTrend: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  heroTrendText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Tajawal_700Bold', textAlign: 'left' },
  heroIconBox: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignItems: 'center', 
    justifyContent: 'center',
  },

  // Stats Grid
  gridContainer: { flexDirection: 'column', gap: 10 },
  gridRow: { flexDirection: 'row-reverse', gap: 10 },

  // Logistics Ribbon
  ribbonContainer: { marginBottom: spacing.xs },
  ribbon: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)'
  },
  ribbonItem: { flex: 1, alignItems: 'center', gap: 4 },
  ribbonDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.06)' },
  ribbonVal: { fontSize: 18, fontFamily: 'Tajawal_800ExtraBold' },
  ribbonLabel: { fontSize: 11, color: '#64748B', fontFamily: 'Tajawal_500Medium' },

  // Sections
  sectionTitle: { ...typography.bodyBold, fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  viewAll: { ...typography.small, fontFamily: 'Tajawal_700Bold' },

  // Chart
  chartCard: { paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, alignItems: 'center', overflow: 'hidden' },

  // Stock Panel
  stockPanel: { marginBottom: spacing.xs },
  stockScroll: { gap: 10, flexDirection: 'row-reverse' },
  stockTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1
  },
  stockTagName: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },

  // Activity Feed
  activityFeed: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  activityItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  activityIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginStart: spacing.sm },
  activityContent: { flex: 1 },
  activityHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  activityUser: { fontSize: 14, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  activityPrice: { fontSize: 15, fontFamily: 'Tajawal_800ExtraBold', textAlign: 'left' },
  activityFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  activityStatus: { fontSize: 11, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  activityTime: { fontSize: 11, fontFamily: 'Tajawal_500Medium', textAlign: 'left' },

  emptyCard: { padding: spacing.xl, alignItems: 'center' },
  // Rejection Banner Redesign
  rejectionCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  rejectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  rejectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rejectionTitleRow: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rejectionTitle: {
    fontSize: 18,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  rejectionDate: {
    fontSize: 11,
    fontFamily: 'Tajawal_500Medium',
    marginTop: 2,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  rejectionBody: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  rejectionReasonLabel: {
    fontSize: 13,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
    marginBottom: 6,
  },
  rejectionReasonText: {
    fontSize: 14,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right',
    lineHeight: 22,
  },
  premiumReapplyBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xs,
  },
  reapplyBtnText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Tajawal_700Bold',
  },

  bottomSpacer: { height: 100 },
});