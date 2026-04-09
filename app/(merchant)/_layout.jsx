import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsive } from '../../src/hooks/useResponsive';
import * as Haptics from 'expo-haptics';
import WideTabShell from '../../src/components/navigation/WideTabShell';
import DesktopTabRail from '../../src/components/navigation/DesktopTabRail';
import { getHomeForRole } from '../../src/lib/roleRouter';
import { useStoreStore } from '../../src/stores/useStoreStore';

const RAIL_ITEMS = [
  { name: 'dashboard', label: 'الرئيسية', icon: 'grid' },
  { name: 'products', label: 'المنتجات', icon: 'cube' },
  { name: 'categories', label: 'التصنيفات', icon: 'layers' },
  { name: 'orders', label: 'الطلبات', icon: 'receipt' },
  { name: 'affiliates', label: 'المسوقين', icon: 'people' },
  { name: 'reports', label: 'التقارير', icon: 'bar-chart' },
  { name: 'payouts', label: 'السحوبات', icon: 'wallet' },
  { name: 'settings', label: 'الإعدادات', icon: 'settings' },
];

export default function MerchantLayout() {
  const profile = useAuthStore(s => s.profile);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const theme = useTheme();
  const { isWide } = useResponsive();
  const router = useRouter();
  const fetchMyStore = useStoreStore(s => s.fetchMyStore);

  // Fetch store context centrally for all merchant tabs (fixes empty states on hard refreshes)
  useEffect(() => {
    if (!isLoading && isAuthenticated && profile?.role === 'merchant') {
      fetchMyStore();
    }
  }, [isLoading, isAuthenticated, profile?.role]);

  // NAV-2: Imperative redirect — never render tabs for unauthorized users
  useEffect(() => {
    if (isLoading || (isAuthenticated && !profile)) return;
    if (!profile || profile.role !== 'merchant') {
      router.replace(profile ? getHomeForRole(profile.role) : '/(auth)/login');
    }
  }, [isLoading, isAuthenticated, profile]);

  // Fail-secure: render nothing while auth state is indeterminate
  if (isLoading || (isAuthenticated && !profile)) return null;
  if (!profile || profile.role !== 'merchant') return null;

  const tabs = (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBar: isWide ? () => null : undefined,
        tabBarStyle: isWide
          ? { display: 'none' }
          : {
              backgroundColor: theme.isDark ? '#0A0A1A' : '#ffffff',
              borderTopWidth: 1,
              borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              height: Platform.OS === 'ios' ? 88 : 65,
              paddingBottom: Platform.OS === 'ios' ? 28 : 0,
              elevation: 0,
              shadowOpacity: 0,
            },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={20} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'المنتجات',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
               <Ionicons name={focused ? 'cube' : 'cube-outline'} size={20} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'التصنيفات',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'layers' : 'layers-outline'} size={20} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'الطلبات',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={20} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="affiliates"
        options={{
          title: 'المسوقين',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'people' : 'people-outline'} size={20} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'التقارير',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={20} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="payouts"
        options={{
          title: 'السحوبات',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={20} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={20} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
    </Tabs>
  );

  return (
    <WideTabShell
      isWide={isWide}
      rail={<DesktopTabRail basePath="/(merchant)" items={RAIL_ITEMS} />}
    >
      {tabs}
    </WideTabShell>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
});
