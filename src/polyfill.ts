// Polyfill to safely handle window.fetch getter/setter in restricted iframe environments
if (typeof window !== 'undefined') {
  try {
    const initialFetch = window.fetch;
    let activeFetch = typeof initialFetch === 'function' ? initialFetch.bind(window) : initialFetch;

    const desc = {
      get() {
        return activeFetch;
      },
      set(v: any) {
        activeFetch = typeof v === 'function' ? v.bind(window) : v;
      },
      configurable: true,
      enumerable: true,
    };

    try {
      Object.defineProperty(window, 'fetch', desc);
    } catch (e) {
      // ignore
    }

    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', desc);
      } catch (e) {
        // ignore
      }
    }

    if (typeof globalThis !== 'undefined') {
      try {
        Object.defineProperty(globalThis, 'fetch', desc);
      } catch (e) {
        // ignore
      }
    }

    if (typeof self !== 'undefined') {
      try {
        Object.defineProperty(self, 'fetch', desc);
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.error('[polyfill] fetch polyfill error:', e);
  }
}


