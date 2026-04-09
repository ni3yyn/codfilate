import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useStoreStore } from '../../src/stores/useStoreStore';
import { useThemeStore } from '../../src/stores/useThemeStore';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import CustomAlert from '../../src/components/ui/CustomAlert';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing, borderRadius } from '../../src/theme/theme';

const COLOR_OPTIONS = [
  '#2D6A4F', '#74C69D', '#1B4332', '#40916C',
  '#00CEC9', '#00B894', '#6C5CE7', '#A29BFE',
  '#FDCB6E', '#FF6B6B', '#E17055', '#74B9FF',
];

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);
  const { currentStore, updateStore, createStore, fetchMyStore } = useStoreStore();
  const { mode, toggleMode } = useThemeStore();
  
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2D6A4F');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'default' });

  useEffect(() => {
    if (currentStore) { 
      setStoreName(currentStore.name || ''); 
      setStoreDesc(currentStore.description || ''); 
      setPrimaryColor(currentStore.primary_color || '#2D6A4F'); 
      setWhatsappEnabled(currentStore.whatsapp_notifications_enabled || false);
    }
  }, [currentStore]);

  const showAlert = (title, message, type = 'default') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const handleSaveStore = async () => {
    if (!storeName.trim()) { 
      showAlert('خطأ', 'يرجى إدخال اسم المتجر أولاً.', 'destructive'); 
      return; 
    }
    setSaving(true);
    if (currentStore) {
      const result = await updateStore(currentStore.id, { 
        name: storeName.trim(), 
        description: storeDesc.trim(), 
        primary_color: primaryColor,
        whatsapp_notifications_enabled: whatsappEnabled
      });
      if (result.success) showAlert('نجاح', 'تم تحديث بيانات المتجر بنجاح.', 'success'); 
      else showAlert('خطأ', result.error, 'destructive');
    } else {
      setCreating(true);
      const result = await createStore({ 
        name: storeName.trim(), 
        description: storeDesc.trim(), 
        primary_color: primaryColor,
        whatsapp_notifications_enabled: whatsappEnabled
      });
      if (result.success) { 
        showAlert('نجاح', 'تم إنشاء متجرك بنجاح!', 'success'); 
        await fetchMyStore(); 
      } else showAlert('خطأ', result.error, 'destructive');
      setCreating(false);
    }
    setSaving(false);
  };

  const handleSignOut = () => {
    setShowLogoutAlert(true);
  };

  const confirmSignOut = async () => {
    setShowLogoutAlert(false);
    await signOut();
    // Root layout auth guard handles redirect reactively
  };

  const ROLE_AR = { affiliate: 'مسوق', merchant: 'تاجر', admin: 'الإدارة العليا' };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="الإعدادات" 
        subtitle="إدارة بيانات المتجر والمظهر"
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Store Logo */}
        <Text style={[styles.section, { color: theme.colors.textSecondary }]}>هوية المتجر</Text>
        <Card style={styles.card} accentColor={theme.primary} accentPosition="left">
          <TouchableOpacity
            onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setUploadingLogo(true);
                const uploadResult = await useStoreStore.getState().uploadLogo(result.assets[0].uri);
                if (uploadResult.success && currentStore) {
                  await updateStore(currentStore.id, { logo_url: uploadResult.url });
                  showAlert('نجاح', 'تم تحديث شعار المتجر بنجاح.', 'success');
                } else {
                  showAlert('خطأ', 'فشل رفع الشعار. يرجى المحاولة لاحقاً.', 'destructive');
                }
                setUploadingLogo(false);
              }
            }}
            style={[styles.logoPicker, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
            activeOpacity={0.7}
          >
            {currentStore?.logo_url && !uploadingLogo ? (
              <Image source={{ uri: currentStore.logo_url }} style={styles.logoPreview} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name={uploadingLogo ? "sync-outline" : "image-outline"} size={32} color={theme.primary} />
                <Text style={[styles.logoText, { color: theme.colors.textSecondary }]}>
                  {uploadingLogo ? 'جارٍ الرفع...' : 'تغيير الشعار'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Card>

        {/* Store Settings */}
        <Text style={[styles.section, { color: theme.colors.textSecondary }]}>بيانات المتجر</Text>
        <Card style={styles.card}>
          <Input label="اسم المتجر" value={storeName} onChangeText={setStoreName} placeholder="أدخل اسم متجرك" icon="storefront-outline" />
          <Input label="وصف المتجر" value={storeDesc} onChangeText={setStoreDesc} placeholder="وصف مقتصر لعملك..." multiline numberOfLines={3} />
          
          <Text style={[styles.colorLabel, { color: theme.colors.textSecondary }]}>لون العلامة التجارية</Text>
          <View style={styles.colorGrid}>
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity key={color} onPress={() => setPrimaryColor(color)} activeOpacity={0.7}
                style={[styles.colorOption, { backgroundColor: color }, primaryColor === color && styles.colorSelected]}>
                {primaryColor === color && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            ))}
          </View>
          <Button title={currentStore ? 'حفظ التغييرات' : 'بدء إنشاء المتجر'} onPress={handleSaveStore} loading={saving || creating} variant="primary" style={styles.saveBtn} />
        </Card>
        
        {/* Automation & Notifications */}
        <Text style={[styles.section, { color: theme.colors.textSecondary }]}>الأتمتة والتنبيهات</Text>
        <Card style={styles.card} noPadding>
          <View style={styles.settingRow}>
            <View style={[styles.settingIconBox, { backgroundColor: '#25D366' + '15' }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>تنبيهات WhatsApp</Text>
              <Text style={[styles.subLabel, { color: theme.colors.textTertiary }]}>إرسال رسائل تلقائية للعملاء عند تغير حالة الطلب</Text>
            </View>
            <Switch
              value={whatsappEnabled}
              onValueChange={setWhatsappEnabled}
              trackColor={{ false: theme.colors.border, true: '#25D366' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Preferences */}
        <Text style={[styles.section, { color: theme.colors.textSecondary }]}>المظهر</Text>
        <Card style={styles.card} noPadding>
          <TouchableOpacity onPress={toggleMode} style={styles.settingRow} activeOpacity={0.7}>
            <View style={[styles.settingIconBox, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={20} color={theme.primary} />
            </View>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              الوضع {mode === 'dark' ? 'الداكن' : 'الفاتح'}
            </Text>
            <Ionicons name="chevron-back" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Account Info */}
        <Text style={[styles.section, { color: theme.colors.textSecondary }]}>معلومات الحساب</Text>
        <Card style={styles.card} noPadding>
          <View style={[styles.accountRow, { borderBottomColor: theme.colors.divider, borderBottomWidth: 1 }]}>
            <Text style={[styles.accountLabel, { color: theme.colors.textSecondary }]}>اسم المستخدم</Text>
            <Text style={[styles.accountValue, { color: theme.colors.text }]}>{profile?.full_name || '—'}</Text>
          </View>
          <View style={styles.accountRow}>
            <Text style={[styles.accountLabel, { color: theme.colors.textSecondary }]}>الرتبة</Text>
            <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.roleBadgeText, { color: theme.primary }]}>{ROLE_AR[profile?.role] || profile?.role || 'تاجر'}</Text>
            </View>
          </View>
        </Card>

        <Button title="تسجيل الخروج" variant="secondary" onPress={handleSignOut} style={styles.signOutBtn} textStyle={{ color: theme.error }} icon={<Ionicons name="log-out-outline" size={20} color={theme.error} />} />
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <CustomAlert
        visible={showLogoutAlert}
        title="تأكيد الخروج"
        message="هل أنت متأكد من رغبتك في تسجيل الخروج؟ سيتم نقلك لصفحة الدخول."
        confirmText="خروج"
        cancelText="إلغاء"
        type="destructive"
        onConfirm={confirmSignOut}
        onCancel={() => setShowLogoutAlert(false)}
      />

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={() => setAlertConfig({ ...alertConfig, visible: false })}
        onCancel={() => setAlertConfig({ ...alertConfig, visible: false })}
        confirmText="حسناً"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { 
    padding: spacing.md, 
    paddingBottom: spacing.xxl,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  section: { ...typography.small, fontFamily: 'Tajawal_700Bold', marginBottom: spacing.sm, marginTop: spacing.lg, marginStart: spacing.xs },
  card: { marginBottom: spacing.sm },
  colorLabel: { ...typography.small, fontFamily: 'Tajawal_700Bold', marginBottom: spacing.sm, marginTop: spacing.md },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  colorOption: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  colorSelected: { borderWidth: 3, borderColor: '#FFFFFF' },
  saveBtn: { marginTop: spacing.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14 },
  settingIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginEnd: spacing.md },
  settingLabel: { ...typography.body, fontFamily: 'Tajawal_700Bold' },
  subLabel: { ...typography.small, marginTop: 2 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: spacing.md },
  accountLabel: { ...typography.body, fontFamily: 'Tajawal_500Medium' },
  accountValue: { ...typography.bodyBold },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 },
  roleBadgeText: { ...typography.small, fontFamily: 'Tajawal_700Bold' },
  signOutBtn: { marginTop: spacing.xl, backgroundColor: 'rgba(220, 38, 38, 0.08)', borderColor: 'rgba(220, 38, 38, 0.12)', borderWidth: 1 },
  bottomSpacer: { height: 100 },
  logoPicker: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  logoPreview: { width: '100%', height: '100%' },
  logoPlaceholder: { alignItems: 'center', gap: 6 },
  logoText: { ...typography.small, textAlign: 'center', fontFamily: 'Tajawal_700Bold' },
});
