import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/lib/supabase';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import UniversalHeader from '../../src/components/ui/UniversalHeader';
import { typography, spacing } from '../../src/theme/theme';

export default function AdminAddRegionalManagerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [wilayas, setWilayas] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('wilayas').select('id, name, code').order('code');
    setWilayas(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  };

  const save = async () => {
    const ids = [...selected]
      .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
      .filter((n) => n != null && !Number.isNaN(n));
    if (!email.trim()) {
      Alert.alert('تنبيه', 'أدخل البريد الإلكتروني');
      return;
    }
    if (ids.length === 0) {
      Alert.alert('تنبيه', 'اختر ولاية واحدة على الأقل');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('admin_provision_regional_manager', {
      p_email: email.trim(),
      p_full_name: fullName.trim(),
      p_assigned_wilayas: ids,
    });
    setSaving(false);
    if (error) {
      Alert.alert('خطأ', error.message);
      return;
    }
    Alert.alert(
      'تم',
      'تم ضبط حساب المدير الإقليمي. أرسل له بريد الدخول وكلمة المرور (من لوحة Supabase) ليبدأ العمل.',
      [{ text: 'حسناً', onPress: () => router.back() }]
    );
  };

  if (loading) return <LoadingSpinner message="جارٍ التحميل..." />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
      <UniversalHeader 
        title="إضافة مدير إقليمي" 
        rightAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        <Text style={[typography.caption, { color: theme.colors.textSecondary, marginBottom: spacing.md }]}>
          ① أنشئ المستخدم في Supabase → Authentication → Users (بريد + كلمة مرور).{'\n'}
          ② ثم املأ البيانات هنا واختر ولايته/ولاياته. يمكنك إرسال بيانات الدخول للمدير لاحقاً.
        </Text>

        <Card style={{ padding: spacing.md, marginBottom: spacing.md }}>
          <Input
            label="البريد الإلكتروني (نفس المسجّل في Supabase)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="regional@example.com"
          />
          <Input
            label="الاسم الكامل (اختياري)"
            value={fullName}
            onChangeText={setFullName}
            placeholder="اسم المدير"
            style={{ marginTop: spacing.md }}
          />
        </Card>

        <Text style={[typography.bodyBold, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          الولايات المعيّنة
        </Text>
        {wilayas.map((w) => (
          <TouchableOpacity key={w.id} onPress={() => toggle(w.id)} activeOpacity={0.8}>
            <View
              style={[
                styles.row,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: selected.has(w.id) ? theme.primary + '18' : 'transparent',
                },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontFamily: 'Tajawal_500Medium' }}>{w.name}</Text>
              <Text style={{ color: theme.colors.textTertiary }}>{w.code}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Button
          title="حفظ وتعيين المدير"
          onPress={save}
          loading={saving}
          variant="gradient"
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 6,
  },
});
