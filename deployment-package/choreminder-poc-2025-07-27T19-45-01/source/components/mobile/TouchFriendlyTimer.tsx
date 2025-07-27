"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";

interface TouchFriendlyTimerProps {
  estimatedMinutes: number;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onComplete: () => void;
  isActive: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
}

const TouchFriendlyTimer = ({
  estimatedMinutes,
  onStart,
  onPause,
  onStop,
  onComplete,
  isActive,
  isPaused,
  elapsedSeconds,
}: TouchFriendlyTimerProps) => {
  const [progress, setProgress] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);

  const circleRef = useRef<SVGCircleElement>(null);
  const progressValue = useMotionValue(0);
  const scale = useTransform(progressValue, [0, 1], [1, 1.1]);

  const estimatedSeconds = estimatedMinutes * 60;
  const progressPercent = Math.min(
    (elapsedSeconds / estimatedSeconds) * 100,
    100,
  );
  const isNearCompletion = progressPercent > 80;

  useEffect(() => {
    const newProgress = elapsedSeconds / estimatedSeconds;
    setProgress(newProgress);
    progressValue.set(newProgress);

    if (elapsedSeconds > estimatedSeconds && !isOvertime) {
      setIsOvertime(true);
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      toast("⏰ Estimated time reached! Keep going!", {
        duration: 3000,
        position: "top-center",
        icon: "💪",
      });
    }

    // Show encouragement at milestones
    if ([0.25, 0.5, 0.75].includes(Math.round(newProgress * 100) / 100)) {
      setShowEncouragement(true);
      setTimeout(() => setShowEncouragement(false), 2000);
    }
  }, [elapsedSeconds, estimatedSeconds, isOvertime, progressValue]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getEncouragementMessage = () => {
    const messages = [
      "You're doing great! 🌟",
      "Keep up the awesome work! 💪",
      "Halfway there! 🚀",
      "Almost done! 🎯",
      "You've got this! 💫",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const handleLongPress = useCallback((action: () => void) => {
    let pressTimer: NodeJS.Timeout;

    const start = () => {
      pressTimer = setTimeout(() => {
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        action();
      }, 500);
    };

    const cancel = () => {
      clearTimeout(pressTimer);
    };

    return { start, cancel };
  }, []);

  const strokeDasharray = 2 * Math.PI * 90; // circumference for r=90
  const strokeDashoffset = strokeDasharray - progress * strokeDasharray;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg">
      {/* Encouragement Message */}
      {showEncouragement && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="absolute -top-12 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg z-10"
        >
          {getEncouragementMessage()}
        </motion.div>
      )}

      {/* Timer Circle */}
      <div className="relative mb-6">
        <motion.div style={{ scale }} className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r="90"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="transparent"
            />

            {/* Progress circle */}
            <motion.circle
              ref={circleRef}
              cx="100"
              cy="100"
              r="90"
              stroke={
                isOvertime
                  ? "#ef4444"
                  : isNearCompletion
                    ? "#f59e0b"
                    : "#3b82f6"
              }
              strokeWidth="8"
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300"
              style={{
                filter:
                  isActive && !isPaused
                    ? "drop-shadow(0 0 8px currentColor)"
                    : "none",
              }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              animate={{
                scale: isActive && !isPaused ? [1, 1.05, 1] : 1,
                color: isOvertime ? "#ef4444" : "#1f2937",
              }}
              transition={{
                scale: { duration: 1, repeat: Infinity },
                color: { duration: 0.3 },
              }}
              className="text-3xl font-bold mb-1"
            >
              {formatTime(elapsedSeconds)}
            </motion.div>

            <div className="text-sm text-gray-600 text-center">
              <div>Target: {estimatedMinutes}m</div>
              <div
                className={`text-xs ${isOvertime ? "text-red-600" : "text-gray-500"}`}
              >
                {isOvertime ? "Overtime!" : `${Math.round(progressPercent)}%`}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Status Indicator */}
      <div className="mb-6 text-center">
        <motion.div
          animate={{
            scale: isActive && !isPaused ? [1, 1.1, 1] : 1,
          }}
          transition={{ duration: 1, repeat: Infinity }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            !isActive
              ? "bg-gray-100 text-gray-600"
              : isPaused
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              !isActive
                ? "bg-gray-400"
                : isPaused
                  ? "bg-yellow-400"
                  : "bg-green-400 animate-pulse"
            }`}
          />
          {!isActive ? "Ready to start" : isPaused ? "Paused" : "Working..."}
        </motion.div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-4">
        {!isActive ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="btn btn-primary btn-lg rounded-full w-20 h-20 text-2xl shadow-lg"
          >
            ▶️
          </motion.button>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isPaused ? onStart : onPause}
              className={`btn btn-lg rounded-full w-16 h-16 text-xl shadow-lg ${
                isPaused ? "btn-primary" : "btn-warning"
              }`}
            >
              {isPaused ? "▶️" : "⏸️"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              {...handleLongPress(onStop)}
              onTouchStart={(e) => handleLongPress(onStop).start()}
              onTouchEnd={(e) => handleLongPress(onStop).cancel()}
              onMouseDown={(e) => handleLongPress(onStop).start()}
              onMouseUp={(e) => handleLongPress(onStop).cancel()}
              onMouseLeave={(e) => handleLongPress(onStop).cancel()}
              className="btn btn-ghost btn-lg rounded-full w-16 h-16 text-xl"
              title="Hold to stop"
            >
              ⏹️
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className="btn btn-success btn-lg rounded-full w-16 h-16 text-xl shadow-lg"
            >
              ✅
            </motion.button>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-center text-gray-500 space-y-1">
        {!isActive && <div>Tap ▶️ to start the timer</div>}
        {isActive && (
          <>
            <div>Tap ⏸️ to pause • ✅ to complete</div>
            <div>Hold ⏹️ to stop timer</div>
          </>
        )}
      </div>

      {/* Overtime Warning */}
      {isOvertime && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center"
        >
          <div className="text-red-600 text-sm font-medium mb-1">
            ⏰ Over estimated time
          </div>
          <div className="text-red-500 text-xs">
            Take your time! Quality matters more than speed 💪
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TouchFriendlyTimer;
