import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useRegionalManagerStore } from '../../src/stores/useRegionalManagerStore';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import Card from '../../src/components/ui/Card';
import StatCard from '../../src/components/ui/StatCard';
import CustomAlert from '../../src/components/ui/CustomAlert';
import { typography, spacing, borderRadius } from '../../src/theme/theme';
import { formatCurrency } from '../../src/lib/utils';
import { REGIONAL_MANAGER_FEE } from '../../src/lib/constants';

export default function RegionalManagerProfile() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const { stats } = useRegionalManagerStore();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const handleLogout = () => {
    setShowLogoutAlert(true);
  };

  const onConfirmLogout = async () => {
    setShowLogoutAlert(false);
    await signOut();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader title="حسابي" subtitle="مدير إقليمي" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <Card style={styles.profileCard} accentColor={theme.primary} accentPosition="top">
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="person" size={32} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: theme.colors.text }]}>
                {profile?.full_name || 'مدير إقليمي'}
              </Text>
              <Text style={[styles.profileRole, { color: theme.colors.textSecondary }]}>
                {profile?.wilayas?.name || 'ولاية غير محددة'} · {profile?.assigned_wilayas?.length || 0} ولاية
              </Text>
            </View>
          </View>
        </Card>

        {/* Earnings Summary */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>الأرباح</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="أرباح الشهر"
            value={formatCurrency(stats.monthlyEarnings || 0)}
            icon="cash-outline"
            color={theme.primary}
          />
          <StatCard
            title="إجمالي الطلبات"
            value={stats.totalOrders || 0}
            icon="receipt-outline"
            color={theme.primaryLight}
          />
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>الربح لكل طلبية</Text>
            <Text style={[styles.infoValue, { color: theme.primary }]}>{formatCurrency(REGIONAL_MANAGER_FEE)}</Text>
          </View>
        </Card>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: theme.error + '40', backgroundColor: theme.error + '08' }]}
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
        message="هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟"
        confirmText="خروج"
        cancelText="بقاء"
        type="destructive"
        onConfirm={onConfirmLogout}
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
    marginBottom: spacing.lg,
  },
  infoCard: { marginBottom: spacing.xl },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { ...typography.body },
  infoValue: { ...typography.h3 },
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
