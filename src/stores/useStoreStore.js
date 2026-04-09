import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore'; // We can import auth store to check session

export const useStoreStore = create((set, get) => ({
  currentStore: null,
  stores: [],
  isLoading: false,

  fetchStore: async (storeId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      set({ currentStore: data });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('Store fetchStore error:', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMyStore: async () => {
    set({ isLoading: true });
    try {
      // Robust session check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session || sessionError) {
        throw new Error('لم يتم تسجيل الدخول بعد. (Not authenticated)');
      }

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      
      set({ currentStore: data || null });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('Store fetchMyStore error:', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  createStore: async (storeData) => {
    set({ isLoading: true });
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session || sessionError) {
        throw new Error('يرجى تسجيل الدخول لإنشاء متجر.');
      }

      const { data, error } = await supabase
        .from('stores')
        .insert({
          ...storeData,
          owner_id: session.user.id,
        })
        .select()
        .single();

      if (error) {
        if (__DEV__) console.error('Error in createStore logic:', error);
        throw error;
      }

      // Update profile with store_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ store_id: data.id, onboarding_completed: true })
        .eq('user_id', session.user.id);

      if (profileError) {
        if (__DEV__) console.error('Error updating profile store_id:', profileError);
      }

      set({ currentStore: data });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('Store createStore error:', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  updateStore: async (storeId, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', storeId)
        .select()
        .single();

      if (error) throw error;
      set({ currentStore: data });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('Store updateStore error:', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAllStores: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ stores: data || [] });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('Store fetchAllStores error:', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Admin: fetch ALL stores (active + inactive) with owner profile
  fetchAllStoresAdmin: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*, profiles(full_name, phone, avatar_url)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ stores: data || [] });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('Store fetchAllStoresAdmin error:', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Admin: toggle store active status
  toggleStoreStatus: async (storeId, isActive) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .update({ is_active: isActive })
        .eq('id', storeId)
        .select()
        .single();

      if (error) throw error;
      set({
        stores: get().stores.map((s) =>
          s.id === storeId ? { ...s, is_active: isActive } : s
        ),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  uploadLogo: async (uri) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const fileName = `${session.user.id}/logo-${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('store-assets')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(data.path);

      return { success: true, url: publicUrl };
    } catch (error) {
      if (__DEV__) console.error('Store uploadLogo error:', error);
      return { success: false, error: error.message };
    }
  },
}));
