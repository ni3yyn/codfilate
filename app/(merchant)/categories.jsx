import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../src/hooks/useTheme";
import { useStoreStore } from "../../src/stores/useStoreStore";
import { useCategoryStore } from "../../src/stores/useCategoryStore";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import { useFAB } from "../../src/hooks/useFAB";
import BottomSheet from "../../src/components/ui/BottomSheet";
import Modal from "../../src/components/ui/Modal";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import {
  typography,
  spacing,
  borderRadius,
  gradients,
} from "../../src/theme/theme";

// Icon options for categories (Ionicons names)
const CATEGORY_ICONS = [
  "grid-outline",
  "shirt-outline",
  "phone-portrait-outline",
  "laptop-outline",
  "home-outline",
  "car-outline",
  "fitness-outline",
  "restaurant-outline",
  "book-outline",
  "musical-notes-outline",
  "game-controller-outline",
  "football-outline",
  "heart-outline",
  "gift-outline",
  "diamond-outline",
  "watch-outline",
  "color-palette-outline",
  "brush-outline",
  "camera-outline",
  "headset-outline",
  "bag-outline",
  "basket-outline",
  "pricetag-outline",
  "cube-outline",
  "leaf-outline",
  "nutrition-outline",
  "cafe-outline",
  "medkit-outline",
  "construct-outline",
  "hardware-chip-outline",
  "bulb-outline",
  "flash-outline",
];

export default function CategoriesScreen() {
  const theme = useTheme();
  const currentStore = useStoreStore((s) => s.currentStore);
  const {
    categories,
    isLoading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useCategoryStore();

  const [refreshing, setRefreshing] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("category"); // 'category' | 'subcategory'
  const [editItem, setEditItem] = useState(null);
  const [parentCatId, setParentCatId] = useState(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("grid-outline");
  const [saving, setSaving] = useState(false);



  const loadData = useCallback(async () => {
    if (currentStore) await fetchCategories(currentStore.id);
  }, [currentStore]);

  useEffect(() => {
    loadData();
  }, [currentStore]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ──── Modal handlers ────

  const openAddCategory = () => {
    setModalMode("category");
    setEditItem(null);
    setFormName("");
    setFormIcon("grid-outline");
    setShowModal(true);
  };

  // Register the FAB for this screen
  useFAB({
    icon: 'add',
    label: 'إضافة تصنيف',
    onPress: openAddCategory,
    visible: !showModal && !!currentStore,
  });

  const openEditCategory = (cat) => {
    setModalMode("category");
    setEditItem(cat);
    setFormName(cat.name);
    setFormIcon(cat.icon || "grid-outline");
    setShowModal(true);
  };

  const openAddSubcategory = (categoryId) => {
    setModalMode("subcategory");
    setEditItem(null);
    setParentCatId(categoryId);
    setFormName("");
    setFormIcon("ellipse-outline");
    setShowModal(true);
  };

  const openEditSubcategory = (sub) => {
    setModalMode("subcategory");
    setEditItem(sub);
    setParentCatId(sub.category_id);
    setFormName(sub.name);
    setFormIcon(sub.icon || "ellipse-outline");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم");
      return;
    }
    setSaving(true);

    if (modalMode === "category") {
      if (editItem) {
        await updateCategory(editItem.id, {
          name: formName.trim(),
          icon: formIcon,
        });
      } else {
        await createCategory({
          store_id: currentStore.id,
          name: formName.trim(),
          name_ar: formName.trim(),
          icon: formIcon,
          sort_order: categories.length,
        });
      }
    } else {
      if (editItem) {
        await updateSubcategory(editItem.id, {
          name: formName.trim(),
          icon: formIcon,
        });
      } else {
        await createSubcategory({
          store_id: currentStore.id,
          category_id: parentCatId,
          name: formName.trim(),
          name_ar: formName.trim(),
          icon: formIcon,
          sort_order: 0,
        });
      }
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleDeleteCategory = (cat) => {
    const subCount = cat.subcategories?.length || 0;
    Alert.alert(
      "حذف التصنيف",
      `هل أنت متأكد من حذف "${cat.name}"${subCount > 0 ? ` و ${subCount} تصنيف فرعي` : ""}؟\nسيتم فك ارتباط المنتجات المرتبطة.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => deleteCategory(cat.id),
        },
      ],
    );
  };

  const handleDeleteSubcategory = (sub) => {
    Alert.alert("حذف التصنيف الفرعي", `هل أنت متأكد من حذف "${sub.name}"؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => deleteSubcategory(sub.id),
      },
    ]);
  };

  // ──── Render ────

  const renderSubcategory = (sub) => (
    <View
      key={sub.id}
      style={[styles.subItem, { borderBottomColor: theme.colors.divider }]}
    >
      <View style={[styles.subIcon, { backgroundColor: theme.primary + "10" }]}>
        <Ionicons
          name={sub.icon || "ellipse-outline"}
          size={16}
          color={theme.primary}
        />
      </View>
      <Text style={[styles.subName, { color: theme.colors.text }]}>
        {sub.name}
      </Text>
      <TouchableOpacity
        onPress={() => openEditSubcategory(sub)}
        style={styles.miniBtn}
      >
        <Ionicons
          name="create-outline"
          size={16}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleDeleteSubcategory(sub)}
        style={styles.miniBtn}
      >
        <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  const renderCategory = ({ item }) => {
    const isExpanded = expandedCat === item.id;
    const subCount = item.subcategories?.length || 0;

    return (
      <Card
        key={item.id}
        style={styles.catCard}
        accentColor={theme.primary}
        accentPosition="left"
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setExpandedCat(isExpanded ? null : item.id)}
          style={styles.catRow}
        >
          {/* Icon */}
          <LinearGradient
            colors={[theme.primary + "20", theme.primary + "08"]}
            style={styles.catIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={item.icon || "grid-outline"}
              size={22}
              color={theme.primary}
            />
          </LinearGradient>

          {/* Name & count */}
          <View style={styles.catInfo}>
            <Text style={[styles.catName, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            <Text
              style={[styles.catCount, { color: theme.colors.textTertiary }]}
            >
              {subCount} تصنيف فرعي
            </Text>
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={() => openEditCategory(item)}
            style={styles.miniBtn}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteCategory(item)}
            style={styles.miniBtn}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.colors.textTertiary}
            style={{ marginStart: 4 }}
          />
        </TouchableOpacity>

        {/* Expanded subcategories */}
        {isExpanded && (
          <View
            style={[
              styles.subSection,
              { borderTopColor: theme.colors.divider },
            ]}
          >
            {(item.subcategories || []).map(renderSubcategory)}

            <TouchableOpacity
              onPress={() => openAddSubcategory(item.id)}
              style={[styles.addSubBtn, { borderColor: theme.primary + "30" }]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={theme.primary}
              />
              <Text style={[styles.addSubText, { color: theme.primary }]}>
                إضافة تصنيف فرعي
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  const renderCategoryForm = () => (
    <View style={styles.formContainer}>
      <Input
        label="الاسم"
        value={formName}
        onChangeText={setFormName}
        placeholder="مثال: ملابس، إلكترونيات..."
        icon="text-outline"
      />

      {/* Icon Picker */}
      <Text
        style={[styles.iconPickerLabel, { color: theme.colors.textSecondary }]}
      >
        اختر أيقونة
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.iconPickerRow}
      >
        {CATEGORY_ICONS.map((iconName) => (
          <TouchableOpacity
            key={iconName}
            onPress={() => setFormIcon(iconName)}
            style={[
              styles.iconOption,
              {
                backgroundColor:
                  formIcon === iconName
                    ? theme.primary + "20"
                    : theme.colors.surface2 || theme.colors.borderLight,
                borderColor:
                  formIcon === iconName ? theme.primary : "transparent",
              },
            ]}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={
                formIcon === iconName
                  ? theme.primary
                  : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Button
        title={editItem ? "حفظ التعديلات" : "إضافة"}
        onPress={handleSave}
        loading={saving}
        variant="gradient"
        style={{ marginTop: spacing.xl }}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="التصنيفات"
        subtitle="تنظيم المنتجات في فئات رئيسية وفرعية"
        actionHint={!showModal ? "أضف تصنيف جديد من الزر بالأسفل" : null}
      />

      {/* List */}
      {isLoading && categories.length === 0 ? (
        <LoadingSpinner message="جارٍ تحميل التصنيفات..." />
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="layers-outline"
              title="لا توجد تصنيفات"
              message="أضف تصنيفات لتنظيم منتجاتك بشكل أفضل."
            />
          }
        />
      )}

      {Platform.OS === "web" ? (
        <Modal
          visible={showModal}
          onClose={() => setShowModal(false)}
          title={
            editItem
              ? modalMode === "category"
                ? "تعديل التصنيف"
                : "تعديل التصنيف الفرعي"
              : modalMode === "category"
                ? "تصنيف جديد"
                : "تصنيف فرعي جديد"
          }
          subtitle="أدخل تفاصيل التصنيف لتنظيم منتجاتك"
          maxWidth={600}
        >
          {renderCategoryForm()}
        </Modal>
      ) : (
        <BottomSheet
          visible={showModal}
          onClose={() => setShowModal(false)}
          title={
            editItem
              ? modalMode === "category"
                ? "تعديل التصنيف"
                : "تعديل التصنيف الفرعي"
              : modalMode === "category"
                ? "تصنيف جديد"
                : "تصنيف فرعي جديد"
          }
          subtitle="أدخل تفاصيل التصنيف لتنظيم منتجاتك"
        >
          {renderCategoryForm()}
        </BottomSheet>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: spacing.md, paddingTop: 10, paddingBottom: 120 },
  formContainer: { paddingVertical: spacing.sm },

  // Category Card
  catCard: { marginBottom: spacing.sm },
  catRow: { flexDirection: "row", alignItems: "center" },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: spacing.md,
  },
  catInfo: { flex: 1 },
  catName: { ...typography.bodyBold, marginBottom: 2 },
  catCount: { ...typography.small },
  miniBtn: { padding: 6 },

  // Subcategories
  subSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  subIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: spacing.sm,
  },
  subName: { ...typography.body, flex: 1 },
  addSubBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: spacing.sm,
    gap: 6,
  },
  addSubText: { ...typography.small, fontFamily: "Tajawal_700Bold" },

  // Icon Picker
  iconPickerLabel: {
    ...typography.small,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  iconPickerRow: {
    gap: 8,
    paddingVertical: 4,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
});
