/**
 * Offline sync manager
 * Handles synchronization of offline journal entries when connection is restored
 */

import { offlineDB, type OfflineEntry } from './offline-db';

const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

class OfflineSyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private onlineHandler: (() => void) | null = null;

  /**
   * Start the sync manager
   * Listens for online events and periodically syncs pending entries
   */
  start() {
    // Sync when coming back online
    this.onlineHandler = () => {
      console.log('[OfflineSync] Connection restored, starting sync...');
      this.syncPendingEntries();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineHandler);
      
      // Start periodic sync
      this.syncInterval = setInterval(() => {
        if (navigator.onLine) {
          this.syncPendingEntries();
        }
      }, SYNC_INTERVAL);

      // Initial sync if online
      if (navigator.onLine) {
        this.syncPendingEntries();
      }
    }
  }

  /**
   * Stop the sync manager
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.onlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
  }

  /**
   * Sync all pending entries
   */
  async syncPendingEntries(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log('[OfflineSync] Sync already in progress');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      const pendingEntries = await offlineDB.getPendingEntries();
      
      if (pendingEntries.length === 0) {
        console.log('[OfflineSync] No pending entries to sync');
        return { success: 0, failed: 0 };
      }

      console.log(`[OfflineSync] Syncing ${pendingEntries.length} pending entries...`);

      for (const entry of pendingEntries) {
        try {
          await this.syncEntry(entry);
          await offlineDB.markAsSynced(entry.id);
          successCount++;
          console.log(`[OfflineSync] Successfully synced entry ${entry.id}`);
        } catch (error) {
          console.error(`[OfflineSync] Failed to sync entry ${entry.id}:`, error);
          
          if (entry.retryCount < MAX_RETRY_COUNT) {
            await offlineDB.incrementRetryCount(entry.id);
          } else {
            console.error(`[OfflineSync] Max retries reached for entry ${entry.id}, deleting...`);
            await offlineDB.deleteEntry(entry.id);
          }
          
          failedCount++;
        }
      }

      // Clean up synced entries
      await offlineDB.clearSyncedEntries();

      console.log(`[OfflineSync] Sync complete: ${successCount} success, ${failedCount} failed`);
    } catch (error) {
      console.error('[OfflineSync] Sync error:', error);
    } finally {
      this.isSyncing = false;
    }

    return { success: successCount, failed: failedCount };
  }

  /**
   * Sync a single entry
   */
  private async syncEntry(entry: OfflineEntry): Promise<void> {
    const endpoint = entry.type === 'temperature' 
      ? '/api/journals/temperature'
      : '/api/journals/health';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(entry.data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get sync status
   */
  async getStatus(): Promise<{
    pendingCount: number;
    isSyncing: boolean;
    isOnline: boolean;
  }> {
    const pendingCount = await offlineDB.getEntryCount();
    
    return {
      pendingCount,
      isSyncing: this.isSyncing,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }

  /**
   * Force immediate sync
   */
  async forceSyncNow(): Promise<{ success: number; failed: number }> {
    console.log('[OfflineSync] Force sync requested');
    return this.syncPendingEntries();
  }
}

export const offlineSyncManager = new OfflineSyncManager();
