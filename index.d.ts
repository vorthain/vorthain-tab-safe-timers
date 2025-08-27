/**
 * @module @vorthain/tab-safe-timers
 * @description Web Worker-powered timer functions that continue running accurately when browser tabs are in the background
 * @author Vorthain
 * @license MIT
 */

/**
 * TabSafeTimers class that manages Web Worker-based timers
 */
export class TabSafeTimers {
  isInitialized: boolean;
  init(): boolean;
  destroy(): void;
}

/**
 * Initialize tab-safe timers
 * @returns The TabSafeTimers instance
 * @throws Error if initialization fails
 * @example
 * ```javascript
 * import { initTabSafeTimers } from '@vorthain/tab-safe-timers';
 *
 * initTabSafeTimers();
 *
 * setInterval(() => {
 *   console.log('This runs every second, even in background tabs!');
 * }, 1000);
 * ```
 */
export function initTabSafeTimers(): TabSafeTimers;

/**
 * Destroy the tab-safe timers system
 * @example
 * ```javascript
 * import { destroyTabSafeTimers } from '@vorthain/tab-safe-timers';
 *
 * // Cleanup when done
 * destroyTabSafeTimers();
 * ```
 */
export function destroyTabSafeTimers(): void;

/**
 * Get the current TabSafeTimers instance
 * @returns Current instance or null if not initialized
 * @example
 * ```javascript
 * import { getTabSafeTimers } from '@vorthain/tab-safe-timers';
 *
 * const timers = getTabSafeTimers();
 * if (timers) {
 *   console.log('Tab-safe timers are active');
 * }
 * ```
 */
export function getTabSafeTimers(): TabSafeTimers | null;

export default initTabSafeTimers;
