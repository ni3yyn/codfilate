import React, { useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useStoreStore } from '../../src/stores/useStoreStore';
import { useOrderStore } from '../../src/stores/useOrderStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';
import { useProductStore } from '../../src/stores/useProductStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import StatCard from '../../src/components/ui/StatCard';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import Card from '../../src/components/ui/Card';
import Badge from '../../src/components/ui/Badge';
import Button from '../../src/components/ui/Button';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency, formatRelativeTime } from '../../src/lib/utils';
import { ORDER_STATUS_COLORS, ORDER_STATUS_AR } from '../../src/lib/constants';
import { LineChart } from 'react-native-gifted-charts';

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

  const needsMerchantOnboarding =
    profile?.role === 'merchant' && profile?.onboarding_completed === false;

  useLayoutEffect(() => {
    if (needsMerchantOnboarding) router.replace('/(merchant)/onboarding');
  }, [needsMerchantOnboarding, router]);

  useEffect(() => {
    if (needsMerchantOnboarding) return;
    loadData();
  }, [needsMerchantOnboarding, loadData]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (needsMerchantOnboarding) return <LoadingSpinner message="جارٍ إعداد متجرك الخاص..." />;
  if (storeLoading && !currentStore) return <LoadingSpinner message="جارٍ تحميل بيانات المتجر..." />;

  const storePendingRm = currentStore && Object.prototype.hasOwnProperty.call(currentStore, 'rm_activated_at') && currentStore.rm_activated_at == null;
  const recentOrders = orders.slice(0, 5);

  // Stock alerts
  const lowStockProducts = (products || []).filter(p => p.stock != null && p.stock > 0 && p.stock <= 5 && p.is_active);
  const outOfStockProducts = (products || []).filter(p => p.stock != null && p.stock === 0 && p.is_active);

  const getChartData = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }).reverse();
    return last7Days.map(dateStr => {
      const dayTotal = orders.filter(o => {
        if (!o.created_at) return false;
        const oDate = new Date(o.created_at);
        return `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}` === dateStr;
      }).reduce((sum, o) => sum + Number(o.total || 0), 0);
      return { value: dayTotal, label: dateStr.split('-')[2], dataPointText: dayTotal > 0 ? String(dayTotal) : '' };
    });
  };
  const chartData = getChartData();
  const maxVal = Math.max(...chartData.map(d => d.value), 1000);


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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {storePendingRm && (
          <Card style={styles.pendingRmBanner} accentColor="#FDCB6E" accentPosition="left">
            <View style={styles.bannerRow}>
              <Ionicons name="alert-circle" size={24} color="#FDCB6E" style={{ marginEnd: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: theme.colors.text }]}>بانتظار تفعيل المتجر</Text>
                <Text style={[typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>سيقوم المدير الإقليمي بمراجعة وتفعيل حسابك قريباً.</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Store Summary */}
        <Card style={styles.storeCard} accentColor={theme.primary} accentPosition="left">
          <View style={styles.storeRow}>
            <View style={[styles.storeIconBox, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="storefront" size={24} color={theme.primary} />
            </View>
            <View style={styles.storeMeta}>
              <Text style={[styles.storeName, { color: theme.colors.text }]}>{currentStore?.name || 'متجر غير مسمى'}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: currentStore?.is_active ? theme.colors.success : theme.colors.textTertiary }]} />
                <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>{currentStore?.is_active ? 'متجر نشط' : 'غير مفعل'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(merchant)/settings')} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Welcome Tip */}
        <View style={{ backgroundColor: theme.primary + '10', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md }}>
           <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
             <Ionicons name="bulb" size={20} color={theme.primary} style={{ marginEnd: 8 }} />
             <Text style={{ fontFamily: 'Tajawal_700Bold', color: theme.primary }}>نصيحة للتجار 💡</Text>
           </View>
           <Text style={{ fontFamily: 'Tajawal_500Medium', color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
             هل تعلم؟ المنتجات التي تحتوي على صور وفيديو احترافي تحصل على تفاعل أكبر بـ 5 أضعاف من المسوقين. تأكد من توفير وصف دقيق للمنتج.
           </Text>
        </View>

        <View style={{ backgroundColor: '#00CEC910', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md }}>
           <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
             <Ionicons name="swap-horizontal" size={20} color="#00CEC9" style={{ marginEnd: 8 }} />
             <Text style={{ fontFamily: 'Tajawal_700Bold', color: '#00CEC9' }}>نظام العمل واللوجستيك 📦</Text>
           </View>
           <Text style={{ fontFamily: 'Tajawal_500Medium', color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
             أنت تضع المنتجات، والمدير الإقليمي هو من يتكفل بشحن الطلبيات وتسوية المستحقات المالية. دورك هو الحفاظ على توفر المخزون وتحديث الكميات فوراً.
           </Text>
        </View>

        {/* Main Stats */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>نظرة عامة على الأداء</Text>
        <View style={styles.statsRow}>
          <StatCard title="إجمالي الإيرادات" value={formatCurrency(stats.totalRevenue || 0)} icon="cash" color={theme.primary} subtitle={`اليوم: ${formatCurrency(stats.todayRevenue || 0)}`} />
          <StatCard title="إجمالي الطلبات" value={String(stats.total || 0)} icon="receipt" color="#6C5CE7" subtitle={`اليوم: ${stats.todayOrders || 0}`} />
          <StatCard title="تم التوصيل" value={String(stats.delivered || 0)} icon="checkmark-done-circle" color="#2D6A4F" subtitle={formatCurrency(stats.deliveredRevenue || 0)} />
          <StatCard title="معدل التحويل" value={`${stats.conversionRate || 0}%`} icon="trending-up" color="#00CEC9" subtitle="تسليم / إجمالي" />
          <StatCard title="قيد التوصيل" value={String(stats.in_transit || 0)} icon="car" color="#0984E3" />
          <StatCard title="مرتجعة / ملغاة" value={`${stats.returned || 0} / ${stats.cancelled || 0}`} icon="return-down-back" color="#E17055" />
          <StatCard title="المسوقين النشطين" value={String(affiliates.length || 0)} icon="people" color="#00CEC9" />
          <StatCard title="متوسط قيمة الطلب" value={formatCurrency(stats.avgOrderValue || 0)} icon="analytics" color="#FDCB6E" />
        </View>

        {/* Stock Alerts */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: spacing.lg }]}>⚠️ تنبيهات المخزون</Text>
            {outOfStockProducts.map(p => (
              <Card key={p.id} style={styles.stockAlert} accentColor="#D63031" accentPosition="left">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="alert-circle" size={18} color="#D63031" />
                  <Text style={[typography.bodyBold, { color: theme.colors.text, flex: 1 }]}>{p.name}</Text>
                  <Badge label="نفد المخزون" variant="error" />
                </View>
              </Card>
            ))}
            {lowStockProducts.map(p => (
              <Card key={p.id} style={styles.stockAlert} accentColor="#FDCB6E" accentPosition="left">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="warning" size={18} color="#FDCB6E" />
                  <Text style={[typography.bodyBold, { color: theme.colors.text, flex: 1 }]}>{p.name}</Text>
                  <Badge label={`${p.stock} متبقي`} variant="warning" />
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Chart */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: spacing.lg }]}>📈 إحصائيات المبيعات</Text>
        <Card style={styles.chartCard}>
          <LineChart data={chartData} height={180} width={300} initialSpacing={20} spacing={45} color={theme.primary} thickness={3} startFillColor={theme.primary} endFillColor={theme.primary + '05'} startOpacity={0.2} endOpacity={0.02} curved isAnimated noOfSections={4} maxValue={maxVal + (maxVal * 0.2)} areaChart yAxisTextStyle={{ color: theme.colors.textTertiary, fontSize: 10 }} xAxisLabelTextStyle={{ color: theme.colors.textTertiary, fontSize: 10 }} />
        </Card>

        {/* Recent Orders */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>أحدث الطلبات</Text>
          <TouchableOpacity onPress={() => router.push('/(merchant)/orders')}>
            <Text style={[styles.viewAll, { color: theme.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>لم تتلقَ أي طلبات بعد. ابدأ بإضافة منتجاتك!</Text>
          </Card>
        ) : (
          recentOrders.map((order) => (
            <Card key={order.id} style={styles.orderCard} borderVariant="default" accentColor={ORDER_STATUS_COLORS[order.status]} accentPosition="left">
              <View style={styles.orderRow}>
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderCustomer, { color: theme.colors.text }]}>{order.customer_name}</Text>
                  <Text style={[styles.orderMeta, { color: theme.colors.textTertiary }]}>{formatRelativeTime(order.created_at)}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={[styles.orderTotal, { color: theme.colors.text }]}>{formatCurrency(order.total)}</Text>
                  <Badge label={ORDER_STATUS_AR[order.status] || order.status} variant={order.status === 'delivered' ? 'success' : order.status === 'cancelled' || order.status === 'returned' ? 'error' : order.status === 'in_transit' ? 'primary' : 'warning'} size="sm" />
                </View>
              </View>
            </Card>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  pendingRmBanner: { marginBottom: spacing.md, backgroundColor: '#FFFBEB' },
  bannerRow: { flexDirection: 'row', alignItems: 'center' },
  storeCard: { marginBottom: spacing.lg },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  storeMeta: { flex: 1 },
  storeName: { ...typography.bodyBold, fontSize: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: 'Tajawal_500Medium' },
  settingsBtn: { padding: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  viewAll: { ...typography.small, fontFamily: 'Tajawal_700Bold' },
  chartCard: { paddingVertical: spacing.lg, alignItems: 'center', overflow: 'hidden' },
  orderCard: { marginBottom: spacing.sm },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderInfo: { flex: 1 },
  orderCustomer: { ...typography.bodyBold, fontSize: 16 },
  orderMeta: { ...typography.caption, marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 6 },
  orderTotal: { ...typography.bodyBold, fontSize: 16 },
  emptyCard: { padding: spacing.xl, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  emptyText: { ...typography.body, textAlign: 'center', color: '#94A3B8' },
  stockAlert: { marginBottom: spacing.xs },
  bottomSpacer: { height: 100 },
});
