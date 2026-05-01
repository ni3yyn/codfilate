import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

// Hooks & Stores
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useStoreStore } from '../../src/stores/useStoreStore';
import { useThemeStore } from '../../src/stores/useThemeStore';

// UI Components
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import CustomAlert from '../../src/components/ui/CustomAlert';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import Modal from '../../src/components/ui/Modal';
import BottomSheet from '../../src/components/ui/BottomSheet';
import ResponsiveModal from '../../src/components/ui/ResponsiveModal';
import SignOutButton from '../../src/components/ui/SignOutButton';

// Theme Data
import { typography, spacing, borderRadius } from '../../src/theme/theme';

const COLOR_OPTIONS = [
  '#2D6A4F', '#74C69D', '#1B4332', '#40916C',
  '#00CEC9', '#00B894', '#6C5CE7', '#A29BFE',
  '#FDCB6E', '#FF6B6B', '#E17055', '#74B9FF',
];

const ROLE_AR = {
  affiliate: 'مسوق',
  merchant: 'تاجر',
  admin: 'الإدارة العليا'
};

export default function SettingsScreen() {
  const theme = useTheme();
  const { isWide } = useResponsive();
  const router = useRouter();

  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);
  const { currentStore, updateStore, createStore, fetchMyStore } = useStoreStore();
  const { mode, toggleMode } = useThemeStore();

  // Component State
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2D6A4F');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Personal Info State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Alert States
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'default'
  });

  // Load store data into state
  useEffect(() => {
    if (currentStore) {
      setStoreName(currentStore.name || '');
      setStoreDesc(currentStore.description || '');
      setPrimaryColor(currentStore.primary_color || '#2D6A4F');
      setWhatsappEnabled(currentStore.whatsapp_notifications_enabled || false);
    }
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [currentStore, profile]);

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
      if (result.success) {
        showAlert('نجاح', 'تم تحديث بيانات المتجر بنجاح.', 'success');
        setShowStoreModal(false);
      }
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

  const [savingProfile, setSavingProfile] = useState(false);
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      showAlert('خطأ', 'الاسم الكامل مطلوب.', 'destructive');
      return;
    }
    setSavingProfile(true);
    const result = await useAuthStore.getState().updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || null
    });
    if (result.success) {
      showAlert('نجاح', 'تم تحديث البيانات الشخصية بنجاح.', 'success');
      setShowProfileModal(false);
    }
    else showAlert('خطأ', result.error, 'destructive');
    setSavingProfile(false);
  };

  const handleSignOut = () => {
    setShowLogoutAlert(true);
  };

  const confirmSignOut = async () => {
    setShowLogoutAlert(false);
    await signOut();
    // Root layout auth guard handles redirect reactively
  };

  const handleImagePick = async () => {
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
  };

  // --- Render Sections ---

  const renderStoreForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.identityHeader}>
        <TouchableOpacity
          onPress={handleImagePick}
          activeOpacity={0.7}
          style={[styles.logoPicker, { borderColor: theme.primary + '30', backgroundColor: theme.colors.surface2 }]}
        >
          {currentStore?.logo_url && !uploadingLogo ? (
            <Image
              source={{ uri: currentStore.logo_url }}
              style={styles.logoPreview}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons
                name={uploadingLogo ? "sync-outline" : "camera-outline"}
                size={24}
                color={theme.primary}
              />
            </View>
          )}
          <View style={[styles.editIconBadge, { backgroundColor: theme.primary }]}>
             <Ionicons name="pencil" size={10} color="#FFF" />
          </View>
        </TouchableOpacity>
        
        <View style={styles.identityInfo}>
          <Text style={[styles.identityTitle, { color: theme.colors.text }]}>شعار المتجر</Text>
          <Text style={[styles.identitySub, { color: theme.colors.textTertiary }]}>يفضل استخدام صورة مربعة واضحة</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Input
        label="اسم المتجر"
        value={storeName}
        onChangeText={setStoreName}
        placeholder="أدخل اسم متجرك"
        icon="storefront-outline"
      />
      <Input
        label="وصف المتجر"
        value={storeDesc}
        onChangeText={setStoreDesc}
        placeholder="وصف مقتصر لعملك..."
        multiline
        numberOfLines={3}
        style={{ height: 100 }}
      />

      <Text style={[styles.colorLabel, { color: theme.colors.textSecondary }]}>لون العلامة التجارية</Text>
      <View style={styles.colorGrid}>
        {COLOR_OPTIONS.map((color) => {
          const isSelected = primaryColor === color;
          return (
            <TouchableOpacity
              key={color}
              onPress={() => setPrimaryColor(color)}
              activeOpacity={0.8}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                isSelected && { borderColor: theme.primary, borderWidth: 2, transform: [{ scale: 1.1 }] }
              ]}
            >
              {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          );
        })}
      </View>
      <Button
        title="حفظ إعدادات المتجر"
        onPress={handleSaveStore}
        loading={saving || creating}
        variant="primary"
        style={styles.saveBtn}
      />
    </View>
  );

  const renderProfileForm = () => (
    <View style={styles.formContainer}>
      <Input
        label="الاسم الكامل"
        value={fullName}
        onChangeText={setFullName}
        placeholder="اسمك الكامل"
        icon="person-outline"
      />
      <Input
        label="رقم الهاتف"
        value={phone}
        onChangeText={setPhone}
        placeholder="05xx xx xx xx"
        keyboardType="phone-pad"
        icon="call-outline"
      />
      <Button
        title="تحديث البيانات الشخصية"
        onPress={handleSaveProfile}
        loading={savingProfile}
        variant="primary"
        style={{ marginTop: spacing.md }}
      />
    </View>
  );

  const renderManagementActions = () => (
    <View style={styles.actionGrid}>
      <TouchableOpacity 
        style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => setShowStoreModal(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconBox, { backgroundColor: theme.primary + '10' }]}>
          <Ionicons name="brush-outline" size={24} color={theme.primary} />
        </View>
        <Text style={[styles.actionTitle, { color: theme.colors.text }]}>إعدادات المتجر</Text>
        <Text style={[styles.actionDesc, { color: theme.colors.textTertiary }]}>الاسم، الشعار، الألوان والوصف</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => setShowProfileModal(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconBox, { backgroundColor: theme.secondary + '10' }]}>
          <Ionicons name="person-outline" size={24} color={theme.secondary} />
        </View>
        <Text style={[styles.actionTitle, { color: theme.colors.text }]}>البيانات الشخصية</Text>
        <Text style={[styles.actionDesc, { color: theme.colors.textTertiary }]}>الاسم الكامل ورقم الهاتف</Text>
      </TouchableOpacity>
    </View>
  );


  const renderAppearanceSettings = () => (
    <>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>المظهر</Text>
      <Card style={styles.card} noPadding>
        <TouchableOpacity
          onPress={toggleMode}
          style={styles.settingRow}
          activeOpacity={0.7}
        >
          <View style={[styles.settingIconBox, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={22} color={theme.primary} />
          </View>
          <View style={styles.settingTextContent}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              الوضع {mode === 'dark' ? 'الداكن' : 'الفاتح'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </Card>
    </>
  );

  const renderAccountInfo = () => (
    <>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>معلومات الحساب</Text>
      <Card style={styles.card} noPadding>
        <View style={[styles.accountRow, { borderBottomColor: theme.colors.divider, borderBottomWidth: 1 }]}>
          <Text style={[styles.accountLabel, { color: theme.colors.textSecondary }]}>اسم المستخدم</Text>
          <Text style={[styles.accountValue, { color: theme.colors.text }]}>{profile?.full_name || '—'}</Text>
        </View>
        <View style={styles.accountRow}>
          <Text style={[styles.accountLabel, { color: theme.colors.textSecondary }]}>الرتبة</Text>
          <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.roleBadgeText, { color: theme.primary }]}>
              {ROLE_AR[profile?.role] || profile?.role || 'تاجر'}
            </Text>
          </View>
        </View>
      </Card>
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader
        title="الإعدادات"
        subtitle="إدارة بيانات المتجر والمظهر"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.grid, isWide && styles.gridWide]}>

          {/* Main Column (Right on RTL) - Management Actions */}
          <View style={[styles.column, isWide && styles.mainColumn]}>
             <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 0 }]}>إدارة الحساب والمتجر</Text>
             {renderManagementActions()}
          </View>

          {/* Secondary Column (Left on RTL) - Preferences & Account Info */}
          <View style={[styles.column, isWide && styles.secondaryColumn]}>
            {renderAppearanceSettings()}
            {renderAccountInfo()}

            <SignOutButton onPress={handleSignOut} style={styles.signOutBtn} />
          </View>

        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Global Alerts */}
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

      <ResponsiveModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="تعديل البيانات الشخصية"
        subtitle="تأكد من صحة رقم الهاتف للتواصل"
        maxWidth={500}
      >
        {renderProfileForm()}
      </ResponsiveModal>

      <ResponsiveModal
        visible={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        title="إعدادات المتجر"
        subtitle="خصص مظهر واسم متجرك للعملاء"
        maxWidth={600}
      >
        {renderStoreForm()}
      </ResponsiveModal>
    </SafeAreaView>
  );
}


// --- Styles ---
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  scrollWide: {
    maxWidth: 1100,
  },

  // Responsive Grid System
  grid: { flex: 1, flexDirection: 'column' },
  gridWide: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  column: { width: '100%', flexShrink: 0 },
  mainColumn: { width: '58%' },
  secondaryColumn: { width: '38%' },

  // Shared typography classes
  sectionTitle: {
    ...typography.h5,
    fontFamily: 'Tajawal_700Bold',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textAlign: 'right'
  },
  card: { marginBottom: spacing.md, padding: spacing.md },

  // Identity Header
  identityHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  identityInfo: { flex: 1, alignItems: 'flex-end' },
  identityTitle: { ...typography.bodyBold, fontSize: 16 },
  identitySub: { ...typography.caption, fontSize: 11, marginTop: 2 },
  editIconBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: spacing.md },

  // Color Picker
  colorLabel: {
    ...typography.small,
    fontFamily: 'Tajawal_700Bold',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textAlign: 'right'
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  colorOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  saveBtn: { marginTop: spacing.sm },

  // Settings Rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 16
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContent: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.md
  },
  settingLabel: {
    ...typography.body,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right'
  },
  subLabel: {
    ...typography.caption,
    fontFamily: 'Tajawal_400Regular',
    marginTop: 2,
    textAlign: 'right'
  },

  // Account Info Rows
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: spacing.md
  },
  accountLabel: {
    ...typography.body,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right'
  },
  accountValue: {
    ...typography.body,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'left'
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6
  },
  roleBadgeText: {
    ...typography.small,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 11
  },

  signOutBtn: { marginTop: 0 },

  bottomSpacer: { height: 120 },

  // Logo Upload Picker
  logoPicker: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPreview: { width: '100%', height: '100%', borderRadius: 16 },
  logoPlaceholder: { alignItems: 'center' },

  // Action Grid
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  actionCard: { 
    flex: 1, 
    minWidth: 200, 
    padding: spacing.lg, 
    borderRadius: borderRadius.lg, 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  actionIconBox: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  actionTitle: { ...typography.bodyBold, fontSize: 16, marginBottom: 4, textAlign: 'center' },
  actionDesc: { ...typography.caption, fontSize: 12, textAlign: 'center', opacity: 0.7 },
  
  // Form Container
  formContainer: { flex: 1 },
});