import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';
import { useOrderStore } from '../../src/stores/useOrderStore';
import { useCampaignStore } from '../../src/stores/useCampaignStore';
import StatCard from '../../src/components/ui/StatCard';
import Card from '../../src/components/ui/Card';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing, borderRadius as themeRadius } from '../../src/theme/theme';
import { formatCurrency, formatCompactNumber } from '../../src/lib/utils';
import { LineChart } from 'react-native-gifted-charts';

export default function AffiliateDashboard() {
  const theme = useTheme();
  const { isWide, maxContentWidth, contentPadding, listContentBottomPad } = useResponsive();
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
  const { orders, fetchAffiliateOrders } = useOrderStore();
  const { campaigns, fetchCampaignsForAffiliate } = useCampaignStore();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Computed stats
  const pendingCommissions = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.amount || 0), 0);
  const approvedCommissions = stats.available_balance || 0;
  const activeCampaigns = (campaigns || []).filter(c => c.is_active).length;
  const totalOrdersGenerated = orders?.length || 0;
  const deliveredOrders = (orders || []).filter(o => o.status === 'delivered').length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthEarnings = commissions.filter(c => c.created_at?.startsWith(thisMonth)).reduce((s, c) => s + Number(c.amount || 0), 0);

  const loadData = useCallback(async () => {
    try {
      const targetStoreId = profile?.store_id;
      await fetchAffiliateProfile(targetStoreId);
      await fetchAffiliateStats();
      await fetchCommissions();
      await fetchAffiliateOrders();
      await fetchCampaignsForAffiliate();
    } catch (e) {
      if (__DEV__) console.warn('[Dashboard] loadData error:', e);
    } finally {
      setInitialLoaded(true);
    }
  }, [profile, fetchAffiliateProfile, fetchAffiliateStats, fetchCommissions, fetchAffiliateOrders, fetchCampaignsForAffiliate]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleCopyCode = async () => {
    if (affiliateProfile?.referral_code) {
      await Clipboard.setStringAsync(affiliateProfile.referral_code);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!initialLoaded && !affiliateProfile) return <LoadingSpinner message="جارٍ تجهيز بياناتك..." />;

  const getChartData = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }).reverse();
    return last7Days.map(dateStr => {
      const dayTotal = commissions.filter(c => {
        if (!c.created_at) return false;
        const cDate = new Date(c.created_at);
        return `${cDate.getFullYear()}-${String(cDate.getMonth() + 1).padStart(2, '0')}-${String(cDate.getDate()).padStart(2, '0')}` === dateStr;
      }).reduce((sum, c) => sum + Number(c.amount || 0), 0);
      return { value: dayTotal, label: dateStr.split('-')[2] };
    });
  };

  const chartData = getChartData();
  const maxVal = Math.max(...chartData.map(d => d.value), 500);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader title="لوحة التحكم" subtitle={`مرحباً بك، ${profile?.full_name || 'مسوق'}`} />
      
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isWide && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: contentPadding, paddingBottom: listContentBottomPad },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={styles.heroSection}>
          <Card style={[styles.heroCard, { backgroundColor: theme.primary }]}>
            <View style={styles.heroContent}>
              <View style={styles.heroText}>
                <Text style={styles.heroLabel}>الرصيد المتاح للسحب</Text>
                <Text style={styles.heroValue}>{formatCurrency(stats.available_balance || 0)}</Text>
              </View>
              <View style={styles.heroIconBox}>
                <Ionicons name="wallet" size={32} color="rgba(255,255,255,0.3)" />
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Primary Stats Grid */}
        <View style={styles.gridContainer}>
          <StatCard title="إجمالي الأرباح" value={formatCurrency(stats.earnings)} icon="trending-up" color="#6C5CE7" animate />
          <StatCard title="عمولات معلقة" value={formatCurrency(pendingCommissions)} icon="time" color="#FDCB6E" animate />
          <StatCard title="النقرات" value={formatCompactNumber(stats.clicks)} icon="finger-print" color="#0984E3" animate />
          <StatCard title="التحويل" value={`${stats.conversionRate}%`} icon="trending-up" color="#00B894" animate />
        </View>

        {/* Logistics Ribbon */}
        <View style={styles.ribbonContainer}>
          <View style={styles.ribbon}>
             <View style={styles.ribbonItem}>
               <Text style={styles.ribbonLabel}>مدفوعة</Text>
               <Text style={[styles.ribbonVal, { color: '#2D6A4F' }]}>{formatCurrency(stats.total_paid)}</Text>
             </View>
             <View style={styles.ribbonDivider} />
             <View style={styles.ribbonItem}>
               <Text style={styles.ribbonLabel}>الطلبات</Text>
               <Text style={[styles.ribbonVal, { color: theme.primary }]}>{totalOrdersGenerated}</Text>
             </View>
             <View style={styles.ribbonDivider} />
             <View style={styles.ribbonItem}>
               <Text style={styles.ribbonLabel}>حملات</Text>
               <Text style={[styles.ribbonVal, { color: '#E17055' }]}>{activeCampaigns}</Text>
             </View>
          </View>
        </View>

        {/* Referral Bento */}
        {affiliateProfile && (
           <TouchableOpacity style={styles.referralBento} onPress={handleCopyCode} activeOpacity={0.9}>
              <View style={styles.bentoLeft}>
                 <Text style={[styles.bentoLabel, { color: theme.colors.textSecondary }]}>رمز الإحالة الخاص بك</Text>
                 <Text style={[styles.bentoValue, { color: theme.colors.text }]}>{affiliateProfile.referral_code}</Text>
              </View>
              <View style={[styles.bentoAction, { backgroundColor: theme.primary + (copied ? '20' : '10') }]}>
                 <Ionicons name={copied ? 'checkmark' : 'copy'} size={20} color={theme.primary} />
                 <Text style={[styles.bentoActionText, { color: theme.primary }]}>{copied ? 'تم' : 'نسخ'}</Text>
              </View>
           </TouchableOpacity>
        )}

        {/* Pro Tips & Alerts */}
        <View style={styles.tipsContainer}>
           <View style={[styles.tipCard, { backgroundColor: theme.primary + '08' }]}>
              <View style={styles.tipHeader}>
                 <Ionicons name="bulb" size={18} color={theme.primary} />
                 <Text style={[styles.tipTitle, { color: theme.primary }]}>نصيحة للمسوقين 🚀</Text>
              </View>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                ركز على التسويق الذكي! لا تبالغ في زيادة سعر البيع لتجنب المرتجعات.
              </Text>
           </View>
           
           <View style={[styles.tipCard, { backgroundColor: '#FF6B6B08' }]}>
              <View style={styles.tipHeader}>
                 <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
                 <Text style={[styles.tipTitle, { color: '#FF6B6B' }]}>تنبيه هام ⚠️</Text>
              </View>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                أرباحك يتم صرفها من طرف المدير الإقليمي فور استلام الزبون للطلبية.
              </Text>
           </View>
        </View>

        {/* Chart Section */}
        <View style={styles.sectionHeader}>
           <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>أداء العمولات الأسبوعي</Text>
        </View>
        <Card style={styles.chartCard}>
           <LineChart 
             data={chartData} 
             height={180} 
             width={isWide ? 800 : 320} 
             initialSpacing={10} 
             spacing={isWide ? 100 : 45} 
             color={theme.primary} 
             thickness={5} 
             startFillColor={theme.primary} 
             endFillColor="transparent" 
             startOpacity={0.1} 
             endOpacity={0} 
             curved 
             isAnimated 
             noOfSections={4} 
             maxValue={maxVal + (maxVal * 0.2)} 
             areaChart 
             yAxisTextStyle={{ color: theme.colors.textTertiary, fontSize: 10 }} 
             xAxisLabelTextStyle={{ color: theme.colors.textTertiary, fontSize: 10 }}
             dataPointsColor={theme.primary}
             dataPointsRadius={4}
             focusEnabled
           />
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.md, paddingTop: spacing.sm },
  heroSection: { marginBottom: 12 },
  heroCard: { padding: 22, borderRadius: 24, borderVariant: 'none', shadowOpacity: 0.12 },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroText: { flex: 1 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  heroValue: { color: '#FFFFFF', fontSize: 30, fontFamily: 'Tajawal_800ExtraBold', marginTop: 4 },
  heroTrend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  heroTrendText: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  heroIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  ribbonContainer: { marginBottom: 15 },
  ribbon: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 18, alignItems: 'center', shadowOpacity: 0.04, borderWidth: 1, borderColor: '#F1F5F9' },
  ribbonItem: { flex: 1, alignItems: 'center', gap: 2 },
  ribbonDivider: { width: 1, height: 28, backgroundColor: '#F1F5F9' },
  ribbonVal: { fontSize: 16, fontFamily: 'Tajawal_800ExtraBold' },
  ribbonLabel: { fontSize: 10, color: '#64748B', fontFamily: 'Tajawal_700Bold', marginBottom: 2 },
  referralBento: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, shadowOpacity: 0.03, borderWidth: 1, borderColor: '#F1F5F9' },
  bentoLeft: { flex: 1 },
  bentoLabel: { fontSize: 12, fontFamily: 'Tajawal_500Medium', marginBottom: 4 },
  bentoValue: { fontSize: 24, fontFamily: 'Tajawal_800ExtraBold', letterSpacing: 1 },
  bentoAction: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 },
  bentoActionText: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  tipsContainer: { gap: 10, marginBottom: 15 },
  tipCard: { padding: 14, borderRadius: 18 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tipTitle: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  tipText: { fontSize: 12, fontFamily: 'Tajawal_500Medium', lineHeight: 18 },
  sectionTitle: { ...typography.bodyBold, fontSize: 18, marginBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 12 },
  chartCard: { paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, alignItems: 'center', borderRadius: 24, borderVariant: 'none', shadowOpacity: 0.04 },
  bottomSpacer: { height: 100 },
});
