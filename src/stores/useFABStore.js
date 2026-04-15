import { create } from 'zustand';

/**
 * Universal FAB Store
 * Screens register their FAB configuration here via the useFAB() hook.
 * The UniversalFAB component in each role layout reads from this store.
 */
export const useFABStore = create((set) => ({
  ownerId: null, // Track which screen currently owns the FAB
  icon: 'add',
  label: '',
  onPress: null,
  visible: false,

  // Called by useFAB() hook to register a screen's FAB
  setFAB: (ownerId, { icon = 'add', label = '', onPress = null, visible = true }) =>
    set({ ownerId, icon, label, onPress, visible }),

  // Called by useFAB() cleanup. ONLY clears if the screen asking is still active.
  clearFAB: (ownerId) =>
    set((state) => {
      if (state.ownerId === ownerId) {
        return { ownerId: null, icon: 'add', label: '', onPress: null, visible: false };
      }
      return state; // Another screen already took ownership, do not clear!
    }),
}));
