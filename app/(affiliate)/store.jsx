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
  Animated,
  I18nManager,
  ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
// UPDATED: Import FileSystem correctly for modern API usage
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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

import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency, generateReferralLink, generateCampaignLink } from '../../src/lib/utils';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400.png?text=لا+توجد+صورة';

const ProductCarousel = ({ images, height, borderRadius = 0 }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const flatListRef = useRef(null);
  const isWeb = Platform.OS === 'web';
  const isRTL = I18nManager.isRTL;

  useEffect(() => {
    setActiveIndex(0);
    if (flatListRef.current && containerWidth > 0) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [images, containerWidth]);

  const handleScroll = (event) => {
    if (containerWidth > 0) {
      const offset = event.nativeEvent.contentOffset.x;
      const index = Math.round(offset / containerWidth);
      if (index !== activeIndex && index >= 0 && index < images.length) {
        setActiveIndex(index);
      }
    }
  };

  const handleDownload = async () => {
    const currentImage = images[activeIndex];
    if (!currentImage) return;

    setIsDownloading(true);
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(currentImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = `product-image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      } else {
        // FIXED: Using modern, non-deprecated FileSystem API for SDK 51+
        const filename = `product-image-${Date.now()}.jpg`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        const downloadResumable = FileSystem.createDownloadResumable(
          currentImage,
          fileUri,
          {}
        );

        const result = await downloadResumable.downloadAsync();

        if (result && await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri);
        } else {
          // Fallback or error message if sharing is not available
          console.log("Sharing is not available on this device.");
        }
      }
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback for web in case of CORS or other fetch issues
      if (Platform.OS === 'web') {
        window.open(currentImage, '_blank');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  if (!images || images.length === 0) {
    return (
      <View style={[{ width: '100%', borderRadius, overflow: 'hidden' }, height === '100%' ? { flex: 1 } : { height }]}>
        <Image source={{ uri: PLACEHOLDER_IMAGE }} style={styles.imgFill} contentFit="cover" transition={200} />
      </View>
    );
  }

  const scrollToIndex = (index) => {
    if (index >= 0 && index < images.length && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
      setActiveIndex(index);
    }
  };

  return (
    <View
      style={[{ width: '100%', borderRadius, overflow: 'hidden', position: 'relative', backgroundColor: '#F0F0F0' }, height === '100%' ? { flex: 1 } : { height }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* FIXED: Only render FlatList when its container has a calculated width to prevent web rendering bugs */}
      {containerWidth > 0 ? (
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          keyExtractor={(_, index) => `img-${index}`}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: containerWidth,
            offset: containerWidth * index,
            index,
          })}
          onScrollToIndexFailed={() => { /* Graceful fail */ }}
          renderItem={({ item }) => (
            <View style={{ width: containerWidth, height: '100%' }}>
              <Image source={{ uri: item }} style={styles.imgFill} contentFit="cover" transition={200} />
            </View>
          )}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#888" />
        </View>
      )}

      {/* Download Button */}
      <TouchableOpacity
        style={[styles.downloadBtn, isRTL ? { right: 12 } : { left: 12 }]}
        onPress={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color="#333" />
        ) : (
          <Ionicons name="download-outline" size={20} color="#333" />
        )}
      </TouchableOpacity>

      {/* Web Arrow Buttons */}
      {isWeb && images.length > 1 && (
        <>
          {((isRTL && activeIndex < images.length - 1) || (!isRTL && activeIndex > 0)) && (
            <TouchableOpacity
              style={[styles.carouselArrow, { left: 10 }]}
              onPress={() => scrollToIndex(isRTL ? activeIndex + 1 : activeIndex - 1)}
            >
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
          )}
          {((isRTL && activeIndex > 0) || (!isRTL && activeIndex < images.length - 1)) && (
            <TouchableOpacity
              style={[styles.carouselArrow, { right: 10 }]}
              onPress={() => scrollToIndex(isRTL ? activeIndex - 1 : activeIndex + 1)}
            >
              <Ionicons name="chevron-forward" size={24} color="#333" />
            </TouchableOpacity>
          )}
        </>
      )}

      {images.length > 1 && (
        <View style={styles.paginationDots}>
          {images.map((_, i) => (
            <TouchableOpacity
              key={`dot-${i}`}
              onPress={() => scrollToIndex(i)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.dot,
                { opacity: i === activeIndex ? 1 : 0.5, transform: [{ scale: i === activeIndex ? 1.2 : 1 }] }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

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
  const filterPanelAnim = useRef(new Animated.Value(0)).current;

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef(null);

  // Sheet & Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Interactive Copy State
  const [isCopied, setIsCopied] = useState(false);

  // Gallery Logic
  const galleryImages = useMemo(() => {
    if (!selectedProduct) return [];

    // 1. Prioritize the new gallery_urls array
    if (selectedProduct.gallery_urls && Array.isArray(selectedProduct.gallery_urls) && selectedProduct.gallery_urls.length > 0) {
      return selectedProduct.gallery_urls;
    }

    // 2. Fallback to legacy structure
    const images = [];
    if (selectedProduct.image_url) images.push(selectedProduct.image_url);

    if (selectedProduct.product_images && selectedProduct.product_images.length > 0) {
      const sortedExtras = [...selectedProduct.product_images].sort((a, b) =>
        (a.display_order || 0) - (b.display_order || 0)
      );

      sortedExtras.forEach(img => {
        if (img.image_url && img.image_url !== selectedProduct.image_url) {
          images.push(img.image_url);
        }
      });
    }
    return images;
  }, [selectedProduct]);

  // Animation Value for Web Fade
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    const targetStoreId = profile?.store_id;
    await Promise.all([
      fetchProducts(targetStoreId),
      fetchCategories(),
      fetchAffiliateProfile(targetStoreId)
    ]);
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

  useEffect(() => {
    if (isWebModal) {
      Animated.timing(fadeAnim, {
        toValue: sheetVisible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [sheetVisible, isWebModal]);

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

  // ──── Filter Panel Animation ────
  useEffect(() => {
    Animated.timing(filterPanelAnim, {
      toValue: showFilters ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [showFilters]);

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
    setFilterSubcategory(null); // Reset subcategory when category changes
  }, []);

  const handleSubcategorySelect = useCallback((subId) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => { });
    }
    setFilterSubcategory(subId);
  }, []);

  // ──── Derived: subcategories for selected category ────
  const activeSubcategories = useMemo(() => {
    if (!filterCategory) return [];
    const cat = categories.find((c) => c.id === filterCategory);
    return cat?.subcategories || [];
  }, [filterCategory, categories]);

  // ──── Derived: product count per category ────
  const productCountByCategory = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // ──── Derived: only categories that have products ────
  const visibleCategories = useMemo(() => {
    return categories.filter((cat) => productCountByCategory[cat.id] > 0);
  }, [categories, productCountByCategory]);

  // ──── Active filter count ────
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
    // Toggle: if same preset is active, clear it
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
      // Fallback to 'GUEST' if affiliateProfile isn't fully loaded yet to prevent silent errors
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

  const handleCopy = async (product) => {
    try {
      const { link, priceLabel } = resolveShareLink(product);

      const promoText = `🔥 متوفر الآن: ${product.name}\n\n💰 السعر: ${formatCurrency(priceLabel)}\n\n✨ التوصيل متوفر والدفع عند الاستلام!\n🛒 للطلب عبر الرابط:\n${link}`;

      // Await clipboard to ensure it completes before UI update
      await Clipboard.setStringAsync(promoText);

      // Update UI state securely
      setIsCopied(true);

      // Safe Haptics execution (won't crash if unsupported)
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
      const base = `productId=${product.id}&productName=${encodeURIComponent(product.name)}&productPrice=${product.price}&commissionRate=${product.commission_rate}&storeId=${product.store_id}`;
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
    setSheetVisible(true);
  };

  const closeModal = () => {
    if (isWebModal) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setSheetVisible(false);
        setSelectedProduct(null);
      });
    } else {
      setSheetVisible(false);
      setTimeout(() => setSelectedProduct(null), 300);
    }
  };

  // ──── Advanced filtering + sorting pipeline ────
  const displayProducts = useMemo(() => {
    let result = products;

    // 1. Category filter
    if (filterCategory) {
      result = result.filter((p) => p.category_id === filterCategory);
    }

    // 2. Subcategory filter
    if (filterSubcategory) {
      result = result.filter((p) => p.subcategory_id === filterSubcategory);
    }

    // 3. Debounced search — name, description, and category name
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q))
      );
    }

    // 4. Price range filter
    const minVal = priceMin ? parseFloat(priceMin) : null;
    const maxVal = priceMax ? parseFloat(priceMax) : null;
    if (minVal !== null) {
      result = result.filter((p) => p.price >= minVal);
    }
    if (maxVal !== null) {
      result = result.filter((p) => p.price <= maxVal);
    }

    // 5. Sorting
    const sorted = [...result];
    switch (sortBy) {
      case 'cheapest':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'expensive':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        break;
      case 'newest':
      default:
        // Already sorted by created_at desc from the API
        break;
    }

    return sorted;
  }, [products, filterCategory, filterSubcategory, debouncedSearch, priceMin, priceMax, sortBy]);

  const CommissionInfoBox = () => (
    <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '25' }]}>
      <Ionicons name="information-circle" size={18} color={theme.primary} />
      <Text style={[styles.infoBoxText, { color: theme.colors.textSecondary }]}>
        يمكنك تحديد نسبة عمولتك الخاصة بحرية وإضافتها على سعر المنتج عند تقديم الطلب للعميل.
      </Text>
    </View>
  );

  // --- RENDER WEB OVERLAY (FADE ONLY, NO SLIDE) ---
  const renderWebOverlay = () => {
    if (!selectedProduct || !isWebModal) return null;

    return (
      <Modal transparent visible={sheetVisible} animationType="none" onRequestClose={closeModal}>
        <Animated.View style={[styles.webModalOverlay, { opacity: fadeAnim }]}>
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
                <View style={styles.sheetTitleRow}>
                  <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
                    {selectedProduct.name}
                  </Text>
                  {!!campaignByProductId[selectedProduct.id] && (
                    <View style={[styles.sheetCampaignBadge, { borderRadius: borderRadius.full }]}>
                      <Ionicons name="flash" size={12} color="#FFF" />
                      <Text style={styles.sheetCampaignText}>عرض نشط</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.sheetPriceCard, { backgroundColor: theme.colors.surface2, borderRadius: borderRadius.lg }]}>
                  <View style={styles.sheetPriceRow}>
                    <Text style={[styles.sheetPriceLabel, { color: theme.colors.textSecondary }]}>السعر الأساسي:</Text>
                    <Text style={[styles.sheetPriceValue, { color: theme.primary }]}>
                      {formatCurrency(selectedProduct.price)}
                    </Text>
                  </View>
                  <CommissionInfoBox />
                </View>

                {!!selectedProduct.description && (
                  <View style={styles.descSection}>
                    <Text style={[styles.descTitle, { color: theme.colors.text }]}>وصف المنتج:</Text>
                    <Text style={[styles.descText, { color: theme.colors.textSecondary }]}>
                      {selectedProduct.description}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={[styles.webModalFooter, { borderTopColor: theme.colors.border }]}>
                {/* ACTION BUTTONS (Inlined for React Native Stability) */}
                <TouchableOpacity
                  onPress={() => handleCopy(selectedProduct)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  style={[styles.sheetIconBtn, { backgroundColor: isCopied ? '#00B894' : theme.colors.surface2, borderRadius: borderRadius.lg }]}
                >
                  <Ionicons name={isCopied ? "checkmark-outline" : "copy-outline"} size={22} color={isCopied ? '#FFF' : theme.colors.text} />
                </TouchableOpacity>

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
              <ProductCarousel
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

            <View style={{ height: 280, width: '100%', marginBottom: spacing.md, elevation: 0 }}>
              <ProductCarousel
                images={galleryImages}
                height={280}
                borderRadius={0}
              />
            </View>

            <View style={styles.sheetTitleRow}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{selectedProduct.name}</Text>
              {!!campaignByProductId[selectedProduct.id] && (
                <View style={[styles.sheetCampaignBadge, { borderRadius: borderRadius.full }]}>
                  <Ionicons name="flash" size={12} color="#FFF" />
                  <Text style={styles.sheetCampaignText}>عرض نشط</Text>
                </View>
              )}
            </View>

            <View style={[styles.sheetPriceCard, { backgroundColor: theme.colors.surface2, borderRadius: borderRadius.lg }]}>
              <View style={styles.sheetPriceRow}>
                <Text style={[styles.sheetPriceLabel, { color: theme.colors.textSecondary }]}>السعر الأساسي:</Text>
                <Text style={[styles.sheetPriceValue, { color: theme.primary }]}>
                  {formatCurrency(selectedProduct.price)}
                </Text>
              </View>
              <CommissionInfoBox />
            </View>

            {!!selectedProduct.description && (
              <View style={styles.descSection}>
                <Text style={[styles.descTitle, { color: theme.colors.text }]}>وصف المنتج:</Text>
                <Text style={[styles.descText, { color: theme.colors.textSecondary }]}>
                  {selectedProduct.description}
                </Text>
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.sheetFooter, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <View style={styles.sheetFooterInner}>

              {/* ACTION BUTTONS (Inlined for React Native Stability) */}
              <TouchableOpacity
                onPress={() => handleCopy(selectedProduct)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.sheetIconBtn, { backgroundColor: isCopied ? '#10B981' : theme.colors.surface2, borderRadius: borderRadius.full }]}
              >
                <Ionicons name={isCopied ? "checkmark-outline" : "copy-outline"} size={22} color={isCopied ? '#FFF' : theme.colors.text} />
              </TouchableOpacity>

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

    return (
      <TouchableOpacity
        style={[styles.gridCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, flex: 1 / numColumns }]}
        activeOpacity={0.85}
        onPress={() => openProductDetails(item)}
      >
        <View style={styles.imageWrapper}>
          <Image source={{ uri: item.image_url || PLACEHOLDER_IMAGE }} style={styles.gridImage} contentFit="cover" transition={200} />
          {hasCampaign && (
            <View style={styles.campaignTag}>
              <Ionicons name="flash" size={12} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.gridContent}>
          <Text style={[styles.gridTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.name}</Text>
          <View style={styles.gridPriceRow}>
            <Text style={[styles.gridPrice, { color: theme.primary }]}>{formatCurrency(item.price)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ──── Empty state message ────
  const emptyMessage = useMemo(() => {
    if (debouncedSearch) return 'لم نعثر على أي منتج يطابق بحثك.';
    if (priceMin || priceMax) return 'لا توجد منتجات في هذا النطاق السعري.';
    if (filterSubcategory) return 'لا توجد منتجات في هذا التصنيف الفرعي.';
    if (filterCategory) return 'لا توجد منتجات في هذا التصنيف.';
    return 'لا توجد منتجات متاحة في المتجر حالياً.';
  }, [debouncedSearch, priceMin, priceMax, filterSubcategory, filterCategory]);

  // ──── Filter panel max height interpolation ────
  const filterPanelHeight = filterPanelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });
  const filterPanelOpacity = filterPanelAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['top']}>

      <UniversalHeader
        title="سوق المنتجات"
        subtitle="تصفح المنتجات وابدأ التسويق الآن"
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/(affiliate)/campaigns')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.campaignBtn, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9999 }]}
          >
            <Ionicons name="flash" size={14} color="#FFFFFF" />
            <Text style={[styles.campaignBtnText, { color: '#FFFFFF' }]}>الحملات</Text>
          </TouchableOpacity>
        }
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
                  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
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
                      <Text style={[styles.filterChipText, { color: isSelected ? '#FFF' : theme.colors.textSecondary }]}>{cat.name}</Text>
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
                        <Text style={[styles.filterChipText, { color: isSelected ? theme.primary : theme.colors.textSecondary, fontSize: 12 }]}>{sub.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ──── Collapsible Advanced Filters Panel ──── */}
            <Animated.View style={[styles.advancedFiltersPanel, { maxHeight: filterPanelHeight, opacity: filterPanelOpacity }]}>
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
                          if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
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
            {(activeFilterCount > 0 || debouncedSearch) && (
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
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1, paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, height: '100%', textAlign: 'right', fontFamily: 'Tajawal_500Medium', fontSize: 15 },
  filterToggleBtn: { width: 48, height: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF6B6B', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  filterBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Tajawal_700Bold' },

  filterWrapper: { height: 32 },
  filterRow: { paddingHorizontal: spacing.md, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 32, borderWidth: 1, borderRadius: 16 },
  filterChipText: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  filterChipCount: { fontSize: 11, fontFamily: 'Tajawal_400Regular' },
  subFilterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 28, borderWidth: 1, borderRadius: 14 },

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

  gridCard: { borderRadius: borderRadius.md, borderWidth: 1, overflow: 'hidden', marginHorizontal: spacing.xs, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  imageWrapper: { width: '100%', aspectRatio: 1.15, backgroundColor: '#F9F9F9', position: 'relative', borderTopLeftRadius: borderRadius.md, borderTopRightRadius: borderRadius.md, overflow: 'hidden' },
  gridImage: { width: '100%', height: '100%' },
  campaignTag: { position: 'absolute', top: 6, right: 6, backgroundColor: '#6C5CE7', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', elevation: 0 },

  gridContent: { padding: spacing.xs },
  gridTitle: { ...typography.bodyBold, fontSize: 13, textAlign: 'right', lineHeight: 18, height: 36, marginBottom: 4 },
  gridPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridPrice: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 14 },

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

  // --- SHARED STYLES ---
  sheetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  sheetTitle: { ...typography.h3, textAlign: 'right', flex: 1, lineHeight: 28 },
  sheetCampaignBadge: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, gap: 4, marginStart: 12 },
  sheetCampaignText: { color: '#FFF', fontSize: 12, fontFamily: 'Tajawal_700Bold' },

  sheetPriceCard: { padding: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md, overflow: 'hidden' },
  sheetPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetPriceLabel: { fontFamily: 'Tajawal_500Medium', fontSize: 14 },
  sheetPriceValue: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 24 },

  descSection: { marginTop: spacing.xs, paddingHorizontal: spacing.lg },
  descTitle: { ...typography.bodyBold, marginBottom: spacing.xs, textAlign: 'right', fontSize: 16 },
  descText: { ...typography.body, fontSize: 14, lineHeight: 24, textAlign: 'right', opacity: 0.8 },

  sheetIconBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  sheetOrderBtn: { flex: 1, height: 52 },

  // Gallery Helpers
  imgFill: { width: '100%', height: '100%' },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  downloadBtn: {
    position: 'absolute',
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    elevation: 0,
    shadowOpacity: 0
  },
});