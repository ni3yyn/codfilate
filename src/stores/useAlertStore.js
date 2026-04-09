import { create } from 'zustand';

/**
 * Global Alert Store for premium UI-based alerts instead of native browser/system alerts.
 * Works consistently across iOS, Android, and Web.
 */
export const useAlertStore = create((set) => ({
  visible: false,
  title: '',
  message: '',
  type: 'default', // 'default' | 'destructive' | 'success' | 'warning'
  confirmText: 'تأكيد',
  cancelText: 'إلغاء',
  onConfirm: null,
  onCancel: null,

  /**
   * Show a simple informational alert.
   */
  showAlert: ({ title, message, type = 'default', confirmText = 'حسناً', onConfirm = null }) =>
    set({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText: '', // Empty cancel text hiding the cancel button
      onConfirm: () => {
        if (onConfirm) onConfirm();
        set({ visible: false });
      },
      onCancel: () => set({ visible: false }),
    }),

  /**
   * Show a confirmation dialog with two buttons.
   */
  showConfirm: ({
    title,
    message,
    type = 'default',
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    onConfirm,
    onCancel,
  }) =>
    set({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      onConfirm: async () => {
        if (onConfirm) await onConfirm();
        set({ visible: false });
      },
      onCancel: () => {
        if (onCancel) onCancel();
        set({ visible: false });
      },
    }),

  /**
   * Close the alert manually.
   */
  hideAlert: () => set({ visible: false }),
}));
