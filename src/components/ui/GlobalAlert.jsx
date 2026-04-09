import React from 'react';
import { useAlertStore } from '../../stores/useAlertStore';
import CustomAlert from './CustomAlert';

/**
 * A global singleton component that renders the Current Alert from the store.
 * Place this at the root of your application in app/_layout.js.
 */
export default function GlobalAlert() {
  const { visible, title, message, type, confirmText, cancelText, onConfirm, onCancel } = useAlertStore();

  if (!visible) return null;

  return (
    <CustomAlert
      visible={visible}
      title={title}
      message={message}
      type={type}
      confirmText={confirmText}
      cancelText={cancelText}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
