import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useNotificationsStore = create((set, get) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (userId) => {
    if (!userId) return;
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const list = data || [];
      set({
        items: list,
        unreadCount: list.filter((n) => !n.read_at).length,
      });
    } catch (e) {
      if (__DEV__) console.warn('fetchNotifications', e);
    } finally {
      set({ isLoading: false });
    }
  },

  markRead: async (id, userId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      if (userId) await get().fetchNotifications(userId);
    } catch (e) {
      if (__DEV__) console.warn('markRead', e);
    }
  },

  markAllRead: async (userId) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
      await get().fetchNotifications(userId);
    } catch (e) {
      if (__DEV__) console.warn('markAllRead', e);
    }
  },
}));
