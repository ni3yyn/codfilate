import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/hooks/useTheme';
import { useStoreStore } from '../../src/stores/useStoreStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import Card from '../../src/components/ui/Card';
import Avatar from '../../src/components/ui/Avatar';
import Badge from '../../src/components/ui/Badge';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency, formatCompactNumber, formatDate } from '../../src/lib/utils';

const ExpandedTrustDetails = ({ affiliate, profile, onToggleStatus, theme }) => {
  const { fetchAffiliateOrderAnalytics } = useAffiliateStore();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const res = await fetchAffiliateOrderAnalytics(affiliate.id);
      if (mounted && res.success) {
        setAnalytics(res.data);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [affiliate.id]);

  if (loading) {
    return (
      <View style={[styles.expandedContent, { borderTopColor: theme.colors.divider, alignItems: 'center', paddingVertical: 20 }]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={{ marginTop: 8, color: theme.colors.textSecondary, ...typography.small }}>جاري تحليل جودة الترافيك...</Text>
      </View>
    );
  }

  const { total, delivered, cancelled, pending, deliveryRate, spamRate, grade } = analytics || { total: 0, delivered: 0, cancelled: 0, pending: 0, deliveryRate: 0, spamRate: 0, grade: 'N/A' };
  
  const getGradeColor = (g) => {
    if (g === 'A') return '#00B894';
    if (g === 'B') return '#0984e3';
    if (g === 'C') return '#fdcb6e';
    return '#d63031';
  };

  return (
    <View style={[styles.expandedContent, { borderTopColor: theme.colors.divider }]}>
      
      {/* Trust Grade Badge */}
      <View style={[styles.detailsBox, { backgroundColor: theme.colors.shimmer, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
         <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: getGradeColor(grade) + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: getGradeColor(grade) }}>{grade}</Text>
         </View>
         <View style={{ flex: 1 }}>
            <Text style={{ ...typography.bodyBold, color: theme.colors.text }}>تقييم جودة المسوق</Text>
            <Text style={{ ...typography.caption, color: theme.colors.textSecondary }}>
              معدل التوصيل: {deliveryRate}% | المسترجع: {spamRate}%
            </Text>
         </View>
      </View>

      <View style={[styles.detailsBox, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>إجمالي الطلبات (الفعلية):</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text, fontWeight: 'bold' }]}>{total}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: getGradeColor('A') }]}>طلبات ناجحة (مُوصّلة):</Text>
          <Text style={[styles.detailValue, { color: getGradeColor('A') }]}>{delivered}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: getGradeColor('F') }]}>طلبات وهمية / مسترجعة:</Text>
          <Text style={[styles.detailValue, { color: getGradeColor('F') }]}>{cancelled}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => onToggleStatus(affiliate)}
        style={[
          styles.toggleBtn,
          {
            backgroundColor: affiliate.is_active ? 'rgba(214, 48, 49, 0.1)' : 'rgba(0, 184, 148, 0.1)',
            borderColor: affiliate.is_active ? 'rgba(214, 48, 49, 0.2)' : 'rgba(0, 184, 148, 0.2)',
          },
        ]}
        activeOpacity={0.7}
      >
        <Ionicons
          name={affiliate.is_active ? 'ban-outline' : 'play-circle-outline'}
          size={16}
          color={affiliate.is_active ? '#d63031' : '#00B894'}
        />
        <Text style={[styles.toggleText, { color: affiliate.is_active ? '#d63031' : '#00B894' }]}>
          {affiliate.is_active ? 'حظر المسوق (ترافيك وهمي)' : 'تفعيل المسوق'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function AffiliatesScreen() {
  const theme = useTheme();
  const currentStore = useStoreStore((s) => s.currentStore);
  const { affiliates, isLoading, fetchStoreAffiliates, toggleAffiliateStatus } = useAffiliateStore();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedAffiliate, setExpandedAffiliate] = useState(null);

  const loadData = useCallback(async () => {
    if (currentStore) await fetchStoreAffiliates(currentStore.id);
  }, [currentStore]);
  useEffect(() => { loadData(); }, [currentStore]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const filteredAffiliates = affiliates.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = a.profiles?.full_name || '';
    const phone = a.profiles?.phone || '';
    return (
      name.toLowerCase().includes(q) ||
      phone.includes(q) ||
      a.referral_code.toLowerCase().includes(q)
    );
  });

  const handleToggleStatus = (affiliate) => {
    const newStatus = !affiliate.is_active;
    const name = affiliate.profiles?.full_name || 'المسوق';
    Alert.alert(
      newStatus ? 'تفعيل المسوق' : 'تعطيل المسوق',
      `هل أنت متأكد من ${newStatus ? 'تفعيل' : 'تعطيل'} "${name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            const result = await toggleAffiliateStatus(affiliate.id, newStatus);
            if (!result.success) Alert.alert('خطأ', result.error);
          },
        },
      ]
    );
  };

  const renderAffiliate = ({ item }) => {
    const profile = item.profiles;
    const isExpanded = expandedAffiliate === item.id;
    const conversionRate = item.total_clicks > 0
      ? ((item.total_conversions / item.total_clicks) * 100).toFixed(1)
      : '0';

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpandedAffiliate(isExpanded ? null : item.id)}
      >
        <Card style={styles.card}>
          <View style={styles.row}>
            <Avatar
              name={profile?.full_name}
              imageUrl={profile?.avatar_url}
              size={46}
              showRing
              statusDot={item.is_active ? 'online' : 'offline'}
            />
            <View style={styles.info}>
              <Text style={[styles.name, { color: theme.colors.text }]}>
                {profile?.full_name || 'غير معروف'}
              </Text>
              <Text style={[styles.code, { color: theme.colors.textSecondary }]}>
                🔗 {item.referral_code}
              </Text>
              {profile?.phone && (
                <Text style={[styles.phone, { color: theme.colors.textTertiary }]}>
                  📱 {profile.phone}
                </Text>
              )}
            </View>
            <View style={styles.rightCol}>
              <Badge
                label={item.is_active ? 'نشط' : 'غير نشط'}
                variant={item.is_active ? 'success' : 'neutral'}
                pulse={item.is_active}
              />
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.textTertiary}
                style={{ marginTop: 4 }}
              />
            </View>
          </View>

          {/* Stats Row */}
          <LinearGradient
            colors={
              theme.isDark
                ? ['rgba(108, 92, 231, 0.08)', 'rgba(108, 92, 231, 0.03)']
                : ['rgba(108, 92, 231, 0.06)', 'rgba(108, 92, 231, 0.02)']
            }
            style={styles.statsRow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatCompactNumber(item.total_clicks)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>النقرات</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {item.total_conversions}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>التحويلات</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#00B894' }]}>
                {formatCurrency(item.total_earnings)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>الأرباح</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.primary }]}>
                {conversionRate}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>التحويل</Text>
            </View>
          </LinearGradient>

          {/* Expanded Details */}
          {isExpanded && (
            <ExpandedTrustDetails 
               affiliate={item} 
               profile={profile} 
               theme={theme} 
               onToggleStatus={handleToggleStatus} 
            />
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="المسوقين" 
        subtitle="إدارة شركاء التسويق ومتابعة أدائهم"
        rightAction={<Badge label={`${affiliates.length}`} variant="primary" />}
      />

      {/* Search */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
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

      {isLoading && affiliates.length === 0 ? (
        <LoadingSpinner message="جارٍ تحميل المسوقين..." />
      ) : (
        <FlatList
          data={filteredAffiliates}
          renderItem={renderAffiliate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={search ? 'لا توجد نتائج' : 'لا يوجد مسوقين'}
              message={
                search
                  ? 'لم يتم العثور على مسوقين يطابقون البحث.'
                  : 'سيظهر المسوقون هنا عندما ينضمون إلى متجرك.'
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
    textAlign: 'right',
    fontSize: 14,
  },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 120 },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  info: { flex: 1, marginStart: spacing.md, gap: 2 },
  name: { ...typography.bodyBold },
  code: { ...typography.caption },
  phone: { ...typography.small, fontSize: 11 },
  rightCol: { alignItems: 'flex-end' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    ...typography.bodyBold,
    marginBottom: 2,
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 13,
  },
  statLabel: { ...typography.small, fontSize: 10 },
  statDivider: { width: 1, height: 26, opacity: 0.5 },
  expandedContent: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  detailsBox: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { ...typography.caption },
  detailValue: { ...typography.caption, fontFamily: 'Tajawal_500Medium' },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: spacing.xs,
  },
  toggleText: { ...typography.small, fontFamily: 'Tajawal_700Bold' },
});
