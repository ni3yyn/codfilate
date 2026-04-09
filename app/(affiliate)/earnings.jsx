import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';

import UniversalHeader from '../../src/components/ui/UniversalHeader';
import Card from '../../src/components/ui/Card';
import Badge from '../../src/components/ui/Badge';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';

import { typography, spacing, borderRadius, gradients } from '../../src/theme/theme';
import { formatCurrency, formatDate } from '../../src/lib/utils';

export default function EarningsScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  
  // Responsive Architecture
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;
  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 900 : '100%';
  const numColumns = isDesktop ? 2 : 1; // 2-Column Grid for Web!

  const profile = useAuthStore((s) => s.profile);
  const {
    affiliateProfile,
    stats,
    commissions,
    fetchAffiliateProfile,
    fetchAffiliateStats,
    fetchCommissions,
    isLoading,
  } = useAffiliateStore();
  
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchAffiliateProfile(profile?.store_id),
      fetchAffiliateStats(),
      fetchCommissions(),
    ]);
  }, [profile, fetchAffiliateProfile, fetchAffiliateStats, fetchCommissions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalPending = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalPaid = stats.total_paid || 0;

  const COMMISSION_BADGE = {
    pending: 'warning',
    approved: 'info',
    paid: 'success',
    rejected: 'error',
  };

  const COMMISSION_STATUS_AR = {
    pending: 'قيد الانتظار',
    approved: 'مقبول',
    paid: 'مدفوع',
    rejected: 'مرفوض',
  };

  const COMMISSION_ICONS = {
    pending: { icon: 'time-outline', color: '#FDCB6E', bg: '#FDCB6E15' },
    approved: { icon: 'checkmark-circle-outline', color: '#74B9FF', bg: '#74B9FF15' },
    paid: { icon: 'wallet-outline', color: '#00B894', bg: '#00B89415' },
    rejected: { icon: 'close-circle-outline', color: '#FF6B6B', bg: '#FF6B6B15' },
  };

  // --- REUSABLE STAT CARD (Strictly Anchored Right) ---
  const StatCardUI = ({ title, value, icon, color, bg }) => (
    <Card style={[styles.statCard, isDesktop && styles.desktopStatCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.statHeaderRow}>
        <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color, writingDirection: 'rtl' }]}>{value}</Text>
    </Card>
  );

  // --- RENDER DASHBOARD HERO ---
  const renderDashboardHeader = () => {
    const TotalEarningsCard = (
      <LinearGradient 
        colors={gradients.primary} 
        style={[styles.balanceCard, isDesktop && styles.desktopBalanceCard]} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardCircle1} />
        <View style={styles.cardCircle2} />
        
        <View style={styles.balanceHeaderRow}>
          <Ionicons name="trending-up-outline" size={24} color="rgba(255,255,255,0.9)" />
          <Text style={styles.balanceLabel}>إجمالي الأرباح المحققة</Text>
        </View>
        <Text style={[styles.balanceValue, { writingDirection: 'rtl' }]}>
          {formatCurrency(stats.earnings || 0)}
        </Text>
        <View style={styles.balanceFooter}>
          <Text style={styles.balanceSubtext}>يتم احتساب العمولات بعد توصيل الطلبات بنجاح</Text>
        </View>
      </LinearGradient>
    );

    // Desktop/Web Layout: 3 Columns in ONE Row
    if (isDesktop) {
      return (
        <View style={styles.desktopHeroRow}>
          {TotalEarningsCard}
          <StatCardUI title="أرباح قيد الانتظار" value={formatCurrency(totalPending)} icon="time-outline" color="#FDCB6E" bg="#FDCB6E15" />
          <StatCardUI title="أرباح تم سحبها" value={formatCurrency(totalPaid)} icon="checkmark-done-outline" color="#00B894" bg="#00B89415" />
        </View>
      );
    }

    // Mobile Layout: Stacked
    return (
      <View style={styles.mobileHeroContainer}>
        {TotalEarningsCard}
        <View style={styles.mobileStatsRow}>
          <StatCardUI title="أرباح قيد الانتظار" value={formatCurrency(totalPending)} icon="time-outline" color="#FDCB6E" bg="#FDCB6E15" />
          <StatCardUI title="أرباح تم سحبها" value={formatCurrency(totalPaid)} icon="checkmark-done-outline" color="#00B894" bg="#00B89415" />
        </View>
      </View>
    );
  };

  // --- RENDER COMMISSION LIST ITEM ---
  const renderCommission = ({ item }) => {
    const config = COMMISSION_ICONS[item.status] || COMMISSION_ICONS.pending;
    
    return (
      <Card style={[styles.commissionCard, isDesktop && styles.desktopCommissionCard]} activeOpacity={0.9}>
        <View style={styles.commRow}>
          
          {/* Right Side: Icon & Details */}
          <View style={styles.commRightCol}>
            <View style={[styles.commIconWrap, { backgroundColor: config.bg }]}>
              <Ionicons name={config.icon} size={20} color={config.color} />
            </View>
            <View style={styles.commTextWrap}>
              <Text style={[styles.commTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {item.orders?.customer_name ? `طلب: ${item.orders.customer_name}` : 'عمولة تسويق'}
              </Text>
              <Text style={[styles.commDate, { color: theme.colors.textTertiary }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>

          {/* Left Side: Amount & Badge */}
          <View style={styles.commLeftCol}>
            <Text style={[styles.commAmount, { color: config.color, writingDirection: 'rtl' }]}>
              {formatCurrency(item.amount)}
            </Text>
            <Badge
              label={COMMISSION_STATUS_AR[item.status] || item.status}
              variant={COMMISSION_BADGE[item.status] || 'neutral'}
              pulse={item.status === 'pending'}
            />
          </View>

        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="الأرباح" 
        subtitle="ملخص العمولات والأرباح المحققة"
      />

      <View style={styles.centerWrapper}>
        <FlatList
          key={numColumns} // Forces re-render when switching between mobile/web
          data={commissions}
          renderItem={renderCommission}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={isDesktop ? styles.desktopColumnWrapper : null}
          style={styles.flatListBase}
          contentContainerStyle={[styles.contentContainer, { maxWidth: contentMaxWidth }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          
          ListHeaderComponent={
            <>
              {renderDashboardHeader()}
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>سجل العمولات</Text>
            </>
          }
          
          ListEmptyComponent={
            isLoading && commissions.length === 0 ? (
              <LoadingSpinner message="جارٍ تحميل العمولات..." />
            ) : (
              <EmptyState
                icon="cash-outline"
                title="لا توجد عمولات بعد"
                message="ستظهر العمولات الخاصة بك هنا بمجرد إتمام عملائك للطلبات."
              />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centerWrapper: { flex: 1, alignItems: 'center', width: '100%' },
  flatListBase: { flex: 1, width: '100%' },
  contentContainer: { 
    padding: spacing.md, 
    paddingBottom: 120, 
    width: '100%', 
    alignSelf: 'center',
    flexGrow: 1 
  },
  
  // --- DESKTOP HERO ROW (3 Columns Side-by-Side) ---
  desktopHeroRow: { 
    flexDirection: 'row-reverse', 
    width: '100%', 
    gap: spacing.lg, 
    alignItems: 'stretch',
    marginBottom: spacing.xl,
  },
  desktopBalanceCard: { flex: 1.5, marginBottom: 0 },
  desktopStatCard: { flex: 1, marginBottom: 0, justifyContent: 'center' },

  // --- MOBILE HERO STACK ---
  mobileHeroContainer: { width: '100%', marginBottom: spacing.xl },
  mobileStatsRow: { flexDirection: 'row-reverse', width: '100%', gap: spacing.sm },

  // --- GREEN BALANCE CARD ---
  balanceCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    marginBottom: spacing.sm,
    width: '100%',
  },
  cardCircle1: { position: 'absolute', top: -50, right: -20, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)' },
  cardCircle2: { position: 'absolute', bottom: -80, left: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' },
  
  balanceHeaderRow: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'flex-start', // Anchors to the right perfectly
    alignItems: 'center', 
    gap: spacing.sm,
    marginBottom: spacing.xs 
  },
  balanceLabel: { ...typography.body, color: 'rgba(255,255,255,0.9)', fontFamily: 'Tajawal_700Bold' },
  balanceValue: { fontFamily: 'Tajawal_800ExtraBold', color: '#FFFFFF', fontSize: 38, textAlign: 'right', marginVertical: spacing.xs, width: '100%' },
  balanceFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: spacing.sm, marginTop: spacing.sm, width: '100%' },
  balanceSubtext: { ...typography.caption, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },

  // --- WHITE STAT CARDS (Strict Right-To-Left Alignments) ---
  statCard: { 
    flex: 1, 
    borderWidth: 1, 
    padding: spacing.lg, 
    borderRadius: borderRadius.lg,
    alignItems: 'flex-end', // Anchors text/values to the right edge
  },
  statHeaderRow: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'flex-start', // Glues Icon and Text strictly to the right side
    alignItems: 'center', 
    gap: spacing.sm,
    width: '100%', 
    marginBottom: spacing.sm 
  },
  statIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statLabel: { ...typography.caption, textAlign: 'right', fontFamily: 'Tajawal_700Bold', fontSize: 14 },
  statValue: { ...typography.h3, textAlign: 'right', width: '100%', fontSize: 28 },

  // --- SECTION TITLE ---
  sectionTitle: { ...typography.h3, marginBottom: spacing.md, textAlign: 'right', width: '100%' },

  // --- COMMISSION GRID/LIST ---
  desktopColumnWrapper: { gap: spacing.lg, flexDirection: 'row-reverse' },
  commissionCard: { marginBottom: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: 'transparent', width: '100%' },
  desktopCommissionCard: { flex: 1, marginBottom: spacing.lg }, // Ensures grid items stretch nicely
  
  commRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  
  commRightCol: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: spacing.md, flex: 1 },
  commIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  commTextWrap: { flex: 1, alignItems: 'flex-end' },
  commTitle: { ...typography.bodyBold, textAlign: 'right', marginBottom: 4, fontSize: 15 },
  commDate: { ...typography.caption, textAlign: 'right' },
  
  commLeftCol: { alignItems: 'flex-start', paddingStart: spacing.sm },
  commAmount: { ...typography.h3, marginBottom: spacing.xs, fontSize: 18 },
});