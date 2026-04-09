import { create } from 'zustand';
import { Appearance } from 'react-native';

export const useThemeStore = create((set, get) => ({
  mode: 'light',
  storeTheme: null,

  toggleMode: () => {
    const newMode = get().mode === 'dark' ? 'light' : 'dark';
    set({ mode: newMode });
  },

  setMode: (mode) => {
    set({ mode });
  },

  setStoreTheme: (store) => {
    if (!store) {
      set({ storeTheme: null });
      return;
    }
    set({
      storeTheme: {
        primary: store.primary_color || '#6C5CE7',
        secondary: store.secondary_color || '#A29BFE',
        accent: store.accent_color || '#00CEC9',
      },
    });
  },

  isDark: () => get().mode === 'dark',
}));
