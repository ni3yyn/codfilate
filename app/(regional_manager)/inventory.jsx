import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Platform,
  Linking,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useRegionalManagerStore } from "../../src/stores/useRegionalManagerStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import { getEffectiveWilayaIds } from "../../src/lib/profileUtils";
import { supabase } from "../../src/lib/supabase";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import BottomSheet from "../../src/components/ui/BottomSheet";
import StatCard from "../../src/components/ui/StatCard";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import EmptyState from "../../src/components/ui/EmptyState";
import Input from "../../src/components/ui/Input";
import { typography, spacing, borderRadius, shadows } from "../../src/theme/theme";
import { formatCurrency } from "../../src/lib/utils";
import { useResponsive } from "../../src/hooks/useResponsive";
import { useFAB } from "../../src/hooks/useFAB";

/**
 * Premium Inventory Management Screen for Regional Managers.
 * Grouped by Wilaya, features stock adjustment and merchant contact.
 */
export default function InventoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isWide, maxContentWidth, contentPadding } = useResponsive();
  const { showAlert } = useAlertStore();
  const profile = useAuthStore((s) => s.profile);
  const myWilayaIds = useMemo(() => getEffectiveWilayaIds(profile), [profile]);

  const {
    inventory,
    inventoryStats,
    fetchInventory,
    adjustStock,
    isLoading,
  } = useRegionalManagerStore();

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedWilayaId, setSelectedWilayaId] = useState(null);
  
  // Modals
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Store Phone Stitching
  const [storePhones, setStorePhones] = useState({});

  const loadData = useCallback(async () => {
    const ids = myWilayaIds.length > 0 ? myWilayaIds : null;
    await fetchInventory(ids);
  }, [myWilayaIds, fetchInventory]);

  useEffect(() => {
    loadData();
    if (myWilayaIds.length > 0 && !selectedWilayaId) {
      setSelectedWilayaId(myWilayaIds[0]);
    }
  }, [loadData, myWilayaIds]);

  // Fetch missing phones for merchants
  useEffect(() => {
    const fetchPhones = async () => {
      const uniqueStoreIds = [...new Set(inventory.map(i => i.store_id).filter(id => id && !storePhones[id]))];
      if (uniqueStoreIds.length === 0) return;

      const { data } = await supabase
        .from('profiles')
        .select('store_id, phone')
        .in('store_id', uniqueStoreIds)
        .eq('role', 'merchant');

      if (data) {
        const newPhones = { ...storePhones };
        data.forEach(p => {
          if (p.store_id) newPhones[p.store_id] = p.phone;
        });
        setStorePhones(newPhones);
      }
    };
    fetchPhones();
  }, [inventory]);

  // Register centralized FAB
  useFAB({
    icon: 'add',
    label: 'إضافة منتج',
    onPress: () => showAlert({ 
      title: "قريباً", 
      message: "سيتم تفعيل إضافة منتجات جديدة يدوياً في التحديث القادم. حالياً المنتجات تضاف عن طريق النظام تلقائياً.", 
      type: "info" 
    }),
    visible: true,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredInventory = useMemo(() => {
    let list = inventory;
    if (selectedWilayaId) {
      list = list.filter(item => item.wilaya_id === selectedWilayaId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(item => 
        item.product_name?.toLowerCase().includes(q) || 
        item.category_name?.toLowerCase().includes(q) ||
        item.store_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [inventory, selectedWilayaId, search]);

  const handleAdjustStock = async () => {
    if (!adjustingItem || !adjustmentAmount) return;
    
    const delta = parseInt(adjustmentAmount);
    if (isNaN(delta) || delta === 0) {
      showAlert({ title: "خطأ", message: "يرجى إدخال كمية صحيحة", type: "error" });
      return;
    }

    setIsAdjusting(true);
    // CRITICAL FIX: Ensure wilaya_id is passed from the item
    const res = await adjustStock(
      adjustingItem.product_id, 
      adjustingItem.wilaya_id, 
      delta, 
      adjustmentNote
    );
    setIsAdjusting(false);

    if (res.success) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAdjustingItem(null);
      setAdjustmentAmount("");
      setAdjustmentNote("");
      // Refresh to get updated quantity/stats
      loadData();
    } else {
      showAlert({ title: "فشل التحديث", message: res.error, type: "error" });
    }
  };

  const callMerchant = (storeId) => {
    const phone = storePhones[storeId];
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      showAlert({ title: "غير متاح", message: "رقم هاتف التاجر غير متوفر حالياً", type: "info" });
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="المخزون الإقليمي" 
        subtitle="إدارة توفر المنتجات في مستودعاتك"
      />

      {/* Stats Summary */}
      <View style={[styles.statsRow, isWide && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: contentPadding }]}>
        <StatCard 
          title="الإجمالي" 
          value={inventoryStats.totalSkus} 
          icon="cube" 
          color={theme.primary} 
          size="small"
        />
        <StatCard 
          title="مخزون منخفض" 
          value={inventoryStats.lowStock} 
          icon="alert-circle" 
          color="#FDCB6E" 
          size="small"
        />
        <StatCard 
          title="نفذت" 
          value={inventoryStats.outOfStock} 
          icon="close-circle" 
          color="#D63031" 
          size="small"
        />
      </View>

      {/* Search & Filter */}
      <View style={[styles.searchBar, { borderBottomColor: theme.colors.border }, isWide && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: contentPadding }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: theme.colors.surfaceElevated }]}>
          <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="بحث في المنتجات، التصنيفات، المتاجر..."
            placeholderTextColor={theme.colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isWide && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: contentPadding }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Wilaya Filter Chips */}
        {myWilayaIds.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {myWilayaIds.map(id => (
              <TouchableOpacity
                key={id}
                style={[
                  styles.filterChip,
                  { backgroundColor: selectedWilayaId === id ? theme.primary : theme.colors.surfaceElevated },
                  selectedWilayaId === id && shadows.sm
                ]}
                onPress={() => setSelectedWilayaId(id)}
              >
                <Text style={[styles.filterChipText, { color: selectedWilayaId === id ? 'white' : theme.colors.textSecondary }]}>
                   ولاية {id}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: selectedWilayaId === null ? theme.primary : theme.colors.surfaceElevated }
              ]}
              onPress={() => setSelectedWilayaId(null)}
            >
              <Text style={[styles.filterChipText, { color: selectedWilayaId === null ? 'white' : theme.colors.textSecondary }]}>
                كل الولايات
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {filteredInventory.length === 0 && !isLoading ? (
          <EmptyState 
            icon="cube-outline"
            title="لا توجد منتجات"
            message={search ? "لم نجد أي منتج يطابق بحثك" : "لا يوجد مخزون مسجل في هذه المنطقة حتى الآن"}
          />
        ) : (
          filteredInventory.map((item) => {
            const isLow = item.quantity > 0 && item.quantity < 10;
            const isOut = item.quantity === 0;
            
            return (
              <Card key={`${item.product_id}-${item.wilaya_id}`} style={styles.productCard}>
                <View style={styles.cardMain}>
                  <View style={styles.imageContainer}>
                    {item.product_image ? (
                      <Image source={{ uri: item.product_image }} style={styles.productImage} />
                    ) : (
                      <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.surface }]}>
                        <Ionicons name="cube" size={24} color={theme.colors.textTertiary} />
                      </View>
                    )}
                    {isLow && <View style={[styles.badge, styles.lowBadge]}><Text style={styles.badgeText}>منخفض</Text></View>}
                    {isOut && <View style={[styles.badge, styles.outBadge]}><Text style={styles.badgeText}>نافيذ</Text></View>}
                  </View>

                  <View style={styles.details}>
                    <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>{item.product_name}</Text>
                    <Text style={[styles.storeName, { color: theme.colors.textTertiary }]}>{item.store_name} · {item.category_name}</Text>
                    
                    <View style={styles.stockInfo}>
                      <Text style={[styles.quantityLabel, { color: theme.colors.textSecondary }]}>الكمية المتوفرة:</Text>
                      <Text style={[
                        styles.quantityValue, 
                        { color: isOut ? theme.colors.error : isLow ? '#F39C12' : theme.primary }
                      ]}>
                        {item.quantity} {item.unit || 'قطع'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: theme.primary + '10' }]}
                    onPress={() => setAdjustingItem(item)}
                  >
                    <Ionicons name="add" size={18} color={theme.primary} />
                    <Text style={[styles.actionBtnText, { color: theme.primary }]}>إضافة كمية</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#F1F2F6' }]}
                    onPress={() => callMerchant(item.store_id)}
                  >
                    <Ionicons name="call" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.actionBtnText, { color: theme.colors.textSecondary }]}>اتصل بالمورد</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}

        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Adjustment Bottom Sheet */}
      <BottomSheet
        visible={!!adjustingItem}
        onClose={() => setAdjustingItem(null)}
        title="تعديل المخزون"
        subtitle={adjustingItem?.product_name}
      >
        <View style={styles.modalContent}>
          <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>أدخل الكمية المضافة (استخدم رقم سالب للسحب):</Text>
          <Input 
            placeholder="مثال: 50 أو -10"
            keyboardType="numeric"
            value={adjustmentAmount}
            onChangeText={setAdjustmentAmount}
            icon="calculator-outline"
          />
          
          <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>ملاحظة التعديل (اختياري):</Text>
          <Input 
            placeholder="مثلاً: دفعة رصيد جديدة"
            value={adjustmentNote}
            onChangeText={setAdjustmentNote}
            icon="document-text-outline"
          />

          <Button 
            title="تحديث المخزون"
            onPress={handleAdjustStock}
            loading={isAdjusting}
            style={{ marginTop: 24 }}
            variant="primary"
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    textAlign: "right",
  },
  scroll: {
    padding: spacing.md,
  },
  filterScroll: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginEnd: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Tajawal_700Bold",
  },
  productCard: {
    padding: 0,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  cardMain: {
    flexDirection: "row",
    padding: spacing.md,
    gap: 16,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    alignItems: "center",
  },
  lowBadge: { backgroundColor: "#F39C12CC" },
  outBadge: { backgroundColor: "#D63031CC" },
  badgeText: { color: "white", fontSize: 10, fontFamily: "Tajawal_700Bold" },
  details: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 16,
    fontFamily: "Tajawal_700Bold",
    marginBottom: 4,
    textAlign: "right",
  },
  storeName: {
    fontSize: 12,
    fontFamily: "Tajawal_500Medium",
    marginBottom: 8,
    textAlign: "right",
  },
  stockInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  quantityLabel: {
    fontSize: 13,
    fontFamily: "Tajawal_500Medium",
  },
  quantityValue: {
    fontSize: 16,
    fontFamily: "Tajawal_800ExtraBold",
  },
  divider: {
    height: 1,
    width: "100%",
  },
  actions: {
    flexDirection: "row",
    padding: spacing.sm,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: "Tajawal_700Bold",
  },
  modalContent: {
    paddingBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: "Tajawal_700Bold",
    marginBottom: 8,
    textAlign: "right",
  },
  footerSpacer: {
    height: 100,
  },
});
