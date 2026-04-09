import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useDeliveryStore = create((set, get) => ({
  deliveryRequests: [],
  completedDeliveries: [],
  stats: {
    totalDeliveries: 0,
    completedToday: 0,
    pendingDeliveries: 0,
    totalEarned: 0,
  },
  isLoading: false,

  // Fetch active delivery requests for this delivery company
  fetchDeliveryRequests: async (profileId, statusFilter = null) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('delivery_requests')
        .select(`
          *,
          orders(
            id, customer_name, customer_phone, customer_address,
            wilaya, commune, total, sale_price, base_price,
            delivery_type, delivery_fee, notes,
            order_items(product_name, quantity, unit_price)
          ),
          wilayas(name, name_fr, code)
        `)
        .eq('delivery_company_id', profileId)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      } else {
        // Default: show active (not delivered/failed)
        query = query.in('status', ['pending', 'assigned', 'picked_up', 'in_transit']);
      }

      const { data, error } = await query;
      if (error) throw error;

      set({ deliveryRequests: data || [] });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchDeliveryRequests]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch completed deliveries (history)
  fetchCompletedDeliveries: async (profileId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('delivery_requests')
        .select(`
          *,
          orders(customer_name, total, sale_price, delivery_fee),
          wilayas(name, code)
        `)
        .eq('delivery_company_id', profileId)
        .in('status', ['delivered', 'failed'])
        .order('delivered_at', { ascending: false });

      if (error) throw error;
      set({ completedDeliveries: data || [] });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchCompletedDeliveries]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Update delivery status (picked_up → in_transit → delivered / failed)
  updateDeliveryStatus: async (requestId, newStatus, note = '', failedReason = '') => {
    set({ isLoading: true });
    try {
      const updateData = {
        status: newStatus,
      };

      if (newStatus === 'picked_up') {
        updateData.picked_up_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      } else if (newStatus === 'failed') {
        updateData.failed_at = new Date().toISOString();
        updateData.failed_reason = failedReason;
      }

      const { data, error } = await supabase
        .from('delivery_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // Also update the parent order tracking_status
      if (data?.order_id) {
        await supabase
          .from('orders')
          .update({
            tracking_status: newStatus,
            status: newStatus === 'delivered' ? 'delivered'
              : newStatus === 'failed' ? 'failed'
              : newStatus === 'picked_up' ? 'picked_up'
              : newStatus === 'in_transit' ? 'in_transit'
              : undefined,
            tracking_updates: supabase.rpc ? undefined : [
              { status: newStatus, timestamp: new Date().toISOString(), note: note || failedReason },
            ],
          })
          .eq('id', data.order_id);
      }

      // Update local state
      if (newStatus === 'delivered' || newStatus === 'failed') {
        set({
          deliveryRequests: get().deliveryRequests.filter(r => r.id !== requestId),
          completedDeliveries: [data, ...get().completedDeliveries],
        });
      } else {
        set({
          deliveryRequests: get().deliveryRequests.map(r =>
            r.id === requestId ? { ...r, ...data } : r
          ),
        });
      }

      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('❌ [updateDeliveryStatus]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch delivery stats
  fetchDeliveryStats: async (profileId) => {
    try {
      const { data: all, error } = await supabase
        .from('delivery_requests')
        .select('status, delivery_fee, delivered_at')
        .eq('delivery_company_id', profileId);

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];

      const stats = {
        totalDeliveries: (all || []).length,
        completedToday: (all || []).filter(d => d.status === 'delivered' && d.delivered_at?.startsWith(today)).length,
        pendingDeliveries: (all || []).filter(d => ['pending', 'assigned', 'picked_up', 'in_transit'].includes(d.status)).length,
        totalEarned: (all || []).filter(d => d.status === 'delivered').reduce((sum, d) => sum + Number(d.delivery_fee || 0), 0),
      };

      set({ stats });
      return { success: true, data: stats };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchDeliveryStats]', error);
      return { success: false, error: error.message };
    }
  },
}));
