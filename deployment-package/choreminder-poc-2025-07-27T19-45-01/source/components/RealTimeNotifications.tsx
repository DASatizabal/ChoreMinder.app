"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";

interface Notification {
  id: string;
  type:
    | "chore_assigned"
    | "chore_approved"
    | "chore_rejected"
    | "points_awarded"
    | "badge_earned"
    | "family_member_joined"
    | "reminder"
    | "encouragement";
  title: string;
  message: string;
  icon: string;
  priority: "low" | "medium" | "high" | "urgent";
  read: boolean;
  timestamp: string;
  actionUrl?: string;
  actionText?: string;
  data?: any;
}

interface RealTimeNotificationsProps {
  familyId: string;
  userId: string;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  enableSound?: boolean;
  enableBrowserNotifications?: boolean;
}

const RealTimeNotifications = ({
  familyId,
  userId,
  position = "top-right",
  enableSound = true,
  enableBrowserNotifications = true,
}: RealTimeNotificationsProps) => {
  const { data: session } = useSession();
  const { events } = useRealTimeUpdates({
    familyId,
    enablePolling: true,
    pollingInterval: 5000,
    onEvent: handleNewEvent,
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [browserPermission, setBrowserPermission] =
    useState<NotificationPermission>("default");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationRef = useRef<string>("");

  useEffect(() => {
    // Request browser notification permission
    if (enableBrowserNotifications && "Notification" in window) {
      setBrowserPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(setBrowserPermission);
      }
    }

    // Initialize audio for sound notifications
    if (enableSound) {
      audioRef.current = new Audio("/sounds/notification.mp3");
      audioRef.current.volume = 0.3;
    }

    // Load existing notifications
    loadNotifications();
  }, [enableBrowserNotifications, enableSound, userId]);

  function handleNewEvent(event: any) {
    // Don't show notifications for our own actions
    if (event.userId === session?.user?.id) return;

    const notification = createNotificationFromEvent(event);
    if (notification) {
      addNotification(notification);

      // Show browser notification
      if (enableBrowserNotifications && browserPermission === "granted") {
        showBrowserNotification(notification);
      }

      // Play sound
      if (enableSound && audioRef.current) {
        audioRef.current.play().catch(() => {
          // Ignore autoplay restrictions
        });
      }

      // Show toast notification
      showToastNotification(notification);
    }
  }

  const createNotificationFromEvent = (event: any): Notification | null => {
    const timestamp = new Date().toISOString();

    switch (event.type) {
      case "chore_assigned":
        // Only notify if chore is assigned to current user
        if (event.data.assignedToId !== userId) return null;
        return {
          id: `${event.id}-assigned`,
          type: "chore_assigned",
          title: "New Chore Assigned! 📋",
          message: `${event.userName} assigned you "${event.data.choreTitle}"`,
          icon: "📋",
          priority: "medium",
          read: false,
          timestamp,
          actionUrl: `/chores/${event.data.choreId}`,
          actionText: "View Chore",
          data: event.data,
        };

      case "chore_approved":
        // Only notify if it's current user's chore
        if (event.data.childId !== userId) return null;
        return {
          id: `${event.id}-approved`,
          type: "chore_approved",
          title: "Chore Approved! ⭐",
          message: `Great job! You earned ${event.data.points} points for "${event.data.choreTitle}"`,
          icon: "⭐",
          priority: "high",
          read: false,
          timestamp,
          actionUrl: `/dashboard`,
          actionText: "View Progress",
          data: event.data,
        };

      case "chore_rejected":
        // Only notify if it's current user's chore
        if (event.data.childId !== userId) return null;
        return {
          id: `${event.id}-rejected`,
          type: "chore_rejected",
          title: "Chore Needs Revision 🔄",
          message: `"${event.data.choreTitle}" needs some adjustments. Check the feedback!`,
          icon: "🔄",
          priority: "medium",
          read: false,
          timestamp,
          actionUrl: `/chores/${event.data.choreId}`,
          actionText: "View Feedback",
          data: event.data,
        };

      case "badge_earned":
        // Notify everyone about badge achievements
        return {
          id: `${event.id}-badge`,
          type: "badge_earned",
          title: "Badge Earned! 🎖️",
          message: `${event.userName} earned the "${event.data.badgeName}" badge!`,
          icon: "🎖️",
          priority: event.userId === userId ? "high" : "low",
          read: false,
          timestamp,
          actionUrl: `/achievements`,
          actionText: "View Achievements",
          data: event.data,
        };

      case "member_joined":
        return {
          id: `${event.id}-joined`,
          type: "family_member_joined",
          title: "New Family Member! 👋",
          message: `${event.userName} joined your family!`,
          icon: "👋",
          priority: "medium",
          read: false,
          timestamp,
          data: event.data,
        };

      default:
        return null;
    }
  };

  const addNotification = (notification: Notification) => {
    // Avoid duplicate notifications
    if (lastNotificationRef.current === notification.id) return;
    lastNotificationRef.current = notification.id;

    setNotifications((prev) => {
      const updated = [notification, ...prev];
      // Keep only last 50 notifications
      return updated.slice(0, 50);
    });

    setUnreadCount((prev) => prev + 1);

    // Save to localStorage
    saveNotifications([notification, ...notifications.slice(0, 49)]);
  };

  const showBrowserNotification = (notification: Notification) => {
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      tag: notification.id,
      requireInteraction: notification.priority === "urgent",
      silent: !enableSound,
    });

    browserNotification.onclick = () => {
      if (notification.actionUrl) {
        window.focus();
        window.location.href = notification.actionUrl;
      }
      browserNotification.close();
    };

    // Auto-close after 5 seconds for non-urgent notifications
    if (notification.priority !== "urgent") {
      setTimeout(() => browserNotification.close(), 5000);
    }
  };

  const showToastNotification = (notification: Notification) => {
    const toastConfig = {
      duration: notification.priority === "urgent" ? 8000 : 4000,
      position: position as any,
      style: {
        background: getPriorityColor(notification.priority).bg,
        color: getPriorityColor(notification.priority).text,
        border: `2px solid ${getPriorityColor(notification.priority).border}`,
      },
    };

    toast(
      <div className="flex items-start gap-3">
        <span className="text-2xl">{notification.icon}</span>
        <div className="flex-1">
          <div className="font-semibold">{notification.title}</div>
          <div className="text-sm opacity-90">{notification.message}</div>
          {notification.actionText && notification.actionUrl && (
            <button
              onClick={() => (window.location.href = notification.actionUrl!)}
              className="text-xs underline mt-1 opacity-75 hover:opacity-100"
            >
              {notification.actionText}
            </button>
          )}
        </div>
      </div>,
      toastConfig,
    );
  };

  const loadNotifications = async () => {
    try {
      // Load from localStorage first
      const stored = localStorage.getItem(`notifications-${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n: Notification) => !n.read).length);
      }

      // Then fetch from server
      const response = await fetch(`/api/users/${userId}/notifications`);
      if (response.ok) {
        const serverNotifications = await response.json();
        setNotifications(serverNotifications);
        setUnreadCount(
          serverNotifications.filter((n: Notification) => !n.read).length,
        );
        saveNotifications(serverNotifications);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const saveNotifications = (notifs: Notification[]) => {
    localStorage.setItem(`notifications-${userId}`, JSON.stringify(notifs));
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      );
      saveNotifications(updated);
      return updated;
    });
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem(`notifications-${userId}`);
  };

  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "urgent":
        return { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" };
      case "high":
        return { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" };
      case "medium":
        return { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" };
      case "low":
        return { bg: "#F3F4F6", text: "#374151", border: "#D1D5DB" };
      default:
        return { bg: "#F3F4F6", text: "#374151", border: "#D1D5DB" };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setShowNotificationPanel(!showNotificationPanel)}
          className="btn btn-ghost btn-circle relative"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </button>

        {/* Notification Panel */}
        {showNotificationPanel && (
          <div className="absolute right-0 top-12 w-80 max-h-96 bg-white rounded-lg shadow-2xl border-2 border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-3xl mb-2">🔕</div>
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <span className="text-lg flex-shrink-0">
                        {notification.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4
                            className={`text-sm font-medium ${
                              !notification.read
                                ? "text-gray-900"
                                : "text-gray-700"
                            }`}
                          >
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {notification.actionText && (
                          <p className="text-xs text-blue-600 mt-1">
                            {notification.actionText} →
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
                <button className="text-xs text-blue-600 hover:text-blue-800">
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showNotificationPanel && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotificationPanel(false)}
        />
      )}
    </>
  );
};

export default RealTimeNotifications;
