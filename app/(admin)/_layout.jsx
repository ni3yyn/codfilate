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
  { name: 'dashboard', label: 'النظرة العامة', icon: 'grid' },
  { name: 'stores', label: 'المتاجر', icon: 'storefront' },
  { name: 'users', label: 'المستخدمين', icon: 'people' },
  { name: 'payouts', label: 'السحوبات', icon: 'wallet' },
  { name: 'deliveries', label: 'التوصيل', icon: 'car' },
  { name: 'fees', label: 'الرسوم', icon: 'pricetag' },
];

export default function AdminLayout() {
  const profile = useAuthStore(s => s.profile);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const theme = useTheme();
  const { isWide } = useResponsive();
  const router = useRouter();

  // NAV-2: Imperative redirect — never render tabs for unauthorized users
  useEffect(() => {
    if (isLoading || (isAuthenticated && !profile)) return;
    if (!profile || profile.role !== 'admin') {
      router.replace(profile ? getHomeForRole(profile.role) : '/(auth)/login');
    }
  }, [isLoading, isAuthenticated, profile]);

  // Fail-secure: render nothing while auth state is indeterminate
  if (isLoading || (isAuthenticated && !profile)) return null;
  if (!profile || profile.role !== 'admin') return null;

  const tabBarStyle = isWide
    ? { display: 'none' }
    : {
        backgroundColor: theme.colors.tabBar,
        borderTopWidth: 0,
        height: Platform.OS === 'ios' ? 88 : 70,
        paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        paddingTop: 8,
        marginHorizontal: 12,
        marginBottom: Platform.OS === 'ios' ? 0 : 8,
        borderRadius: 20,
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 8,
      };

  const tabs = (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBar: isWide ? () => null : undefined,
        tabBarStyle,
        tabBarLabelStyle: {
          fontFamily: 'Tajawal_500Medium',
          fontSize: 10,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'النظرة العامة',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: 'المتاجر',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'المستخدمين',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'people' : 'people-outline'} size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="payouts"
        options={{
          title: 'السحوبات',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'التوصيل',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'car' : 'car-outline'} size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          title: 'الرسوم',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIcon, { backgroundColor: theme.primary + '15' }] : null}>
              <Ionicons name={focused ? 'pricetag' : 'pricetag-outline'} size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="assign-wilaya"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="add-regional-manager" options={{ href: null }} />
      <Tabs.Screen name="pending-merchants" options={{ href: null }} />
    </Tabs>
  );

  return (
    <WideTabShell
      isWide={isWide}
      rail={<DesktopTabRail basePath="/(admin)" items={RAIL_ITEMS} />}
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
