import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useTheme } from '../../src/hooks/useTheme';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import { typography, spacing, borderRadius, gradients } from '../../src/theme/theme';
import { ROLES } from '../../src/lib/constants';
import { SELF_REGISTRATION_ROLES, navigateToRoleHome } from '../../src/lib/roleRouter';
import { useResponsive } from '../../src/hooks/useResponsive';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isWide } = useResponsive();
  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES.AFFILIATE);
  const [error, setError] = useState('');

  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(formAnim, {
        toValue: 0,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
      return;
    }

    // SEC-1: Validate role against allowlist before sending to server
    if (!SELF_REGISTRATION_ROLES.includes(role)) {
      setError('نوع الحساب غير مسموح به');
      return;
    }

    const result = await signUp(email.trim(), password, role, fullName.trim());
    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.requiresVerification) {
      router.replace('/(auth)/login');
      return;
    }

    const profile = useAuthStore.getState().profile;
    if (role === ROLES.MERCHANT && profile?.onboarding_completed === false) {
      router.replace('/(merchant)/onboarding');
    } else {
      navigateToRoleHome(router, profile || { role });
    }
  };

  const RoleOption = ({ value, label, icon, description }) => {
    const isSelected = role === value;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.97,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
      setRole(value);
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={[
            styles.roleOption,
            {
              backgroundColor: isSelected
                ? theme.primary + '10'
                : theme.colors.surfaceElevated,
              borderColor: isSelected ? theme.primary : theme.colors.border,
            },
          ]}
        >
          <LinearGradient
            colors={
              isSelected
                ? [theme.primary + '30', theme.primary + '10']
                : [theme.colors.surface2 || theme.colors.borderLight, theme.colors.borderLight]
            }
            style={styles.roleIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={icon}
              size={24}
              color={isSelected ? theme.primary : theme.colors.textSecondary}
            />
          </LinearGradient>
          <View style={styles.roleInfo}>
            <Text
              style={[
                styles.roleLabel,
                {
                  color: isSelected ? theme.primary : theme.colors.text,
                },
              ]}
            >
              {label}
            </Text>
            <Text
              style={[styles.roleDesc, { color: theme.colors.textSecondary }]}
            >
              {description}
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              {
                borderColor: isSelected ? theme.primary : theme.colors.border,
                backgroundColor: isSelected ? theme.primary : 'transparent',
              },
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={
          theme.isDark
            ? ['#1A1040', '#0A0A1A', '#0A0A1A']
            : ['#E8E5FF', '#F5F6FA', '#F5F6FA']
        }
        style={styles.topGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View
              style={[styles.header, { opacity: headerAnim }]}
            >
              <Text style={[styles.title, { color: theme.colors.text }]}>
                إنشاء حساب
              </Text>
              <Text
                style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              >
                اختر دورك للبدء
              </Text>
            </Animated.View>

            {/* Role Selection */}
            <Animated.View
              style={[
                styles.roleContainer,
                {
                  opacity: formOpacity,
                  transform: [{ translateY: formAnim }],
                },
              ]}
            >
              <RoleOption
                value={ROLES.MERCHANT}
                label="تاجر"
                icon="storefront-outline"
                description="إنشاء متجر وبيع المنتجات"
              />
              <RoleOption
                value={ROLES.AFFILIATE}
                label="مسوق"
                icon="megaphone-outline"
                description="الترويج للمنتجات وكسب العمولات"
              />
            </Animated.View>

            {/* Form */}
            <Animated.View
              style={[
                styles.formCard,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(19, 19, 43, 0.6)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(0, 0, 0, 0.04)',
                  opacity: formOpacity,
                  transform: [{ translateY: formAnim }],
                },
              ]}
            >
              <Input
                label="الاسم الكامل"
                value={fullName}
                onChangeText={setFullName}
                placeholder="أدخل اسمك الكامل"
                icon="person-outline"
              />
              <Input
                label="البريد الإلكتروني"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                icon="mail-outline"
              />
              <Input
                label="كلمة المرور"
                value={password}
                onChangeText={setPassword}
                placeholder="6 أحرف كحد أدنى"
                secureTextEntry
                icon="lock-closed-outline"
              />

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="إنشاء حساب"
                onPress={handleRegister}
                loading={isLoading}
                variant="gradient"
                style={styles.button}
              />
            </Animated.View>

            {/* Footer */}
            <Animated.View
              style={[styles.footer, { opacity: formOpacity }]}
            >
              <Text
                style={[styles.footerText, { color: theme.colors.textSecondary }]}
              >
                لديك حساب بالفعل؟{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={[styles.link, { color: theme.primary }]}>
                  تسجيل الدخول
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  scrollWide: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
  },
  roleContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  roleDesc: {
    ...typography.caption,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#FF6B6B',
    ...typography.caption,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  footerText: { ...typography.body },
  link: { ...typography.bodyBold },
});
