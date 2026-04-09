import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Platform, 
  KeyboardAvoidingView, TouchableOpacity, FlatList, TextInput,
  useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../src/theme/theme';
import Input from '../src/components/ui/Input';
import Button from '../src/components/ui/Button';
import BottomSheet from '../src/components/ui/BottomSheet';
import Card from '../src/components/ui/Card';
import { formatCurrency } from '../src/lib/utils';
import { useOrderStore } from '../src/stores/useOrderStore';
import { useStoreStore } from '../src/stores/useStoreStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useAffiliateStore } from '../src/stores/useAffiliateStore';
import { supabase } from '../src/lib/supabase';
import { useWilayaStore } from '../src/stores/useWilayaStore';
import { DELIVERY_TYPES_AR } from '../src/lib/constants';
import { usePlatformSettingsStore } from '../src/stores/usePlatformSettingsStore';
import CustomAlert from '../src/components/ui/CustomAlert';

/**
 * Premium Order Submission Screen.
 * Forest/Mint theme, streamlined for high conversion.
 * Fully responsive for Mobile, Tablet, and Web.
 */
export default function SubmitOrderScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;

  const { productId, productName, productPrice, commissionRate, campaignId, salePrice: salePriceParam, storeId } = useLocalSearchParams();
  
  const { createOrder } = useOrderStore();
  const currentStore = useStoreStore((s) => s.currentStore);
  const profile = useAuthStore((s) => s.profile);
  const affiliateProfile = useAffiliateStore((s) => s.affiliateProfile);
  const fetchAffiliateProfile = useAffiliateStore((s) => s.fetchAffiliateProfile);
  const { wilayas, fetchWilayas, getDeliveryFee } = useWilayaStore();
  const fetchPlatformSettings = usePlatformSettingsStore((s) => s.fetchSettings);
  const platformFee = usePlatformSettingsStore((s) => s.getFees().platform_fee);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    commune: '',
    address: '',
    notes: '',
  });
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [deliveryType, setDeliveryType] = useState('home');
  const [wilayaPickerVisible, setWilayaPickerVisible] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [customSalePrice, setCustomSalePrice] = useState('');
  
  // Custom Alert state
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'error' });

  useEffect(() => {
    fetchWilayas();
    fetchPlatformSettings();
  }, [fetchWilayas, fetchPlatformSettings]);

  const parsedBasePrice = parseFloat(productPrice) || 0;
  const parsedSaleOverride = salePriceParam != null && salePriceParam !== '' ? parseFloat(salePriceParam) : null;

  useEffect(() => {
    if (parsedSaleOverride) {
      setCustomSalePrice(parsedSaleOverride.toString());
    } else {
      setCustomSalePrice(parsedBasePrice.toString());
    }
  }, [parsedSaleOverride, parsedBasePrice]);

  useEffect(() => {
    async function loadAffiliate() {
      const targetStoreId = storeId || profile?.store_id;
      if (!affiliateProfile && targetStoreId) {
        await fetchAffiliateProfile(targetStoreId);
      }
    }
    loadAffiliate();
  }, [storeId, profile?.store_id, affiliateProfile, fetchAffiliateProfile]);

  const resolvedProductId = Array.isArray(productId) ? productId[0] : productId;

  const [loadedCampaign, setLoadedCampaign] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function loadCampaign() {
      const cid = Array.isArray(campaignId) ? campaignId[0] : campaignId;
      if (!cid) {
        setLoadedCampaign(null);
        return;
      }
      const { data, error: ce } = await supabase
        .from('marketing_campaigns')
        .select('id, sale_price, product_id, affiliate_id')
        .eq('id', cid)
        .eq('is_active', true)
        .maybeSingle();
      if (!cancelled) {
        if (ce || !data || data.product_id !== resolvedProductId) {
          setLoadedCampaign(null);
        } else {
          setLoadedCampaign(data);
        }
      }
    }
    loadCampaign();
    return () => { cancelled = true; };
  }, [campaignId, resolvedProductId]);

  useEffect(() => {
    if (loadedCampaign && affiliateProfile?.id && loadedCampaign.affiliate_id !== affiliateProfile.id) {
      setLoadedCampaign(null);
    }
  }, [affiliateProfile?.id, loadedCampaign]);

  const deliveryFee = selectedWilaya ? getDeliveryFee(selectedWilaya.id, deliveryType) : 0;
  const salePrice = useMemo(() => {
    if (customSalePrice !== '') return parseFloat(customSalePrice) || 0;
    if (loadedCampaign?.sale_price != null) return Number(loadedCampaign.sale_price);
    if (parsedSaleOverride != null && !Number.isNaN(parsedSaleOverride)) return parsedSaleOverride;
    return parsedBasePrice;
  }, [customSalePrice, loadedCampaign, parsedSaleOverride, parsedBasePrice]);
  const totalForCustomer = salePrice + deliveryFee;

  const profit = salePrice - parsedBasePrice;
  const profitPercentage = parsedBasePrice > 0 ? (profit / parsedBasePrice) * 100 : 0;

  const filteredWilayas = useMemo(() => wilayas.filter(w => {
    if (!wilayaSearch) return true;
    const q = wilayaSearch.toLowerCase();
    return w.name.includes(wilayaSearch) || (w.name_fr || '').toLowerCase().includes(q) || w.code.includes(q);
  }), [wilayas, wilayaSearch]);

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !selectedWilaya || !form.commune) {
      setAlertConfig({ visible: true, title: 'بيانات ناقصة', message: 'يرجى ملء جميع الحقول المطلوبة (الاسم، الهاتف، الولاية والبلدية).', type: 'error' });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    const finalStoreId = storeId || currentStore?.id || profile?.store_id;

    if (!finalStoreId) {
      setAlertConfig({ visible: true, title: 'خطأ في النظام', message: 'فشل العثور على المتجر المعني. يرجى إعادة تسجيل الدخول.', type: 'error' });
      setLoading(false);
      return;
    }

    let finalAffiliateProfile = affiliateProfile;
    if (finalStoreId && (!finalAffiliateProfile || finalAffiliateProfile.store_id !== finalStoreId)) {
      const res = await fetchAffiliateProfile(finalStoreId);
      if (res.success) finalAffiliateProfile = res.data;
    }
    
    const cid = loadedCampaign?.id || (Array.isArray(campaignId) ? campaignId[0] : campaignId) || null;
    const orderData = {
      store_id: finalStoreId,
      affiliate_id: finalAffiliateProfile?.id || null,
      referral_code: finalAffiliateProfile?.referral_code || null,
      customer_name: form.name,
      customer_phone: form.phone,
      wilaya: selectedWilaya.name,
      wilaya_id: selectedWilaya.id,
      commune: form.commune,
      customer_address: form.address,
      notes: form.notes,
      total: totalForCustomer,
      base_price: parsedBasePrice,
      sale_price: salePrice,
      delivery_fee: deliveryFee,
      delivery_type: deliveryType,
      status: 'pending',
      tracking_status: 'pending',
      ...(cid ? { marketing_campaign_id: cid } : {}),
    };

    const orderItems = [
      {
        product_id: resolvedProductId,
        product_name: productName,
        quantity: 1,
        unit_price: parsedBasePrice,
      }
    ];

    const res = await createOrder(orderData, orderItems);
    setLoading(false);
    
    if (res.success) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(affiliate)/store');
      }
    } else {
      setAlertConfig({ visible: true, title: 'فشل الإرسال', message: res.error || 'حدث خطأ أثناء إرسال الطلب. حاول مجددا.', type: 'error' });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          
          {/* Universal Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity 
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(affiliate)/store')} 
              style={styles.closeBtn}
            >
               <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>تقديم طلب جديد</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView 
            contentContainerStyle={[styles.scroll, isWeb && styles.webScrollContainer]} 
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1: Product Summary & Pricing */}
            <Card style={styles.productCard} accentColor={theme.primary} accentPosition="top">
              <View style={styles.productHeader}>
                 <View style={[styles.productIcon, { backgroundColor: theme.primary + '10' }]}>
                    <Ionicons name="basket" size={24} color={theme.primary} />
                 </View>
                 <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={[styles.productNameText, { color: theme.colors.text }]}>{productName}</Text>
                    <Text style={[styles.productCategory, { color: theme.colors.textTertiary }]}>المنتج المحدد</Text>
                 </View>
                 <Text style={[styles.mainPrice, { color: theme.primary }]}>{formatCurrency(salePrice)}</Text>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />

              <View style={styles.priceDetails}>
                 <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>سعر الجملة (الأساسي)</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>{formatCurrency(parsedBasePrice)}</Text>
                 </View>

                 {profile?.role === 'affiliate' && (
                   <View style={[styles.affiliatePriceBox, { backgroundColor: theme.primary + '05', borderColor: theme.primary + '20' }]}>
                      <View style={styles.inputRow}>
                        <Text style={[styles.detailLabel, { color: theme.primary, fontFamily: 'Tajawal_700Bold' }]}>سعر البيع للزبون (DZD):</Text>
                        <View style={[styles.priceInputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                          <TextInput
                            style={[styles.priceInput, { color: theme.colors.text }]}
                            value={customSalePrice}
                            onChangeText={setCustomSalePrice}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.textTertiary}
                          />
                          <Ionicons name="pencil" size={14} color={theme.colors.textTertiary} style={{ marginEnd: 8 }} />
                        </View>
                      </View>
                      
                      <View style={[styles.detailRow, { marginTop: 12 }]}>
                         <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                           <Ionicons name="trending-up" size={16} color="#00B894" style={{ marginStart: 4 }} />
                           <Text style={[styles.detailLabel, { color: theme.colors.textSecondary, fontFamily: 'Tajawal_700Bold' }]}>العمولة الصافية:</Text>
                         </View>
                         <Text style={[styles.profitValue, { color: '#00B894' }]}>{formatCurrency(profit)} <Text style={{ fontSize: 12 }}>({profitPercentage.toFixed(1)}%)</Text></Text>
                      </View>

                      {/* Profit Guide */}
                      <View style={[styles.profitGuide, { backgroundColor: profitPercentage > 40 ? '#FFF5F5' : '#F0FFF4' }]}>
                        <Ionicons 
                          name={profitPercentage > 40 ? "alert-circle" : "bulb-outline"} 
                          size={16} 
                          color={profitPercentage > 40 ? "#FF6B6B" : "#38A169"} 
                        />
                        <Text style={[styles.guideText, { color: profitPercentage > 40 ? "#C53030" : "#2F855A" }]}>
                          {profitPercentage > 40 
                            ? "تنبيه: هامش الربح مرتفع جداً قد يؤدي لرفض الطلب من الزبون." 
                            : profitPercentage < 10 && profit > 0
                            ? "نصيحة: هامش الربح قليل، تأكد من تغطية جهدك التسويقي."
                            : profit <= 0 
                            ? "خطأ: سعر البيع يجب أن يكون أعلى من سعر الجملة."
                            : "ممتاز: هذا الهامش متوازن ويشجع على إتمام الطلبات."}
                        </Text>
                      </View>
                   </View>
                 )}

                 <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>رسوم التوصيل ({DELIVERY_TYPES_AR[deliveryType]})</Text>
                    <Text style={[styles.detailValue, { color: '#00CEC9' }]}>+{formatCurrency(deliveryFee)}</Text>
                 </View>
                 
                 <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
                    <Text style={[styles.totalLabel, { color: theme.colors.text }]}>المبلغ الإجمالي للدفع</Text>
                    <Text style={[styles.totalValue, { color: theme.primary }]}>{formatCurrency(totalForCustomer)}</Text>
                 </View>
              </View>
            </Card>

            {/* Section 2: Customer Identity */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>معلومات الزبون</Text>
            <Card style={styles.formCard}>
               <Input 
                 label="الاسم الكامل *" 
                 value={form.name} 
                 onChangeText={(t) => setForm({ ...form, name: t })} 
                 placeholder="اسم الزبون بالكامل"
                 icon="person-outline"
               />
               <Input 
                 label="رقم الهاتف *" 
                 value={form.phone} 
                 onChangeText={(t) => setForm({ ...form, phone: t })} 
                 placeholder="05 / 06 / 07 -- -- --" 
                 keyboardType="phone-pad"
                 icon="call-outline"
               />
            </Card>

            {/* Section 3: Shipping & Delivery */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>الشحن والتوصيل</Text>
            <Card style={styles.formCard}>
               <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>الولاية الموجه إليها الطلب *</Text>
               <TouchableOpacity
                 style={[styles.pickerBtn, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }]}
                 onPress={() => setWilayaPickerVisible(true)}
                 activeOpacity={0.7}
               >
                 <View style={styles.pickerInner}>
                    <Ionicons name="location-outline" size={20} color={theme.primary} />
                    <Text style={[styles.pickerText, { color: selectedWilaya ? theme.colors.text : theme.colors.textTertiary }]}>
                      {selectedWilaya ? `${selectedWilaya.code} - ${selectedWilaya.name}` : 'اختر الولاية من القائمة...'}
                    </Text>
                 </View>
                 <Ionicons name="chevron-down" size={18} color={theme.colors.textTertiary} />
               </TouchableOpacity>

               <Input 
                 label="البلدية *"
                 value={form.commune} 
                 onChangeText={(t) => setForm({ ...form, commune: t })} 
                 placeholder="ادخل اسم البلدية..." 
                 icon="map-outline"
               />

               <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>خيار التوصيل *</Text>
               <View style={styles.deliveryToggle}>
                 {['home', 'office'].map(type => {
                   const isActive = deliveryType === type;
                   const fee = selectedWilaya ? getDeliveryFee(selectedWilaya.id, type) : 0;
                   return (
                     <TouchableOpacity
                       key={type}
                       style={[styles.deliveryOption, { 
                         backgroundColor: isActive ? theme.primary + '08' : theme.colors.surface2,
                         borderColor: isActive ? theme.primary : theme.colors.border
                       }]}
                       onPress={() => setDeliveryType(type)}
                       activeOpacity={0.8}
                     >
                       <View style={styles.deliveryOptionTop}>
                         <Ionicons name={type === 'home' ? 'home-outline' : 'business-outline'} size={24} color={isActive ? theme.primary : theme.colors.textTertiary} />
                         <View style={[styles.radioCircle, { borderColor: isActive ? theme.primary : theme.colors.border }]}>
                           {isActive && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                         </View>
                       </View>
                       <View style={{ marginTop: 8 }}>
                         <Text style={[styles.optionLabel, { color: isActive ? theme.colors.text : theme.colors.textSecondary }]}>{DELIVERY_TYPES_AR[type]}</Text>
                         <Text style={[styles.optionFee, { color: isActive ? theme.primary : theme.colors.textTertiary }]}>{formatCurrency(fee)}</Text>
                       </View>
                     </TouchableOpacity>
                   );
                 })}
               </View>

               <Input 
                 label="العنوان التفصيلي (اختياري)" 
                 value={form.address} 
                 onChangeText={(t) => setForm({ ...form, address: t })} 
                 placeholder="رقم المنزل، اسم الحي، معلم قريب..." 
                 multiline 
                 numberOfLines={2} 
                 icon="navigate-outline"
               />
               
               <Input 
                 label="ملاحظات لشركة التوصيل (اختياري)" 
                 value={form.notes} 
                 onChangeText={(t) => setForm({ ...form, notes: t })} 
                 placeholder="مثلاً: الاتصال قبل الوصول بـ 30 دقيقة" 
                 multiline 
                 numberOfLines={2}
                 icon="chatbox-ellipses-outline"
               />
            </Card>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Sticky Footer for Checkout */}
          <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
             <View style={[styles.footerInner, isWeb && styles.webFooterInner]}>
               <Button 
                 title="تأكيد الطلب وإرساله" 
                 onPress={handleSubmit} 
                 loading={loading} 
                 icon="paper-plane-outline" 
                 style={styles.submitButton}
                 textStyle={{ fontSize: 16 }}
               />
             </View>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Wilaya Picker Bottom Sheet */}
      <BottomSheet
        visible={wilayaPickerVisible}
        onClose={() => setWilayaPickerVisible(false)}
        title="اختر الولاية"
        subtitle="سيتم تحديث رسوم التوصيل تلقائياً"
      >
        <View style={styles.sheetContainer}>
          <View style={[styles.searchBox, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }]}>
             <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
             <TextInput 
               style={[styles.searchInput, { color: theme.colors.text }]} 
               placeholder="بحث سريع بالاسم أو الرقم..." 
               placeholderTextColor={theme.colors.textTertiary}
               value={wilayaSearch}
               onChangeText={setWilayaSearch}
             />
          </View>

          <FlatList
            data={filteredWilayas}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled
            renderItem={({ item }) => {
              const isSelected = selectedWilaya?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.wilayaItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    setSelectedWilaya(item);
                    setWilayaPickerVisible(false);
                    setWilayaSearch('');
                  }}
                >
                  <View style={[styles.wilayaId, { backgroundColor: isSelected ? theme.primary : theme.colors.surface2 }]}>
                     <Text style={{ color: isSelected ? '#FFF' : theme.colors.text, fontFamily: 'Tajawal_700Bold' }}>{item.code}</Text>
                  </View>
                  <Text style={[styles.wilayaName, { color: theme.colors.text, fontFamily: isSelected ? 'Tajawal_700Bold' : 'Tajawal_500Medium' }]}>{item.name}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
                </TouchableOpacity>
              );
            }}
            style={{ maxHeight: isWeb ? 300 : 400 }}
          />
        </View>
      </BottomSheet>

      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={() => setAlertConfig(p => ({ ...p, visible: false }))}
        onCancel={() => setAlertConfig(p => ({ ...p, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.bodyBold, fontSize: 18 },
  scroll: { padding: spacing.md },
  webScrollContainer: {
    maxWidth: 768,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm, marginTop: spacing.md, marginStart: 4, textAlign: 'right' },
  
  // Product Card
  productCard: { marginBottom: spacing.xs, padding: spacing.md },
  productHeader: { flexDirection: 'row-reverse', alignItems: 'center' },
  productIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  productNameText: { ...typography.bodyBold, fontSize: 16, textAlign: 'right' },
  productCategory: { fontSize: 12, fontFamily: 'Tajawal_500Medium', marginTop: 2, textAlign: 'right' },
  mainPrice: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 18 },
  summaryDivider: { height: 1, marginVertical: 16 },
  
  // Pricing Details
  priceDetails: { gap: 10 },
  detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  detailValue: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 16, borderTopWidth: 1 },
  totalLabel: { ...typography.bodyBold, fontSize: 16 },
  totalValue: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 22 },
  
  // Affiliate Price Box
  affiliatePriceBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 10,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    width: 130,
    height: 42,
    paddingHorizontal: 8,
  },
  priceInput: {
    flex: 1,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    textAlign: 'center',
    height: '100%',
  },
  profitValue: { fontSize: 16, fontFamily: 'Tajawal_800ExtraBold' },
  profitGuide: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
    gap: 8,
  },
  guideText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right',
  },

  // Form Cards
  formCard: { padding: spacing.md, marginBottom: spacing.xs },
  inputLabel: { ...typography.caption, marginBottom: 8, fontFamily: 'Tajawal_700Bold', marginTop: 4, textAlign: 'right' },
  
  // Custom Picker
  pickerBtn: { 
    height: 54, 
    borderRadius: 14, 
    borderWidth: 1, 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    marginBottom: 16 
  },
  pickerInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  pickerText: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  
  // Delivery Toggle
  deliveryToggle: { flexDirection: 'row-reverse', gap: 12, marginBottom: 20 },
  deliveryOption: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1.5,
  },
  deliveryOptionTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionLabel: { fontSize: 14, fontFamily: 'Tajawal_700Bold', textAlign: 'right', marginTop: 4 },
  optionFee: { fontSize: 12, fontFamily: 'Tajawal_500Medium', textAlign: 'right', marginTop: 2 },
  
  // Footer
  bottomSpacer: { height: 60 },
  footer: { 
    padding: spacing.md, 
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  footerInner: { width: '100%' },
  webFooterInner: {
    maxWidth: 768,
    width: '100%',
    alignSelf: 'center',
  },
  submitButton: { borderRadius: 16, height: 56 },
  
  // Sheet
  sheetContainer: { paddingVertical: spacing.sm },
  searchBox: { flexDirection: 'row-reverse', alignItems: 'center', height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, height: '100%', fontFamily: 'Tajawal_500Medium', textAlign: 'right', fontSize: 15 },
  wilayaItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, gap: 14 },
  wilayaId: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  wilayaName: { flex: 1, fontSize: 16, textAlign: 'right' },
});