// Import Platform only at top level (Safe)
import { Platform } from 'react-native';

/**
 * Advanced Security Shield for Codfilate 
 * (STB-3: Lazy Initialization for stability)
 */
export const securityShield = {
  _deviceModule: null,

  async _getDevice() {
    if (this._deviceModule) return this._deviceModule;
    try {
      // Lazy import to prevent top-level native mismatch crashes
      this._deviceModule = require('expo-device');
      return this._deviceModule;
    } catch (e) {
      console.warn('[Security] expo-device not found in binary');
      return null;
    }
  },
  /**
   * Performs a comprehensive security check of the device environment.
   * Returns a report with any detected threats.
   */
  async checkEnvironment() {
    // In development mode, we skip security checks to allow the developer to work
    if (__DEV__) {
      return { isSecure: true, threats: [] };
    }

    const Device = await this._getDevice();
    const threats = [];

    try {
      // 1. Root/Jailbreak Detection
      if (Device) {
        const isRooted = await Device.isRootedExperimentalAsync();
        if (isRooted) {
          threats.push('COMPROMISED_OS');
        }

        // 2. Emulator Detection (Optional but recommended for anti-reversing)
        if (!Device.isDevice && Platform.OS !== 'web') {
          threats.push('EMULATOR_DETECTED');
        }
      }

      // 3. Debugger Detection
      const isDebuggerAttached = this._isDebuggerActive();
      if (isDebuggerAttached) {
        threats.push('DEBUGGER_ATTACHED');
      }

    } catch (error) {
      console.warn('[Security] Check failed:', error);
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
