import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/lib/supabase';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing, borderRadius } from '../../src/theme/theme';

const PLATFORM_FIELDS = [
  { key: 'platform_fee', label: 'رسوم المنصة', hint: 'لكل طلبية' },
  { key: 'admin_fee', label: 'الإدارة العليا', hint: 'نموذجي 50 دج' },
  { key: 'regional_manager_fee', label: 'المدير الإقليمي', hint: 'نموذجي 150 دج' },
  { key: 'min_payout_amount', label: 'أقل سحب', hint: 'للمسوقين' },
  { key: 'failed_delivery_compensation', label: 'تعويض فشل التوصيل', hint: 'اختياري' },
];

const MERCHANT_SIGNUP_STEPS = [
  { icon: 'person-outline', text: 'الاسم الكامل' },
  { icon: 'mail-outline', text: 'البريد الإلكتروني' },
  { icon: 'lock-closed-outline', text: 'كلمة المرور (6 أحرف كحد أدنى)' },
  { icon: 'git-branch-outline', text: 'اختيار الدور: تاجر أو مسوق' },
];

const MERCHANT_ONBOARDING = [
  { icon: 'storefront-outline', text: 'اسم المتجر' },
  { icon: 'document-text-outline', text: 'وصف قصير (اختياري)' },
  { icon: 'location-outline', text: 'ولاية النشاط — ثم موافقة المدير الإقليمي' },
];

const AFFILIATE_SIGNUP = [
  { icon: 'person-outline', text: 'الاسم الكامل' },
  { icon: 'mail-outline', text: 'البريد الإلكتروني' },
  { icon: 'lock-closed-outline', text: 'كلمة المرور' },
  { icon: 'megaphone-outline', text: 'دور مسوق — ثم الحملات والطلبات' },
];

function SignupChecklist({ title, icon, items, theme }) {
  return (
    <View style={[styles.checkBlock, { borderColor: theme.colors.border }]}>
      <View style={styles.checkTitleRow}>
        <Ionicons name={icon} size={18} color={theme.primary} />
        <Text style={[typography.bodyBold, { color: theme.colors.text, flex: 1 }]}>{title}</Text>
      </View>
      {items.map((row, i) => (
        <View key={i} style={styles.checkRow}>
          <Ionicons name={row.icon} size={14} color={theme.colors.textTertiary} style={{ marginTop: 2 }} />
          <Text style={[typography.caption, { color: theme.colors.textSecondary, flex: 1, lineHeight: 20 }]}>
            {row.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Local draft state avoids parent re-renders that break focus / layout. */
function PlatformFeesEditor({ initial, theme, onSaved }) {
  const [draft, setDraft] = useState(initial || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setDraft(initial);
  }, [initial]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('platform_settings')
      .update({
        platform_fee: Number(draft.platform_fee),
        admin_fee: Number(draft.admin_fee),
        regional_manager_fee: Number(draft.regional_manager_fee),
        min_payout_amount: Number(draft.min_payout_amount),
        failed_delivery_compensation: Number(draft.failed_delivery_compensation),
      })
      .eq('id', 1);
    setSaving(false);
    if (error) Alert.alert('خطأ', error.message);
    else {
      Alert.alert('تم', 'تم حفظ الرسوم العامة');
      onSaved?.();
    }
  };

  if (!initial) return null;

  return (
    <Card style={styles.cardPad}>
      <Text style={[typography.bodyBold, { color: theme.colors.text, marginBottom: spacing.sm }]}>
        الرسوم العامة (دج)
      </Text>
      <View style={styles.feeGrid}>
        {PLATFORM_FIELDS.map(({ key, label, hint }) => (
          <View key={key} style={styles.feeCell}>
            <Input
              label={label}
              value={String(draft[key] ?? '')}
              onChangeText={(t) => setDraft((d) => ({ ...d, [key]: t }))}
              keyboardType="numeric"
              style={styles.inputTight}
            />
            <Text style={[typography.small, { color: theme.colors.textTertiary, marginTop: 2 }]}>{hint}</Text>
          </View>
        ))}
      </View>
      <Button title="حفظ الرسوم العامة" onPress={save} loading={saving} variant="gradient" />
    </Card>
  );
}

const WilayaFeeRow = memo(function WilayaFeeRow({ w, theme, onSave }) {
  const [home, setHome] = useState(String(w.home_delivery_fee ?? ''));
  const [office, setOffice] = useState(String(w.office_delivery_fee ?? ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHome(String(w.home_delivery_fee ?? ''));
    setOffice(String(w.office_delivery_fee ?? ''));
  }, [w.home_delivery_fee, w.office_delivery_fee]);

  const save = async () => {
    setSaving(true);
    await onSave(w.id, home, office);
    setSaving(false);
  };

  return (
    <View style={[styles.wilayaRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}>
      <View style={styles.wilayaMeta}>
        <Text style={[styles.wilayaCode, { color: theme.colors.textTertiary }]}>{w.code}</Text>
        <Text style={[styles.wilayaName, { color: theme.colors.text }]} numberOfLines={1}>
          {w.name}
        </Text>
      </View>
      <View style={styles.wilayaInputs}>
        <TextInput
          value={home}
          onChangeText={setHome}
          keyboardType="numeric"
          placeholder="منزل"
          placeholderTextColor={theme.colors.textTertiary}
          style={[styles.miniInp, { color: theme.colors.text, borderColor: theme.colors.border }]}
        />
        <TextInput
          value={office}
          onChangeText={setOffice}
          keyboardType="numeric"
          placeholder="مكتب"
          placeholderTextColor={theme.colors.textTertiary}
          style={[styles.miniInp, { color: theme.colors.text, borderColor: theme.colors.border }]}
        />
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={[styles.saveIcon, { backgroundColor: theme.primary + '22' }]}
          hitSlop={8}
        >
          <Ionicons name={saving ? 'hourglass-outline' : 'checkmark'} size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function AdminFeesScreen() {
  const theme = useTheme();
  const [settings, setSettings] = useState(null);
  const [wilayas, setWilayas] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState('');
  const [showWilayaSection, setShowWilayaSection] = useState(true);
  const [showSignupRef, setShowSignupRef] = useState(true);

  const load = useCallback(async () => {
    const [sRes, wRes] = await Promise.all([
      supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('wilayas').select('*').order('code'),
    ]);
    if (sRes.data) setSettings(sRes.data);
    if (wRes.data) setWilayas(wRes.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateWilayaFees = useCallback(async (id, home, office) => {
    const { error } = await supabase
      .from('wilayas')
      .update({
        home_delivery_fee: parseInt(home, 10) || 0,
        office_delivery_fee: parseInt(office, 10) || 0,
      })
      .eq('id', id);
    if (error) {
      Alert.alert('خطأ', error.message);
      return;
    }
    setWilayas((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              home_delivery_fee: parseInt(home, 10) || 0,
              office_delivery_fee: parseInt(office, 10) || 0,
            }
          : w
      )
    );
  }, []);

  const filteredWilayas = useMemo(() => {
    const q = wilayaSearch.trim().toLowerCase();
    if (!q) return wilayas;
    return wilayas.filter(
      (w) =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.name_fr || '').toLowerCase().includes(q) ||
        (w.code || '').includes(q)
    );
  }, [wilayas, wilayaSearch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader
        title="الرسوم والمرجعية"
        subtitle="عمولات المنصّة، توصيل الولايات"
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <PlatformFeesEditor initial={settings} theme={theme} onSaved={load} />

        <TouchableOpacity
          style={[styles.collapseBar, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
          onPress={() => setShowSignupRef((v) => !v)}
          activeOpacity={0.75}
        >
          <Ionicons name="document-text-outline" size={20} color={theme.primary} />
          <Text style={[typography.bodyBold, { color: theme.colors.text, flex: 1 }]}>
            حقول التسجيل (كما في شاشة إنشاء الحساب)
          </Text>
          <Ionicons name={showSignupRef ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {showSignupRef && (
          <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
            <SignupChecklist
              title="التاجر — إنشاء الحساب"
              icon="storefront-outline"
              items={MERCHANT_SIGNUP_STEPS}
              theme={theme}
            />
            <SignupChecklist
              title="التاجر — إعداد المتجر (بعد الدخول)"
              icon="construct-outline"
              items={MERCHANT_ONBOARDING}
              theme={theme}
            />
            <SignupChecklist
              title="المسوق — التسجيل"
              icon="megaphone-outline"
              items={AFFILIATE_SIGNUP}
              theme={theme}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.collapseBar, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
          onPress={() => setShowWilayaSection((v) => !v)}
          activeOpacity={0.75}
        >
          <Ionicons name="map-outline" size={20} color={theme.primary} />
          <Text style={[typography.bodyBold, { color: theme.colors.text, flex: 1 }]}>
            رسوم التوصيل ({wilayas.length} ولاية)
          </Text>
          <Ionicons name={showWilayaSection ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {showWilayaSection && (
          <>
            <Input
              value={wilayaSearch}
              onChangeText={setWilayaSearch}
              placeholder="بحث بالرمز أو اسم الولاية..."
              icon="search-outline"
              style={{ marginBottom: spacing.sm }}
            />
            {filteredWilayas.length === 0 ? (
              <Text style={[typography.caption, { color: theme.colors.textTertiary, textAlign: 'center', padding: spacing.md }]}>
                لا توجد نتيجة
              </Text>
            ) : (
              filteredWilayas.map((w) => (
                <WilayaFeeRow key={w.id} w={w} theme={theme} onSave={updateWilayaFees} />
              ))
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  cardPad: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  feeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  feeCell: {
    width: '48%',
    minWidth: 140,
  },
  inputTight: {
    marginBottom: 0,
  },
  collapseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  checkBlock: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  checkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  wilayaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  wilayaMeta: {
    flex: 1,
    minWidth: 0,
  },
  wilayaCode: {
    ...typography.small,
    fontFamily: 'Tajawal_500Medium',
  },
  wilayaName: {
    ...typography.caption,
    fontFamily: 'Tajawal_500Medium',
  },
  wilayaInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniInp: {
    width: 64,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    textAlign: 'center',
    fontFamily: 'Tajawal_400Regular',
    fontSize: 13,
  },
  saveIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
