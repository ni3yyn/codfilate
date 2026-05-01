import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native-gesture-handler";

// Hooks & Stores
import { useTheme } from "../../src/hooks/useTheme";
import { supabase } from "../../src/lib/supabase";
import { useAlertStore } from "../../src/stores/useAlertStore";

// UI Components
import Button from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import Avatar from "../../src/components/ui/Avatar";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import ResponsiveModal from "../../src/components/ui/ResponsiveModal";

// Theme & Utils
import { typography, spacing, borderRadius } from "../../src/theme/theme";
import { formatDate } from "../../src/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────
const ROLE_AR = {
  admin: "الإدارة العليا",
  merchant: "تاجر",
  affiliate: "مسوق",
  regional_manager: "مدير إقليمي",
};

const ROLE_COLORS = {
  admin: "#EF4444",         // Red
  merchant: "#8B5CF6",      // Purple
  affiliate: "#10B981",     // Green
  regional_manager: "#3B82F6", // Blue
};

const ROLE_ICONS = {
  admin: "shield-checkmark",
  merchant: "storefront",
  affiliate: "megaphone",
  regional_manager: "map",
};

const ROLE_FILTERS = [
  { key: "all", label: "الكل", icon: "people-outline" },
  { key: "admin", label: "الإدارة العليا", icon: "shield-outline" },
  { key: "merchant", label: "التجار", icon: "storefront-outline" },
  { key: "affiliate", label: "المسوقين", icon: "megaphone-outline" },
  { key: "regional_manager", label: "مدير إقليمي", icon: "map-outline" },
];

const ASSIGNABLE_ROLES = ["admin", "merchant", "affiliate", "regional_manager"];

// ─── Memoized User Card ──────────────────────────────────────────────────────
const UserCard = React.memo(({ item, onPress, theme, isWide, isTablet }) => {
  const roleColor = ROLE_COLORS[item.role] || theme.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      style={isWide ? styles.cardWrapperDesktop : isTablet ? styles.cardWrapperTablet : styles.cardWrapperMobile}
    >
      <Card style={[styles.userCard, { borderColor: theme.colors.border }]}>
        <View style={[styles.accentEdge, { backgroundColor: roleColor }]} />

        <View style={styles.userRow}>
          <Avatar
            name={item.full_name}
            imageUrl={item.avatar_url}
            size={52}
            showRing
            ringColor={roleColor}
          />

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
              {item.full_name || "بدون اسم"}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={theme.colors.textTertiary} />
              <Text style={[styles.userDate, { color: theme.colors.textTertiary }]}>
                انضم {formatDate(item.created_at)}
              </Text>
            </View>
          </View>

          <View style={styles.userRight}>
            <View style={[styles.roleBadge, { backgroundColor: roleColor + "15", borderColor: roleColor + "30" }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                {ROLE_AR[item.role] || item.role}
              </Text>
              <Ionicons name={ROLE_ICONS[item.role] || "person"} size={12} color={roleColor} />
            </View>
            <Ionicons name="chevron-back" size={16} color={theme.colors.textSecondary} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────
export default function AdminUsers() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { showAlert } = useAlertStore();

  const isDesktop = width > 1100;
  const isTablet = width > 700 && width <= 1100;
  const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      if (__DEV__) console.error("Fetch users error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const setUserRole = useCallback(async (profileId, role) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
    if (error) {
      if (__DEV__) console.error(error);
      showAlert({ title: "خطأ", message: "فشل تحديث الدور", type: "error" });
      return;
    }
    loadUsers();
    setSelectedUser(prev => prev && prev.id === profileId ? { ...prev, role } : prev);
    showAlert({ title: "تم التحديث", message: "تم تغيير دور المستخدم بنجاح", type: "success" });
  }, [loadUsers, showAlert]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesSearch = !search || (u.full_name || "").toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, search]);

  const roleCounts = useMemo(() => ({
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    merchant: users.filter((u) => u.role === "merchant").length,
    affiliate: users.filter((u) => u.role === "affiliate").length,
    regional_manager: users.filter((u) => u.role === "regional_manager").length,
  }), [users]);

  const handleCopyId = (id) => {
    if (!id) return;
    Clipboard.setString(id);
    showAlert({ title: "تم النسخ", message: "تم نسخ المعرف بنجاح", type: "success" });
  };

  const renderItem = useCallback(({ item }) => (
    <UserCard
      item={item}
      onPress={setSelectedUser}
      theme={theme}
      isWide={isDesktop}
      isTablet={isTablet}
    />
  ), [theme, isDesktop, isTablet]);

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.topActionsRow}>
        <View style={styles.actionGroupRight}>
          <TouchableOpacity
            onPress={() => router.push("/(admin)/add-regional-manager")}
            style={[styles.dashboardActionBtn, { backgroundColor: theme.primary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#FFF" />
            <Text style={[styles.dashboardActionText, { color: '#FFF' }]}>إضافة مدير إقليمي</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(admin)/pending-merchants")}
            style={[styles.dashboardActionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
            activeOpacity={0.7}
          >
            <Ionicons name="time" size={18} color={theme.colors.textSecondary} />
            <Text style={[styles.dashboardActionText, { color: theme.colors.textSecondary }]}>تجار معلقون</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.totalUsersBadge, { backgroundColor: theme.primary + '15' }]}>
          <Text style={[styles.totalUsersText, { color: theme.primary }]}>
            {users.length} مستخدم
          </Text>
        </View>
      </View>

      <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: search ? theme.primary : theme.colors.border }]}>
        <Ionicons name="search" size={20} color={search ? theme.primary : theme.colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="ابحث عن طريق الاسم..."
          placeholderTextColor={theme.colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterWrapper}
      >
        {ROLE_FILTERS.map((f) => {
          const isActive = roleFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setRoleFilter(f.key)}
              activeOpacity={0.7}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? theme.primary : theme.colors.surface,
                  borderColor: isActive ? theme.primary : theme.colors.border,
                }
              ]}
            >
              <Text style={[styles.filterText, { color: isActive ? "#FFF" : theme.colors.textSecondary }]}>
                {f.label} ({roleCounts[f.key]})
              </Text>
              <Ionicons name={f.icon} size={14} color={isActive ? "#FFF" : theme.colors.textSecondary} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <UniversalHeader title="إدارة المستخدمين" subtitle="مراقبة وتعديل صلاحيات الحسابات" />

      {isLoading && !refreshing ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="لا يوجد مستخدمين"
              message={search ? "لم يتم العثور على نتائج تطابق بحثك." : "لا يوجد مستخدمين مسجلين بعد."}
            />
          }
        />
      )}

      <ResponsiveModal
        visible={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="إدارة المستخدم"
      >
        {selectedUser && (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Avatar
                name={selectedUser.full_name}
                imageUrl={selectedUser.avatar_url}
                size={80}
                showRing
                ringColor={ROLE_COLORS[selectedUser.role]}
              />
              <Text style={[styles.modalName, { color: theme.colors.text }]}>{selectedUser.full_name}</Text>
              <View style={[styles.modalRoleBadge, { backgroundColor: ROLE_COLORS[selectedUser.role] + '20' }]}>
                <Text style={{ color: ROLE_COLORS[selectedUser.role], fontFamily: 'Tajawal_700Bold' }}>
                  {ROLE_AR[selectedUser.role]}
                </Text>
              </View>
            </View>

            <View style={[styles.detailsBox, { backgroundColor: theme.colors.surface2 }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>المعرف:</Text>
                <TouchableOpacity onPress={() => handleCopyId(selectedUser.user_id)} style={styles.copyRow}>
                  <Text style={[styles.detailValue, { color: theme.colors.text, fontFamily: 'monospace' }]}>
                    {selectedUser.user_id?.substring(0, 20)}...
                  </Text>
                  <Ionicons name="copy-outline" size={16} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              </View>

              {selectedUser.phone && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>الهاتف:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedUser.phone}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>تاريخ الانضمام:</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{formatDate(selectedUser.created_at)}</Text>
              </View>
            </View>

            <View style={styles.roleManagerArea}>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.text }]}>تغيير صلاحيات الحساب</Text>
              <View style={styles.roleChipsGroup}>
                {ASSIGNABLE_ROLES.map((r) => {
                  const isActive = selectedUser.role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => !isActive && setUserRole(selectedUser.id, r)}
                      style={[
                        styles.roleChip,
                        {
                          backgroundColor: isActive ? ROLE_COLORS[r] : theme.colors.surface,
                          borderColor: isActive ? ROLE_COLORS[r] : theme.colors.border,
                        }
                      ]}
                    >
                      <Text style={[styles.roleChipText, { color: isActive ? '#FFF' : theme.colors.textSecondary }]}>
                        {ROLE_AR[r]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedUser.role === "regional_manager" && (
                <Button
                  title="تعيين ولايات الإشراف"
                  variant="outline"
                  icon="map"
                  onPress={() => {
                    const id = selectedUser.id;
                    setSelectedUser(null);
                    router.push({ pathname: "/(admin)/assign-wilaya", params: { profileId: id } });
                  }}
                  style={styles.rmActionBtn}
                />
              )}
            </View>
          </View>
        )}
      </ResponsiveModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: 120,
    alignSelf: "center",
    width: "100%",
    maxWidth: 1400,
  },
  gridRow: {
    gap: spacing.md,
    justifyContent: 'flex-start',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  cardWrapperDesktop: { flex: 1, maxWidth: '32.5%', minWidth: 340 },
  cardWrapperTablet: { flex: 1, maxWidth: '48.5%', minWidth: 320 },
  cardWrapperMobile: { width: '100%', marginBottom: spacing.md },
  headerContainer: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  actionGroupRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dashboardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  dashboardActionText: { fontFamily: 'Tajawal_700Bold', fontSize: 13 },
  totalUsersBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  totalUsersText: { fontFamily: 'Tajawal_700Bold', fontSize: 13 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...typography.body,
    fontFamily: "Tajawal_500Medium",
    textAlign: "right",
  },
  filterWrapper: { height: 46, marginBottom: spacing.xs },
  filterScroll: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
  },
  filterText: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  userCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  accentEdge: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 4 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    paddingRight: spacing.md + 6,
  },
  userInfo: {
    flex: 1,
    alignItems: "flex-start",
    marginHorizontal: spacing.md,
  },
  userName: { fontFamily: "Tajawal_800ExtraBold", fontSize: 16, marginBottom: 4, textAlign: 'right' },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  userDate: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  userRight: { alignItems: "flex-end", gap: 10 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  roleBadgeText: { fontFamily: "Tajawal_700Bold", fontSize: 10 },
  modalContent: {
    paddingBottom: 20,
  },
  modalHeader: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalName: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 22,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  modalRoleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  detailsBox: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  detailLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
  detailValue: { fontFamily: "Tajawal_700Bold", fontSize: 14, textAlign: "left" },
  copyRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(0,0,0,0.05)', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  roleManagerArea: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  sectionSubtitle: { 
    fontFamily: "Tajawal_800ExtraBold", 
    fontSize: 15, 
    textAlign: "right", 
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  roleChipsGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.lg,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  roleChipText: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  rmActionBtn: {
    marginTop: spacing.xs,
    borderStyle: 'dashed',
    height: 50,
  },
});