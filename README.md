# ⏱️ @vorthain/tab-safe-timers

[![npm](https://img.shields.io/npm/v/@vorthain/tab-safe-timers.svg)](https://www.npmjs.com/package/@vorthain/tab-safe-timers)
[![Downloads](https://img.shields.io/npm/dm/@vorthain/tab-safe-timers.svg)](https://www.npmjs.com/package/@vorthain/tab-safe-timers)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@vorthain/tab-safe-timers)](https://bundlephobia.com/package/@vorthain/tab-safe-timers)

Web Worker-powered timer functions that continue running accurately when browser tabs are in the background. **Zero configuration required!**

## Why?

Modern browsers throttle JavaScript timers (`setTimeout`, `setInterval`) when tabs are in the background to save battery and improve performance. This can break functionality that depends on accurate timing, such as:

- Real-time applications
- Game loops
- Analytics tracking
- Session management
- Periodic data syncing
- Countdown timers

This library replaces the native timer functions with Web Worker-based implementations that run in a separate thread, unaffected by background tab throttling.

## Installation

```bash
npm install @vorthain/tab-safe-timers
```

## Usage

```javascript
import { initTabSafeTimers } from '@vorthain/tab-safe-timers';

// Initialize once at app startup
initTabSafeTimers();

// Your existing timer code now works in background tabs!
setInterval(() => {
  console.log('This runs every second, even in background tabs!');
}, 1000);
```

That's it! No configuration files, no worker setup, no build steps required.

## Examples

### React

```javascript
// App.js
import { useEffect } from 'react';
import { initTabSafeTimers, destroyTabSafeTimers } from '@vorthain/tab-safe-timers';

function App() {
  useEffect(() => {
    // Initialize on mount
    initTabSafeTimers();

    // Cleanup on unmount (optional)
    return () => {
      destroyTabSafeTimers();
    };
  }, []);

  // Use timers normally anywhere in your app
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Background-safe timer!');
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return <div>Your app</div>;
}
```

### Vue

```javascript
// main.js
import { createApp } from 'vue';
import { initTabSafeTimers } from '@vorthain/tab-safe-timers';
import App from './App.vue';

// Initialize before creating app
initTabSafeTimers();

createApp(App).mount('#app');
```

### Next.js

```javascript
// pages/_app.js or app/layout.js
import { useEffect } from 'react';
import { initTabSafeTimers } from '@vorthain/tab-safe-timers';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    initTabSafeTimers();
  }, []);

  return <Component {...pageProps} />;
}
```

## API

### `initTabSafeTimers()`

Initializes the tab-safe timer system. Call this once when your application starts.

**Returns:** `TabSafeTimers` instance

**Throws:** Error if initialization fails (e.g., not in a browser environment or Web Workers not supported)

```javascript
// Simple usage
initTabSafeTimers();

// With error handling
try {
  initTabSafeTimers();
} catch (error) {
  console.warn('Tab-safe timers not available:', error);
  // Your app still works with regular timers
}
```

### `destroyTabSafeTimers()`

Destroys the timer system and restores native timer functions. This is optional - you only need to call this if you want to clean up resources or disable the tab-safe functionality.

```javascript
destroyTabSafeTimers();
```

### `getTabSafeTimers()`

Returns the current `TabSafeTimers` instance or `null` if not initialized.

```javascript
const instance = getTabSafeTimers();
if (instance) {
  console.log('Tab-safe timers are active');
}
```

## How It Works

1. The library embeds the Web Worker code as a JavaScript string
2. On initialization, it creates a Blob URL from this code and spawns a Worker
3. The Worker runs in a separate thread, unaffected by background throttling
4. Timer functions are globally overridden to communicate with the Worker
5. Your callbacks are stored and executed when the Worker sends tick messages

## Browser Compatibility & Limitations

### Desktop Browsers

✅ **Works perfectly** - Web Workers bypass background tab throttling completely on desktop browsers (Chrome, Firefox, Safari, Edge).

### Mobile Browsers

⚠️ **Works most of the time** but with caveats:

- **OS-level throttling**: iOS Safari and some Android browsers may suspend background tabs entirely after a certain time to save battery. When this happens, the worker is paused completely until the tab becomes active again.
- **Memory pressure**: Mobile browsers may stop workers if the device is low on memory or in battery saver mode.
- **Low-power modes**: System-wide power saving features can override browser behavior.

**Bottom line**: This library solves the vast majority of timer-throttling issues, but nothing in JavaScript can guarantee 100% uptime in background mobile tabs due to OS-level restrictions.

## Common Use Cases

### Accurate Time Tracking

```javascript
initTabSafeTimers();

let secondsElapsed = 0;
setInterval(() => {
  secondsElapsed++;
  updateUI(secondsElapsed);
}, 1000); // Stays accurate even in background
```

### Session Management

```javascript
initTabSafeTimers();

// Check session every 30 seconds, even in background tabs
setInterval(async () => {
  const response = await fetch('/api/session/heartbeat');
  if (!response.ok) {
    handleSessionExpired();
  }
}, 30000);
```

### Real-time Data Syncing

```javascript
initTabSafeTimers();

// Keep data fresh even when user switches tabs
setInterval(async () => {
  const data = await fetchLatestData();
  updateStore(data);
}, 5000);
```

## TypeScript

The package includes complete TypeScript definitions:

```typescript
import { initTabSafeTimers, destroyTabSafeTimers, getTabSafeTimers } from '@vorthain/tab-safe-timers';

// Full type safety
const instance = initTabSafeTimers();
```
