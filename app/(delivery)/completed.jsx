import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDeliveryStore } from '../../src/stores/useDeliveryStore';
import Card from '../../src/components/ui/Card';
import StatCard from '../../src/components/ui/StatCard';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency } from '../../src/lib/utils';

/**
 * Premium Completed Deliveries Screen.
 * Forest/Mint theme, clear history tracking.
 */
export default function CompletedDeliveries() {
  const theme = useTheme();
  const profile = useAuthStore(s => s.profile);
  const { completedDeliveries, fetchCompletedDeliveries, isLoading } = useDeliveryStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (profile?.id) {
      await fetchCompletedDeliveries(profile.id);
    }
  }, [profile?.id, fetchCompletedDeliveries]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const isDelivered = item.status === 'delivered';

    return (
      <Card style={styles.card} accentColor={isDelivered ? theme.primary : theme.error} accentPosition="left">
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customerName, { color: theme.colors.text }]}>
              {item.customer_name || 'عميل'}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textTertiary }]}>
              {item.customer_phone || 'بدون رقم هاتف'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: (isDelivered ? theme.primary : theme.error) + '10' }]}>
            <Ionicons
              name={isDelivered ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={isDelivered ? theme.primary : theme.error}
            />
            <Text style={[styles.statusLabel, { color: isDelivered ? theme.primary : theme.error }]}>
              {isDelivered ? 'تم التوصيل' : 'فشل التوصيل'}
            </Text>
          </View>
        </View>

        {item.failed_reason && (
          <View style={[styles.failBox, { backgroundColor: theme.error + '05' }]}>
             <Text style={[styles.failReason, { color: theme.error }]}>
               السبب: {item.failed_reason}
             </Text>
          </View>
        )}

        <View style={styles.cardBottom}>
          <View style={styles.infoCol}>
             <Text style={[styles.label, { color: theme.colors.textTertiary }]}>تاريخ الحالة</Text>
             <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
               {item.delivered_at
                 ? new Date(item.delivered_at).toLocaleDateString('ar-DZ')
                 : item.failed_at
                 ? new Date(item.failed_at).toLocaleDateString('ar-DZ')
                 : new Date(item.created_at).toLocaleDateString('ar-DZ')
               }
             </Text>
          </View>
          
          <View style={styles.earnedCol}>
             <Text style={[styles.label, { color: theme.colors.textTertiary, textAlign: 'left' }]}>العمولة</Text>
             <Text style={[styles.earned, { color: isDelivered ? theme.primary : theme.colors.textTertiary }]}>
               {isDelivered ? `+${formatCurrency(item.delivery_fee || 0)}` : '—'}
             </Text>
          </View>
        </View>
      </Card>
    );
  };

  const successfulCount = completedDeliveries.filter(d => d.status === 'delivered').length;
  const failedCount = completedDeliveries.filter(d => d.status === 'failed').length;
  const totalEarned = completedDeliveries
    .filter(d => d.status === 'delivered')
    .reduce((sum, d) => sum + Number(d.delivery_fee || 0), 0);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="التوصيلات المكتملة"
        subtitle="السجل الكامل"
        rightAction={
           <View style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 }}>
              <Ionicons name="receipt" size={20} color="#FFFFFF" />
           </View>
        }
      />

      <View style={styles.statsRow}>
        <StatCard
          title="ناجحة"
          value={successfulCount}
          icon="checkmark-circle"
          color={theme.primary}
        />
        <StatCard
          title="فاشلة"
          value={failedCount}
          icon="close-circle"
          color={theme.error}
        />
        <StatCard
          title="الأرباح"
          value={formatCurrency(totalEarned)}
          icon="cash"
          color="#00CEC9"
        />
      </View>

      {isLoading && completedDeliveries.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={completedDeliveries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
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
              icon="calendar-outline"
              title="لا توجد بيانات بانتظارك"
              message="لم يتم تسجيل أي عمليات توصيل مكتملة حتى الآن"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  statsRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: -spacing.lg,
  },
  listContent: { padding: spacing.md, paddingBottom: 100 },
  card: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  customerName: { ...typography.bodyBold, fontSize: 16 },
  meta: { ...typography.caption, marginTop: 2 },
  statusLabel: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  failBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  failReason: { ...typography.caption, fontFamily: 'Tajawal_500Medium' },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  infoCol: { flex: 1 },
  earnedCol: { alignItems: 'flex-end' },
  label: { fontSize: 10, fontFamily: 'Tajawal_500Medium', marginBottom: 2 },
  earned: { ...typography.bodyBold, fontSize: 16 },
  date: { ...typography.small, fontFamily: 'Tajawal_700Bold' },
});
