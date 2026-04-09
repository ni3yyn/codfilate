import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { PLATFORM_FEE, ADMIN_FEE, REGIONAL_MANAGER_FEE } from '../lib/constants';

const defaults = {
  platform_fee: PLATFORM_FEE,
  admin_fee: ADMIN_FEE,
  regional_manager_fee: REGIONAL_MANAGER_FEE,
  min_payout_amount: 100,
  failed_delivery_compensation: 0,
};

export const usePlatformSettingsStore = create((set, get) => ({
  settings: null,
  isLoading: false,

  fetchSettings: async () => {
    if (get().settings) return { success: true, data: get().settings };
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      const merged = {
        ...defaults,
        ...(data || {}),
      };
      set({ settings: merged });
      return { success: true, data: merged };
    } catch (e) {
      set({ settings: defaults });
      return { success: false, error: e.message, data: defaults };
    } finally {
      set({ isLoading: false });
    }
  },

  getFees: () => get().settings || defaults,
}));
