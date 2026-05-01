import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    ScrollView,
    Platform,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { useOperationsStore } from "../../src/stores/useOperationsStore";
import { useWilayaStore } from "../../src/stores/useWilayaStore";
import StatCard from "../../src/components/ui/StatCard";
import Card from "../../src/components/ui/Card";
import Badge from "../../src/components/ui/Badge";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import { typography, spacing, borderRadius, shadows } from "../../src/theme/theme";
import { formatCurrency } from "../../src/lib/utils";
import { ORDER_STATUS_AR, ORDER_STATUS_COLORS } from "../../src/lib/constants";

// ==========================================
// SUB-COMPONENTS
// ==========================================

const FilterPill = ({ label, isActive, onPress, theme }) => {
    return (
        <TouchableOpacity
            style={[
                styles.filterPill,
                {
                    backgroundColor: isActive ? theme.primary : theme.colors.surface,
                    borderColor: isActive ? theme.primary : theme.colors.border,
                },
            ]}
            onPress={onPress}
        >
            <Text
                style={[
                    styles.filterPillText,
                    { color: isActive ? "#FFFFFF" : theme.colors.textSecondary },
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const DesktopTableHeader = ({ theme }) => (
    <View style={[styles.desktopHeaderRow, { borderBottomColor: theme.colors.border }]}>
        <View style={{ flex: 1.2, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.headerCell}>التاريخ</Text></View>
        <View style={{ flex: 0.5, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={[styles.headerCell, { textAlign: 'center' }]}>COD</Text></View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.headerCell}>الإجمالي</Text></View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.headerCell}>المبلغ/الرسوم</Text></View>
        <View style={{ flex: 1.2, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.headerCell}>الحالة</Text></View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.headerCell}>المتجر</Text></View>
        <View style={{ flex: 1.2, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.headerCell}>الولاية</Text></View>
        <View style={{ flex: 1.5, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.headerCell}>العميل</Text></View>
        <View style={{ flex: 0.8, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.headerCell}>#</Text></View>
    </View>
);

const EventDesktopRow = ({ event, theme }) => {
    const isCampaign = event.type === 'campaign_created';
    const isUserSignup = event.type === 'user_signup';
    const statusColor = ORDER_STATUS_COLORS[event.status] || theme.colors.textSecondary;
    const statusLabel = ORDER_STATUS_AR[event.status] || event.status;

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const d = new Date(dateString);
        return `${d.toLocaleDateString('ar-DZ')} ${d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const getCodIcon = () => {
        if (event.codConfirmedAt) return "✅";
        if (event.status === 'delivered') return "⏳";
        return "-";
    };

    const shortId = (event.orderId || event.id).toString().split('-')[0];

    if (isCampaign) {
        return (
            <Card style={styles.desktopRowCard} accentColor={theme.primary} accentPosition="right">
                <View style={styles.campaignRowContent}>
                    <Ionicons name="megaphone-outline" size={20} color={theme.primary} style={styles.campaignIcon} />
                    <Text style={[styles.campaignText, { color: theme.colors.text }]}>
                        تم إنشاء حملة إعلانية جديدة: {event.campaignSlug} لمنتج {event.productName} (الكود: {event.affiliateCode})
                    </Text>
                    <Text style={[styles.cellText, { color: theme.colors.textTertiary, flex: 1 }]}>{formatDate(event.createdAt)}</Text>
                </View>
            </Card>
        );
    }

    if (isUserSignup) {
        const roleLabel = event.role === 'merchant' ? 'تاجر' : 'مسوق بالعمولة';
        const roleColor = event.role === 'merchant' ? theme.colors.warning : theme.colors.info;
        return (
            <Card style={styles.desktopRowCard} accentColor={roleColor} accentPosition="right">
                <View style={styles.campaignRowContent}>
                    <Ionicons name="person-add-outline" size={20} color={roleColor} style={styles.campaignIcon} />
                    <Text style={[styles.campaignText, { color: theme.colors.text }]}>
                        تسجيل {roleLabel} جديد: {event.customerName}
                    </Text>
                    <Text style={[styles.cellText, { color: theme.colors.textTertiary, flex: 1 }]}>{formatDate(event.createdAt)}</Text>
                </View>
            </Card>
        );
    }

    return (
        <Card style={styles.desktopRowCard} accentColor={statusColor} accentPosition="right">
            <View style={styles.desktopRowInner}>
                <View style={{ flex: 1.2, justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={[styles.cellText, { color: theme.colors.textSecondary }]}>{formatDate(event.createdAt)}</Text>
                </View>
                <View style={{ flex: 0.5, justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={[styles.cellText, { color: theme.colors.text, textAlign: 'center' }]}>{getCodIcon()}</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={[styles.cellText, styles.boldCell, { color: theme.colors.text }]}>{formatCurrency(event.total || 0)}</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={[styles.cellText, { color: theme.colors.text }]}>{formatCurrency(event.amount || 0)}</Text>
                    <Text style={[styles.cellSubText, { color: theme.colors.textTertiary }]}>توصيل: {formatCurrency(event.deliveryFee || 0)}</Text>
                </View>
                <View style={{ flex: 1.2, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 4 }}>
                    <Badge 
                        label={statusLabel} 
                        variant={
                            event.status === 'delivered' ? 'success' :
                            event.status === 'returned' || event.status === 'cancelled' || event.status === 'failed' ? 'error' :
                            event.status === 'pending' ? 'warning' :
                            event.status === 'in_transit' || event.status === 'picked_up' ? 'info' :
                            'primary'
                        } 
                    />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={[styles.cellText, { color: theme.colors.text }]} numberOfLines={1}>{event.storeName || "-"}</Text>
                </View>
                <View style={{ flex: 1.2, justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={[styles.cellText, { color: theme.colors.text }]} numberOfLines={1}>{event.wilayaName || "-"}</Text>
                    <Text style={[styles.cellSubText, { color: theme.colors.textTertiary }]} numberOfLines={1}>{event.commune || "-"}</Text>
                </View>
                <View style={{ flex: 1.5, justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={[styles.cellText, styles.boldCell, { color: theme.colors.text }]} numberOfLines={1}>{event.customerName || "-"}</Text>
                </View>
                <View style={{ flex: 0.8, justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={[styles.cellText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{shortId}</Text>
                </View>
            </View>
        </Card>
    );
};

const EventMobileCard = ({ event, theme }) => {
    const isCampaign = event.type === 'campaign_created';
    const isUserSignup = event.type === 'user_signup';
    const statusColor = ORDER_STATUS_COLORS[event.status] || theme.colors.textSecondary;
    const statusLabel = ORDER_STATUS_AR[event.status] || event.status;

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const d = new Date(dateString);
        return `${d.toLocaleDateString('ar-DZ')} ${d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const getCodIcon = () => {
        if (event.codConfirmedAt) return "✅ محصل";
        if (event.status === 'delivered') return "⏳ عالق";
        return "-";
    };

    if (isCampaign) {
        return (
            <Card style={styles.mobileCard} accentColor={theme.primary} accentPosition="right">
                <View style={styles.mobileCampaignRow}>
                    <Ionicons name="megaphone" size={24} color={theme.primary} />
                    <View style={styles.mobileCampaignTextContainer}>
                        <Text style={[styles.mobileCampaignTitle, { color: theme.colors.text }]}>حملة إعلانية جديدة</Text>
                        <Text style={[styles.mobileCampaignSub, { color: theme.colors.textSecondary }]}>المنتج: {event.productName}</Text>
                        <Text style={[styles.mobileCampaignSub, { color: theme.colors.textSecondary }]}>الرابط: {event.campaignSlug}</Text>
                        <Text style={[styles.mobileCampaignDate, { color: theme.colors.textTertiary }]}>{formatDate(event.createdAt)}</Text>
                    </View>
                </View>
            </Card>
        );
    }

    if (isUserSignup) {
        const roleLabel = event.role === 'merchant' ? 'تاجر' : 'مسوق بالعمولة';
        const roleColor = event.role === 'merchant' ? theme.colors.warning : theme.colors.info;
        return (
            <Card style={styles.mobileCard} accentColor={roleColor} accentPosition="right">
                <View style={styles.mobileCampaignRow}>
                    <Ionicons name="person-add" size={24} color={roleColor} />
                    <View style={styles.mobileCampaignTextContainer}>
                        <Text style={[styles.mobileCampaignTitle, { color: theme.colors.text }]}>تسجيل {roleLabel} جديد</Text>
                        <Text style={[styles.mobileCampaignSub, { color: theme.colors.textSecondary }]}>{event.customerName}</Text>
                        <Text style={[styles.mobileCampaignDate, { color: theme.colors.textTertiary }]}>{formatDate(event.createdAt)}</Text>
                    </View>
                </View>
            </Card>
        );
    }

    return (
        <Card style={styles.mobileCard} accentColor={statusColor} accentPosition="right">
            <View style={styles.mobileCardHeader}>
                <Text style={[styles.mobileCardId, { color: theme.colors.textSecondary }]}>#{event.orderId || event.id}</Text>
                <Badge 
                    label={statusLabel} 
                    variant={
                        event.status === 'delivered' ? 'success' :
                        event.status === 'returned' || event.status === 'cancelled' || event.status === 'failed' ? 'error' :
                        event.status === 'pending' ? 'warning' :
                        event.status === 'in_transit' || event.status === 'picked_up' ? 'info' :
                        'primary'
                    } 
                />
            </View>

            <Text style={[styles.mobileCardCustomer, { color: theme.colors.text }]}>{event.customerName}</Text>

            <View style={styles.mobileCardRow}>
                <Ionicons name="location-outline" size={16} color={theme.colors.textTertiary} />
                <Text style={[styles.mobileCardSubText, { color: theme.colors.textSecondary }]}>
                    {event.wilayaName} {event.commune ? `- ${event.commune}` : ''}
                </Text>
            </View>

            <View style={styles.mobileCardRow}>
                <Ionicons name="storefront-outline" size={16} color={theme.colors.textTertiary} />
                <Text style={[styles.mobileCardSubText, { color: theme.colors.textSecondary }]}>{event.storeName || "-"}</Text>
            </View>

            <View style={[styles.mobileCardFooter, { borderTopColor: theme.colors.divider }]}>
                <View style={styles.mobileCardFooterCol}>
                    <Text style={[styles.mobileCardFooterLabel, { color: theme.colors.textTertiary }]}>الإجمالي</Text>
                    <Text style={[styles.mobileCardFooterVal, { color: theme.colors.text }]}>{formatCurrency(event.total || 0)}</Text>
                </View>
                <View style={styles.mobileCardFooterCol}>
                    <Text style={[styles.mobileCardFooterLabel, { color: theme.colors.textTertiary }]}>COD</Text>
                    <Text style={[styles.mobileCardFooterVal, { color: theme.colors.text }]}>{getCodIcon()}</Text>
                </View>
                <View style={styles.mobileCardFooterCol}>
                    <Text style={[styles.mobileCardFooterLabel, { color: theme.colors.textTertiary }]}>التاريخ</Text>
                    <Text style={[styles.mobileCardFooterVal, { color: theme.colors.text }]}>{formatDate(event.createdAt)}</Text>
                </View>
            </View>
        </Card>
    );
};

const WilayaHeatmapTable = ({ stats, theme, isDark }) => {
    const sortedStats = useMemo(() => {
        return [...(stats || [])].sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));
    }, [stats]);

    if (!sortedStats || sortedStats.length === 0) return null;

    return (
        <View style={[styles.heatmapContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <View style={[styles.heatmapInner, { flex: 1 }]}>
                    <View style={[styles.heatmapHeader, { borderBottomColor: theme.colors.border }]}>
                        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.heatmapHeaderCell}>COD عالق</Text></View>
                        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.heatmapHeaderCell}>الإيرادات</Text></View>
                        <View style={{ flex: 0.8, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.heatmapHeaderCell}>مرتجع</Text></View>
                        <View style={{ flex: 0.8, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.heatmapHeaderCell}>تم التوصيل</Text></View>
                        <View style={{ flex: 0.8, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.heatmapHeaderCell}>الطلبات</Text></View>
                        <View style={{ flex: 0.5, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.heatmapHeaderCell}>رمز</Text></View>
                        <View style={{ flex: 1.5, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={styles.heatmapHeaderCell}>الولاية</Text></View>
                    </View>

                    {sortedStats.map((stat, idx) => {
                        const total = stat.totalOrders || 1;
                        const returnRate = (stat.returned || 0) / total;
                        let bgColor = "transparent";

                        if (returnRate > 0.2) {
                            bgColor = isDark ? 'rgba(255, 107, 107, 0.15)' : 'rgba(255, 107, 107, 0.1)';
                        } else if ((stat.revenue || 0) > 100000) {
                            bgColor = isDark ? 'rgba(0, 184, 148, 0.15)' : 'rgba(0, 184, 148, 0.1)';
                        }

                        return (
                            <View
                                key={stat.id || idx}
                                style={[
                                    styles.heatmapRow,
                                    { borderBottomColor: theme.colors.divider, backgroundColor: bgColor }
                                ]}
                            >
                                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={[styles.heatmapCell, { color: theme.error }]}>{formatCurrency(stat.codUncollected || 0)}</Text></View>
                                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={[styles.heatmapCell, { color: theme.colors.success }]}>{formatCurrency(stat.revenue || 0)}</Text></View>
                                <View style={{ flex: 0.8, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={[styles.heatmapCell, { color: theme.colors.text }]}>{stat.returned || 0}</Text></View>
                                <View style={{ flex: 0.8, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={[styles.heatmapCell, { color: theme.colors.text }]}>{stat.delivered || 0}</Text></View>
                                <View style={{ flex: 0.8, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={[styles.heatmapCell, { color: theme.colors.text, fontFamily: 'Tajawal_700Bold' }]}>{stat.totalOrders || 0}</Text></View>
                                <View style={{ flex: 0.5, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={[styles.heatmapCell, { color: theme.colors.textSecondary }]}>{stat.code}</Text></View>
                                <View style={{ flex: 1.5, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={[styles.heatmapCell, { color: theme.colors.text, fontFamily: 'Tajawal_500Bold' }]}>{stat.name}</Text></View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
};


// ==========================================
// MAIN COMPONENT
// ==========================================

export default function OperationsLogTab() {
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1200;
    const isWide = width >= 900;

    const {
        events, summary, wilayaStats, isLoading, isSummaryLoading,
        hasMore, lastUpdated, fetchEvents, fetchSummary, fetchWilayaBreakdown,
        loadMore, refresh
    } = useOperationsStore();

    const { wilayas, fetchWilayas } = useWilayaStore();

    const [filters, setFilters] = useState({
        status: 'all',
        dateRange: 'all',
        codOnly: false,
        wilayaId: null,
        search: '',
    });

    const [isHeatmapExpanded, setIsHeatmapExpanded] = useState(false);
    const filtersRef = useRef(filters);

    // Initialize data
    useEffect(() => {
        fetchSummary();
        fetchWilayaBreakdown();
        if (!wilayas || wilayas.length === 0) {
            fetchWilayas();
        }
    }, []);

    // Sync refs for interval
    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    // Handle filter changes (Debounced fetchEvents conceptually, but direct here)
    useEffect(() => {
        fetchEvents(filters, true);
    }, [filters.status, filters.dateRange, filters.codOnly, filters.wilayaId]);

    // Handle auto refresh
    useEffect(() => {
        const interval = setInterval(() => {
            refresh(filtersRef.current);
        }, 30000);
        return () => clearInterval(interval);
    }, [refresh]);

    const handleSearchSubmit = () => {
        fetchEvents(filters, true);
    };

    const onRefresh = useCallback(() => {
        refresh(filters);
    }, [refresh, filters]);

    const handleLoadMore = () => {
        if (hasMore && !isLoading) {
            loadMore(filters);
        }
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* SECTION 1: Summary Ribbon */}
            <View style={styles.summaryRibbon}>
                <StatCard
                    title="طلبات اليوم"
                    value={String(summary?.todayOrders || 0)}
                    icon="cart-outline"
                    color={theme.primary}
                />
                <StatCard
                    title="إيرادات اليوم"
                    value={formatCurrency(summary?.todayRevenue || 0)}
                    icon="cash-outline"
                    color={theme.colors.success}
                />
                <StatCard
                    title="قيد التوصيل"
                    value={String(summary?.inTransit || 0)}
                    icon="bicycle-outline"
                    color="#0984E3"
                />
                <StatCard
                    title="COD عالق"
                    value={String(summary?.codUncollected || 0)}
                    icon="alert-circle-outline"
                    color={theme.error}
                />
                <StatCard
                    title="توصيل اليوم"
                    value={String(summary?.deliveredToday || 0)}
                    icon="checkmark-done-outline"
                    color="#00B894"
                />
                <StatCard
                    title="مرتجع اليوم"
                    value={String(summary?.returnedToday || 0)}
                    icon="return-down-back-outline"
                    color="#E17055"
                />
            </View>

            {/* SECTION 2: Filters Bar */}
            <View style={[styles.filtersContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.filtersTopRow}>
                    <Text style={[styles.lastUpdatedText, { color: theme.colors.textTertiary }]}>
                        آخر تحديث: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('ar-DZ') : 'الآن'}
                    </Text>

                    <View style={styles.searchWrapper}>
                        <TextInput
                            style={[styles.searchInput, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                            placeholder="ابحث بالاسم أو الولاية..."
                            placeholderTextColor={theme.colors.textTertiary}
                            value={filters.search}
                            onChangeText={(txt) => setFilters({ ...filters, search: txt })}
                            onSubmitEditing={handleSearchSubmit}
                            returnKeyType="search"
                        />
                        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                    <View style={styles.filterGroup}>
                        <Text style={[styles.filterGroupLabel, { color: theme.colors.textSecondary }]}>الحالة:</Text>
                        {['all', 'pending', 'confirmed_by_manager', 'in_transit', 'delivered', 'returned', 'cancelled'].map((statusKey) => (
                            <FilterPill
                                key={`status-${statusKey}`}
                                label={statusKey === 'all' ? 'الكل' : ORDER_STATUS_AR[statusKey]}
                                isActive={filters.status === statusKey}
                                theme={theme}
                                onPress={() => setFilters({ ...filters, status: statusKey })}
                            />
                        ))}
                    </View>

                    <View style={styles.filterDivider} />

                    <View style={styles.filterGroup}>
                        <Text style={[styles.filterGroupLabel, { color: theme.colors.textSecondary }]}>التاريخ:</Text>
                        {[
                            { id: 'all', label: 'الكل' },
                            { id: 'today', label: 'اليوم' },
                            { id: 'week', label: 'هذا الأسبوع' },
                            { id: 'month', label: 'هذا الشهر' }
                        ].map((dt) => (
                            <FilterPill
                                key={`date-${dt.id}`}
                                label={dt.label}
                                isActive={filters.dateRange === dt.id}
                                theme={theme}
                                onPress={() => setFilters({ ...filters, dateRange: dt.id })}
                            />
                        ))}
                    </View>

                    <View style={styles.filterDivider} />

                    <View style={styles.filterGroup}>
                        <FilterPill
                            label={filters.codOnly ? "✅ COD عالق فقط" : "COD عالق فقط"}
                            isActive={filters.codOnly}
                            theme={theme}
                            onPress={() => setFilters({ ...filters, codOnly: !filters.codOnly })}
                        />
                    </View>
                </ScrollView>

                <View style={[styles.wilayaFilterWrapper, { borderTopColor: theme.colors.divider }]}>
                    <Text style={[styles.filterGroupLabel, { color: theme.colors.textSecondary }]}>الولاية:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <FilterPill
                            label="جميع الولايات"
                            isActive={filters.wilayaId === null}
                            theme={theme}
                            onPress={() => setFilters({ ...filters, wilayaId: null })}
                        />
                        {wilayas?.map((w) => (
                            <FilterPill
                                key={`wilaya-${w.id}`}
                                label={w.name}
                                isActive={filters.wilayaId === w.id}
                                theme={theme}
                                onPress={() => setFilters({ ...filters, wilayaId: w.id })}
                            />
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* SECTION 3 Header (Desktop only) */}
            {isWide && <DesktopTableHeader theme={theme} />}
        </View>
    );

    const renderFooter = () => (
        <View style={styles.footerContainer}>
            {isLoading && events.length > 0 && <LoadingSpinner />}
            {hasMore && !isLoading && (
                <TouchableOpacity style={[styles.loadMoreBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={handleLoadMore}>
                    <Text style={[styles.loadMoreText, { color: theme.primary }]}>تحميل المزيد</Text>
                </TouchableOpacity>
            )}

            {/* SECTION 4: Wilaya Heatmap Toggle */}
            <View style={[styles.heatmapSection, { borderTopColor: theme.colors.divider }]}>
                <TouchableOpacity
                    style={[styles.heatmapToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => setIsHeatmapExpanded(!isHeatmapExpanded)}
                >
                    <Text style={[styles.heatmapToggleText, { color: theme.colors.text }]}>📊 إحصائيات الولايات ({wilayaStats?.length || 58})</Text>
                    <Ionicons name={isHeatmapExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.text} />
                </TouchableOpacity>

                {isHeatmapExpanded && (
                    <WilayaHeatmapTable stats={wilayaStats} theme={theme} isDark={theme.isDark} />
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
            <UniversalHeader title="سجل العمليات" />

            {isSummaryLoading && events.length === 0 ? (
                <LoadingSpinner />
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={(item) => `${item.id}-${item.type}`}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => isWide
                        ? <EventDesktopRow event={item} theme={theme} />
                        : <EventMobileCard event={item} theme={theme} />
                    }
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={
                        !isLoading ? (
                            <EmptyState icon="document-text-outline" title="لا توجد عمليات" message="لم يتم العثور على أي عمليات تطابق معايير البحث." />
                        ) : <LoadingSpinner />
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading && events.length === 0}
                            onRefresh={onRefresh}
                            colors={[theme.primary]}
                            tintColor={theme.primary}
                        />
                    }
                    onEndReachedThreshold={0.5}
                    onEndReached={handleLoadMore}
                />
            )}
        </SafeAreaView>
    );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    headerContainer: {
        marginBottom: spacing.md,
    },
    summaryRibbon: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    filtersContainer: {
        borderRadius: borderRadius.md,
        borderWidth: 1,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...shadows.sm,
    },
    filtersTopRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    lastUpdatedText: {
        fontFamily: 'Tajawal_500Medium',
        fontSize: 14,
    },
    searchWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        position: 'relative',
        minWidth: 250,
        flex: Platform.OS === 'web' ? 0.4 : 1,
    },
    searchInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.xl, // Space for icon
        fontFamily: 'Tajawal_400Regular',
        textAlign: 'right',
    },
    searchIcon: {
        position: 'absolute',
        right: spacing.sm,
    },
    filtersScroll: {
        flexDirection: 'row-reverse',
        marginBottom: spacing.md,
    },
    filterGroup: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: spacing.xs,
    },
    filterGroupLabel: {
        fontFamily: 'Tajawal_700Bold',
        fontSize: 14,
        marginLeft: spacing.sm,
        marginRight: spacing.sm,
    },
    filterPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        marginHorizontal: 4,
    },
    filterPillText: {
        fontFamily: 'Tajawal_500Medium',
        fontSize: 14,
    },
    filterDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#ccc',
        marginHorizontal: spacing.md,
        alignSelf: 'center',
    },
    wilayaFilterWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingTop: spacing.md,
    },

    // Desktop Table Styles
    desktopHeaderRow: {
        flexDirection: 'row-reverse',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        marginBottom: spacing.xs,
        alignItems: 'center',
    },
    headerCell: {
        fontFamily: 'Tajawal_700Bold',
        fontSize: 13,
        color: '#64748b', // Neutral slate for header text
        textAlign: 'right',
    },
    desktopRowCard: {
        marginBottom: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.sm,
    },
    desktopRowInner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    cellCol: {
        paddingHorizontal: spacing.xs,
        justifyContent: 'center',
        alignItems: 'flex-end', // RTL alignment
    },
    cellText: {
        fontFamily: 'Tajawal_500Medium',
        fontSize: 14,
        textAlign: 'right',
    },
    cellSubText: {
        fontFamily: 'Tajawal_400Regular',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 2,
    },
    boldCell: {
        fontFamily: 'Tajawal_700Bold',
    },
    campaignRowContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        width: '100%',
    },
    campaignIcon: {
        marginLeft: spacing.sm,
    },
    campaignText: {
        flex: 6,
        fontFamily: 'Tajawal_700Bold',
        fontSize: 14,
        textAlign: 'right',
    },

    // Mobile Card Styles
    mobileCard: {
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    mobileCardHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    mobileCardId: {
        fontFamily: 'Tajawal_700Bold',
        fontSize: 14,
    },
    mobileCardCustomer: {
        fontFamily: 'Tajawal_800ExtraBold',
        fontSize: 16,
        textAlign: 'right',
        marginBottom: spacing.sm,
    },
    mobileCardRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    mobileCardSubText: {
        fontFamily: 'Tajawal_500Medium',
        fontSize: 14,
        marginRight: spacing.xs,
        textAlign: 'right',
    },
    mobileCardFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
    },
    mobileCardFooterCol: {
        alignItems: 'flex-end',
    },
    mobileCardFooterLabel: {
        fontFamily: 'Tajawal_400Regular',
        fontSize: 12,
        marginBottom: 2,
    },
    mobileCardFooterVal: {
        fontFamily: 'Tajawal_700Bold',
        fontSize: 14,
    },
    mobileCampaignRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    mobileCampaignTextContainer: {
        flex: 1,
        marginRight: spacing.md,
        alignItems: 'flex-end',
    },
    mobileCampaignTitle: {
        fontFamily: 'Tajawal_800ExtraBold',
        fontSize: 16,
        marginBottom: 4,
    },
    mobileCampaignSub: {
        fontFamily: 'Tajawal_500Medium',
        fontSize: 14,
        marginBottom: 2,
    },
    mobileCampaignDate: {
        fontFamily: 'Tajawal_400Regular',
        fontSize: 12,
        marginTop: 4,
    },

    // Footer & Heatmap
    footerContainer: {
        marginTop: spacing.md,
    },
    loadMoreBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderWidth: 1,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xl,
    },
    loadMoreText: {
        fontFamily: 'Tajawal_700Bold',
        fontSize: 16,
    },
    heatmapSection: {
        marginTop: spacing.lg,
        borderTopWidth: 1,
        paddingTop: spacing.md,
    },
    heatmapToggle: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderWidth: 1,
        borderRadius: borderRadius.md,
    },
    heatmapToggleText: {
        fontFamily: 'Tajawal_800ExtraBold',
        fontSize: 16,
    },
    heatmapContainer: {
        marginTop: spacing.sm,
        borderWidth: 1,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    heatmapInner: {
        minWidth: 800,
    },
    heatmapHeader: {
        flexDirection: 'row-reverse',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
    },
    heatmapHeaderCell: {
        fontFamily: 'Tajawal_700Bold',
        fontSize: 13,
        color: '#64748b',
        textAlign: 'right',
    },
    heatmapRow: {
        flexDirection: 'row-reverse',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    heatmapCell: {
        fontFamily: 'Tajawal_500Medium',
        fontSize: 14,
        textAlign: 'right',
    },
});