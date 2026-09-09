/**
 * Service Worker Registration and Lifecycle Manager
 */

export function registerServiceWorker(): void {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Unregister any active Service Workers and clear worker caches to ensure fresh live code execution
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});

    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[SW] Cleanup notice:', err);
  }
}
