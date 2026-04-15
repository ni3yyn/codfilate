import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Helper to fix Supabase GoTrue lock errors (Lock broken / steal)
const executeSupabase = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await operation();
      // Supabase returns { error } object without throwing exceptions sometimes
      if (result?.error?.message?.includes('Lock broken') || result?.error?.message?.includes('steal')) {
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
          continue;
        }
      }
      return result;
    } catch (error) {
      // Catch actual thrown exceptions from the underlying fetch
      if ((error?.message?.includes('Lock broken') || error?.message?.includes('steal')) && i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
};

export const useCampaignStore = create((set, get) => ({
  campaigns: [],
  isLoading: false,

  fetchCampaignsForAffiliate: async (_) => {
    set({ isLoading: true });
    try {
      // Use getSession instead of getUser to prevent unnecessary network calls that trigger the refresh lock
      const { data: { session }, error: authError } = await executeSupabase(() => supabase.auth.getSession());
      if (authError) throw authError;

      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      const { data: userAffiliates, error: affError } = await executeSupabase(() => supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id));

      if (affError) throw affError;

      const affiliateIds = userAffiliates?.map(a => a.id) || [];

      const { data, error } = await executeSupabase(() => supabase
        .from('marketing_campaigns')
        .select('*, products(id, name, price, image_url, listing_status)')
        .in('affiliate_id', affiliateIds)
        .order('created_at', { ascending: false }));

      if (error) throw error;
      set({ campaigns: data || [] });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  /** Active campaigns for published products — for share links in store. */
  fetchActiveCampaignsByProducts: async (affiliateId, productIds) => {
    if (!affiliateId || !productIds?.length) {
      set({ campaigns: [] });
      return { success: true, data: [] };
    }
    try {
      const { data, error } = await executeSupabase(() => supabase
        .from('marketing_campaigns')
        .select('*, products(id, name, price, listing_status)')
        .eq('affiliate_id', affiliateId)
        .eq('is_active', true)
        .in('product_id', productIds));

      if (error) throw error;
      const rows = (data || []).filter(
        (c) => (c.products?.listing_status || 'published') === 'published'
      );
      set({ campaigns: rows });
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  createCampaign: async ({ affiliateId, productId, salePrice, slug, page_config }) => {
    set({ isLoading: true });
    try {
      const { data: product, error: pe } = await executeSupabase(() => supabase
        .from('products')
        .select('store_id, price, listing_status')
        .eq('id', productId)
        .single());

      if (pe) throw pe;
      const ls = product.listing_status || 'published';
      if (ls !== 'published') {
        throw new Error('المنتج يجب أن يكون منشوراً لإنشاء رابط بيع');
      }
      const sp = parseFloat(salePrice);
      if (!(sp >= 0) || sp < Number(product.price)) {
        throw new Error('سعر البيع يجب أن يكون أكبر أو يساوي سعر المورد');
      }

      const { data, error } = await executeSupabase(() => supabase
        .from('marketing_campaigns')
        .insert({
          affiliate_id: affiliateId,
          store_id: product.store_id,
          product_id: productId,
          sale_price: sp,
          slug: String(slug || '').trim().toLowerCase(),
          is_active: true,
          page_config: page_config || { template: 'artisan' }
        })
        .select('*, products(id, name, price, image_url, listing_status)')
        .single());

      if (error) throw error;

      set({ campaigns: [data, ...get().campaigns] });
      return { success: true, data };
    } catch (error) {
      if (error.code === '23505') {
        return { success: false, error: 'المعرف مستخدم من قبل، ضع معرفا آخر' };
      }
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  updateCampaign: async (campaignId, { salePrice, slug, page_config, productId }) => {
    set({ isLoading: true });
    try {
      const { data: product, error: pe } = await executeSupabase(() => supabase
        .from('products')
        .select('price')
        .eq('id', productId)
        .single());

      if (pe) throw pe;
      const sp = parseFloat(salePrice);
      if (!(sp >= 0) || sp < Number(product.price)) {
        throw new Error('سعر البيع يجب أن يكون أكبر أو يساوي سعر المورد');
      }

      const { data, error } = await executeSupabase(() => supabase
        .from('marketing_campaigns')
        .update({
          sale_price: sp,
          slug: String(slug || '').trim().toLowerCase(),
          page_config: page_config
        })
        .eq('id', campaignId)
        .select('*, products(id, name, price, image_url, listing_status)')
        .single());

      if (error) throw error;

      set({ campaigns: get().campaigns.map(c => c.id === campaignId ? data : c) });
      return { success: true, data };
    } catch (error) {
      if (error.code === '23505') {
        return { success: false, error: 'المعرف مستخدم من قبل، ضع معرفا آخر' };
      }
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  deleteCampaign: async (campaignId) => {
    set({ isLoading: true });
    try {
      const { error } = await executeSupabase(() => supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', campaignId));

      if (error) throw error;

      set({ campaigns: get().campaigns.filter(c => c.id !== campaignId) });
      return { success: true };
    } catch (error) {
      if (error.code === '23503') {
        return { success: false, error: 'لا يمكن حذف هذه الصفحة لوجود طلبات مسجلة عليها. يرجى توقيفها بدل حذفها.' };
      }
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  setCampaignActive: async (campaignId, isActive) => {
    try {
      const { error } = await executeSupabase(() => supabase
        .from('marketing_campaigns')
        .update({ is_active: isActive })
        .eq('id', campaignId));
      if (error) throw error;
      set({
        campaigns: get().campaigns.map((c) =>
          c.id === campaignId ? { ...c, is_active: isActive } : c
        ),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
}));
