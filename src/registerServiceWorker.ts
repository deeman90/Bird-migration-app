/**
 * Service Worker Registration and Lifecycle Manager
 */

export function registerServiceWorker(): void {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // If running in an iframe (e.g. AI Studio preview), unregister any active Service Workers to ensure fresh live code execution
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().catch(() => {});
        }
      }).catch(() => {});
      return;
    }

    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            registration.addEventListener('updatefound', () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.addEventListener('statechange', () => {
                  if (installingWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      console.log('[SW] New version available');
                    }
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.warn('[SW] Registration notice:', error);
          });
      } catch (e) {
        console.warn('[SW] Unable to register service worker in this frame context:', e);
      }
    });
  } catch (err) {
    console.warn('[SW] ServiceWorker unsupported or restricted:', err);
  }
}
