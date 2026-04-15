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

const RAIL_ITEMS = [
  { name: "dashboard", label: "الرئيسية", icon: "grid" },
  { name: "campaigns", label: "الحملات", icon: "megaphone" },
  { name: "store", label: "المتجر", icon: "storefront" },
  { name: "orders", label: "الطلبات", icon: "receipt" },
  { name: "earnings", label: "الأرباح", icon: "cash" },
  { name: "payouts", label: "السحب", icon: "wallet" },
  { name: "profile", label: "حسابي", icon: "person" },
];

export default function AffiliateLayout() {
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const theme = useTheme();
  const { isWide } = useResponsive();
  const router = useRouter();

  // NAV-2: Imperative redirect — never render tabs for unauthorized users
  useEffect(() => {
    if (isLoading || (isAuthenticated && !profile)) return;
    if (!profile || profile.role !== "affiliate") {
      router.replace(profile ? getHomeForRole(profile.role) : "/(auth)/login");
    }
  }, [isLoading, isAuthenticated, profile]);

  // Fail-secure: render nothing while auth state is indeterminate
  if (isLoading || (isAuthenticated && !profile)) return null;
  if (!profile || profile.role !== "affiliate") return null;

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
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "الرئيسية", tabBarIconName: "grid" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{ title: "الحملات", tabBarIconName: "megaphone" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen
        name="store"
        options={{ title: "المتجر", tabBarIconName: "storefront" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "الطلبات", tabBarIconName: "receipt" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ title: "الأرباح", tabBarIconName: "cash" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen
        name="payouts"
        options={{ title: "السحب", tabBarIconName: "wallet" }}
        listeners={{ tabPress: hapticPress }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "حسابي", tabBarIconName: "person" }}
        listeners={{ tabPress: hapticPress }}
      />
    </Tabs>
  );

  return (
    <>
      <WideTabShell
        isWide={isWide}
        rail={<DesktopTabRail basePath="/(affiliate)" items={RAIL_ITEMS} />}
      >
        {tabs}
      </WideTabShell>
      <UniversalFAB />
    </>
  );
}
