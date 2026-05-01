import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { resolveDeliveryCarrierProfileId } from '../lib/deliveryCarrier';
import { useAuthStore } from './useAuthStore';

export const useRegionalManagerStore = create((set, get) => ({
  orders: [],
  deliveries: [],
  stats: {
    pendingOrders: 0,
    confirmedToday: 0,
    deliveredToday: 0,
    monthlyEarnings: 0,
    totalOrders: 0,
    inTransit: 0,
    returnedOrders: 0,
    cancelledOrders: 0,
    deliveredThisMonth: 0,
    totalDelivered: 0,
    codCollected: 0,
    codUncollected: 0,
  },
  inventory: [],
  inventoryStats: {
    totalSkus: 0,
    lowStock: 0,
    outOfStock: 0,
  },
  isLoading: false,

  // Fetch orders for the manager's assigned wilayas
  fetchWilayaOrders: async (assignedWilayaIds, statusFilter = null) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items(product_name, quantity, unit_price),
          affiliates(referral_code, user_id)
        `)
        .order('created_at', { ascending: false });

      if (assignedWilayaIds && Array.isArray(assignedWilayaIds) && assignedWilayaIds.length > 0) {
        query = query.in('wilaya_id', assignedWilayaIds);
      } else if (useAuthStore.getState().profile?.role === 'regional_manager') {
         // RM with no wilayas assigned shouldn't see anything (Security Guard)
         return { success: true, data: [] };
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Stitch affiliate profile names
      const userIds = [...new Set((data || []).map(o => o.affiliates?.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);

        if (profileData) {
          const profileMap = profileData.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});
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
      if (__DEV__) console.error('❌ [fetchWilayaOrders]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Confirm an order — triggers delivery request creation
  confirmOrder: async (orderId, profileId, wilayaId, storeId, order) => {
    set({ isLoading: true });
    try {
      // 1. Update order status (must still be pending — e.g. not awaiting_marketer)
      const { data: updatedOrder, error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'confirmed_by_manager',
          tracking_status: 'confirmed_by_manager',
          regional_manager_id: profileId,
          tracking_updates: [
            ...(order.tracking_updates || []),
            { status: 'confirmed_by_manager', timestamp: new Date().toISOString(), note: 'تمت الموافقة من المدير الإقليمي' },
          ],
        })
        .eq('id', orderId)
        .in('status', ['pending', 'awaiting_marketer'])
        .select('id')
        .maybeSingle();

      if (orderError) throw orderError;
      if (!updatedOrder) {
        throw new Error('لا يمكن تأكيد هذا الطلب — تأكد من حالة الطلب (PENDING أو AWAITING_MARKETER) وصلاحياتك.');
      }

      // 2. Super admin (HQ) = internal carrier; delivery_requests.delivery_company_id → admin profile id
      const carrierProfileId = await resolveDeliveryCarrierProfileId(wilayaId);

      // 3. Create delivery request
      const { error: drError } = await supabase
        .from('delivery_requests')
        .insert({
          order_id: orderId,
          delivery_company_id: carrierProfileId,
          regional_manager_id: profileId,
          store_id: storeId,
          wilaya_id: wilayaId,
          status: carrierProfileId ? 'assigned' : 'pending',
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_address: order.customer_address,
          delivery_type: order.delivery_type || 'home',
          delivery_fee: order.delivery_fee || 0,
          notes: order.notes,
        });

      if (drError) throw drError;

      // Update local state
      set({
        orders: get().orders.map(o =>
          o.id === orderId ? { ...o, status: 'confirmed_by_manager', tracking_status: 'confirmed_by_manager' } : o
        ),
      });

      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('❌ [confirmOrder]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  confirmCodCollected: async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ cod_confirmed_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('status', 'delivered');
      if (error) throw error;
      set({
        orders: get().orders.map((o) =>
          o.id === orderId ? { ...o, cod_confirmed_at: new Date().toISOString() } : o
        ),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Reject an order
  rejectOrder: async (orderId, reason) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          tracking_status: 'failed',
          tracking_updates: [
            { status: 'rejected', timestamp: new Date().toISOString(), note: reason },
          ],
          notes: reason,
        })
        .eq('id', orderId);

      if (error) throw error;

      set({
        orders: get().orders.filter(o => o.id !== orderId),
      });

      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('❌ [rejectOrder]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  /** Pending merchant stores in RM wilayas (RLS-scoped). */
  fetchPendingMerchantStores: async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          profiles!fk_profiles_store_id(full_name, phone)
        `)
        .is('rm_activated_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /** Active merchant stores in RM wilayas. */
  fetchAssignedMerchantStores: async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          profiles!fk_profiles_store_id(full_name, phone)
        `)
        .not('rm_activated_at', 'is', null)
        .order('rm_activated_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /** 
   * Deep-dive for a specific store: 
   * Returns its products and summary stats for RM-handled orders.
   */
  fetchStoreDetails: async (storeId, assignedWilayaIds) => {
    try {
      // 1. Fetch products
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      if (pErr) throw pErr;

      // 2. Fetch order stats (Revenue/Earnings) in RM's regions
      let q = supabase
        .from('orders')
        .select('total, status, sale_price, cod_confirmed_at')
        .eq('store_id', storeId);
      
      if (assignedWilayaIds?.length > 0) {
        q = q.in('wilaya_id', assignedWilayaIds);
      }

      const { data: orders, error: oErr } = await q;
      if (oErr) throw oErr;

      const totalCod = orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.total || 0), 0);
      
      const successfulCount = orders.filter(o => o.status === 'delivered').length;

      return {
        success: true,
        data: {
          products: products || [],
          stats: {
            totalOrders: orders.length,
            successfulOrders: successfulCount,
            totalRevenue: totalCod,
            returnRate: orders.length ? Math.round((orders.filter(o => o.status === 'returned').length / orders.length) * 100) : 0
          }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  activateMerchantStore: async (storeId, wilayaId = null) => {
    try {
      const role = useAuthStore.getState().profile?.role;
      const rpc =
        role === 'admin' ? 'admin_activate_merchant_store' : 'regional_manager_activate_store';
      
      if (__DEV__) console.log(`🚀 [activateMerchantStore] RPC: ${rpc} for ID: ${storeId} (Wilaya: ${wilayaId})`);
      
      const { error } = await supabase.rpc(rpc, { 
        p_store_id: storeId,
        p_wilaya_id: wilayaId
      });
      
      if (error) {
        if (__DEV__) console.error(`❌ [activateMerchantStore] RPC Error:`, error);
        throw error;
      }
      
      if (__DEV__) console.log(`✅ [activateMerchantStore] Success!`);
      return { success: true };
    } catch (error) {
      const errMsg = error.message || 'فشل الاتصال بالخادم';
      if (__DEV__) console.error('❌ [activateMerchantStore] Exception:', error);
      return { success: false, error: errMsg };
    }
  },

  rejectMerchantStore: async (storeId, reason) => {
    try {
      const { error } = await supabase.rpc('regional_manager_reject_store', { 
        p_store_id: storeId,
        p_reason: reason
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('❌ [rejectMerchantStore] Error:', error);
      return { success: false, error: error.message };
    }
  },

  /** RM can patch order fields (status, tracking, notes) within RLS. */
  updateOrderAsRegionalManager: async (orderId, updates) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('not_found_or_forbidden');

      set({
        orders: get().orders.map((o) => (o.id === orderId ? { ...o, ...data } : o)),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Fetch statistics for the regional manager
  fetchManagerStats: async (assignedWilayaIds) => {
    try {
      let q = supabase.from('orders').select('status, created_at, tracking_status, cod_confirmed_at');
      if (assignedWilayaIds && assignedWilayaIds.length > 0) {
        q = q.in('wilaya_id', assignedWilayaIds);
      }
      const { data: orders, error } = await q;

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().slice(0, 7);

      let rmFee = 150;
      try {
        const { data: ps } = await supabase.from('platform_settings').select('regional_manager_fee').eq('id', 1).maybeSingle();
        rmFee = Number(ps?.regional_manager_fee ?? 150);
      } catch (e) { /* keep default */ }

      const deliveredOrders = orders.filter(o => o.status === 'delivered');
      const deliveredThisMonth = orders.filter(o =>
        o.status === 'delivered' && o.created_at?.startsWith(thisMonth)
      );

      const stats = {
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        confirmedToday: orders.filter(o =>
          o.status === 'confirmed_by_manager' && o.created_at?.startsWith(today)
        ).length,
        deliveredToday: orders.filter(o =>
          o.status === 'delivered' && o.created_at?.startsWith(today)
        ).length,
        inTransit: orders.filter(o => o.status === 'in_transit').length,
        returnedOrders: orders.filter(o => o.status === 'returned').length,
        cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
        totalDelivered: deliveredOrders.length,
        deliveredThisMonth: deliveredThisMonth.length,
        monthlyEarnings: deliveredThisMonth.length * rmFee,
        codCollected: deliveredOrders.filter(o => !!o.cod_confirmed_at).length,
        codUncollected: deliveredOrders.filter(o => !o.cod_confirmed_at).length,
      };

      set({ stats });
      return { success: true, data: stats };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchManagerStats]', error);
      return { success: false, error: error.message };
    }
  },

  // RM: Fetch payout requests for merchants/affiliates in assigned wilayas
  fetchWilayaPayoutRequests: async (assignedWilayaIds) => {
    set({ isLoading: true });
    try {
      if (!assignedWilayaIds || assignedWilayaIds.length === 0) {
        return { success: true, data: [] };
      }

      // 1. Get all stores in RM's wilayas
      const { data: storesData } = await supabase
        .from('stores')
        .select('id, owner_id')
        .in('wilaya_id', assignedWilayaIds);

      const storeIds = (storesData || []).map(s => s.id);
      if (storeIds.length === 0) return { success: true, data: [] };

      // 2. Fetch payout requests with joins
      const { data, error } = await supabase
        .from('payout_requests')
        .select(`
          *,
          affiliates(user_id, referral_code),
          stores(name, owner_id)
        `)
        .in('store_id', storeIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // 3. Robust Profile Stitching
      // We gather IDs from requester_user_id (if exists), affiliates, or store owners
      const userIds = new Set();
      data.forEach(p => {
        if (p.requester_user_id) userIds.add(p.requester_user_id);
        if (p.affiliates?.user_id) userIds.add(p.affiliates.user_id);
        if (p.stores?.owner_id) userIds.add(p.stores.owner_id);
      });

      const uniqueUserIds = [...userIds];
      if (uniqueUserIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, role')
          .in('user_id', uniqueUserIds);
          
        if (profileData) {
          const profileMap = profileData.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});
          data.forEach(p => {
             // Logic: Payout requester is either the affiliate or the store owner
             const uid = p.requester_user_id || p.affiliates?.user_id || p.stores?.owner_id;
             p.requester = profileMap[uid];
          });
        }
      }

      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchWilayaPayoutRequests]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Delivery requests tied to this RM (after confirmOrder).
   * @param {'active'|'history'} segment — active = pending→in_transit; history = delivered/failed
   */
  fetchManagerDeliveries: async (profileId, segment = 'active') => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('delivery_requests')
        .select(`
          *,
          orders(
            id,
            customer_name,
            customer_phone,
            customer_address,
            wilaya,
            commune,
            total,
            sale_price,
            delivery_type,
            delivery_fee,
            notes,
            status,
            tracking_status,
            cod_confirmed_at,
            order_items(product_name, quantity, unit_price)
          ),
          wilayas(name, name_fr, code)
        `)
        .eq('regional_manager_id', profileId)
        .order('created_at', { ascending: false });

      if (segment === 'history') {
        query = query.in('status', ['delivered', 'failed']);
      } else {
        query = query.in('status', ['pending', 'assigned', 'picked_up', 'in_transit']);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ deliveries: data || [] });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchManagerDeliveries]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  /** 
   * Standardized 6-status lifecycle management.
   * Updates BOTH orders and delivery_requests tables.
   */
  updateOrderLifecycleStatus: async (orderId, nextStatus, notes = '') => {
    set({ isLoading: true });
    try {
      const ts = new Date().toISOString();
      const updatePayload = {
        status: nextStatus,
        tracking_status: nextStatus,
      };

      // Add timestamps based on status
      if (nextStatus === 'confirmed_by_manager') updatePayload.confirmed_at = ts;
      if (nextStatus === 'in_transit') updatePayload.shipped_at = ts;
      if (nextStatus === 'delivered') updatePayload.delivered_at = ts;
      if (nextStatus === 'returned') updatePayload.returned_at = ts;

      // 1. Update Order
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .select('tracking_updates')
        .eq('id', orderId)
        .maybeSingle();
      
      if (oErr) throw oErr;

      const { error: updErr } = await supabase
        .from('orders')
        .update({
          ...updatePayload,
          tracking_updates: [
            ...(order?.tracking_updates || []),
            { status: nextStatus, timestamp: ts, note: notes || `حالة جديدة: ${nextStatus}` },
          ],
        })
        .eq('id', orderId);

      if (updErr) throw updErr;

      // 2. Sync Delivery Request (if it exists)
      // Note: 'returned' maps to 'failed' in delivery_requests schema
      const drStatus = nextStatus === 'returned' ? 'failed' : 
                      nextStatus === 'cancelled' ? 'failed' : nextStatus;

      const drPayload = { status: drStatus };
      if (drStatus === 'in_transit') drPayload.picked_up_at = ts;
      if (drStatus === 'delivered') drPayload.delivered_at = ts;
      if (drStatus === 'failed') {
        drPayload.failed_at = ts;
        drPayload.failed_reason = notes;
      }

      const { error: drErr } = await supabase
        .from('delivery_requests')
        .update(drPayload)
        .eq('order_id', orderId);
      
      // If no delivery request exists yet (for manual confirmation), we ignore errors
      if (drErr && !drErr.message.includes('permission denied')) {
        if (__DEV__) console.warn('⚠️ [updateOrderLifecycleStatus] DR Sync Warning:', drErr.message);
      }

      set({
        orders: get().orders.map((o) => (o.id === orderId ? { ...o, ...updatePayload } : o)),
      });

      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('❌ [updateOrderLifecycleStatus]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  fulfillFromStock: async (orderId, profileId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.rpc('rm_fulfill_from_stock', {
        p_order_id: orderId,
        p_profile_id: profileId,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Refresh orders and inventory
      const wilayaIds = get().inventory.map(i => i.wilaya_id);
      await Promise.all([
        get().fetchWilayaOrders(wilayaIds),
        get().fetchInventory(wilayaIds),
      ]);

      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('❌ [fulfillFromStock]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // --- INVENTORY MANAGEMENT ---

  fetchInventory: async (wilayaIds, search = '') => {
    if (__DEV__) console.log('📦 [fetchInventory] Wilaya IDs:', wilayaIds);
    set({ isLoading: true });
    try {
      // Using the simplified warehouse view to avoid nested join issues
      let q = supabase
        .from('warehouse_inventory_v')
        .select('*');

      if (wilayaIds && wilayaIds.length > 0) {
        q = q.in('wilaya_id', wilayaIds);
      }

      const { data, error } = await q;
      
      if (error) {
        if (__DEV__) console.error('❌ [fetchInventory] View Query Error:', error);
        throw error;
      }

      if (__DEV__) console.log(`✅ [fetchInventory] Found ${data?.length || 0} items`);

      let filtered = data || [];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(row => 
          row.product_name?.toLowerCase().includes(s) || 
          row.category_name?.toLowerCase().includes(s) ||
          row.store_name?.toLowerCase().includes(s)
        );
      }

      const stats = {
        totalSkus: filtered.length,
        lowStock: filtered.filter(r => r.quantity > 0 && r.quantity < 10).length,
        outOfStock: filtered.filter(r => r.quantity === 0).length,
      };

      set({ inventory: filtered, inventoryStats: stats });
      return { success: true, data: filtered };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  adjustStock: async (productId, wilayaId, delta, note = '') => {
    try {
      const { error } = await supabase.rpc('rm_adjust_wilaya_stock', {
        p_product_id: productId,
        p_wilaya_id: wilayaId,
        p_delta: delta,
        p_note: note,
      });
      if (error) throw error;
      
      // Refresh local inventory state
      const profile = useAuthStore.getState().profile;
      const { getEffectiveWilayaIds } = await import('../lib/profileUtils');
      const ids = getEffectiveWilayaIds(profile);
      await get().fetchInventory(ids);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  addInventoryProduct: async (productId, wilayaId, initialQty = 0) => {
    try {
      const { error } = await supabase
        .from('product_wilaya_stock')
        .insert({
          product_id: productId,
          wilaya_id: wilayaId,
          quantity: initialQty,
        });
      
      if (error && error.code !== '23505') throw error; // Ignore if already exists
      
      const profile = useAuthStore.getState().profile;
      const { getEffectiveWilayaIds } = await import('../lib/profileUtils');
      const ids = getEffectiveWilayaIds(profile);
      await get().fetchInventory(ids);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
}));
