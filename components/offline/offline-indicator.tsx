"use client";

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { offlineSyncManager } from '@/lib/offline-sync';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    // Initialize sync manager
    offlineSyncManager.start();

    // Update online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Update sync status
    const updateSyncStatus = async () => {
      const status = await offlineSyncManager.getStatus();
      setPendingCount(status.pendingCount);
      setIsSyncing(status.isSyncing);
    };

    // Initial status
    updateOnlineStatus();
    updateSyncStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Poll sync status
    const interval = setInterval(updateSyncStatus, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
      offlineSyncManager.stop();
    };
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const result = await offlineSyncManager.forceSyncNow();
      setLastSyncResult(result);
      
      // Update pending count
      const status = await offlineSyncManager.getStatus();
      setPendingCount(status.pendingCount);
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show indicator if online and no pending entries
  if (isOnline && pendingCount === 0 && !lastSyncResult) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`border-2 ${
        !isOnline 
          ? 'border-red-500/50 bg-red-950/90' 
          : pendingCount > 0 
            ? 'border-amber-500/50 bg-amber-950/90'
            : 'border-emerald-500/50 bg-emerald-950/90'
      } backdrop-blur-sm shadow-lg`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              !isOnline 
                ? 'bg-red-500/20' 
                : pendingCount > 0 
                  ? 'bg-amber-500/20'
                  : 'bg-emerald-500/20'
            }`}>
              {!isOnline ? (
                <WifiOff className="h-5 w-5 text-red-300" />
              ) : isSyncing ? (
                <RefreshCw className="h-5 w-5 animate-spin text-amber-300" />
              ) : pendingCount > 0 ? (
                <AlertCircle className="h-5 w-5 text-amber-300" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-300" />
              )}
            </div>

            {/* Status Text */}
            <div className="flex-1">
              {!isOnline ? (
                <>
                  <div className="text-sm font-semibold text-red-200">Нет подключения</div>
                  <div className="text-xs text-red-300/80">
                    Данные сохраняются локально
                  </div>
                </>
              ) : isSyncing ? (
                <>
                  <div className="text-sm font-semibold text-amber-200">Синхронизация...</div>
                  <div className="text-xs text-amber-300/80">
                    Отправка данных на сервер
                  </div>
                </>
              ) : pendingCount > 0 ? (
                <>
                  <div className="text-sm font-semibold text-amber-200">
                    Ожидает отправки: {pendingCount}
                  </div>
                  <div className="text-xs text-amber-300/80">
                    Нажмите для синхронизации
                  </div>
                </>
              ) : lastSyncResult ? (
                <>
                  <div className="text-sm font-semibold text-emerald-200">Синхронизировано</div>
                  <div className="text-xs text-emerald-300/80">
                    Отправлено: {lastSyncResult.success}
                    {lastSyncResult.failed > 0 && `, ошибок: ${lastSyncResult.failed}`}
                  </div>
                </>
              ) : null}
            </div>

            {/* Sync Button */}
            {isOnline && pendingCount > 0 && !isSyncing && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleForceSync}
                className="border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Additional Info */}
          {!isOnline && pendingCount > 0 && (
            <div className="mt-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-200">
              💡 Данные будут отправлены автоматически при восстановлении связи
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
