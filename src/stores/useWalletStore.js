import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useWalletStore = create((set) => ({
  wallet: null,
  ledger: [],
  isLoading: false,

  fetchWallet: async (userId) => {
    if (!userId) return { success: false };
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      set({ wallet: data || null });
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLedger: async (userId, limit = 100) => {
    if (!userId) return { success: false };
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('wallet_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      set({ ledger: data || [] });
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      set({ isLoading: false });
    }
  },
}));
