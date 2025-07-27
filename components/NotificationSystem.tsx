"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

interface NotificationSystemProps {
  familyId: string;
  userId: string;
  userRole: "parent" | "child" | "admin";
  onNotificationAction?: (notificationId: string, action: string) => void;
  enableRealtime?: boolean;
}

interface Notification {
  id: string;
  type:
    | "chore_assigned"
    | "chore_accepted"
    | "chore_declined"
    | "chore_in_progress"
    | "chore_completed"
    | "photo_submitted"
    | "photo_approved"
    | "photo_rejected"
    | "reminder"
    | "escalation"
    | "system";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  choreId?: string;
  choreName?: string;
  fromUser?: {
    id: string;
    name: string;
    role: string;
  };
  toUser?: {
    id: string;
    name: string;
    role: string;
  };
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  actions?: Array<{
    id: string;
    label: string;
    type: "primary" | "secondary" | "success" | "warning" | "error";
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    data?: any;
  }>;
  expiresAt?: string;
  metadata?: {
    choreStage?: string;
    points?: number;
    dueDate?: string;
    photoUrl?: string;
    reason?: string;
  };
}

interface NotificationTemplate {
  type: Notification["type"];
  priority: Notification["priority"];
  title: string;
  message: string;
  actionRequired: boolean;
  actions?: Notification["actions"];
  autoExpire?: number; // minutes
}

const NotificationSystem = ({
  familyId,
  userId,
  userRole,
  onNotificationAction,
  enableRealtime = true,
}: NotificationSystemProps) => {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "action_required">(
    "all",
  );
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Notification templates for different workflow stages
  const notificationTemplates: Record<string, NotificationTemplate> = {
    chore_assigned: {
      type: "chore_assigned",
      priority: "medium",
      title: "New Chore Assigned! 📋",
      message: "You have a new chore: {choreName}. Worth {points} points!",
      actionRequired: true,
      actions: [
        {
          id: "accept",
          label: "Accept",
          type: "success",
          endpoint: "/api/chores/{choreId}/status",
          method: "PUT",
          data: { status: "in_progress" },
        },
        {
          id: "decline",
          label: "Can't Do Now",
          type: "warning",
          endpoint: "/api/chores/{choreId}/decline",
          method: "POST",
        },
      ],
      autoExpire: 1440, // 24 hours
    },
    chore_accepted: {
      type: "chore_accepted",
      priority: "medium",
      title: "Chore Accepted! 🚀",
      message: "{fromUser} accepted the chore: {choreName}",
      actionRequired: false,
      autoExpire: 60, // 1 hour
    },
    chore_declined: {
      type: "chore_declined",
      priority: "high",
      title: "Chore Declined 💬",
      message: "{fromUser} can't do {choreName} right now. Reason: {reason}",
      actionRequired: true,
      actions: [
        {
          id: "reassign",
          label: "Reassign",
          type: "primary",
          endpoint: "/api/chores/{choreId}/reassign",
          method: "POST",
        },
        {
          id: "modify",
          label: "Modify Chore",
          type: "secondary",
          endpoint: "/api/chores/{choreId}/edit",
          method: "GET",
        },
      ],
    },
    chore_in_progress: {
      type: "chore_in_progress",
      priority: "low",
      title: "Chore Started! 💪",
      message: "{fromUser} started working on {choreName}",
      actionRequired: false,
      autoExpire: 30,
    },
    chore_completed: {
      type: "chore_completed",
      priority: "medium",
      title: "Chore Completed! 🎉",
      message: "{fromUser} completed {choreName} and earned {points} points!",
      actionRequired: false,
      autoExpire: 120,
    },
    photo_submitted: {
      type: "photo_submitted",
      priority: "high",
      title: "Photo Submitted for Review 📸",
      message: "{fromUser} submitted a photo for {choreName}. Please review!",
      actionRequired: true,
      actions: [
        {
          id: "review",
          label: "Review Photo",
          type: "primary",
          endpoint: "/api/chores/{choreId}/photos/review",
          method: "GET",
        },
      ],
      autoExpire: 720, // 12 hours
    },
    photo_approved: {
      type: "photo_approved",
      priority: "medium",
      title: "Photo Approved! ⭐",
      message:
        "Great work! Your photo for {choreName} was approved. You earned {points} points!",
      actionRequired: false,
      autoExpire: 180,
    },
    photo_rejected: {
      type: "photo_rejected",
      priority: "high",
      title: "Photo Needs Improvement 📝",
      message: "Your photo for {choreName} needs improvement. {reason}",
      actionRequired: true,
      actions: [
        {
          id: "resubmit",
          label: "Take New Photo",
          type: "warning",
          endpoint: "/api/chores/{choreId}/photos/resubmit",
          method: "GET",
        },
      ],
      autoExpire: 360,
    },
    reminder: {
      type: "reminder",
      priority: "medium",
      title: "Friendly Reminder 🔔",
      message: "Don't forget about {choreName}! {timeLeft} remaining.",
      actionRequired: false,
      autoExpire: 120,
    },
    escalation: {
      type: "escalation",
      priority: "urgent",
      title: "Attention Required! ⚠️",
      message: "{choreName} is overdue. Please take action immediately.",
      actionRequired: true,
      actions: [
        {
          id: "intervene",
          label: "Take Action",
          type: "error",
          endpoint: "/api/chores/{choreId}/escalate",
          method: "POST",
        },
      ],
    },
  };

  useEffect(() => {
    loadNotifications();

    if (enableRealtime) {
      // Set up polling for notifications
      pollingRef.current = setInterval(loadNotifications, 30000); // Poll every 30 seconds

      // Set up WebSocket connection for real-time updates
      setupWebSocket();
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [familyId, userId]);

  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const setupWebSocket = () => {
    if (typeof window === "undefined") return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws/notifications?familyId=${familyId}&userId=${userId}`;

      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          handleNewNotification(notification);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socketRef.current.onclose = () => {
        // Reconnect after 5 seconds
        setTimeout(setupWebSocket, 5000);
      };
    } catch (error) {
      console.error("Failed to set up WebSocket:", error);
    }
  };

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/notifications?familyId=${familyId}&userId=${userId}&limit=50`,
      );

      if (!response.ok) throw new Error("Failed to load notifications");

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev.slice(0, 49)]); // Keep last 50

    // Show toast notification
    const template = notificationTemplates[notification.type];
    if (template) {
      showToastNotification(notification);
    }
  };

  const showToastNotification = (notification: Notification) => {
    const toastOptions = {
      duration:
        notification.priority === "urgent"
          ? 10000
          : notification.actionRequired
            ? 6000
            : 4000,
      icon: getNotificationIcon(notification.type),
      position: "top-right" as const,
    };

    const message = `${notification.title}\n${notification.message}`;

    switch (notification.priority) {
      case "urgent":
        toast.error(message, toastOptions);
        break;
      case "high":
        toast.error(message, toastOptions);
        break;
      case "medium":
        toast(message, toastOptions);
        break;
      case "low":
        toast.success(message, toastOptions);
        break;
      default:
        toast(message, toastOptions);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    const icons = {
      chore_assigned: "📋",
      chore_accepted: "✅",
      chore_declined: "💬",
      chore_in_progress: "💪",
      chore_completed: "🎉",
      photo_submitted: "📸",
      photo_approved: "⭐",
      photo_rejected: "📝",
      reminder: "🔔",
      escalation: "⚠️",
      system: "ℹ️",
    };
    return icons[type] || "📋";
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/mark-all-read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId, userId }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleNotificationAction = async (
    notification: Notification,
    action: Notification["actions"][0],
  ) => {
    try {
      // Interpolate variables in endpoint
      const endpoint = action.endpoint
        .replace("{choreId}", notification.choreId || "")
        .replace("{userId}", userId)
        .replace("{familyId}", familyId);

      const response = await fetch(endpoint, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        body: action.data ? JSON.stringify(action.data) : undefined,
      });

      if (!response.ok) throw new Error(`Action failed: ${action.label}`);

      // Mark notification as read
      await markAsRead(notification.id);

      // Call parent callback if provided
      if (onNotificationAction) {
        onNotificationAction(notification.id, action.id);
      }

      toast.success(`${action.label} completed successfully!`);

      // Refresh notifications
      loadNotifications();
    } catch (error) {
      console.error("Error handling notification action:", error);
      toast.error(`Failed to ${action.label.toLowerCase()}`);
    }
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case "unread":
        return notifications.filter((n) => !n.read);
      case "action_required":
        return notifications.filter((n) => n.actionRequired);
      default:
        return notifications;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  const getPriorityColor = (priority: Notification["priority"]) => {
    const colors = {
      low: "border-green-200 bg-green-50",
      medium: "border-blue-200 bg-blue-50",
      high: "border-orange-200 bg-orange-50",
      urgent: "border-red-200 bg-red-50",
    };
    return colors[priority];
  };

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="btn btn-ghost btn-circle relative"
        >
          <div className="text-xl">🔔</div>
          {unreadCount > 0 && (
            <div className="badge badge-error badge-sm absolute -top-1 -right-1 min-w-[1.25rem] h-5 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}
        </button>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 top-12 w-96 max-w-[90vw] bg-white rounded-lg shadow-2xl border-2 border-gray-200 z-50">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">Notifications</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  ✕
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`btn btn-xs ${filter === "all" ? "btn-primary" : "btn-ghost"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("unread")}
                  className={`btn btn-xs ${filter === "unread" ? "btn-primary" : "btn-ghost"}`}
                >
                  Unread ({notifications.filter((n) => !n.read).length})
                </button>
                <button
                  onClick={() => setFilter("action_required")}
                  className={`btn btn-xs ${filter === "action_required" ? "btn-primary" : "btn-ghost"}`}
                >
                  Action ({notifications.filter((n) => n.actionRequired).length}
                  )
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="btn btn-ghost btn-xs mt-2"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div className="loading loading-spinner loading-md"></div>
                  <p className="text-sm text-gray-600 mt-2">
                    Loading notifications...
                  </p>
                </div>
              ) : getFilteredNotifications().length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-4xl mb-2">🔔</div>
                  <p className="text-gray-600">No notifications</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {getFilteredNotifications().map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${getPriorityColor(
                        notification.priority,
                      )} ${!notification.read ? "bg-blue-50" : ""}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <h4 className="font-semibold text-sm">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.timestamp)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">
                        {notification.message}
                      </p>

                      {notification.choreId && (
                        <div className="text-xs text-gray-600 mb-3">
                          Chore: {notification.choreName}
                          {notification.metadata?.points && (
                            <span className="ml-2 badge badge-primary badge-xs">
                              {notification.metadata.points} pts
                            </span>
                          )}
                        </div>
                      )}

                      {notification.actions &&
                        notification.actions.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {notification.actions.map((action) => (
                              <button
                                key={action.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationAction(
                                    notification,
                                    action,
                                  );
                                }}
                                className={`btn btn-xs btn-${action.type}`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </>
  );
};

// Export notification creation helper
export const createNotification = async (
  type: Notification["type"],
  choreId: string,
  familyId: string,
  fromUserId: string,
  toUserId: string,
  metadata?: Notification["metadata"],
) => {
  try {
    const response = await fetch("/api/notifications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        choreId,
        familyId,
        fromUserId,
        toUserId,
        metadata,
      }),
    });

    if (!response.ok) throw new Error("Failed to create notification");

    return await response.json();
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

export default NotificationSystem;
