"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

interface MobileChoreCardProps {
  chore: ChoreData;
  onComplete: (chore: ChoreData) => void;
  onEdit: (chore: ChoreData) => void;
  onDelete: (chore: ChoreData) => void;
  onSwipeAction?: (
    action: "complete" | "edit" | "delete",
    chore: ChoreData,
  ) => void;
}

interface ChoreData {
  _id: string;
  title: string;
  description?: string;
  category: string;
  priority: "low" | "medium" | "high";
  points: number;
  estimatedMinutes: number;
  requiresPhotoVerification: boolean;
  status: "pending" | "in_progress" | "completed" | "approved" | "rejected";
  assignedTo: {
    _id: string;
    name: string;
  };
  assignedBy: {
    _id: string;
    name: string;
  };
  dueDate?: string;
}

const MobileChoreCard = ({
  chore,
  onComplete,
  onEdit,
  onDelete,
  onSwipeAction,
}: MobileChoreCardProps) => {
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(false);

  const x = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Transform values for swipe actions
  const completeOpacity = useTransform(x, [0, 100], [0, 1]);
  const editOpacity = useTransform(x, [-100, 0], [1, 0]);
  const deleteOpacity = useTransform(x, [-200, -100], [1, 0]);

  const background = useTransform(
    x,
    [-200, -100, 0, 100],
    ["#ef4444", "#f59e0b", "#ffffff", "#10b981"],
  );

  useEffect(() => {
    if (hapticFeedback && navigator.vibrate) {
      navigator.vibrate(10);
      setHapticFeedback(false);
    }
  }, [hapticFeedback]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    setIsDragging(false);
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Determine action based on swipe distance and velocity
    if (offset > 80 || velocity > 500) {
      // Swipe right - Complete
      setHapticFeedback(true);
      onSwipeAction?.("complete", chore);
      onComplete(chore);
      toast.success("🎉 Chore marked as complete!", {
        duration: 2000,
        position: "bottom-center",
      });
    } else if (offset < -80 && offset > -160) {
      // Swipe left (short) - Edit
      setHapticFeedback(true);
      onSwipeAction?.("edit", chore);
      onEdit(chore);
    } else if (offset < -160 || velocity < -500) {
      // Swipe left (far) - Delete
      setHapticFeedback(true);
      onSwipeAction?.("delete", chore);
      onDelete(chore);
    }

    // Reset position
    x.set(0);
  };

  const getPriorityColor = () => {
    switch (chore.priority) {
      case "high":
        return "border-red-300 bg-red-50";
      case "medium":
        return "border-yellow-300 bg-yellow-50";
      case "low":
        return "border-green-300 bg-green-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  const getStatusColor = () => {
    switch (chore.status) {
      case "completed":
        return "text-green-600";
      case "approved":
        return "text-blue-600";
      case "rejected":
        return "text-red-600";
      case "in_progress":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = () => {
    switch (chore.status) {
      case "completed":
        return "✅";
      case "approved":
        return "⭐";
      case "rejected":
        return "❌";
      case "in_progress":
        return "⏳";
      default:
        return "📋";
    }
  };

  const formatTimeEstimate = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isOverdue = () => {
    if (!chore.dueDate) return false;
    return new Date(chore.dueDate) < new Date() && chore.status === "pending";
  };

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
    >
      {/* Swipe Action Backgrounds */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-6 bg-green-500 rounded-xl"
        style={{ opacity: completeOpacity }}
      >
        <div className="text-white text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">✅</span>
          Complete
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-start pl-6 bg-amber-500 rounded-xl"
        style={{ opacity: editOpacity }}
      >
        <div className="text-white text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">✏️</span>
          Edit
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-start pl-6 bg-red-500 rounded-xl"
        style={{ opacity: deleteOpacity }}
      >
        <div className="text-white text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🗑️</span>
          Delete
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div
        ref={cardRef}
        drag="x"
        dragConstraints={{ left: -250, right: 150 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x, background }}
        className={`card shadow-lg border-2 cursor-pointer transition-all duration-200 ${getPriorityColor()} ${
          isDragging ? "shadow-xl scale-105" : "hover:shadow-md"
        } ${isOverdue() ? "ring-2 ring-red-400 animate-pulse" : ""}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          className="card-body p-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getStatusIcon()}</span>
                <h3 className="font-bold text-lg text-gray-900 truncate">
                  {chore.title}
                </h3>
                {isOverdue() && (
                  <span className="badge badge-error badge-sm text-xs">
                    Overdue
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className={`font-medium ${getStatusColor()}`}>
                  {chore.status.replace("_", " ").toUpperCase()}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-base">⏱️</span>
                  {formatTimeEstimate(chore.estimatedMinutes)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-base">🏆</span>
                  {chore.points}
                </span>
              </div>
            </div>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-400 text-xl ml-2"
            >
              ⌄
            </motion.div>
          </div>

          {/* Category and Priority Tags */}
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-outline badge-sm">
              {chore.category}
            </span>
            <span
              className={`badge badge-sm ${
                chore.priority === "high"
                  ? "badge-error"
                  : chore.priority === "medium"
                    ? "badge-warning"
                    : "badge-success"
              }`}
            >
              {chore.priority.toUpperCase()}
            </span>
            {chore.requiresPhotoVerification && (
              <span className="badge badge-info badge-sm">
                📸 Photo Required
              </span>
            )}
          </div>

          {/* Expanded Content */}
          <motion.div
            initial={false}
            animate={{
              height: isExpanded ? "auto" : 0,
              opacity: isExpanded ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {chore.description && (
              <div className="mb-4">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {chore.description}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Assigned by:</span>
                <span className="font-medium">{chore.assignedBy.name}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Assigned to:</span>
                <span className="font-medium">{chore.assignedTo.name}</span>
              </div>

              {chore.dueDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Due date:</span>
                  <span
                    className={`font-medium ${isOverdue() ? "text-red-600" : ""}`}
                  >
                    {new Date(chore.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons for Expanded View */}
            <div className="flex gap-2 mt-4">
              {chore.status === "pending" &&
                chore.assignedTo._id === session?.user?.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete(chore);
                    }}
                    className="btn btn-success btn-sm flex-1"
                  >
                    ✅ Start
                  </button>
                )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(chore);
                }}
                className="btn btn-ghost btn-sm"
              >
                ✏️ Edit
              </button>

              {session?.user?.id === chore.assignedBy._id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(chore);
                  }}
                  className="btn btn-error btn-sm"
                >
                  🗑️
                </button>
              )}
            </div>
          </motion.div>

          {/* Swipe Hint */}
          {!isDragging && chore.status === "pending" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1, duration: 2 }}
              className="text-xs text-gray-400 text-center mt-2"
            >
              ← Swipe to edit/delete • Swipe to complete →
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MobileChoreCard;
