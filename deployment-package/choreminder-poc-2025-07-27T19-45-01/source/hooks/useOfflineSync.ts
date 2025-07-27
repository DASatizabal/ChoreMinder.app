"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

interface OfflineAction {
  id: string;
  type: "chore_complete" | "chore_update" | "photo_upload" | "feedback_submit";
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

interface OfflineSyncOptions {
  enableSync?: boolean;
  syncInterval?: number;
  maxRetries?: number;
  onSyncStart?: () => void;
  onSyncComplete?: (successCount: number, failureCount: number) => void;
  onSyncError?: (error: Error) => void;
}

interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export const useOfflineSync = (options: OfflineSyncOptions = {}) => {
  const {
    enableSync = true,
    syncInterval = 30000, // 30 seconds
    maxRetries = 3,
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options;

  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize offline storage and network monitoring
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Load pending actions from localStorage
    loadPendingActions();

    // Set up network monitoring
    updateNetworkStatus();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Monitor connection quality
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener("change", updateNetworkStatus);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Set up sync interval when online
  useEffect(() => {
    if (isOnline && enableSync && pendingActions.length > 0) {
      syncIntervalRef.current = setInterval(() => {
        syncPendingActions();
      }, syncInterval);
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, enableSync, pendingActions.length, syncInterval]);

  const updateNetworkStatus = () => {
    const online = navigator.onLine;
    let effectiveType, downlink, rtt;

    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      effectiveType = connection.effectiveType;
      downlink = connection.downlink;
      rtt = connection.rtt;
    }

    const status: NetworkStatus = {
      isOnline: online,
      effectiveType,
      downlink,
      rtt,
    };

    setNetworkStatus(status);
    setIsOnline(online);
  };

  const handleOnline = () => {
    updateNetworkStatus();
    toast.success("🌐 Back online! Syncing data...", {
      duration: 2000,
      position: "bottom-center",
    });

    // Sync immediately when coming back online
    setTimeout(() => {
      syncPendingActions();
    }, 1000);
  };

  const handleOffline = () => {
    updateNetworkStatus();
    toast("📴 You're offline. Actions will be saved locally.", {
      duration: 3000,
      position: "bottom-center",
      icon: "💾",
    });
  };

  const loadPendingActions = () => {
    try {
      const stored = localStorage.getItem("offline_pending_actions");
      if (stored) {
        const actions = JSON.parse(stored);
        setPendingActions(actions);
      }
    } catch (error) {
      console.error("Error loading pending actions:", error);
    }
  };

  const savePendingActions = (actions: OfflineAction[]) => {
    try {
      localStorage.setItem("offline_pending_actions", JSON.stringify(actions));
    } catch (error) {
      console.error("Error saving pending actions:", error);
    }
  };

  const addOfflineAction = useCallback(
    (type: OfflineAction["type"], data: any, customMaxRetries?: number) => {
      const action: OfflineAction = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: customMaxRetries || maxRetries,
      };

      setPendingActions((prev) => {
        const updated = [...prev, action];
        savePendingActions(updated);
        return updated;
      });

      if (!isOnline) {
        toast("💾 Action saved offline. Will sync when connected.", {
          duration: 2000,
          position: "bottom-center",
        });
      } else {
        // Try to sync immediately if online
        setTimeout(() => syncSingleAction(action), 100);
      }

      return action.id;
    },
    [isOnline, maxRetries],
  );

  const syncSingleAction = async (action: OfflineAction): Promise<boolean> => {
    try {
      let success = false;

      switch (action.type) {
        case "chore_complete":
          success = await syncChoreCompletion(action.data);
          break;
        case "chore_update":
          success = await syncChoreUpdate(action.data);
          break;
        case "photo_upload":
          success = await syncPhotoUpload(action.data);
          break;
        case "feedback_submit":
          success = await syncFeedbackSubmission(action.data);
          break;
        default:
          console.warn("Unknown action type:", action.type);
          success = false;
      }

      if (success) {
        // Remove from pending actions
        setPendingActions((prev) => {
          const updated = prev.filter((a) => a.id !== action.id);
          savePendingActions(updated);
          return updated;
        });
      } else {
        // Increment retry count
        setPendingActions((prev) => {
          const updated = prev.map((a) =>
            a.id === action.id ? { ...a, retryCount: a.retryCount + 1 } : a,
          );
          savePendingActions(updated);
          return updated;
        });
      }

      return success;
    } catch (error) {
      console.error("Error syncing action:", error);
      return false;
    }
  };

  const syncPendingActions = useCallback(async () => {
    if (!isOnline || isSyncing || pendingActions.length === 0) return;

    setIsSyncing(true);
    onSyncStart?.();

    let successCount = 0;
    let failureCount = 0;

    try {
      const actionsToSync = pendingActions.filter(
        (action) => action.retryCount < action.maxRetries,
      );

      for (const action of actionsToSync) {
        const success = await syncSingleAction(action);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      }

      // Remove actions that have exceeded max retries
      setPendingActions((prev) => {
        const updated = prev.filter(
          (action) => action.retryCount < action.maxRetries,
        );
        savePendingActions(updated);
        return updated;
      });

      setLastSyncTime(new Date());
      onSyncComplete?.(successCount, failureCount);

      if (successCount > 0) {
        toast.success(
          `✅ Synced ${successCount} action${successCount > 1 ? "s" : ""}`,
          {
            duration: 2000,
            position: "bottom-center",
          },
        );
      }
    } catch (error) {
      console.error("Sync error:", error);
      onSyncError?.(error as Error);
      toast.error("❌ Sync failed. Will retry automatically.", {
        duration: 2000,
        position: "bottom-center",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [
    isOnline,
    isSyncing,
    pendingActions,
    onSyncStart,
    onSyncComplete,
    onSyncError,
  ]);

  // API sync functions
  const syncChoreCompletion = async (data: any): Promise<boolean> => {
    try {
      const response = await fetch(`/api/chores/${data.choreId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const syncChoreUpdate = async (data: any): Promise<boolean> => {
    try {
      const response = await fetch(`/api/chores/${data.choreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const syncPhotoUpload = async (data: any): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append("photo", data.photo);
      formData.append("choreId", data.choreId);

      const response = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const syncFeedbackSubmission = async (data: any): Promise<boolean> => {
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const manualSync = useCallback(() => {
    if (isOnline) {
      syncPendingActions();
    } else {
      toast.error("Cannot sync while offline", {
        duration: 2000,
        position: "bottom-center",
      });
    }
  }, [isOnline, syncPendingActions]);

  const clearPendingActions = useCallback(() => {
    setPendingActions([]);
    localStorage.removeItem("offline_pending_actions");
    toast.success("Cleared all pending actions", {
      duration: 2000,
      position: "bottom-center",
    });
  }, []);

  const getConnectionQuality = ():
    | "excellent"
    | "good"
    | "poor"
    | "offline" => {
    if (!isOnline) return "offline";

    const { effectiveType, downlink, rtt } = networkStatus;

    if (
      effectiveType === "4g" &&
      downlink &&
      downlink > 1.5 &&
      rtt &&
      rtt < 100
    ) {
      return "excellent";
    } else if (effectiveType === "4g" || (downlink && downlink > 0.5)) {
      return "good";
    } else {
      return "poor";
    }
  };

  return {
    // State
    isOnline,
    isSyncing,
    pendingActions,
    networkStatus,
    lastSyncTime,

    // Actions
    addOfflineAction,
    manualSync,
    clearPendingActions,

    // Helpers
    getConnectionQuality,
    hasPendingActions: pendingActions.length > 0,
    pendingCount: pendingActions.length,

    // Status
    connectionQuality: getConnectionQuality(),
  };
};
