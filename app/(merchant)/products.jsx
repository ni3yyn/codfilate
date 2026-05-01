import React, { useEffect, useState, useCallback } from 'react';
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
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

export default function ProductsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currentStore = useStoreStore((s) => s.currentStore);
  const { products, isLoading, fetchAllStoreProducts, createProduct, updateProduct, deleteProduct, uploadProductImage, addProductImage, uploadQueue, processBackgroundUpload } = useProductStore();
  const { storeCategories: categories, fetchStoreCategories } = useCategoryStore();
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

  // Register the FAB for this screen
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
      await fetchAllStoreProducts(currentStore.id);
      await fetchStoreCategories(currentStore.id);
    }
  }, [currentStore, fetchAllStoreProducts, fetchStoreCategories]);

  useEffect(() => { loadProducts(); }, [currentStore]);

  // Register the FAB for this screen
  useFAB({
    icon: 'add',
    label: 'إضافة منتج',
    onPress: openAddForm,
    visible: !showForm && !!currentStore && categories.length > 0,
  });

  const onRefresh = async () => { setRefreshing(true); await loadProducts(); setRefreshing(false); };

  // ──── Category helpers ────

  const getSubcategories = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.subcategories || [];
  };

  // Filter products by selected category
  const filteredProducts = filterCategory
    ? products.filter((p) => p.category_id === filterCategory)
    : products;

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

  const pickSingleImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
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

    // 1. Prepare Initial Product Data (Without images yet)
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
      image_url: null, // Will be updated in background
      gallery_urls: [], // Will be updated in background
    };

    if (stock.trim()) productData.stock = parseInt(stock);

    const result = await createProduct(productData);
    if (result.success) {
      const newProductId = result.data.id;

      // 2. Start Background Upload (DO NOT AWAIT)
      processBackgroundUpload(newProductId, currentStore.id, imageUris);

      // 3. Reset Form and close immediately
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

  const handleDelete = (productId, productName) => {
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
  };

  const startEditing = (product) => {
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

    // Populate gallery
    const existingImages = product.product_images?.map(img => img.image_url) || product.gallery_urls || [];
    setImageUris(existingImages);

    setShowForm(true);
  };

  const cancelEditing = useCallback(() => {
    setShowForm(false);
    setEditingProduct(null);
    setImageUris([]);
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
      // 1. Handle Images
      const finalUrls = [];
      const newUris = [];
      if (currentStore) {
        // Identify deleted images
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
        // Handle new image uploads in background if any
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

  const handleEditImage = async (productId) => {
    const uri = await pickSingleImage();
    if (uri && currentStore) {
      setEditLoading(true);
      const uploadResult = await uploadProductImage(uri, currentStore.id);
      if (uploadResult.success) {
        await updateProduct(productId, { image_url: uploadResult.url });
        await addProductImage(productId, currentStore.id, uploadResult.url);
        showAlert({ title: 'نجاح', message: 'تم تحديث صورة المنتج!', type: 'success' });
      } else {
        showAlert({ title: 'خطأ', message: 'فشل رفع الصورة', type: 'error' });
      }
      setEditLoading(false);
    }
  };

  // ──── Render Product Card ────

  const renderProduct = ({ item }) => {
    const imageCount = (item.product_images || []).length;
    const uploadStatus = uploadQueue[item.id];
    const isRejected = item.listing_status === 'rejected';

    return (
      <Card style={[
        styles.productCard,
        isWide ? styles.productCardDesktop : styles.productCardMobile,
        isRejected && { borderColor: '#FF6B6B', borderWidth: 1.5 }
      ]}>
        <TouchableOpacity 
          style={styles.imageContainer}
          activeOpacity={0.9}
          onPress={() => {
            if (item.image_url) {
              const allImages = [item.image_url, ...(item.gallery_urls || [])];
              setPreviewImages(allImages);
              setPreviewIndex(0);
              setPreviewVisible(true);
            }
          }}
        >
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.productImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.productImagePlaceholder, { backgroundColor: theme.colors.surface2 }]}>
              <Ionicons name="image-outline" size={32} color={theme.colors.textTertiary} />
            </View>
          )}

          {/* Top Badges - Smaller for Grid */}
          <View style={styles.cardTopBadges}>
            {item.listing_status && (
              <View style={[styles.miniStatusBadge, { backgroundColor: item.listing_status === 'published' ? '#40C057' : item.listing_status === 'rejected' ? '#FF6B6B' : '#FAB005' }]} />
            )}
            {!item.is_active && (
              <View style={[styles.inactiveBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <Text style={styles.inactiveBadgeText}>معطل</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.gridPriceRow}>
            <Text style={[styles.productPrice, { color: theme.colors.text }]}>{formatCurrency(item.price)}</Text>
            <Text style={[styles.productCommission, { color: theme.primary }]}>+{formatCurrency(item.commission_amount || 0)}</Text>
          </View>
          <View style={styles.categoryBreadcrumb}>
            <Text style={[styles.catTagText, { color: theme.colors.textTertiary }]} numberOfLines={1}>
              {categories.find(c => (c.id === item.category_id || c.id === item.category))?.name_ar || 
               (typeof item.category === 'object' ? (item.category.name_ar || item.category.name) : item.category)}
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.colors.divider }]}>
          <TouchableOpacity
            onPress={() => updateProduct(item.id, { is_active: !item.is_active })}
            style={styles.footerActionBtn}
            activeOpacity={0.7}
          >
            <Ionicons name={item.is_active ? "power" : "power-outline"} size={18} color={item.is_active ? theme.colors.textSecondary : '#FF6B6B'} />
          </TouchableOpacity>

          <View style={styles.footerDivider} />

          <TouchableOpacity
            onPress={() => startEditing(item)}
            style={styles.footerActionBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color={theme.primary} />
          </TouchableOpacity>

          <View style={styles.footerDivider} />

          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.name)}
            style={styles.footerActionBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderProductForm = () => (
    <View style={styles.formContent}>
      {categories.length === 0 && (
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

      <Text style={[styles.inputHint, { color: theme.colors.textTertiary, marginTop: -10, marginBottom: 15 }]}>
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
        categories={categories}
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
        <View style={[styles.splitCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.splitHeader}>
            <Ionicons name="receipt-outline" size={20} color={theme.primary} />
            <Text style={[styles.splitTitle, { color: theme.colors.text }]}>تحليل الأرباح للطلب الواحد</Text>
          </View>

          <View style={styles.splitContent}>
            <View style={styles.splitRow}>
              <Text style={[styles.splitTotalLabel, { color: theme.colors.text }]}>سعر البيع للزبون</Text>
              <Text style={[styles.splitTotalValue, { color: theme.colors.text }]}>
                {formatCurrency(parseFloat(formMode === 'edit' ? editPrice : price) || 0)}
              </Text>
            </View>

            <View style={[styles.splitDivider, { borderColor: theme.colors.divider }]} />

            <View style={styles.splitRow}>
              <View style={styles.splitLabelGroup}>
                <View style={[styles.splitDot, { backgroundColor: theme.colors.textSecondary }]} />
                <Text style={[styles.splitLabel, { color: theme.colors.textSecondary }]}>حصتك كتاجر (صافي)</Text>
              </View>
              <Text style={[styles.splitValue, { color: theme.colors.text }]}>
                {formatCurrency(Math.max(0, (parseFloat(formMode === 'edit' ? editPrice : price) || 0) - (parseFloat(formMode === 'edit' ? editCommissionAmount : commissionAmount) || 0)))}
              </Text>
            </View>

            <View style={styles.splitRow}>
              <View style={styles.splitLabelGroup}>
                <View style={[styles.splitDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.splitLabel, { color: theme.colors.textSecondary }]}>ربح المسوق (صافي)</Text>
              </View>
              <Text style={[styles.splitValue, { color: theme.primary }]}>
                {formatCurrency(Math.max(0, (parseFloat(formMode === 'edit' ? editCommissionAmount : commissionAmount) || 0) - 200))}
              </Text>
            </View>

            <View style={styles.splitRow}>
              <View style={styles.splitLabelGroup}>
                <View style={[styles.splitDot, { backgroundColor: '#A29BFE' }]} />
                <Text style={[styles.splitLabel, { color: theme.colors.textSecondary }]}>رسوم المنصة الثابتة</Text>
              </View>
              <Text style={[styles.splitValue, { color: '#A29BFE' }]}>{formatCurrency(200)}</Text>
            </View>
          </View>

          <View style={[styles.splitFooter, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FA' }]}>
            <Ionicons name="information-circle-outline" size={14} color={theme.colors.textTertiary} />
            <Text style={[styles.splitHint, { color: theme.colors.textTertiary }]}>
              عند نجاح توصيل الطلب، يتم خصم العمولة تلقائياً ويضاف الصافي إلى رصيدك.
            </Text>
          </View>
        </View>
      )}

      {localError ? (
        <View style={[styles.errorBox, { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: '#FF6B6B' }]}>
          <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
          <Text style={[styles.errorText, { color: '#FF6B6B' }]}>{localError}</Text>
        </View>
      ) : null}

      <Button
        title={formMode === 'edit' ? "حفظ التعديلات" : "إضافة منتج للنظام"}
        onPress={formMode === 'edit' ? () => handleSaveEdit(editingProduct) : handleCreate}
        loading={formMode === 'edit' ? editLoading : formLoading}
        variant="gradient"
        style={styles.submitBtn}
        disabled={categories.length === 0}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader
        title="منتجات المتجر"
        subtitle={`${products.length} منتجات متاحة للمسوقين`}
        actionHint={!showForm ? "إضافة منتج" : null}
      />

      {!showForm && (
        <View style={[styles.infoBanner, { backgroundColor: theme.primary + '10' }]}>
          <Ionicons name="information-circle" size={24} color={theme.primary} />
          <View style={styles.infoBannerText}>
            <Text style={[styles.infoBannerTitle, { color: theme.primary }]}>توضيح تسعير المنتجات</Text>
            <Text style={[styles.infoBannerDesc, { color: theme.colors.textSecondary }]}>
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
                !filterCategory ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, { color: !filterCategory ? '#FFF' : theme.colors.textSecondary }]}>الكل</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setFilterCategory(cat.id === filterCategory ? null : cat.id)}
                style={[
                  styles.filterChip,
                  filterCategory === cat.id ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name={cat.icon || 'grid-outline'} size={14} color={filterCategory === cat.id ? '#FFF' : theme.colors.textSecondary} style={{ marginEnd: 6 }} />
                <Text style={[styles.filterChipText, { color: filterCategory === cat.id ? '#FFF' : theme.colors.textSecondary }]}>{cat.name_ar || cat.name}</Text>
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
            <Button title="انتقل إلى إعدادات المتجر" onPress={() => router.push('/(merchant)/settings')} variant="gradient" style={{ marginTop: spacing.lg, marginHorizontal: spacing.xl }} />
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
            ListHeaderComponent={
              categories.length === 0 ? (
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

function CategoryReminder({ theme, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.reminderCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="information-circle-outline" size={32} color={theme.primary} />
      <View style={styles.reminderContent}>
        <Text style={[styles.reminderTitle, { color: theme.primary }]}>حدد تصنيفات متجرك أولاً</Text>
        <Text style={[styles.reminderText, { color: theme.colors.textSecondary }]}>
          يجب تحديد التصنيفات التي تبيع فيها (مثل ملابس، تجميل) من تبويب "التصنيفات" قبل إضافة المنتجات، لضمان ظهورها للمسوقين.
        </Text>
      </View>
      <Ionicons name="chevron-back" size={20} color={theme.primary} style={{ opacity: 0.7 }} />
    </TouchableOpacity>
  );
}

function CategoryPicker({
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
}) {
  if (!categories || categories.length === 0) return null;
  const subs = value ? getSubcategories(value) : [];
  const selectedCat = categories.find(c => c.id === value);
  const selectedSub = subs.find(s => s.id === subValue);

  return (
    <View style={styles.categoryPickerWrap}>
      <View style={[styles.editRow, !isWide && styles.editRowMobile]}>
        <View style={styles.flex1}>
          <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary }]}>التصنيف الرئيسي *</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.pickerInner}>
              <Ionicons name={selectedCat?.icon || "layers-outline"} size={20} color={selectedCat ? theme.primary : theme.colors.textTertiary} />
              <Text style={[styles.pickerText, { color: value ? theme.colors.text : theme.colors.textTertiary }]}>
                {selectedCat ? (selectedCat.name_ar || selectedCat.name) : 'اختر التصنيف...'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {subs.length > 0 && (
          <View style={styles.flex1}>
            <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary }]}>التصنيف الفرعي</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              onPress={() => setSubPickerVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.pickerInner}>
                <Ionicons name="grid-outline" size={20} color={selectedSub ? theme.primary : theme.colors.textTertiary} />
                <Text style={[styles.pickerText, { color: subValue ? theme.colors.text : theme.colors.textTertiary }]}>
                  {selectedSub ? (selectedSub.name_ar || selectedSub.name) : 'الكل (اختياري)'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Category Selection Sheet */}
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
              style={[styles.sheetItem, { borderBottomColor: theme.colors.divider }]}
              onPress={() => { onChange(cat.id); onSubChange(null); setPickerVisible(false); }}
            >
              <View style={[styles.sheetIcon, { backgroundColor: value === cat.id ? theme.primary + '15' : theme.colors.surface }]}>
                <Ionicons name={cat.icon || 'grid-outline'} size={20} color={value === cat.id ? theme.primary : theme.colors.textSecondary} />
              </View>
              <Text style={[styles.sheetItemText, { color: value === cat.id ? theme.primary : theme.colors.text, fontFamily: value === cat.id ? 'Tajawal_700Bold' : 'Tajawal_500Medium' }]}>
                {cat.name_ar || cat.name}
              </Text>
              {value === cat.id && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.sheetItem, { borderBottomWidth: 0, marginTop: 10 }]}
            onPress={() => { onChange(null); onSubChange(null); setPickerVisible(false); }}
          >
            <View style={[styles.sheetIcon, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="close-outline" size={20} color={theme.colors.textTertiary} />
            </View>
            <Text style={[styles.sheetItemText, { color: theme.colors.textTertiary }]}>إلغاء التحديد (بدون تصنيف)</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      {/* Subcategory Selection Sheet */}
      <BottomSheet
        visible={subPickerVisible}
        onClose={() => setSubPickerVisible(false)}
        title="التصنيف الفرعي"
        subtitle={`خيارات تصنيف: ${selectedCat?.name_ar || selectedCat?.name}`}
      >
        <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.sheetItem, { borderBottomColor: theme.colors.divider }]}
            onPress={() => { onSubChange(null); setSubPickerVisible(false); }}
          >
            <View style={[styles.sheetIcon, { backgroundColor: !subValue ? theme.primary + '15' : theme.colors.surface }]}>
              <Ionicons name="list-outline" size={20} color={!subValue ? theme.primary : theme.colors.textSecondary} />
            </View>
            <Text style={[styles.sheetItemText, { color: !subValue ? theme.primary : theme.colors.text, fontFamily: !subValue ? 'Tajawal_700Bold' : 'Tajawal_500Medium' }]}>
              الكل (جميع التصنيفات الفرعية)
            </Text>
            {!subValue && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
          </TouchableOpacity>
          {subs.map((sub) => (
            <TouchableOpacity
              key={sub.id}
              style={[styles.sheetItem, { borderBottomColor: theme.colors.divider }]}
              onPress={() => { onSubChange(sub.id); setSubPickerVisible(false); }}
            >
              <View style={[styles.sheetIcon, { backgroundColor: subValue === sub.id ? theme.primary + '15' : theme.colors.surface }]}>
                <Ionicons name="pricetag-outline" size={18} color={subValue === sub.id ? theme.primary : theme.colors.textSecondary} />
              </View>
              <Text style={[styles.sheetItemText, { color: subValue === sub.id ? theme.primary : theme.colors.text, fontFamily: subValue === sub.id ? 'Tajawal_700Bold' : 'Tajawal_500Medium' }]}>
                {sub.name_ar || sub.name}
              </Text>
              {subValue === sub.id && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

function ImageGalleryPicker({ imageUris, theme, onRemove, onPick, onPreview }) {
  return (
    <View style={styles.galleryWrap}>
      <View style={styles.galleryHeader}>
        <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
          صور المنتج
        </Text>
        <Text style={[styles.galleryCounter, { color: theme.colors.textTertiary }]}>
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
              <View style={[styles.primaryBadge, { backgroundColor: theme.primary }]}>
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
            style={[styles.addImageBtn, { borderColor: theme.primary + '50', backgroundColor: theme.primary + '08' }]}
            activeOpacity={0.7}
          >
            <View style={[styles.addImageIconWrap, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="add" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.addImageText, { color: theme.primary }]}>إضافة صورة</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

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
  editRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  editRowMobile: { flexDirection: 'column', gap: 0 },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  infoBannerText: { flex: 1 },
  infoBannerTitle: { fontFamily: 'Tajawal_700Bold', fontSize: typography.sm, marginBottom: 2, textAlign: 'right' },
  infoBannerDesc: { fontFamily: 'Tajawal_500Medium', fontSize: typography.xs, lineHeight: 18, textAlign: 'right' },

  // Filter Chips
  filterContainer: { paddingVertical: spacing.sm },
  filterRow: { paddingHorizontal: spacing.md, gap: spacing.sm, flexDirection: 'row' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: { fontFamily: 'Tajawal_500Medium', fontSize: typography.sm },

  // Product Card
  productCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
    ...shadows.sm,
    // Add dynamic width logic if needed, but flex: 1 in numColumns FlatList
    // can stretch single items if not constrained.
  },
  productCardMobile: { width: '48%' },
  productCardDesktop: { width: '19%' },

  imageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  productImage: { width: '100%', height: '100%' },
  productImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  cardTopBadges: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row-reverse',
    gap: 4,
  },
  miniStatusBadge: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#FFF' },

  productInfo: { padding: 10, gap: 4 },
  productName: { ...typography.h5, fontSize: 13, textAlign: 'right', marginBottom: 2, height: 18 },

  inactiveBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  inactiveBadgeText: { color: '#FFF', fontSize: 9, fontFamily: 'Tajawal_700Bold' },

  gridPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  productPrice: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 14 },
  productCommission: { fontFamily: 'Tajawal_700Bold', fontSize: 12 },

  categoryBreadcrumb: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  catTagText: { fontFamily: 'Tajawal_500Medium', fontSize: 11 },

  cardFooter: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    height: 44,
  },
  footerActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerDivider: { width: 1, height: '50%', backgroundColor: '#EEE', alignSelf: 'center' },

  actionBtn: { width: 44, height: 44, borderRadius: borderRadius.round, alignItems: 'center', justifyContent: 'center' },

  // Forms
  formContent: { paddingTop: spacing.xs, paddingBottom: spacing.xxl },
  inputHint: { fontFamily: 'Tajawal_500Medium', fontSize: 12, textAlign: 'right' },
  submitBtn: { marginTop: spacing.xl, marginBottom: spacing.xxl },

  // Category Picker
  categoryPickerWrap: { marginBottom: spacing.lg },
  pickerLabel: { fontFamily: 'Tajawal_700Bold', fontSize: 13, marginBottom: spacing.xs, textAlign: 'right' },
  pickerBtn: {
    height: 54,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pickerInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemText: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right'
  },

  // Reminder Card
  reminderCard: {
    flexDirection: 'row-reverse',
    padding: spacing.md,
    borderRadius: borderRadius.md,
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
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.sm },
  galleryCounter: { fontFamily: 'Tajawal_500Medium', fontSize: 12 },
  galleryRow: { gap: spacing.md, paddingVertical: spacing.xs, flexDirection: 'row' },
  galleryThumbWrapper: { position: 'relative' },
  galleryThumb: { width: 90, height: 90, borderRadius: borderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: '#DEE2E6' },
  galleryImage: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  primaryBadgeText: { color: '#FFF', fontSize: 9, fontFamily: 'Tajawal_700Bold' },
  removeImageBtn: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    backgroundColor: '#FF6B6B',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  addImageBtn: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addImageIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addImageText: { fontFamily: 'Tajawal_700Bold', fontSize: 11 },

  // Money Split Card
  splitCard: {
    borderRadius: borderRadius.lg,
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
    borderBottomColor: '#F1F3F5',
  },
  splitTitle: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 15 },
  splitContent: { padding: spacing.md },
  splitRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  splitLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
    borderTopColor: '#F1F3F5',
  },
  splitHint: { fontFamily: 'Tajawal_500Medium', fontSize: 11, flex: 1, textAlign: 'right', lineHeight: 18 },

  // Background Upload Overlay
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressContainer: { marginTop: 4, alignItems: 'center' },
  uploadText: { color: '#FFF', fontSize: 12, fontFamily: 'Tajawal_800ExtraBold' },
  progressBarBase: { position: 'absolute', bottom: 0, left: 0, height: 4, backgroundColor: '#FFF' },

  // Error Box
  errorBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  errorText: { fontFamily: 'Tajawal_700Bold', fontSize: 13, flex: 1, textAlign: 'right' },

  // Empty State / Fallbacks
  noStoreContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Image Preview Modal
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  previewBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  previewContent: { width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  fullImage: { width: '100%', height: '100%' },
  closePreviewBtn: { position: 'absolute', top: 40, right: 20 },
  closePreviewInner: { backgroundColor: 'rgba(255,255,255,0.2)', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});