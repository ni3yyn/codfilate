import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useCategoryStore = create((set, get) => ({
  categories: [],
  subcategories: [],
  isLoading: false,
  error: null,

  // ──────────────── CATEGORIES ────────────────

  /**
   * Fetch all global categories (platform-wide).
   * If storeId is provided, still returns all categories
   * (since categories are now global), but the caller can
   * filter to only those with products in their store.
   */
  fetchCategories: async (storeId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*, subcategories(*)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Extract flat subcategory list too
      const allSubs = (data || []).flatMap((cat) =>
        (cat.subcategories || []).map((sub) => ({ ...sub, category_name: cat.name }))
      );

      set({ categories: data || [], subcategories: allSubs, isLoading: false });
      return { success: true, data };
    } catch (err) {
      if (__DEV__) console.error('[CategoryStore] fetchCategories error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  /**
   * Create or find a global category using the atomic upsert RPC.
   * Prevents duplicate categories and handles Arabic synonyms.
   * Returns the category ID (existing or newly created).
   */
  createCategory: async (categoryData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('upsert_global_category', {
        p_name: categoryData.name.trim(),
        p_icon: categoryData.icon || 'grid-outline',
      });

      if (error) throw error;

      // data is the UUID of the category (existing or new)
      const categoryId = data;

      // Fetch the full category to update local state
      const { data: fullCat, error: fetchError } = await supabase
        .from('categories')
        .select('*, subcategories(*)')
        .eq('id', categoryId)
        .single();

      if (fetchError) throw fetchError;

      // Add to local state if not already present, update if present
      set((state) => {
        const exists = state.categories.some((c) => c.id === categoryId);
        if (exists) {
          return {
            categories: state.categories.map((c) =>
              c.id === categoryId ? { ...c, ...fullCat } : c
            ),
            isLoading: false,
          };
        }
        return {
          categories: [...state.categories, fullCat],
          isLoading: false,
        };
      });

      return { success: true, data: fullCat, isExisting: get().categories.some(c => c.id === categoryId && c !== fullCat) };
    } catch (err) {
      if (__DEV__) console.error('[CategoryStore] createCategory error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  updateCategory: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === id ? { ...c, ...data } : c
        ),
        isLoading: false,
      }));
      return { success: true, data };
    } catch (err) {
      if (__DEV__) console.error('[CategoryStore] updateCategory error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;

      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        subcategories: state.subcategories.filter((s) => s.category_id !== id),
        isLoading: false,
      }));
      return { success: true };
    } catch (err) {
      if (__DEV__) console.error('[CategoryStore] deleteCategory error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  reorderCategories: async (storeId, orderedIds) => {
    try {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('categories')
          .update({ sort_order: index })
          .eq('id', id)
      );
      await Promise.all(updates);

      // Refresh
      await get().fetchCategories(storeId);
      return { success: true };
    } catch (err) {
      if (__DEV__) console.error('[CategoryStore] reorderCategories error:', err);
      return { success: false, error: err.message };
    }
  },

  // ──────────────── SUBCATEGORIES ────────────────

  /**
   * Create or find a global subcategory using the atomic upsert RPC.
   * Prevents duplicate subcategories within a category.
   */
  createSubcategory: async (subcategoryData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('upsert_global_subcategory', {
        p_category_id: subcategoryData.category_id,
        p_name: subcategoryData.name.trim(),
        p_icon: subcategoryData.icon || 'ellipse-outline',
      });

      if (error) throw error;

      const subcategoryId = data;

      // Fetch the full subcategory
      const { data: fullSub, error: fetchError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('id', subcategoryId)
        .single();

      if (fetchError) throw fetchError;

      // Add to parent category's subcategories if not already present
      set((state) => ({
        categories: state.categories.map((c) => {
          if (c.id === subcategoryData.category_id) {
            const exists = (c.subcategories || []).some((s) => s.id === subcategoryId);
            if (exists) return c;
            return { ...c, subcategories: [...(c.subcategories || []), fullSub] };
          }
          return c;
        }),
        subcategories: state.subcategories.some((s) => s.id === subcategoryId)
          ? state.subcategories
          : [...state.subcategories, fullSub],
        isLoading: false,
      }));
      return { success: true, data: fullSub };
    } catch (err) {
      if (__DEV__) console.error('[CategoryStore] createSubcategory error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  updateSubcategory: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        categories: state.categories.map((c) => ({
          ...c,
          subcategories: (c.subcategories || []).map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        })),
        subcategories: state.subcategories.map((s) =>
          s.id === id ? { ...s, ...data } : s
        ),
        isLoading: false,
      }));
      return { success: true, data };
    } catch (err) {
      if (__DEV__) console.error('[CategoryStore] updateSubcategory error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  deleteSubcategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('subcategories').delete().eq('id', id);
      if (error) throw error;

      set((state) => ({
        categories: state.categories.map((c) => ({
          ...c,
          subcategories: (c.subcategories || []).filter((s) => s.id !== id),
        })),
        subcategories: state.subcategories.filter((s) => s.id !== id),
        isLoading: false,
      }));
      return { success: true };
    } catch (err) {
      if (__DEV__) console.error('[CategoryStore] deleteSubcategory error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  // ──────────────── SEARCH / AUTOCOMPLETE ────────────────

  /**
   * Search existing categories by name for autocomplete.
   * Client-side fuzzy search over already-fetched categories.
   */
  searchCategories: (query) => {
    if (!query || query.trim().length === 0) return get().categories;
    const q = query.trim().toLowerCase();
    return get().categories.filter((cat) =>
      cat.name.toLowerCase().includes(q) ||
      (cat.name_ar && cat.name_ar.toLowerCase().includes(q))
    );
  },

  /**
   * Search subcategories within a category for autocomplete.
   */
  searchSubcategories: (categoryId, query) => {
    const cat = get().categories.find((c) => c.id === categoryId);
    if (!cat) return [];
    const subs = cat.subcategories || [];
    if (!query || query.trim().length === 0) return subs;
    const q = query.trim().toLowerCase();
    return subs.filter((sub) =>
      sub.name.toLowerCase().includes(q) ||
      (sub.name_ar && sub.name_ar.toLowerCase().includes(q))
    );
  },
}));
