// [slug].jsx - Updated (Radical RTL Layout Fix)
import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Alert, FlatList, TextInput } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/hooks/useTheme";
import { spacing, typography } from "../../src/theme/theme";
import BottomSheet from "../../src/components/ui/BottomSheet";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";

import {
  ArtisanTemplate,
  SupremeTemplate,
  CyberTemplate,
  EleganceTemplate,
  BeastTemplate,
  TrendTemplate,
  AuraTemplate,
  KicksTemplate,
  HomeFixTemplate,
  CandyTemplate,
  ActiveTemplate,
  CraveTemplate,
  LumberTemplate,
  NexusTemplate,
  FORM_THEMES
} from "../../src/components/campaigns/LandingTemplates";

const executeSupabase = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await operation();
      if (result?.error?.message?.includes('Lock broken') || result?.error?.message?.includes('steal')) {
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
          continue;
        }
      }
      return result;
    } catch (error) {
      if ((error?.message?.includes('Lock broken') || error?.message?.includes('steal')) && i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
};

export default function PublicCampaignCheckoutScreen() {
  const theme = useTheme();
  const { slug: slugParam } = useLocalSearchParams();
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [wilayas, setWilayas] = useState([]);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", commune: "", address: "", notes: "" });
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [deliveryType, setDeliveryType] = useState("home");
  const [wilayaModal, setWilayaModal] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      const s = String(slug || "").trim().toLowerCase();
      if (!s) { setError("رابط غير صالح"); setLoading(false); return; }

      const { data: camp, error: ce } = await executeSupabase(() => supabase
        .from("marketing_campaigns")
        .select("id, slug, sale_price, page_config, products(id, name, description, price, image_url, gallery_urls, product_images(*), listing_status)")
        .eq("slug", s).eq("is_active", true).maybeSingle());

      if (ce || !camp || camp.products?.listing_status !== "published") {
        if (!cancelled) { setError("الصفحة غير متوفرة أو انتهت الحملة التسويقية."); setLoading(false); }
        return;
      }

      const { data: wdata } = await executeSupabase(() => supabase.from("wilayas").select("*").eq("is_active", true).order("code"));
      if (!cancelled) { setWilayas(wdata || []); setCampaign(camp); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const deliveryFee = selectedWilaya ? (deliveryType === "office" ? selectedWilaya.office_delivery_fee : selectedWilaya.home_delivery_fee) : 0;
  const total = campaign ? Number(campaign.sale_price) + Number(deliveryFee) : 0;

  const filteredWilayas = useMemo(() => {
    if (!wilayaSearch) return wilayas;
    const q = wilayaSearch.toLowerCase();
    return wilayas.filter(w => w.name.includes(q) || (w.name_fr || "").toLowerCase().includes(q) || w.code.includes(q));
  }, [wilayas, wilayaSearch]);

  const submit = async () => {
    if (!form.name || !form.phone || !selectedWilaya || !form.commune) {
      Alert.alert("تنبيه", "يرجى ملء الاسم والهاتف والولاية والبلدية بشكل صحيح."); return;
    }
    setSubmitting(true);

    const { error: rpcError } = await executeSupabase(() => supabase.rpc("create_order_from_campaign", {
      p_slug: slug, p_customer_name: form.name.trim(), p_customer_phone: form.phone.trim(),
      p_wilaya_id: selectedWilaya.id, p_commune: form.commune.trim(), p_customer_address: form.address,
      p_notes: "", p_delivery_type: deliveryType,
    }));

    setSubmitting(false);
    if (rpcError) { Alert.alert("خطأ", rpcError.message); return; }
    setDone(true);
  };

  if (loading) return <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}><LoadingSpinner /></SafeAreaView>;
  if (error || !campaign) return <SafeAreaView style={[styles.safe, styles.center]}><Text style={styles.errText}>{error}</Text></SafeAreaView>;
  if (done) return (
    <SafeAreaView style={[styles.safe, styles.center]}>
      <Ionicons name="checkmark-circle" size={120} color="#00B894" />
      <Text style={styles.doneText}>تم استلام طلبك بنجاح!</Text>
      <Text style={styles.doneSub}>شكراً لك! سنتصل بك قريباً لتأكيد طلبك قبل الشحن.</Text>
    </SafeAreaView>
  );

  const config = campaign.page_config ? (typeof campaign.page_config === 'string' ? JSON.parse(campaign.page_config) : campaign.page_config) : { template: 'artisan' };

  const templateProps = { theme, campaign, config, form, setForm, selectedWilaya, setWilayaModal, deliveryType, setDeliveryType, submit, submitting, total, deliveryFee, isPreview: false };

  const renderTemplate = () => {
    switch (config.template) {
      case 'artisan': return <ArtisanTemplate {...templateProps} />;
      case 'cyber': return <CyberTemplate {...templateProps} />;
      case 'elegance': return <EleganceTemplate {...templateProps} />;
      case 'beast': return <BeastTemplate {...templateProps} />;
      case 'trend': return <TrendTemplate {...templateProps} />;
      case 'aura': return <AuraTemplate {...templateProps} />;
      case 'kicks': return <KicksTemplate {...templateProps} />;
      case 'homefix': return <HomeFixTemplate {...templateProps} />;
      case 'candy': return <CandyTemplate {...templateProps} />;
      case 'active': return <ActiveTemplate {...templateProps} />;
      case 'crave': return <CraveTemplate {...templateProps} />;
      case 'lumber': return <LumberTemplate {...templateProps} />;
      case 'nexus': return <NexusTemplate {...templateProps} />;
      case 'supreme': default: return <SupremeTemplate {...templateProps} />;
    }
  };

  const getBackgroundColor = () => {
    switch (config.template) {
      case 'artisan': return '#f9f6f3';
      case 'cyber': return '#09090E';
      case 'beast': return '#000000';
      case 'elegance': return '#FAF7F2';
      case 'trend': return '#FAFAFA';
      case 'aura': return '#FFF5F5';
      case 'kicks': return '#0F0F11';
      case 'homefix': return '#F0F4F8';
      case 'candy': return '#FFF0F5';
      case 'active': return '#121212';
      case 'crave': return '#FFF8F0';
      case 'lumber': return '#F5F5F0';
      case 'nexus': return '#0A192F';
      default: return '#FFFFFF';
    }
  };

  const templateTheme = FORM_THEMES[config.template] || FORM_THEMES['artisan'];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: getBackgroundColor() }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {renderTemplate()}
      </KeyboardAvoidingView>

      <BottomSheet
        visible={wilayaModal}
        onClose={() => setWilayaModal(false)}
        title="اختر الولاية"
        sheetStyle={{ backgroundColor: templateTheme.bg[0] }}
        titleStyle={{ color: templateTheme.text }}
        closeBtnStyle={{ backgroundColor: templateTheme.border }}
        closeIconColor={templateTheme.text}
        scrollable={false}
      >
        <View style={{ gap: 0, paddingBottom: spacing.lg, height: 500 }}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, marginBottom: 20, borderColor: templateTheme.border, backgroundColor: templateTheme.bg[0] }]}>
            {/* Search Icon (Maps to Visual Right in RTL) */}
            <Ionicons name="search" size={22} color={templateTheme.sub} />

            {/* Text Input (Maps to Middle. textAlign: 'left' maps to Right aligned in RTL) */}
            <TextInput
              style={[{ flex: 1, textAlign: 'left', fontFamily: 'Tajawal_500Medium', fontSize: 16, color: templateTheme.text, paddingHorizontal: 12 }]}
              placeholder="ابحث عن ولايتك (الاسم أو الرمز)..."
              placeholderTextColor={templateTheme.sub + '80'}
              value={wilayaSearch}
              onChangeText={setWilayaSearch}
              autoCorrect={false}
            />

            {/* Close Icon (Maps to Visual Left in RTL) */}
            {wilayaSearch.length > 0 && (
              <TouchableOpacity onPress={() => setWilayaSearch("")} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={22} color={templateTheme.sub} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filteredWilayas}
            keyExtractor={(w) => w.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            style={{ flex: 1 }}
            ListEmptyComponent={() => (
              <View style={{ padding: 40, alignItems: 'center', opacity: 0.7 }}>
                <MaterialCommunityIcons name="map-search-outline" size={48} color={templateTheme.sub} />
                <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 16, color: templateTheme.sub, marginTop: 12, textAlign: 'center' }}>
                  عذراً، لم نتمكن من العثور على الولاية.
                </Text>
              </View>
            )}
            renderItem={({ item: w }) => {
              const isSelected = selectedWilaya?.id === w.id;
              return (
                <TouchableOpacity
                  style={[{
                    borderBottomWidth: 1,
                    borderBottomColor: templateTheme.border,
                    backgroundColor: isSelected ? templateTheme.input : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 18,
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    marginBottom: 8
                  }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedWilaya(w);
                    setTimeout(() => {
                      setWilayaModal(false);
                      setWilayaSearch("");
                    }, 150);
                  }}
                >
                  {/* 1. Pin Icon (Maps to Visual Right in RTL) */}
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: templateTheme.input, alignItems: 'center', justifyContent: 'center', elevation: 0 }}>
                    <Ionicons name="location" size={20} color={templateTheme.text} />
                  </View>

                  {/* 2. Text Container (Maps to Visual Middle. alignItems: flex-start maps to Right in RTL) */}
                  <View style={{ flex: 1, marginHorizontal: 16, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 18, fontFamily: isSelected ? 'Tajawal_700Bold' : 'Tajawal_500Medium', color: templateTheme.text, textAlign: 'left' }}>
                      {w.code} - {w.name}
                    </Text>
                    <Text style={{ color: templateTheme.sub, fontFamily: 'Tajawal_500Medium', fontSize: 14, textAlign: 'left', marginTop: 6 }}>
                      توصيل للمكتب: {w.office_delivery_fee} دج • للمنزل: {w.home_delivery_fee} دج
                    </Text>
                  </View>

                  {/* 3. Checkmark Icon (Maps to Visual Left in RTL) */}
                  <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected && <Ionicons name="checkmark-circle" size={28} color={templateTheme.primary} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, backgroundColor: '#FAFAFA' },
  errText: { fontSize: 20, fontFamily: 'Tajawal_700Bold', textAlign: "center", marginTop: 40, color: '#FF3B30' },
  doneText: { fontSize: 28, fontFamily: 'Tajawal_800ExtraBold', color: '#2D3748', marginTop: 24, textAlign: 'center' },
  doneSub: { fontSize: 16, fontFamily: 'Tajawal_500Medium', color: '#718096', marginTop: 12, textAlign: 'center', lineHeight: 26 },
});