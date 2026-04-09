import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsive } from '../../src/hooks/useResponsive';
import WideTabShell from '../../src/components/navigation/WideTabShell';
import DesktopTabRail from '../../src/components/navigation/DesktopTabRail';
import { getHomeForRole } from '../../src/lib/roleRouter';

const RAIL_ITEMS = [
  { name: 'deliveries', label: 'التوصيلات', icon: 'car' },
  { name: 'completed', label: 'المكتملة', icon: 'checkmark-done-circle' },
  { name: 'payouts', label: 'السحب', icon: 'wallet' },
  { name: 'profile', label: 'حسابي', icon: 'person' },
];

export default function DeliveryLayout() {
  const profile = useAuthStore(s => s.profile);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const theme = useTheme();
  const { isWide } = useResponsive();
  const router = useRouter();

  // NAV-2: Imperative redirect — never render tabs for unauthorized users
  useEffect(() => {
    if (isLoading || (isAuthenticated && !profile)) return;
    if (!profile || profile.role !== 'delivery') {
      router.replace(profile ? getHomeForRole(profile.role) : '/(auth)/login');
    }
  }, [isLoading, isAuthenticated, profile]);

  // Fail-secure: render nothing while auth state is indeterminate
  if (isLoading || (isAuthenticated && !profile)) return null;
  if (!profile || profile.role !== 'delivery') return null;

  const tabs = (
    <Tabs
      initialRouteName="deliveries"
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
      }}
    >
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'التوصيلات',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'car' : 'car-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="completed"
        options={{
          title: 'المكتملة',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'checkmark-done-circle' : 'checkmark-done-circle-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="payouts"
        options={{
          title: 'السحب',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );

  return (
    <WideTabShell
      isWide={isWide}
      rail={<DesktopTabRail basePath="/(delivery)" items={RAIL_ITEMS} />}
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
