import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { PAGINATION_LIMIT } from '../lib/constants';

export const useProductStore = create((set, get) => ({
  products: [],
  currentProduct: null,
  isLoading: false,
  hasMore: true,

  fetchProducts: async (storeId, page = 0) => {
    set({ isLoading: true });
    try {
      const from = page * PAGINATION_LIMIT;
      const to = from + PAGINATION_LIMIT - 1;

      let query = supabase
        .from('products')
        .select('*, category:categories(id, name, icon), subcategory:subcategories(id, name, icon), product_images(*)')
        .eq('is_active', true);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const visible = data || [];
      const newProducts = page === 0 ? visible : [...get().products, ...visible];
      set({
        products: newProducts,
        hasMore: (data || []).length === PAGINATION_LIMIT,
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAllStoreProducts: async (storeId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(id, name, icon), subcategory:subcategories(id, name, icon), product_images(*)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ products: data || [] });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProductsByCategory: async (storeId, categoryId) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('products')
        .select('*, category:categories(id, name, icon), subcategory:subcategories(id, name, icon), product_images(*)')
        .eq('category_id', categoryId)
        .eq('is_active', true);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      const visible = data || [];
      set({ products: visible });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProduct: async (productId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(id, name, icon), subcategory:subcategories(id, name, icon), product_images(*)')
        .eq('id', productId)
        .single();

      if (error) throw error;
      set({ currentProduct: data });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  createProduct: async (productData) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      set({ products: [data, ...get().products] });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  updateProduct: async (productId, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      set({
        products: get().products.map((p) => (p.id === productId ? { ...p, ...data } : p)),
        currentProduct: data,
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProduct: async (productId) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;
      set({ products: get().products.filter((p) => p.id !== productId) });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  // ──────────────── IMAGE MANAGEMENT ────────────────

  uploadProductImage: async (uri, storeId) => {
    try {
      const fileName = `${storeId}/product-${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      return { success: true, url: publicUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Add an image to the product_images gallery table
   */
  addProductImage: async (productId, storeId, imageUrl, sortOrder = 0) => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .insert({ product_id: productId, store_id: storeId, image_url: imageUrl, sort_order: sortOrder })
        .select()
        .single();

      if (error) throw error;

      // Update local product's image list
      set((state) => ({
        products: state.products.map((p) =>
          p.id === productId
            ? { ...p, product_images: [...(p.product_images || []), data] }
            : p
        ),
      }));
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Remove an image from the product_images gallery table
   */
  removeProductImage: async (imageId, productId) => {
    try {
      const { error } = await supabase.from('product_images').delete().eq('id', imageId);
      if (error) throw error;

      set((state) => ({
        products: state.products.map((p) =>
          p.id === productId
            ? { ...p, product_images: (p.product_images || []).filter((img) => img.id !== imageId) }
            : p
        ),
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
}));
