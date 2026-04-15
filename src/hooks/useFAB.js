import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useFABStore } from '../stores/useFABStore';

/**
 * useFAB — Screen-level FAB registration hook.
 *
 * Designed symmetrically to handle React Navigation focus race conditions. 
 * Prevents a blurring screen from clearing the FAB if a focusing screen already claimed it.
 *
 * Usage:
 *   useFAB({
 *     icon: 'add',
 *     label: 'إضافة منتج',
 *     onPress: () => setShowForm(true),
 *     visible: !showForm,
 *   });
 */
export function useFAB({ icon = 'add', label = '', onPress = null, visible = true }) {
  const setFAB = useFABStore((s) => s.setFAB);
  const clearFAB = useFABStore((s) => s.clearFAB);
  const isFocused = useIsFocused();
  
  // Create a unique owner ID for this specific hook instance mounting on this screen
  const hookId = useRef(Math.random().toString(36).substring(7)).current;

  useEffect(() => {
    // Only register or update the FAB if THIS screen is actively focused!
    // And only if it explicitly wants to be visible.
    if (isFocused) {
      if (visible) {
        setFAB(hookId, { icon, label, onPress, visible: true });
      } else {
        // If visible is dynamically set to false while focused, clear it for our owner ID
        clearFAB(hookId);
      }
      
      // Cleanup: When the screen loses focus (isFocused = false) OR unmounts,
      // attempt to clear the FAB. The Zustand store will SAFELY ignore this action
      // if another screen has already claimed ownership during the transition out.
      return () => {
        clearFAB(hookId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, icon, label, onPress, visible]); // Do not include hookId as it never mutates
}
