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

  subscribeToNotifications: (userId) => {
    if (!userId) return () => {};
    
    // Initial fetch
    get().fetchNotifications(userId);

    // Use a unique channel name to avoid "already subscribed" errors if 
    // multiple instances of UniversalHeader mount simultaneously
    const channelId = `notifs-${userId}-${Math.random().toString(36).substring(7)}`;
    
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          get().fetchNotifications(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
