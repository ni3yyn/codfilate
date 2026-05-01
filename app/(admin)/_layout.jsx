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
  { name: "dashboard", label: "النظرة العامة", icon: "grid" },
  { name: "stores", label: "المتاجر", icon: "storefront" },
  { name: "users", label: "المستخدمين", icon: "people" },
  { name: "payouts", label: "السحوبات", icon: "wallet" },
  { name: "deliveries", label: "التوصيل", icon: "car" },
  { name: "fees", label: "الرسوم", icon: "pricetag" },
  { name: "operations", label: "العمليات", icon: "pulse" },
];

export default function AdminLayout() {
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const theme = useTheme();
  const { isWide } = useResponsive();
  const router = useRouter();

  // NAV-2: Imperative redirect — never render tabs for unauthorized users
  useEffect(() => {
    if (isLoading || (isAuthenticated && !profile)) return;
    if (!profile || profile.role !== "admin") {
      router.replace(profile ? getHomeForRole(profile.role) : "/(auth)/login");
    }
  }, [isLoading, isAuthenticated, profile]);

  // Fail-secure: render nothing while auth state is indeterminate
  if (isLoading || (isAuthenticated && !profile)) return null;
  if (!profile || profile.role !== "admin") return null;

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
        options={{ title: "النظرة العامة", tabBarIconName: "grid" }}
      />
      <Tabs.Screen
        name="stores"
        options={{ title: "المتاجر", tabBarIconName: "storefront" }}
      />
      <Tabs.Screen
        name="users"
        options={{ title: "المستخدمين", tabBarIconName: "people" }}
      />
      <Tabs.Screen
        name="payouts"
        options={{ title: "السحوبات", tabBarIconName: "wallet" }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: "التوصيل",
          tabBarIconName: "car",
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{ title: "الرسوم", tabBarIconName: "pricetag" }}
      />
      <Tabs.Screen
        name="operations"
        options={{ title: "العمليات", tabBarIconName: "pulse" }}
      />
      <Tabs.Screen name="assign-wilaya" options={{ href: null }} />
      <Tabs.Screen name="add-regional-manager" options={{ href: null }} />
      <Tabs.Screen name="pending-merchants" options={{ href: null }} />
    </Tabs>
  );

  return (
    <>
      <WideTabShell
        isWide={isWide}
        rail={<DesktopTabRail basePath="/(admin)" items={RAIL_ITEMS} />}
      >
        {tabs}
      </WideTabShell>
      <UniversalFAB />
    </>
  );
}
