import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Hooks & Stores
import { useTheme } from "../../src/hooks/useTheme";
import { useResponsive } from "../../src/hooks/useResponsive";
import { useStoreStore } from "../../src/stores/useStoreStore";
import { useAffiliateStore } from "../../src/stores/useAffiliateStore";

// UI Components
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import Card from "../../src/components/ui/Card";
import Avatar from "../../src/components/ui/Avatar";
import Badge from "../../src/components/ui/Badge";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import CustomAlert from "../../src/components/ui/CustomAlert";
import Modal from "../../src/components/ui/Modal";
import { Stack } from 'expo-router';

// Utils & Theme
import { spacing, typography, borderRadius, shadows } from "../../src/theme/theme";
import { formatCurrency, formatCompactNumber } from "../../src/lib/utils";

// --- Memoized Trust Details Component ---
const ExpandedTrustDetails = React.memo(({ affiliate, theme, onToggleStatus }) => {
  const { fetchAffiliateOrderAnalytics } = useAffiliateStore();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const res = await fetchAffiliateOrderAnalytics(affiliate.id);
      if (mounted && res.success) {
        setAnalytics(res.data);
      }
      if (mounted) {
        setLoading(false);
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    })();
    return () => { mounted = false; };
  }, [affiliate.id, fetchAffiliateOrderAnalytics]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          جاري تحليل أداء المسوق...
        </Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ opacity: contentOpacity }}>
      {/* Trust Metrics Grid */}
      <View style={styles.trustGrid}>
        <View style={[styles.trustMetricBox, { backgroundColor: theme.colors.surface2 }]}>
          <View style={[styles.gradeCircle, { backgroundColor: getGradeColor(analytics?.grade) + "15" }]}>
            <Text style={[styles.gradeText, { color: getGradeColor(analytics?.grade) }]}>
              {analytics?.grade || "C"}
            </Text>
          </View>
          <Text style={[styles.trustMetricLabel, { color: theme.colors.textSecondary }]}>درجة الموثوقية</Text>
        </View>

        <View style={styles.analyticsColumn}>
          <View style={[styles.miniStat, { backgroundColor: theme.colors.surface2 }]}>
            <Text style={[styles.miniStatValue, { color: theme.colors.text }]}>{analytics?.deliveryRate || 0}%</Text>
            <Text style={[styles.miniStatLabel, { color: theme.colors.textTertiary }]}>نسبة التوصيل</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: theme.colors.surface2 }]}>
            <Text style={[styles.miniStatValue, { color: '#d63031' }]}>{analytics?.spamRate || 0}%</Text>
            <Text style={[styles.miniStatLabel, { color: '#d63031' }]}>نسبة الارتجاع</Text>
          </View>
        </View>
      </View>

      {/* Performance Summary */}
      <View style={[styles.performanceSummary, { backgroundColor: theme.colors.surface2 }]}>
        <View style={styles.perfRow}>
          <View style={styles.perfItem}>
            <Text style={[styles.perfValue, { color: theme.colors.text }]}>{analytics?.total || 0}</Text>
            <Text style={[styles.perfLabel, { color: theme.colors.textTertiary }]}>إجمالي الطلبات</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={[styles.perfValue, { color: '#00B894' }]}>{analytics?.delivered || 0}</Text>
            <Text style={[styles.perfLabel, { color: '#00B894' }]}>تم توصيلها</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={[styles.perfValue, { color: '#d63031' }]}>{analytics?.cancelled || 0}</Text>
            <Text style={[styles.perfLabel, { color: '#d63031' }]}>ملغاة/وهمية</Text>
          </View>
        </View>
      </View>

      {/* Status Control */}
      <TouchableOpacity
        onPress={() => onToggleStatus(affiliate)}
        style={[
          styles.actionButton,
          {
            backgroundColor: affiliate.is_active ? "#d6303110" : "#00B89410",
            borderColor: affiliate.is_active ? "#d6303130" : "#00B89430",
            marginTop: spacing.lg,
          },
        ]}
      >
        <Ionicons
          name={affiliate.is_active ? "shield-off-outline" : "shield-checkmark-outline"}
          size={18}
          color={affiliate.is_active ? "#d63031" : "#00B894"}
        />
        <Text style={[styles.actionButtonText, { color: affiliate.is_active ? "#d63031" : "#00B894" }]}>
          {affiliate.is_active ? "حظر المسوق (ترافيك سيئ)" : "تفعيل المسوق"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const getGradeColor = (g) => {
  if (g === "A") return "#00B894";
  if (g === "B") return "#0984e3";
  if (g === "C") return "#6c5ce7";
  return "#d63031";
};

// --- Memoized Affiliate Card Component ---
const AffiliateCard = React.memo(({ item, onDetailPress, theme, isWide }) => {
  const profile = item.profiles;
  const conversionRate = item.total_clicks > 0 ? ((item.total_conversions / item.total_clicks) * 100).toFixed(1) : "0";

  return (
    <View style={isWide ? styles.cardWrapperWide : styles.cardWrapperMobile}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onDetailPress(item)}
        style={[
          styles.cardContainer,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }
        ]}
      >
        {/* Top Info Section */}
        <View style={styles.cardHeader}>
          <View style={styles.headerRight}>
            <Avatar
              name={profile?.full_name || "U"}
              imageUrl={profile?.avatar_url}
              size={56}
              showRing
              statusDot={item.is_active ? "online" : "offline"}
            />
            <View style={styles.nameSection}>
              <Text style={[styles.profileName, { color: theme.colors.text }]} numberOfLines={1}>
                {profile?.full_name || "مسوق غير معروف"}
              </Text>
              <View style={styles.idBadge}>
                <Text style={[styles.idText, { color: theme.colors.textSecondary }]}>{item.referral_code}</Text>
                <Ionicons name="copy-outline" size={12} color={theme.colors.textTertiary} />
              </View>
            </View>
          </View>

          <View style={styles.headerLeft}>
            <Badge
              label={item.is_active ? "نشط" : "محظور"}
              variant={item.is_active ? "success" : "error"}
              pulse={item.is_active}
              style={styles.statusBadge}
            />
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </View>
        </View>

        {/* Quick Metrics Bar */}
        <View style={[styles.metricsBar, { backgroundColor: theme.colors.surface2 }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>الأرباح</Text>
            <Text style={[styles.metricValue, { color: '#00B894' }]}>{formatCurrency(item.total_earnings)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>معدل التحويل</Text>
            <Text style={[styles.metricValue, { color: theme.primary }]}>{conversionRate}%</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>المبيعات</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{item.total_conversions}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// --- Main Screen Component ---
export default function AffiliatesScreen() {
  const theme = useTheme();
  const { isWide } = useResponsive();
  const currentStore = useStoreStore((s) => s.currentStore);

  const { affiliates, isLoading, fetchStoreAffiliates, toggleAffiliateStatus } = useAffiliateStore();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    affiliate: null,
    newStatus: false,
  });

  const loadData = useCallback(async () => {
    if (currentStore) await fetchStoreAffiliates(currentStore.id);
  }, [currentStore, fetchStoreAffiliates]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };


  const requestToggleStatus = useCallback((affiliate) => {
    setConfirmModal({
      visible: true,
      affiliate,
      newStatus: !affiliate.is_active,
    });
  }, []);

  const executeToggleStatus = async () => {
    const { affiliate, newStatus } = confirmModal;
    setConfirmModal({ visible: false, affiliate: null, newStatus: false });

    if (affiliate) {
      const result = await toggleAffiliateStatus(affiliate.id, newStatus);
      if (!result.success) {
        Platform.OS === 'web' ? window.alert(result.error) : Alert.alert("خطأ", result.error);
      }
    }
  };

  const filteredAffiliates = useMemo(() => {
    return affiliates.filter((a) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const name = a.profiles?.full_name || "";
      const phone = a.profiles?.phone || "";
      return name.toLowerCase().includes(q) || phone.includes(q) || a.referral_code.toLowerCase().includes(q);
    });
  }, [affiliates, search]);

  const stats = useMemo(() => ({
    total: affiliates.length,
    active: affiliates.filter(a => a.is_active).length,
    revenue: affiliates.reduce((sum, a) => sum + Number(a.total_earnings || 0), 0),
  }), [affiliates]);

  const renderItem = useCallback(({ item }) => (
    <AffiliateCard
      item={item}
      onDetailPress={(aff) => setSelectedAffiliate(aff)}
      theme={theme}
      isWide={isWide}
    />
  ), [setSelectedAffiliate, theme, isWide]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <UniversalHeader
        title="إدارة المسوقين"
        subtitle="تتبع أداء شركاء النجاح وتحليل جودة المبيعات"
      />

      <View style={[styles.contentWrapper, isWide && styles.contentWrapperWide]}>
        


        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="البحث عن مسوق بالاسم أو الكود..."
            placeholderTextColor={theme.colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading && affiliates.length === 0 ? (
          <LoadingSpinner message="جارٍ تحميل قائمة المسوقين..." />
        ) : (
          <FlatList
            key={isWide ? 'grid' : 'list'}
            data={filteredAffiliates}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            numColumns={isWide ? 2 : 1}
            columnWrapperStyle={isWide ? styles.gridRow : undefined}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            ListEmptyComponent={
              <EmptyState
                icon="people-outline"
                title={search ? "لا توجد نتائج" : "لا يوجد مسوقين"}
                message={search ? "جرب البحث بكلمات أخرى." : "لم ينضم أي مسوق لمتجرك حتى الآن."}
              />
            }
          />
        )}
      </View>

      <CustomAlert
        visible={confirmModal.visible}
        title={confirmModal.newStatus ? "تفعيل المسوق" : "حظر المسوق"}
        message={`هل أنت متأكد من ${confirmModal.newStatus ? "تفعيل" : "حظر"} "${confirmModal.affiliate?.profiles?.full_name || "هذا المسوق"} "؟`}
        type={confirmModal.newStatus ? "default" : "destructive"}
        confirmText="تأكيد"
        cancelText="إلغاء"
        onConfirm={executeToggleStatus}
        onCancel={() => setConfirmModal({ visible: false, affiliate: null, newStatus: false })}
      />

      <Modal
        visible={!!selectedAffiliate}
        onClose={() => setSelectedAffiliate(null)}
        title={selectedAffiliate?.profiles?.full_name || "تفاصيل المسوق"}
        subtitle={`رمز الإحالة: ${selectedAffiliate?.referral_code || ""}`}
      >
        <View style={{ marginTop: spacing.md }}>
          {selectedAffiliate && (
            <ExpandedTrustDetails 
              affiliate={selectedAffiliate} 
              theme={theme} 
              onToggleStatus={requestToggleStatus} 
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Enhanced Premium Styles ---
const styles = StyleSheet.create({
  safe: { flex: 1 },
  contentWrapper: { flex: 1 },
  contentWrapperWide: { maxWidth: 1200, width: '100%', alignSelf: 'center' },

  // Dashboard Stats
  statsSummaryRow: {
    padding: spacing.md,
    gap: spacing.md,
  },
  mainStatCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  mainStatLabel: { ...typography.small, color: 'rgba(255,255,255,0.8)', fontFamily: 'Tajawal_500Medium' },
  mainStatValue: { ...typography.h1, color: '#FFF', fontFamily: 'Tajawal_700Bold', marginTop: 4 },
  mainStatIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 16 },

  secondaryStats: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
  },
  miniSummaryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  miniSummaryValue: { ...typography.h3, fontFamily: 'Tajawal_700Bold' },
  miniSummaryLabel: { ...typography.caption, fontFamily: 'Tajawal_500Medium', marginTop: 2 },

  // Search
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    textAlign: 'right',
    paddingHorizontal: spacing.sm,
    fontFamily: 'Tajawal_500Medium',
    fontSize: 15,
  },
  clearBtn: {
    padding: 4,
  },

  // Summary Bar
  summaryBar: {
    flexDirection: 'row-reverse',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  summaryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  summaryPillText: {
    fontSize: 12,
    fontFamily: 'Tajawal_700Bold',
  },

  // List
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 120 },
  gridRow: { justifyContent: 'space-between', gap: spacing.md },

  // Card
  cardWrapperMobile: { width: '100%', marginBottom: spacing.md },
  cardWrapperWide: { flex: 1, maxWidth: '49%', marginBottom: spacing.md },
  cardContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerRight: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1 },
  nameSection: { alignItems: 'flex-end', marginEnd: spacing.md, flex: 1 },
  profileName: { ...typography.h4, fontFamily: 'Tajawal_700Bold' },
  idBadge: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    marginTop: 4, 
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  idText: { fontSize: 11, fontFamily: 'Tajawal_500Medium' },

  headerLeft: { alignItems: 'center', gap: 8 },
  statusBadge: { minWidth: 60 },

  metricsBar: {
    flexDirection: 'row-reverse',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 10, fontFamily: 'Tajawal_500Medium', marginBottom: 2 },
  metricValue: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  metricDivider: { width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.05)' },

  // Expanded
  expandedWrapper: { borderTopWidth: 1, overflow: 'hidden' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, ...typography.caption },

  trustGrid: { flexDirection: 'row-reverse', gap: spacing.md, marginBottom: spacing.md },
  trustMetricBox: { 
    flex: 1.2, 
    padding: spacing.md, 
    borderRadius: borderRadius.md, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  trustMetricLabel: { fontSize: 11, fontFamily: 'Tajawal_500Medium', marginTop: 8 },
  gradeCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 32, fontFamily: 'Tajawal_700Bold' },

  analyticsColumn: { flex: 1, gap: spacing.sm },
  miniStat: { flex: 1, padding: spacing.sm, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  miniStatValue: { fontSize: 18, fontFamily: 'Tajawal_700Bold' },
  miniStatLabel: { fontSize: 9, fontFamily: 'Tajawal_500Medium' },

  performanceSummary: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  perfRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  perfItem: { flex: 1, alignItems: 'center' },
  perfValue: { fontSize: 18, fontFamily: 'Tajawal_700Bold' },
  perfLabel: { fontSize: 10, fontFamily: 'Tajawal_500Medium', marginTop: 2 },
  perfDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.05)' },

  actionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
});