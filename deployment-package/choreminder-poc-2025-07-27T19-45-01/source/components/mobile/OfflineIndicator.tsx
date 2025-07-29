"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";
import { motion, AnimatePresence } from "framer-motion";

interface OfflineIndicatorProps {
  position?: "top" | "bottom";
  compact?: boolean;
}

const OfflineIndicator = ({
  position = "top",
  compact = false,
}: OfflineIndicatorProps) => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    connectionQuality,
    lastSyncTime,
    manualSync,
  } = useOfflineSync();

  const getStatusColor = () => {
    if (!isOnline) return "bg-red-500";
    if (isSyncing) return "bg-yellow-500 animate-pulse";
    if (pendingCount > 0) return "bg-orange-500";
    switch (connectionQuality) {
      case "excellent":
        return "bg-green-500";
      case "good":
        return "bg-blue-500";
      case "poor":
        return "bg-yellow-600";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) return "📴";
    if (isSyncing) return "🔄";
    if (pendingCount > 0) return "💾";
    switch (connectionQuality) {
      case "excellent":
        return "📶";
      case "good":
        return "📶";
      case "poor":
        return "📱";
      default:
        return "📴";
    }
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    if (isSyncing) return "Syncing...";
    if (pendingCount > 0) return `${pendingCount} pending`;
    switch (connectionQuality) {
      case "excellent":
        return "Excellent connection";
      case "good":
        return "Good connection";
      case "poor":
        return "Poor connection";
      default:
        return "Connected";
    }
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return "Never synced";

    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just synced";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return lastSyncTime.toLocaleDateString();
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1"
      >
        <motion.div
          animate={{ rotate: isSyncing ? 360 : 0 }}
          transition={{ duration: 1, repeat: isSyncing ? Infinity : 0 }}
          className={`w-2 h-2 rounded-full ${getStatusColor()}`}
        />
        {!isOnline && (
          <span className="text-xs text-red-600 font-medium">Offline</span>
        )}
        {pendingCount > 0 && (
          <span className="text-xs text-orange-600 font-medium">
            {pendingCount}
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {(!isOnline || pendingCount > 0 || isSyncing) && (
        <motion.div
          initial={{ y: position === "top" ? -100 : 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: position === "top" ? -100 : 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`fixed left-4 right-4 z-40 ${
            position === "top" ? "top-4" : "bottom-4"
          }`}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={pendingCount > 0 && isOnline ? manualSync : undefined}
            className={`card shadow-xl border-2 ${
              !isOnline
                ? "border-red-300 bg-red-50"
                : pendingCount > 0
                  ? "border-orange-300 bg-orange-50"
                  : "border-yellow-300 bg-yellow-50"
            } ${pendingCount > 0 && isOnline ? "cursor-pointer" : ""}`}
          >
            <div className="card-body p-4">
              <div className="flex items-center gap-3">
                {/* Status indicator */}
                <motion.div
                  animate={{
                    rotate: isSyncing ? 360 : 0,
                    scale: isSyncing ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    rotate: { duration: 1, repeat: isSyncing ? Infinity : 0 },
                    scale: { duration: 0.5, repeat: isSyncing ? Infinity : 0 },
                  }}
                  className={`w-4 h-4 rounded-full flex-shrink-0 ${getStatusColor()}`}
                />

                {/* Status info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {getStatusIcon()} {getStatusText()}
                    </span>

                    {pendingCount > 0 && isOnline && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          manualSync();
                        }}
                        className="btn btn-xs btn-primary"
                        disabled={isSyncing}
                      >
                        {isSyncing ? (
                          <>
                            <span className="loading loading-spinner loading-xs mr-1"></span>
                            Syncing
                          </>
                        ) : (
                          "Sync Now"
                        )}
                      </motion.button>
                    )}
                  </div>

                  <div className="text-xs opacity-75 mt-1">
                    {!isOnline
                      ? "Actions will be saved locally and synced when connected"
                      : pendingCount > 0
                        ? `${pendingCount} action${pendingCount > 1 ? "s" : ""} waiting to sync`
                        : `Last sync: ${formatLastSync()}`}
                  </div>
                </div>
              </div>

              {/* Progress indicator for sync */}
              {isSyncing && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2 }}
                  className="h-1 bg-primary rounded-full mt-2"
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
