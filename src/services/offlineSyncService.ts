import { Sighting, QueuedSighting } from '../types';
import { createSightingInSupabase } from './sightingsService';
import { uploadBase64ToSupabaseStorage } from './storageService';

export const OFFLINE_SYNC_QUEUE_KEY = 'aerotrack_offline_sightings_queue';
export const QUEUE_UPDATED_EVENT = 'aerotrack:sync-queue-updated';
export const SIMULATED_OFFLINE_KEY = 'aerotrack_simulated_offline';

let isSyncInProgress = false;

/**
 * Check if the user has manually enabled simulated offline mode for testing.
 */
export function isSimulatedOffline(): boolean {
  try {
    return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable or disable simulated offline mode.
 * Dispatches standard 'online' or 'offline' events so components react seamlessly.
 */
export function setSimulatedOffline(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(SIMULATED_OFFLINE_KEY, 'true');
    } else {
      localStorage.removeItem(SIMULATED_OFFLINE_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(value ? 'offline' : 'online'));
      notifyQueueListeners();
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to toggle simulated offline mode:', err);
  }
}

/**
 * Check if the browser currently has network connectivity.
 * Respects simulated offline testing mode.
 */
export function isDeviceOnline(): boolean {
  if (isSimulatedOffline()) {
    return false;
  }
  if (typeof navigator === 'undefined') return true;
  return typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
}

/**
 * Active connectivity test that pings the server to verify real internet reachability.
 */
export async function pingConnectivity(): Promise<boolean> {
  if (!isDeviceOnline()) return false;
  try {
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Retrieve all sightings pending sync from local storage.
 */
export function getPendingSightingsQueue(): QueuedSighting[] {
  try {
    const raw = localStorage.getItem(OFFLINE_SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[OfflineSync] Failed to read pending queue from localStorage:', err);
    return [];
  }
}

/**
 * Persist the current queue array back into local storage and notify listeners.
 */
function savePendingSightingsQueue(queue: QueuedSighting[]): void {
  try {
    localStorage.setItem(OFFLINE_SYNC_QUEUE_KEY, JSON.stringify(queue));
    notifyQueueListeners();
  } catch (err) {
    console.warn('[OfflineSync] Failed to save pending queue to localStorage:', err);
  }
}

/**
 * Dispatches a custom event so UI components can re-render reactively.
 */
export function notifyQueueListeners(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUEUE_UPDATED_EVENT, { detail: getPendingSightingsQueue() }));
  }
}

/**
 * Add a sighting to the offline sync queue.
 * Ensures the sighting has offline sync metadata and prevents duplicates.
 */
export function enqueueOfflineSighting(sighting: Sighting): QueuedSighting {
  const currentQueue = getPendingSightingsQueue();

  // Clean and augment sighting with offline status
  const queuedSightingData: Sighting = {
    ...sighting,
    syncStatus: 'pending',
    offlineCreatedAt: sighting.offlineCreatedAt || new Date().toISOString(),
  };

  const existingIndex = currentQueue.findIndex(
    (item) => item.sighting.id === sighting.id || (sighting.imageHash && item.sighting.imageHash === sighting.imageHash)
  );

  const queueItem: QueuedSighting = {
    queueId: existingIndex >= 0 ? currentQueue[existingIndex].queueId : `queue_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    sighting: queuedSightingData,
    createdAt: existingIndex >= 0 ? currentQueue[existingIndex].createdAt : new Date().toISOString(),
    retryCount: existingIndex >= 0 ? currentQueue[existingIndex].retryCount : 0,
    status: 'pending',
  };

  if (existingIndex >= 0) {
    currentQueue[existingIndex] = queueItem;
  } else {
    currentQueue.push(queueItem);
  }

  savePendingSightingsQueue(currentQueue);

  // Request Service Worker Background Sync if supported
  requestBackgroundSyncRegistration();

  return queueItem;
}

/**
 * Remove a specific queued item by its queue ID.
 */
export function removeQueuedSighting(queueId: string): void {
  const currentQueue = getPendingSightingsQueue();
  const filtered = currentQueue.filter((item) => item.queueId !== queueId);
  savePendingSightingsQueue(filtered);
}

/**
 * Update a queued sighting item (e.g., status, retryCount, error).
 */
export function updateQueuedSighting(queueId: string, updates: Partial<QueuedSighting>): void {
  const currentQueue = getPendingSightingsQueue();
  const updated = currentQueue.map((item) => {
    if (item.queueId === queueId) {
      return { ...item, ...updates };
    }
    return item;
  });
  savePendingSightingsQueue(updated);
}

/**
 * Clear the entire pending queue.
 */
export function clearSyncQueue(): void {
  savePendingSightingsQueue([]);
}

/**
 * Attempt to register background sync with the service worker if supported by browser.
 */
export async function requestBackgroundSyncRegistration(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'sync' in registration) {
        // @ts-ignore - SyncManager API
        await registration.sync.register('sync-bird-sightings');
        return true;
      }
    } catch (err) {
      console.warn('[OfflineSync] Background sync registration notice:', err);
    }
  }
  return false;
}

export interface SyncResult {
  total: number;
  succeeded: number;
  failed: number;
  syncedList: Sighting[];
}

/**
 * Helper to upload base64 image to Supabase storage if needed before pushing to database.
 */
async function prepareSightingPhotoForUpload(sighting: Sighting): Promise<Sighting> {
  if (sighting.photoUrl && sighting.photoUrl.startsWith('data:')) {
    try {
      const uploadRes = await uploadBase64ToSupabaseStorage({
        base64Data: sighting.photoUrl,
        userId: sighting.userId,
        featureName: 'sightings',
        itemId: sighting.id || 'queued_sighting',
      });
      if (uploadRes.signedUrl) {
        return { ...sighting, photoUrl: uploadRes.signedUrl };
      }
      if (uploadRes.filePath) {
        return { ...sighting, photoUrl: uploadRes.filePath };
      }
    } catch (imgErr) {
      console.warn('[OfflineSync] Photo upload notice, keeping local data URL:', imgErr);
    }
  }
  return sighting;
}

/**
 * Push all queued sightings to the Supabase database.
 * Resolves each sighting, removes successful items from localStorage,
 * and notifies callbacks and subscribers.
 */
export async function syncPendingSightings(callbacks?: {
  onSightingSynced?: (synced: Sighting) => void;
  onSightingFailed?: (item: QueuedSighting, error: any) => void;
}): Promise<SyncResult> {
  const queue = getPendingSightingsQueue();
  if (queue.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, syncedList: [] };
  }

  if (!isDeviceOnline()) {
    return { total: queue.length, succeeded: 0, failed: 0, syncedList: [] };
  }

  if (isSyncInProgress) {
    return { total: queue.length, succeeded: 0, failed: 0, syncedList: [] };
  }

  isSyncInProgress = true;

  const result: SyncResult = {
    total: queue.length,
    succeeded: 0,
    failed: 0,
    syncedList: [],
  };

  try {
    for (const item of queue) {
      // Re-verify network status before each request
      if (!isDeviceOnline()) {
        break;
      }

      updateQueuedSighting(item.queueId, {
        status: 'syncing',
        lastAttemptAt: new Date().toISOString(),
      });

      try {
        // Prepare photo if base64
        const preparedSighting = await prepareSightingPhotoForUpload(item.sighting);
        const { data, error } = await createSightingInSupabase(preparedSighting);

        if (data && !error) {
          const syncedSighting: Sighting = {
            ...item.sighting,
            ...data,
            syncStatus: 'synced',
          };
          removeQueuedSighting(item.queueId);
          result.succeeded++;
          result.syncedList.push(syncedSighting);

          if (callbacks?.onSightingSynced) {
            callbacks.onSightingSynced(syncedSighting);
          }
        } else {
          const errorMsg = error?.message || 'Supabase insertion failed';
          const isNetworkError =
            !isDeviceOnline() ||
            errorMsg.includes('fetch') ||
            errorMsg.includes('network') ||
            errorMsg.includes('offline');

          updateQueuedSighting(item.queueId, {
            status: isNetworkError ? 'pending' : 'failed',
            retryCount: item.retryCount + 1,
            error: errorMsg,
          });

          result.failed++;
          if (callbacks?.onSightingFailed) {
            callbacks.onSightingFailed(item, error);
          }

          if (isNetworkError) {
            // Stop syncing remaining items if network is unavailable
            break;
          }
        }
      } catch (insertErr: any) {
        const errorMsg = insertErr?.message || 'Network exception during push';
        updateQueuedSighting(item.queueId, {
          status: 'pending',
          retryCount: item.retryCount + 1,
          error: errorMsg,
        });
        result.failed++;
        if (callbacks?.onSightingFailed) {
          callbacks.onSightingFailed(item, insertErr);
        }
        break;
      }
    }
  } finally {
    isSyncInProgress = false;
    notifyQueueListeners();
  }

  return result;
}

/**
 * Manually push a single queued sighting to Supabase.
 */
export async function syncSingleQueuedSighting(
  queueId: string,
  callbacks?: {
    onSightingSynced?: (synced: Sighting) => void;
    onSightingFailed?: (item: QueuedSighting, error: any) => void;
  }
): Promise<{ success: boolean; sighting?: Sighting; error?: any }> {
  const queue = getPendingSightingsQueue();
  const item = queue.find((q) => q.queueId === queueId);
  if (!item) {
    return { success: false, error: 'Queue item not found' };
  }

  if (!isDeviceOnline()) {
    return { success: false, error: 'Device is offline' };
  }

  updateQueuedSighting(queueId, {
    status: 'syncing',
    lastAttemptAt: new Date().toISOString(),
  });

  try {
    const preparedSighting = await prepareSightingPhotoForUpload(item.sighting);
    const { data, error } = await createSightingInSupabase(preparedSighting);

    if (data && !error) {
      const syncedSighting: Sighting = {
        ...item.sighting,
        ...data,
        syncStatus: 'synced',
      };
      removeQueuedSighting(queueId);
      if (callbacks?.onSightingSynced) {
        callbacks.onSightingSynced(syncedSighting);
      }
      return { success: true, sighting: syncedSighting };
    } else {
      updateQueuedSighting(queueId, {
        status: 'failed',
        retryCount: item.retryCount + 1,
        error: error?.message || 'Failed to push to Supabase',
      });
      if (callbacks?.onSightingFailed) {
        callbacks.onSightingFailed(item, error);
      }
      return { success: false, error };
    }
  } catch (err: any) {
    updateQueuedSighting(queueId, {
      status: 'failed',
      retryCount: item.retryCount + 1,
      error: err?.message || 'Push error',
    });
    return { success: false, error: err };
  }
}

/**
 * Subscribe to changes in the offline sync queue.
 * Handles storage events across tabs and local custom events.
 */
export function subscribeToSyncQueue(callback: (queue: QueuedSighting[]) => void): () => void {
  const handleQueueChange = () => {
    callback(getPendingSightingsQueue());
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === OFFLINE_SYNC_QUEUE_KEY) {
      callback(getPendingSightingsQueue());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(QUEUE_UPDATED_EVENT, handleQueueChange);
    window.addEventListener('storage', handleStorage);
  }

  // Initial call with current state
  callback(getPendingSightingsQueue());

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(QUEUE_UPDATED_EVENT, handleQueueChange);
      window.removeEventListener('storage', handleStorage);
    }
  };
}
