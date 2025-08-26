/**
 * @jest-environment jsdom
 */

import { initTabSafeTimers, destroyTabSafeTimers, getTabSafeTimers } from './index.js';

describe('TabSafeTimers', () => {
  let originalSetTimeout;
  let originalSetInterval;
  let originalClearTimeout;
  let originalClearInterval;

  beforeEach(() => {
    // Store originals
    originalSetTimeout = window.setTimeout;
    originalSetInterval = window.setInterval;
    originalClearTimeout = window.clearTimeout;
    originalClearInterval = window.clearInterval;
  });

  afterEach(() => {
    // Clean up after each test
    destroyTabSafeTimers();

    // Restore originals
    window.setTimeout = originalSetTimeout;
    window.setInterval = originalSetInterval;
    window.clearTimeout = originalClearTimeout;
    window.clearInterval = originalClearInterval;
  });

  describe('Module exports', () => {
    test('exports required functions', () => {
      expect(typeof initTabSafeTimers).toBe('function');
      expect(typeof destroyTabSafeTimers).toBe('function');
      expect(typeof getTabSafeTimers).toBe('function');
    });
  });

  describe('Initialization', () => {
    test('initializes successfully in jsdom environment', () => {
      const instance = initTabSafeTimers();
      expect(instance).toBeTruthy();
      expect(getTabSafeTimers()).toBe(instance);
    });

    test('returns same instance on multiple init calls', () => {
      const instance1 = initTabSafeTimers();
      const instance2 = initTabSafeTimers();
      expect(instance1).toBe(instance2);
    });

    test('creates worker with blob URL', () => {
      initTabSafeTimers();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('returns false when trying to init already initialized instance', () => {
      const instance = initTabSafeTimers();
      // Try to init again through the instance method
      const result = instance.init();
      expect(result).toBe(false);
    });
  });

  describe('Global timer override', () => {
    test('overrides global timer functions', () => {
      initTabSafeTimers();
      expect(window.setTimeout).not.toBe(originalSetTimeout);
      expect(window.setInterval).not.toBe(originalSetInterval);
      expect(window.clearTimeout).not.toBe(originalClearTimeout);
      expect(window.clearInterval).not.toBe(originalClearInterval);
    });

    test('restores native timers on destroy', () => {
      initTabSafeTimers();
      const instance = getTabSafeTimers();

      // Store the native functions that were saved
      const savedNativeTimeout = instance.native.setTimeout;
      const savedNativeInterval = instance.native.setInterval;

      destroyTabSafeTimers();

      // Check that window functions are now the saved native ones
      expect(window.setTimeout).toBe(savedNativeTimeout);
      expect(window.setInterval).toBe(savedNativeInterval);
    });
  });

  describe('Timer functionality', () => {
    test('setTimeout validates callback type', () => {
      initTabSafeTimers();
      expect(() => {
        window.setTimeout('not a function', 100);
      }).toThrow(TypeError);
    });

    test('setInterval validates callback type', () => {
      initTabSafeTimers();
      expect(() => {
        window.setInterval(42, 100);
      }).toThrow(TypeError);
    });

    test('setTimeout handles negative delays', () => {
      initTabSafeTimers();
      const callback = jest.fn();
      const id = window.setTimeout(callback, -100);
      expect(id).toBeGreaterThan(0);
      // Worker should receive delay of 0
      const instance = getTabSafeTimers();
      expect(instance.worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ delay: 0 }));
    });

    test('setInterval handles non-numeric delays', () => {
      initTabSafeTimers();
      const callback = jest.fn();
      const id = window.setInterval(callback, 'abc');
      expect(id).toBeGreaterThan(0);
      // Worker should receive delay of 0
      const instance = getTabSafeTimers();
      expect(instance.worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ delay: 0 }));
    });

    test('setTimeout returns unique timer IDs', () => {
      initTabSafeTimers();
      const callback = jest.fn();
      const id1 = window.setTimeout(callback, 100);
      const id2 = window.setTimeout(callback, 100);
      expect(id1).not.toBe(id2);
    });

    test('setInterval returns unique timer IDs', () => {
      initTabSafeTimers();
      const callback = jest.fn();
      const id1 = window.setInterval(callback, 100);
      const id2 = window.setInterval(callback, 100);
      expect(id1).not.toBe(id2);
    });

    test('clearTimeout removes callback from map', () => {
      initTabSafeTimers();
      const callback = jest.fn();
      const id = window.setTimeout(callback, 100);
      const instance = getTabSafeTimers();
      expect(instance.callbacks.has(id)).toBe(true);
      window.clearTimeout(id);
      expect(instance.callbacks.has(id)).toBe(false);
    });

    test('clearInterval removes callback from map', () => {
      initTabSafeTimers();
      const callback = jest.fn();
      const id = window.setInterval(callback, 100);
      const instance = getTabSafeTimers();
      expect(instance.callbacks.has(id)).toBe(true);
      window.clearInterval(id);
      expect(instance.callbacks.has(id)).toBe(false);
    });
  });

  describe('Worker communication', () => {
    test('sends setInterval command to worker', () => {
      initTabSafeTimers();
      const callback = jest.fn();
      const id = window.setInterval(callback, 1000);
      const instance = getTabSafeTimers();
      expect(instance.worker.postMessage).toHaveBeenCalledWith({
        command: 'setInterval',
        id,
        delay: 1000,
      });
    });

    test('sends setTimeout command to worker', () => {
      initTabSafeTimers();
      const callback = jest.fn();
      const id = window.setTimeout(callback, 500);
      const instance = getTabSafeTimers();
      expect(instance.worker.postMessage).toHaveBeenCalledWith({
        command: 'setTimeout',
        id,
        delay: 500,
      });
    });

    test('sends clearInterval command to worker', () => {
      initTabSafeTimers();
      const callback = jest.fn();
      const id = window.setInterval(callback, 100);
      const instance = getTabSafeTimers();
      instance.worker.postMessage.mockClear();
      window.clearInterval(id);
      expect(instance.worker.postMessage).toHaveBeenCalledWith({
        command: 'clearInterval',
        id,
      });
    });

    test('sends clearTimeout command to worker', () => {
      initTabSafeTimers();
      const callback = jest.fn();
      const id = window.setTimeout(callback, 100);
      const instance = getTabSafeTimers();
      instance.worker.postMessage.mockClear();
      window.clearTimeout(id);
      expect(instance.worker.postMessage).toHaveBeenCalledWith({
        command: 'clearTimeout',
        id,
      });
    });
  });

  describe('Cleanup', () => {
    test('returns null when not initialized', () => {
      expect(getTabSafeTimers()).toBe(null);
    });

    test('cleans up worker on destroy', () => {
      const instance = initTabSafeTimers();
      const terminateSpy = instance.worker.terminate;
      destroyTabSafeTimers();
      expect(terminateSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    test('clears all callbacks on destroy', () => {
      initTabSafeTimers();
      const instance = getTabSafeTimers();
      window.setTimeout(jest.fn(), 100);
      window.setInterval(jest.fn(), 100);
      expect(instance.callbacks.size).toBe(2);
      destroyTabSafeTimers();
      expect(getTabSafeTimers()).toBe(null);
    });

    test('handles multiple destroy calls gracefully', () => {
      initTabSafeTimers();
      destroyTabSafeTimers();
      expect(() => destroyTabSafeTimers()).not.toThrow();
    });
  });

  describe('Worker message handling', () => {
    test('executes callback when worker sends tick for setTimeout', () => {
      const instance = initTabSafeTimers();
      const callback = jest.fn();
      const args = [1, 2, 3];

      const id = window.setTimeout(callback, 100, ...args);

      // Simulate worker sending tick message
      instance.worker.onmessage({ data: { type: 'tick', id } });

      expect(callback).toHaveBeenCalledWith(1, 2, 3);
      // Callback should be removed after execution (timeout)
      expect(instance.callbacks.has(id)).toBe(false);
    });

    test('executes callback when worker sends tick for setInterval', () => {
      const instance = initTabSafeTimers();
      const callback = jest.fn();

      const id = window.setInterval(callback, 100);

      // Simulate worker sending tick message multiple times
      instance.worker.onmessage({ data: { type: 'tick', id } });
      instance.worker.onmessage({ data: { type: 'tick', id } });

      expect(callback).toHaveBeenCalledTimes(2);
      // Callback should still exist (interval)
      expect(instance.callbacks.has(id)).toBe(true);
    });

    test('handles callback errors gracefully', () => {
      const instance = initTabSafeTimers();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      const id = window.setTimeout(errorCallback, 100);

      // Simulate worker sending tick message
      instance.worker.onmessage({ data: { type: 'tick', id } });

      expect(errorCallback).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith('[TabSafeTimers] Error in timer callback:', expect.any(Error));

      consoleError.mockRestore();
    });

    test('ignores tick for non-existent callback', () => {
      const instance = initTabSafeTimers();

      // Simulate tick for ID that doesn't exist
      expect(() => {
        instance.worker.onmessage({ data: { type: 'tick', id: 99999 } });
      }).not.toThrow();
    });

    test('handles worker errors', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const instance = initTabSafeTimers();

      const error = new Error('Worker error');
      instance.worker.onerror(error);

      expect(consoleError).toHaveBeenCalledWith('[TabSafeTimers] Worker error:', error);

      consoleError.mockRestore();
    });
  });

  describe('Fallback behavior', () => {
    test('uses native timers when not initialized', () => {
      // Don't initialize TabSafeTimers
      const callback = jest.fn();

      // Since TabSafeTimers is not initialized, it should use originalSetTimeout
      // But window.setTimeout is already the original since we didn't init
      const id = window.setTimeout(callback, 100);

      // Check that a timer ID was returned (native behavior)
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');
    });

    test('falls back to native clearTimeout for unknown IDs', () => {
      initTabSafeTimers();
      const instance = getTabSafeTimers();

      // Mock the native clearTimeout
      const nativeClearTimeout = jest.fn();
      instance.native.clearTimeout = nativeClearTimeout;

      // Try to clear an ID that doesn't exist in callbacks
      window.clearTimeout(99999);

      expect(nativeClearTimeout).toHaveBeenCalledWith(99999);
    });

    test('falls back to native clearInterval for unknown IDs', () => {
      initTabSafeTimers();
      const instance = getTabSafeTimers();

      // Mock the native clearInterval
      const nativeClearInterval = jest.fn();
      instance.native.clearInterval = nativeClearInterval;

      // Try to clear an ID that doesn't exist in callbacks
      window.clearInterval(88888);

      expect(nativeClearInterval).toHaveBeenCalledWith(88888);
    });
  });
});
