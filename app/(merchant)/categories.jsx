import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
  useWindowDimensions,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { useStoreStore } from "../../src/stores/useStoreStore";
import { useCategoryStore } from "../../src/stores/useCategoryStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import Card from "../../src/components/ui/Card";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import { spacing } from "../../src/theme/theme";
import { PRESET_CATEGORIES, CATEGORY_THEMES } from "../../src/config/presetCategories";

// Premium Tokens matching Cinematic UI
const COLORS = {
  primary: '#2D6A4F',
  primaryHover: '#1B4332',
  bgMain: '#F8F9FA',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#475569',
  textLight: '#94A3B8',
  border: 'rgba(15, 23, 42, 0.08)',
  accentMint: '#74C69D',
};

export default function CategoriesScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const currentStore = useStoreStore((s) => s.currentStore);
  const { showAlert } = useAlertStore();
  const {
    storeCategories,
    isLoading,
    fetchStoreCategories,
    toggleStoreCategory,
  } = useCategoryStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Optimistic UI State for ZERO delay multi-selection
  const [localActiveIds, setLocalActiveIds] = useState(new Set());

  const storeId = currentStore?.id;
  const isWeb = Platform.OS === 'web';

  const loadData = useCallback(async () => {
    if (storeId) {
      await fetchStoreCategories(storeId);
    }
  }, [storeId, fetchStoreCategories]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync server state to local optimistic state whenever server data arrives
  useEffect(() => {
    const activeSet = new Set();
    PRESET_CATEGORIES.forEach(item => {
      const isActive = storeCategories.some(c => {
        const dbCat = c.categories || c;
        return (
          dbCat.name_normalized === item.id ||
          (dbCat.name_ar && dbCat.name_ar === item.name_ar) ||
          (dbCat.id === item.id)
        );
      });
      if (isActive) activeSet.add(item.id);
    });
    setLocalActiveIds(activeSet);
  }, [storeCategories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const groupedData = useMemo(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = PRESET_CATEGORIES.filter(cat =>
        cat.id.toLowerCase().includes(query) ||
        (cat.name_ar && cat.name_ar.includes(query)) ||
        (cat.name_fr && cat.name_fr.toLowerCase().includes(query)) ||
        cat.name?.toLowerCase().includes(query)
      );
      return [{ type: 'search', categories: filtered }];
    }

    return CATEGORY_THEMES.map(t => ({
      type: 'theme',
      id: t.id,
      name: t.name,
      name_ar: t.name_ar,
      icon: t.icon,
      categories: t.categories
    }));
  }, [searchQuery]);

  const handleToggle = (item) => {
    const presetId = item.id;
    const currentlyActive = localActiveIds.has(presetId);

    // 1. Instantly update UI (Optimistic Update)
    setLocalActiveIds(prev => {
      const next = new Set(prev);
      if (currentlyActive) next.delete(presetId);
      else next.add(presetId);
      return next;
    });

    // 2. Perform API call in background without blocking UI
    toggleStoreCategory(storeId, presetId, !currentlyActive).then(result => {
      if (!result.success) {
        // Revert local state if API fails
        setLocalActiveIds(prev => {
          const next = new Set(prev);
          if (currentlyActive) next.add(presetId); // Revert to true
          else next.delete(presetId); // Revert to false
          return next;
        });
        showAlert({ title: "خطأ", message: result.error || "فشل تحديث التصنيف", type: "error" });
      }
    });
  };

  const renderCategoryItem = (item) => {
    const isActive = localActiveIds.has(item.id);

    return (
      <View key={item.id} style={[styles.catCardWrapper, isWeb && width >= 600 && styles.catCardWrapperWeb]}>
        <TouchableOpacity
          onPress={() => handleToggle(item)}
          activeOpacity={0.8}
          style={{ flex: 1 }}
        >
          <Card
            style={[
              styles.catCard,
              !isWeb && styles.catCardMobile,
              { backgroundColor: theme.isDark ? (isActive ? 'rgba(45, 106, 79, 0.15)' : 'rgba(30, 41, 59, 0.7)') : (isActive ? 'rgba(116, 198, 157, 0.08)' : COLORS.bgWhite) },
              { borderColor: theme.isDark ? (isActive ? 'rgba(116, 198, 157, 0.3)' : 'rgba(255, 255, 255, 0.05)') : (isActive ? COLORS.accentMint : COLORS.border) }
            ]}
            noPadding
          >
            <View style={styles.catRow}>

              {/* 1. RIGHT SIDE: Icon */}
              <View style={[styles.catIcon, { backgroundColor: isActive ? COLORS.primary : (theme.isDark ? '#1E293B' : COLORS.bgMain) }]}>
                <Ionicons
                  name={item.icon || "layers-outline"}
                  size={24}
                  color={isActive ? COLORS.bgWhite : COLORS.textLight}
                />
              </View>

              {/* 2. MIDDLE: Text Info */}
              <View style={styles.catInfo}>
                <Text style={[styles.catName, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]} numberOfLines={1}>
                  {item.name_ar || item.name}
                </Text>
                <Text style={[styles.catStatus, { color: isActive ? COLORS.primary : (theme.isDark ? '#94A3B8' : COLORS.textLight) }]}>
                  {isActive ? 'نشط ومفعل' : 'غير مفعل'}
                </Text>
              </View>

              {/* 3. LEFT SIDE: Action Button */}
              <View style={styles.actionArea}>
                <View
                  style={[
                    styles.toggleIconButton,
                    { backgroundColor: isActive ? COLORS.primary : (theme.isDark ? '#334155' : COLORS.bgMain) }
                  ]}
                >
                  <Ionicons
                    name={isActive ? "checkmark" : "add"}
                    size={20}
                    color={isActive ? COLORS.bgWhite : COLORS.textLight}
                  />
                </View>
              </View>

            </View>
          </Card>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTheme = ({ item }) => (
    <View style={styles.themeSection}>
      {item.type === 'theme' && (
        <View style={styles.themeHeader}>
          <Ionicons name={item.icon} size={22} color={COLORS.primary} />
          <Text style={[styles.themeTitle, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}>
            {item.name_ar}
          </Text>
        </View>
      )}
      <View style={[styles.themeGrid, !isWeb && styles.themeGridMobile]}>
        {item.categories.map(cat => renderCategoryItem(cat))}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.isDark ? '#0A0A1A' : COLORS.bgMain }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="تخصص المتجر"
        subtitle="اختر التصنيفات الدقيقة التي تناسب تخصص متجرك"
      />

      <View style={[styles.contentContainer, isWeb && width >= 600 && { maxWidth: 1000, alignSelf: 'center', width: '100%' }]}>
        <View style={[
          styles.searchSection,
          Platform.OS === 'web' && { className: 'glass-panel' },
          { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.8)" : COLORS.bgWhite, borderColor: theme.isDark ? "rgba(255, 255, 255, 0.05)" : COLORS.border }
        ]}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
            <TextInput
              style={[styles.searchInput, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}
              placeholder="ابحث عن تخصص (مثال: فساتين)..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {isLoading && storeCategories.length === 0 && !refreshing ? (
          <LoadingSpinner message="جارٍ تحميل التخصصات..." />
        ) : (
          <FlatList
            data={groupedData}
            renderItem={renderTheme}
            keyExtractor={(item, index) => item.id || index.toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="search-outline"
                title="لا توجد نتائج"
                message="جرب البحث بكلمة أخرى"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: -24,
    borderRadius: 20,
    elevation: 8,
    shadowColor: COLORS.primaryHover,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    zIndex: 10,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    fontFamily: 'Tajawal_500Medium',
    fontSize: 16,
    textAlign: 'right', // Forces correct Arabic alignment
  },
  list: {
    padding: spacing.md,
    paddingTop: 30,
    paddingBottom: 120, // Enough bottom padding to clear the FloatingTabBar
  },
  themeSection: {
    marginBottom: spacing.xl,
  },
  themeHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  themeTitle: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  themeGridMobile: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  catCardWrapper: {
    marginBottom: spacing.sm,
    width: '100%',
  },
  catCardWrapperWeb: {
    width: '50%',
    paddingHorizontal: spacing.xs,
  },
  catCard: {
    padding: 16,
    borderRadius: 24, // Premium cinematic radius
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  catCardMobile: {
    height: 'auto',
    minHeight: 80,
  },
  catRow: {
    flexDirection: "row-reverse", // STRICT RTL: Renders Icon(Right) -> Text(Mid) -> Button(Left)
    alignItems: "center",
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  catInfo: {
    flex: 1,
    marginHorizontal: spacing.md,
    alignItems: 'flex-start', // Aligns to the natural RTL start (right visually)
  },
  catName: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    marginBottom: 4,
    textAlign: 'right',
  },
  catStatus: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12,
    textAlign: 'right',
  },
  actionArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});