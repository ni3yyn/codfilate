import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Helper: safe loading counter to prevent race conditions
const _startLoading = (set, get) => {
  const count = (get()._loadingCount || 0) + 1;
  set({ _loadingCount: count, isLoading: true });
};
const _stopLoading = (set, get) => {
  const count = Math.max(0, (get()._loadingCount || 1) - 1);
  set({ _loadingCount: count, isLoading: count > 0 });
};

export const useOrderStore = create((set, get) => ({
  orders: [],
  currentOrder: null,
  stats: { total: 0, pending: 0, confirmed: 0, in_transit: 0, delivered: 0, returned: 0, cancelled: 0, totalRevenue: 0, deliveredRevenue: 0, avgOrderValue: 0, todayOrders: 0, todayRevenue: 0 },
  isLoading: false,
  _loadingCount: 0,

  fetchOrders: async (storeId, statusFilter = null) => {
    if (!storeId) {
      if (__DEV__) console.error('❌ [fetchOrders] Attempted to fetch orders without storeId. Blocking to prevent data leakage.');
      return { success: false, error: 'Store ID is required' };
    }
    _startLoading(set, get);
    try {
      let query = supabase
        .from('orders')
        .select('*, affiliates(referral_code, user_id), order_items(product_name, quantity, unit_price)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
         throw error;
      }

      // RADICAL FIX: Data Stitching for profiles to bypass PostgREST ambiguity
      const userIds = [...new Set(data.map(o => o.affiliates?.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);
          
        if (profileData) {
          const profileMap = profileData.reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {});

          data.forEach(order => {
             if (order.affiliates?.user_id && profileMap[order.affiliates.user_id]) {
                order.affiliates.profiles = profileMap[order.affiliates.user_id];
             }
          });
        }
      }

      set({ orders: data || [] });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      _stopLoading(set, get);
    }
  },

  fetchAffiliateOrders: async (_, statusFilter = null) => {
    _startLoading(set, get);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      // Get all affiliate relation IDs for this user
      const { data: userAffiliates } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id);
        
      const affiliateIds = userAffiliates?.map(a => a.id) || [];
      
      let query = supabase
        .from('orders')
        .select('*, order_items(product_name, quantity, unit_price), stores(name)')
        .in('affiliate_id', affiliateIds)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        if (__DEV__) console.error('❌ [fetchAffiliateOrders] Supabase Error:', error);
        throw error;
      }
      if (__DEV__) console.log('✅ [fetchAffiliateOrders] Success. Count:', data?.length || 0);
      set({ orders: data || [] });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      _stopLoading(set, get);
    }
  },

  fetchOrder: async (orderId) => {
    _startLoading(set, get);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      set({ currentOrder: data });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      _stopLoading(set, get);
    }
  },

  createOrder: async (orderData, items) => {
    _startLoading(set, get);
    try {
      if (__DEV__) console.log('🚀 [createOrder] Payload Data:', JSON.stringify(orderData, null, 2));
      if (__DEV__) console.log('📦 [createOrder] Items Data:', JSON.stringify(items, null, 2));

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        if (__DEV__) console.error('❌ [createOrder] Supabase "orders" Table Reject:', JSON.stringify(orderError, null, 2));
        throw orderError;
      }

      if (__DEV__) console.log('✅ [createOrder] Order DB entry created. ID:', order.id);

      // Insert order items
      if (items && items.length > 0) {
        const orderItems = items.map((item) => ({
          ...item,
          order_id: order.id,
          store_id: orderData.store_id,
        }));

        if (__DEV__) console.log('📦 [createOrder] Order Items Payload:', JSON.stringify(orderItems, null, 2));
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          if (__DEV__) console.error('❌ [createOrder] Supabase "order_items" Table Reject:', JSON.stringify(itemsError, null, 2));
          throw itemsError;
        }
      }

      set({ orders: [order, ...get().orders] });
      return { success: true, data: order };
    } catch (error) {
      if (__DEV__) console.error('💥 [createOrder] Fatal Catch Error:', error);
      return { success: false, error: error.message };
    } finally {
      _stopLoading(set, get);
    }
  },

  updateOrderStatus: async (orderId, status) => {
    set({ isLoading: true });
    try {
      const currentOrder = get().orders.find((o) => o.id === orderId);
      const oldStatus = currentOrder?.status;

      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select('*, order_items(*)')
        .single();

      if (error) throw error;

      // Stock adjustments are handled server-side (sync_order_stock_from_status)

      // Preserve stitched profiles
      const updatedOrder = { ...currentOrder, ...data };
      set({
        orders: get().orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        currentOrder: updatedOrder,
      });
      return { success: true, data: updatedOrder };
    } catch (error) {
      if (__DEV__) console.error('💥 [updateOrderStatus] Auto Stock Error:', error);
      return { success: false, error: error.message };
    } finally {
      _stopLoading(set, get);
    }
  },

  affiliateConfirmOrder: async (orderId) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.rpc('affiliate_confirm_order', {
        p_order_id: orderId,
      });
      if (error) throw error;
      set({
        orders: get().orders.map((o) =>
          o.id === orderId ? { ...o, status: 'pending', tracking_status: 'pending' } : o
        ),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      _stopLoading(set, get);
    }
  },

  updateOrderDetails: async (orderId, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      set({
        orders: get().orders.map((o) => (o.id === orderId ? data : o)),
        currentOrder: data,
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      _stopLoading(set, get);
    }
  },

  fetchOrderStats: async (storeId) => {
    if (!storeId) {
      if (__DEV__) console.warn('⚠️ [fetchOrderStats] Called without storeId. Returning empty stats.');
      return { success: true, data: {} };
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status, total, created_at, base_price')
        .eq('store_id', storeId);

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const deliveredOrders = data.filter((o) => o.status === 'delivered');
      const todayOrders = data.filter((o) => o.created_at?.startsWith(today));

      const getMerchantShare = (o) => {
        // Merchant share = strictly Base Price (Product Price - Commission)
        // Delivery fees go to the platform, so they are excluded here.
        // If base_price is missing (legacy), fallback to total.
        return Number(o.base_price ?? o.total ?? 0);
      };

      const stats = {
        total: data.length,
        totalRevenue: data.reduce((sum, o) => sum + getMerchantShare(o), 0),
        deliveredRevenue: deliveredOrders.reduce((sum, o) => sum + getMerchantShare(o), 0),
        avgOrderValue: data.length > 0 ? Math.round(data.reduce((sum, o) => sum + getMerchantShare(o), 0) / data.length) : 0,
        pending: data.filter((o) => o.status === 'pending').length,
        confirmed: data.filter((o) => o.status === 'confirmed' || o.status === 'confirmed_by_manager').length,
        in_transit: data.filter((o) => o.status === 'in_transit').length,
        delivered: deliveredOrders.length,
        returned: data.filter((o) => o.status === 'returned').length,
        cancelled: data.filter((o) => o.status === 'cancelled').length,
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, o) => sum + getMerchantShare(o), 0),
        conversionRate: data.length > 0 ? ((deliveredOrders.length / data.length) * 100).toFixed(1) : '0',
      };

      set({ stats });
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
}));
