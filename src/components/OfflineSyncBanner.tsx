import React, { useState, useEffect } from 'react';
import { QueuedSighting, Sighting } from '../types';
import {
  isDeviceOnline,
  isSimulatedOffline,
  setSimulatedOffline,
  subscribeToSyncQueue,
  syncPendingSightings,
  syncSingleQueuedSighting,
  removeQueuedSighting,
  clearSyncQueue,
} from '../services/offlineSyncService';
import {
  WifiOff,
  Wifi,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowUpRight,
  Play,
  RotateCw,
} from 'lucide-react';

interface OfflineSyncBannerProps {
  onSightingSynced?: (syncedSighting: Sighting) => void;
  onShowToast?: (message: string, type?: 'success' | 'pro') => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  onSightingSynced,
  onShowToast,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(isDeviceOnline());
  const [simulatedOffline, setSimulatedOfflineState] = useState<boolean>(isSimulatedOffline());
  const [queue, setQueue] = useState<QueuedSighting[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSimulatedOfflineState(isSimulatedOffline());
      if (onShowToast) {
        onShowToast('🌐 Internet connection active! Auto-pushing offline sightings...', 'success');
      }
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSimulatedOfflineState(isSimulatedOffline());
      if (onShowToast) {
        onShowToast('📡 Offline mode: Sightings will be saved locally in sync queue.', 'success');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onShowToast]);

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = subscribeToSyncQueue((updatedQueue) => {
      setQueue(updatedQueue);
      setIsOnline(isDeviceOnline());
      setSimulatedOfflineState(isSimulatedOffline());
    });
    return unsubscribe;
  }, []);

  const triggerSync = async () => {
    if (isSyncing || !isDeviceOnline()) return;

    setIsSyncing(true);
    try {
      const result = await syncPendingSightings({
        onSightingSynced: (synced) => {
          if (onSightingSynced) {
            onSightingSynced(synced);
          }
        },
      });

      if (result.succeeded > 0 && onShowToast) {
        onShowToast(
          `✓ Successfully pushed ${result.succeeded} offline ${
            result.succeeded === 1 ? 'sighting' : 'sightings'
          } to Supabase!`,
          'success'
        );
      }
    } catch (err) {
      console.warn('[OfflineSyncBanner] Manual sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSingle = async (queueId: string) => {
    if (!isDeviceOnline()) {
      if (onShowToast) onShowToast('Cannot sync while offline. Restore connection first.', 'pro');
      return;
    }
    setSyncingItemId(queueId);
    try {
      const res = await syncSingleQueuedSighting(queueId, {
        onSightingSynced: (synced) => {
          if (onSightingSynced) onSightingSynced(synced);
        },
      });
      if (res.success && onShowToast) {
        onShowToast(`✓ Pushed "${res.sighting?.speciesName}" to Supabase!`, 'success');
      } else if (!res.success && onShowToast) {
        onShowToast(`Notice: ${res.error?.message || 'Sync failed'}`, 'pro');
      }
    } finally {
      setSyncingItemId(null);
    }
  };

  const toggleSimulatedOffline = () => {
    const nextVal = !simulatedOffline;
    setSimulatedOffline(nextVal);
    setSimulatedOfflineState(nextVal);
    setIsOnline(!nextVal);
    if (onShowToast) {
      onShowToast(
        nextVal
          ? '📡 Simulated Offline Mode ENABLED: Sightings will queue locally in browser storage.'
          : '🌐 Simulated Offline Mode DISABLED: Connectivity restored! Auto-pushing queue...',
        'success'
      );
    }
    if (!nextVal) {
      setTimeout(() => {
        triggerSync();
      }, 300);
    }
  };

  // If online, not simulating offline, and no items in queue, do not display banner
  if (isOnline && !simulatedOffline && queue.length === 0) {
    return null;
  }

  const pendingCount = queue.length;
  const syncingCount = queue.filter((q) => q.status === 'syncing').length;

  return (
    <div
      id="offline-sync-banner"
      className={`border-b transition-all ${
        !isOnline
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          {/* Status Message */}
          <div className="flex items-center space-x-2.5 text-xs flex-wrap gap-y-1">
            {!isOnline ? (
              <div className="flex items-center space-x-2">
                <span className="p-1 rounded bg-amber-500/20 text-amber-400">
                  <WifiOff className="w-3.5 h-3.5" />
                </span>
                <span className="font-semibold text-amber-300">
                  Offline Field Mode {simulatedOffline && '(Simulated)'}
                </span>
                <span className="hidden md:inline text-amber-200/80">
                  — New observations are saved locally and will auto-push to Supabase when reconnected.
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                  <Cloud className="w-3.5 h-3.5" />
                </span>
                <span className="font-semibold text-emerald-300">Sync Queue Active</span>
                <span className="hidden md:inline text-emerald-200/80">
                  — {pendingCount} offline observation{pendingCount > 1 ? 's' : ''} ready to push to Supabase.
                </span>
              </div>
            )}

            {pendingCount > 0 && (
              <span className="font-mono-code px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 border border-current">
                {pendingCount} Queued
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 self-end sm:self-auto flex-wrap">
            {/* Offline Simulation Toggle for convenient testing */}
            <button
              id="toggle-offline-simulation-btn"
              onClick={toggleSimulatedOffline}
              className={`text-[11px] font-mono-code flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                simulatedOffline
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200 hover:bg-amber-500/40'
                  : 'bg-black/30 border-current/30 hover:bg-black/50 text-[#edeeef]/80'
              }`}
              title="Toggle simulated offline mode to test offline observation queuing and automatic Supabase sync"
            >
              {simulatedOffline ? <WifiOff className="w-3 h-3 text-amber-300" /> : <Wifi className="w-3 h-3 opacity-60" />}
              <span>{simulatedOffline ? 'Resume Online' : 'Simulate Offline'}</span>
            </button>

            {pendingCount > 0 && (
              <button
                id="toggle-queue-details-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[11px] font-mono-code flex items-center space-x-1 px-2 py-1 rounded bg-black/30 hover:bg-black/50 transition-colors cursor-pointer"
                title="View queued sightings details"
              >
                <span>Details</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            {isOnline && pendingCount > 0 && (
              <button
                id="manual-sync-btn"
                onClick={triggerSync}
                disabled={isSyncing}
                className="min-h-[30px] px-3 py-1 rounded bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-syne font-bold flex items-center space-x-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Pushing to Supabase...' : 'Sync to Supabase Now'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Expanded Queue Drawer */}
        {isExpanded && pendingCount > 0 && (
          <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono-code uppercase tracking-wider opacity-80">
                Pending Supabase Push Queue ({pendingCount})
              </p>
              <button
                onClick={clearSyncQueue}
                className="text-[10px] font-mono-code text-rose-300 hover:text-rose-100 flex items-center space-x-1 transition-colors cursor-pointer"
                title="Clear all pending items"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Queue</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {queue.map((item) => {
                const isItemSyncing = item.status === 'syncing' || syncingItemId === item.queueId;
                return (
                  <div
                    key={item.queueId}
                    className="bg-black/50 border border-current/20 rounded p-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {item.sighting.photoUrl && (
                        <img
                          src={item.sighting.photoUrl}
                          alt={item.sighting.speciesName}
                          className="w-8 h-8 rounded object-cover shrink-0 border border-current/30"
                        />
                      )}
                      <div className="truncate">
                        <div className="font-semibold text-[#edeeef] truncate">
                          {item.sighting.speciesName}
                        </div>
                        <div className="text-[10px] opacity-70 font-mono-code truncate">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.sighting.locationName}
                        </div>
                        {item.error && (
                          <div className="text-[9px] text-rose-300 truncate font-mono-code" title={item.error}>
                            Err: {item.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      {isItemSyncing ? (
                        <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                      ) : isOnline ? (
                        <button
                          onClick={() => handleSyncSingle(item.queueId)}
                          className="p-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded border border-emerald-500/30 transition-colors"
                          title="Push this sighting to Supabase now"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-amber-400 text-[10px] font-mono-code">Pending</span>
                      )}

                      <button
                        onClick={() => removeQueuedSighting(item.queueId)}
                        className="p-1 hover:text-rose-400 transition-colors opacity-60 hover:opacity-100"
                        title="Discard from queue"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
