import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Share,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';
import { useCampaignStore } from '../../src/stores/useCampaignStore';
import { useProductStore } from '../../src/stores/useProductStore';
import { useAlertStore } from '../../src/stores/useAlertStore';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import EmptyState from '../../src/components/ui/EmptyState';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency, generateCampaignLink } from '../../src/lib/utils';
import Badge from '../../src/components/ui/Badge';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import FAB from '../../src/components/ui/FAB';
import BottomSheet from '../../src/components/ui/BottomSheet';

export default function AffiliateCampaignsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const affiliateProfile = useAffiliateStore((s) => s.affiliateProfile);
  const fetchAffiliateProfile = useAffiliateStore((s) => s.fetchAffiliateProfile);
  const { products, fetchProducts } = useProductStore();
  const {
    campaigns,
    isLoading,
    fetchCampaignsForAffiliate,
    createCampaign,
    setCampaignActive,
  } = useCampaignStore();
  const { showAlert, showConfirm } = useAlertStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);

  const publishedProducts = useMemo(
    () =>
      (products || []).filter((p) => {
        const ls = p.listing_status || 'published';
        return ls === 'published' && p.is_active;
      }),
    [products]
  );

  // Computed: selected product base price and commission
  const selectedProduct = publishedProducts.find(p => p.id === productId);
  const basePrice = selectedProduct ? Number(selectedProduct.price) : 0;
  const salePriceNum = parseFloat(salePrice) || 0;
  const commissionProfit = salePriceNum > basePrice ? salePriceNum - basePrice : 0;

  const load = useCallback(async () => {
    // 1. Fetch ALL campaigns globally
    await fetchCampaignsForAffiliate();
    
    // 2. Fetch products ONLY if a store is active (for the 'Create Link' modal)
    if (profile?.store_id) {
      await fetchProducts(profile.store_id, 0);
      let aff = affiliateProfile;
      if (!aff?.id) {
        await fetchAffiliateProfile(profile.store_id);
      }
    }
  }, [profile?.store_id, affiliateProfile?.id]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setProductId(publishedProducts[0]?.id || '');
    setSalePrice('');
    setSlug('');
    setModalOpen(true);
  };

  const saveCampaign = async () => {
    if (!affiliateProfile?.id) {
      showAlert({ title: 'خطأ', message: 'تعذر تحميل ملف المسوق', type: 'error' });
      return;
    }
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (s.length < 3) {
      showAlert({ title: 'خطأ', message: 'المعرف يجب أن يكون 3 أحرف على الأقل (إنجليزي وأرقام وشرطة)', type: 'error' });
      return;
    }
    if (!productId) {
      showAlert({ title: 'خطأ', message: 'اختر منتجاً', type: 'error' });
      return;
    }
    setSaving(true);
    const res = await createCampaign({
      affiliateId: affiliateProfile.id,
      productId,
      salePrice,
      slug: s,
    });
    setSaving(false);
    if (res.success) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalOpen(false);
      const link = generateCampaignLink(s);
      showConfirm({
        title: 'تم بنجاح',
        message: `تم إنشاء الرابط بنجاح\n${link}`,
        confirmText: 'مشاركة',
        cancelText: 'تخطي',
        type: 'success',
        onConfirm: () => Share.share({ message: link, url: link }),
      });
    } else {
      showAlert({ title: 'خطأ', message: res.error, type: 'error' });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="روابط البيع" 
        subtitle="إدارة وتتبع روابط التسويق الخاصة بك"
        leftAction={
          <TouchableOpacity 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/')} 
            style={styles.backBtn}
          >
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        }
        actionHint={!modalOpen ? "أنشئ رابط بيع جديد من الزر بالأسفل" : null}
      />

      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        أنشئ رابطاً لكل منتج مع سعر البيع للعميل. الطلبات من الرابط تحتاج موافقتك قبل وصولها للمدير الإقليمي.
      </Text>

      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={load}
        ListEmptyComponent={
          isLoading ? <LoadingSpinner /> : (
            <EmptyState
              icon="link-outline"
              title="لا حملات بعد"
              message="أنشئ رابط بيع لمنتج منشور من المتجر."
            />
          )
        }
        renderItem={({ item }) => {
          const link = generateCampaignLink(item.slug);
          const pname = item.products?.name || 'منتج';
          return (
            <Card style={{ marginBottom: spacing.sm }} accentColor={item.is_active ? theme.primary : theme.colors.textTertiary} accentPosition="top">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ color: theme.colors.text, fontFamily: 'Tajawal_700Bold', flex: 1 }}>{pname}</Text>
                <Badge label={item.is_active ? 'نشطة' : 'معطلة'} variant={item.is_active ? 'success' : 'neutral'} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingVertical: 8, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.04)' }}>
                <View>
                  <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontFamily: 'Tajawal_500Medium' }}>سعر المورد</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontFamily: 'Tajawal_700Bold', fontSize: 14 }}>{formatCurrency(item.products?.price || 0)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontFamily: 'Tajawal_500Medium' }}>سعر البيع</Text>
                  <Text style={{ color: theme.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 }}>{formatCurrency(item.sale_price)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontFamily: 'Tajawal_500Medium' }}>عمولتك 💰</Text>
                  <Text style={{ color: '#00B894', fontFamily: 'Tajawal_800ExtraBold', fontSize: 16 }}>{formatCurrency(Number(item.sale_price) - Number(item.products?.price || 0))}</Text>
                </View>
              </View>
              <Text style={{ color: theme.colors.textTertiary, marginTop: 4, fontSize: 12 }}>/c/{item.slug}</Text>
              <View style={styles.rowBtns}>
                <Button title={item.is_active ? 'تعطيل' : 'تفعيل'} variant="secondary" onPress={() => setCampaignActive(item.id, !item.is_active)} style={{ flex: 1, marginEnd: spacing.sm }} />
                <Button title="مشاركة" variant="gradient" icon="share-social-outline" onPress={() => Share.share({ message: `اطلب الآن: ${pname}\n${link}`, url: link })} style={{ flex: 1 }} />
              </View>
            </Card>
          );
        }}
      />

      <BottomSheet
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        title="حملة جديدة"
        subtitle="أنشئ رابطاً تسويقياً لمنتج منشور"
      >
        <View style={styles.formContainer}>
          <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>المنتج</Text>
          <FlatList
            horizontal
            data={publishedProducts}
            keyExtractor={(p) => p.id}
            style={{ maxHeight: 44, marginBottom: spacing.md }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item: p }) => (
              <TouchableOpacity
                onPress={() => {
                  setProductId(p.id);
                  setSalePrice(String(Number(p.price)));
                }}
                style={[
                  styles.productChip,
                  {
                    borderColor: productId === p.id ? theme.primary : theme.colors.border,
                    backgroundColor: productId === p.id ? theme.primary + '18' : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: theme.colors.text, fontSize: 13 }} numberOfLines={1}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            )}
          />
          {/* Base Price Display */}
          {selectedProduct && (
            <View style={[styles.basePriceBox, { backgroundColor: theme.primary + '08', borderColor: theme.primary + '20' }]}>
              <Text style={{ color: theme.colors.textSecondary, fontFamily: 'Tajawal_500Medium', fontSize: 13 }}>سعر المورد الأساسي:</Text>
              <Text style={{ color: theme.primary, fontFamily: 'Tajawal_800ExtraBold', fontSize: 18 }}>{formatCurrency(basePrice)}</Text>
            </View>
          )}
          <Input
            label="سعر البيع للعميل (DZD)"
            value={salePrice}
            onChangeText={setSalePrice}
            keyboardType="decimal-pad"
            placeholder="أعلى من سعر المورد"
            icon="wallet-outline"
          />
          {/* Profit Calculator */}
          {salePriceNum > 0 && (
            <View style={[styles.profitCalc, { backgroundColor: commissionProfit > 0 ? '#00B89410' : '#FF6B6B10', borderColor: commissionProfit > 0 ? '#00B89430' : '#FF6B6B30' }]}>
              <Ionicons name={commissionProfit > 0 ? 'checkmark-circle' : 'alert-circle'} size={20} color={commissionProfit > 0 ? '#00B894' : '#FF6B6B'} />
              <View style={{ flex: 1, marginStart: 8 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: 'Tajawal_500Medium' }}>
                  {commissionProfit > 0 ? 'عمولتك لكل طلب ناجح' : 'السعر يجب أن يكون أكبر من سعر المورد'}
                </Text>
                <Text style={{ color: commissionProfit > 0 ? '#00B894' : '#FF6B6B', fontFamily: 'Tajawal_800ExtraBold', fontSize: 20 }}>
                  {commissionProfit > 0 ? formatCurrency(commissionProfit) : '---'}
                </Text>
              </View>
            </View>
          )}

          {/* Pricing Advice */}
          <View style={{ backgroundColor: theme.primary + '10', padding: 12, borderRadius: 12, marginTop: 4, marginBottom: 16 }}>
             <Text style={{ color: theme.primary, fontFamily: 'Tajawal_700Bold', fontSize: 13, marginBottom: 2 }}>نصيحة التسعير 💡</Text>
             <Text style={{ color: theme.colors.textSecondary, fontFamily: 'Tajawal_500Medium', fontSize: 11, lineHeight: 16 }}>
               بناءً على طلب صاحب المتجر، يرجى وضع سعر بيع منطقي ومنافس في السوق. الأسعار المبالغ فيها قد تؤدي إلى رفض العميل استلام الطلب.
             </Text>
          </View>
          <Input
            label="معرف الرابط (إنجليزي)"
            value={slug}
            onChangeText={(t) => setSlug(t.toLowerCase())}
            placeholder="مثال: robe-ete-2026"
            icon="link-outline"
          />
          <Button title="إنشاء رابط الحملة" variant="gradient" loading={saving} onPress={saveCampaign} style={{ marginTop: spacing.md }} />
        </View>
      </BottomSheet>

      <FAB 
        label="إنشاء رابط" 
        icon="link-outline"
        onPress={openCreate} 
        visible={!modalOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backBtn: { padding: 4 },
  formContainer: { paddingVertical: spacing.sm },
  hint: { ...typography.caption, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  list: { padding: spacing.md, paddingTop: spacing.xs, paddingBottom: 120 },
  rowBtns: { flexDirection: 'row', marginTop: spacing.md },
  modalLabel: { ...typography.caption, marginBottom: 6 },
  productChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    maxWidth: 160,
  },
  basePriceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  profitCalc: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
});
