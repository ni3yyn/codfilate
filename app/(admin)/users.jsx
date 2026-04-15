import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/hooks/useTheme";
import { supabase } from "../../src/lib/supabase";
import Button from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import Badge from "../../src/components/ui/Badge";
import Avatar from "../../src/components/ui/Avatar";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import {
  typography,
  spacing,
  borderRadius,
  gradients,
} from "../../src/theme/theme";
import { formatDate } from "../../src/lib/utils";

const ROLE_AR = {
  admin: "الإدارة العليا",
  merchant: "تاجر",
  affiliate: "مسوق",
  regional_manager: "المدير الإقليمي",
};
const ROLE_COLORS = {
  admin: "#FF6B6B",
  merchant: "#6C5CE7",
  affiliate: "#00CEC9",
  regional_manager: "#0984E3",
};
const ROLE_ICONS = {
  admin: "shield",
  merchant: "storefront",
  affiliate: "megaphone",
  regional_manager: "map-outline",
};
const ROLE_FILTERS = [
  { key: "all", label: "الكل", icon: "people-outline" },
  { key: "admin", label: "الإدارة العليا", icon: "shield-outline" },
  { key: "merchant", label: "التجار", icon: "storefront-outline" },
  { key: "affiliate", label: "المسوقين", icon: "megaphone-outline" },
  { key: "regional_manager", label: "مدير إقليمي", icon: "map-outline" },
];

/** أربعة أدوار فقط — الإدارة العليا، المدير الإقليمي، التاجر، المسوق */
const ASSIGNABLE_ROLES = ["admin", "merchant", "affiliate", "regional_manager"];

export default function AdminUsers() {
  const theme = useTheme();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      if (__DEV__) console.error("Fetch users error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesSearch =
      !search ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const roleCounts = {
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    merchant: users.filter((u) => u.role === "merchant").length,
    affiliate: users.filter((u) => u.role === "affiliate").length,
    regional_manager: users.filter((u) => u.role === "regional_manager").length,
  };

  const setUserRole = async (profileId, role) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", profileId);
    if (error) {
      if (__DEV__) console.error(error);
      return;
    }
    loadUsers();
  };

  const renderUser = ({ item }) => {
    const isExpanded = expandedUser === item.id;
    const roleColor = ROLE_COLORS[item.role] || theme.primary;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpandedUser(isExpanded ? null : item.id)}
      >
        <Card
          style={styles.userCard}
          accentColor={roleColor}
          accentPosition="left"
        >
          <View style={styles.userRow}>
            <Avatar
              name={item.full_name}
              imageUrl={item.avatar_url}
              size={48}
              showRing
              ringColor={roleColor}
            />
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.colors.text }]}>
                {item.full_name || "بدون اسم"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={theme.colors.textTertiary}
                  style={{ marginEnd: 4 }}
                />
                <Text
                  style={[
                    styles.userDate,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  انضم {formatDate(item.created_at)}
                </Text>
              </View>
            </View>
            <View style={styles.userRight}>
              <LinearGradient
                colors={[roleColor, roleColor + "CC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.roleBadge}
              >
                <Ionicons
                  name={ROLE_ICONS[item.role] || "person"}
                  size={12}
                  color="#FFFFFF"
                  style={{ marginEnd: 4 }}
                />
                <Text style={styles.roleBadgeText}>
                  {ROLE_AR[item.role] || item.role}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {isExpanded && (
            <View
              style={[
                styles.expandedContent,
                { borderTopColor: theme.colors.divider },
              ]}
            >
              <View
                style={[
                  styles.detailsBox,
                  { backgroundColor: theme.colors.shimmer },
                ]}
              >
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    المعرف:
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: theme.colors.text }]}
                    numberOfLines={1}
                  >
                    {item.user_id?.substring(0, 16)}...
                  </Text>
                </View>
                {item.phone && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="call-outline"
                      size={12}
                      color={theme.colors.textSecondary}
                      style={{ marginEnd: 4 }}
                    />
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      الهاتف:
                    </Text>
                    <Text
                      style={[styles.detailValue, { color: theme.colors.text }]}
                    >
                      {item.phone}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    الدور:
                  </Text>
                  <Text style={[styles.detailValue, { color: roleColor }]}>
                    {ROLE_AR[item.role] || item.role}
                  </Text>
                </View>
                {item.store_id && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="storefront-outline"
                      size={12}
                      color={theme.colors.textSecondary}
                      style={{ marginEnd: 4 }}
                    />
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      المتجر:
                    </Text>
                    <Text
                      style={[styles.detailValue, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {item.store_id.substring(0, 16)}...
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    📅 تاريخ الإنشاء:
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: theme.colors.text }]}
                  >
                    {formatDate(item.created_at)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    🔄 آخر تحديث:
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: theme.colors.text }]}
                  >
                    {formatDate(item.updated_at)}
                  </Text>
                </View>
                <View style={{ marginTop: 12, gap: 8 }}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    تغيير الدور
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <Button
                        key={r}
                        title={ROLE_AR[r]}
                        variant={item.role === r ? "gradient" : "outline"}
                        size="sm"
                        fullWidth={false}
                        onPress={() => setUserRole(item.id, r)}
                        style={{ paddingHorizontal: 10 }}
                      />
                    ))}
                  </View>
                  {item.role === "regional_manager" && (
                    <Button
                      title="تعيين الولايات"
                      variant="secondary"
                      onPress={() =>
                        router.push({
                          pathname: "/(admin)/assign-wilaya",
                          params: { profileId: item.id },
                        })
                      }
                    />
                  )}
                </View>
              </View>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="المستخدمين"
        rightAction={
          <Badge label={`${users.length} المجموع`} variant="primary" />
        }
      />

      <View
        style={{
          flexDirection: "row",
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
        }}
      >
        <Button
          title="إضافة مدير إقليمي"
          variant="gradient"
          size="sm"
          fullWidth={false}
          onPress={() => router.push("/(admin)/add-regional-manager")}
          style={{ flex: 1 }}
        />
        <Button
          title="تجار معلقون"
          variant="outline"
          size="sm"
          fullWidth={false}
          onPress={() => router.push("/(admin)/pending-merchants")}
          style={{ flex: 1 }}
        />
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={theme.colors.textTertiary}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="بحث بالاسم..."
          placeholderTextColor={theme.colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Role Filters */}
      <View style={styles.filters}>
        {ROLE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setRoleFilter(f.key)}
            activeOpacity={0.7}
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  roleFilter === f.key
                    ? theme.primary
                    : theme.isDark
                      ? theme.colors.surface2
                      : theme.colors.surface3,
                borderColor:
                  roleFilter === f.key ? theme.primary : "transparent",
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    roleFilter === f.key
                      ? "#FFFFFF"
                      : theme.colors.textSecondary,
                },
              ]}
            >
              {f.label} ({roleCounts[f.key]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && users.length === 0 ? (
        <LoadingSpinner message="جارٍ تحميل المستخدمين..." />
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="لا يوجد مستخدمين"
              message={
                search
                  ? "لم يتم العثور على نتائج للبحث."
                  : "لا يوجد مستخدمين مسجلين بعد."
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
    textAlign: "right",
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
  },
  filterText: { ...typography.small, fontFamily: "Tajawal_500Medium" },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 120 },
  userCard: { marginBottom: spacing.sm },
  userRow: { flexDirection: "row", alignItems: "center" },
  userInfo: { flex: 1, marginStart: spacing.md },
  userName: { ...typography.bodyBold, marginBottom: 2 },
  userDate: { ...typography.small },
  userRight: { alignItems: "flex-end" },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeText: {
    ...typography.small,
    color: "#FFFFFF",
    fontFamily: "Tajawal_700Bold",
    fontSize: 11,
  },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  detailsBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailLabel: { ...typography.caption, flex: 1 },
  detailValue: {
    ...typography.caption,
    fontFamily: "Tajawal_500Medium",
    flex: 1.5,
    textAlign: "left",
  },
});
