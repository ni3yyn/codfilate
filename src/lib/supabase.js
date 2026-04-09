import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { appConfig } from './appConfig';

// Guard credentials to prevent top-level crash in production builds if config is missing
const supabaseUrl = appConfig.supabase.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = appConfig.supabase.anonKey || 'placeholder';

if (!appConfig.supabase.url || !appConfig.supabase.anonKey) {
  // We use warn instead of error to prevent some crash reporting tools from killing the app
  console.warn('[Supabase] Missing credentials in customer config.');
}

const customStorage = Platform.OS === 'web' ? {
  getItem: (key) => {
    try { return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null; } catch (e) { return null; }
  },
  setItem: (key, value) => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); } catch (e) {}
  },
  removeItem: (key) => {
    try { if (typeof window !== 'undefined') window.localStorage.removeItem(key); } catch (e) {}
  }
} : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
