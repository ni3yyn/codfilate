import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/hooks/useTheme";
import { useAlertStore } from "../../src/stores/useAlertStore";
import Button from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import BottomSheet from "../../src/components/ui/BottomSheet";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import EmptyState from "../../src/components/ui/EmptyState";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import { typography, spacing, borderRadius } from "../../src/theme/theme";
import { formatCurrency } from "../../src/lib/utils";

export default function ProductApprovalsScreen() {
  const theme = useTheme();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert, showConfirm } = useAlertStore();
  const [rejectForId, setRejectForId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, price, image_url, listing_status, rejection_note, store_id",
      )
      .eq("listing_status", "pending_review")
      .order("updated_at", { ascending: false });

    if (!error) setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitReject = async () => {
    if (!rejectForId || !rejectNote.trim()) {
      showAlert({ title: "تنبيه", message: "اكتب سبب الرفض", type: "warning" });
      return;
    }
    if (__DEV__)
      console.log("🚀 [rejectProduct] params:", {
        productId: rejectForId,
        decision: "rejected",
        note: rejectNote,
      });

    const { error } = await supabase.rpc("rm_review_product", {
      p_product_id: rejectForId,
      p_decision: "rejected",
      p_note: rejectNote,
    });

    if (error) {
      if (__DEV__) console.error("❌ [rejectProduct] error:", error);
      showAlert({
        title: "خطأ في الرفض",
        message: error.message,
        type: "destructive",
      });
    } else {
      if (__DEV__) console.log("✅ [rejectProduct] Success!");
      showAlert({
        title: "تم الرفض",
        message: "تم رفض المنتج وإرسال الملاحظة للتاجر.",
        type: "info",
      });
      setRejectForId(null);
      setRejectNote("");
      load();
    }
  };

  const review = async (productId, decision) => {
    if (decision === "rejected") {
      setRejectNote("");
      setRejectForId(productId);
      return;
    }
    if (__DEV__)
      console.log("🚀 [reviewProduct] params:", { productId, decision });

    const { error } = await supabase.rpc("rm_review_product", {
      p_product_id: productId,
      p_decision: decision,
      p_note: null,
    });

    if (error) {
      if (__DEV__) console.error("❌ [reviewProduct] error:", error);
      showAlert({
        title: "خطأ في المراجعة",
        message: error.message,
        type: "destructive",
      });
    } else {
      if (__DEV__) console.log("✅ [reviewProduct] Success!");
      showAlert({
        title: "تم",
        message: "تم نشر المنتج بنجاح ✓",
        type: "success",
      });
      load();
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.colors.background }]}
        edges={["top"]}
      >
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <UniversalHeader
        title="مراجعة المنتجات"
        subtitle="المنتجات الجديدة لا تظهر للمسوقين إلا بعد موافقتك."
      />

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-outline"
            title="لا شيء في Queue"
            message="كل المنتجات جارية أو منشورة."
          />
        }
        renderItem={({ item }) => (
          <Card
            style={{ marginBottom: spacing.sm }}
            accentColor={theme.primary}
            accentPosition="left"
          >
            <View style={styles.row}>
              {item.image_url ? (
                <Image 
                  source={{ uri: item.image_url }} 
                  style={styles.img} 
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  style={[
                    styles.imgPh,
                    { backgroundColor: theme.primary + "12" },
                  ]}
                >
                  <Ionicons
                    name="cube-outline"
                    size={24}
                    color={theme.primary}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontFamily: "Tajawal_700Bold",
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{ color: theme.colors.textSecondary, marginTop: 4 }}
                >
                  {formatCurrency(item.price)}
                </Text>
              </View>
            </View>
            <View style={styles.btns}>
              <Button
                title="موافقة"
                variant="gradient"
                onPress={() => review(item.id, "published")}
                style={{ flex: 1, marginEnd: spacing.sm }}
              />
              <TouchableOpacity
                style={[styles.rejectBtn, { borderColor: "#FF6B6B" }]}
                onPress={() => review(item.id, "rejected")}
              >
                <Text
                  style={{ color: "#FF6B6B", fontFamily: "Tajawal_700Bold" }}
                >
                  رفض
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      {/* Reject Reason Sheet */}
      <BottomSheet
        visible={!!rejectForId}
        onClose={() => {
          setRejectForId(null);
          setRejectNote("");
        }}
        title="سبب رفض المنتج"
        subtitle="سيظهر هذا السبب للتاجر ليتمكن من تصحيح المنتج وإعادة إرساله."
      >
        <View style={{ gap: spacing.md }}>
          <TextInput
            value={rejectNote}
            onChangeText={setRejectNote}
            placeholder="مثال: الصور غير واضحة، أو الوصف غير مكتمل..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={4}
            style={[
              styles.modalInput,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface2,
                fontFamily: "Tajawal_500Medium",
              },
            ]}
          />

          <Button
            title="تأكيد الرفض"
            onPress={submitReject}
            variant="solid"
            style={{ backgroundColor: "#FF6B6B" }}
            icon="close-circle"
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: 100 },
  row: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  img: { width: 64, height: 64, borderRadius: borderRadius.md },
  imgPh: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btns: { flexDirection: "row", alignItems: "center" },
  rejectBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalBox: { borderRadius: borderRadius.xl, padding: spacing.lg },
  modalTitle: { ...typography.h3, marginBottom: spacing.md },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    textAlign: "right",
    textAlignVertical: Platform.OS === "android" ? "top" : "auto",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
