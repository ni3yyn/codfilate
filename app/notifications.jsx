import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../src/hooks/useTheme";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useNotificationsStore } from "../src/stores/useNotificationsStore";
import { isSafeDeeplink } from "../src/lib/roleRouter";
import Card from "../src/components/ui/Card";
import Button from "../src/components/ui/Button";
import EmptyState from "../src/components/ui/EmptyState";
import LoadingSpinner from "../src/components/ui/LoadingSpinner";
import { typography, spacing, borderRadius } from "../src/theme/theme";
import { formatRelativeTime } from "../src/lib/utils";

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { items, isLoading, fetchNotifications, markRead, markAllRead } =
    useNotificationsStore();

  useEffect(() => {
    if (profile?.user_id) fetchNotifications(profile.user_id);
  }, [profile?.user_id]);

  const handleMarkAll = async () => {
    if (profile?.user_id) {
      await markAllRead(profile.user_id);
    }
  };

  const groupedItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = { today: [], yesterday: [], older: [] };

    items.forEach((item) => {
      const d = new Date(item.created_at);
      if (d >= today) groups.today.push(item);
      else if (d >= yesterday) groups.yesterday.push(item);
      else groups.older.push(item);
    });

    const result = [];
    if (groups.today.length) {
      result.push({ type: "header", title: "اليوم" });
      result.push(...groups.today);
    }
    if (groups.yesterday.length) {
      result.push({ type: "header", title: "الأمس" });
      result.push(...groups.yesterday);
    }
    if (groups.older.length) {
      result.push({ type: "header", title: "أقدم" });
      result.push(...groups.older);
    }

    return result;
  }, [items]);

  const getIconForNotification = (title = "") => {
    if (title.includes("طلب") || title.includes("طلبية"))
      return { name: "cube", color: "#0984E3" }; // blue
    if (
      title.includes("دفع") ||
      title.includes("سحب") ||
      title.includes("رصيد")
    )
      return { name: "wallet", color: "#00B894" }; // green
    if (title.includes("حساب") || title.includes("تسجيل"))
      return { name: "person", color: "#6C5CE7" }; // purple
    if (title.includes("منتج") || title.includes("مخزون"))
      return { name: "layers", color: "#FDCB6E" }; // yellow
    if (title.includes("رفض") || title.includes("ملغاة"))
      return { name: "close-circle", color: "#D63031" }; // red
    return { name: "notifications", color: theme.primary };
  };

  if (isLoading && items.length === 0) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.colors.background }]}
        edges={["top"]}
      >
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const unreadCount = items.filter((i) => !i.read_at).length;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
            style={styles.backBtn}
          >
            <Ionicons
              name="arrow-forward"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            الإشعارات
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: "#FF6B6B" }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAll}>
            <Text style={[styles.markAllText, { color: theme.primary }]}>
              تحديد الكل كمقروء
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={groupedItems}
        keyExtractor={(item, idx) => item.id || `header-${idx}`}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="لا يوجد إشعارات"
            message="ستظهر جميع تنبيهاتك وإشعاراتك المهمة هنا."
          />
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text
                style={[
                  styles.sectionHeader,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {item.title}
              </Text>
            );
          }

          const isUnread = !item.read_at;
          const iconInfo = getIconForNotification(item.title);

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={async () => {
                if (isUnread) await markRead(item.id, profile?.user_id);
                if (item.deeplink && isSafeDeeplink(item.deeplink))
                  router.push(item.deeplink);
              }}
            >
              <Card
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor: isUnread
                      ? theme.colors.surface
                      : theme.colors.background,
                    borderColor: isUnread
                      ? theme.primary + "30"
                      : theme.colors.border,
                    borderWidth: isUnread ? 1 : 1,
                  },
                ]}
                accentColor={isUnread ? theme.primary : "transparent"}
                accentPosition="left"
              >
                <View style={styles.row}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: iconInfo.color + "15" },
                    ]}
                  >
                    <Ionicons
                      name={iconInfo.name}
                      size={22}
                      color={iconInfo.color}
                    />
                  </View>
                  <View style={styles.content}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.itemTitle,
                          {
                            color: theme.colors.text,
                            fontFamily: isUnread
                              ? "Tajawal_700Bold"
                              : "Tajawal_500Medium",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {isUnread && (
                        <View
                          style={[
                            styles.unreadDot,
                            { backgroundColor: theme.primary },
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.itemBody,
                        {
                          color: isUnread
                            ? theme.colors.text
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {item.body}
                    </Text>

                    {/* Detail Pill if Data exists */}
                    {item.data && typeof item.data === "object" && (
                      <View style={styles.dataContainer}>
                        {item.data.order_id && (
                          <View
                            style={[
                              styles.dataPill,
                              { backgroundColor: theme.colors.surface2 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dataText,
                                { color: theme.colors.textSecondary },
                              ]}
                            >
                              رقم الطلب: {item.data.order_id.slice(0, 8)}
                            </Text>
                          </View>
                        )}
                        {item.data.amount && (
                          <View
                            style={[
                              styles.dataPill,
                              { backgroundColor: "#00B89415" },
                            ]}
                          >
                            <Text
                              style={[styles.dataText, { color: "#00B894" }]}
                            >
                              {item.data.amount} DZD
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.footerRow}>
                      <Text
                        style={[
                          styles.itemTime,
                          { color: theme.colors.textTertiary },
                        ]}
                      >
                        {formatRelativeTime(item.created_at)}
                      </Text>
                      {item.deeplink && (
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Text
                            style={{
                              ...typography.caption,
                              color: theme.primary,
                              fontFamily: "Tajawal_700Bold",
                            }}
                          >
                            عرض التفاصيل
                          </Text>
                          <Ionicons
                            name="chevron-back"
                            size={12}
                            color={theme.primary}
                            style={{ marginStart: 2 }}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { marginEnd: 12 },
  title: { ...typography.h2 },
  badge: {
    marginStart: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#FFF", fontSize: 11, fontFamily: "Tajawal_700Bold" },
  markAllText: { ...typography.caption, fontFamily: "Tajawal_700Bold" },
  list: { padding: spacing.md, paddingBottom: 100 },
  sectionHeader: {
    ...typography.h3,
    fontSize: 16,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  notificationCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  itemTitle: { fontSize: 15, flex: 1, marginEnd: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  itemBody: { ...typography.small, lineHeight: 20 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  itemTime: { ...typography.caption, fontSize: 11 },
  dataContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap",
  },
  dataPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dataText: { fontSize: 10, fontFamily: "Tajawal_700Bold" },
});
