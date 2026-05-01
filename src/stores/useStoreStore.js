import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore'; // We can import auth store to check session
import { appConfig } from '../lib/appConfig';
import { Platform } from 'react-native';

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
        .order('created_at', { ascending: false })
        .limit(1)
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
        .select('*, profiles(full_name, phone, avatar_url), wilayas(name)')
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

  uploadFile: async (uri, folder = 'stores') => {
    try {
      const { cloudName, uploadPreset } = appConfig.cloudinary;
      
      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary not configured.');
      }

      let fileToUpload;
      if (Platform.OS === 'web') {
        const responseFile = await fetch(uri);
        fileToUpload = await responseFile.blob();
      } else {
        const fileExt = uri.split('.').pop();
        fileToUpload = {
          uri: uri,
          type: fileExt === 'pdf' ? 'application/pdf' : 'image/jpeg',
          name: `${folder}-${Date.now()}.${fileExt}`,
        };
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' },
        }
      );

      const result = await response.json();
      if (result.error) throw new Error(result.error.message);

      let finalUrl = result.secure_url;
      if (result.resource_type === 'image') {
        finalUrl = finalUrl.replace('/upload/', '/upload/f_auto,q_auto/');
      }

      return { success: true, url: finalUrl };
    } catch (error) {
      if (__DEV__) console.error('[Cloudinary] Upload failed:', error);
      return { success: false, error: error.message };
    }
  },
}));
