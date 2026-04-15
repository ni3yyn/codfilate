import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Platform } from "react-native";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useTheme } from "../../src/hooks/useTheme";
import { useResponsive } from "../../src/hooks/useResponsive";
import * as Haptics from "expo-haptics";
import WideTabShell from "../../src/components/navigation/WideTabShell";
import DesktopTabRail from "../../src/components/navigation/DesktopTabRail";
import FloatingTabBar from "../../src/components/navigation/FloatingTabBar";
import UniversalFAB from "../../src/components/ui/FAB";
import { getHomeForRole } from "../../src/lib/roleRouter";
import { useStoreStore } from "../../src/stores/useStoreStore";

const RAIL_ITEMS = [
  { name: "dashboard", label: "الرئيسية", icon: "grid" },
  { name: "products", label: "المنتجات", icon: "cube" },
  { name: "categories", label: "التصنيفات", icon: "layers" },
  { name: "orders", label: "الطلبات", icon: "receipt" },
  { name: "affiliates", label: "المسوقين", icon: "people" },
  { name: "reports", label: "التقارير", icon: "bar-chart" },
  { name: "payouts", label: "السحوبات", icon: "wallet" },
  { name: "settings", label: "الإعدادات", icon: "settings" },
];

export default function MerchantLayout() {
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const theme = useTheme();
  const { isWide } = useResponsive();
  const router = useRouter();
  const fetchMyStore = useStoreStore((s) => s.fetchMyStore);

  // Fetch store context centrally for all merchant tabs (fixes empty states on hard refreshes)
  useEffect(() => {
    if (!isLoading && isAuthenticated && profile?.role === "merchant") {
      fetchMyStore();
    }
  }, [isLoading, isAuthenticated, profile?.role]);

  // NAV-2: Imperative redirect — never render tabs for unauthorized users
  useEffect(() => {
    if (isLoading || (isAuthenticated && !profile)) return;
    if (!profile || profile.role !== "merchant") {
      router.replace(profile ? getHomeForRole(profile.role) : "/(auth)/login");
    }
  }, [isLoading, isAuthenticated, profile]);

  // Fail-secure: render nothing while auth state is indeterminate
  if (isLoading || (isAuthenticated && !profile)) return null;
  if (!profile || profile.role !== "merchant") return null;

  const hapticPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const tabs = (
    <Tabs
      initialRouteName="dashboard"
      tabBar={(props) =>
        isWide ? null : <FloatingTabBar {...props} theme={theme} />
      }
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "الرئيسية", tabBarIconName: "grid" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: "المنتجات", tabBarIconName: "cube" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "التصنيفات",
          tabBarIconName: "layers",
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "الطلبات", tabBarIconName: "receipt" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen
        name="affiliates"
        options={{ title: "المسوقين", tabBarIconName: "people" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "التقارير",
          tabBarIconName: "bar-chart",
        }}
      />
      <Tabs.Screen
        name="payouts"
        options={{
          title: "السحوبات",
          tabBarIconName: "wallet",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "الإعدادات", tabBarIconName: "settings" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
    </Tabs>
  );

  return (
    <>
      <WideTabShell
        isWide={isWide}
        rail={<DesktopTabRail basePath="/(merchant)" items={RAIL_ITEMS} />}
      >
        {tabs}
      </WideTabShell>
      <UniversalFAB />
    </>
  );
}
