import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useStoreStore } from '../../src/stores/useStoreStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useWilayaStore } from '../../src/stores/useWilayaStore';
import { useAlertStore } from '../../src/stores/useAlertStore';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import BottomSheet from '../../src/components/ui/BottomSheet';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { useResponsive } from '../../src/hooks/useResponsive';

export default function MerchantOnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isWide, maxContentWidth } = useResponsive();
  const createStore = useStoreStore((s) => s.createStore);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const { wilayas, fetchWilayas } = useWilayaStore();
  const { showAlert } = useAlertStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [wilayaModal, setWilayaModal] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWilayas();
  }, [fetchWilayas]);

  const filteredWilayas = wilayas.filter((w) => {
    if (!wilayaSearch) return true;
    const q = wilayaSearch.toLowerCase();
    return w.name.includes(wilayaSearch) || (w.name_fr || '').toLowerCase().includes(q) || w.code.includes(q);
  });

  const finish = async () => {
    if (!name.trim()) {
      showAlert({ title: 'خطأ', message: 'اسم المتجر مطلوب', type: 'error' });
      return;
    }
    if (!selectedWilaya) {
      showAlert({ title: 'خطأ', message: 'اختر ولاية عمل المتجر — المدير الإقليمي للولاية سيراجع ويفعّل حسابك.', type: 'error' });
      return;
    }
    setLoading(true);
    const res = await createStore({
      name: name.trim(),
      description: desc.trim() || null,
      is_active: true,
      wilaya_id: selectedWilaya.id,
    });
    if (res.success) {
      await fetchProfile();
      setLoading(false);
      router.replace('/(merchant)/dashboard');
    } else {
      setLoading(false);
      showAlert({ title: 'خطأ', message: res.error, type: 'error' });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={[
          { padding: spacing.xl },
          isWide && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }
        ]}
      >
        <Text style={[typography.h1, { color: theme.colors.text, marginBottom: spacing.sm }]}>إعداد المتجر</Text>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: spacing.lg }}>
          أدخل بيانات متجرك وولاية النشاط. بعد الإنشاء، المدير الإقليمي للولاية سيوافق على تفعيل المتجر قبل ظهور منتجاتك للمسوقين.
        </Text>
        <Input label="اسم المتجر" value={name} onChangeText={setName} placeholder="مثال: متجري" />
        <Input label="وصف قصير (اختياري)" value={desc} onChangeText={setDesc} placeholder="ماذا تبيع؟" multiline />

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>ولاية النشاط *</Text>
        <TouchableOpacity
          style={[styles.picker, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}
          onPress={() => setWilayaModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={{ color: selectedWilaya ? theme.colors.text : theme.colors.textTertiary, flex: 1 }}>
            {selectedWilaya ? `${selectedWilaya.code} — ${selectedWilaya.name}` : 'اختر الولاية'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <Button title="إنشاء المتجر" onPress={finish} loading={loading} variant="gradient" style={{ marginTop: spacing.lg }} />
      </ScrollView>

      <BottomSheet
        visible={wilayaModal}
        onClose={() => setWilayaModal(false)}
        title="اختر الولاية"
        subtitle="ولاية النشاط والمستودع الإقليمي"
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
            keyExtractor={(item) => item.id.toString()}
            style={{ maxHeight: 400 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.wRow, { borderBottomColor: theme.colors.divider }]}
                onPress={() => {
                  setSelectedWilaya(item);
                  setWilayaModal(false);
                  setWilayaSearch('');
                }}
              >
                <Text style={{ color: theme.colors.text, fontFamily: 'Tajawal_500Medium' }}>
                   {item.code} — {item.name}
                </Text>
                {selectedWilaya?.id === item.id && (
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
  label: { ...typography.caption, marginBottom: 6, marginTop: spacing.md, fontFamily: 'Tajawal_700Bold' },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  wRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' },
});
