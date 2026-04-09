import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  StyleSheet,
  Share,
  Platform,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

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
  
  // Sheet & Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  
  // Interactive Copy State
  const [isCopied, setIsCopied] = useState(false);

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

  // Handle Web Fade Animation
  useEffect(() => {
    if (isWebModal) {
      Animated.timing(fadeAnim, {
        toValue: sheetVisible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [sheetVisible, isWebModal]);

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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      
      setTimeout(() => setIsCopied(false), 2000);
      
    } catch (error) {
      console.warn("Copy to clipboard failed:", error);
    }
  };

  const handleOrderForClient = (product) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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

  const displayProducts = useMemo(() => {
    let result = products;
    if (filterCategory) {
      result = result.filter((p) => p.category_id === filterCategory);
    }
    if (searchQuery) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return result;
  }, [products, filterCategory, searchQuery]);

  const CommissionInfoBox = () => (
    <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '25' }]}>
      <Ionicons name="information-circle" size={20} color={theme.primary} />
      <Text style={[styles.infoBoxText, { color: theme.colors.textSecondary }]}>
        يمكنك تحديد نسبة عمولتك الخاصة بحرية وإضافتها على سعر المنتج عند تقديم الطلب للعميل.
      </Text>
    </View>
  );

  // --- RENDER WEB OVERLAY (FADE ONLY, NO SLIDE) ---
  const renderWebOverlay = () => {
    if (!selectedProduct || !isWebModal) return null;

    return (
      <Modal transparent visible={sheetVisible} animationType="none">
        <Animated.View style={[styles.webModalOverlay, { opacity: fadeAnim }]}>
          <View style={[styles.webModalContainer, { width: isDesktop ? 950 : 750, backgroundColor: theme.colors.surface }]}>
            
            <TouchableOpacity onPress={closeModal} style={[styles.webModalCloseBtn, { backgroundColor: theme.colors.surface2 }]}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.webModalContentArea}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
                <View style={styles.sheetTitleRow}>
                  <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
                    {selectedProduct.name}
                  </Text>
                  {!!campaignByProductId[selectedProduct.id] && (
                    <View style={[styles.sheetCampaignBadge, { borderRadius: borderRadius.md }]}>
                      <Ionicons name="flash" size={12} color="#FFF" />
                      <Text style={styles.sheetCampaignText}>عرض نشط</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.sheetPriceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: borderRadius.lg }]}>
                  <View style={styles.sheetPriceRow}>
                    <Text style={[styles.sheetPriceLabel, { color: theme.colors.textSecondary }]}>سعر المنتج الأساسي:</Text>
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
                  style={[styles.sheetIconBtn, { backgroundColor: isCopied ? '#00B894' : theme.colors.surface2, borderRadius: borderRadius.lg }]}
                >
                  <Ionicons name={isCopied ? "checkmark-outline" : "copy-outline"} size={24} color={isCopied ? '#FFF' : theme.colors.text} />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => handleShare(selectedProduct)} 
                  style={[styles.sheetIconBtn, { backgroundColor: theme.colors.surface2, borderRadius: borderRadius.lg }]}
                >
                  <Ionicons name="share-social-outline" size={24} color={theme.colors.text} />
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
              <Image 
                source={{ uri: selectedProduct.image_url || PLACEHOLDER_IMAGE }} 
                style={styles.webModalImage} 
                resizeMode="cover" 
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
      <BottomSheet visible={sheetVisible} onClose={closeModal} title="تفاصيل المنتج">
        <View style={[styles.sheetContentWrapper, { maxHeight: isSmallScreen ? height * 0.75 : height * 0.85 }]}>
          <ScrollView style={styles.sheetScrollArea} contentContainerStyle={styles.sheetScrollContent} showsVerticalScrollIndicator={false} bounces={false}>
            
            <Image source={{ uri: selectedProduct.image_url || PLACEHOLDER_IMAGE }} style={[styles.sheetImage, { borderRadius: borderRadius.lg }]} resizeMode="cover" />
            
            <View style={styles.sheetTitleRow}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{selectedProduct.name}</Text>
              {!!campaignByProductId[selectedProduct.id] && (
                <View style={[styles.sheetCampaignBadge, { borderRadius: borderRadius.md }]}>
                  <Ionicons name="flash" size={12} color="#FFF" />
                  <Text style={styles.sheetCampaignText}>عرض نشط</Text>
                </View>
              )}
            </View>

            <View style={[styles.sheetPriceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: borderRadius.lg }]}>
              <View style={styles.sheetPriceRow}>
                <Text style={[styles.sheetPriceLabel, { color: theme.colors.textSecondary }]}>سعر المنتج الأساسي:</Text>
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
                style={[styles.sheetIconBtn, { backgroundColor: isCopied ? '#00B894' : theme.colors.surface2, borderRadius: borderRadius.lg }]}
              >
                <Ionicons name={isCopied ? "checkmark-outline" : "copy-outline"} size={24} color={isCopied ? '#FFF' : theme.colors.text} />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => handleShare(selectedProduct)} 
                style={[styles.sheetIconBtn, { backgroundColor: theme.colors.surface2, borderRadius: borderRadius.lg }]}
              >
                <Ionicons name="share-social-outline" size={24} color={theme.colors.text} />
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
          <Image source={{ uri: item.image_url || PLACEHOLDER_IMAGE }} style={styles.gridImage} resizeMode="cover" />
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

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['top']}>
      
      <UniversalHeader
        title="سوق المنتجات"
        subtitle="تصفح المنتجات وابدأ التسويق الآن"
        rightAction={
          <TouchableOpacity onPress={() => router.push('/(affiliate)/campaigns')} style={[styles.campaignBtn, { backgroundColor: theme.primary + '15', borderRadius: borderRadius.md }]}>
            <Ionicons name="flash" size={16} color={theme.primary} />
            <Text style={[styles.campaignBtnText, { color: theme.primary }]}>الحملات</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.centerWrapper}>
        <View style={[styles.constrainedContent, { maxWidth: contentMaxWidth }]}>
          
          <View style={styles.topControls}>
            <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: borderRadius.lg }]}>
              <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="ابحث عن منتج بالاسم..."
                placeholderTextColor={theme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                <TouchableOpacity
                  onPress={() => setFilterCategory(null)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: !filterCategory ? theme.primary : theme.colors.surface, borderColor: theme.colors.border, borderRadius: borderRadius.full }
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: !filterCategory ? '#FFF' : theme.colors.textSecondary }]}>الكل</Text>
                </TouchableOpacity>
                
                {categories.map((cat) => {
                  const isSelected = filterCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setFilterCategory(isSelected ? null : cat.id)}
                      style={[
                        styles.filterChip,
                        { backgroundColor: isSelected ? theme.primary : theme.colors.surface, borderColor: theme.colors.border, borderRadius: borderRadius.full }
                      ]}
                    >
                      <Ionicons name={cat.icon || 'grid-outline'} size={14} color={isSelected ? '#FFF' : theme.colors.textSecondary} style={{ marginEnd: 6 }} />
                      <Text style={[styles.filterChipText, { color: isSelected ? '#FFF' : theme.colors.textSecondary }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
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
                    message={searchQuery ? "لم نعثر على أي منتج يطابق بحثك." : "لا توجد منتجات متاحة في المتجر حالياً."}
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

  campaignBtn: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  campaignBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 12 },
  
  topControls: { zIndex: 10, paddingVertical: spacing.sm },
  searchBox: { flexDirection: 'row-reverse', alignItems: 'center', height: 48, borderWidth: 1, paddingHorizontal: 14, marginHorizontal: spacing.md, marginBottom: spacing.sm, gap: 8 },
  searchInput: { flex: 1, height: '100%', textAlign: 'right', fontFamily: 'Tajawal_500Medium', fontSize: 15 },
  
  filterWrapper: { height: 40 },
  filterRow: { paddingHorizontal: spacing.md, gap: 8, flexDirection: 'row-reverse' },
  filterChip: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, height: 38, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  
  listContainer: { flex: 1 },
  listContent: { padding: spacing.sm, paddingBottom: 100 },
  columnWrapper: { gap: spacing.sm, marginBottom: spacing.sm },
  
  gridCard: { borderRadius: borderRadius.lg, borderWidth: 1, overflow: 'hidden', marginHorizontal: spacing.xs, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  imageWrapper: { width: '100%', aspectRatio: 1, backgroundColor: '#F9F9F9', position: 'relative', borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, overflow: 'hidden' },
  gridImage: { width: '100%', height: '100%' },
  campaignTag: { position: 'absolute', top: 8, right: 8, backgroundColor: '#6C5CE7', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  
  gridContent: { padding: spacing.sm },
  gridTitle: { ...typography.bodyBold, fontSize: 14, textAlign: 'right', lineHeight: 20, height: 40, marginBottom: spacing.xs },
  gridPriceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  gridPrice: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 16 },

  infoBox: { flexDirection: 'row-reverse', alignItems: 'center', padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, gap: 8 },
  infoBoxText: { flex: 1, fontFamily: 'Tajawal_500Medium', fontSize: 13, lineHeight: 20, textAlign: 'right' },

  // --- WEB OVERLAY (ANIMATED OPACITY) ---
  webModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  webModalContainer: {
    flexDirection: 'row-reverse',
    height: 550,
    maxHeight: '90%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
    position: 'relative',
  },
  webModalCloseBtn: { position: 'absolute', top: 16, left: 16, zIndex: 100, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  webModalContentArea: { flex: 1.3, padding: spacing.xl, paddingTop: spacing.xxl, justifyContent: 'space-between' },
  webModalImageArea: { flex: 1, backgroundColor: '#F5F6FA' },
  webModalImage: { width: '100%', height: '100%' },
  webModalFooter: { flexDirection: 'row-reverse', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1 },

  // --- MOBILE BOTTOM SHEET ---
  sheetContentWrapper: { flex: 1, display: 'flex', flexDirection: 'column' },
  sheetScrollArea: { flex: 1 },
  sheetScrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  sheetImage: { width: '100%', height: 250, marginBottom: spacing.md, backgroundColor: '#F9F9F9' },
  sheetFooter: { padding: spacing.md, paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md, borderTopWidth: 1, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: -3 } },
  sheetFooterInner: { flexDirection: 'row-reverse', gap: spacing.sm, alignItems: 'center' },
  
  // --- SHARED STYLES ---
  sheetTitleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  sheetTitle: { ...typography.h3, textAlign: 'right', flex: 1, lineHeight: 28 },
  sheetCampaignBadge: { backgroundColor: '#6C5CE7', flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, gap: 4, marginStart: 12 },
  sheetCampaignText: { color: '#FFF', fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  sheetPriceCard: { padding: spacing.md, borderWidth: 1, marginBottom: spacing.md },
  sheetPriceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetPriceLabel: { fontFamily: 'Tajawal_700Bold', fontSize: 14 },
  sheetPriceValue: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 24 },
  descSection: { marginTop: spacing.xs },
  descTitle: { ...typography.bodyBold, marginBottom: spacing.xs, textAlign: 'right', fontSize: 16 },
  descText: { ...typography.body, fontSize: 15, lineHeight: 26, textAlign: 'right' },
  
  sheetIconBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  sheetOrderBtn: { flex: 1, height: 56 },
});