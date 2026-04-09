import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useCampaignStore = create((set, get) => ({
  campaigns: [],
  isLoading: false,

  fetchCampaignsForAffiliate: async (_) => {
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
        .from('marketing_campaigns')
        .select('*, products(id, name, price, image_url, listing_status)')
        .in('affiliate_id', affiliateIds)
        .order('created_at', { ascending: false });

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
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*, products(id, name, price, listing_status)')
        .eq('affiliate_id', affiliateId)
        .eq('is_active', true)
        .in('product_id', productIds);

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

  createCampaign: async ({ affiliateId, productId, salePrice, slug }) => {
    set({ isLoading: true });
    try {
      const { data: product, error: pe } = await supabase
        .from('products')
        .select('store_id, price, listing_status')
        .eq('id', productId)
        .single();
      if (pe) throw pe;
      const ls = product.listing_status || 'published';
      if (ls !== 'published') {
        throw new Error('المنتج يجب أن يكون منشوراً لإنشاء رابط بيع');
      }
      const sp = parseFloat(salePrice);
      if (!(sp >= 0) || sp < Number(product.price)) {
        throw new Error('سعر البيع يجب أن يكون أكبر أو يساوي سعر المورد');
      }

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          affiliate_id: affiliateId,
          store_id: product.store_id,
          product_id: productId,
          sale_price: sp,
          slug: String(slug || '').trim().toLowerCase(),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      set({ campaigns: [data, ...get().campaigns] });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  setCampaignActive: async (campaignId, isActive) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ is_active: isActive })
        .eq('id', campaignId);
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
