import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useCategoryStore = create((set, get) => ({
  categories: [],
  subcategories: [],
  isLoading: false,
  error: null,

  // ──────────────── CATEGORIES ────────────────

  fetchCategories: async (storeId) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('categories')
        .select('*, subcategories(*)');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query.order('sort_order', { ascending: true });

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

  createCategory: async (categoryData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        categories: [...state.categories, { ...data, subcategories: [] }],
        isLoading: false,
      }));
      return { success: true, data };
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

  createSubcategory: async (subcategoryData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .insert(subcategoryData)
        .select()
        .single();

      if (error) throw error;

      // Add to parent category's subcategories
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === subcategoryData.category_id
            ? { ...c, subcategories: [...(c.subcategories || []), data] }
            : c
        ),
        subcategories: [...state.subcategories, data],
        isLoading: false,
      }));
      return { success: true, data };
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
}));
