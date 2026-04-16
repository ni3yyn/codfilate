import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const defaults = {
  platform_enabled: true,
  maintenance_mode: false,
  maintenance_note: '',
  update_type: null,
  update_note: '',
  min_app_version: '1.0.0',
};

export const usePlatformControlsStore = create((set, get) => ({
  controls: null,
  isLoading: false,
  isSaving: false,
  subscription: null,

  /**
   * Fetch current platform controls from the database.
   */
  fetchControls: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('platform_controls')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      set({ controls: { ...defaults, ...(data || {}) } });
      return { success: true };
    } catch (e) {
      if (__DEV__) console.warn('[PlatformControls] fetchControls error:', e);
      set({ controls: defaults });
      return { success: false, error: e.message };
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Update platform controls (developer only — enforced by RLS).
   */
  updateControls: async (patch) => {
    set({ isSaving: true });
    try {
      const { data, error } = await supabase
        .from('platform_controls')
        .update({
          ...patch,
          updated_by: (await supabase.auth.getUser()).data?.user?.id,
        })
        .eq('id', 1)
        .select()
        .single();

      if (error) throw error;
      set({ controls: { ...defaults, ...data } });
      return { success: true };
    } catch (e) {
      if (__DEV__) console.warn('[PlatformControls] updateControls error:', e);
      return { success: false, error: e.message };
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Subscribe to real-time changes on the platform_controls table.
   * All clients will receive updates instantly when the developer toggles something.
   */
  subscribe: () => {
    const existing = get().subscription;
    if (existing) return;

    const channel = supabase
      .channel('platform-controls-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'platform_controls',
          filter: 'id=eq.1',
        },
        (payload) => {
          if (payload.new) {
            set({ controls: { ...defaults, ...payload.new } });
          }
        }
      )
      .subscribe();

    set({ subscription: channel });
  },

  /**
   * Unsubscribe from real-time changes.
   */
  unsubscribe: () => {
    const channel = get().subscription;
    if (channel) {
      supabase.removeChannel(channel);
      set({ subscription: null });
    }
  },
}));
