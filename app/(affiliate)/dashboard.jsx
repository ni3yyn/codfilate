import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Platform,
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
import Avatar from '../../src/components/ui/Avatar';
import Card from '../../src/components/ui/Card';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
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

  // Computed stats
  const pendingCommissions = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.amount || 0), 0);
  const paidCommissions = stats.total_paid || 0;
  const approvedCommissions = commissions.filter(c => c.status === 'approved').reduce((s, c) => s + Number(c.amount || 0), 0);
  const activeCampaigns = (campaigns || []).filter(c => c.is_active).length;
  const totalOrdersGenerated = orders?.length || 0;
  const deliveredOrders = (orders || []).filter(o => o.status === 'delivered').length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthEarnings = commissions.filter(c => c.created_at?.startsWith(thisMonth)).reduce((s, c) => s + Number(c.amount || 0), 0);

  const loadData = useCallback(async () => {
    const targetStoreId = profile?.store_id;
    await fetchAffiliateProfile(targetStoreId);
    
    // Fetch all aggregate stats and global data
    await Promise.all([
      fetchAffiliateStats(),
      fetchCommissions(),
      fetchAffiliateOrders(),
      fetchCampaignsForAffiliate(),
    ]);
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

  if (isLoading && !affiliateProfile) return <LoadingSpinner message="جارٍ تجهيز بياناتك..." />;

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
      return { value: dayTotal, label: dateStr.split('-')[2], dataPointText: dayTotal > 0 ? String(dayTotal) : '' };
    });
  };

  const chartData = getChartData();
  const maxVal = Math.max(...chartData.map(d => d.value), 500);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="لوحة التحكم" 
        subtitle={`مرحباً بك، ${profile?.full_name || 'مسوق'}`}
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
        {/* Referral Code */}
        {affiliateProfile && (
          <Card style={styles.codeCard} accentColor={theme.primary} accentPosition="left">
            <View style={styles.codeCardInner}>
              <View style={styles.codeLeft}>
                <Text style={[styles.codeLabel, { color: theme.colors.textSecondary }]}>رمز الإحالة الخاص بك</Text>
                <Text style={[styles.codeValue, { color: theme.colors.text }]}>{affiliateProfile.referral_code}</Text>
              </View>
              <TouchableOpacity onPress={handleCopyCode} style={[styles.copyBtn, { backgroundColor: theme.primary + '15' }]} activeOpacity={0.7}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color={theme.primary} />
                <Text style={[styles.copyText, { color: theme.primary }]}>{copied ? 'تم النسخ' : 'نسخ الرمز'}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Pro Tip */}
        <View style={{ backgroundColor: theme.primary + '10', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md }}>
           <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
             <Ionicons name="rocket" size={20} color={theme.primary} style={{ marginEnd: 8 }} />
             <Text style={{ fontFamily: 'Tajawal_700Bold', color: theme.primary }}>نصيحة للمسوقين 🚀</Text>
           </View>
           <Text style={{ fontFamily: 'Tajawal_500Medium', color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
             ركز على التسويق الذكي! لا تبالغ في زيادة سعر البيع لتجنب المرتجعات. تأكد دائماً من أن رقم هاتف الزبون صحيح قبل تأكيد الطلبية لضمان سرعة التوصيل.
           </Text>
        </View>

        <View style={{ backgroundColor: '#FF6B6B10', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md }}>
           <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
             <Ionicons name="shield-checkmark" size={20} color="#FF6B6B" style={{ marginEnd: 8 }} />
             <Text style={{ fontFamily: 'Tajawal_700Bold', color: '#FF6B6B' }}>تنبيه هام ⚠️</Text>
           </View>
           <Text style={{ fontFamily: 'Tajawal_500Medium', color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
             أرباحك يتم صرفها من طرف المدير الإقليمي لولاية التاجر فور استلام الزبون للطلبية. تأكد من إدخال معلومات CCP/بريدي موب بشكل صحيح في حسابك.
           </Text>
        </View>

        {/* Main Stats */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>نظرة إحصائية</Text>
        <View style={styles.statsRow}>
          <StatCard title="إجمالي الأرباح" value={formatCurrency(stats.earnings)} icon="wallet" color={theme.primary} subtitle="رصيد متوفر" />
          <StatCard title="أرباح الشهر" value={formatCurrency(thisMonthEarnings)} icon="calendar" color="#6C5CE7" subtitle={thisMonth} />
          <StatCard title="عمولات معلقة" value={formatCurrency(pendingCommissions)} icon="time" color="#FDCB6E" subtitle="بانتظار التسوية" />
          <StatCard title="عمولات مدفوعة" value={formatCurrency(stats.total_paid)} icon="checkmark-circle" color="#00B894" />
          <StatCard title="الطلبات المولدة" value={String(totalOrdersGenerated)} icon="receipt" color="#0984E3" subtitle={`${deliveredOrders} تم توصيلها`} />
          <StatCard title="حملات نشطة" value={String(activeCampaigns)} icon="megaphone" color="#E17055" subtitle={`من ${(campaigns || []).length} إجمالي`} />
          <StatCard title="النقرات" value={formatCompactNumber(stats.clicks)} icon="finger-print" color="#6C5CE7" subtitle="زيارات الروابط" />
          <StatCard title="معدل التحويل" value={`${stats.conversionRate}%`} icon="trending-up" color="#FDCB6E" subtitle="أداء الروابط" />
        </View>

        {/* Chart */}
        {affiliateProfile && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: spacing.lg }]}>💰 أداء الأرباح (آخر ٧ أيام)</Text>
            <Card style={styles.chartCard}>
              <LineChart data={chartData} height={160} width={300} initialSpacing={20} spacing={45} color={theme.primary} thickness={3} startFillColor={theme.primary} endFillColor={theme.primary + '05'} startOpacity={0.2} endOpacity={0.02} rulesColor="rgba(0,0,0,0.03)" yAxisColor="transparent" xAxisColor="transparent" yAxisTextStyle={{ color: theme.colors.textTertiary, fontSize: 10 }} xAxisLabelTextStyle={{ color: theme.colors.textTertiary, fontSize: 10 }} hideDataPoints={false} dataPointsColor={theme.primary} dataPointsRadius={4} curved isAnimated noOfSections={4} maxValue={maxVal + (maxVal * 0.2)} areaChart />
            </Card>
          </>
        )}

        {!affiliateProfile && (
          <Card style={styles.noStoreCard} accentColor={theme.primary} accentPosition="left">
            <View style={[styles.noStoreIcon, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="rocket-outline" size={40} color={theme.primary} />
            </View>
            <Text style={[styles.noStoreTitle, { color: theme.colors.text }]}>ابدأ رحلة الأرباح</Text>
            <Text style={[styles.noStoreDesc, { color: theme.colors.textSecondary }]}>تصفح المنتجات المتوفرة في السوق وابدأ في إنشاء روابط التسويق الخاصة بك.</Text>
            <TouchableOpacity 
              onPress={() => router.push('/(affiliate)/store')}
              style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: spacing.lg }}
            >
              <Text style={{ color: '#FFF', fontFamily: 'Tajawal_700Bold' }}>تصفح المنتجات</Text>
            </TouchableOpacity>
          </Card>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.md, paddingTop: spacing.xs, paddingBottom: 220 },
  codeCard: { marginBottom: spacing.lg },
  codeCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeLeft: {},
  codeLabel: { ...typography.caption, marginBottom: 4 },
  codeValue: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 24, letterSpacing: 2 },
  copyBtn: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 4 },
  copyText: { fontSize: 10, fontFamily: 'Tajawal_700Bold' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  chartCard: { paddingVertical: spacing.lg, alignItems: 'center', overflow: 'hidden' },
  noStoreCard: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.xxl, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  noStoreIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  noStoreTitle: { ...typography.h1, fontSize: 20, marginBottom: spacing.sm, textAlign: 'center' },
  noStoreDesc: { ...typography.body, textAlign: 'center', paddingHorizontal: spacing.xl },
  bottomSpacer: { height: 100 },
});
