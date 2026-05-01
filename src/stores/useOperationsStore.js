import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const PAGE_SIZE = 50;

/**
 * Admin Operations Log Store.
 * Read-only aggregation layer for the operations command center.
 */
export const useOperationsStore = create((set, get) => ({
  // --- State ---
  events: [],
  wilayaStats: [],
  campaigns: [],
  summary: {
    todayOrders: 0,
    todayRevenue: 0,
    inTransit: 0,
    codUncollected: 0,
    deliveredToday: 0,
    returnedToday: 0,
    totalCampaigns: 0,
  },
  isLoading: false,
  isSummaryLoading: false,
  hasMore: true,
  page: 0,
  lastUpdated: null,

  // --- Actions ---

  /**
   * Fetch paginated operations event log.
   * Merges orders + campaigns into a single timeline.
   */
  fetchEvents: async (filters = {}, reset = false) => {
    const state = get();
    if (state.isLoading) return;

    const page = reset ? 0 : state.page;
    set({ isLoading: true, ...(reset ? { events: [], page: 0, hasMore: true } : {}) });

    try {
      // --- Orders query ---
      let query = supabase
        .from('orders')
        .select(`
          id, status, tracking_status, total, sale_price, delivery_fee,
          customer_name, customer_phone, wilaya, commune, wilaya_id,
          cod_confirmed_at, created_at, updated_at, notes,
          store_id, stores(name),
          affiliates(referral_code, user_id),
          order_items(product_name, quantity, unit_price)
        `)
        .order('updated_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.wilayaId) {
        query = query.eq('wilaya_id', filters.wilayaId);
      }
      if (filters.codOnly) {
        query = query.is('cod_confirmed_at', null).eq('status', 'delivered');
      }
      if (filters.search) {
        const s = `%${filters.search}%`;
        query = query.or(`customer_name.ilike.${s},wilaya.ilike.${s},id.eq.${filters.search}`);
      }
      if (filters.dateRange) {
        const now = new Date();
        let since;
        if (filters.dateRange === 'today') {
          since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        } else if (filters.dateRange === 'week') {
          since = new Date(now.getTime() - 7 * 86400000).toISOString();
        } else if (filters.dateRange === 'month') {
          since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        }
        if (since) {
          query = query.gte('updated_at', since);
        }
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Map to unified event shape
      const orderEvents = (orders || []).map(o => ({
        id: o.id,
        type: o.cod_confirmed_at ? 'cod_collected' : 'order',
        orderId: o.id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        wilayaName: o.wilaya,
        commune: o.commune,
        wilayaId: o.wilaya_id,
        status: o.status,
        trackingStatus: o.tracking_status,
        amount: o.sale_price,
        deliveryFee: o.delivery_fee,
        total: o.total,
        storeName: o.stores?.name || '—',
        affiliateCode: o.affiliates?.referral_code || '—',
        codConfirmedAt: o.cod_confirmed_at,
        items: o.order_items || [],
        notes: o.notes,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      }));

      // --- Campaigns query (only on first page / reset) ---
      let campaignEvents = [];
      if (page === 0 && (!filters.status || filters.status === 'all') && !filters.codOnly && !filters.wilayaId) {
        let cQuery = supabase
          .from('marketing_campaigns')
          .select(`
            id, slug, sale_price, is_active, created_at,
            products(name, price, image_url),
            affiliates(referral_code, user_id)
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (filters.dateRange) {
          const now = new Date();
          let since;
          if (filters.dateRange === 'today') {
            since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          } else if (filters.dateRange === 'week') {
            since = new Date(now.getTime() - 7 * 86400000).toISOString();
          } else if (filters.dateRange === 'month') {
            since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          }
          if (since) cQuery = cQuery.gte('created_at', since);
        }

        const { data: cData } = await cQuery;
        campaignEvents = (cData || []).map(c => ({
          id: `camp_${c.id}`,
          type: 'campaign_created',
          orderId: null,
          customerName: null,
          wilayaName: null,
          wilayaId: null,
          status: c.is_active ? 'active' : 'inactive',
          amount: c.sale_price,
          total: null,
          deliveryFee: null,
          storeName: null,
          affiliateCode: c.affiliates?.referral_code || '—',
          campaignSlug: c.slug,
          productName: c.products?.name || '—',
          codConfirmedAt: null,
          createdAt: c.created_at,
          updatedAt: c.created_at,
        }));
      }

      // --- Profiles query (user signups, only on first page) ---
      let profileEvents = [];
      if (page === 0 && (!filters.status || filters.status === 'all') && !filters.codOnly && !filters.wilayaId) {
        let pQuery = supabase
          .from('profiles')
          .select('id, user_id, full_name, role, created_at')
          .in('role', ['merchant', 'affiliate'])
          .order('created_at', { ascending: false })
          .limit(20);

        if (filters.search) {
          const s = `%${filters.search}%`;
          pQuery = pQuery.ilike('full_name', s);
        }

        if (filters.dateRange) {
          const now = new Date();
          let since;
          if (filters.dateRange === 'today') {
            since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          } else if (filters.dateRange === 'week') {
            since = new Date(now.getTime() - 7 * 86400000).toISOString();
          } else if (filters.dateRange === 'month') {
            since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          }
          if (since) pQuery = pQuery.gte('created_at', since);
        }

        const { data: pData, error: pError } = await pQuery;
        
        if (pError) {
          if (__DEV__) console.error('❌ [useOperationsStore] Profiles Fetch Error (Possible RLS issue):', pError);
        }

        profileEvents = (pData || []).map(p => ({
          id: `prof_${p.id || p.user_id}`,
          type: 'user_signup',
          orderId: null,
          customerName: p.full_name || 'مستخدم جديد',
          role: p.role,
          wilayaName: null,
          wilayaId: null,
          status: 'active',
          createdAt: p.created_at,
          updatedAt: p.created_at,
        }));
      }

      // Merge and sort by updatedAt
      const allEvents = [...orderEvents, ...campaignEvents, ...profileEvents]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      set({
        events: reset ? allEvents : [...state.events, ...allEvents],
        page: page + 1,
        hasMore: orders?.length === PAGE_SIZE,
        lastUpdated: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchEvents]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Fetch per-wilaya aggregated stats.
   */
  fetchWilayaBreakdown: async () => {
    try {
      const [{ data: orders, error: oErr }, { data: wilayas, error: wErr }] = await Promise.all([
        supabase.from('orders').select('wilaya_id, status, total, delivery_fee, cod_confirmed_at'),
        supabase.from('wilayas').select('id, name, name_fr, code').eq('is_active', true).order('code'),
      ]);

      if (oErr) throw oErr;
      if (wErr) throw wErr;

      // Aggregate by wilaya_id
      const map = {};
      (orders || []).forEach(o => {
        if (!o.wilaya_id) return;
        if (!map[o.wilaya_id]) {
          map[o.wilaya_id] = { totalOrders: 0, delivered: 0, returned: 0, cancelled: 0, inTransit: 0, revenue: 0, codUncollected: 0 };
        }
        const s = map[o.wilaya_id];
        s.totalOrders++;
        if (o.status === 'delivered') {
          s.delivered++;
          s.revenue += Number(o.total || 0);
          if (!o.cod_confirmed_at) s.codUncollected++;
        }
        if (o.status === 'returned') s.returned++;
        if (o.status === 'cancelled') s.cancelled++;
        if (o.status === 'in_transit') s.inTransit++;
      });

      // Merge with wilaya names
      const stats = (wilayas || []).map(w => ({
        id: w.id,
        name: w.name,
        nameFr: w.name_fr,
        code: w.code,
        ...(map[w.id] || { totalOrders: 0, delivered: 0, returned: 0, cancelled: 0, inTransit: 0, revenue: 0, codUncollected: 0 }),
      })).sort((a, b) => b.totalOrders - a.totalOrders);

      set({ wilayaStats: stats });
      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchWilayaBreakdown]', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch top-line summary KPIs.
   */
  fetchSummary: async () => {
    set({ isSummaryLoading: true });
    try {
      const today = new Date().toISOString().split('T')[0];

      const [{ data: orders, error: oErr }, { data: campaigns, error: cErr }] = await Promise.all([
        supabase.from('orders').select('status, total, cod_confirmed_at, created_at'),
        supabase.from('marketing_campaigns').select('id').eq('is_active', true),
      ]);

      if (oErr) throw oErr;

      const all = orders || [];
      const todayOrders = all.filter(o => o.created_at?.startsWith(today));
      const delivered = all.filter(o => o.status === 'delivered');

      set({
        summary: {
          todayOrders: todayOrders.length,
          todayRevenue: todayOrders.reduce((s, o) => s + Number(o.total || 0), 0),
          inTransit: all.filter(o => o.status === 'in_transit').length,
          codUncollected: delivered.filter(o => !o.cod_confirmed_at).length,
          deliveredToday: todayOrders.filter(o => o.status === 'delivered').length,
          returnedToday: todayOrders.filter(o => o.status === 'returned').length,
          totalCampaigns: campaigns?.length || 0,
        },
        lastUpdated: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchSummary]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isSummaryLoading: false });
    }
  },

  /**
   * Load next page.
   */
  loadMore: async (filters) => {
    if (!get().hasMore || get().isLoading) return;
    return get().fetchEvents(filters, false);
  },

  /**
   * Full refresh — reset pagination and reload everything.
   */
  refresh: async (filters) => {
    await Promise.all([
      get().fetchEvents(filters, true),
      get().fetchSummary(),
      get().fetchWilayaBreakdown(),
    ]);
  },
}));
