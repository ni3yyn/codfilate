import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { getEffectiveWilayaIds } from '../../src/lib/profileUtils';
import { useRegionalManagerStore } from '../../src/stores/useRegionalManagerStore';
import StatCard from '../../src/components/ui/StatCard';
import Card from '../../src/components/ui/Card';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency } from '../../src/lib/utils';
import { REGIONAL_MANAGER_FEE } from '../../src/lib/constants';
import { useResponsive } from '../../src/hooks/useResponsive';

/**
 * Premium Regional Manager Dashboard.
 * Forest/Mint theme, solid surfaces, responsive layout.
 */
export default function RegionalManagerDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { isWide, maxContentWidth, contentPadding, listContentBottomPad } = useResponsive();
  const profile = useAuthStore(s => s.profile);
  const { stats, fetchManagerStats, isLoading, fetchWilayaOrders, orders } = useRegionalManagerStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const wilayaIds = useMemo(() => getEffectiveWilayaIds(profile), [profile]);

  const loadData = useCallback(async () => {
    const ids = wilayaIds.length > 0 ? wilayaIds : null;
    await Promise.all([
      fetchManagerStats(ids || []),
      fetchWilayaOrders(ids, 'pending'),
    ]);
  }, [wilayaIds, fetchManagerStats, fetchWilayaOrders]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');


  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="الرئيسية" 
        subtitle={`${wilayaIds.length} ولاية موكلة`} 
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
        {/* Stats Grid */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>نظرة إحصائية</Text>
        <View style={styles.statsGrid}>
          <StatCard title="طلبات معلقة" value={stats.pendingOrders} icon="time" color="#FDCB6E" subtitle="بانتظار التأكيد" />
          <StatCard title="مؤكدة اليوم" value={stats.confirmedToday} icon="checkmark-circle" color={theme.primary} subtitle="تمت معالجتها" />
          <StatCard title="توصيل اليوم" value={stats.deliveredToday} icon="checkmark-done-circle" color="#2D6A4F" subtitle={`هذا الشهر: ${stats.deliveredThisMonth}`} />
          <StatCard title="قيد التوصيل" value={stats.inTransit} icon="car" color="#0984E3" subtitle="في الطريق" />
          <StatCard title="مرتجعة" value={stats.returnedOrders} icon="return-down-back" color="#E17055" />
          <StatCard title="ملغاة" value={stats.cancelledOrders} icon="close-circle" color="#D63031" />
          <StatCard title="أرباح الشهر" value={formatCurrency(stats.monthlyEarnings)} icon="wallet" color="#00CEC9" subtitle="ربح متراكم" />
          <StatCard title="إجمالي التوصيل" value={stats.totalDelivered} icon="trophy" color="#6C5CE7" />
        </View>

        {/* COD Card */}
        <Card style={styles.earningsCard} accentColor="#00B894" accentPosition="left">
          <View style={styles.earningsRow}>
            <View style={styles.earningsIconCell}>
              <View style={[styles.iconCircle, { backgroundColor: '#00B89415' }]}>
                <Ionicons name="cash-outline" size={24} color="#00B894" />
              </View>
              <View>
                <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>COD محصّل</Text>
                <Text style={[styles.earningsValue, { color: '#00B894' }]}>{stats.codCollected}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalOrdersCell}>
              <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>COD غير محصّل</Text>
              <Text style={[styles.earningsValue, { color: '#E17055' }]}>{stats.codUncollected}</Text>
            </View>
          </View>
        </Card>

        {/* Earnings Info */}
        <Card style={styles.earningsCard} accentColor={theme.primary} accentPosition="left">
          <View style={styles.earningsRow}>
            <View style={styles.earningsIconCell}>
               <View style={[styles.iconCircle, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="cash-outline" size={24} color={theme.primary} />
               </View>
               <View>
                 <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>عمولتك لكل طلب ناجح</Text>
                 <Text style={[styles.earningsValue, { color: theme.primary }]}>{formatCurrency(REGIONAL_MANAGER_FEE)}</Text>
               </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalOrdersCell}>
               <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>إجمالي الطلبات</Text>
               <Text style={[styles.earningsValue, { color: theme.colors.text }]}>{stats.totalOrders}</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: spacing.md }]}>إجراءات سريعة</Text>
        <Card style={styles.actionsCard}>
           <TouchableOpacity 
             style={styles.actionItem} 
             onPress={() => router.push('/(regional_manager)/deliveries')}
           >
              <View style={[styles.actionIcon, { backgroundColor: theme.primary + '15' }]}>
                 <Ionicons name="car-outline" size={22} color={theme.primary} />
              </View>
              <Text style={[styles.actionText, { color: theme.colors.text }]}>إدارة التوصيلات الإقليمية</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
           </TouchableOpacity>
        </Card>

        {/* Pending Orders Preview */}
        <View style={styles.sectionHeader}>
           <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
             طلبات قيد المراجعة
           </Text>
           <TouchableOpacity>
             <Text style={[styles.viewAll, { color: theme.primary }]}>عرض الكل ({pendingOrders.length})</Text>
           </TouchableOpacity>
        </View>

        {pendingOrders.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={48} color={theme.primary + '30'} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
              تمت معالجة جميع الطلبات بنجاح ✓
            </Text>
          </Card>
        ) : (
          pendingOrders.slice(0, 3).map(order => (
            <Card key={order.id} style={styles.orderCard} borderVariant="default">
              <View style={styles.orderHeader}>
                <View>
                  <Text style={[styles.orderCustomer, { color: theme.colors.text }]}>
                    {order.customer_name}
                  </Text>
                  <Text style={[styles.orderAddress, { color: theme.colors.textSecondary }]}>
                    {order.wilaya || ''} · {order.commune || ''}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#FDCB6E15' }]}>
                  <Text style={[styles.statusText, { color: '#FDCB6E' }]}>قيد الانتظار</Text>
                </View>
              </View>
              <View style={styles.orderFooter}>
                <Text style={[styles.orderTotal, { color: theme.primary }]}>
                  {formatCurrency(order.sale_price || order.total)}
                </Text>
                <View style={styles.dateBox}>
                  <Ionicons name="calendar-outline" size={12} color={theme.colors.textTertiary} style={{ marginEnd: 4 }} />
                  <Text style={[styles.orderDate, { color: theme.colors.textTertiary }]}>
                    {new Date(order.created_at).toLocaleDateString('ar-DZ')}
                  </Text>
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
  scroll: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: 100 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  viewAll: { ...typography.small, fontFamily: 'Tajawal_700Bold' },
  earningsCard: { marginVertical: spacing.sm },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earningsIconCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsLabel: { ...typography.caption, marginBottom: 2 },
  earningsValue: { ...typography.h3, fontSize: 18 },
  totalOrdersCell: {
    alignItems: 'flex-end',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  emptyCard: { alignItems: 'center', padding: spacing.xxl, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  emptyText: { ...typography.body, textAlign: 'center' },
  orderCard: { marginBottom: spacing.md },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderCustomer: { ...typography.bodyBold, fontSize: 16 },
  orderAddress: { ...typography.caption, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
    paddingTop: spacing.sm,
  },
  orderTotal: { ...typography.bodyBold, fontSize: 16 },
  dateBox: { flexDirection: 'row', alignItems: 'center' },
  orderDate: { ...typography.small, fontSize: 12 },
  bottomSpacer: { height: 60 },
  actionsCard: {
    padding: 0,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: 16,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    ...typography.bodyBold,
    fontSize: 16,
  },
});
