import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Modal,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAffiliateStore } from '../../src/stores/useAffiliateStore';
import { useThemeStore } from '../../src/stores/useThemeStore';
import { supabase } from '../../src/lib/supabase';

import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import CustomAlert from '../../src/components/ui/CustomAlert';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import BottomSheet from '../../src/components/ui/BottomSheet';

import { typography, spacing, borderRadius, gradients } from '../../src/theme/theme';
import { formatDate } from '../../src/lib/utils';

const ROLE_AR = {
  affiliate: 'مسوق',
  merchant: 'تاجر',
  admin: 'الإدارة العليا',
  regional_manager: 'مدير إقليمي',
  delivery: 'مندوب توصيل',
};

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Responsive Layout Logic
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;
  const isWebModal = Platform.OS === 'web' && width > 768;
  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 850 : '100%';

  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const affiliateProfile = useAffiliateStore((s) => s.affiliateProfile);
  const { mode, toggleMode } = useThemeStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCcp, setEditCcp] = useState('');
  const [editBaridimob, setEditBaridimob] = useState('');
  const [editFlexy, setEditFlexy] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'default' });

  // Animation Value for Web Fade
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name || '');
      setEditPhone(profile.phone || '');
      setEditCcp(profile.ccp_number || '');
      setEditBaridimob(profile.baridimob_number || '');
      setEditFlexy(profile.flexy_number || '');
    }
  }, [profile]);

  useEffect(() => {
    if (isWebModal) {
      Animated.timing(fadeAnim, {
        toValue: isEditing ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isEditing, isWebModal]);

  const openModal = () => setIsEditing(true);

  const closeModal = () => {
    if (isWebModal) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setIsEditing(false));
    } else {
      setIsEditing(false);
    }
  };

  const confirmSignOut = async () => {
    setShowLogoutAlert(false);
    await signOut();
  };

  const showAlert = (title, message, type = 'default') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showAlert('خطأ', 'الاسم الكامل مطلوب للحساب.', 'destructive');
      return;
    }
    setSaving(true);
    const result = await updateProfile({
      full_name: editName.trim(),
      phone: editPhone.trim() || null,
      ccp_number: editCcp.trim() || null,
      baridimob_number: editBaridimob.trim() || null,
      flexy_number: editFlexy.trim() || null,
    });
    if (result.success) {
      showAlert('تم التحديث', 'تم حفظ بياناتك بنجاح.', 'success');
      closeModal();
    } else {
      showAlert('خطأ', result.error, 'destructive');
    }
    setSaving(false);
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingAvatar(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const uri = result.assets[0].uri;
        const fileName = `${session.user.id}/avatar-${Date.now()}.jpg`;
        const response = await fetch(uri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path);

        const updateResult = await updateProfile({ avatar_url: publicUrl });
        if (updateResult.success) {
          showAlert('نجاح', 'تم تحديث الصورة بنجاح.', 'success');
        } else {
          showAlert('خطأ', updateResult.error, 'destructive');
        }
      } catch (err) {
        showAlert('خطأ', 'فشل رفع الصورة. يرجى المحاولة لاحقاً.', 'destructive');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  // ----------------------------------------------------
  // STRICT RTL COMPONENTS
  // ----------------------------------------------------

  // 1. Premium Custom Avatar (With elegant placeholder)
  const AvatarUI = () => {
    const size = isDesktop ? 100 : 86;
    return (
      <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2 }]}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: '#FFFFFF' }]}>
            <Ionicons name="person" size={size * 0.45} color={theme.primary} />
          </View>
        )}
        <View style={styles.cameraOverlay}>
          <Ionicons name="camera" size={14} color="#FFFFFF" />
        </View>
      </View>
    );
  };

  // 2. Strict RTL Setting Item
  const SettingItem = ({ icon, label, value, onPress, color, last }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.settingItem,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
      ]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Icon goes to the far right */}
      <View style={[styles.settingIconBox, { backgroundColor: (color || theme.primary) + '15' }]}>
        <Ionicons name={icon} size={20} color={color || theme.primary} />
      </View>
      
      {/* Text aligns completely to the right */}
      <View style={styles.settingTextContent}>
        <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{label}</Text>
        {value && <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{value}</Text>}
      </View>
      
      {/* Chevron points left (backwards) to signify entering in RTL */}
      {onPress && (
        <View style={styles.settingActionWrap}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.textTertiary} />
        </View>
      )}
    </TouchableOpacity>
  );

  // 3. Web & Mobile Form Modal
  const renderFormContent = () => (
    <View style={styles.formContainer}>
      <Input label="الاسم الكامل" value={editName} onChangeText={setEditName} placeholder="أدخل اسمك" icon="person-outline" style={{ textAlign: 'right' }} />
      <Input label="رقم الهاتف" value={editPhone} onChangeText={setEditPhone} placeholder="05xx xx xx xx" keyboardType="phone-pad" icon="call-outline" style={{ textAlign: 'right' }} />
      
      <View style={[styles.formDivider, { backgroundColor: theme.colors.border }]} />
      <Text style={[styles.formSectionTitle, { color: theme.colors.text }]}>معلومات الدفع والتسويات</Text>
      
      <Input label="رقم الحساب البريدي (CCP)" value={editCcp} onChangeText={setEditCcp} placeholder="مثال: 1234567 89" icon="card-outline" style={{ textAlign: 'right' }} />
      <Input label="بريدي موب (BaridiMob)" value={editBaridimob} onChangeText={setEditBaridimob} placeholder="مثال: 007999990000000000" icon="phone-portrait-outline" style={{ textAlign: 'right' }} />
      <Input label="رقم الفليكسي (Flexy)" value={editFlexy} onChangeText={setEditFlexy} placeholder="رقم الهاتف لرسائل الفليكسي" keyboardType="phone-pad" icon="cellular-outline" style={{ textAlign: 'right' }} />
      
      <Button title="حفظ التغييرات" onPress={handleSaveProfile} loading={saving} variant="gradient" style={{ marginTop: spacing.md }} />
    </View>
  );

  const renderWebOverlay = () => {
    if (!isWebModal || !isEditing) return null;
    return (
      <Modal transparent visible={isEditing} animationType="none">
        <Animated.View style={[styles.webModalOverlay, { opacity: fadeAnim }]}>
          <View style={[styles.webModalContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.webModalHeaderRow}>
              <TouchableOpacity onPress={closeModal} style={[styles.webModalCloseBtn, { backgroundColor: theme.colors.surface2 }]}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
              <View style={styles.webModalHeaderTexts}>
                <Text style={[styles.webModalTitle, { color: theme.colors.text }]}>تعديل الملف الشخصي</Text>
                <Text style={[styles.webModalSubtitle, { color: theme.colors.textSecondary }]}>حدث بياناتك الشخصية ومعلومات الدفع</Text>
              </View>
            </View>
            {renderFormContent()}
          </View>
        </Animated.View>
      </Modal>
    );
  };

  const renderMobileSheet = () => {
    if (isWebModal || !isEditing) return null;
    return (
      <BottomSheet visible={isEditing} onClose={closeModal} title="تعديل الملف الشخصي" subtitle="حدث بياناتك الشخصية ومعلومات الدفع">
        {renderFormContent()}
      </BottomSheet>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader title="حسابي" subtitle="إدارة بياناتك وتفضيلاتك" />

      <View style={styles.centerWrapper}>
        <ScrollView 
          style={styles.container}
          contentContainerStyle={[styles.contentContainer, { maxWidth: contentMaxWidth }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ---------------- HERO SECTION ---------------- */}
          <View style={styles.heroSection}>
            <LinearGradient 
              colors={gradients.primary} 
              style={[styles.profileHeroCard, isDesktop && styles.desktopProfileHero]} 
              start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
            >
              <View style={styles.cardCircle1} />
              <View style={styles.cardCircle2} />

              <View style={styles.profileRow}>
                {/* Left Side: Edit Button */}
                <TouchableOpacity onPress={openModal} style={[styles.editProfileBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]} activeOpacity={0.7}>
                  <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                  {isDesktop && <Text style={styles.editBtnText}>تعديل الحساب</Text>}
                </TouchableOpacity>

                {/* Center: Info (Anchored Right) */}
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {profile?.full_name || 'مستخدم جديد'}
                  </Text>
                  <View style={styles.phoneRow}>
                    <Text style={styles.profilePhone}>{profile?.phone || 'لا يوجد رقم هاتف'}</Text>
                    <Ionicons name="call" size={14} color="rgba(255,255,255,0.8)" />
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={styles.roleBadgeText}>{ROLE_AR[profile?.role] || profile?.role || 'مسوق'}</Text>
                    <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                  </View>
                </View>

                {/* Right Side: Avatar */}
                <View style={styles.avatarSection}>
                  <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8}>
                    <AvatarUI />
                  </TouchableOpacity>
                  {uploadingAvatar && <Text style={styles.uploadingText}>جاري الرفع...</Text>}
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* ---------------- CONTENT GRID ---------------- */}
          <View style={[styles.gridContainer, isDesktop && styles.desktopGridContainer]}>
            
            {/* COLUMN 1 (Right Side on Desktop) */}
            <View style={isDesktop ? styles.desktopCol : undefined}>
              {affiliateProfile && (
                <View style={styles.sectionWrapper}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>معلومات المسوق</Text>
                  <Card noPadding style={[styles.settingsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <SettingItem icon="qr-code-outline" label="رمز الإحالة" value={affiliateProfile.referral_code} color={theme.primary} />
                    <SettingItem icon="calendar-outline" label="تاريخ الانضمام" value={formatDate(affiliateProfile.created_at)} color="#00B894" />
                    <SettingItem icon="shield-checkmark-outline" label="حالة الحساب" value={affiliateProfile.is_active ? 'نشط' : 'قيد المراجعة'} color={affiliateProfile.is_active ? theme.primary : '#FDCB6E'} last />
                  </Card>
                </View>
              )}

              <View style={styles.sectionWrapper}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>التفضيلات</Text>
                <Card noPadding style={[styles.settingsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <SettingItem icon="notifications-outline" label="الإشعارات" onPress={() => router.push('/notifications')} color="#6C5CE7" />
                  <SettingItem icon={mode === 'dark' ? 'moon-outline' : 'sunny-outline'} label="المظهر" value={mode === 'dark' ? 'داكن' : 'فاتح'} onPress={toggleMode} color="#FDCB6E" last />
                </Card>
              </View>
            </View>

            {/* COLUMN 2 (Left Side on Desktop) */}
            <View style={isDesktop ? styles.desktopCol : undefined}>
              <View style={styles.sectionWrapper}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>الدعم والمعلومات</Text>
                <Card noPadding style={[styles.settingsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <SettingItem icon="help-circle-outline" label="مركز المساعدة" onPress={() => {}} color="#00CEC9" />
                  <SettingItem icon="document-text-outline" label="الشروط والأحكام" onPress={() => {}} color="#A29BFE" />
                  <SettingItem icon="information-circle-outline" label="حول التطبيق" value="الإصدار 1.2.0" color={theme.colors.textTertiary} last />
                </Card>
              </View>

              {/* REDESIGNED SIGNOUT BUTTON */}
              <TouchableOpacity 
                style={[styles.logoutBtn, { backgroundColor: mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#FECACA' }]}
                activeOpacity={0.7}
                onPress={() => setShowLogoutAlert(true)}
              >
                <View style={[styles.logoutIconBox, { backgroundColor: mode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
                  <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                </View>
                <Text style={styles.logoutBtnText}>تسجيل الخروج من الحساب</Text>
              </TouchableOpacity>
            </View>

          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {renderWebOverlay()}
      {renderMobileSheet()}

      <CustomAlert
        visible={showLogoutAlert}
        title="تسجيل الخروج"
        message="هل أنت متأكد أنك تريد إنهاء الجلسة وتسجيل الخروج؟"
        confirmText="نعم، تسجيل الخروج"
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
  centerWrapper: { flex: 1, alignItems: 'center' },
  container: { flex: 1, width: '100%' },
  contentContainer: { padding: spacing.md, alignSelf: 'center', width: '100%' },

  // --- HERO SECTION ---
  heroSection: { marginBottom: spacing.xl },
  profileHeroCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  desktopProfileHero: { padding: spacing.xxl },

  // Background Decorations
  cardCircle1: { position: 'absolute', top: -40, start: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
  cardCircle2: { position: 'absolute', bottom: -80, end: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)' },

  // Hero Content RTL Alignment
  profileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  
  // Custom Avatar
  avatarSection: { alignItems: 'center' },
  avatarWrap: { 
    position: 'relative', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.6)', 
    elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 100, resizeMode: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  cameraOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2, // Pin to standard corner, let I18nManager flip it naturally
    backgroundColor: '#3b82f6', 
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  uploadingText: { ...typography.caption, color: '#FFFFFF', marginTop: 8 },

  // Profile Text
  profileInfo: { flex: 1, marginHorizontal: spacing.lg, alignItems: 'flex-end' },
  profileName: { fontFamily: 'Tajawal_800ExtraBold', color: '#FFFFFF', fontSize: 24, textAlign: 'right', marginBottom: 6, writingDirection: 'rtl' },
  phoneRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 },
  profilePhone: { ...typography.body, color: 'rgba(255,255,255,0.9)', textAlign: 'right', writingDirection: 'rtl' },
  
  roleBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  roleBadgeText: { ...typography.small, fontFamily: 'Tajawal_700Bold', color: '#FFFFFF', writingDirection: 'rtl' },

  // Edit Button
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  editBtnText: { ...typography.small, fontFamily: 'Tajawal_700Bold', color: '#FFFFFF' },

  // --- CONTENT GRID SECTION ---
  gridContainer: { flex: 1 },
  desktopGridContainer: { flexDirection: 'row-reverse', gap: spacing.xl, alignItems: 'flex-start' },
  desktopCol: { flex: 1 },
  sectionWrapper: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md, textAlign: 'right', writingDirection: 'rtl' },

  settingsCard: { borderWidth: 1, borderRadius: borderRadius.lg, overflow: 'hidden' },
  
  // RTL setting Item
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: spacing.md },
  settingIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginEnd: spacing.md },
  settingTextContent: { flex: 1, alignItems: 'flex-start', justifyContent: 'center' }, // Texts align to start edge
  settingLabel: { ...typography.bodyBold, textAlign: 'left', writingDirection: 'rtl' },
  settingValue: { ...typography.caption, textAlign: 'right', marginTop: 2, writingDirection: 'rtl' },
  settingActionWrap: { width: 24, alignItems: 'center' },

  // --- NEW SIGNOUT BUTTON ---
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    marginTop: spacing.md,
  },
  logoutIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  logoutBtnText: {
    flex: 1,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  bottomSpacer: { height: 120 },

  // --- FORM OVERLAYS ---
  formContainer: { width: '100%', paddingVertical: spacing.sm, gap: spacing.xs },
  formDivider: { height: 1, width: '100%', marginVertical: spacing.sm },
  formSectionTitle: { ...typography.small, fontFamily: 'Tajawal_700Bold', textAlign: 'right', marginBottom: spacing.sm, writingDirection: 'rtl' },

  // Web Modal Specifics
  webModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  webModalContainer: { width: 550, maxWidth: '100%', borderRadius: borderRadius.xl, padding: spacing.xl, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 25, elevation: 10 },
  webModalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  webModalHeaderTexts: { flex: 1, alignItems: 'flex-start', marginStart: spacing.md },
  webModalTitle: { ...typography.h2, textAlign: 'left', marginBottom: spacing.xs, writingDirection: 'rtl' },
  webModalSubtitle: { ...typography.body, textAlign: 'left', writingDirection: 'rtl' },
  webModalCloseBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});