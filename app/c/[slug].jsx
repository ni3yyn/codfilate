import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import BottomSheet from '../../src/components/ui/BottomSheet';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import { formatCurrency } from '../../src/lib/utils';
import { DELIVERY_TYPES_AR } from '../../src/lib/constants';

/**
 * Public landing checkout (no login). Uses RPC create_order_from_campaign.
 * Requires migration_marketplace_workflow.sql + anon policies.
 */
export default function PublicCampaignCheckoutScreen() {
  const theme = useTheme();
  const { isWide, maxContentWidth } = useResponsive();
  const { slug: slugParam } = useLocalSearchParams();
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [wilayas, setWilayas] = useState([]);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', commune: '', address: '', notes: '' });
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [deliveryType, setDeliveryType] = useState('home');
  const [wilayaModal, setWilayaModal] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const s = String(slug || '').trim().toLowerCase();
      if (!s) {
        setError('رابط غير صالح');
        setLoading(false);
        return;
      }
      const { data: camp, error: ce } = await supabase
        .from('marketing_campaigns')
        .select('id, slug, sale_price, product_id, products(id, name, price, image_url, listing_status)')
        .eq('slug', s)
        .eq('is_active', true)
        .maybeSingle();

      const ls = camp?.products?.listing_status || 'published';
      if (ce || !camp || ls !== 'published') {
        if (!cancelled) {
          setError('هذه الصفحة غير متوفرة أو انتهت الحملة');
          setLoading(false);
        }
        return;
      }

      const { data: wdata, error: we } = await supabase
        .from('wilayas')
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: true });

      if (we) {
        if (!cancelled) setError(we.message);
      } else {
        if (!cancelled) {
          setWilayas(wdata || []);
          setCampaign(camp);
        }
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const deliveryFee = selectedWilaya
    ? (deliveryType === 'office' ? selectedWilaya.office_delivery_fee : selectedWilaya.home_delivery_fee)
    : 0;
  const total = campaign ? Number(campaign.sale_price) + Number(deliveryFee || 0) : 0;

  const filteredWilayas = wilayas.filter((w) => {
    if (!wilayaSearch) return true;
    const q = wilayaSearch.toLowerCase();
    return w.name.includes(wilayaSearch) || (w.name_fr || '').toLowerCase().includes(q) || w.code.includes(q);
  });

  const submit = async () => {
    if (!form.name?.trim() || !form.phone?.trim() || !selectedWilaya || !form.commune?.trim()) {
      Alert.alert('تنبيه', 'يرجى ملء الاسم والهاتف والولاية والبلدية');
      return;
    }
    setSubmitting(true);
    const s = String(slug || '').trim().toLowerCase();
    const { data: orderId, error: rpcError } = await supabase.rpc('create_order_from_campaign', {
      p_slug: s,
      p_customer_name: form.name.trim(),
      p_customer_phone: form.phone.trim(),
      p_wilaya_id: selectedWilaya.id,
      p_commune: form.commune.trim(),
      p_customer_address: form.address?.trim() || '',
      p_notes: form.notes?.trim() || '',
      p_delivery_type: deliveryType,
    });

    setSubmitting(false);
    if (rpcError) {
      Alert.alert('خطأ', rpcError.message || 'تعذر إرسال الطلب');
      return;
    }
    setDone(true);
    Alert.alert('شكراً لك', 'تم استلام طلبك. سيتواصل معك المسوق قريباً لتأكيد التفاصيل.');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'طلب' }} />
        <LoadingSpinner message="جارٍ التحميل..." />
      </SafeAreaView>
    );
  }

  if (error || !campaign) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'غير متوفر' }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={[styles.errText, { color: theme.colors.text }]}>{error || 'غير متوفر'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'تم' }} />
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={56} color="#00B894" />
          <Text style={[styles.okTitle, { color: theme.colors.text }]}>تم إرسال الطلب</Text>
        </View>
      </SafeAreaView>
    );
  }

  const p = campaign.products;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Stack.Screen options={{ title: p?.name || 'طلب' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView 
          contentContainerStyle={[
            styles.scroll,
            isWide && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }
          ]}
        >
          <Text style={[styles.brand, { color: theme.colors.textSecondary }]}>طلب عبر منصة البيع بالعمولة</Text>

          <Card style={styles.card} accentColor={theme.primary} accentPosition="top">
            <Text style={[styles.pname, { color: theme.colors.text }]}>{p?.name}</Text>
            <Text style={[styles.price, { color: theme.primary }]}>
              {formatCurrency(campaign.sale_price)} + توصيل
            </Text>
            {selectedWilaya && (
              <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
                الإجمالي المقدر: {formatCurrency(total)}
              </Text>
            )}
          </Card>

          <Text style={[styles.section, { color: theme.colors.text }]}>معلوماتك</Text>
          <Input label="الاسم" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
          <Input label="الهاتف" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />

          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>الولاية</Text>
          <TouchableOpacity
            style={[styles.picker, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}
            onPress={() => setWilayaModal(true)}
          >
            <Text style={{ color: selectedWilaya ? theme.colors.text : theme.colors.textTertiary }}>
              {selectedWilaya ? `${selectedWilaya.code} - ${selectedWilaya.name}` : 'اختر الولاية'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.deliveryRow}>
            {['home', 'office'].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setDeliveryType(type)}
                style={[
                  styles.deliveryChip,
                  {
                    borderColor: deliveryType === type ? theme.primary : theme.colors.border,
                    backgroundColor: deliveryType === type ? theme.primary + '15' : theme.colors.surface,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.text, fontSize: 13 }}>{DELIVERY_TYPES_AR[type]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="البلدية" value={form.commune} onChangeText={(t) => setForm({ ...form, commune: t })} />
          <Input label="العنوان (اختياري)" value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} multiline />
          <Input label="ملاحظات" value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} multiline />

          <Button title="إرسال الطلب" onPress={submit} loading={submitting} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={wilayaModal}
        onClose={() => setWilayaModal(false)}
        title="اختر الولاية"
        subtitle="حدد ولاية التوصيل لحساب التكلفة الإجمالية"
      >
        <View style={{ gap: spacing.md }}>
          <Input 
            value={wilayaSearch} 
            onChangeText={setWilayaSearch} 
            placeholder="بحث عن ولاية..." 
            icon="search-outline"
          />
          <FlatList
            data={filteredWilayas}
            keyExtractor={(w) => w.id.toString()}
            style={{ maxHeight: 360 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            renderItem={({ item: w }) => (
              <TouchableOpacity
                style={[styles.wRow, { borderBottomColor: theme.colors.divider }]}
                onPress={() => {
                  setSelectedWilaya(w);
                  setWilayaModal(false);
                  setWilayaSearch('');
                }}
              >
                <Text style={{ color: theme.colors.text, fontFamily: 'Tajawal_500Medium' }}>
                   {w.code} — {w.name}
                </Text>
                {selectedWilaya?.id === w.id && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errText: { ...typography.body, textAlign: 'center', marginTop: spacing.md },
  okTitle: { ...typography.h3, marginTop: spacing.md },
  brand: { ...typography.caption, marginBottom: spacing.sm, textAlign: 'center' },
  card: { marginBottom: spacing.lg },
  pname: { ...typography.h3 },
  price: { ...typography.bodyBold, marginTop: 8 },
  section: { ...typography.h3, marginBottom: spacing.sm },
  inputLabel: { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  deliveryRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  deliveryChip: { flex: 1, padding: 12, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  wRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' },
});
