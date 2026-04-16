// campaigns.jsx - Pro Max UX (No default template, Scroll hints, Enhanced Visibility)
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, Share, ScrollView, LayoutAnimation, Modal, TextInput
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../src/hooks/useTheme";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useStoreStore } from "../../src/stores/useStoreStore";
import { useAffiliateStore } from "../../src/stores/useAffiliateStore";
import { useCampaignStore } from "../../src/stores/useCampaignStore";
import { useProductStore } from "../../src/stores/useProductStore";
import { useOrderStore } from "../../src/stores/useOrderStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import EmptyState from "../../src/components/ui/EmptyState";
import { typography, spacing } from "../../src/theme/theme";
import { formatCurrency, generateCampaignLink } from "../../src/lib/utils";
import Badge from "../../src/components/ui/Badge";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import { useFAB } from "../../src/hooks/useFAB";
import BottomSheet from "../../src/components/ui/BottomSheet";
import { supabase } from "../../src/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { FORM_THEMES } from "../../src/components/campaigns/LandingTemplates";

import {
  ArtisanTemplate,
  SupremeTemplate,
  CyberTemplate,
  EleganceTemplate,
  BeastTemplate,
  TrendTemplate,
  AuraTemplate,
  KicksTemplate,
  HomeFixTemplate,
  CandyTemplate,
  ActiveTemplate,
  CraveTemplate,
  LumberTemplate,
  NexusTemplate
} from "../../src/components/campaigns/LandingTemplates";

// --- Goal-Focused Template Data ---
const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'الكل', icon: 'apps-outline' },
  { id: 'fomo', label: 'عروض مستعجلة', icon: 'flame-outline' },
  { id: 'beauty', label: 'موضة وتجميل', icon: 'color-palette-outline' },
  { id: 'tech', label: 'إلكترونيات', icon: 'hardware-chip-outline' },
  { id: 'home', label: 'منزل وأدوات', icon: 'home-outline' },
  { id: 'foodsport', label: 'رياضة وتغذية', icon: 'barbell-outline' },
  { id: 'general', label: 'عام', icon: 'cube-outline' },
];

const TEMPLATES_DATA = [
  { id: 'beast', name: 'Beast', desc: 'استعجال وشراسة', icon: 'flame', color: '#FF3B30', bg: '#FFF0F0', category: 'fomo', bestFor: 'التخفيضات والكميات المحدودة' },
  { id: 'supreme', name: 'Supreme', desc: 'بسيط ومباشر', icon: 'flash', color: '#000000', bg: '#F5F5F7', category: 'fomo', bestFor: 'المنتجات سريعة البيع' },
  { id: 'elegance', name: 'Elegance', desc: 'ناعم وتجميلي', icon: 'color-palette', color: '#D4AF37', bg: '#FFFAF0', category: 'beauty', bestFor: 'العطور، الكوسميتيك، الحلي' },
  { id: 'trend', name: 'Trend', desc: 'أزياء وموضة', icon: 'shirt', color: '#000000', bg: '#FAFAFA', category: 'beauty', bestFor: 'الملابس والأحذية العصرية' },
  { id: 'aura', name: 'Aura', desc: 'فساتين زفاف', icon: 'rose', color: '#D88A8A', bg: '#FFF5F5', category: 'beauty', bestFor: 'الفساتين والألبسة النسائية' },
  { id: 'candy', name: 'Candy', desc: 'بناتي وردي', icon: 'heart', color: '#FF69B4', bg: '#FFF0F5', category: 'beauty', bestFor: 'الإكسسوارات والهدايا' },
  { id: 'cyber', name: 'Cyber', desc: 'مستقبلي داكن', icon: 'game-controller', color: '#00FFCC', bg: '#1A1A24', category: 'tech', bestFor: 'الإلكترونيات والجيمنج' },
  { id: 'nexus', name: 'Nexus', desc: 'أجهزة وتقنية', icon: 'hardware-chip', color: '#64FFDA', bg: '#0A192F', category: 'tech', bestFor: 'الهواتف والملحقات الذكية' },
  { id: 'homefix', name: 'HomeFix', desc: 'عملي وموثوق', icon: 'home', color: '#0F609B', bg: '#F0F4F8', category: 'home', bestFor: 'الأدوات والمعدات المنزلية' },
  { id: 'lumber', name: 'Lumber', desc: 'أثاث وديكور', icon: 'bed', color: '#5C6B52', bg: '#F5F5F0', category: 'home', bestFor: 'الأثاث والديكور المنزلي' },
  { id: 'active', name: 'Active', desc: 'طاقة وعنفوان', icon: 'barbell', color: '#CCFF00', bg: '#121212', category: 'foodsport', bestFor: 'المعدات والملابس الرياضية' },
  { id: 'crave', name: 'Crave', desc: 'غذاء ومكملات', icon: 'restaurant', color: '#E65100', bg: '#FFF8F0', category: 'foodsport', bestFor: 'المكملات الغذائية والأكل' },
  { id: 'artisan', name: "Artisan", desc: 'أصالة وحرفية', icon: 'diamond', color: '#a63400', bg: '#f9f6f3', category: 'general', bestFor: 'المنتجات التقليدية واليدوية' },
  { id: 'kicks', name: 'Kicks', desc: 'أحذية وحقائب', icon: 'footsteps', color: '#2D5CFF', bg: '#0F0F11', category: 'general', bestFor: 'الأحذية الرياضية الفاخرة' },
];

export default function AffiliateCampaignsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const profile = useAuthStore((s) => s.profile);
  const currentStore = useStoreStore((s) => s.currentStore);
  const affiliateProfile = useAffiliateStore((s) => s.affiliateProfile);
  const fetchAffiliateProfile = useAffiliateStore((s) => s.fetchAffiliateProfile);

  const { products, fetchProducts } = useProductStore();
  const { orders, fetchAffiliateOrders } = useOrderStore();
  const { campaigns, isLoading, fetchCampaignsForAffiliate, createCampaign, updateCampaign, deleteCampaign, setCampaignActive } = useCampaignStore();
  const { showConfirm, showAlert } = useAlertStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [modalError, setModalError] = useState("");
  const [imageUris, setImageUris] = useState([]);

  const [step, setStep] = useState(1);
  const [productId, setProductId] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [slug, setSlug] = useState("");

  const [pageConfig, setPageConfig] = useState({
    template: '',
    headline: '', subheadline: '', btnText: '',
    f1Title: '', f1Desc: '', f2Title: '', f2Desc: '', f3Title: '', f3Desc: '',
    images: []
  });

  const [selectedTemplateCat, setSelectedTemplateCat] = useState('all');

  const [previewForm, setPreviewForm] = useState({ name: "", phone: "", commune: "", address: "", notes: "" });
  const [previewWilaya, setPreviewWilaya] = useState(null);
  const [previewDelivery, setPreviewDelivery] = useState("home");
  const [previewWilayaModal, setPreviewWilayaModal] = useState(false);
  const [previewWilayaSearch, setPreviewWilayaSearch] = useState("");
  const [appWilayas, setAppWilayas] = useState([]);

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

  const removeImage = (index) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const filteredPreviewWilayas = useMemo(() => {
    if (!previewWilayaSearch) return appWilayas;
    return appWilayas.filter(w => w.name.includes(previewWilayaSearch) || (w.name_fr || "").toLowerCase().includes(previewWilayaSearch) || w.code.includes(previewWilayaSearch));
  }, [appWilayas, previewWilayaSearch]);

  const activeCount = campaigns.filter(c => c.is_active).length;
  const totalOrders = orders?.length || 0;
  const totalProfit = campaigns.reduce((sum, c) => {
    const campaignOrders = orders.filter(o => o.campaign_slug === c.slug && o.status === 'delivered');
    const profitPerOrder = Number(c.sale_price) - Number(c.products?.price || 0);
    return sum + (campaignOrders.length * profitPerOrder);
  }, 0);

  const publishedProducts = useMemo(() => (products || []).filter((p) => p.listing_status === "published" && p.is_active !== false), [products]);

  const selectedProduct = publishedProducts.find((p) => p.id === productId);
  const basePrice = selectedProduct ? Number(selectedProduct.price) : 0;
  const salePriceNum = parseFloat(salePrice) || 0;
  const commissionProfit = salePriceNum > basePrice ? salePriceNum - basePrice : 0;

  const load = useCallback(async () => {
    await fetchCampaignsForAffiliate();
    await fetchAffiliateOrders();
    const targetStoreId = profile?.store_id || currentStore?.id || null;
    await fetchProducts(targetStoreId, 0);
    if (!affiliateProfile?.id) await fetchAffiliateProfile(targetStoreId);

    const { data: wdata } = await supabase.from("wilayas").select("*").eq("is_active", true).order("code");
    if (wdata) {
      setAppWilayas(wdata);
    }
  }, [profile?.store_id, currentStore?.id, affiliateProfile?.id, fetchAffiliateOrders, fetchCampaignsForAffiliate, fetchProducts, fetchAffiliateProfile]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingCampaignId(null);
    setStep(1);
    setModalError("");
    setProductId(publishedProducts[0]?.id || "");
    setSalePrice(publishedProducts[0] ? String(Number(publishedProducts[0].price)) : "");
    setSlug("");
    setSelectedTemplateCat('all');
    setPageConfig({ template: '', headline: '', subheadline: '', btnText: '', f1Title: '', f1Desc: '', f2Title: '', f2Desc: '', f3Title: '', f3Desc: '', images: [] });
    setImageUris([]);
    setModalOpen(true);
  };

  const openEdit = (campaign) => {
    setEditingCampaignId(campaign.id);
    setStep(1);
    setModalError("");
    setProductId(campaign.product_id);
    setSalePrice(String(campaign.sale_price));
    setSlug(campaign.slug);
    setSelectedTemplateCat('all');
    const config = typeof campaign.page_config === 'string' ? JSON.parse(campaign.page_config) : (campaign.page_config || {});
    setPageConfig({
      template: config.template || 'supreme',
      headline: config.headline || '', subheadline: config.subheadline || '', btnText: config.btnText || '',
      f1Title: config.features?.[0]?.title || '', f1Desc: config.features?.[0]?.desc || '',
      f2Title: config.features?.[1]?.title || '', f2Desc: config.features?.[1]?.desc || '',
      f3Title: config.features?.[2]?.title || '', f3Desc: config.features?.[2]?.desc || '',
      images: config.images || []
    });
    setImageUris(config.images || []);
    setModalOpen(true);
  };

  useFAB({ icon: 'link-outline', label: 'إنشاء صفحة هبوط', onPress: openCreate, visible: !modalOpen && !previewVisible });

  const validateStep1 = () => {
    setModalError("");
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (s.length < 3) { setModalError("المعرف يجب أن يكون 3 أحرف على الأقل."); return false; }
    if (!productId) { setModalError("يرجى اختيار منتج أولاً للترويج له."); return false; }
    if (salePriceNum <= basePrice) { setModalError("سعر البيع يجب أن يكون أعلى من سعر المورد لتحقيق ربح."); return false; }

    setSlug(s);
    setStep(2);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const getPageConfigData = () => ({
    template: pageConfig.template,
    headline: pageConfig.headline.trim(),
    subheadline: pageConfig.subheadline.trim(),
    btnText: pageConfig.btnText.trim(),
    features: [
      { title: pageConfig.f1Title.trim(), desc: pageConfig.f1Desc.trim() },
      { title: pageConfig.f2Title.trim(), desc: pageConfig.f2Desc.trim() },
      { title: pageConfig.f3Title.trim(), desc: pageConfig.f3Desc.trim() }
    ],
    images: imageUris
  });

  const saveCampaign = async () => {
    if (!pageConfig.template) { setModalError("يرجى اختيار قالب لصفحة الهبوط."); return; }
    setSaving(true);
    setModalError("");

    try {
      const uploadResults = await Promise.all(imageUris.map(async (uri) => {
        if (uri.startsWith('http')) return uri;
        const res = await useProductStore.getState().uploadProductImage(uri, affiliateProfile?.id || currentStore?.id || 'anonymous');
        return res.success ? res.url : null;
      }));
      const finalImageUrls = uploadResults.filter(Boolean);

      const finalPageConfig = { ...getPageConfigData(), images: finalImageUrls };

      let res = editingCampaignId
        ? await updateCampaign(editingCampaignId, { productId, salePrice, slug, page_config: finalPageConfig })
        : await createCampaign({ affiliateId: affiliateProfile.id, productId, salePrice, slug, page_config: finalPageConfig });
      
      setSaving(false);

      if (res.success) {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setModalOpen(false);
        const link = generateCampaignLink(slug);
        showConfirm({
          title: editingCampaignId ? "تم تحديث الصفحة" : "تم بناء الصفحة بنجاح",
          message: `تم التحديث بنجاح\n${link}`,
          confirmText: "مشاركة الصفحة", cancelText: "إغلاق", type: "success",
          onConfirm: () => Share.share({ message: link, url: link }),
        });
      } else {
        setModalError(res.error);
      }
    } catch (e) {
      setSaving(false);
      setModalError("حدث خطأ أثناء رفع الصور أو حفظ البيانات.");
    }
  };

  const confirmDelete = (id) => {
    showConfirm({
      title: "حذف الصفحة", message: "هل أنت متأكد من رغبتك في حذف صفحة الهبوط هذه بشكل نهائي؟",
      confirmText: "نعم، احذفها", cancelText: "إلغاء", type: "danger",
      onConfirm: async () => {
        const res = await deleteCampaign(id);
        if (res.success) {
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          showAlert({
            title: "خطأ",
            message: res.error || "فشل حذف الصفحة، يرجى المحاولة مرة أخرى.",
            type: "error"
          });
        }
      }
    });
  };

  const renderKPI = (title, value, icon, color) => (
    <Card style={styles.kpiCard} key={title}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}><Ionicons name={icon} size={20} color={color} /></View>
      <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.kpiTitle, { color: theme.colors.textTertiary }]}>{title}</Text>
    </Card>
  );

  const toggleActive = async (id, current) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await setCampaignActive(id, !current);
  };

  const getBackgroundColor = (tpl) => {
    switch (tpl) {
      case 'artisan': return '#f9f6f3';
      case 'cyber': return '#09090E';
      case 'beast': return '#000000';
      case 'elegance': return '#FAF7F2';
      case 'trend': return '#FAFAFA';
      case 'aura': return '#FFF5F5';
      case 'kicks': return '#0F0F11';
      case 'homefix': return '#F0F4F8';
      case 'candy': return '#FFF0F5';
      case 'active': return '#121212';
      case 'crave': return '#FFF8F0';
      case 'lumber': return '#F5F5F0';
      case 'nexus': return '#0A192F';
      default: return '#FFFFFF';
    }
  };

  const renderPreviewTemplate = () => {
    if (!pageConfig.template) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="color-palette-outline" size={64} color="#666" />
          <Text style={{ fontFamily: 'Tajawal_700Bold', fontSize: 20, color: '#333', marginTop: 16 }}>يرجى اختيار قالب أولاً</Text>
        </View>
      );
    }

    const mockCampaign = { sale_price: salePriceNum, products: selectedProduct || {} };
    const templateProps = {
      theme, campaign: mockCampaign, config: getPageConfigData(),
      form: previewForm, setForm: setPreviewForm, selectedWilaya: previewWilaya, setWilayaModal: setPreviewWilayaModal,
      deliveryType: previewDelivery, setDeliveryType: setPreviewDelivery, submit: () => { }, submitting: false, total: salePriceNum + (previewWilaya ? (previewDelivery === 'office' ? previewWilaya.office_delivery_fee : previewWilaya.home_delivery_fee) : 0), deliveryFee: previewWilaya ? (previewDelivery === 'office' ? previewWilaya.office_delivery_fee : previewWilaya.home_delivery_fee) : 0, setFormY: () => { }, isPreview: true
    };

    switch (pageConfig.template) {
      case 'artisan': return <ArtisanTemplate {...templateProps} />;
      case 'cyber': return <CyberTemplate {...templateProps} />;
      case 'elegance': return <EleganceTemplate {...templateProps} />;
      case 'beast': return <BeastTemplate {...templateProps} />;
      case 'trend': return <TrendTemplate {...templateProps} />;
      case 'aura': return <AuraTemplate {...templateProps} />;
      case 'kicks': return <KicksTemplate {...templateProps} />;
      case 'homefix': return <HomeFixTemplate {...templateProps} />;
      case 'candy': return <CandyTemplate {...templateProps} />;
      case 'active': return <ActiveTemplate {...templateProps} />;
      case 'crave': return <CraveTemplate {...templateProps} />;
      case 'lumber': return <LumberTemplate {...templateProps} />;
      case 'nexus': return <NexusTemplate {...templateProps} />;
      case 'supreme': default: return <SupremeTemplate {...templateProps} />;
    }
  };

  const ScrollHintHeader = ({ title }) => (
    <View style={styles.scrollHintContainer}>
      <Text style={[styles.sectionHeadingBuilder, { color: theme.primary, marginBottom: 0 }]}>{title}</Text>
      <View style={styles.scrollHintWrap}>
        <Text style={[styles.scrollHintText, { color: theme.colors.textTertiary }]}>اسحب للمزيد</Text>
        <Ionicons name="arrow-back" size={14} color={theme.colors.textTertiary} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <UniversalHeader title="روابط البيع" subtitle="إدارة وتتبع صفحات الهبوط التسويقية" leftAction={<TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={styles.backBtn}><Ionicons name="arrow-forward" size={24} color="#FFF" /></TouchableOpacity>} />

      <FlatList
        data={campaigns} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} refreshing={isLoading} onRefresh={load}
        ListHeaderComponent={
          <View>
            <Text style={[styles.hint, { color: theme.colors.textSecondary, marginBottom: spacing.md }]}>صمم صفحات هبوط عالية التحويل بنقرة واحدة.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiContainer}>
              {renderKPI("صفحات نشطة", activeCount, "link", theme.primary)}
              {renderKPI("إجمالي الطلبات", totalOrders, "cart", "#6C5CE7")}
              {renderKPI("الأرباح المحققة", formatCurrency(totalProfit), "cash", "#00B894")}
            </ScrollView>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>صفحات الهبوط الخاصة بك</Text>
          </View>
        }
        ListEmptyComponent={isLoading ? <LoadingSpinner /> : <EmptyState icon="rocket-outline" title="لا توجد صفحات هبوط بعد" message="قم بإنشاء أول صفحة هبوط لمنتج لتبدأ في جلب المبيعات." />}
        renderItem={({ item }) => {
          const link = generateCampaignLink(item.slug);
          const pname = item.products?.name || "منتج";
          const campaignOrders = orders.filter(o => o.campaign_slug === item.slug);
          const campaignProfit = campaignOrders.filter(o => o.status === 'delivered').length * (Number(item.sale_price) - Number(item.products?.price || 0));
          const config = typeof item.page_config === 'string' ? JSON.parse(item.page_config) : (item.page_config || {});
          const tplObj = TEMPLATES_DATA.find(t => t.id === config.template) || { name: 'قالب كلاسيكي' };

          return (
            <Card style={styles.campaignCard} accentColor={item.is_active ? theme.primary : theme.colors.textTertiary} accentPosition="left">
              <View style={styles.cardMain}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>{pname}</Text>
                    <View style={styles.slugRow}>
                      <Ionicons name="link" size={14} color={theme.colors.textTertiary} />
                      <Text style={[styles.slugText, { color: theme.colors.textTertiary }]}>/c/{item.slug}</Text>
                      <View style={[styles.templateBadge, { backgroundColor: theme.colors.surface2 }]}><Text style={[styles.templateBadgeText, { color: theme.colors.textSecondary }]}>{tplObj.name}</Text></View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Badge label={item.is_active ? "نشط" : "متوقف"} variant={item.is_active ? "success" : "neutral"} />
                    <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}><Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.iconBtn}><Ionicons name="trash-outline" size={20} color={theme.error} /></TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.priceMatrix, { backgroundColor: theme.colors.surface2 }]}>
                  <View style={styles.priceItem}><Text style={styles.priceLabel}>المتجر</Text><Text style={styles.priceValue}>{formatCurrency(item.products?.price || 0)}</Text></View>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceItem}><Text style={styles.priceLabel}>البيع</Text><Text style={[styles.priceValue, { color: theme.primary }]}>{formatCurrency(item.sale_price)}</Text></View>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceItem}><Text style={styles.priceLabel}>الربح/قطعة</Text><Text style={[styles.priceValue, { color: "#00B894" }]}>{formatCurrency(Number(item.sale_price) - Number(item.products?.price || 0))}</Text></View>
                </View>

                <View style={styles.cardStats}>
                  <View style={styles.statMini}><Ionicons name="cart-outline" size={16} color={theme.colors.textSecondary} /><Text style={styles.statMiniText}>{campaignOrders.length} طلب</Text></View>
                  <View style={styles.statMini}><Ionicons name="cash-outline" size={16} color="#00B894" /><Text style={[styles.statMiniText, { color: "#00B894" }]}>{formatCurrency(campaignProfit)} ربح</Text></View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceElevated }]} onPress={() => toggleActive(item.id, item.is_active)}>
                    <Ionicons name={item.is_active ? "pause-circle-outline" : "play-circle-outline"} size={20} color={item.is_active ? theme.error : theme.primary} />
                    <Text style={[styles.actionBtnText, { color: item.is_active ? theme.error : theme.primary }]}>{item.is_active ? "توقيف" : "تفعيل"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1.5 }} activeOpacity={0.85} onPress={() => Share.share({ message: `تفضل بزيارة الرابط للطلب:\n${link}`, url: link })}>
                    <LinearGradient colors={item.is_active ? ["#00B894", "#00CEA9"] : ["#9CA3AF", "#D1D5DB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareGradient}>
                      <Ionicons name="share-social-outline" size={20} color="#FFF" />
                      <Text style={styles.shareBtnText}>مشاركة الصفحة</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        }}
      />

      <BottomSheet
        visible={modalOpen}
        onClose={() => { setModalOpen(false); setStep(1); }}
        title={step === 1 ? (editingCampaignId ? "تعديل الرابط الأساسي" : "إعدادات الرابط الأساسية") : "تصميم صفحة الهبوط"}
        subtitle={step === 1 ? "اختر المنتج، حدد سعرك التسويقي" : "اختر القالب وخصص النصوص بالكامل لتناسب منتجك"}
        scrollable={false}
      >
        <View style={{ flexShrink: 1, maxHeight: 750, width: '100%' }}>
          <ScrollView
            style={{ flexShrink: 1, width: '100%' }}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm }}
            showsVerticalScrollIndicator={false}
          >
            {step === 1 ? (
              <View>
                {publishedProducts.length > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                    <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>{editingCampaignId ? "المنتج المحدد (مقفل أثناء التعديل)" : "اختر المنتج من المتجر"}</Text>
                  </View>
                )}

                {publishedProducts.length === 0 && !editingCampaignId ? (
                  <View style={[styles.tipBox, { backgroundColor: theme.colors.surface2, marginBottom: spacing.md }]}><Ionicons name="alert-circle-outline" size={22} color={theme.colors.textSecondary} /><Text style={{ fontFamily: 'Tajawal_500Medium', color: theme.colors.textSecondary, fontSize: 14, flex: 1 }}>لا توجد منتجات منشورة حالياً في المتجر للترويج لها.</Text></View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }} style={{ maxHeight: 70, marginBottom: spacing.sm }}>
                    {(editingCampaignId ? [selectedProduct].filter(Boolean) : publishedProducts).map((p) => (
                      <TouchableOpacity key={p.id} disabled={!!editingCampaignId} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setProductId(p.id); setSalePrice(String(Number(p.price))); setModalError(""); }} style={[styles.productChip, { borderColor: productId === p.id ? theme.primary : theme.colors.border, backgroundColor: productId === p.id ? theme.primary + "15" : "transparent", opacity: editingCampaignId ? 0.8 : 1 }]}>
                        <Text style={{ color: productId === p.id ? theme.primary : theme.colors.text, fontSize: 15, fontFamily: productId === p.id ? 'Tajawal_800ExtraBold' : 'Tajawal_500Medium' }} numberOfLines={1}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <View style={{ gap: spacing.sm, opacity: (publishedProducts.length === 0 && !editingCampaignId) ? 0.5 : 1 }} pointerEvents={(publishedProducts.length === 0 && !editingCampaignId) ? 'none' : 'auto'}>
                  <Input label="سعر البيع المقترح لزبائنك (DZD)" value={salePrice} onChangeText={(t) => { setSalePrice(t); setModalError(""); }} keyboardType="decimal-pad" placeholder="مثال: 4500" icon="pricetag-outline" />
                  {selectedProduct && salePriceNum > 0 && (
                    <View style={[styles.profitCalc, { backgroundColor: commissionProfit > 0 ? "#00B89408" : "#FF6B6B08", borderColor: commissionProfit > 0 ? "#00B89420" : "#FF6B6B20" }]}>
                      <View style={[styles.profitBadge, { backgroundColor: commissionProfit > 0 ? "#00B894" : "#FF6B6B" }]}><Ionicons name={commissionProfit > 0 ? "trending-up" : "alert-circle"} size={20} color="#FFF" /></View>
                      <View style={{ flex: 1, marginStart: 12 }}>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 13, fontFamily: "Tajawal_500Medium" }}>{commissionProfit > 0 ? "صافي عمولتك لكل طلب" : "السعر يجب أن يغطي سعر المورد"}</Text>
                        <Text style={{ color: commissionProfit > 0 ? "#00B894" : "#FF6B6B", fontFamily: "Tajawal_800ExtraBold", fontSize: 26 }}>{commissionProfit > 0 ? formatCurrency(commissionProfit) : "---"}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}><Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>سعر المورد</Text><Text style={{ fontSize: 16, fontFamily: 'Tajawal_700Bold', color: theme.colors.textSecondary }}>{formatCurrency(basePrice)}</Text></View>
                    </View>
                  )}
                  <Input label="معرف الرابط المخصص" value={slug} onChangeText={(t) => { setSlug(t.toLowerCase()); setModalError(""); }} placeholder="مثال: offer-summer" icon="at-outline" />
                </View>
              </View>
            ) : (
              <View>
                <View style={[styles.guideBox, { backgroundColor: theme.isDark ? '#3b2f15' : '#FFFBEB', borderColor: theme.isDark ? '#b45309' : '#FDE68A' }]}>
                  <Ionicons name="bulb" size={32} color="#F59E0B" />
                  <View style={{ flex: 1, marginRight: 14 }}>
                    <Text style={[styles.guideTitle, { color: theme.isDark ? '#FDE68A' : '#92400E' }]}>دليل ذكي لاختيار القالب</Text>
                    <Text style={[styles.guideText, { color: theme.isDark ? '#fcd34d' : '#B45309' }]}>تطابق تصميم الصفحة مع منتجك يرفع نسبة التحويل والمبيعات بشكل كبير.</Text>
                  </View>
                </View>

                <ScrollHintHeader title="تصنيف القالب" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                  {TEMPLATE_CATEGORIES.map(cat => {
                    const isSelected = selectedTemplateCat === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setSelectedTemplateCat(cat.id);
                        }}
                        style={[styles.catChip, { backgroundColor: isSelected ? theme.primary : theme.colors.surface2, borderColor: isSelected ? theme.primary : theme.colors.border }]}
                      >
                        <Ionicons name={cat.icon} size={18} color={isSelected ? '#FFF' : theme.colors.textSecondary} />
                        <Text style={[styles.catChipText, { color: isSelected ? '#FFF' : theme.colors.textSecondary }]}>{cat.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <ScrollHintHeader title="اختر القالب الأنسب" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 20 }} style={{ marginBottom: 10 }}>
                  {TEMPLATES_DATA.filter(t => selectedTemplateCat === 'all' || t.category === selectedTemplateCat).map(tpl => {
                    const isSelected = pageConfig.template === tpl.id;
                    return (
                      <TouchableOpacity
                        key={tpl.id}
                        activeOpacity={0.8}
                        onPress={() => { setPageConfig({ ...pageConfig, template: tpl.id }); setModalError(""); }}
                        style={[styles.tplCard, { borderColor: isSelected ? tpl.color : theme.colors.border, backgroundColor: isSelected ? tpl.bg : theme.colors.surface }]}
                      >
                        <View style={styles.tplCardHeader}>
                          <View style={[styles.tplIconWrap, { backgroundColor: tpl.color + '15' }]}><Ionicons name={tpl.icon} size={26} color={tpl.color} /></View>
                          {isSelected ? (
                            <Ionicons name="checkmark-circle" size={28} color={tpl.color} />
                          ) : (
                            <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: theme.colors.border }} />
                          )}
                        </View>
                        <Text style={[styles.tplName, { color: isSelected ? tpl.color : theme.colors.text }]}>{tpl.name}</Text>
                        <Text style={[styles.tplDesc, { color: theme.colors.textSecondary }]}>{tpl.desc}</Text>
                        <View style={[styles.bestForBadge, { backgroundColor: isSelected ? tpl.color + '15' : theme.colors.surface2 }]}>
                          <Text style={[styles.bestForText, { color: isSelected ? tpl.color : theme.colors.textTertiary }]} numberOfLines={2}>مثالي لـ: {tpl.bestFor}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.sectionHeadingBuilder, { color: theme.primary, marginTop: spacing.sm }]}>صور المنتج (اختياري)</Text>
                <Text style={{ fontFamily: 'Tajawal_500Medium', color: theme.colors.textTertiary, fontSize: 13, marginBottom: 12 }}>إضافة صور متعددة تنشئ معرضاً تفاعلياً (Carousel) في الصفحة.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
                  {imageUris.map((uri, index) => (
                    <View key={index} style={styles.imageEditThumb}>
                      <Image 
                        source={{ uri }} 
                        style={styles.imageEditImg} 
                        contentFit="cover"
                        transition={200}
                      />
                      <TouchableOpacity onPress={() => removeImage(index)} style={styles.removeImgBtn}><Ionicons name="close-circle" size={22} color={theme.error} /></TouchableOpacity>
                    </View>
                  ))}
                  {imageUris.length < 8 && (
                    <TouchableOpacity onPress={pickImages} style={[styles.addImageBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}>
                      <Ionicons name="camera-outline" size={32} color={theme.colors.textTertiary} />
                      <Text style={{ color: theme.colors.textTertiary, fontSize: 12, fontFamily: 'Tajawal_500Medium' }}>إضافة صورة</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                <Text style={[styles.sectionHeadingBuilder, { color: theme.primary }]}>النصوص الأساسية للصفحة</Text>
                <View style={{ gap: 12, marginBottom: 24 }}>
                  <Input label="العنوان الجذاب (Headline)" placeholder="اترك فارغاً للنص الافتراضي (مثال: أداة لا غنى عنها!)" value={pageConfig.headline} onChangeText={(t) => { setPageConfig({ ...pageConfig, headline: t }); setModalError(""); }} />
                  <Input label="الوصف الداعم (Subheadline)" placeholder="شرح مبسط يعزز رغبة الزبون في الشراء..." value={pageConfig.subheadline} onChangeText={(t) => setPageConfig({ ...pageConfig, subheadline: t })} multiline />
                  <Input label="نص زر الطلب (Call to Action)" placeholder="مثال: احصل عليه الآن، اطلب نسختك..." value={pageConfig.btnText} onChangeText={(t) => { setPageConfig({ ...pageConfig, btnText: t }); setModalError(""); }} />
                </View>

                <Text style={[styles.sectionHeadingBuilder, { color: theme.primary }]}>مميزات المنتج (لإقناع الزبون)</Text>
                <View style={{ gap: 16, marginBottom: 20, backgroundColor: theme.colors.surface2, padding: 20, borderRadius: 20 }}>
                  <Text style={styles.featureGroupLabel}>الميزة الأولى</Text>
                  <Input placeholder="عنوان الميزة (مثال: جودة مضمونة)" value={pageConfig.f1Title} onChangeText={(t) => setPageConfig({ ...pageConfig, f1Title: t })} />
                  <Input placeholder="شرح صغير..." value={pageConfig.f1Desc} onChangeText={(t) => setPageConfig({ ...pageConfig, f1Desc: t })} />
                </View>

                <View style={{ gap: 16, marginBottom: 20, backgroundColor: theme.colors.surface2, padding: 20, borderRadius: 20 }}>
                  <Text style={styles.featureGroupLabel}>الميزة الثانية</Text>
                  <Input placeholder="عنوان الميزة (مثال: توصيل سريع ومجاني)" value={pageConfig.f2Title} onChangeText={(t) => setPageConfig({ ...pageConfig, f2Title: t })} />
                  <Input placeholder="شرح صغير..." value={pageConfig.f2Desc} onChangeText={(t) => setPageConfig({ ...pageConfig, f2Desc: t })} />
                </View>

                <View style={{ gap: 16, marginBottom: 20, backgroundColor: theme.colors.surface2, padding: 20, borderRadius: 20 }}>
                  <Text style={styles.featureGroupLabel}>الميزة الثالثة</Text>
                  <Input placeholder="عنوان الميزة (مثال: الدفع عند الاستلام)" value={pageConfig.f3Title} onChangeText={(t) => setPageConfig({ ...pageConfig, f3Title: t })} />
                  <Input placeholder="شرح صغير..." value={pageConfig.f3Desc} onChangeText={(t) => setPageConfig({ ...pageConfig, f3Desc: t })} />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.fixedFooter, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            {modalError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>{modalError}</Text>
              </View>
            ) : null}

            {step === 1 ? (
              <Button title="التالي: التخصيص والتصميم" variant="gradient" onPress={validateStep1} style={{ width: '100%' }} icon="color-wand-outline" disabled={publishedProducts.length === 0 && !editingCampaignId} />
            ) : (
              <View style={styles.step2Buttons}>
                <Button title="رجوع" variant="outline" onPress={() => { setModalError(""); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setStep(1); }} style={{ flex: 1 }} />
                <Button title="معاينة" variant="primary" onPress={() => { if (!pageConfig.template) { setModalError("يرجى اختيار قالب لتتمكن من المعاينة."); return; } setPreviewVisible(true); }} style={{ flex: 1 }} icon="eye-outline" />
                <Button title={editingCampaignId ? "حفظ التعديلات" : "نشر الرابط"} variant="gradient" loading={saving} onPress={saveCampaign} style={{ flex: 1.5 }} icon={editingCampaignId ? "save-outline" : "rocket-outline"} />
              </View>
            )}
          </View>
        </View>
      </BottomSheet>

      <Modal visible={previewVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPreviewVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: getBackgroundColor(pageConfig.template) }}>
          <View style={{ flex: 1 }}>{renderPreviewTemplate()}</View>
          <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewVisible(false)}>
            <Ionicons name="close-circle" size={24} color="#FFF" />
            <Text style={styles.closePreviewText}>إنهاء المعاينة</Text>
          </TouchableOpacity>

          <BottomSheet
            visible={previewWilayaModal}
            onClose={() => setPreviewWilayaModal(false)}
            title="اختر الولاية (نسخة تجريبية)"
            sheetStyle={{ backgroundColor: FORM_THEMES[pageConfig.template]?.bg[0] || '#FFFFFF' }}
            titleStyle={{ color: FORM_THEMES[pageConfig.template]?.text || '#000000' }}
            closeBtnStyle={{ backgroundColor: FORM_THEMES[pageConfig.template]?.border || '#E5E7EB' }}
            closeIconColor={FORM_THEMES[pageConfig.template]?.text || '#000000'}
            scrollable={false}
          >
            <View style={{ gap: 0, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, height: 500 }}>
              <View style={[{ flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, marginBottom: 20, borderColor: FORM_THEMES[pageConfig.template]?.border, backgroundColor: FORM_THEMES[pageConfig.template]?.bg[0] }]}>
                <Ionicons name="search" size={22} color={FORM_THEMES[pageConfig.template]?.sub || theme.colors.textTertiary} />
                <TextInput
                  style={[{ flex: 1, textAlign: 'left', fontFamily: 'Tajawal_500Medium', fontSize: 16, color: FORM_THEMES[pageConfig.template]?.text || theme.colors.text, paddingHorizontal: 12 }]}
                  placeholder="ابحث عن ولايتك (الاسم أو الرمز)..."
                  placeholderTextColor={FORM_THEMES[pageConfig.template]?.sub ? FORM_THEMES[pageConfig.template].sub + '80' : undefined}
                  value={previewWilayaSearch}
                  onChangeText={setPreviewWilayaSearch}
                  autoCorrect={false}
                />
                {previewWilayaSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPreviewWilayaSearch("")} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={22} color={FORM_THEMES[pageConfig.template]?.sub || theme.colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={filteredPreviewWilayas}
                keyExtractor={(w) => w.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                style={{ flex: 1 }}
                ListEmptyComponent={() => {
                  const templateTheme = FORM_THEMES[pageConfig.template];
                  return (
                    <View style={{ padding: 40, alignItems: 'center', opacity: 0.7 }}>
                      <MaterialCommunityIcons name="map-search-outline" size={48} color={templateTheme?.sub || theme.colors.textSecondary} />
                      <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 16, color: templateTheme?.sub || theme.colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                        عذراً، لم نتمكن من العثور على الولاية.
                      </Text>
                    </View>
                  );
                }}
                renderItem={({ item: w }) => {
                  const isSelected = previewWilaya?.id === w.id;
                  const templateTheme = FORM_THEMES[pageConfig.template];
                  const itemColor = templateTheme?.text || '#000000';
                  return (
                    <TouchableOpacity
                      style={[{
                        borderBottomWidth: 1,
                        borderBottomColor: templateTheme?.border || theme.colors.border,
                        backgroundColor: isSelected ? (templateTheme?.input || theme.colors.primary + '20') : 'transparent',
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 18,
                        paddingHorizontal: 16,
                        borderRadius: 16,
                        marginBottom: 8
                      }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setPreviewWilaya(w);
                        setTimeout(() => {
                          setPreviewWilayaModal(false);
                          setPreviewWilayaSearch("");
                        }, 150);
                      }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: templateTheme?.input || theme.colors.surface, alignItems: 'center', justifyContent: 'center', elevation: 0 }}>
                        <Ionicons name="location" size={20} color={itemColor} />
                      </View>
                      <View style={{ flex: 1, marginHorizontal: 16, alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 18, fontFamily: isSelected ? 'Tajawal_700Bold' : 'Tajawal_500Medium', color: itemColor, textAlign: 'left' }}>
                          {w.code} - {w.name}
                        </Text>
                        <Text style={{ color: templateTheme?.sub || theme.colors.textTertiary, fontFamily: 'Tajawal_500Medium', fontSize: 14, textAlign: 'left', marginTop: 6 }}>
                          توصيل للمكتب: {w.office_delivery_fee} دج • للمنزل: {w.home_delivery_fee} دج
                        </Text>
                      </View>
                      <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                        {isSelected && <Ionicons name="checkmark-circle" size={28} color={templateTheme?.primary || theme.primary} />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </BottomSheet>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backBtn: { padding: 4 },
  formContainer: { paddingVertical: spacing.sm },
  hint: { ...typography.caption, paddingHorizontal: spacing.md },
  list: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 100 },
  sectionTitle: { ...typography.h3, marginTop: spacing.lg, marginBottom: spacing.md },
  kpiContainer: { gap: spacing.sm, paddingRight: spacing.md },
  kpiCard: { width: 140, padding: spacing.md, alignItems: 'center' },
  kpiIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 16, fontFamily: 'Tajawal_800ExtraBold', marginBottom: 2 },
  kpiTitle: { fontSize: 10, fontFamily: 'Tajawal_500Medium' },
  campaignCard: { marginBottom: spacing.md, padding: 0, overflow: 'hidden' },
  cardMain: { padding: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  productName: { ...typography.h3, fontSize: 18, marginBottom: 6 },
  slugRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slugText: { fontSize: 12, fontFamily: 'Tajawal_500Medium' },
  templateBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  templateBadgeText: { fontSize: 10, fontFamily: 'Tajawal_700Bold' },
  iconBtn: { padding: 6, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8 },
  priceMatrix: { flexDirection: 'row', padding: 12, borderRadius: 12, marginBottom: 16 },
  priceItem: { flex: 1, alignItems: 'center' },
  priceDivider: { width: 1, height: '100%', backgroundColor: 'rgba(0,0,0,0.05)' },
  priceLabel: { fontSize: 11, fontFamily: 'Tajawal_500Medium', color: '#94A3B8', marginBottom: 4 },
  priceValue: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  cardStats: { flexDirection: 'row', gap: 16, marginBottom: 16, paddingHorizontal: 4 },
  statMini: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statMiniText: { fontSize: 13, fontFamily: 'Tajawal_700Bold', color: '#64748B' },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, height: 48 },
  actionBtnText: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  shareGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, height: 48 },
  shareBtnText: { fontSize: 14, fontFamily: 'Tajawal_700Bold', color: '#FFF' },
  modalLabel: { ...typography.caption, fontSize: 15, marginBottom: 0 },
  productChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, maxWidth: 220 },
  profitCalc: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, marginTop: spacing.xs, marginBottom: spacing.md },
  profitBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tipBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: 12 },
  sectionHeadingBuilder: { fontSize: 18, fontFamily: 'Tajawal_800ExtraBold', marginBottom: 14, marginTop: 12 },
  featureGroupLabel: { fontSize: 14, fontFamily: 'Tajawal_700Bold', color: '#64748B', marginBottom: -4, marginTop: 4 },
  step2Buttons: { flexDirection: 'row', gap: 10 },
  closePreviewBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  closePreviewText: { color: '#FFF', fontFamily: 'Tajawal_800ExtraBold', fontSize: 16 },

  // Smart Guide & Templates UX Styles
  guideBox: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  guideTitle: { fontSize: 16, fontFamily: 'Tajawal_800ExtraBold', marginBottom: 6 },
  guideText: { fontSize: 14, fontFamily: 'Tajawal_500Medium', lineHeight: 22 },
  scrollHintContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, marginTop: 8 },
  scrollHintWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 4 },
  scrollHintText: { fontFamily: 'Tajawal_500Medium', fontSize: 13 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20, borderWidth: 1, gap: 8 },
  catChipText: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  tplCard: { width: 180, padding: 18, borderRadius: 20, borderWidth: 2, marginRight: 0 },
  tplCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  tplIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tplName: { fontSize: 18, fontFamily: 'Tajawal_800ExtraBold', marginBottom: 6 },
  tplDesc: { fontSize: 13, fontFamily: 'Tajawal_500Medium', marginBottom: 16, lineHeight: 18 },
  bestForBadge: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  bestForText: { fontSize: 10, fontFamily: 'Tajawal_700Bold' },

  // Fixed Footer & Error Handling
  fixedFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B3015', // Soft Red Background
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 14,
    flex: 1,
    textAlign: 'right'
  }
});