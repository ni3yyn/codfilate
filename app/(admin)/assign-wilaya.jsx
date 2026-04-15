import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../src/hooks/useTheme";
import { supabase } from "../../src/lib/supabase";
import Button from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import { typography, spacing } from "../../src/theme/theme";

export default function AdminAssignWilayaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profileId } = useLocalSearchParams();
  const [profile, setProfile] = useState(null);
  const [wilayas, setWilayas] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    const [pRes, wRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
      supabase.from("wilayas").select("id, name, code").order("code"),
    ]);
    setProfile(pRes.data);
    setWilayas(wRes.data || []);
    const aw = pRes.data?.assigned_wilayas;
    let arr = [];
    if (Array.isArray(aw))
      arr = aw
        .map((x) => (typeof x === "string" ? parseInt(x, 10) : x))
        .filter(Boolean);
    else if (typeof aw === "string") {
      try {
        const p = JSON.parse(aw);
        arr = Array.isArray(p)
          ? p
              .map((x) => (typeof x === "string" ? parseInt(x, 10) : x))
              .filter(Boolean)
          : [];
      } catch (e) {
        /* ignore */
      }
    }
    setSelected(new Set(arr));
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  };

  const save = async () => {
    if (!profileId) return;
    setSaving(true);
    const ids = [...selected]
      .map((id) => (typeof id === "string" ? parseInt(id, 10) : id))
      .filter((n) => n != null && !Number.isNaN(n));
    const primaryWilaya = ids.length > 0 ? ids[0] : null;
    const { error } = await supabase
      .from("profiles")
      .update({ assigned_wilayas: ids, wilaya_id: primaryWilaya })
      .eq("id", profileId);
    setSaving(false);
    if (error) Alert.alert("خطأ", error.message);
    else {
      Alert.alert("تم", "تم تحديث الولايات");
      router.back();
    }
  };

  if (!profileId) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        edges={["top"]}
      >
        <Text style={{ color: theme.colors.textSecondary }}>
          لم يُحدد مستخدم
        </Text>
      </SafeAreaView>
    );
  }

  if (loading || !profile) return <LoadingSpinner message="جارٍ التحميل..." />;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["bottom"]}
    >
      <UniversalHeader
        title={`ولايات ${profile.full_name || ""}`}
        rightAction={
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 8 }}
          >
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
      >
        <Card style={{ padding: spacing.md, marginBottom: spacing.md }}>
          <Text style={{ color: theme.colors.textSecondary }}>
            الدور الحالي: {profile.role}
          </Text>
          <Button
            title="حفظ التعيين"
            onPress={save}
            loading={saving}
            variant="gradient"
            style={{ marginTop: spacing.md }}
          />
        </Card>
        {wilayas.map((w) => (
          <TouchableOpacity
            key={w.id}
            onPress={() => toggle(w.id)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.row,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: selected.has(w.id)
                    ? theme.primary + "18"
                    : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: "Tajawal_500Medium",
                }}
              >
                {w.name}
              </Text>
              <Text style={{ color: theme.colors.textTertiary }}>{w.code}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 6,
  },
});
