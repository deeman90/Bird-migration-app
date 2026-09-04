// Safe polyfill for window.fetch in sandboxed iframe environments
if (typeof window !== 'undefined' && !(window as any).__fetchPolyfilled) {
  try {
    (window as any).__fetchPolyfilled = true;
    const initialFetch = window.fetch;
    if (typeof initialFetch === 'function') {
      let activeFetch = initialFetch.bind(window);

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
      } catch {
        // ignore
      }

      if (typeof Window !== 'undefined' && Window.prototype) {
        try {
          Object.defineProperty(Window.prototype, 'fetch', desc);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
}
