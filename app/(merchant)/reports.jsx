import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Hooks & Stores
import { useTheme } from "../../src/hooks/useTheme";
import { useResponsive } from "../../src/hooks/useResponsive";
import { useStoreStore } from "../../src/stores/useStoreStore";
import { supabase } from "../../src/lib/supabase";

// UI Components
import Card from "../../src/components/ui/Card";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";

// Theme Data & Utils
import { typography, spacing, borderRadius, gradients, shadows } from "../../src/theme/theme";
import { formatCurrency } from "../../src/lib/utils";

// --- Extracted Components ---

const WilayaCard = React.memo(({ item, theme, isWide }) => (
  <Card style={[styles.wilayaCard, { borderColor: theme.colors.border }, isWide && styles.wilayaCardWide, isWide && { maxWidth: '32%' }]}>
    {/* Header with localized icon */}
    <View style={styles.wilayaHeader}>
      <View style={[styles.iconWrap, { backgroundColor: theme.primary + '10' }]}>
        <Ionicons name="location" size={18} color={theme.primary} />
      </View>
      <Text style={[styles.wilayaName, { color: theme.colors.text }]} numberOfLines={1}>
        {item.wilaya_name || `ولاية ${item.wilaya_id}`}
      </Text>
    </View>
    
    {/* Refined Stats Grid */}
    <View style={[styles.metricsRow, { borderTopColor: theme.colors.borderLight }]}>
      <View style={styles.metricItem}>
        <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>إجمالي المبيعات</Text>
        <Text style={[styles.metricValue, { color: theme.primary }]}>
          {formatCurrency(item.revenue)}
        </Text>
      </View>
      
      <View style={[styles.metricDivider, { backgroundColor: theme.colors.borderLight }]} />
      
      <View style={styles.metricItem}>
        <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>الطلبات</Text>
        <Text style={[styles.metricValue, { color: theme.colors.text }]}>
          {item.order_count}
        </Text>
      </View>
    </View>
  </Card>
));

// --- Main Component ---

export default function MerchantReportsScreen() {
  const theme = useTheme();
  const { isWide } = useResponsive();
  const currentStore = useStoreStore((s) => s.currentStore);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!currentStore?.id) return;
    if (!isRefresh) setLoading(true);

    try {
      const { data, error } = await supabase.rpc("get_merchant_wilaya_stats", {
        p_store_id: currentStore.id,
      });
      if (!error && data) {
        setRows(data);
      } else if (error) {
        console.error("❌ [MerchantReportsScreen] Fetch Error:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  // Dynamically calculate aggregate totals for the dashboard summary
  const summary = useMemo(() => {
    return rows.reduce(
      (acc, curr) => {
        acc.totalOrders += Number(curr.order_count || 0);
        acc.totalRevenue += Number(curr.revenue || 0);
        return acc;
      },
      { totalOrders: 0, totalRevenue: 0 }
    );
  }, [rows]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <UniversalHeader
        title="أداء الولايات"
        subtitle="إحصائيات المبيعات والتوزيع الجغرافي لطلباتك"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Top Summary Dashboard */}
            {rows.length > 0 && (
              <View style={[styles.summaryContainer, isWide && styles.summaryContainerWide]}>
                <Card 
                  gradient 
                  gradientColors={gradients.primary} 
                  style={[styles.summaryCard, isWide && { flex: 1 }]}
                >
                  <View style={styles.summaryContent}>
                    <View style={styles.summaryTextWrap}>
                      <Text style={styles.summaryLabel}>إجمالي الإيرادات</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(summary.totalRevenue)}</Text>
                    </View>
                    <View style={styles.summaryIconWrap}>
                      <Ionicons name="stats-chart" size={22} color="#FFFFFF" />
                    </View>
                  </View>
                </Card>

                <Card 
                  gradient
                  gradientColors={gradients.dark}
                  style={[styles.summaryCard, isWide && { flex: 1 }]}
                >
                  <View style={styles.summaryContent}>
                    <View style={styles.summaryTextWrap}>
                      <Text style={styles.summaryLabel}>الطلبات الناجحة</Text>
                      <Text style={styles.summaryValue}>{summary.totalOrders}</Text>
                    </View>
                    <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                      <Ionicons name="cube" size={22} color="#FFFFFF" />
                    </View>
                  </View>
                </Card>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>تفاصيل الأداء حسب الولاية</Text>
              {rows.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: theme.colors.surface2 }]}>
                  <Text style={[styles.countBadgeText, { color: theme.colors.textSecondary }]}>{rows.length} ولاية</Text>
                </View>
              )}
            </View>

            {/* Wilayas Grid / List */}
            {rows.length === 0 ? (
              <EmptyState
                icon="map-outline"
                title="لا توجد بيانات بعد"
                message="لم يتم تسجيل أي مبيعات في الولايات حتى الآن. ستظهر الإحصائيات هنا فور تسليم الطلبات."
              />
            ) : (
              <View style={[styles.grid, isWide && styles.gridWide]}>
                {rows.map((r) => (
                  <WilayaCard key={String(r.wilaya_id)} item={r} theme={theme} isWide={isWide} />
                ))}
              </View>
            )}
          </>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { padding: spacing.md },
  scrollContentWide: { maxWidth: 1200, alignSelf: 'center', width: '100%' },

  // Summary Section
  summaryContainer: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryContainerWide: {
    gap: spacing.md,
  },
  summaryCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    ...shadows.md,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTextWrap: {
    alignItems: 'flex-start',
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    ...typography.caption,
    fontFamily: 'Tajawal_500Medium',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  summaryValue: {
    ...typography.h2,
    fontFamily: 'Tajawal_800ExtraBold',
    color: '#FFFFFF',
  },

  // Section Titles
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    fontFamily: 'Tajawal_700Bold',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    ...typography.caption,
    fontFamily: 'Tajawal_700Bold',
  },

  // Grid Layout
  grid: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  gridWide: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  // Individual Wilaya Card
  wilayaCard: {
    padding: 0,
    overflow: 'hidden',
    width: '100%',
    borderWidth: 1.5,
  },
  wilayaCardWide: {
    flex: 1,
    minWidth: 280,
  },
  wilayaHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: spacing.sm,
  },
  wilayaName: {
    ...typography.h3,
    fontFamily: 'Tajawal_700Bold',
    flex: 1,
    textAlign: 'right',
  },
  metricsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderTopWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  metricDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  metricLabel: {
    ...typography.caption,
    fontFamily: 'Tajawal_500Medium',
    marginBottom: 4,
  },
  metricValue: {
    ...typography.bodyBold,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
  },

  bottomSpacer: { height: 100 },
});