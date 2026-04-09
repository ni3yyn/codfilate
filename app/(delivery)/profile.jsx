import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useDeliveryStore } from '../../src/stores/useDeliveryStore';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import Card from '../../src/components/ui/Card';
import StatCard from '../../src/components/ui/StatCard';
import CustomAlert from '../../src/components/ui/CustomAlert';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency } from '../../src/lib/utils';

export default function DeliveryProfile() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const { stats } = useDeliveryStore();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const handleLogout = () => {
    setShowLogoutAlert(true);
  };

  const confirmLogout = async () => {
    setShowLogoutAlert(false);
    await signOut();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader title="حسابي" subtitle="شركة شحن" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={styles.profileCard} accentColor={theme.primary} accentPosition="left">
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="car" size={32} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: theme.colors.text }]}>
                {profile?.full_name || 'شركة شحن'}
              </Text>
              <Text style={[styles.profileRole, { color: theme.colors.textSecondary }]}>
                {profile?.wilayas?.name || 'ولاية غير محددة'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Stats */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>الإحصائيات</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="إجمالي التوصيلات"
            value={stats.totalDeliveries || 0}
            icon="car-outline"
            color={theme.primary}
          />
          <StatCard
            title="تم اليوم"
            value={stats.completedToday || 0}
            icon="checkmark-circle-outline"
            color={theme.primaryLight}
          />
          <StatCard
            title="نشطة"
            value={stats.pendingDeliveries || 0}
            icon="time-outline"
            color={theme.colors.warning}
          />
          <StatCard
            title="إجمالي الأرباح"
            value={formatCurrency(stats.totalEarned || 0)}
            icon="cash-outline"
            color={theme.primary}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: theme.error + '30', backgroundColor: theme.error + '08' }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={showLogoutAlert}
        title="تسجيل الخروج"
        message="هل أنت متأكد أنك تريد تسجيل الخروج؟ سيتم إغلاق الجلسة الحالية."
        confirmText="خروج"
        cancelText="إلغاء"
        type="destructive"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutAlert(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { 
    padding: spacing.md, 
    paddingBottom: 100,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  profileCard: { marginBottom: spacing.lg },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { ...typography.h3, marginBottom: 2 },
  profileRole: { ...typography.caption },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: { ...typography.button },
});
