import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Share,
  Platform,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Modal,
  I18nManager,
  ActivityIndicator,
  Easing,
  Animated as RNAnimated
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing as ReanimatedEasing,
  interpolate,
  useDerivedValue
} from 'react-native-reanimated';

import { useCampaignStore } from '../../src/stores/useCampaignStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useProductStore } from '../../src/stores/useProductStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';
import { useCategoryStore } from '../../src/stores/useCategoryStore';

import UniversalHeader from '../../src/components/ui/UniversalHeader';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import BottomSheet from '../../src/components/ui/BottomSheet';
import Button from '../../src/components/ui/Button';
import ImageGallery from '../../src/components/common/ImageGallery';

import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency, generateReferralLink, generateCampaignLink } from '../../src/lib/utils';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400.png?text=لا+توجد+صورة';

// ──── Sort options ────
const SORT_OPTIONS = [
  { key: 'newest', label: 'الأحدث', icon: 'time-outline' },
  { key: 'cheapest', label: 'الأرخص', icon: 'arrow-down-outline' },
  { key: 'expensive', label: 'الأغلى', icon: 'arrow-up-outline' },
  { key: 'name', label: 'الاسم', icon: 'text-outline' },
];

// ──── Price range presets ────
const PRICE_PRESETS = [
  { label: 'أقل من 1000', min: 0, max: 999 },
  { label: '1000 - 3000', min: 1000, max: 3000 },
  { label: '3000 - 5000', min: 3000, max: 5000 },
  { label: '5000+', min: 5000, max: null },
];

// ──── MODERN SHIMMER COMPONENT ────
const ModernShimmer = ({ visible = true }) => {
  const shimmerValue = useSharedValue(-1);

  useEffect(() => {
    if (visible) {
      shimmerValue.value = withRepeat(
        withTiming(2, {
          duration: 1500,
          easing: ReanimatedEasing.bezier(0.4, 0, 0.2, 1),
        }),
        -1,
        false
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: interpolate(
        shimmerValue.value,
        [-1, 2],
        [-150, 300]
      )
    }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1, width: '60%' }}
      />
    </Animated.View>
  );
};

// ──── Smart Marquee Text for Product Cards ────
const CardMarqueeText = React.memo(({ text, style }) => {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [textWidth, setTextWidth] = React.useState(0);
  const translateX = React.useRef(new RNAnimated.Value(0)).current;
  const animRef = React.useRef(null);

  const GAP = 40;

  React.useEffect(() => {
    if (textWidth > containerWidth && containerWidth > 0) {
      const distance = textWidth + GAP;
      const duration = (distance / 30) * 1000;

      const startAnimation = () => {
        translateX.setValue(0);
        animRef.current = RNAnimated.timing(translateX, {
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
      style={{ width: '100%', overflow: 'hidden', flexDirection: 'row-reverse', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 10, height: 28, position: 'relative' }}
      onLayout={handleContainerLayout}
    >
      <RNAnimated.View style={{
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
      </RNAnimated.View>
    </View>
  );
});

export default function StoreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  // Responsive Grid & Layout Logic
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;
  const isWebModal = Platform.OS === 'web' && width > 768;
  const isSmallScreen = height < 700;

  const numColumns = isDesktop ? 4 : isTablet ? 3 : 2;
  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 900 : '100%';

  const profile = useAuthStore((s) => s.profile);
  const { products, isLoading, fetchProducts } = useProductStore();
  const affiliateProfile = useAffiliateStore((s) => s.affiliateProfile);
  const fetchAffiliateProfile = useAffiliateStore((s) => s.fetchAffiliateProfile);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const fetchActiveCampaignsByProducts = useCampaignStore((s) => s.fetchActiveCampaignsByProducts);
  const { categories, fetchCategories } = useCategoryStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);

  // ──── Advanced Filter State ────
  const [filterSubcategory, setFilterSubcategory] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const filterPanelProgress = useSharedValue(0);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef(null);

  useEffect(() => {
    filterPanelProgress.value = withTiming(showFilters ? 1 : 0, { duration: 250 });
  }, [showFilters]);

  const filterAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(filterPanelProgress.value, [0, 1], [0, 220]),
    opacity: filterPanelProgress.value,
    overflow: 'hidden'
  }));

  // Sheet & Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Interactive UI States
  const [isCopied, setIsCopied] = useState(false);
  const [copiedField, setCopiedField] = useState(null); // 'title' | 'desc'
  const [isDownloading, setIsDownloading] = useState(false);

  // Gallery Logic
  const galleryImages = useMemo(() => {
    if (!selectedProduct) return [];
    const imgs = [
      selectedProduct.image_url,
      ...(selectedProduct.gallery_urls || []),
      ...(selectedProduct.product_images?.map(img => img.image_url) || [])
    ].filter(Boolean);
    return [...new Set(imgs)];
  }, [selectedProduct]);

  // Animation Value for Web Fade
  const fadeProgress = useSharedValue(0);

  useEffect(() => {
    if (isWebModal) {
      fadeProgress.value = withTiming(sheetVisible ? 1 : 0, { duration: 250 });
    }
  }, [sheetVisible, isWebModal]);

  const webModalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeProgress.value,
  }));

  const loadData = useCallback(async () => {
    const targetStoreId = profile?.store_id;
    try {
      if (targetStoreId) {
        await fetchProducts(targetStoreId);
        await fetchCategories();
        await fetchAffiliateProfile(targetStoreId);
      } else {
        await fetchAffiliateProfile();
        await fetchProducts();
        await fetchCategories();
      }
    } catch (e) {
      if (__DEV__) console.warn('[Store] loadData error:', e);
    }
  }, [profile?.store_id, fetchAffiliateProfile, fetchProducts, fetchCategories]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (affiliateProfile?.id && products.length > 0) {
      fetchActiveCampaignsByProducts(
        affiliateProfile.id,
        products.map((p) => p.id)
      );
    }
  }, [affiliateProfile?.id, products, fetchActiveCampaignsByProducts]);

  // Web Browser Back Button Handler
  useEffect(() => {
    if (Platform.OS !== 'web' || !sheetVisible || typeof window === 'undefined') return;

    window.history.pushState({ customModalOpen: true }, '');

    const onPopState = () => {
      closeModal();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (window.history.state?.customModalOpen) {
        window.history.back();
      }
    };
  }, [sheetVisible]);

  // ──── Debounced Search Effect ────
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  const campaignByProductId = useMemo(() => {
    const m = {};
    (campaigns || []).forEach((c) => {
      if (c.product_id && !m[c.product_id]) m[c.product_id] = c;
    });
    return m;
  }, [campaigns]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCategorySelect = useCallback((catId) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => { });
    }
    setFilterCategory(catId);
    setFilterSubcategory(null);
  }, []);

  const handleSubcategorySelect = useCallback((subId) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => { });
    }
    setFilterSubcategory(subId);
  }, []);

  const activeSubcategories = useMemo(() => {
    if (!filterCategory) return [];
    const cat = categories.find((c) => c.id === filterCategory);
    return cat?.subcategories || [];
  }, [filterCategory, categories]);

  const productCountByCategory = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const visibleCategories = useMemo(() => {
    return categories.filter((cat) => productCountByCategory[cat.id] > 0);
  }, [categories, productCountByCategory]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterCategory) count++;
    if (filterSubcategory) count++;
    if (priceMin) count++;
    if (priceMax) count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [filterCategory, filterSubcategory, priceMin, priceMax, sortBy]);

  const clearAllFilters = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    setFilterCategory(null);
    setFilterSubcategory(null);
    setSortBy('newest');
    setPriceMin('');
    setPriceMax('');
    setSearchQuery('');
  }, []);

  const handlePricePreset = useCallback((preset) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => { });
    }
    if (priceMin === String(preset.min) && (preset.max === null ? priceMax === '' : priceMax === String(preset.max))) {
      setPriceMin('');
      setPriceMax('');
    } else {
      setPriceMin(String(preset.min));
      setPriceMax(preset.max !== null ? String(preset.max) : '');
    }
  }, [priceMin, priceMax]);

  const resolveShareLink = (product) => {
    const camp = campaignByProductId[product.id];
    if (camp?.slug) {
      return { link: generateCampaignLink(camp.slug), priceLabel: camp.sale_price };
    }
    return {
      link: generateReferralLink(affiliateProfile?.referral_code || 'GUEST', product.id),
      priceLabel: product.price,
    };
  };

  const handleShare = async (product) => {
    const { link, priceLabel } = resolveShareLink(product);
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
      }
      await Share.share({
        message: `اكتشف ${product.name}!\nالسعر: ${formatCurrency(priceLabel)}\nللطلب عبر الرابط: ${link}`,
        url: link,
      });
    } catch (err) {
      console.warn("Share failed:", err);
    }
  };

  // ──── New Click-to-Copy Function ────
  const handleCopyText = async (text, field) => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(field);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.warn("Text copy failed:", error);
    }
  };

  // ──── New Download Images Function ────
  const handleDownloadAllImages = async (images) => {
    if (!images || images.length === 0) return;
    setIsDownloading(true);
    try {
      if (Platform.OS === 'web') {
        // Sequentially download images to PC
        for (let i = 0; i < images.length; i++) {
          const response = await fetch(images[i]);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `product-image-${i + 1}.jpg`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } else {
        // Native OS: Save first image to cache and share it (Fallback since no MediaLibrary permissions are guaranteed)
        const fileUri = `${FileSystem.documentDirectory}product_image_${Date.now()}.jpg`;
        const { uri } = await FileSystem.downloadAsync(images[0], fileUri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { dialogTitle: 'حفظ الصورة' });
        }
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
    } catch (e) {
      console.warn('Download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async (product) => {
    try {
      const { link, priceLabel } = resolveShareLink(product);
      const promoText = `🔥 متوفر الآن: ${product.name}\n\n💰 السعر: ${formatCurrency(priceLabel)}\n\n✨ التوصيل متوفر والدفع عند الاستلام!\n🛒 للطلب عبر الرابط:\n${link}`;
      await Clipboard.setStringAsync(promoText);
      setIsCopied(true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.warn("Copy to clipboard failed:", error);
    }
  };

  const handleOrderForClient = (product) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    }
    closeModal();
    setTimeout(() => {
      const camp = campaignByProductId[product.id];
      const base = `productId=${product.id}&productName=${encodeURIComponent(product.name)}&productPrice=${product.price}&merchantCommission=${product.commission_amount || 0}&storeId=${product.store_id}`;
      const q = camp?.id ? `${base}&campaignId=${camp.id}&salePrice=${camp.sale_price}` : base;
      router.push(`/submit-order?${q}`);
    }, 150);
  };

  const openProductDetails = (product) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => { });
    }
    setSelectedProduct(product);
    setIsCopied(false);
    setCopiedField(null);
    setSheetVisible(true);
  };

  const closeModal = () => {
    if (isWebModal) {
      fadeProgress.value = withTiming(0, { duration: 200 });
      setTimeout(() => {
        setSheetVisible(false);
        setSelectedProduct(null);
      }, 200);
    } else {
      setSheetVisible(false);
      setTimeout(() => setSelectedProduct(null), 300);
    }
  };

  const displayProducts = useMemo(() => {
    let result = products;
    if (filterCategory) result = result.filter((p) => p.category_id === filterCategory);
    if (filterSubcategory) result = result.filter((p) => p.subcategory_id === filterSubcategory);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q))
      );
    }
    const minVal = priceMin ? parseFloat(priceMin) : null;
    const maxVal = priceMax ? parseFloat(priceMax) : null;
    if (minVal !== null) result = result.filter((p) => p.price >= minVal);
    if (maxVal !== null) result = result.filter((p) => p.price <= maxVal);

    const sorted = [...result];
    switch (sortBy) {
      case 'cheapest': sorted.sort((a, b) => a.price - b.price); break;
      case 'expensive': sorted.sort((a, b) => b.price - a.price); break;
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar')); break;
      case 'newest': default: break;
    }
    return sorted;
  }, [products, filterCategory, filterSubcategory, debouncedSearch, priceMin, priceMax, sortBy]);


  // --- RENDER WEB OVERLAY (FADE ONLY, NO SLIDE) ---
  const renderWebOverlay = () => {
    if (!selectedProduct || !isWebModal) return null;

    return (
      <Modal transparent visible={sheetVisible} animationType="none" onRequestClose={closeModal}>
        <Animated.View style={[styles.webModalOverlay, webModalAnimatedStyle]}>
          <View style={[styles.webModalContainer, { width: isDesktop ? 950 : 750, backgroundColor: theme.colors.surface }]}>

            <TouchableOpacity
              onPress={closeModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.webModalCloseBtn, { backgroundColor: theme.colors.surface2 }]}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.webModalContentArea}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>

                {/* ──── Clickable Title Row ──── */}
                <TouchableOpacity
                  style={[styles.sheetTitleRow, { alignItems: 'center' }]}
                  onPress={() => handleCopyText(selectedProduct.name, 'title')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
                    {selectedProduct.name}
                  </Text>
                  <Ionicons name={copiedField === 'title' ? "checkmark" : "copy-outline"} size={18} color={copiedField === 'title' ? "#10B981" : theme.colors.textTertiary} style={{ marginStart: 8 }} />
                  {!!campaignByProductId[selectedProduct.id] && (
                    <View style={[styles.sheetCampaignBadge, { borderRadius: borderRadius.full }]}>
                      <Ionicons name="flash" size={12} color="#FFF" />
                      <Text style={styles.sheetCampaignText}>عرض نشط</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={[styles.sheetPriceCard, { backgroundColor: theme.colors.surface2, borderRadius: borderRadius.lg }]}>
                  <View style={styles.sheetPriceRow}>
                    <Text style={[styles.sheetPriceValue, { color: theme.colors.text, fontSize: 24 }]}>
                      {formatCurrency(selectedProduct.price)}
                    </Text>
                  </View>

                  <View style={[styles.commissionHighlightCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
                    <View style={styles.commissionHeader}>
                      <Ionicons name="wallet" size={16} color="#10B981" />
                      <Text style={[styles.commissionTitle, { color: '#10B981' }]}>صافي ربحك</Text>
                    </View>
                    <Text style={[styles.commissionLargeValue, { color: '#10B981' }]}>
                      {formatCurrency(Math.max(0, (selectedProduct.commission_amount || 0) - 200))}
                    </Text>
                    <Text style={{ color: '#6B7280', fontSize: 11, fontFamily: 'Tajawal_500Medium', marginTop: 4 }}>(بعد خصم رسوم المنصة 200 د.ج)</Text>
                  </View>
                </View>

                {/* ──── Clickable Description Section ──── */}
                {!!selectedProduct.description && (
                  <View style={styles.descSection}>
                    <View style={styles.descSectionHeader}>
                      <Text style={[styles.descTitle, { color: theme.colors.text, marginBottom: 0 }]}>وصف المنتج:</Text>
                      <TouchableOpacity onPress={() => handleCopyText(selectedProduct.description, 'desc')} style={styles.copySmallBtn}>
                        <Ionicons name={copiedField === 'desc' ? "checkmark" : "copy-outline"} size={14} color={copiedField === 'desc' ? "#10B981" : theme.colors.textTertiary} />
                        <Text style={[styles.copySmallText, { color: copiedField === 'desc' ? "#10B981" : theme.colors.textTertiary }]}>{copiedField === 'desc' ? 'تم النسخ' : 'نسخ الوصف'}</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => handleCopyText(selectedProduct.description, 'desc')}>
                      <Text style={[styles.descText, { color: theme.colors.textSecondary }]}>
                        {selectedProduct.description}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={[styles.webModalFooter, { borderTopColor: theme.colors.border }]}>

                {/* Download Images Button */}
                <TouchableOpacity
                  onPress={() => handleDownloadAllImages(galleryImages)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  style={[styles.sheetIconBtn, { backgroundColor: isDownloading ? '#F59E0B' : theme.colors.surface2, borderRadius: borderRadius.lg }]}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="download-outline" size={22} color={theme.colors.text} />
                  )}
                </TouchableOpacity>

                {/* Copy Link Button */}
                <TouchableOpacity
                  onPress={() => handleCopy(selectedProduct)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  style={[styles.sheetIconBtn, { backgroundColor: isCopied ? '#10B981' : theme.colors.surface2, borderRadius: borderRadius.lg }]}
                >
                  <Ionicons name={isCopied ? "checkmark-outline" : "copy-outline"} size={22} color={isCopied ? '#FFF' : theme.colors.text} />
                </TouchableOpacity>

                {/* Share Button */}
                <TouchableOpacity
                  onPress={() => handleShare(selectedProduct)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  style={[styles.sheetIconBtn, { backgroundColor: theme.colors.surface2, borderRadius: borderRadius.lg }]}
                >
                  <Ionicons name="share-social-outline" size={22} color={theme.colors.text} />
                </TouchableOpacity>

                <Button
                  title="طلب للعميل الآن"
                  icon="cart"
                  onPress={() => handleOrderForClient(selectedProduct)}
                  style={[styles.sheetOrderBtn, { borderRadius: borderRadius.lg }]}
                />
              </View>
            </View>

            <View style={styles.webModalImageArea}>
              <ImageGallery
                images={galleryImages}
                height="100%"
                borderRadius={0}
              />
            </View>

          </View>
        </Animated.View>
      </Modal>
    );
  };

  // --- RENDER MOBILE BOTTOM SHEET (SLIDE IN) ---
  const renderMobileSheet = () => {
    if (!selectedProduct || isWebModal) return null;

    return (
      <BottomSheet
        visible={sheetVisible}
        onClose={closeModal}
        title="تفاصيل المنتج"
        scrollable={false}
      >
        <View style={[styles.sheetContentWrapper, { maxHeight: isSmallScreen ? height * 0.75 : height * 0.85 }]}>
          <ScrollView style={styles.sheetScrollArea} contentContainerStyle={styles.sheetScrollContent} showsVerticalScrollIndicator={false} bounces={false}>

            <View style={{ height: 280, width: '100%', marginBottom: spacing.md, zIndex: 10, elevation: 2, position: 'relative' }}>
              <ImageGallery
                images={galleryImages}
                height={280}
                borderRadius={5}
                showArrows={Platform.OS === 'web'}
              />
            </View>

            {/* ──── Clickable Title Row ──── */}
            <TouchableOpacity
              style={[styles.sheetTitleRow, { alignItems: 'center' }]}
              onPress={() => handleCopyText(selectedProduct.name, 'title')}
              activeOpacity={0.7}
            >
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{selectedProduct.name}</Text>
              <Ionicons name={copiedField === 'title' ? "checkmark" : "copy-outline"} size={18} color={copiedField === 'title' ? "#10B981" : theme.colors.textTertiary} style={{ marginStart: 8 }} />
              {!!campaignByProductId[selectedProduct.id] && (
                <View style={[styles.sheetCampaignBadge, { borderRadius: borderRadius.full }]}>
                  <Ionicons name="flash" size={12} color="#FFF" />
                  <Text style={styles.sheetCampaignText}>عرض نشط</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={[styles.sheetPriceCard, { backgroundColor: theme.colors.surface2, borderRadius: borderRadius.lg }]}>
              <View style={styles.sheetPriceRow}>
                <Text style={[styles.sheetPriceValue, { color: theme.colors.text, fontSize: 24 }]}>
                  {formatCurrency(selectedProduct.price)}
                </Text>
              </View>

              <View style={[styles.commissionHighlightCard, { backgroundColor: '#10B98115', borderColor: '#10B98130', marginTop: 12 }]}>
                <View style={styles.commissionHeader}>
                  <Ionicons name="wallet" size={16} color="#10B981" />
                  <Text style={[styles.commissionTitle, { color: '#10B981' }]}>صافي ربحك</Text>
                </View>
                <Text style={[styles.commissionLargeValue, { color: '#10B981' }]}>
                  {formatCurrency(Math.max(0, (selectedProduct.commission_amount || 0) - 200))}
                </Text>
                <Text style={{ color: '#6B7280', fontSize: 11, fontFamily: 'Tajawal_500Medium', marginTop: 4 }}>(بعد خصم رسوم المنصة 200 د.ج)</Text>
              </View>
            </View>

            {/* ──── Clickable Description Section ──── */}
            {!!selectedProduct.description && (
              <View style={styles.descSection}>
                <View style={styles.descSectionHeader}>
                  <Text style={[styles.descTitle, { color: theme.colors.text, marginBottom: 0 }]}>وصف المنتج:</Text>
                  <TouchableOpacity onPress={() => handleCopyText(selectedProduct.description, 'desc')} style={styles.copySmallBtn}>
                    <Ionicons name={copiedField === 'desc' ? "checkmark" : "copy-outline"} size={14} color={copiedField === 'desc' ? "#10B981" : theme.colors.textTertiary} />
                    <Text style={[styles.copySmallText, { color: copiedField === 'desc' ? "#10B981" : theme.colors.textTertiary }]}>{copiedField === 'desc' ? 'تم النسخ' : 'نسخ الوصف'}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity activeOpacity={0.8} onPress={() => handleCopyText(selectedProduct.description, 'desc')}>
                  <Text style={[styles.descText, { color: theme.colors.textSecondary }]}>
                    {selectedProduct.description}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.sheetFooter, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <View style={styles.sheetFooterInner}>

              {/* Download Images Button */}
              <TouchableOpacity
                onPress={() => handleDownloadAllImages(galleryImages)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.sheetIconBtn, { backgroundColor: isDownloading ? '#F59E0B' : theme.colors.surface2, borderRadius: borderRadius.full }]}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="download-outline" size={22} color={theme.colors.text} />
                )}
              </TouchableOpacity>

              {/* Copy Promo Link Button */}
              <TouchableOpacity
                onPress={() => handleCopy(selectedProduct)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.sheetIconBtn, { backgroundColor: isCopied ? '#10B981' : theme.colors.surface2, borderRadius: borderRadius.full }]}
              >
                <Ionicons name={isCopied ? "checkmark-outline" : "copy-outline"} size={22} color={isCopied ? '#FFF' : theme.colors.text} />
              </TouchableOpacity>

              {/* Share Button */}
              <TouchableOpacity
                onPress={() => handleShare(selectedProduct)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.sheetIconBtn, { backgroundColor: theme.colors.surface2, borderRadius: borderRadius.full }]}
              >
                <Ionicons name="share-social-outline" size={22} color={theme.colors.text} />
              </TouchableOpacity>

              <Button
                title="طلب للعميل الآن"
                icon="cart"
                onPress={() => handleOrderForClient(selectedProduct)}
                style={[styles.sheetOrderBtn, { borderRadius: borderRadius.lg }]}
              />
            </View>
          </View>
        </View>
      </BottomSheet>
    );
  };

  // --- RENDER PRODUCT CARD ---
  const renderProductCard = ({ item }) => {
    const hasCampaign = !!campaignByProductId[item.id];
    const commission = item.commission_amount || 0;

    const catName = (() => {
      const targetId = item.category_id || item.category;
      const cat = categories.find(c =>
        c.id === targetId ||
        c.name_normalized === String(targetId).toLowerCase() ||
        c.name_ar === targetId
      );
      if (cat) return cat.name_ar || cat.name;

      if (typeof item.category === 'object') return item.category.name_ar || item.category.name;
      return item.category || 'بدون تصنيف';
    })();

    return (
      <TouchableOpacity
        style={[
          styles.gridCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            flex: 1 / numColumns,
          }
        ]}
        activeOpacity={0.9}
        onPress={() => openProductDetails(item)}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.image_url || PLACEHOLDER_IMAGE }}
            style={styles.gridImage}
            contentFit="cover"
            transition={400}
          />

          <View style={styles.cardCommissionBadgeContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.cardCommissionBadgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ModernShimmer />

              <Text style={styles.cardCommissionLabel}>ربحك</Text>
              <Text style={styles.cardCommissionValue}>{formatCurrency(Math.max(0, commission - 200))}</Text>
            </LinearGradient>
          </View>

          {hasCampaign && (
            <View style={styles.campaignFlash}>
              <Ionicons name="flash" size={14} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.gridContent}>
          <Text style={[styles.categoryText, { color: theme.primary }]} numberOfLines={1}>
            {catName}
          </Text>

          <CardMarqueeText
            text={item.name}
            style={[styles.gridTitle, { color: theme.colors.text }]}
          />

          <View style={styles.cardDivider} />

          <View style={styles.gridPriceRow}>
            <View style={[styles.arrowCircle, { backgroundColor: theme.primary + '10' }]}>
              <Ionicons name="chevron-back" size={16} color={theme.primary} />
            </View>

            <View style={{ alignItems: 'flex-start' }}>
              <Text style={[styles.gridPriceLabel, { color: theme.colors.textTertiary }]}>سعر البيع</Text>
              <Text style={[styles.gridPrice, { color: theme.colors.text }]}>
                {formatCurrency(item.price)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const emptyMessage = useMemo(() => {
    if (debouncedSearch) return 'لم نعثر على أي منتج يطابق بحثك.';
    if (priceMin || priceMax) return 'لا توجد منتجات في هذا النطاق السعري.';
    if (filterSubcategory) return 'لا توجد منتجات في هذا التصنيف الفرعي.';
    if (filterCategory) return 'لا توجد منتجات في هذا التصنيف.';
    return 'لا توجد منتجات متاحة في المتجر حالياً.';
  }, [debouncedSearch, priceMin, priceMax, filterSubcategory, filterCategory]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['top']}>

      <UniversalHeader
        title="سوق المنتجات"
        subtitle="تصفح المنتجات وابدأ التسويق الآن"
      />

      <View style={styles.centerWrapper}>
        <View style={[styles.constrainedContent, { maxWidth: contentMaxWidth }]}>

          <View style={styles.topControls}>
            {/* ──── Search Bar ──── */}
            <View style={styles.searchRow}>
              <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: borderRadius.lg, flex: 1 }]}>
                <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="ابحث بالاسم، الوصف، أو التصنيف..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
              {/* Filter toggle button */}
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => { });
                  setShowFilters(!showFilters);
                }}
                style={[
                  styles.filterToggleBtn,
                  {
                    backgroundColor: activeFilterCount > 0 ? theme.primary : theme.colors.surface,
                    borderColor: activeFilterCount > 0 ? theme.primary : theme.colors.border,
                    borderRadius: borderRadius.lg,
                  }
                ]}
              >
                <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#FFF' : theme.colors.textSecondary} />
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ──── Category Chips ──── */}
            <View style={styles.filterWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                <TouchableOpacity
                  onPress={() => handleCategorySelect(null)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: !filterCategory ? theme.primary : theme.colors.surface, borderColor: theme.colors.border }
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: !filterCategory ? '#FFF' : theme.colors.textSecondary }]}>الكل</Text>
                  <Text style={[styles.filterChipCount, { color: !filterCategory ? 'rgba(255,255,255,0.7)' : theme.colors.textTertiary }]}> ({products.length})</Text>
                </TouchableOpacity>

                {visibleCategories.map((cat) => {
                  const isSelected = filterCategory === cat.id;
                  const count = productCountByCategory[cat.id] || 0;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => handleCategorySelect(cat.id)}
                      style={[
                        styles.filterChip,
                        { backgroundColor: isSelected ? theme.primary : theme.colors.surface, borderColor: theme.colors.border }
                      ]}
                    >
                      <Ionicons name={cat.icon || 'grid-outline'} size={14} color={isSelected ? '#FFF' : theme.colors.textSecondary} style={{ marginEnd: 4 }} />
                      <Text style={[styles.filterChipText, { color: isSelected ? '#FFF' : theme.colors.textSecondary }]}>{cat.name_ar || cat.name}</Text>
                      <Text style={[styles.filterChipCount, { color: isSelected ? 'rgba(255,255,255,0.7)' : theme.colors.textTertiary }]}> ({count})</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ──── Subcategory Chips (when category selected) ──── */}
            {filterCategory && activeSubcategories.length > 0 && (
              <View style={[styles.filterWrapper, { marginTop: 4 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                  <TouchableOpacity
                    onPress={() => handleSubcategorySelect(null)}
                    style={[
                      styles.subFilterChip,
                      { backgroundColor: !filterSubcategory ? theme.primary + '20' : theme.colors.surface, borderColor: !filterSubcategory ? theme.primary : theme.colors.border }
                    ]}
                  >
                    <Text style={[styles.filterChipText, { color: !filterSubcategory ? theme.primary : theme.colors.textSecondary, fontSize: 12 }]}>الكل</Text>
                  </TouchableOpacity>
                  {activeSubcategories.map((sub) => {
                    const isSelected = filterSubcategory === sub.id;
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        onPress={() => handleSubcategorySelect(sub.id)}
                        style={[
                          styles.subFilterChip,
                          { backgroundColor: isSelected ? theme.primary + '20' : theme.colors.surface, borderColor: isSelected ? theme.primary : theme.colors.border }
                        ]}
                      >
                        <Ionicons name={sub.icon || 'ellipse-outline'} size={12} color={isSelected ? theme.primary : theme.colors.textTertiary} style={{ marginEnd: 3 }} />
                        <Text style={[styles.filterChipText, { color: isSelected ? theme.primary : theme.colors.textSecondary, fontSize: 12 }]}>{sub.name_ar || sub.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ──── Collapsible Advanced Filters Panel ──── */}
            <Animated.View style={[styles.advancedFiltersPanel, filterAnimatedStyle]}>
              {/* Sort options */}
              <View style={styles.sortSection}>
                <Text style={[styles.filterSectionLabel, { color: theme.colors.textSecondary }]}>الترتيب</Text>
                <View style={styles.sortRow}>
                  {SORT_OPTIONS.map((opt) => {
                    const isActive = sortBy === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => { });
                          setSortBy(opt.key);
                        }}
                        style={[
                          styles.sortChip,
                          {
                            backgroundColor: isActive ? theme.primary : theme.colors.surface,
                            borderColor: isActive ? theme.primary : theme.colors.border,
                          }
                        ]}
                      >
                        <Ionicons name={opt.icon} size={14} color={isActive ? '#FFF' : theme.colors.textSecondary} style={{ marginEnd: 4 }} />
                        <Text style={[styles.sortChipText, { color: isActive ? '#FFF' : theme.colors.textSecondary }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Price range */}
              <View style={styles.priceSection}>
                <Text style={[styles.filterSectionLabel, { color: theme.colors.textSecondary }]}>نطاق السعر (DZD)</Text>
                <View style={styles.priceRow}>
                  <View style={[styles.priceInputWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: borderRadius.md }]}>
                    <TextInput
                      style={[styles.priceInput, { color: theme.colors.text }]}
                      placeholder="الأدنى"
                      placeholderTextColor={theme.colors.textTertiary}
                      value={priceMin}
                      onChangeText={setPriceMin}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={[styles.priceSeparator, { color: theme.colors.textTertiary }]}>—</Text>
                  <View style={[styles.priceInputWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: borderRadius.md }]}>
                    <TextInput
                      style={[styles.priceInput, { color: theme.colors.text }]}
                      placeholder="الأقصى"
                      placeholderTextColor={theme.colors.textTertiary}
                      value={priceMax}
                      onChangeText={setPriceMax}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                {/* Price presets */}
                <View style={styles.pricePresetsRow}>
                  {PRICE_PRESETS.map((preset, idx) => {
                    const isActive = priceMin === String(preset.min) && (preset.max === null ? priceMax === '' : priceMax === String(preset.max));
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handlePricePreset(preset)}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isActive ? theme.primary + '18' : theme.colors.surface,
                            borderColor: isActive ? theme.primary : theme.colors.border,
                          }
                        ]}
                      >
                        <Text style={[styles.presetChipText, { color: isActive ? theme.primary : theme.colors.textSecondary }]}>{preset.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </Animated.View>

            {/* ──── Active Filters Bar ──── */}
            {(activeFilterCount > 0 || !!debouncedSearch) && (
              <View style={styles.activeFiltersBar}>
                <View style={styles.activeFiltersRow}>
                  <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
                    عرض {displayProducts.length} من {products.length} منتج
                  </Text>
                  {activeFilterCount > 0 && (
                    <TouchableOpacity onPress={clearAllFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={[styles.clearAllText, { color: theme.primary }]}>مسح الكل</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.listContainer}>
            {isLoading && products.length === 0 ? (
              <LoadingSpinner message="جاري تحميل المتجر..." />
            ) : (
              <FlatList
                key={numColumns}
                data={displayProducts}
                renderItem={renderProductCard}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : null}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
                ListEmptyComponent={
                  <EmptyState
                    icon="search-outline"
                    title="لا توجد منتجات"
                    message={emptyMessage}
                  />
                }
              />
            )}
          </View>
        </View>
      </View>

      {renderWebOverlay()}
      {renderMobileSheet()}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  centerWrapper: { flex: 1, alignItems: 'center' },
  constrainedContent: { flex: 1, width: '100%' },

  campaignBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  campaignBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 12 },

  topControls: { zIndex: 10, paddingVertical: spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: spacing.sm, gap: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: 1, paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, height: '100%', textAlign: 'right', fontFamily: 'Tajawal_500Medium', fontSize: 15, paddingVertical: 8 },
  filterToggleBtn: { width: 48, height: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF6B6B', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  filterBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Tajawal_700Bold' },

  filterWrapper: { minHeight: 36 },
  filterRow: { paddingHorizontal: spacing.md, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, minHeight: 36, borderWidth: 1, borderRadius: 18 },
  filterChipText: { fontSize: 13, fontFamily: 'Tajawal_500Medium', lineHeight: 18, paddingBottom: 2 },
  filterChipCount: { fontSize: 11, fontFamily: 'Tajawal_400Regular', lineHeight: 16, paddingBottom: 2 },
  subFilterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, minHeight: 32, borderWidth: 1, borderRadius: 16 },

  // Advanced Filters Panel
  advancedFiltersPanel: { overflow: 'hidden', marginHorizontal: spacing.md, marginTop: spacing.xs },
  filterSectionLabel: { fontFamily: 'Tajawal_700Bold', fontSize: 12, marginBottom: 6, textAlign: 'right' },
  sortSection: { marginBottom: spacing.sm },
  sortRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  sortChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, borderWidth: 1, borderRadius: 16 },
  sortChipText: { fontSize: 12, fontFamily: 'Tajawal_500Medium' },
  priceSection: { marginBottom: spacing.xs },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  priceInputWrap: { flex: 1, height: 40, borderWidth: 1, paddingHorizontal: 12, justifyContent: 'center' },
  priceInput: { fontFamily: 'Tajawal_500Medium', fontSize: 14, textAlign: 'right', height: '100%' },
  priceSeparator: { fontFamily: 'Tajawal_700Bold', fontSize: 16 },
  pricePresetsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  presetChip: { paddingHorizontal: 10, height: 28, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  presetChipText: { fontSize: 11, fontFamily: 'Tajawal_500Medium' },

  // Active Filters Bar
  activeFiltersBar: { paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: 2 },
  activeFiltersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsCount: { fontFamily: 'Tajawal_500Medium', fontSize: 12 },
  clearAllText: { fontFamily: 'Tajawal_700Bold', fontSize: 12 },

  listContainer: { flex: 1 },
  listContent: { padding: spacing.sm, paddingBottom: 200 },
  columnWrapper: { gap: spacing.sm, marginBottom: spacing.sm },

  gridCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
    position: 'relative',
    overflow: 'hidden'
  },
  gridImage: { width: '100%', height: '100%' },

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
  campaignFlash: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gridContent: {
    padding: 10,
    paddingTop: 8,
  },
  categoryText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'right',
    lineHeight: 18,
    paddingBottom: 2,
  },
  gridTitle: {
    ...typography.bodyBold,
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 22,
    paddingBottom: 4,
    marginBottom: 6,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 8,
  },
  gridPriceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  gridPriceLabel: {
    fontSize: 11,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right',
    marginBottom: 0,
    lineHeight: 16,
    paddingBottom: 2,
  },
  gridPrice: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 16,
    lineHeight: 24,
    paddingBottom: 2,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoBox: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, gap: 8 },
  infoBoxText: { flex: 1, fontFamily: 'Tajawal_500Medium', fontSize: 12, lineHeight: 18, textAlign: 'right' },

  // --- WEB OVERLAY (ANIMATED OPACITY) ---
  webModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  webModalContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 550,
    maxHeight: '90%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  webModalCloseBtn: { position: 'absolute', top: 16, left: 16, zIndex: 100, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', elevation: 0 },
  webModalContentArea: { flex: 1.3, padding: spacing.xl, paddingTop: spacing.xxl, justifyContent: 'space-between' },
  webModalImageArea: { flex: 1, backgroundColor: '#F5F6FA', elevation: 0 },
  webModalFooter: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1 },

  // --- MOBILE BOTTOM SHEET ---
  sheetContentWrapper: { flexShrink: 1, display: 'flex', flexDirection: 'column' },
  sheetScrollArea: { flexShrink: 1 },
  sheetScrollContent: { paddingBottom: spacing.xxl },
  sheetImage: { width: '100%', height: 280, marginBottom: spacing.md, backgroundColor: '#F1F5F9', elevation: 0 },
  sheetFooter: { padding: spacing.md, paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md, borderTopWidth: 1, backgroundColor: 'transparent' },
  sheetFooterInner: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },

  // --- SHARED STYLES (With new click-to-copy elements) ---
  sheetTitleRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  sheetTitle: { ...typography.h3, textAlign: 'right', flexShrink: 1, lineHeight: 28 },
  sheetCampaignBadge: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, gap: 4, marginStart: 12 },
  sheetCampaignText: { color: '#FFF', fontSize: 10, fontFamily: 'Tajawal_700Bold' },

  sheetPriceCard: {
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sheetPriceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  sheetPriceValue: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 24,
  },

  commissionHighlightCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  commissionTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 13,
  },
  commissionLargeValue: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 22,
  },

  descSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  descSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  descTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 15,
    textAlign: 'right',
  },
  copySmallBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  copySmallText: {
    fontSize: 11,
    fontFamily: 'Tajawal_500Medium',
  },
  descText: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
  },

  sheetIconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sheetOrderBtn: {
    flex: 1,
    height: 48,
  },
});