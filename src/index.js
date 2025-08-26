/**
 * @module @vorthain/tab-safe-timers
 * @description Web Worker-powered timer functions that continue running accurately when browser tabs are in the background
 * @author Vorthain
 * @license MIT
 */

// Embedded worker code as a string
const WORKER_CODE = `
const intervalMap = new Map();
const timeoutMap = new Map();

self.onmessage = function (e) {
  const { command, id, delay } = e.data;

  switch (command) {
    case 'setInterval': {
      const intervalId = self.setInterval(() => {
        self.postMessage({ type: 'tick', id: id });
      }, delay);
      intervalMap.set(id, intervalId);
      break;
    }

    case 'setTimeout': {
      const timeoutId = self.setTimeout(() => {
        self.postMessage({ type: 'tick', id: id });
        timeoutMap.delete(id);
      }, delay);
      timeoutMap.set(id, timeoutId);
      break;
    }

    case 'clearInterval': {
      const intervalId = intervalMap.get(id);
      if (intervalId) {
        self.clearInterval(intervalId);
        intervalMap.delete(id);
      }
      break;
    }

    case 'clearTimeout': {
      const timeoutId = timeoutMap.get(id);
      if (timeoutId) {
        self.clearTimeout(timeoutId);
        timeoutMap.delete(id);
      }
      break;
    }
  }
};
`;

/**
 * @class TabSafeTimers
 * @description Manages Web Worker-based timers that bypass background tab throttling
 */
class TabSafeTimers {
  constructor() {
    /** @type {boolean} */
    this.isInitialized = false;
    /** @type {Worker|null} */
    this.worker = null;
    /** @type {string|null} */
    this.workerUrl = null;
    /** @type {Map<number, {type: string, callback: Function, args: any[], delay: number}>} */
    this.callbacks = new Map();
    /** @type {number} */
    this.idCounter = 0;
    /** @type {{setInterval: Function, setTimeout: Function, clearInterval: Function, clearTimeout: Function}|null} */
    this.native = null;
  }

  /**
   * Initialize the tab-safe timers system
   * @returns {boolean} Success status
   * @throws {Error} When not in browser environment or Workers not supported
   */
  init() {
    if (this.isInitialized) {
      return false;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error('[TabSafeTimers] Not running in a browser environment or Web Workers not supported');
    }

    // Store native timer functions
    this.native = {
      setInterval: window.setInterval.bind(window),
      setTimeout: window.setTimeout.bind(window),
      clearInterval: window.clearInterval.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
    };

    // Create Web Worker from embedded code
    try {
      const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
      this.workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(this.workerUrl);
    } catch (error) {
      // Try fallback for stricter CSP environments
      try {
        const dataUrl = `data:application/javascript;base64,${btoa(WORKER_CODE)}`;
        this.worker = new Worker(dataUrl);
      } catch (fallbackError) {
        throw new Error('[TabSafeTimers] Failed to create worker: ' + fallbackError.message);
      }
    }

    // Set up worker message handler
    this.worker.onmessage = (e) => {
      const { type, id } = e.data;
      if (type === 'tick') {
        const callbackData = this.callbacks.get(id);
        if (callbackData) {
          try {
            callbackData.callback(...callbackData.args);
          } catch (error) {
            console.error('[TabSafeTimers] Error in timer callback:', error);
          }

          // Remove one-time timeouts
          if (callbackData.type === 'timeout') {
            this.callbacks.delete(id);
          }
        }
      }
    };

    this.worker.onerror = (error) => {
      console.error('[TabSafeTimers] Worker error:', error);
    };

    // Override global timer functions
    this.overrideGlobalTimers();

    this.isInitialized = true;
    return true;
  }

  /**
   * Override the global timer functions
   * @private
   */
  overrideGlobalTimers() {
    const self = this;

    /**
     * @param {Function} callback - Function to execute
     * @param {number} [delay=0] - Delay in milliseconds
     * @param {...any} args - Arguments to pass to callback
     * @returns {number} Timer ID
     */
    window.setInterval = function (callback, delay = 0, ...args) {
      if (!self.isInitialized) {
        return self.native.setInterval(callback, delay, ...args);
      }

      // Validate inputs
      if (typeof callback !== 'function') {
        throw new TypeError('Callback must be a function');
      }

      // Sanitize delay value
      const sanitizedDelay = Math.max(0, parseInt(delay) || 0);

      const id = ++self.idCounter;
      self.callbacks.set(id, {
        type: 'interval',
        callback,
        args,
        delay: sanitizedDelay,
      });
      self.worker.postMessage({
        command: 'setInterval',
        id,
        delay: sanitizedDelay,
      });
      return id;
    };

    /**
     * @param {Function} callback - Function to execute
     * @param {number} [delay=0] - Delay in milliseconds
     * @param {...any} args - Arguments to pass to callback
     * @returns {number} Timer ID
     */
    window.setTimeout = function (callback, delay = 0, ...args) {
      if (!self.isInitialized) {
        return self.native.setTimeout(callback, delay, ...args);
      }

      // Validate inputs
      if (typeof callback !== 'function') {
        throw new TypeError('Callback must be a function');
      }

      // Sanitize delay value
      const sanitizedDelay = Math.max(0, parseInt(delay) || 0);

      const id = ++self.idCounter;
      self.callbacks.set(id, {
        type: 'timeout',
        callback,
        args,
        delay: sanitizedDelay,
      });
      self.worker.postMessage({
        command: 'setTimeout',
        id,
        delay: sanitizedDelay,
      });
      return id;
    };

    /**
     * @param {number} id - Timer ID to clear
     */
    window.clearInterval = function (id) {
      if (!self.isInitialized) {
        return self.native.clearInterval(id);
      }

      if (self.callbacks.has(id)) {
        self.callbacks.delete(id);
        self.worker.postMessage({ command: 'clearInterval', id });
      } else {
        // Fallback for native timer IDs
        self.native.clearInterval(id);
      }
    };

    /**
     * @param {number} id - Timer ID to clear
     */
    window.clearTimeout = function (id) {
      if (!self.isInitialized) {
        return self.native.clearTimeout(id);
      }

      if (self.callbacks.has(id)) {
        self.callbacks.delete(id);
        self.worker.postMessage({ command: 'clearTimeout', id });
      } else {
        // Fallback for native timer IDs
        self.native.clearTimeout(id);
      }
    };
  }

  /**
   * Destroy the tab-safe timers system and restore native functions
   */
  destroy() {
    if (!this.isInitialized) {
      return;
    }

    // Restore native timer functions
    if (this.native) {
      window.setInterval = this.native.setInterval;
      window.setTimeout = this.native.setTimeout;
      window.clearInterval = this.native.clearInterval;
      window.clearTimeout = this.native.clearTimeout;
    }

    // Clear all active timers
    for (const id of this.callbacks.keys()) {
      this.worker.postMessage({ command: 'clearInterval', id });
    }
    this.callbacks.clear();

    // Terminate worker and clean up
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Clean up Blob URL if it was created
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }

    this.isInitialized = false;
  }
}

// Singleton instance
let instance = null;

/**
 * Initialize tab-safe timers
 * @returns {TabSafeTimers} The TabSafeTimers instance
 * @throws {Error} If initialization fails
 * @example
 * // Basic usage
 * import { initTabSafeTimers } from '@vorthain/tab-safe-timers';
 *
 * initTabSafeTimers();
 *
 * setInterval(() => {
 *   console.log('This runs every second, even in background tabs!');
 * }, 1000);
 */
export function initTabSafeTimers() {
  if (!instance) {
    instance = new TabSafeTimers();
    const success = instance.init();
    if (!success) {
      instance = null;
      throw new Error('Failed to initialize TabSafeTimers');
    }
  }
  return instance;
}

/**
 * Destroy the tab-safe timers system
 * @example
 * import { destroyTabSafeTimers } from '@vorthain/tab-safe-timers';
 *
 * // Cleanup when done
 * destroyTabSafeTimers();
 */
export function destroyTabSafeTimers() {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}

/**
 * Get the current TabSafeTimers instance
 * @returns {TabSafeTimers|null} Current instance or null if not initialized
 * @example
 * import { getTabSafeTimers } from '@vorthain/tab-safe-timers';
 *
 * const timers = getTabSafeTimers();
 * if (timers) {
 *   console.log('Tab-safe timers are active');
 * }
 */
export function getTabSafeTimers() {
  return instance;
}

// Default export
export default initTabSafeTimers;
