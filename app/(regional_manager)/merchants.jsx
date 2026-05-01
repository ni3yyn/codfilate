import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
  TouchableOpacity,
  ScrollView,
  Linking,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { useRegionalManagerStore } from "../../src/stores/useRegionalManagerStore";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useAlertStore } from "../../src/stores/useAlertStore";
import { useWilayaStore } from "../../src/stores/useWilayaStore";
import { getEffectiveWilayaIds } from "../../src/lib/profileUtils";
import UniversalHeader from "../../src/components/ui/UniversalHeader";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";
import EmptyState from "../../src/components/ui/EmptyState";
import LoadingSpinner from "../../src/components/ui/LoadingSpinner";
import StatCard from "../../src/components/ui/StatCard";
import BottomSheet from "../../src/components/ui/BottomSheet";
import { typography, spacing, borderRadius } from "../../src/theme/theme";
import { formatRelativeTime } from "../../src/lib/utils";
import { useResponsive } from "../../src/hooks/useResponsive";

/**
 * Merchants Management Hub for Regional Managers.
 * Redesigned with a premium Grid Layout for Desktop and Enhanced Cards.
 */
export default function MerchantsScreen() {
  const theme = useTheme();
  const { isWide, maxContentWidth } = useResponsive();
  const profile = useAuthStore((s) => s.profile);
  const wilayaIds = useMemo(() => getEffectiveWilayaIds(profile), [profile]);

  const {
    fetchPendingMerchantStores,
    fetchAssignedMerchantStores,
    activateMerchantStore,
    rejectMerchantStore,
    fetchStoreDetails,
  } = useRegionalManagerStore();

  const { showAlert, showConfirm } = useAlertStore();

  const [activeTab, setActiveTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(null);

  const [selectedStore, setSelectedStore] = useState(null);
  const [storeDetails, setStoreDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [wilayaModalVisible, setWilayaModalVisible] = useState(false);
  const [targetStore, setTargetStore] = useState(null);
  const { wilayas, fetchWilayas } = useWilayaStore();

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  useEffect(() => {
    fetchWilayas();
  }, [fetchWilayas]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res =
      activeTab === "pending"
        ? await fetchPendingMerchantStores()
        : await fetchAssignedMerchantStores();

    if (res.success) {
      const filtered = res.data?.filter(s => !s.rejected_at) || [];
      setRows(filtered);
    }
    setLoading(false);
  }, [activeTab, fetchPendingMerchantStores, fetchAssignedMerchantStores]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleActivate = async (store) => {
    if (!store.wilaya_id) {
      const myWilayas = getEffectiveWilayaIds(profile);
      if (myWilayas.length === 1) {
        const wId = myWilayas[0];
        const wName = wilayas.find(w => w.id === wId)?.name || "ولايتك";
        showConfirm({
          title: "تعيين ولاية وتفعيل",
          message: `هذا المتجر ليس لديه ولاية محددة. هل تريد تعيينه لولاية «${wName}» وتفعيله؟`,
          confirmText: "تعيين وتفعيل",
          type: "warning",
          onConfirm: () => executeActivation(store.id, wId)
        });
      } else {
        setTargetStore(store);
        setWilayaModalVisible(true);
      }
      return;
    }

    showConfirm({
      title: "تفعيل المتجر",
      message: `هل توافق على تفعيل متجر «${store.name}»؟ سيتمكن المسوقون من العمل معه في منطقتك.`,
      confirmText: "تفعيل الآن",
      type: "success",
      onConfirm: () => executeActivation(store.id),
    });
  };

  const executeActivation = async (storeId, wilayaId = null) => {
    setActing(storeId);
    const res = await activateMerchantStore(storeId, wilayaId);
    setActing(null);
    if (res.success) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert({ title: "تم التفعيل بنجاح", message: "المتجر مفعّل الآن وجاهز لاستقبال الطلبات.", type: "success" });
      setSelectedStore(null);
      loadData();
      setWilayaModalVisible(false);
    } else {
      showAlert({ title: "خطأ", message: res.error, type: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showAlert({ title: "مطلوب", message: "يرجى ذكر سبب الرفض ليتم إبلاغ التاجر.", type: "warning" });
      return;
    }
    setActing(selectedStore.id);
    const res = await rejectMerchantStore(selectedStore.id, rejectionReason);
    setActing(null);
    if (res.success) {
      showAlert({ title: "تم الرفض", message: "تم رفض طلب المتجر وإغلاقه.", type: "info" });
      setRejecting(false);
      setRejectionReason("");
      setSelectedStore(null);
      loadData();
    } else {
      showAlert({ title: "خطأ", message: res.error, type: "destructive" });
    }
  };

  const openStoreDetails = async (store) => {
    setSelectedStore(store);
    setDetailsLoading(true);
    const res = await fetchStoreDetails(store.id, wilayaIds);
    if (res.success) setStoreDetails(res.data);
    setDetailsLoading(false);
  };

  const openViewer = (uri) => {
    setViewingImage(uri);
    setViewerVisible(true);
  };

  const renderMerchantItem = ({ item }) => {
    const isPending = activeTab === "pending";
    const owner = item.profiles?.[0];
    const hasDocs = !!(item.id_card_url || item.commercial_register_url);

    return (
      <View style={[styles.cardWrapper, isWide && { width: '48%', marginHorizontal: '1%' }]}>
        <Card
          style={styles.premiumCard}
          onPress={() => openStoreDetails(item)}
        >
          <View style={styles.cardHeader}>
             <View style={styles.logoContainer}>
                {item.logo_url ? (
                  <Image source={{ uri: item.logo_url }} style={styles.storeLogo} contentFit="cover" transition={200} />
                ) : (
                  <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary + '10' }]}>
                    <Ionicons name="business" size={28} color={theme.primary} />
                  </View>
                )}
             </View>
             
             <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.storeName, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {isPending && (
                    <View style={[styles.statusBadge, { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' }]}>
                      <Text style={[styles.statusBadgeText, { color: '#F57F17' }]}>قيد المراجعة</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.ownerName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {owner?.full_name || "تاجر جديد"}
                </Text>
             </View>
          </View>

          <View style={[styles.cardStats, { borderTopColor: theme.colors.divider }]}>
             <View style={styles.statItem}>
                <Ionicons name="call-outline" size={14} color={theme.colors.textTertiary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>{owner?.phone || "—"}</Text>
             </View>
             <View style={styles.statItem}>
                <Ionicons name="time-outline" size={14} color={theme.colors.textTertiary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {formatRelativeTime(item.created_at)}
                </Text>
             </View>
          </View>

          <View style={styles.cardActions}>
            {isPending ? (
              <View style={styles.pendingActions}>
                {hasDocs && (
                   <View style={styles.docsIndicator}>
                      <Ionicons name="checkmark-done-circle" size={16} color="#4CAF50" />
                      <Text style={styles.docsIndicatorText}>وثائق جاهزة</Text>
                   </View>
                )}
                <TouchableOpacity 
                   style={[styles.reviewBtn, { backgroundColor: theme.primary }]}
                   onPress={() => openStoreDetails(item)}
                >
                   <Text style={styles.reviewBtnText}>مراجعة الآن</Text>
                   <Ionicons name="shield-checkmark" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                 style={[styles.manageBtn, { borderColor: theme.primary }]}
                 onPress={() => openStoreDetails(item)}
              >
                 <Text style={[styles.manageBtnText, { color: theme.primary }]}>إدارة المتجر</Text>
                 <Ionicons name="settings-outline" size={16} color={theme.primary} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
               style={[styles.actionIconBtn, { backgroundColor: theme.colors.surface2 }]}
               onPress={() => Linking.openURL(`tel:${owner?.phone}`)}
            >
               <Ionicons name="call" size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <UniversalHeader
        title="إدارة الموردين"
        subtitle="مراجعة وتفعيل متاجر الموردين في منطقتك"
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && { backgroundColor: theme.colors.surfaceElevated, borderRadius: 12 }]}
          onPress={() => setActiveTab("pending")}
        >
          <Text style={[styles.tabText, { color: activeTab === "pending" ? theme.primary : theme.colors.textTertiary }]}>
             طلبات التفعيل ({activeTab === "pending" ? rows.length : "..."})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "assigned" && { backgroundColor: theme.colors.surfaceElevated, borderRadius: 12 }]}
          onPress={() => setActiveTab("assigned")}
        >
          <Text style={[styles.tabText, { color: activeTab === "assigned" ? theme.primary : theme.colors.textTertiary }]}>
            المتاجر النشطة
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        key={isWide ? 'grid' : 'list'}
        numColumns={isWide ? 2 : 1}
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={renderMerchantItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={[styles.list, isWide && { maxWidth: maxContentWidth, alignSelf: "center", width: "100%" }]}
        ListEmptyComponent={
          loading ? (
            <LoadingSpinner />
          ) : (
            <EmptyState
              icon="business-outline"
              title={activeTab === "pending" ? "لا توجد طلبات جديدة" : "لم يتم اعتماد أي متجر بعد"}
              message={activeTab === "pending" ? "ستظهر المتاجر الجديدة التي تسجل في منطقتك هنا للمراجعة." : "المتاجر التي توافق عليها ستنتقل إلى هذه القائمة."}
            />
          )
        }
      />

      {/* Store Details Sheet */}
      <BottomSheet
        visible={!!selectedStore}
        onClose={() => { setSelectedStore(null); setRejecting(false); setRejectionReason(""); }}
        title="مراجعة ملف المتجر"
        subtitle={selectedStore?.name}
      >
        {detailsLoading ? <LoadingSpinner /> : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={{ gap: spacing.lg }}>
              <View style={[styles.detailsCard, { backgroundColor: theme.colors.surfaceElevated }]}>
                <View style={styles.detailsHeader}>
                  <View style={styles.detailsLogoCircle}>
                    {selectedStore?.logo_url ? (
                      <Image source={{ uri: selectedStore.logo_url }} style={styles.fullLogo} contentFit="cover" transition={200} />
                    ) : (
                      <Ionicons name="business" size={32} color={theme.colors.textTertiary} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingRight: 15 }}>
                    <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>{selectedStore?.name}</Text>
                    <Text style={[styles.detailsOwner, { color: theme.colors.textSecondary }]}>{selectedStore?.profiles?.[0]?.full_name}</Text>
                    <View style={styles.wilayaBadge}>
                       <Ionicons name="location" size={12} color={theme.primary} />
                       <Text style={[styles.wilayaBadgeText, { color: theme.primary }]}>
                          {selectedStore?.wilaya_id ? `${wilayas.find(w => w.id === selectedStore.wilaya_id)?.name}` : "غير محدد"}
                       </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.detailsCallBtn, { backgroundColor: theme.primary }]}
                    onPress={() => Linking.openURL(`tel:${selectedStore?.profiles?.[0]?.phone}`)}
                  >
                    <Ionicons name="call" size={20} color="white" />
                  </TouchableOpacity>
                </View>
                {selectedStore?.description && (
                  <Text style={[styles.detailsDesc, { color: theme.colors.textSecondary }]}>{selectedStore.description}</Text>
                )}
              </View>

              <View>
                <View style={styles.sectionHeading}>
                  <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
                  <Text style={[styles.sectionHeadingText, { color: theme.colors.text }]}>وثائق التحقق (Sajal Tijari / ID)</Text>
                </View>
                
                <View style={styles.docsGrid}>
                  <View style={styles.docBox}>
                    <Text style={[styles.docLabel, { color: theme.colors.textTertiary }]}>بطاقة التعريف</Text>
                    {selectedStore?.id_card_url ? (
                      <TouchableOpacity onPress={() => openViewer(selectedStore.id_card_url)} style={styles.docTouch}>
                        <Image source={{ uri: selectedStore.id_card_url }} style={styles.docImage} contentFit="cover" />
                        <View style={styles.docZoom}>
                          <Ionicons name="expand" size={16} color="white" />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.docEmpty, { backgroundColor: theme.colors.surface2 }]}>
                        <Ionicons name="alert-circle-outline" size={24} color="#999" />
                        <Text style={styles.docEmptyText}>مفقودة</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.docBox}>
                    <Text style={[styles.docLabel, { color: theme.colors.textTertiary }]}>السجل التجاري</Text>
                    {selectedStore?.commercial_register_url ? (
                      <TouchableOpacity onPress={() => openViewer(selectedStore.commercial_register_url)} style={styles.docTouch}>
                        <Image source={{ uri: selectedStore.commercial_register_url }} style={styles.docImage} contentFit="cover" />
                        <View style={styles.docZoom}>
                          <Ionicons name="expand" size={16} color="white" />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.docEmpty, { backgroundColor: theme.colors.surface2 }]}>
                        <Ionicons name="alert-circle-outline" size={24} color="#999" />
                        <Text style={styles.docEmptyText}>مفقودة</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {activeTab === "assigned" && (
                <View style={styles.statsRow}>
                  <StatCard title="الطلبات" value={storeDetails?.stats?.totalOrders || 0} icon="receipt" color={theme.primary} size="small" />
                  <StatCard title="التوصيل" value={`${storeDetails?.stats?.successfulOrders || 0}`} icon="checkmark-circle" color="#27AE60" size="small" />
                  <StatCard title="المداخيل" value={storeDetails?.stats?.totalRevenue?.toLocaleString() || "0"} icon="wallet" color="#F39C12" size="small" />
                </View>
              )}

              {activeTab === "pending" && !rejecting && (
                <View style={styles.footerActions}>
                  <Button
                    title="تفعيل المتجر الآن"
                    variant="gradient"
                    style={{ flex: 2, height: 56 }}
                    icon="checkmark-circle"
                    loading={acting === selectedStore?.id}
                    onPress={() => handleActivate(selectedStore)}
                  />
                  <Button
                    title="رفض الطلب"
                    variant="outline"
                    style={{ flex: 1, height: 56, borderColor: '#FF5252' }}
                    textStyle={{ color: '#FF5252' }}
                    icon={<Ionicons name="close-circle-outline" size={20} color="#FF5252" />}
                    onPress={() => setRejecting(true)}
                  />
                </View>
              )}

              {rejecting && (
                <View style={[styles.rejectContainer, { backgroundColor: theme.colors.surfaceElevated, borderColor: '#FFCDD2' }]}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="alert-circle" size={20} color="#D32F2F" />
                    <Text style={[styles.rejectLabel, { color: theme.colors.text, marginBottom: 0 }]}>تأكيد رفض المورد</Text>
                  </View>
                  
                  <Input
                    placeholder="يرجى كتابة سبب الرفض هنا ليتم إرساله للتاجر..."
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                    multiline
                    numberOfLines={3}
                  />
                  
                  <View style={styles.rejectButtons}>
                    <Button
                      title="تأكيد الرفض النهائي"
                      variant="danger"
                      style={{ flex: 2, height: 50 }}
                      loading={acting === selectedStore?.id}
                      onPress={handleReject}
                    />
                    <Button 
                      title="تراجع" 
                      variant="secondary" 
                      style={{ flex: 1, height: 50 }} 
                      onPress={() => { setRejecting(false); setRejectionReason(""); }} 
                    />
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </BottomSheet>

      {/* Wilaya Selection Modal */}
      <BottomSheet
        visible={wilayaModalVisible}
        onClose={() => setWilayaModalVisible(false)}
        title="تحديد ولاية المتجر"
        subtitle={targetStore?.name}
      >
        <Text style={[styles.wilayaDesc, { color: theme.colors.textSecondary }]}>يرجى اختيار الولاية التي سينتمي إليها هذا المتجر.</Text>
        <ScrollView style={{ maxHeight: 400 }}>
          {wilayas
            .filter(w => getEffectiveWilayaIds(profile).includes(w.id))
            .map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.wilayaItem, { borderBottomColor: theme.colors.divider }]}
                onPress={() => executeActivation(targetStore.id, w.id)}
              >
                <Text style={[styles.wilayaItemText, { color: theme.colors.text }]}>{w.code} - {w.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))}
        </ScrollView>
      </BottomSheet>

      {/* Image Viewer */}
      <Modal visible={viewerVisible} transparent animationType="fade">
        <View style={styles.viewerBackground}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
            <Ionicons name="close-circle" size={44} color="white" />
          </TouchableOpacity>
          <Image source={{ uri: viewingImage }} style={styles.viewerImg} contentFit="contain" />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: { flexDirection: "row-reverse", paddingHorizontal: spacing.lg, marginTop: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  tabText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  list: { padding: spacing.md, paddingBottom: 100 },
  
  // Premium Card
  cardWrapper: { marginBottom: spacing.md },
  premiumCard: { padding: spacing.md, borderRadius: borderRadius.xl, borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.05)' },
  cardHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  logoContainer: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
  storeLogo: { width: '100%', height: '100%' },
  logoPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  storeName: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  ownerName: { fontSize: 13, fontFamily: 'Tajawal_500Medium', textAlign: 'right', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 0.5 },
  statusBadgeText: { fontSize: 9, fontFamily: 'Tajawal_700Bold' },
  
  cardStats: { flexDirection: 'row-reverse', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, justifyContent: 'space-between' },
  statItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, fontFamily: 'Tajawal_500Medium' },

  cardActions: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  pendingActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
  docsIndicator: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  docsIndicatorText: { fontSize: 10, fontFamily: 'Tajawal_700Bold', color: '#4CAF50' },
  reviewBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  reviewBtnText: { color: 'white', fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  
  manageBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  manageBtnText: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  actionIconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Details Sheet
  detailsCard: { padding: spacing.md, borderRadius: borderRadius.xl, marginBottom: spacing.md },
  detailsHeader: { flexDirection: "row-reverse", alignItems: "center" },
  detailsLogoCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: "white", alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: '#eee' },
  fullLogo: { width: "100%", height: "100%" },
  detailsTitle: { fontSize: 24, fontFamily: 'Tajawal_800ExtraBold', textAlign: 'right' },
  detailsOwner: { fontSize: 15, fontFamily: 'Tajawal_500Medium', textAlign: 'right', marginTop: 2 },
  wilayaBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 6 },
  wilayaBadgeText: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  detailsCallBtn: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  detailsDesc: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right', marginTop: spacing.md, lineHeight: 22 },

  sectionHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  sectionHeadingText: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },

  docsGrid: { flexDirection: 'row-reverse', gap: spacing.md },
  docBox: { flex: 1, gap: 8 },
  docLabel: { fontSize: 12, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  docTouch: { width: '100%', height: 140, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  docImage: { width: '100%', height: '100%' },
  docZoom: { position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  docEmpty: { width: '100%', height: 140, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
  docEmptyText: { fontSize: 12, color: '#999', fontFamily: 'Tajawal_500Medium', marginTop: 4 },

  statsRow: { flexDirection: "row-reverse", gap: spacing.sm, marginBottom: spacing.lg },
  footerActions: { flexDirection: 'row-reverse', gap: spacing.md, marginTop: spacing.md },
  
  rejectContainer: { padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, gap: spacing.md },
  rejectLabel: { fontSize: 16, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  rejectButtons: { flexDirection: 'row-reverse', gap: spacing.md },

  wilayaDesc: { fontSize: 14, fontFamily: 'Tajawal_500Medium', marginBottom: spacing.md, textAlign: "center" },
  wilayaItem: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, borderBottomWidth: 1 },
  wilayaItemText: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },

  viewerBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 60, right: 30, zIndex: 10 },
  viewerImg: { width: '100%', height: '80%' },
});
