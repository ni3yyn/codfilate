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

const RAIL_ITEMS = [
  { name: 'dashboard', label: 'الرئيسية', icon: 'grid' },
  { name: 'store', label: 'المتجر', icon: 'storefront' },
  { name: 'orders', label: 'الطلبات', icon: 'receipt' },
  { name: 'earnings', label: 'الأرباح', icon: 'cash' },
  { name: 'payouts', label: 'السحب', icon: 'wallet' },
  { name: 'profile', label: 'حسابي', icon: 'person' },
];

export default function AffiliateLayout() {
  const profile = useAuthStore(s => s.profile);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const theme = useTheme();
  const { isWide } = useResponsive();
  const router = useRouter();

  // NAV-2: Imperative redirect — never render tabs for unauthorized users
  useEffect(() => {
    if (isLoading || (isAuthenticated && !profile)) return;
    if (!profile || profile.role !== 'affiliate') {
      router.replace(profile ? getHomeForRole(profile.role) : '/(auth)/login');
    }
  }, [isLoading, isAuthenticated, profile]);

  // Fail-secure: render nothing while auth state is indeterminate
  if (isLoading || (isAuthenticated && !profile)) return null;
  if (!profile || profile.role !== 'affiliate') return null;

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
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'روابط',
          href: null,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'المتجر',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={21} color={color} />
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
              <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={21} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'الأرباح',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'cash' : 'cash-outline'} size={21} color={color} />
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
          title: 'السحب',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={21} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={21} color={color} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
    </Tabs>
  );

  return (
    <WideTabShell
      isWide={isWide}
      rail={<DesktopTabRail basePath="/(affiliate)" items={RAIL_ITEMS} />}
    >
      {tabs}
    </WideTabShell>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
