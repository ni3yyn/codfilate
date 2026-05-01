import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../src/hooks/useTheme";
import { useStoreStore } from "../../src/stores/useStoreStore";
import { useCategoryStore } from "../../src/stores/useCategoryStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import {
  typography,
  spacing,
  borderRadius,
} from "../../src/theme/theme";
import { PRESET_CATEGORIES, CATEGORY_THEMES } from "../../src/config/presetCategories";

export default function CategoriesScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const currentStore = useStoreStore((s) => s.currentStore);
  const { showAlert } = useAlertStore();
  const {
    categories,
    storeCategories,
    isLoading,
    fetchStoreCategories,
    toggleStoreCategory,
  } = useCategoryStore();

  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const storeId = currentStore?.id;
  const isWeb = Platform.OS === 'web';

  const numColumns = useMemo(() => {
    if (!isWeb) return 1;
    if (width < 600) return 1;
    if (width < 1000) return 2;
    return 3;
  }, [width, isWeb]);

  const loadData = useCallback(async () => {
    if (storeId) {
      await fetchStoreCategories(storeId);
    }
  }, [storeId, fetchStoreCategories]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleToggle = async (presetId, isActive) => {
    try {
      if (toggling[presetId]) return;
      setToggling(prev => ({ ...prev, [presetId]: true }));
      
      const result = await toggleStoreCategory(storeId, presetId, !isActive);
      
      if (result.success) {
        await fetchStoreCategories(storeId);
      } else {
        showAlert({ title: "خطأ", message: result.error || "فشل تحديث التصنيف", type: "error" });
      }
    } catch (error) {
      console.error(error);
      showAlert({ title: "خطأ", message: "حدث خطأ غير متوقع", type: "error" });
    } finally {
      setToggling(prev => ({ ...prev, [presetId]: false }));
    }
  };

  const renderCategoryItem = (item) => {
    const isActive = storeCategories.some(c => {
      const dbCat = c.categories || c;
      return (
        dbCat.name_normalized === item.id || 
        (dbCat.name_ar && dbCat.name_ar === item.name_ar) ||
        (dbCat.id === item.id)
      );
    });
    const isToggling = toggling[item.id];

    return (
      <View key={item.id} style={[styles.catCardWrapper, isWeb && styles.catCardWrapperWeb]}>
        <Card
          style={styles.catCard}
          accentColor={isActive ? theme.primary : theme.colors.divider}
          accentPosition="left"
        >
          <View style={styles.catRow}>
            <View style={[styles.catIcon, { backgroundColor: isActive ? theme.primary + "12" : theme.colors.surface2 }]}>
              <Ionicons
                name={item.icon || "layers-outline"}
                size={22}
                color={isActive ? theme.primary : theme.colors.textTertiary}
              />
            </View>

            <View style={styles.catInfo}>
              <Text style={[styles.catName, { color: theme.colors.text }]} numberOfLines={1}>
                {item.name_ar || item.name}
              </Text>
              <Text style={[styles.catStatus, { color: isActive ? theme.primary : theme.colors.textTertiary }]}>
                {isActive ? 'نشط' : 'غير مفعل'}
              </Text>
            </View>

            <View style={styles.actionArea}>
              {isToggling ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <TouchableOpacity
                  onPress={() => handleToggle(item.id, isActive)}
                  style={[
                    styles.toggleIconButton,
                    { backgroundColor: isActive ? theme.primary : theme.colors.surface2 }
                  ]}
                >
                  <Ionicons 
                    name={isActive ? "checkmark-circle" : "add-circle-outline"} 
                    size={24} 
                    color={isActive ? "#fff" : theme.colors.textTertiary} 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>
      </View>
    );
  };

  const renderTheme = ({ item }) => (
    <View style={styles.themeSection}>
      {item.type === 'theme' && (
        <View style={styles.themeHeader}>
          <Ionicons name={item.icon} size={20} color={theme.primary} />
          <Text style={[styles.themeTitle, { color: theme.colors.text }]}>
            {item.name_ar}
          </Text>
        </View>
      )}
      <View style={styles.themeGrid}>
        {item.categories.map(cat => renderCategoryItem(cat))}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="تخصص المتجر"
        subtitle="اختر التصنيفات الدقيقة التي تناسب تخصص متجرك"
      />

      <View style={styles.contentContainer}>
        <View style={[styles.searchSection, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.searchBar, { borderColor: theme.colors.divider }]}>
            <Ionicons name="search-outline" size={20} color={theme.colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="ابحث عن تخصص (مثال: فساتين)..."
              placeholderTextColor={theme.colors.textTertiary}
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: -20,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    height: 48,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    fontFamily: 'Tajawal_500Medium',
    fontSize: 15,
    textAlign: 'right',
  },
  list: {
    padding: spacing.md,
    paddingTop: 30,
    paddingBottom: 100,
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
    fontFamily: 'Tajawal_700Bold',
    fontSize: 18,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  catCardWrapper: {
    marginBottom: spacing.md,
    width: '100%',
  },
  catCardWrapperWeb: {
    width: Platform.OS === 'web' ? '50%' : '100%',
    paddingHorizontal: spacing.xs,
  },
  catCard: {
    padding: spacing.md,
    borderRadius: 24,
    height: 90, 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  catRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  catInfo: {
    flex: 1,
    marginHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  catName: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 15,
    marginBottom: 2,
  },
  catStatus: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 11,
  },
  actionArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
