import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';
import { SELF_REGISTRATION_ROLES } from '../lib/roleRouter';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  _profileFetchPromise: null,

  initialize: async () => {
    try {
      // 1. Set up the listener first so we don't miss any events during boot
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (__DEV__) console.log(`🔔 [Auth] Event: ${event}`);
        
        if (session) {
          set({ session, user: session.user, isAuthenticated: true });
          await get().fetchProfile();
        } else {
          // Reset state on sign out or if session is missing
          set({ session: null, user: null, profile: null, isAuthenticated: false });
        }
        
        // Ensure loading is false after the first event or if we have an initial state
        set({ isLoading: false });
      });

      // 2. Get initial session once
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (session) {
        set({ session, user: session.user, isAuthenticated: true });
        await get().fetchProfile();
      }
    } catch (error) {
      if (__DEV__) {
        // Suppress "Lock broken" errors in dev as they are often non-fatal tab synchronization noise
        if (error.message?.includes('Lock broken')) {
          console.warn('Auth init: Lock synchronization in progress');
        } else {
          console.error('Auth init error:', error);
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    // Deduplicate concurrent profile fetches
    if (get()._profileFetchPromise) return get()._profileFetchPromise;

    const fetchTask = (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('*, wilayas(id, name, name_fr, code)')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          set({ profile: null });
          return;
        }

        let finalProfile = { ...data };
        
        // Parse assigned_wilayas from JSONB to array of ints
        if (finalProfile.assigned_wilayas && typeof finalProfile.assigned_wilayas === 'string') {
          try { finalProfile.assigned_wilayas = JSON.parse(finalProfile.assigned_wilayas); } catch (e) {}
        }
        if (!Array.isArray(finalProfile.assigned_wilayas)) {
          finalProfile.assigned_wilayas = [];
        }
        finalProfile.assigned_wilayas = finalProfile.assigned_wilayas
          .map(id => typeof id === 'string' ? parseInt(id, 10) : id)
          .filter(Boolean);
        
        if (finalProfile.wilaya_id && !finalProfile.assigned_wilayas.includes(finalProfile.wilaya_id)) {
          finalProfile.assigned_wilayas.push(finalProfile.wilaya_id);
        }

        if (finalProfile.role === 'merchant') {
          try {
            const { data: storeData } = await supabase
              .from('stores')
              .select('id')
              .eq('owner_id', user.id)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();
              
            if (storeData?.id) {
              finalProfile.store_id = storeData.id;
            }
          } catch (e) {}
        }

        set({ profile: finalProfile });
      } catch (error) {
        if (__DEV__) console.error('Fetch profile error:', error);
      } finally {
        set({ _profileFetchPromise: null });
      }
    })();

    set({ _profileFetchPromise: fetchTask });
    return fetchTask;
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      if (data.session) {
        set({ session: data.session, user: data.user, isAuthenticated: true });
        await get().fetchProfile();
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, role = 'affiliate', fullName = '', phone = '', wilayaId = null) => {
    set({ isLoading: true });
    try {
      // SEC-1: Enforce role whitelist — only affiliate and merchant allowed
      const safeRole = SELF_REGISTRATION_ROLES.includes(role) ? role : 'affiliate';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: safeRole,
            full_name: fullName,
            phone: phone,
            wilaya_id: wilayaId,
            onboarding_completed: false,
          },
        },
      });
      if (error) throw error;

      // If email confirmation is enabled, data.session will be null.
      if (data.user && data.session) {
        set({ session: data.session, user: data.user, isAuthenticated: true });
        await get().fetchProfile();
      } else if (data.user && !data.session) {
        // Handle Email Confirmation Flow
        Alert.alert(
          'تأكيد البريد الإلكتروني',
          'تم إنشاء حسابك! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.',
          [{ text: 'حسناً' }]
        );
        return { success: true, requiresVerification: true };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, profile: null, session: null, isAuthenticated: false });
    } catch (error) {
      if (__DEV__) console.error('Sign out error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    try {
      const profile = get().profile;
      if (!profile) return { success: false, error: 'No profile found' };

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      set({ profile: { ...get().profile, ...data } });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
}));
