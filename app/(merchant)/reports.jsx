import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { useStoreStore } from '../../src/stores/useStoreStore';
import { supabase } from '../../src/lib/supabase';
import Card from '../../src/components/ui/Card';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing } from '../../src/theme/theme';
import { formatCurrency } from '../../src/lib/utils';

export default function MerchantReportsScreen() {
  const theme = useTheme();
  const currentStore = useStoreStore((s) => s.currentStore);
  const [rows, setRows] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!currentStore?.id) return;
    const { data, error } = await supabase.rpc('get_merchant_wilaya_stats', { p_store_id: currentStore.id });
    if (!error && data) setRows(data);
  }, [currentStore?.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
      <UniversalHeader 
        title="أداء الولايات" 
        subtitle="إحصائيات المبيعات والأداء حسب الولاية"
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {rows.map((r) => (
          <Card key={String(r.wilaya_id)} style={{ padding: spacing.md, marginBottom: spacing.sm }}>
            <Text style={[typography.bodyBold, { color: theme.colors.text }]}>{r.wilaya_name || `ولاية ${r.wilaya_id}`}</Text>
            <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>طلبات: {r.order_count}</Text>
            <Text style={{ color: theme.primary, marginTop: 4 }}>إيرادات: {formatCurrency(r.revenue)}</Text>
          </Card>
        ))}
        {!rows.length ? (
          <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, marginTop: 40 }}>لا بيانات بعد</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
