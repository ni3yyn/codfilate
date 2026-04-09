import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { generateReferralCode } from '../lib/utils';

export const useAffiliateStore = create((set, get) => ({
  affiliateProfile: null,
  allAffiliateProfiles: [],
  affiliates: [],
  referrals: [],
  commissions: [],
  payoutRequests: [],
  stats: { clicks: 0, conversions: 0, earnings: 0, total_paid: 0, conversionRate: 0 },
  isLoading: false,

  // Affiliate: join a store
  joinStore: async (storeId) => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const referralCode = generateReferralCode();

      const { data, error } = await supabase
        .from('affiliates')
        .insert({
          store_id: storeId,
          user_id: user.id,
          referral_code: referralCode,
        })
        .select()
        .single();

      if (error) throw error;

      // Update profile store_id
      await supabase
        .from('profiles')
        .update({ store_id: storeId })
        .eq('user_id', user.id);

      set({ affiliateProfile: data });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Affiliate: get own profile for a store
  fetchAffiliateProfile: async (storeId) => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase.from('affiliates').select('*').eq('user_id', user.id);
      if (storeId) {
         query = query.eq('store_id', storeId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        if (__DEV__) console.error('❌ [fetchAffiliateProfile] Select error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      set({ allAffiliateProfiles: data || [] });

      // If we have a specific storeId, find it or heal it
      if (storeId) {
        let activeProfile = data?.find(p => p.store_id === storeId);
        
        if (!activeProfile) {
          if (__DEV__) console.log('🩹 [fetchAffiliateProfile] Missing record found. Auto-healing for store:', storeId);
          const newCode = generateReferralCode();
          const { data: newData, error: insertError } = await supabase
            .from('affiliates')
            .insert({
              store_id: storeId,
              user_id: user.id,
              referral_code: newCode,
              is_active: true
            })
            .select()
            .single();
          
          if (insertError) throw insertError;
          activeProfile = newData;
          set({ allAffiliateProfiles: [newData, ...(data || [])] });
        }
        set({ affiliateProfile: activeProfile });
      } else {
        // Just set the most recent one as the "active" view
        set({ affiliateProfile: data?.[0] || null });
      }

      return { success: true, data: data?.[0] };
    } catch (error) {
      if (__DEV__) console.error('💥 [fetchAffiliateProfile] Final Catch Error:', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Merchant: view all affiliates for a store
  fetchStoreAffiliates: async (storeId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('store_id', storeId)
        .order('total_earnings', { ascending: false });

      if (error) throw error;
      
      // RADICAL FIX: Data Stitching for profiles
      const userIds = [...new Set((data || []).map(a => a.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, phone')
          .in('user_id', userIds);
          
        if (profileData) {
          const profileMap = profileData.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});
          data.forEach(a => {
            if (profileMap[a.user_id]) a.profiles = profileMap[a.user_id];
          });
        }
      }

      set({ affiliates: data || [] });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Toggle affiliate active status (merchant use)
  toggleAffiliateStatus: async (affiliateId, isActive) => {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .update({ is_active: isActive })
        .eq('id', affiliateId)
        .select()
        .single();

      if (error) throw error;
      set({
        affiliates: get().affiliates.map((a) =>
          a.id === affiliateId ? { ...a, is_active: isActive } : a
        ),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Fetch referrals for an affiliate
  fetchReferrals: async (affiliateId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ referrals: data || [] });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch commissions for an affiliate across all their store profiles
  fetchCommissions: async (_) => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userAffiliates } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id);
        
      const affiliateIds = userAffiliates?.map(a => a.id) || [];

      const { data, error } = await supabase
        .from('commissions')
        .select('*, orders(customer_name, total, status)')
        .in('affiliate_id', affiliateIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ commissions: data || [] });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // The Trust Engine: Calculate affiliate delivery & cancellation ratio
  fetchAffiliateOrderAnalytics: async (affiliateId) => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status')
        .eq('affiliate_id', affiliateId);

      if (error) throw error;
      
      const total = orders.length;
      if (total === 0) return { success: true, data: null };

      let delivered = 0;
      let cancelled = 0;
      let pending = 0;

      orders.forEach(o => {
          if (o.status === 'delivered') delivered++;
          else if (o.status === 'cancelled' || o.status === 'returned') cancelled++;
          else pending++;
      });
      
      const deliveryRate = ((delivered / total) * 100).toFixed(0);
      const spamRate = ((cancelled / total) * 100).toFixed(0);

      // Grade Logic
      let grade = 'F';
      if (deliveryRate >= 60) grade = 'A';
      else if (deliveryRate >= 40) grade = 'B';
      else if (deliveryRate >= 20) grade = 'C';
      else if (deliveryRate > 0 || total < 5) grade = 'D'; // Allow buffer for new affiliates

      return { success: true, data: { total, delivered, cancelled, pending, deliveryRate, spamRate, grade } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Global Affiliate Statistics: Aggregate across ALL store affiliations
  fetchAffiliateStats: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch all store profiles for basic stats
      const { data: allProfiles, error } = await supabase
        .from('affiliates')
        .select('id, total_clicks, total_conversions, total_earnings')
        .eq('user_id', user.id);

      if (error) throw error;
      const affIds = allProfiles?.map(a => a.id) || [];

      // 2. Fetch all PAID payouts to calculate actual withdrawals
      const { data: paidPayouts } = await supabase
        .from('payout_requests')
        .select('amount')
        .in('affiliate_id', affIds)
        .eq('status', 'paid');

      const totals = (allProfiles || []).reduce((acc, p) => {
        acc.clicks += (p.total_clicks || 0);
        acc.conversions += (p.total_conversions || 0);
        acc.earnings += Number(p.total_earnings || 0);
        return acc;
      }, { clicks: 0, conversions: 0, earnings: 0 });

      const totalPaid = (paidPayouts || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const conversionRate = totals.clicks > 0 
        ? ((totals.conversions / totals.clicks) * 100).toFixed(1) 
        : "0.0";

      const stats = { ...totals, total_paid: totalPaid, conversionRate };
      set({ stats });
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Toggle affiliate active status (merchant action)
  toggleAffiliateStatus: async (affiliateId, isActive) => {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .update({ is_active: isActive })
        .eq('id', affiliateId)
        .select()
        .single();

      if (error) throw error;
      set({
        affiliates: get().affiliates.map((a) =>
          a.id === affiliateId ? data : a
        ),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Payout Management: Fetch payout history (Admin global or User specific)
  fetchPayoutRequests: async (params = {}) => {
    set({ isLoading: true });
    try {
      const isAdmin = params?.isAdmin === true;
      let query = supabase
        .from('payout_requests')
        .select(`
          *,
          affiliates(id, user_id, referral_code),
          stores(id, name, owner_id)
        `)
        .order('created_at', { ascending: false });

      if (isAdmin) {
        // Admin: Limit for performance or use pagination if needed
        query = query.limit(150);
      } else if (params?.requesterUserId) {
        query = query.eq('requester_user_id', params.requesterUserId);
      } else if (params?.affiliateId) {
        query = query.eq('affiliate_id', params.affiliateId);
      } else if (params?.storeId) {
        query = query.eq('store_id', params.storeId);
      } else {
        // Default User Global View
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        
        const { data: userAffs } = await supabase.from('affiliates').select('id').eq('user_id', user.id);
        const affIds = userAffs?.map(a => a.id) || [];
        query = query.in('affiliate_id', affIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Robust Profile Stitching
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
             const uid = p.requester_user_id || p.affiliates?.user_id || p.stores?.owner_id;
             p.requester = profileMap[uid];
          });
        }
      }

      set({ payoutRequests: data || [] });
      return { success: true, data };
    } catch (error) {
      if (__DEV__) console.error('❌ [fetchPayoutRequests]', error);
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  createPayoutRequest: async (payoutData) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .insert(payoutData)
        .select()
        .single();

      if (error) throw error;
      set({ payoutRequests: [data, ...get().payoutRequests] });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  updatePayoutStatus: async (payoutId, status, adminNotes = null, extra = {}) => {
    set({ isLoading: true });
    try {
      const updateData = { status, ...extra };
      if (adminNotes) updateData.admin_notes = adminNotes;
      if (status === 'paid') updateData.paid_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('payout_requests')
        .update(updateData)
        .eq('id', payoutId)
        .select()
        .single();

      if (error) throw error;
      set({
        payoutRequests: get().payoutRequests.map((p) =>
          p.id === payoutId ? data : p
        ),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },
}));
