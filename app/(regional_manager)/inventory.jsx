import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet, RefreshControl,
  TouchableOpacity, Image, Linking, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useRegionalManagerStore } from '../../src/stores/useRegionalManagerStore';
import { useAlertStore } from '../../src/stores/useAlertStore';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { getEffectiveWilayaIds } from '../../src/lib/profileUtils';
import { supabase } from '../../src/lib/supabase';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import FAB from '../../src/components/ui/FAB';
import BottomSheet from '../../src/components/ui/BottomSheet';
import Modal from '../../src/components/ui/Modal';
import StatCard from '../../src/components/ui/StatCard';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import EmptyState from '../../src/components/ui/EmptyState';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { useResponsive } from '../../src/hooks/useResponsive';

/**
 * Premium Regional Manager Inventory Screen.
 * Forest/Mint theme, real-time filtering, summary stats, and quick adjustment.
 */
export default function RegionalInventoryScreen() {
  const theme = useTheme();
  const { isWide, maxContentWidth, contentPadding } = useResponsive();
  const profile = useAuthStore((s) => s.profile);
  const wilayaIds = useMemo(() => getEffectiveWilayaIds(profile), [profile]);

  const {
    inventory, inventoryStats, fetchInventory, adjustStock, addInventoryProduct, isLoading
  } = useRegionalManagerStore();
  const { showAlert } = useAlertStore();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Adjustment State
  const [isAdjustSheetVisible, setIsAdjustSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [deltaValue, setDeltaValue] = useState('');

  const load = useCallback(async (s = search) => {
    if (!wilayaIds.length) return;
    await fetchInventory(wilayaIds, s);
  }, [wilayaIds, fetchInventory, search]);

  useEffect(() => { load(); }, [wilayaIds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleAdjust = async (item, delta) => {
    const d = parseInt(delta, 10);
    if (!d || isNaN(d)) return;

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const res = await adjustStock(item.product_id, item.wilaya_id, d, 'تعديل يدوِي من المدير الإقليمي');
    if (res.success) {
      setIsAdjustSheetVisible(false);
      setSelectedItem(null);
      setDeltaValue('');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert({ title: 'تم التحديث', message: 'تم تعديل الكمية بنجاح ✓', type: 'success' });
    } else {
      showAlert({ title: 'خطأ', message: res.error, type: 'destructive' });
    }
  };

  const fetchProductsToRegister = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, image_url, category')
      .eq('is_active', true)
      .order('name');
    if (!error) setAllProducts(data || []);
  };

  const handleAddProduct = async (product) => {
    const targetWilaya = wilayaIds[0] || profile.wilaya_id;
    if (!targetWilaya) return;

    const res = await addInventoryProduct(product.id, targetWilaya, 0);
    if (res.success) {
      setAddModalVisible(false);
      setProductSearch('');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert({ title: 'تمت الإضافة', message: 'المنتج متوفر الآن في مستودعك.', type: 'success' });
    } else {
      showAlert({ title: 'خطأ', message: res.error, type: 'destructive' });
    }
  };

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
    !inventory.some(existing => existing.product_id === p.id)
  );

  const getStockStatus = (qty) => {
    if (qty === 0) return { label: 'نافذ', color: '#D63031', bg: '#D6303115' };
    if (qty < 5) return { label: 'حرج', color: '#E17055', bg: '#E1705515' };
    if (qty < 10) return { label: 'منخفض', color: '#FDCB6E', bg: '#FDCB6E15' };
    return { label: 'متوفر', color: theme.primary, bg: theme.primary + '15' };
  };

  const HeaderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.statsRow}>
        <StatCard 
          title="إجمالي المنتجات" 
          value={inventoryStats.totalSkus} 
          icon="cube" 
          color={theme.primary} 
          size="small"
        />
        <StatCard 
          title="مخزون منخفض" 
          value={inventoryStats.lowStock} 
          icon="warning" 
          color="#FDCB6E" 
          size="small"
        />
        <StatCard 
          title="نافذ" 
          value={inventoryStats.outOfStock} 
          icon="close-circle" 
          color="#D63031" 
          size="small"
        />
      </View>

      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textTertiary} style={{ marginHorizontal: 10 }} />
          <TextInput
            placeholder="ابحث عن منتج أو متجر..."
            placeholderTextColor={theme.colors.textTertiary}
            value={search}
            onChangeText={(t) => { setSearch(t); load(t); }}
            style={[styles.searchInput, { color: theme.colors.text }]}
          />
          {!!search && (
            <TouchableOpacity onPress={() => { setSearch(''); load(''); }}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} style={{ marginHorizontal: 10 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderStockItem = ({ item }) => {
    const status = getStockStatus(item.quantity);

    return (
      <Card style={styles.stockCard}>
        <View style={styles.itemMain}>
          <View style={[styles.imageContainer, { backgroundColor: theme.colors.surfaceElevated }]}>
            {item.product_image ? (
              <Image source={{ uri: item.product_image }} style={styles.productImage} />
            ) : (
              <Ionicons name="cube-outline" size={30} color={theme.colors.textTertiary} />
            )}
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>
              {item.product_name || 'منتج غير معروف'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="storefront-outline" size={12} color={theme.colors.textTertiary} />
              <Text style={[styles.categoryText, { color: theme.colors.textSecondary }]}>
                {item.store_name || 'متجر غير معروف'} • {item.category_name}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
              <Text style={[styles.qtyText, { color: theme.colors.textSecondary }]}>
                الكمية: <Text style={{ color: status.color, fontFamily: 'Tajawal_700Bold' }}>{item.quantity}</Text>
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {item.merchant_phone && (
              <TouchableOpacity 
                style={[styles.quickAdjustBtn, { backgroundColor: theme.primary + '15' }]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL(`tel:${item.merchant_phone}`);
                }}
              >
                <Ionicons name="call" size={18} color={theme.primary} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.quickAdjustBtn, { backgroundColor: theme.colors.surfaceElevated }]}
              onPress={() => {
                setSelectedItem(item);
                setIsAdjustSheetVisible(true);
                setDeltaValue('');
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {item.merchant_phone && (
          <View style={[styles.phoneLine, { backgroundColor: theme.colors.surfaceElevated }]}>
            <Text style={[styles.phoneText, { color: theme.colors.textSecondary }]}>رقم التاجر: {item.merchant_phone} ({item.merchant_name})</Text>
          </View>
        )}

        {/* Removed inline adjustPanel - now handled by BottomSheet */}
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="المخزون الإقليمي"
        subtitle="إدارة وتتبع الكميات المتوفرة في مستودعك"
      />
      <FlatList
        data={inventory}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={HeaderSummary}
        renderItem={renderStockItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={[styles.listContent, isWide && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: contentPadding }]}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState 
              icon="cube-outline" 
              title="المستودع فارغ" 
              message="لا توجد منتجات مسجلة في مستودعك الإقليمي بعد."
            />
          ) : <LoadingSpinner />
        }
      />

      <FAB 
        label="إضافة منتج للمستودع" 
        onPress={() => {
          fetchProductsToRegister();
          setAddModalVisible(true);
        }} 
        visible={!addModalVisible}
      />

      {/* Add Product Flow - Responsive Choice */}
      {Platform.OS === 'web' ? (
        <Modal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          title="إضافة منتج للمستودع"
          subtitle="اختر منتجاً من القائمة الرسمية لتبدأ في تتبع مخزونه في ولايتك."
          maxWidth={700}
        >
          <View style={{ gap: spacing.md }}>
            <View style={[styles.searchBox, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }]}>
              <Ionicons name="search" size={20} color={theme.colors.textTertiary} style={{ marginHorizontal: 10 }} />
              <TextInput
                placeholder="ابحث عن منتج جديد..."
                placeholderTextColor={theme.colors.textTertiary}
                value={productSearch}
                onChangeText={setProductSearch}
                style={[styles.searchInput, { color: theme.colors.text }]}
              />
            </View>

            <FlatList
              data={filteredProducts}
              keyExtractor={p => p.id}
              style={{ maxHeight: 500 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.productSelectItem, { borderBottomColor: theme.colors.divider }]}
                  onPress={() => handleAddProduct(item)}
                >
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.pickerImg} />
                  ) : (
                    <View style={[styles.pickerImg, { backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="cube" size={16} color={theme.colors.textTertiary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.productName, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.categoryText, { color: theme.colors.textTertiary }]}>{item.category || 'بدون تصنيف'}</Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={theme.primary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: theme.colors.textTertiary, marginVertical: 20 }}>
                  لا توجد منتجات جديدة متاحة للتسجيل
                </Text>
              }
            />
          </View>
        </Modal>
      ) : (
        <BottomSheet
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          title="إضافة منتج للمستودع"
          subtitle="اختر منتجاً من القائمة الرسمية لتبدأ في تتبع مخزونه في ولايتك."
        >
          <View style={{ gap: spacing.md }}>
            <View style={[styles.searchBox, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }]}>
              <Ionicons name="search" size={20} color={theme.colors.textTertiary} style={{ marginHorizontal: 10 }} />
              <TextInput
                placeholder="ابحث عن منتج جديد..."
                placeholderTextColor={theme.colors.textTertiary}
                value={productSearch}
                onChangeText={setProductSearch}
                style={[styles.searchInput, { color: theme.colors.text }]}
              />
            </View>

            <FlatList
              data={filteredProducts}
              keyExtractor={p => p.id}
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.productSelectItem, { borderBottomColor: theme.colors.divider }]}
                  onPress={() => handleAddProduct(item)}
                >
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.pickerImg} />
                  ) : (
                    <View style={[styles.pickerImg, { backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="cube" size={16} color={theme.colors.textTertiary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.productName, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.categoryText, { color: theme.colors.textTertiary }]}>{item.category || 'بدون تصنيف'}</Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={theme.primary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: theme.colors.textTertiary, marginVertical: 20 }}>
                  لا توجد منتجات جديدة متاحة للتسجيل
                </Text>
              }
            />
          </View>
        </BottomSheet>
      )}
      {/* Stock Adjustment Sheet */}
      <BottomSheet
        visible={isAdjustSheetVisible}
        onClose={() => setIsAdjustSheetVisible(false)}
        title="تعديل المخزون"
        subtitle={`تعديل كمية ${selectedItem?.product_name || 'المنتج'}`}
      >
        <View style={styles.adjustPanel}>
          <Text style={[styles.qtyLabel, { color: theme.colors.textSecondary }]}>الكمية الحالية: {selectedItem?.quantity || 0}</Text>
          
          <View style={styles.quickButtons}>
            <TouchableOpacity style={styles.pill} onPress={() => handleAdjust(selectedItem, 5)}>
              <Text style={[styles.pillText, { color: theme.primary }]}>+5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pill} onPress={() => handleAdjust(selectedItem, 10)}>
              <Text style={[styles.pillText, { color: theme.primary }]}>+10</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pill, { borderColor: '#D63031' }]} onPress={() => handleAdjust(selectedItem, -1)}>
              <Text style={[styles.pillText, { color: '#D63031' }]}>-1</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.manualInputRow}>
            <TextInput
              placeholder="قيمة مخصصة (مثال: 15 أو -5)..."
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="numeric"
              value={deltaValue}
              onChangeText={setDeltaValue}
              style={[styles.manualInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
            />
            <Button 
              title="تحديث" 
              onPress={() => handleAdjust(selectedItem, deltaValue)} 
              variant="gradient"
              style={{ flex: 1, height: 48 }}
            />
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: 120 },
  summaryContainer: { marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  searchBarContainer: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  searchInput: { flex: 1, ...typography.body, textAlign: 'right', paddingRight: spacing.sm },
  stockCard: { padding: spacing.sm, marginBottom: spacing.sm },
  itemMain: { flexDirection: 'row', alignItems: 'center' },
  imageContainer: { width: 60, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  infoContainer: { flex: 1, marginHorizontal: spacing.md },
  productName: { ...typography.bodyBold, fontSize: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  qtyText: { ...typography.small },
  quickAdjustBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  adjustPanel: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: spacing.md },
  quickButtons: { flexDirection: 'row', gap: 10, marginBottom: spacing.sm },
  pill: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.1)',
    flex: 1,
    alignItems: 'center'
  },
  pillText: { ...typography.small, fontFamily: 'Tajawal_700Bold' },
  qtyLabel: { ...typography.small, marginBottom: spacing.md, textAlign: 'center' },
  manualInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  manualInput: { 
    flex: 1, 
    height: 44, 
    borderWidth: 1, 
    borderRadius: borderRadius.md, 
    paddingHorizontal: spacing.md, 
    textAlign: 'right' 
  },
  productSelectItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: spacing.md, 
    borderBottomWidth: 1, 
    gap: 12 
  },
  pickerImg: { width: 40, height: 40, borderRadius: 8 },
  categoryText: { ...typography.caption },
  phoneLine: { 
    marginTop: spacing.xs, 
    paddingHorizontal: spacing.sm, 
    paddingVertical: 4, 
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  phoneText: { fontSize: 10, fontFamily: 'Tajawal_500Medium' },
});
