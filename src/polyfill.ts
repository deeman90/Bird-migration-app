/**
 * Browser Environment Polyfill & Getter/Setter Compatibility Guard
 * Prevents "Cannot set property fetch of #<Window> which has only a getter"
 * caused by legacy polyfills inside third-party SDKs (such as Flutterwave checkout).
 */

if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch ? window.fetch.bind(window) : undefined;
    let activeFetch = originalFetch;

    Object.defineProperty(window, 'fetch', {
      get() {
        return activeFetch || originalFetch;
      },
      set(newFetch) {
        if (typeof newFetch === 'function') {
          activeFetch = newFetch;
        }
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    // If Object.defineProperty is locked, ignore
  }

  // Intercept and swallow the getter-only TypeError from third-party scripts
  window.addEventListener(
    'error',
    (event) => {
      if (
        event &&
        event.message &&
        event.message.includes('Cannot set property fetch')
      ) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        return true;
      }
    },
    true
  );
}

export {};
