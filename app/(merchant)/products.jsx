import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/hooks/useTheme';
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
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency } from '../../src/lib/utils';
import { LISTING_STATUS_AR } from '../../src/lib/constants';

export default function ProductsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currentStore = useStoreStore((s) => s.currentStore);
  const { products, isLoading, fetchAllStoreProducts, createProduct, updateProduct, deleteProduct, uploadProductImage, addProductImage } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
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
  const [formLoading, setFormLoading] = useState(false);
  const [imageUris, setImageUris] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);

  // Register the FAB for this screen
  const openAddForm = React.useCallback(() => {
    setFormMode('add');
    setEditingProduct(null);
    setShowForm(true);
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
  const [editCategory, setEditCategory] = useState(null);
  const [editSubcategory, setEditSubcategory] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    if (currentStore) {
      await fetchAllStoreProducts(currentStore.id);
      await fetchCategories(currentStore.id);
    }
  }, [currentStore]);

  useEffect(() => { loadProducts(); }, [currentStore]);

  // Register the FAB for this screen
  useFAB({
    icon: 'add',
    label: 'إضافة منتج',
    onPress: openAddForm,
    visible: !showForm && !!currentStore,
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
    setFormLoading(true);

    // 1. Upload all images to Cloudinary
    const uploadedUrls = [];
    if (imageUris.length > 0 && currentStore) {
      for (const uri of imageUris) {
        const uploadResult = await uploadProductImage(uri, currentStore.id);
        if (uploadResult.success) {
          uploadedUrls.push(uploadResult.url);
        }
      }
    }

    const productData = {
      store_id: currentStore.id,
      name: name.trim(),
      price: parseFloat(price),
      description: description.trim(),
      image_url: uploadedUrls.length > 0 ? uploadedUrls[0] : null,
      gallery_urls: uploadedUrls, // The New Array Column
    };

    if (stock.trim()) productData.stock = parseInt(stock);
    if (weight.trim()) productData.weight = parseFloat(weight);
    if (dimensions.trim()) productData.dimensions = dimensions.trim();
    if (sku.trim()) productData.sku = sku.trim();
    if (selectedCategory) productData.category_id = selectedCategory;
    if (selectedSubcategory) productData.subcategory_id = selectedSubcategory;
    productData.listing_status = 'published';

    const result = await createProduct(productData);
    if (result.success) {
      // Legacy support: also add to product_images table if it exists
      // This ensures older code still works while we transition
      if (uploadedUrls.length > 0 && result.data) {
        for (let i = 0; i < uploadedUrls.length; i++) {
          await addProductImage(result.data.id, currentStore.id, uploadedUrls[i], i);
        }
      }

      setName(''); setPrice(''); setDescription(''); setStock(''); setWeight(''); setDimensions(''); setSku('');
      setImageUris([]); setSelectedCategory(null); setSelectedSubcategory(null); setShowForm(false);
      showAlert({ title: 'نجاح', message: 'تم إضافة المنتج بنجاح وسيظهر للمسوقين فوراً.', type: 'success' });
      await fetchAllStoreProducts(currentStore.id);
    } else { showAlert({ title: 'خطأ', message: result.error, type: 'error' }); }
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
    setShowForm(true);
  };

  const cancelEditing = () => { setEditingProduct(null); };

  const handleSaveEdit = async (productId) => {
    if (!editName.trim() || !editPrice.trim()) { showAlert({ title: 'خطأ', message: 'الاسم والسعر مطلوبان', type: 'error' }); return; }
    setEditLoading(true);

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
    };
    if (editStock.trim()) updates.stock = parseInt(editStock);
    if (prev?.listing_status === 'rejected') {
      updates.listing_status = 'published';
      updates.rejection_note = null;
    }

    const result = await updateProduct(productId, updates);
    if (result.success) {
      setEditingProduct(null);
      showAlert({ title: 'نجاح', message: 'تم تحديث المنتج بنجاح!', type: 'success' });
    } else {
      showAlert({ title: 'خطأ', message: result.error, type: 'error' });
    }
    setEditLoading(false);
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

  // ──── Category Picker Component ────

  const CategoryPicker = ({ value, onChange, subValue, onSubChange }) => {
    if (categories.length === 0) return null;
    const subs = value ? getSubcategories(value) : [];

    return (
      <View style={styles.categoryPickerWrap}>
        <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary }]}>التصنيف</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <TouchableOpacity
            onPress={() => { onChange(null); onSubChange(null); }}
            style={[
              styles.chip,
              {
                backgroundColor: !value ? theme.primary : theme.isDark ? theme.colors.surface2 : theme.colors.surface3,
                borderColor: !value ? theme.primary : 'transparent',
              },
            ]}
          >
            <Text style={[styles.chipText, { color: !value ? '#FFF' : theme.colors.textSecondary }]}>بدون تصنيف</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => { onChange(cat.id); onSubChange(null); }}
              style={[
                styles.chip,
                {
                  backgroundColor: value === cat.id ? theme.primary : 'transparent',
                  borderColor: value === cat.id ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                },
              ]}
            >
              <Ionicons name={cat.icon || 'grid-outline'} size={14} color={value === cat.id ? '#FFF' : theme.colors.textSecondary} style={{ marginEnd: 4 }} />
              <Text style={[styles.chipText, { color: value === cat.id ? '#FFF' : theme.colors.textSecondary }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {subs.length > 0 && (
          <>
            <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary, marginTop: spacing.sm }]}>التصنيف الفرعي</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity
                onPress={() => onSubChange(null)}
                style={[
                  styles.chipSmall,
                  {
                    backgroundColor: !subValue ? theme.primary : 'transparent',
                    borderColor: !subValue ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                  },
                ]}
              >
                <Text style={[styles.chipTextSmall, { color: !subValue ? theme.primary : theme.colors.textSecondary }]}>الكل</Text>
              </TouchableOpacity>
              {subs.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  onPress={() => onSubChange(sub.id)}
                  style={[
                    styles.chipSmall,
                    {
                      backgroundColor: subValue === sub.id ? theme.primary : 'transparent',
                      borderColor: subValue === sub.id ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                    },
                  ]}
                >
                  <Text style={[styles.chipTextSmall, { color: subValue === sub.id ? theme.primary : theme.colors.textSecondary }]}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    );
  };

  // ──── Multi-Image Gallery ────

  const ImageGalleryPicker = () => (
    <View style={styles.galleryWrap}>
      <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary }]}>
        صور المنتج ({imageUris.length}/8)
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
        {imageUris.map((uri, index) => (
          <View key={index} style={styles.galleryThumb}>
            <Image 
              source={{ uri }} 
              style={styles.galleryImage} 
              contentFit="cover"
              transition={200}
            />
            {index === 0 && (
              <View style={[styles.primaryBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="star" size={10} color="#FFF" />
              </View>
            )}
            <TouchableOpacity
              onPress={() => removeImageFromPicker(index)}
              style={styles.removeImageBtn}
            >
              <Ionicons name="close-circle" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ))}
        {imageUris.length < 8 && (
          <TouchableOpacity
            onPress={pickImages}
            style={[styles.addImageBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.shimmer }]}
          >
            <Ionicons name="camera-outline" size={24} color={theme.colors.textTertiary} />
            <Text style={[styles.addImageText, { color: theme.colors.textTertiary }]}>إضافة</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  // ──── Render Product Card ────

  const renderProduct = ({ item }) => {
    const imageCount = (item.product_images || []).length;

    return (
      <Card style={styles.productCard}>
        <View style={styles.productRow}>
          {item.image_url ? (
            <View>
              <Image 
                source={{ uri: item.image_url }} 
                style={styles.productImage} 
                contentFit="cover"
                transition={200}
              />
              {imageCount > 1 && (
                <View style={[styles.imageCountBadge, { backgroundColor: theme.primary }]}>
                  <Ionicons name="images-outline" size={10} color="#FFF" />
                  <Text style={styles.imageCountText}>{imageCount}</Text>
                </View>
              )}
            </View>
          ) : (
            <LinearGradient
              colors={[theme.primary + '18', theme.primary + '08']}
              style={styles.productImagePlaceholder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="cube-outline" size={24} color={theme.primary} />
            </LinearGradient>
          )}
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: theme.colors.text }]}>{item.name}</Text>
            <Text style={[styles.productPrice, { color: theme.primary }]}>{formatCurrency(item.price)}</Text>
            <View style={styles.badgeRow}>
              {item.listing_status && (
                <Badge
                  label={LISTING_STATUS_AR[item.listing_status] || item.listing_status}
                  variant={
                    item.listing_status === 'published' ? 'success'
                      : item.listing_status === 'pending_review' ? 'warning'
                        : item.listing_status === 'rejected' ? 'error' : 'neutral'
                  }
                />
              )}
              {item.stock != null && (
                <Badge label={item.stock === 0 ? 'نفد المخزون' : item.stock <= 5 ? `⚠️ ${item.stock} متبقي` : `مخزون: ${item.stock}`} variant={item.stock === 0 ? 'error' : item.stock <= 5 ? 'warning' : 'success'} />
              )}
              {item.sku && <Badge label={item.sku} variant="neutral" />}
              {item.weight != null && <Badge label={`${item.weight}g`} variant="info" />}
            </View>
            {item.listing_status === 'rejected' && item.rejection_note ? (
              <Text style={{ color: '#d63031', ...typography.caption, marginTop: 6 }}>
                سبب الرفض: {item.rejection_note}
              </Text>
            ) : null}
            {item.category && (
              <View style={[styles.catTag, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name={item.category.icon || 'grid-outline'} size={12} color={theme.primary} style={{ marginEnd: 4 }} />
                <Text style={[styles.catTagText, { color: theme.primary }]}>{item.category.name}</Text>
                {item.subcategory && (
                  <Text style={[styles.catTagText, { color: theme.primary, opacity: 0.7 }]}> / {item.subcategory.name}</Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.actionBtns}>
            <TouchableOpacity onPress={() => updateProduct(item.id, { is_active: !item.is_active })} style={styles.editBtn} activeOpacity={0.7}>
              <View style={[styles.editBtnInner, { backgroundColor: item.is_active ? theme.primary + '12' : '#d6303112' }]}>
                <Ionicons name={item.is_active ? "power" : "power-outline"} size={18} color={item.is_active ? theme.primary : '#d63031'} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => startEditing(item)} style={styles.editBtn} activeOpacity={0.7}>
              <View style={[styles.editBtnInner, { backgroundColor: theme.primary + '12' }]}>
                <Ionicons name="create-outline" size={18} color={theme.primary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn} activeOpacity={0.7}>
              <View style={styles.deleteBtnInner}>
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  const renderProductForm = () => (
    <View style={styles.formContent}>
      <Input 
        label="اسم المنتج" 
        value={formMode === 'edit' ? editName : name} 
        onChangeText={formMode === 'edit' ? setEditName : setName} 
        placeholder="مثال: قميص فاخر" 
        icon="cube-outline" 
      />
      <Input 
        label="السعر الأساسي (DZD)" 
        value={formMode === 'edit' ? editPrice : price} 
        onChangeText={formMode === 'edit' ? setEditPrice : setPrice} 
        placeholder="2500" 
        keyboardType="decimal-pad" 
        icon="cash-outline" 
      />
      <Input 
        label="الوصف" 
        value={formMode === 'edit' ? editDescription : description} 
        onChangeText={formMode === 'edit' ? setEditDescription : setDescription} 
        placeholder="وصف المنتج..." 
        multiline 
        numberOfLines={3} 
      />
      
      <View style={styles.editRow}>
        <View style={{ flex: 1, marginEnd: spacing.sm }}>
          <Input 
            label="المخزون" 
            value={formMode === 'edit' ? editStock : stock} 
            onChangeText={formMode === 'edit' ? setEditStock : setStock} 
            placeholder="اختياري" 
            keyboardType="number-pad" 
            icon="layers-outline" 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input 
            label="الوزن (غرام)" 
            value={formMode === 'edit' ? editWeight : weight} 
            onChangeText={formMode === 'edit' ? setEditWeight : setWeight} 
            placeholder="500" 
            keyboardType="decimal-pad" 
            icon="scale-outline" 
          />
        </View>
      </View>

      <View style={styles.editRow}>
        <View style={{ flex: 1, marginEnd: spacing.sm }}>
          <Input 
            label="الأبعاد (سم)" 
            value={formMode === 'edit' ? editDimensions : dimensions} 
            onChangeText={formMode === 'edit' ? setEditDimensions : setDimensions} 
            placeholder="30×20×10" 
            icon="resize-outline" 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input 
            label="رمز المنتج (SKU)" 
            value={formMode === 'edit' ? editSku : sku} 
            onChangeText={formMode === 'edit' ? setEditSku : setSku} 
            placeholder="اختياري" 
            icon="barcode-outline" 
          />
        </View>
      </View>

      <CategoryPicker 
        value={formMode === 'edit' ? editCategory : selectedCategory} 
        onChange={formMode === 'edit' ? setEditCategory : setSelectedCategory} 
        subValue={formMode === 'edit' ? editSubcategory : selectedSubcategory} 
        onSubChange={formMode === 'edit' ? setEditSubcategory : setSelectedSubcategory} 
      />
      
      {formMode === 'add' ? (
        <ImageGalleryPicker />
      ) : (
        <View style={{ marginBottom: spacing.md, marginTop: spacing.xs }}>
           <Button
            title="تحديث الصورة الرئيسية"
            variant="secondary"
            onPress={() => handleEditImage(editingProduct)}
            style={{ width: '100%' }}
            icon={<Ionicons name="camera-outline" size={18} color={theme.primary} />}
          />
        </View>
      )}

      <Button 
        title={formMode === 'edit' ? "حفظ التعديلات" : "إضافة منتج"} 
        onPress={formMode === 'edit' ? () => handleSaveEdit(editingProduct) : handleCreate} 
        loading={formMode === 'edit' ? editLoading : formLoading} 
        variant="gradient" 
        style={{ marginTop: spacing.md }}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="منتجات المتجر" 
        subtitle={`${products.length} منتج متاح حالياً`}
        actionHint={!showForm ? "أضف منتج جديد من الزر بالأسفل" : null}
      />
      
      {!showForm && (
        <View style={{ backgroundColor: theme.primary + '10', marginHorizontal: spacing.md, padding: 12, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs }}>
          <Ionicons name="information-circle" size={20} color={theme.primary} style={{ marginTop: 2, marginEnd: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.primary, fontFamily: 'Tajawal_700Bold', fontSize: 13, marginBottom: 2 }}>توضيح التسعير</Text>
            <Text style={{ color: theme.colors.textSecondary, fontFamily: 'Tajawal_500Medium', fontSize: 11, lineHeight: 16 }}>
              السعر الذي تضعه هنا هو "سعر الجملة" الخاص بك (الأرباح الصافية التي تصلك). المسوقون سيقومون بإضافة هامش ربحهم الخاص فوق هذا السعر لتحديد سعر البيع النهائي للعميل.
            </Text>
          </View>
        </View>
      )}

      {/* Category Filter Chips */}
      {categories.length > 0 && !showForm && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilterCategory(null)}
            style={[
              styles.filterChip,
              {
                backgroundColor: !filterCategory ? theme.primary : 'transparent',
                borderColor: !filterCategory ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
              },
            ]}
          >
            <Text style={[styles.filterChipText, { color: !filterCategory ? '#FFF' : theme.colors.textSecondary }]}>الكل</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setFilterCategory(cat.id === filterCategory ? null : cat.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filterCategory === cat.id ? theme.primary : 'transparent',
                  borderColor: filterCategory === cat.id ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                },
              ]}
            >
              <Ionicons name={cat.icon || 'grid-outline'} size={14} color={filterCategory === cat.id ? '#FFF' : theme.colors.textSecondary} style={{ marginEnd: 4 }} />
              <Text style={[styles.filterChipText, { color: filterCategory === cat.id ? '#FFF' : theme.colors.textSecondary }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {Platform.OS === 'web' ? (
        <Modal
          visible={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          title={formMode === 'edit' ? "تعديل المنتج" : "إضافة منتج جديد"}
          subtitle={formMode === 'edit' ? "عدل تفاصيل منتجك الموجود" : "املأ تفاصيل المنتج ليتم مراجعته ونشره"}
          maxWidth={800}
        >
          <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: '80vh' }}>
            {renderProductForm()}
          </ScrollView>
        </Modal>
      ) : (
        <BottomSheet
          visible={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          title={formMode === 'edit' ? "تعديل المنتج" : "إضافة منتج جديد"}
          subtitle={formMode === 'edit' ? "عدل تفاصيل منتجك الموجود" : "املأ تفاصيل المنتج ليتم مراجعته ونشره"}
        >
          {renderProductForm()}
        </BottomSheet>
      )}

      {!showForm && (
        !currentStore ? (
          <View style={styles.noStoreContainer}>
            <EmptyState icon="storefront-outline" title="لم يتم العثور على متجر" message="يجب عليك إعداد متجرك أولاً قبل إضافة المنتجات." />
            <Button title="انتقل إلى الإعدادات" onPress={() => router.push('/(merchant)/settings')} variant="gradient" style={{ marginTop: spacing.md, marginHorizontal: spacing.xl }} />
          </View>
        ) : isLoading && products.length === 0 ? (
          <LoadingSpinner message="جارٍ تحميل المنتجات..." />
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <EmptyState icon="cube-outline" title="لا توجد منتجات" message={filterCategory ? 'لا توجد منتجات في هذا التصنيف.' : 'أضف منتجك الأول للبدء.'} />
            }
          />
        )
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  formContent: { paddingVertical: spacing.sm },
  formTitle: { ...typography.h3, marginBottom: spacing.md },
  editRow: { flexDirection: 'row' },
  list: { padding: spacing.md, paddingTop: spacing.xs, paddingBottom: 120 },

  // Category Picker
  categoryPickerWrap: { marginBottom: spacing.md },
  pickerLabel: { ...typography.small, marginBottom: spacing.xs },
  chipRow: { gap: 6, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: { ...typography.small, fontFamily: 'Tajawal_500Medium' },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipTextSmall: { ...typography.small, fontSize: 11 },

  // Image Gallery Picker
  galleryWrap: { marginBottom: spacing.md },
  galleryRow: { gap: 8, paddingVertical: 4 },
  galleryThumb: { width: 72, height: 72, borderRadius: borderRadius.md, overflow: 'hidden', position: 'relative' },
  galleryImage: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  addImageBtn: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addImageText: { ...typography.small, fontSize: 10 },

  // Filter chips (top of list)
  filterRow: { gap: 6, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: { ...typography.small, fontFamily: 'Tajawal_500Medium' },

  // Product Card
  productCard: { marginBottom: spacing.sm },
  editCard: { marginBottom: spacing.sm },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  editActions: { flexDirection: 'row', marginTop: spacing.sm },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 64, height: 64, borderRadius: borderRadius.md, marginEnd: spacing.md },
  productImagePlaceholder: { width: 64, height: 64, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginEnd: spacing.md },
  productInfo: { flex: 1, gap: 4 },
  productName: { ...typography.bodyBold },
  productPrice: { ...typography.bodyBold, fontFamily: 'Tajawal_800ExtraBold' },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  catTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  catTagText: { ...typography.small, fontSize: 11 },
  imageCountBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 2,
  },
  imageCountText: { color: '#FFF', fontSize: 9, fontFamily: 'Tajawal_700Bold' },
  actionBtns: { gap: spacing.xs },
  editBtn: { padding: spacing.xs },
  editBtnInner: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { padding: spacing.xs },
  deleteBtnInner: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 107, 107, 0.1)', alignItems: 'center', justifyContent: 'center' },
  noStoreContainer: { flex: 1, justifyContent: 'center' },
});
