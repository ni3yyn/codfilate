import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Platform } from "react-native";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useTheme } from "../../src/hooks/useTheme";
import { useResponsive } from "../../src/hooks/useResponsive";
import WideTabShell from "../../src/components/navigation/WideTabShell";
import DesktopTabRail from "../../src/components/navigation/DesktopTabRail";
import FloatingTabBar from "../../src/components/navigation/FloatingTabBar";
import UniversalFAB from "../../src/components/ui/FAB";
import { getHomeForRole } from "../../src/lib/roleRouter";

const RAIL_ITEMS = [
  { name: "dashboard", label: "الرئيسية", icon: "grid" },
  { name: "product-approvals", label: "المنتجات", icon: "shield-checkmark" },
  { name: "merchants", label: "التجار", icon: "business" },
  { name: "orders", label: "الطلبات", icon: "receipt" },
  { name: "deliveries", label: "التوصيلات", icon: "car" },
  { name: "inventory", label: "المخزون", icon: "cube" },
  { name: "payouts", label: "السحب", icon: "wallet" },
  { name: "profile", label: "حسابي", icon: "person" },
];

export default function RegionalManagerLayout() {
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const theme = useTheme();
  const { isWide } = useResponsive();
  const router = useRouter();

  // NAV-2: Imperative redirect — never render tabs for unauthorized users
  useEffect(() => {
    if (isLoading || (isAuthenticated && !profile)) return;
    if (!profile || profile.role !== "regional_manager") {
      router.replace(profile ? getHomeForRole(profile.role) : "/(auth)/login");
    }
  }, [isLoading, isAuthenticated, profile]);

  // Fail-secure: render nothing while auth state is indeterminate
  if (isLoading || (isAuthenticated && !profile)) return null;
  if (!profile || profile.role !== "regional_manager") return null;

  const tabs = (
    <Tabs
      initialRouteName="dashboard"
      tabBar={(props) =>
        isWide ? null : <FloatingTabBar {...props} theme={theme} />
      }
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "الرئيسية", tabBarIconName: "grid" }}
      />
      <Tabs.Screen
        name="product-approvals"
        options={{ title: "المنتجات", tabBarIconName: "shield-checkmark" }}
      />
      <Tabs.Screen
        name="merchants"
        options={{ title: "التجار", tabBarIconName: "business" }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "الطلبات", tabBarIconName: "receipt" }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: "التوصيلات",
          tabBarIconName: "car",
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "المخزون",
          tabBarIconName: "cube",
        }}
      />
      <Tabs.Screen
        name="payouts"
        options={{ title: "السحب", tabBarIconName: "wallet" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "حسابي", tabBarIconName: "person" }}
      />
    </Tabs>
  );

  return (
    <>
      <WideTabShell
        isWide={isWide}
        rail={
          <DesktopTabRail basePath="/(regional_manager)" items={RAIL_ITEMS} />
        }
      >
        {tabs}
      </WideTabShell>
      <UniversalFAB />
    </>
  );
}
