import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useWilayaStore = create((set, get) => ({
  wilayas: [],
  isLoading: false,

  fetchWilayas: async () => {
    if (get().wilayas.length > 0) return { success: true, data: get().wilayas };

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('wilayas')
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: true });

      if (error) throw error;
      set({ wilayas: data || [] });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchWilayas]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  getWilayaById: (id) => {
    return get().wilayas.find((w) => w.id === id) || null;
  },

  getWilayaByCode: (code) => {
    return get().wilayas.find((w) => w.code === code) || null;
  },

  getDeliveryFee: (wilayaId, deliveryType = 'home') => {
    const wilaya = get().getWilayaById(wilayaId);
    if (!wilaya) return 0;
    return deliveryType === 'office' ? wilaya.office_delivery_fee : wilaya.home_delivery_fee;
  },
}));
