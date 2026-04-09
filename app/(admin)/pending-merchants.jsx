import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/hooks/useTheme';
import { useRegionalManagerStore } from '../../src/stores/useRegionalManagerStore';
import { useAlertStore } from '../../src/stores/useAlertStore';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import EmptyState from '../../src/components/ui/EmptyState';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import { typography, spacing } from '../../src/theme/theme';
import { formatRelativeTime } from '../../src/lib/utils';

export default function AdminPendingMerchantsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { fetchPendingMerchantStores, activateMerchantStore } = useRegionalManagerStore();
  const { showAlert, showConfirm } = useAlertStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchPendingMerchantStores();
    if (res.success) {
      const enriched = await Promise.all(
        (res.data || []).map(async (s) => {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('user_id', s.owner_id)
            .maybeSingle();
          let wname = '';
          if (s.wilaya_id) {
            const { data: w } = await supabase.from('wilayas').select('name').eq('id', s.wilaya_id).maybeSingle();
            wname = w?.name || '';
          }
          return { ...s, ownerName: prof?.full_name || '', ownerPhone: prof?.phone || '', wilayaName: wname };
        })
      );
      setRows(enriched);
    }
    setLoading(false);
  }, [fetchPendingMerchantStores]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const activate = async (storeId, name) => {
    showConfirm({
      title: 'تفعيل التاجر (الإدارة العليا)',
      message: `تأكيد تفعيل متجر «${name}»؟ سيكون مرئياً في كل الولايات بعد التفعيل.`,
      confirmText: 'تفعيل',
      type: 'success',
      onConfirm: async () => {
        setActing(storeId);
        const res = await activateMerchantStore(storeId);
        setActing(null);
        if (res.success) {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showAlert({ title: 'تم', message: 'تم تفعيل المتجر بنجاح ✓', type: 'success' });
          await load();
        } else {
          if (__DEV__) console.error('Approval failed:', res.error);
          showAlert({
            title: 'خطأ في الموافقة',
            message: `التفاصيل: ${res.error}\n\n(تأكد من أنك تملك صلاحيات الإدارة العليا)`,
            type: 'destructive',
          });
        }
      },
    });
  };

  if (loading && rows.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <UniversalHeader 
          title="تجار بانتظار التفعيل" 
          subtitle="موافقة الإدارة العليا"
          rightAction={
          <TouchableOpacity 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')} 
            style={{ padding: 8 }}
          >
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
          }
        />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <UniversalHeader 
        title="تجار بانتظار التفعيل" 
        subtitle="موافقة الإدارة العليا"
        rightAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-outline"
            title="لا يوجد تجار معلقون"
            message="المتاجر الجديدة قبل موافقة الإدارة تظهر هنا."
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card} accentColor="#FDCB6E" accentPosition="left">
            <Text style={[styles.storeName, { color: theme.colors.text }]}>{item.name}</Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
              {item.wilayaName ? `الولاية: ${item.wilayaName}` : item.wilaya_id ? `ولاية #${item.wilaya_id}` : 'بدون ولاية'}
            </Text>
            {!!(item.ownerName || item.ownerPhone) && (
              <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                {item.ownerName || '—'} · {item.ownerPhone || ''}
              </Text>
            )}
            <Text style={[styles.time, { color: theme.colors.textTertiary }]}>
              {formatRelativeTime(item.created_at)}
            </Text>
            <Button
              title="تفعيل المتجر"
              variant="gradient"
              loading={acting === item.id}
              onPress={() => activate(item.id, item.name)}
              style={{ marginTop: spacing.md }}
              icon="shield-checkmark-outline"
            />
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: 120 },
  card: { marginBottom: spacing.sm },
  storeName: { ...typography.bodyBold, fontSize: 17 },
  meta: { ...typography.caption, marginTop: 4 },
  time: { ...typography.small, marginTop: 6 },
});
