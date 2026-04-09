import * as Device from 'expo-device';
import { Platform, NativeModules } from 'react-native';

/**
 * Advanced Security Shield for Codfilate
 * Implements anti-debugging, root detection, and environment hardening.
 */
export const securityShield = {
  /**
   * Performs a comprehensive security check of the device environment.
   * Returns a report with any detected threats.
   */
  async checkEnvironment() {
    // In development mode, we skip security checks to allow the developer to work
    if (__DEV__) {
      return { isSecure: true, threats: [] };
    }

    const threats = [];

    try {
      // 1. Root/Jailbreak Detection (Using expo-device)
      const isRooted = await Device.isRootedExperimentalAsync();
      if (isRooted) {
        threats.push('COMPROMISED_OS'); // Device is rooted or jailbroken
      }

      // 2. Debugger Detection
      // We check if a debugger is attached via NativeModules or global state
      const isDebuggerAttached = this._isDebuggerActive();
      if (isDebuggerAttached) {
        threats.push('DEBUGGER_ATTACHED');
      }

      // 3. Emulator Detection (Optional but recommended for anti-reversing)
      // Most reverse engineering starts in an emulator.
      if (!Device.isDevice && Platform.OS !== 'web') {
        threats.push('EMULATOR_DETECTED');
      }

    } catch (error) {
      console.warn('[Security] Check failed:', error);
      // In high-security apps, we might fail-closed here, 
      // but for an MVP we'll just log and continue unless a threat is confirmed.
    }

    return {
      isSecure: threats.length === 0,
      threats,
    };
  },

  /**
   * Internal helper to detect if a JS debugger is active.
   */
  _isDebuggerActive() {
    // Basic check for JS debugger attached
    return (
      global.nativeCallSyncHook !== undefined || 
      (typeof Atomics !== 'undefined' && Atomics.wait === undefined) ||
      (typeof __REMOTEDEV__ !== 'undefined')
    );
  }
};
