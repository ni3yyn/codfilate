import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useTheme } from "../../src/hooks/useTheme";
import { useResponsive } from "../../src/hooks/useResponsive";
import WideTabShell from "../../src/components/navigation/WideTabShell";
import DesktopTabRail from "../../src/components/navigation/DesktopTabRail";
import FloatingTabBar from "../../src/components/navigation/FloatingTabBar";
import { getHomeForRole } from "../../src/lib/roleRouter";

const RAIL_ITEMS = [
  { name: "controls", label: "لوحة التحكم", icon: "settings" },
];

export default function DeveloperLayout() {
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const theme = useTheme();
  const { isWide } = useResponsive();
  const router = useRouter();

  // NAV-2: Imperative redirect — never render tabs for unauthorized users
  useEffect(() => {
    if (isLoading || (isAuthenticated && !profile)) return;
    if (!profile || profile.role !== "developer") {
      router.replace(profile ? getHomeForRole(profile.role) : "/(auth)/login");
    }
  }, [isLoading, isAuthenticated, profile]);

  // Fail-secure: render nothing while auth state is indeterminate
  if (isLoading || (isAuthenticated && !profile)) return null;
  if (!profile || profile.role !== "developer") return null;

  const tabs = (
    <Tabs
      initialRouteName="controls"
      tabBar={(props) =>
        isWide ? null : <FloatingTabBar {...props} theme={theme} />
      }
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="controls"
        options={{ title: "لوحة التحكم", tabBarIconName: "settings" }}
      />
    </Tabs>
  );

  return (
    <WideTabShell
      isWide={isWide}
      rail={<DesktopTabRail basePath="/(developer)" items={RAIL_ITEMS} />}
    >
      {tabs}
    </WideTabShell>
  );
}
