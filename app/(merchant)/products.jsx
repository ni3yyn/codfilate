import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Platform,
  Modal as RNModal,
} from 'react-native';
import { Animated, Easing } from 'react-native'; // Ensure Easing is imported at the top of your file


import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useStoreStore } from '../../src/stores/useStoreStore';
import { useProductStore } from '../../src/stores/useProductStore';
import { useCategoryStore } from '../../src/stores/useCategoryStore';
import { useAlertStore } from '../../src/stores/useAlertStore';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import Badge from '../../src/components/ui/Badge';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { useFAB } from '../../src/hooks/useFAB';
import BottomSheet from '../../src/components/ui/BottomSheet';
import Modal from '../../src/components/ui/Modal';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import { typography, spacing, borderRadius, shadows } from '../../src/theme/theme';
import { formatCurrency } from '../../src/lib/utils';
import { LISTING_STATUS_AR } from '../../src/lib/constants';
import { ImageViewerModal } from '../../src/components/common/ImageGallery';

// Premium Tokens matching Cinematic UI
const COLORS = {
  primary: '#2D6A4F',
  primaryHover: '#1B4332',
  bgMain: '#F8F9FA',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#475569',
  textLight: '#94A3B8',
  border: 'rgba(15, 23, 42, 0.08)',
  accentMint: '#74C69D',
};

// ──── Smart Marquee Text for Product Cards ────
const CardMarqueeText = React.memo(({ text, style }) => {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [textWidth, setTextWidth] = React.useState(0);
  const translateX = React.useRef(new Animated.Value(0)).current;
  const animRef = React.useRef(null);

  const GAP = 40;

  React.useEffect(() => {
    if (textWidth > containerWidth && containerWidth > 0) {
      const distance = textWidth + GAP;
      const duration = (distance / 30) * 1000; 

      const startAnimation = () => {
        translateX.setValue(0);
        animRef.current = Animated.timing(translateX, {
          toValue: distance,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        });
        animRef.current.start(({ finished }) => {
          if (finished) {
            startAnimation();
          }
        });
      };

      startAnimation();

      return () => {
        if (animRef.current) {
          animRef.current.stop();
        }
        translateX.setValue(0);
      };
    } else {
      translateX.setValue(0);
    }
  }, [textWidth, containerWidth, text]);

  const handleContainerLayout = React.useCallback((e) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (Math.abs(w - containerWidth) > 1) {
      setContainerWidth(w);
    }
  }, [containerWidth]);

  const handleTextLayout = React.useCallback((e) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (Math.abs(w - textWidth) > 1) {
      setTextWidth(w);
    }
  }, [textWidth]);

  const isOverflowing = textWidth > containerWidth && containerWidth > 0;

  return (
    <View
      style={{ width: '100%', overflow: 'hidden', flexDirection: 'row-reverse', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 10, height: 20, position: 'relative' }}
      onLayout={handleContainerLayout}
    >
      <Animated.View style={{ 
        position: 'absolute', 
        right: 0, 
        flexDirection: 'row-reverse', 
        alignItems: 'center',
        transform: [{ translateX }] 
      }}>
        <Text
          onLayout={handleTextLayout}
          style={[style, { marginBottom: 0 }, Platform.OS === 'web' && { whiteSpace: 'nowrap' }]}
          numberOfLines={1}
        >
          {text}
        </Text>

        {isOverflowing && (
          <>
            <View style={{ width: GAP }} />
            <Text
              style={[style, { marginBottom: 0 }, Platform.OS === 'web' && { whiteSpace: 'nowrap' }]}
              numberOfLines={1}
            >
              {text}
            </Text>
          </>
        )}
      </Animated.View>
    </View>
  );
});

// ──── Extracted Memoized Product Card (Enhanced Premium Design) ────
const ProductCard = React.memo(({
  item,
  theme,
  isWide,
  categories,
  onToggleStatus,
  onEdit,
  onDelete,
  onImagePress
}) => {
  const isRejected = item.listing_status === 'rejected';

  // Find category name safely
  const catName = useMemo(() => {
    const targetId = item.category_id || item.category;
    const cat = categories.find(c =>
      c.id === targetId ||
      c.name_normalized === String(targetId).toLowerCase() ||
      c.name_ar === targetId
    );
    if (cat) return cat.name_ar || cat.name;

    if (typeof item.category === 'object') return item.category.name_ar || item.category.name;
    return item.category || 'بدون تصنيف';
  }, [item.category_id, item.category, categories]);

  return (
    <View style={[
      styles.productCard,
      isWide ? styles.productCardDesktop : styles.productCardMobile,
      { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.7)" : COLORS.bgWhite },
      { borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : COLORS.border },
      isRejected && { borderColor: '#FF6B6B', borderWidth: 1.5 }
    ]}>
      <TouchableOpacity
        style={styles.imageContainer}
        activeOpacity={0.9}
        onPress={() => onImagePress(item)}
      >
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.productImage}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: theme.isDark ? '#1E293B' : COLORS.bgMain }]}>
            <Ionicons name="image-outline" size={32} color={theme.isDark ? '#475569' : COLORS.textLight} />
          </View>
        )}

        {/* Commission Badge at Bottom of Image */}
        <View style={styles.cardCommissionBadgeContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.cardCommissionBadgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.cardCommissionLabel}>عمولة</Text>
            <Text style={styles.cardCommissionValue}>+{formatCurrency(item.commission_amount || 0)}</Text>
          </LinearGradient>
        </View>

        {/* Top Badges */}
        <View style={styles.cardTopBadges}>
          {!item.is_active ? (
            <View style={[styles.glassBadge, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <View style={[styles.statusDot, { backgroundColor: '#94A3B8' }]} />
              <Text style={styles.glassBadgeText}>معطل</Text>
            </View>
          ) : (
            <View style={[
              styles.glassBadge,
              { backgroundColor: item.listing_status === 'published' ? 'rgba(45, 106, 79, 0.85)' : item.listing_status === 'rejected' ? 'rgba(239, 68, 68, 0.85)' : 'rgba(245, 158, 11, 0.85)' }
            ]}>
              <Text style={styles.glassBadgeText}>
                {item.listing_status === 'published' ? 'نشط' : item.listing_status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.productInfo}>
        <Text style={[styles.categoryText, { color: COLORS.primary }]} numberOfLines={1}>
          {catName}
        </Text>

        {/* Animated Marquee Text for Long Product Names */}
        <CardMarqueeText
          text={item.name}
          style={[styles.productName, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}
        />

        <Text style={[styles.productPrice, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}>{formatCurrency(item.price)}</Text>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: theme.isDark ? 'rgba(255,255,255,0.05)' : COLORS.border }]}>
        <TouchableOpacity
          onPress={() => onToggleStatus(item)}
          style={[styles.circularActionBtn, { backgroundColor: item.is_active ? (theme.isDark ? 'rgba(255,255,255,0.08)' : COLORS.bgMain) : 'rgba(239, 68, 68, 0.1)' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="power" size={18} color={item.is_active ? (theme.isDark ? '#94A3B8' : COLORS.textMuted) : '#FF6B6B'} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onEdit(item)}
          style={[styles.circularActionBtn, { backgroundColor: 'rgba(116, 198, 157, 0.15)' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onDelete(item.id, item.name)}
          style={[styles.circularActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function ProductsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currentStore = useStoreStore((s) => s.currentStore);
  const { products, isLoading, fetchAllStoreProducts, createProduct, updateProduct, deleteProduct, uploadProductImage, addProductImage, uploadQueue, processBackgroundUpload } = useProductStore();
  const { storeCategories, categories, fetchStoreCategories, fetchCategories } = useCategoryStore();
  const { showAlert, showConfirm } = useAlertStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('add'); // 'add' | 'edit'
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [sku, setSku] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('200');
  const [localError, setLocalError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [imageUris, setImageUris] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [subcategoryPickerVisible, setSubcategoryPickerVisible] = useState(false);
  const { isWide } = useResponsive();

  // Instant Category Sync when returning to this screen
  useFocusEffect(
    useCallback(() => {
      if (currentStore?.id) {
        fetchStoreCategories(currentStore.id);
      }
    }, [currentStore?.id, fetchStoreCategories])
  );

  const openAddForm = useCallback(() => {
    setFormMode('add');
    setEditingProduct(null);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingProduct(null);
    setImageUris([]);
    setLocalError('');
  }, []);

  // Edit mode
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editDimensions, setEditDimensions] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCommissionAmount, setEditCommissionAmount] = useState('');
  const [editCategory, setEditCategory] = useState(null);
  const [editSubcategory, setEditSubcategory] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    if (currentStore) {
      await Promise.all([
        fetchAllStoreProducts(currentStore.id),
        fetchStoreCategories(currentStore.id),
        fetchCategories()
      ]);
    }
  }, [currentStore, fetchAllStoreProducts, fetchStoreCategories]);

  useEffect(() => { loadProducts(); }, [currentStore]);

  // Register the FAB for this screen
  useFAB({
    icon: 'add',
    label: 'إضافة منتج',
    onPress: openAddForm,
    visible: !showForm && !!currentStore && storeCategories.length > 0,
  });

  const onRefresh = async () => { setRefreshing(true); await loadProducts(); setRefreshing(false); };

  const getSubcategories = useCallback((categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.subcategories || [];
  }, [categories]);

  // Memoized Filtered Products
  const filteredProducts = useMemo(() => {
    return filterCategory
      ? products.filter((p) => p.category_id === filterCategory)
      : products;
  }, [filterCategory, products]);

  // ──── Image Picker ────

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      setImageUris((prev) => [...prev, ...newUris].slice(0, 8));
    }
  };

  const removeImageFromPicker = (index) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  // ──── Create Product ────

  const handleCreate = async () => {
    if (!currentStore) { showAlert({ title: 'المتجر مطلوب', message: 'يرجى إعداد متجرك في الإعدادات أولاً.', type: 'error' }); return; }
    if (!name.trim() || !price.trim()) { showAlert({ title: 'خطأ', message: 'الاسم والسعر مطلوبان', type: 'error' }); return; }

    const parsedCommission = parseFloat(commissionAmount) || 0;
    if (parsedCommission < 250) {
      setLocalError('يجب أن تكون العمولة 250 دج على الأقل (200 دج رسوم المنصة + 50 دج كحد أدنى للمسوق).');
      return;
    }

    setLocalError('');
    setFormLoading(true);

    const productData = {
      store_id: currentStore.id,
      name: name.trim(),
      price: parseFloat(price),
      description: description.trim(),
      category_id: selectedCategory || null,
      subcategory_id: selectedSubcategory || null,
      weight: weight.trim() ? parseFloat(weight) : null,
      dimensions: dimensions.trim() || null,
      sku: sku.trim() || null,
      commission_amount: parseFloat(commissionAmount) || 0,
      listing_status: 'published',
      is_active: true,
      image_url: null,
      gallery_urls: [],
    };

    if (stock.trim()) productData.stock = parseInt(stock);

    const result = await createProduct(productData);
    if (result.success) {
      const newProductId = result.data.id;
      processBackgroundUpload(newProductId, currentStore.id, imageUris);

      setName('');
      setPrice('');
      setDescription('');
      setStock('');
      setWeight('');
      setDimensions('');
      setSku('');
      setCommissionAmount('200');
      setImageUris([]);
      setShowForm(false);
      showAlert({ title: 'نجاح', message: 'جاري إضافة المنتج في الخلفية...', type: 'success' });
    } else {
      showAlert({ title: 'خطأ', message: result.error, type: 'error' });
    }
    setFormLoading(false);
  };

  const handleDelete = useCallback((productId, productName) => {
    showConfirm({
      title: 'حذف المنتج',
      message: `هل أنت متأكد أنك تريد حذف "${productName}"؟`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'destructive',
      onConfirm: async () => {
        const result = await deleteProduct(productId);
        if (!result.success) {
          showAlert({
            title: 'خطأ في الحذف',
            message: result.error || 'فشل حذف المنتج، يرجى المحاولة مرة أخرى.',
            type: 'error'
          });
        }
      }
    });
  }, [deleteProduct, showConfirm, showAlert]);

  const startEditing = useCallback((product) => {
    setFormMode('edit');
    setEditingProduct(product.id);
    setEditName(product.name);
    setEditPrice(String(product.price));
    setEditDescription(product.description || '');
    setEditStock(product.stock != null ? String(product.stock) : '');
    setEditWeight(product.weight != null ? String(product.weight) : '');
    setEditDimensions(product.dimensions || '');
    setEditSku(product.sku || '');
    setEditCategory(product.category_id || null);
    setEditSubcategory(product.subcategory_id || null);
    setEditCommissionAmount(product.commission_amount != null ? String(product.commission_amount) : '0');

    const existingImages = product.product_images?.map(img => img.image_url) || product.gallery_urls || [];
    setImageUris(existingImages);

    setShowForm(true);
  }, []);

  const handleSaveEdit = async (productId) => {
    if (!editName.trim() || !editPrice.trim()) { showAlert({ title: 'خطأ', message: 'الاسم والسعر مطلوبان', type: 'error' }); return; }

    const parsedCommission = parseFloat(editCommissionAmount) || 0;
    if (parsedCommission < 250) {
      setLocalError('يجب أن تكون العمولة 250 دج على الأقل (200 دج رسوم المنصة + 50 دج كحد أدنى للمسوق).');
      return;
    }

    setLocalError('');
    setEditLoading(true);

    try {
      const finalUrls = [];
      const newUris = [];
      if (currentStore) {
        const currentProduct = products.find(p => p.id === productId);
        const existingImageRecords = currentProduct?.product_images || [];
        const removedImageIds = existingImageRecords
          .filter(img => !imageUris.includes(img.image_url))
          .map(img => img.id);

        if (removedImageIds.length > 0) {
          await supabase.from('product_images').delete().in('id', removedImageIds);
        }

        for (const uri of imageUris) {
          if (uri.startsWith('http')) {
            finalUrls.push(uri);
          } else {
            newUris.push(uri);
          }
        }
      }

      const prev = products.find((p) => p.id === productId);
      const updates = {
        name: editName.trim(),
        price: parseFloat(editPrice),
        description: editDescription.trim(),
        category_id: editCategory || null,
        subcategory_id: editSubcategory || null,
        weight: editWeight.trim() ? parseFloat(editWeight) : null,
        dimensions: editDimensions.trim() || null,
        sku: editSku.trim() || null,
        commission_amount: parseFloat(editCommissionAmount) || 0,
        image_url: finalUrls.length > 0 ? finalUrls[0] : prev?.image_url,
        gallery_urls: finalUrls,
      };

      if (editStock.trim()) updates.stock = parseInt(editStock);
      if (prev?.listing_status === 'rejected') {
        updates.listing_status = 'published';
        updates.rejection_note = null;
      }

      const result = await updateProduct(productId, updates);
      if (result.success) {
        if (newUris.length > 0) {
          processBackgroundUpload(productId, currentStore.id, newUris);
          showAlert({ title: 'نجاح', message: 'تم تحديث البيانات، جاري رفع الصور الجديدة...', type: 'success' });
        } else {
          showAlert({ title: 'نجاح', message: 'تم تحديث المنتج بنجاح!', type: 'success' });
        }

        await loadProducts();
        setEditingProduct(null);
        setShowForm(false);
        setImageUris([]);
      } else {
        showAlert({ title: 'خطأ', message: result.error, type: 'error' });
      }
    } catch (err) {
      showAlert({ title: 'خطأ', message: err.message, type: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = useCallback((item) => {
    updateProduct(item.id, { is_active: !item.is_active });
  }, [updateProduct]);

  const handleImagePress = useCallback((item) => {
    if (item.image_url) {
      const allImages = [item.image_url, ...(item.gallery_urls || [])];
      setPreviewImages(allImages);
      setPreviewIndex(0);
      setPreviewVisible(true);
    }
  }, []);

  const renderProduct = useCallback(({ item }) => (
    <ProductCard
      item={item}
      theme={theme}
      isWide={isWide}
      categories={categories}
      onToggleStatus={handleToggleStatus}
      onEdit={startEditing}
      onDelete={handleDelete}
      onImagePress={handleImagePress}
    />
  ), [theme, isWide, categories, handleToggleStatus, startEditing, handleDelete, handleImagePress]);

  const renderProductForm = () => (
    <View style={styles.formContent}>
      {storeCategories.length === 0 && isWide && (
        <CategoryReminder theme={theme} onPress={() => { closeForm(); router.push('/(merchant)/categories'); }} />
      )}

      <Input
        label="اسم المنتج *"
        value={formMode === 'edit' ? editName : name}
        onChangeText={formMode === 'edit' ? setEditName : setName}
        placeholder="مثال: ساعة يد ذكية فاخرة"
        icon="cube-outline"
      />

      <View style={[styles.editRow, !isWide && styles.editRowMobile]}>
        <View style={styles.flex1}>
          <Input
            label="سعر البيع للزبون (DZD) *"
            value={formMode === 'edit' ? editPrice : price}
            onChangeText={formMode === 'edit' ? setEditPrice : setPrice}
            placeholder="2500"
            keyboardType="decimal-pad"
            icon="cash-outline"
          />
        </View>
        <View style={styles.flex1}>
          <Input
            label="عمولة المسوق (DZD) *"
            value={formMode === 'edit' ? editCommissionAmount : commissionAmount}
            onChangeText={formMode === 'edit' ? setEditCommissionAmount : setCommissionAmount}
            placeholder="500"
            keyboardType="decimal-pad"
            icon="gift-outline"
          />
        </View>
      </View>

      <Text style={[styles.inputHint, { color: theme.isDark ? '#94A3B8' : COLORS.textLight, marginTop: -10, marginBottom: 15 }]}>
        العمولة يجب أن تكون 250 دج على الأقل (200 دج رسوم المنصة + 50 دج على الأقل للمسوق).
      </Text>

      <Input
        label="الوصف"
        value={formMode === 'edit' ? editDescription : description}
        onChangeText={formMode === 'edit' ? setEditDescription : setDescription}
        placeholder="اكتب وصفاً جذاباً وشاملاً للمنتج..."
        multiline
        numberOfLines={4}
        style={{ minHeight: 100, textAlignVertical: 'top' }}
      />

      <View style={[styles.editRow, !isWide && styles.editRowMobile]}>
        <View style={styles.flex1}>
          <Input
            label="المخزون المتوفر"
            value={formMode === 'edit' ? editStock : stock}
            onChangeText={formMode === 'edit' ? setEditStock : setStock}
            placeholder="الكمية المتاحة (اختياري)"
            keyboardType="number-pad"
            icon="layers-outline"
          />
        </View>
        <View style={styles.flex1}>
          <Input
            label="الوزن (غرام)"
            value={formMode === 'edit' ? editWeight : weight}
            onChangeText={formMode === 'edit' ? setEditWeight : setWeight}
            placeholder="مثال: 500"
            keyboardType="decimal-pad"
            icon="scale-outline"
          />
        </View>
      </View>

      <View style={[styles.editRow, !isWide && styles.editRowMobile]}>
        <View style={styles.flex1}>
          <Input
            label="الأبعاد (سم)"
            value={formMode === 'edit' ? editDimensions : dimensions}
            onChangeText={formMode === 'edit' ? setEditDimensions : setDimensions}
            placeholder="مثال: 30×20×10"
            icon="resize-outline"
          />
        </View>
        <View style={styles.flex1}>
          <Input
            label="رمز المنتج (SKU)"
            value={formMode === 'edit' ? editSku : sku}
            onChangeText={formMode === 'edit' ? setEditSku : setSku}
            placeholder="لتتبع المخزون الداخلي"
            icon="barcode-outline"
          />
        </View>
      </View>

      <CategoryPicker
        categories={storeCategories}
        getSubcategories={getSubcategories}
        value={formMode === 'edit' ? editCategory : selectedCategory}
        onChange={formMode === 'edit' ? setEditCategory : setSelectedCategory}
        subValue={formMode === 'edit' ? editSubcategory : selectedSubcategory}
        onSubChange={formMode === 'edit' ? setEditSubcategory : setSelectedSubcategory}
        theme={theme}
        isWide={isWide}
        pickerVisible={categoryPickerVisible}
        setPickerVisible={setCategoryPickerVisible}
        subPickerVisible={subcategoryPickerVisible}
        setSubPickerVisible={setSubcategoryPickerVisible}
      />

      <ImageGalleryPicker
        imageUris={imageUris}
        theme={theme}
        onRemove={removeImageFromPicker}
        onPick={pickImages}
        onPreview={(uri, index) => {
          setPreviewImages(imageUris);
          setPreviewIndex(index);
          setPreviewVisible(true);
        }}
      />

      {/* Money Split Overview */}
      {(parseFloat(formMode === 'edit' ? editPrice : price) > 0 || parseFloat(formMode === 'edit' ? editCommissionAmount : commissionAmount) > 0) && (
        <View style={[styles.splitCard, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.5)" : COLORS.bgWhite, borderColor: theme.isDark ? "rgba(255, 255, 255, 0.05)" : COLORS.border }]}>
          <View style={[styles.splitHeader, { borderBottomColor: theme.isDark ? "rgba(255, 255, 255, 0.05)" : COLORS.border }]}>
            <Ionicons name="receipt-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.splitTitle, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}>تحليل الأرباح للطلب الواحد</Text>
          </View>

          <View style={styles.splitContent}>
            <View style={styles.splitRow}>
              <Text style={[styles.splitTotalLabel, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}>سعر البيع للزبون</Text>
              <Text style={[styles.splitTotalValue, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}>
                {formatCurrency(parseFloat(formMode === 'edit' ? editPrice : price) || 0)}
              </Text>
            </View>

            <View style={[styles.splitDivider, { borderColor: theme.isDark ? "rgba(255, 255, 255, 0.1)" : COLORS.border }]} />

            <View style={styles.splitRow}>
              <View style={styles.splitLabelGroup}>
                <View style={[styles.splitDot, { backgroundColor: theme.isDark ? '#94A3B8' : COLORS.textMuted }]} />
                <Text style={[styles.splitLabel, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>حصتك كتاجر (صافي)</Text>
              </View>
              <Text style={[styles.splitValue, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}>
                {formatCurrency(Math.max(0, (parseFloat(formMode === 'edit' ? editPrice : price) || 0) - (parseFloat(formMode === 'edit' ? editCommissionAmount : commissionAmount) || 0)))}
              </Text>
            </View>

            <View style={styles.splitRow}>
              <View style={styles.splitLabelGroup}>
                <View style={[styles.splitDot, { backgroundColor: COLORS.primary }]} />
                <Text style={[styles.splitLabel, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>ربح المسوق (صافي)</Text>
              </View>
              <Text style={[styles.splitValue, { color: COLORS.primary }]}>
                {formatCurrency(Math.max(0, (parseFloat(formMode === 'edit' ? editCommissionAmount : commissionAmount) || 0) - 200))}
              </Text>
            </View>

            <View style={styles.splitRow}>
              <View style={styles.splitLabelGroup}>
                <View style={[styles.splitDot, { backgroundColor: '#A29BFE' }]} />
                <Text style={[styles.splitLabel, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>رسوم المنصة الثابتة</Text>
              </View>
              <Text style={[styles.splitValue, { color: '#A29BFE' }]}>{formatCurrency(200)}</Text>
            </View>
          </View>

          <View style={[styles.splitFooter, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FA', borderTopColor: theme.isDark ? "rgba(255, 255, 255, 0.05)" : COLORS.border }]}>
            <Ionicons name="information-circle-outline" size={14} color={theme.isDark ? '#94A3B8' : COLORS.textMuted} />
            <Text style={[styles.splitHint, { color: theme.isDark ? '#94A3B8' : COLORS.textMuted }]}>
              عند نجاح توصيل الطلب، يتم خصم العمولة تلقائياً ويضاف الصافي إلى رصيدك.
            </Text>
          </View>
        </View>
      )}

      {localError ? (
        <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
          <Ionicons name="alert-circle" size={18} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{localError}</Text>
        </View>
      ) : null}

      <Button
        title={formMode === 'edit' ? "حفظ التعديلات" : "إضافة منتج"}
        onPress={formMode === 'edit' ? () => handleSaveEdit(editingProduct) : handleCreate}
        loading={formMode === 'edit' ? editLoading : formLoading}
        variant="primary"
        style={styles.submitBtn}
        disabled={categories.length === 0}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.isDark ? '#0A0A1A' : COLORS.bgMain }]} edges={['bottom']}>
      <UniversalHeader
        title="منتجات المتجر"
        subtitle={`${products.length} منتجات متاحة للمسوقين`}
      />

      {!showForm && isWide && (
        <View style={[styles.infoBanner, { backgroundColor: theme.isDark ? 'rgba(116, 198, 157, 0.15)' : 'rgba(116, 198, 157, 0.15)' }]}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <View style={styles.infoBannerText}>
            <Text style={[styles.infoBannerTitle, { color: COLORS.primary }]}>توضيح تسعير المنتجات</Text>
            <Text style={[styles.infoBannerDesc, { color: theme.isDark ? '#CBD5E1' : COLORS.textMain }]}>
              ضع سعر البيع النهائي الذي يدفعه الزبون. عمولة المسوق ورسوم المنصة تُخصم من هذا السعر ليتبقى لك الصافي.
            </Text>
          </View>
        </View>
      )}

      {/* Category Filter Chips */}
      {categories.length > 0 && !showForm && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <TouchableOpacity
              onPress={() => setFilterCategory(null)}
              style={[
                styles.filterChip,
                !filterCategory
                  ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                  : { backgroundColor: theme.isDark ? '#1E293B' : COLORS.bgWhite, borderColor: theme.isDark ? '#334155' : COLORS.border }
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, { color: !filterCategory ? '#FFF' : (theme.isDark ? '#94A3B8' : COLORS.textMuted) }]}>الكل</Text>
            </TouchableOpacity>
            {storeCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setFilterCategory(cat.id === filterCategory ? null : cat.id)}
                style={[
                  styles.filterChip,
                  filterCategory === cat.id
                    ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                    : { backgroundColor: theme.isDark ? '#1E293B' : COLORS.bgWhite, borderColor: theme.isDark ? '#334155' : COLORS.border }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name={cat.icon || 'grid-outline'} size={14} color={filterCategory === cat.id ? '#FFF' : (theme.isDark ? '#94A3B8' : COLORS.textMuted)} style={{ marginEnd: 6 }} />
                <Text style={[styles.filterChipText, { color: filterCategory === cat.id ? '#FFF' : (theme.isDark ? '#94A3B8' : COLORS.textMuted) }]}>{cat.name_ar || cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isWide ? (
        <Modal
          visible={showForm}
          onClose={closeForm}
          title={formMode === 'edit' ? "تعديل المنتج" : "إضافة منتج جديد"}
          subtitle={formMode === 'edit' ? "قم بتعديل بيانات وتفاصيل المنتج" : "أدخل تفاصيل منتجك ليبدأ المسوقون في الترويج له"}
          maxWidth={850}
        >
          <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: '85vh' }} contentContainerStyle={{ paddingHorizontal: spacing.sm }}>
            {renderProductForm()}
          </ScrollView>
        </Modal>
      ) : (
        <BottomSheet
          visible={showForm}
          onClose={closeForm}
          title={formMode === 'edit' ? "تعديل المنتج" : "إضافة منتج جديد"}
          subtitle={formMode === 'edit' ? "قم بتعديل بيانات وتفاصيل المنتج" : "أدخل تفاصيل منتجك ليبدأ المسوقون الترويج له"}
        >
          {renderProductForm()}
        </BottomSheet>
      )}

      {!showForm && (
        !currentStore ? (
          <View style={styles.noStoreContainer}>
            <EmptyState icon="storefront-outline" title="لم يتم العثور على متجر" message="يجب عليك إعداد متجرك أولاً من الإعدادات قبل إضافة المنتجات." />
            <Button title="انتقل إلى إعدادات المتجر" onPress={() => router.push('/(merchant)/settings')} variant="primary" style={{ marginTop: spacing.lg, marginHorizontal: spacing.xl }} />
          </View>
        ) : isLoading && products.length === 0 ? (
          <LoadingSpinner message="يتم جلب المنتجات..." />
        ) : (
          <FlatList
            key={`products-grid-${isWide ? 5 : 2}`}
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={isWide ? 5 : 2}
            contentContainerStyle={[styles.list, isWide && styles.listDesktop]}
            columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xs }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
            ListHeaderComponent={
              storeCategories.length === 0 && isWide ? (
                <CategoryReminder theme={theme} onPress={() => router.push('/(merchant)/categories')} />
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon="cube-outline"
                title="لا توجد منتجات"
                message={filterCategory ? 'لا توجد منتجات مطابقة لهذا التصنيف.' : 'لم تقم بإضافة أي منتج بعد، ابدأ الآن لزيادة مبيعاتك.'}
              />
            }
          />
        )
      )}

      {/* Image Preview Modal */}
      <ImageViewerModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        images={previewImages}
        activeIndex={previewIndex}
        onNext={() => setPreviewIndex((prev) => (prev + 1) % previewImages.length)}
        onPrev={() => setPreviewIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length)}
      />

    </SafeAreaView>
  );
}

// ──── Sub-Components ────

const CategoryReminder = React.memo(({ theme, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.reminderCard, { backgroundColor: theme.isDark ? 'rgba(116, 198, 157, 0.1)' : 'rgba(116, 198, 157, 0.15)', borderColor: theme.isDark ? 'rgba(116, 198, 157, 0.3)' : 'rgba(116, 198, 157, 0.3)' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="information-circle-outline" size={32} color={COLORS.primary} />
      <View style={styles.reminderContent}>
        <Text style={[styles.reminderTitle, { color: COLORS.primary }]}>حدد تصنيفات متجرك أولاً</Text>
        <Text style={[styles.reminderText, { color: theme.isDark ? '#94A3B8' : COLORS.textMain }]}>
          يجب تحديد التصنيفات التي تبيع فيها (مثل ملابس، تجميل) من تبويب "التصنيفات" قبل إضافة المنتجات، لضمان ظهورها للمسوقين.
        </Text>
      </View>
      <Ionicons name="chevron-back" size={20} color={COLORS.primary} style={{ opacity: 0.7 }} />
    </TouchableOpacity>
  );
});

const CategoryPicker = React.memo(({
  categories,
  getSubcategories,
  value,
  onChange,
  subValue,
  onSubChange,
  theme,
  isWide,
  pickerVisible,
  setPickerVisible,
  subPickerVisible,
  setSubPickerVisible
}) => {
  if (!categories || categories.length === 0) return null;
  const subs = value ? getSubcategories(value) : [];
  const selectedCat = categories.find(c => c.id === value);
  const selectedSub = subs.find(s => s.id === subValue);

  return (
    <View style={styles.categoryPickerWrap}>
      <View style={[styles.editRow, !isWide && styles.editRowMobile]}>
        <View style={styles.flex1}>
          <Text style={[styles.pickerLabel, { color: theme.isDark ? '#CBD5E1' : COLORS.textMain }]}>التصنيف الرئيسي *</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: theme.isDark ? '#1E293B' : COLORS.bgMain, borderColor: theme.isDark ? '#334155' : COLORS.border }]}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.pickerInner}>
              <Ionicons name={selectedCat?.icon || "layers-outline"} size={20} color={selectedCat ? COLORS.primary : COLORS.textLight} />
              <Text style={[styles.pickerText, { color: value ? (theme.isDark ? '#FFFFFF' : COLORS.textMain) : COLORS.textLight }]}>
                {selectedCat ? (selectedCat.name_ar || selectedCat.name) : 'اختر التصنيف...'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {subs.length > 0 && (
          <View style={styles.flex1}>
            <Text style={[styles.pickerLabel, { color: theme.isDark ? '#CBD5E1' : COLORS.textMain }]}>التصنيف الفرعي</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: theme.isDark ? '#1E293B' : COLORS.bgMain, borderColor: theme.isDark ? '#334155' : COLORS.border }]}
              onPress={() => setSubPickerVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.pickerInner}>
                <Ionicons name="grid-outline" size={20} color={selectedSub ? COLORS.primary : COLORS.textLight} />
                <Text style={[styles.pickerText, { color: subValue ? (theme.isDark ? '#FFFFFF' : COLORS.textMain) : COLORS.textLight }]}>
                  {selectedSub ? (selectedSub.name_ar || selectedSub.name) : 'الكل (اختياري)'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <BottomSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title="اختر التصنيف الرئيسي"
        subtitle="حدد التصنيف العام لمنتجك ليظهر للمسوقين"
      >
        <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.sheetItem, { borderBottomColor: theme.isDark ? '#334155' : COLORS.border }]}
              onPress={() => { onChange(cat.id); onSubChange(null); setPickerVisible(false); }}
            >
              <View style={[styles.sheetIcon, { backgroundColor: value === cat.id ? 'rgba(116, 198, 157, 0.15)' : (theme.isDark ? '#1E293B' : COLORS.bgMain) }]}>
                <Ionicons name={cat.icon || 'grid-outline'} size={20} color={value === cat.id ? COLORS.primary : COLORS.textLight} />
              </View>
              <Text style={[styles.sheetItemText, { color: value === cat.id ? COLORS.primary : (theme.isDark ? '#FFFFFF' : COLORS.textMain), fontFamily: value === cat.id ? 'Tajawal_800ExtraBold' : 'Tajawal_500Medium' }]}>
                {cat.name_ar || cat.name}
              </Text>
              {value === cat.id && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.sheetItem, { borderBottomWidth: 0, marginTop: 10 }]}
            onPress={() => { onChange(null); onSubChange(null); setPickerVisible(false); }}
          >
            <View style={[styles.sheetIcon, { backgroundColor: theme.isDark ? '#1E293B' : COLORS.bgMain }]}>
              <Ionicons name="close-outline" size={20} color={COLORS.textLight} />
            </View>
            <Text style={[styles.sheetItemText, { color: COLORS.textLight }]}>إلغاء التحديد (بدون تصنيف)</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={subPickerVisible}
        onClose={() => setSubPickerVisible(false)}
        title="التصنيف الفرعي"
        subtitle={`خيارات تصنيف: ${selectedCat?.name_ar || selectedCat?.name}`}
      >
        <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.sheetItem, { borderBottomColor: theme.isDark ? '#334155' : COLORS.border }]}
            onPress={() => { onSubChange(null); setSubPickerVisible(false); }}
          >
            <View style={[styles.sheetIcon, { backgroundColor: !subValue ? 'rgba(116, 198, 157, 0.15)' : (theme.isDark ? '#1E293B' : COLORS.bgMain) }]}>
              <Ionicons name="list-outline" size={20} color={!subValue ? COLORS.primary : COLORS.textLight} />
            </View>
            <Text style={[styles.sheetItemText, { color: !subValue ? COLORS.primary : (theme.isDark ? '#FFFFFF' : COLORS.textMain), fontFamily: !subValue ? 'Tajawal_800ExtraBold' : 'Tajawal_500Medium' }]}>
              الكل (جميع التصنيفات الفرعية)
            </Text>
            {!subValue && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
          </TouchableOpacity>
          {subs.map((sub) => (
            <TouchableOpacity
              key={sub.id}
              style={[styles.sheetItem, { borderBottomColor: theme.isDark ? '#334155' : COLORS.border }]}
              onPress={() => { onSubChange(sub.id); setSubPickerVisible(false); }}
            >
              <View style={[styles.sheetIcon, { backgroundColor: subValue === sub.id ? 'rgba(116, 198, 157, 0.15)' : (theme.isDark ? '#1E293B' : COLORS.bgMain) }]}>
                <Ionicons name="pricetag-outline" size={18} color={subValue === sub.id ? COLORS.primary : COLORS.textLight} />
              </View>
              <Text style={[styles.sheetItemText, { color: subValue === sub.id ? COLORS.primary : (theme.isDark ? '#FFFFFF' : COLORS.textMain), fontFamily: subValue === sub.id ? 'Tajawal_800ExtraBold' : 'Tajawal_500Medium' }]}>
                {sub.name_ar || sub.name}
              </Text>
              {subValue === sub.id && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
});

const ImageGalleryPicker = React.memo(({ imageUris, theme, onRemove, onPick, onPreview }) => {
  return (
    <View style={styles.galleryWrap}>
      <View style={styles.galleryHeader}>
        <Text style={[styles.pickerLabel, { color: theme.isDark ? '#CBD5E1' : COLORS.textMain, marginBottom: 0 }]}>
          صور المنتج
        </Text>
        <Text style={[styles.galleryCounter, { color: theme.isDark ? '#94A3B8' : COLORS.textLight }]}>
          {imageUris.length}/8 صور
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
        {imageUris.map((uri, index) => (
          <View key={index} style={styles.galleryThumbWrapper}>
            <TouchableOpacity
              onPress={() => uri && onPreview(uri, index)}
              activeOpacity={0.9}
              style={styles.galleryThumb}
            >
              <Image
                source={uri ? { uri } : null}
                style={styles.galleryImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
            {index === 0 && (
              <View style={[styles.primaryBadge, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.primaryBadgeText}>الرئيسية</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => onRemove(index)}
              style={styles.removeImageBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}
        {imageUris.length < 8 && (
          <TouchableOpacity
            onPress={onPick}
            style={[styles.addImageBtn, { borderColor: 'rgba(116, 198, 157, 0.4)', backgroundColor: theme.isDark ? 'rgba(45, 106, 79, 0.2)' : 'rgba(116, 198, 157, 0.1)' }]}
            activeOpacity={0.7}
          >
            <View style={[styles.addImageIconWrap, { backgroundColor: theme.isDark ? '#1B4332' : 'rgba(116, 198, 157, 0.2)' }]}>
              <Ionicons name="add" size={24} color={COLORS.primary} />
            </View>
            <Text style={[styles.addImageText, { color: COLORS.primary }]}>إضافة صورة</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, paddingBottom: 120 },
  listDesktop: {
    maxWidth: '100%',
    alignSelf: 'stretch',
    width: '100%',
  },

  // Layout utilities
  flex1: { flex: 1 },
  editRow: { flexDirection: 'row-reverse', gap: spacing.md, marginBottom: spacing.md },
  editRowMobile: { flexDirection: 'column', gap: 0 },

  // Info Banner
  infoBanner: {
    flexDirection: 'row-reverse',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 20, // Premium radius
    alignItems: 'center',
    gap: spacing.md,
  },
  infoBannerText: { flex: 1 },
  infoBannerTitle: { fontFamily: 'Tajawal_800ExtraBold', fontSize: typography.sm, marginBottom: 4, textAlign: 'right' },
  infoBannerDesc: { fontFamily: 'Tajawal_500Medium', fontSize: typography.xs, lineHeight: 18, textAlign: 'right' },

  // Filter Chips (Direction untouched)
  filterContainer: { paddingVertical: spacing.sm },
  filterRow: { paddingHorizontal: spacing.md, gap: spacing.sm, flexDirection: 'row' },
  filterChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20, // Premium pill
    borderWidth: 1,
  },
  filterChipText: { fontFamily: 'Tajawal_500Medium', fontSize: typography.sm },

  // Product Card
  productCard: {
    marginBottom: spacing.md,
    borderRadius: 20, // Rounded cinematic edges
    borderWidth: 1.5, // Slightly thicker border to compensate for no shadow
    overflow: 'hidden',
  },
  productCardMobile: { width: '48%' },
  productCardDesktop: { width: '19%' },

  imageContainer: {
    width: '100%',
    height: 150, // Tighter to balance mobile screens
    position: 'relative',
    backgroundColor: COLORS.bgMain,
  },
  productImage: { width: '100%', height: '100%' },
  productImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
  },

  cardTopBadges: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row-reverse',
  },
  glassBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  glassBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Tajawal_700Bold' },

  productInfo: {
    padding: 12,
    paddingBottom: 16,
  },
  categoryText: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 10,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 4
  },
  productName: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 18,
  },

  gridPriceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  productPrice: {
    fontFamily: 'Tajawal_900Black',
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.5,
  },
  cardCommissionBadgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    alignItems: 'center',
  },
  cardCommissionBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardCommissionLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontFamily: 'Tajawal_700Bold',
  },
  cardCommissionValue: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Tajawal_800ExtraBold',
  },

  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  circularActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Forms
  formContent: { paddingTop: spacing.xs, paddingBottom: spacing.xxl },
  inputHint: { fontFamily: 'Tajawal_500Medium', fontSize: 12, textAlign: 'right' },
  submitBtn: { marginTop: spacing.xl, marginBottom: spacing.xxl },

  // Category Picker
  categoryPickerWrap: { marginBottom: spacing.lg },
  pickerLabel: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 14, marginBottom: spacing.xs, textAlign: 'right' },
  pickerBtn: {
    height: 56, // Slightly taller for premium feel
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 16, // Premium radius
    borderWidth: 1.5,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pickerInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  pickerText: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },

  // Bottom Sheet List
  sheetList: { paddingBottom: spacing.xxl },
  sheetItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md
  },
  sheetIcon: {
    width: 44, // Slightly larger
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemText: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right'
  },

  // Reminder Card
  reminderCard: {
    flexDirection: 'row-reverse',
    padding: spacing.md,
    borderRadius: 20, // Premium radius
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  reminderContent: { flex: 1 },
  reminderTitle: { fontFamily: 'Tajawal_800ExtraBold', fontSize: typography.md, marginBottom: 4, textAlign: 'right' },
  reminderText: { fontFamily: 'Tajawal_500Medium', fontSize: typography.sm, lineHeight: 20, textAlign: 'right' },

  // Gallery
  galleryWrap: { marginBottom: spacing.lg },
  galleryHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.sm },
  galleryCounter: { fontFamily: 'Tajawal_700Bold', fontSize: 12 },
  galleryRow: { gap: spacing.md, paddingVertical: spacing.xs, flexDirection: 'row-reverse' },
  galleryThumbWrapper: { position: 'relative' },
  galleryThumb: { width: 90, height: 90, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#DEE2E6' },
  galleryImage: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  primaryBadgeText: { color: '#FFF', fontSize: 9, fontFamily: 'Tajawal_800ExtraBold' },
  removeImageBtn: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    backgroundColor: '#FF6B6B',
    width: 28, // Slightly larger for better touch target
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  addImageBtn: {
    width: 90,
    height: 90,
    borderRadius: 16, // Premium radius
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addImageIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addImageText: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 11 },

  // Money Split Card
  splitCard: {
    borderRadius: 20, // Premium radius
    borderWidth: 1,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  splitHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  splitTitle: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 15 },
  splitContent: { padding: spacing.md },
  splitRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  splitLabelGroup: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  splitDot: { width: 8, height: 8, borderRadius: 4 },
  splitLabel: { fontFamily: 'Tajawal_500Medium', fontSize: 13 },
  splitValue: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 14 },
  splitDivider: {
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginVertical: spacing.md,
    opacity: 0.5,
  },
  splitTotalLabel: { fontFamily: 'Tajawal_700Bold', fontSize: 15 },
  splitTotalValue: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 18 },
  splitFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  splitHint: { fontFamily: 'Tajawal_500Medium', fontSize: 12, flex: 1, textAlign: 'right', lineHeight: 18 },

  // Error Box
  errorBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  errorText: { fontFamily: 'Tajawal_700Bold', fontSize: 13, flex: 1, textAlign: 'right' },

  // Empty State
  noStoreContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});