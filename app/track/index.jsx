import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import {
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../../src/theme/theme";
import Button from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import { useAlertStore } from "../../src/stores/useAlertStore";

export default function TrackSearch() {
  const theme = useTheme();
  const router = useRouter();
  const { showAlert } = useAlertStore();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      showAlert({
        title: "تنبيه",
        message: "يرجى إدخال رقم الهاتف أو رقم التتبع.",
        type: "warning",
      });
      return;
    }
    // Navigate to the tracking page with the ID or phone
    router.push(`/track/${searchTerm.trim()}`);
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Ionicons name="location-outline" size={48} color={theme.primary} />
            <Text style={[styles.title, { color: theme.colors.text }]}>
              تتبع طلبك
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              أدخل رقم الهاتف المستخدم في الطلب أو رقم التتبع الخاص بك لمعرفة
              حالة شحنتك.
            </Text>
          </View>

          <Card style={styles.searchCard}>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={20}
                color={theme.colors.textTertiary}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="رقم الهاتف أو رقم التتبع..."
                placeholderTextColor={theme.colors.textTertiary}
                value={searchTerm}
                onChangeText={setSearchTerm}
                keyboardType="default"
                autoCapitalize="none"
              />
            </View>

            <Button
              title="تتبع الآن"
              onPress={handleSearch}
              variant="primary"
              size="large"
              style={styles.button}
              icon={<Ionicons name="arrow-forward" size={20} color="#FFF" />}
            />
          </Card>

          <View style={styles.infoSection}>
            <View style={styles.infoBox}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color={theme.primary}
              />
              <Text
                style={[styles.infoText, { color: theme.colors.textSecondary }]}
              >
                ستتلقى إشعارات نصية عند تغيير حالة طلبك.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.replace("/")}
            style={styles.backHome}
          >
            <Text
              style={{ color: theme.primary, fontFamily: "Tajawal_700Bold" }}
            >
              العودة للرئيسية
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: "center",
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl * 1.5,
  },
  title: {
    ...typography.h1,
    fontSize: 28,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.8,
  },
  searchCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.xxl,
    ...shadows.xl,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "web" ? 14 : 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    textAlign: "right",
  },
  button: {
    width: "100%",
    borderRadius: borderRadius.lg,
  },
  infoSection: {
    marginTop: spacing.xl * 2,
    gap: spacing.md,
  },
  infoBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(108, 92, 231, 0.05)",
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: {
    ...typography.small,
    flex: 1,
    textAlign: "right",
  },
  backHome: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
});
