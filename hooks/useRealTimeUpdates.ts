"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";

interface RealTimeEvent {
  id: string;
  type:
    | "chore_assigned"
    | "chore_completed"
    | "chore_approved"
    | "chore_rejected"
    | "member_joined"
    | "points_awarded"
    | "badge_earned";
  familyId: string;
  userId: string;
  userName: string;
  data: any;
  timestamp: string;
}

interface UseRealTimeUpdatesOptions {
  familyId?: string;
  enablePolling?: boolean;
  enableWebSocket?: boolean;
  pollingInterval?: number;
  onEvent?: (event: RealTimeEvent) => void;
}

export const useRealTimeUpdates = (options: UseRealTimeUpdatesOptions = {}) => {
  const { data: session } = useSession();
  const {
    familyId,
    enablePolling = true,
    enableWebSocket = false, // Start with polling, WebSocket can be enabled later
    pollingInterval = 10000, // 10 seconds
    onEvent,
  } = options;

  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<
    "polling" | "websocket" | "none"
  >("none");

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  // Polling-based real-time updates
  const pollForUpdates = useCallback(async () => {
    if (!familyId || !session?.user?.id) return;

    try {
      const queryParams = new URLSearchParams();
      if (lastEventIdRef.current) {
        queryParams.append("since", lastEventIdRef.current);
      }

      const response = await fetch(
        `/api/families/${familyId}/events?${queryParams}`,
        {
          headers: {
            "Cache-Control": "no-cache",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch updates");

      const data = await response.json();
      const newEvents = data.events || [];

      if (newEvents.length > 0) {
        setEvents((prev) => {
          const combined = [...prev, ...newEvents];
          // Keep only last 50 events to prevent memory bloat
          return combined.slice(-50);
        });

        // Update last event ID for next poll
        const latestEvent = newEvents[newEvents.length - 1];
        if (latestEvent) {
          lastEventIdRef.current = latestEvent.id;
          setLastUpdateTime(new Date().toISOString());
        }

        // Trigger callbacks for each new event
        newEvents.forEach((event: RealTimeEvent) => {
          if (onEvent) onEvent(event);
          handleEventNotification(event);
        });
      }

      setIsConnected(true);
    } catch (error) {
      console.error("Error polling for updates:", error);
      setIsConnected(false);
    }
  }, [familyId, session?.user?.id, onEvent]);

  // WebSocket-based real-time updates
  const connectWebSocket = useCallback(() => {
    if (!familyId || !session?.user?.id || wsRef.current) return;

    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}/families/${familyId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setConnectionType("websocket");

        // Send authentication
        ws.send(
          JSON.stringify({
            type: "auth",
            token: session.user.id,
            familyId,
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const realTimeEvent: RealTimeEvent = JSON.parse(event.data);

          setEvents((prev) => {
            const updated = [...prev, realTimeEvent];
            return updated.slice(-50); // Keep last 50 events
          });

          if (onEvent) onEvent(realTimeEvent);
          handleEventNotification(realTimeEvent);
          setLastUpdateTime(new Date().toISOString());
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (enableWebSocket) connectWebSocket();
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Error connecting WebSocket:", error);
      setIsConnected(false);
    }
  }, [familyId, session?.user?.id, enableWebSocket, onEvent]);

  // Handle event notifications
  const handleEventNotification = (event: RealTimeEvent) => {
    // Don't show notifications for our own actions
    if (event.userId === session?.user?.id) return;

    const notificationConfig = getEventNotificationConfig(event);
    if (notificationConfig) {
      toast(notificationConfig.message, {
        icon: notificationConfig.icon,
        duration: 4000,
        position: "top-right",
        style: {
          background: notificationConfig.background,
          color: notificationConfig.color,
        },
      });
    }
  };

  const getEventNotificationConfig = (event: RealTimeEvent) => {
    switch (event.type) {
      case "chore_assigned":
        return {
          message: `${event.userName} assigned a new chore: ${event.data.choreTitle}`,
          icon: "📋",
          background: "#dbeafe",
          color: "#1e40af",
        };
      case "chore_completed":
        return {
          message: `🎉 ${event.userName} completed: ${event.data.choreTitle}`,
          icon: "✅",
          background: "#dcfce7",
          color: "#166534",
        };
      case "chore_approved":
        return {
          message: `${event.data.childName} earned ${event.data.points} points for ${event.data.choreTitle}!`,
          icon: "⭐",
          background: "#fef3c7",
          color: "#d97706",
        };
      case "points_awarded":
        return {
          message: `${event.userName} earned ${event.data.points} points!`,
          icon: "🏆",
          background: "#fef3c7",
          color: "#d97706",
        };
      case "badge_earned":
        return {
          message: `🎖️ ${event.userName} earned the "${event.data.badgeName}" badge!`,
          icon: "🎖️",
          background: "#fce7f3",
          color: "#be185d",
        };
      case "member_joined":
        return {
          message: `👋 ${event.userName} joined the family!`,
          icon: "👋",
          background: "#f0f9ff",
          color: "#0369a1",
        };
      default:
        return null;
    }
  };

  // Initialize connection
  useEffect(() => {
    if (!familyId || !session?.user?.id) return;

    if (enableWebSocket) {
      connectWebSocket();
      setConnectionType("websocket");
    } else if (enablePolling) {
      // Start polling immediately, then set interval
      pollForUpdates();
      pollingIntervalRef.current = setInterval(pollForUpdates, pollingInterval);
      setConnectionType("polling");
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [
    familyId,
    session?.user?.id,
    enablePolling,
    enableWebSocket,
    pollingInterval,
  ]);

  // Manual refresh function
  const refresh = useCallback(() => {
    if (connectionType === "polling") {
      pollForUpdates();
    } else if (connectionType === "websocket" && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "refresh" }));
    }
  }, [connectionType, pollForUpdates]);

  // Emit an event (for sending updates to other family members)
  const emitEvent = useCallback(
    async (
      eventData: Omit<
        RealTimeEvent,
        "id" | "timestamp" | "userId" | "userName"
      >,
    ) => {
      if (!familyId || !session?.user?.id) return;

      try {
        const response = await fetch(`/api/families/${familyId}/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...eventData,
            familyId,
            userId: session.user.id,
            userName: session.user.name || "Family Member",
          }),
        });

        if (!response.ok) throw new Error("Failed to emit event");

        // If using WebSocket, the event will come back through the socket
        // If using polling, it will be picked up on the next poll
      } catch (error) {
        console.error("Error emitting event:", error);
      }
    },
    [familyId, session?.user?.id, session?.user?.name],
  );

  // Get recent events by type
  const getEventsByType = useCallback(
    (type: RealTimeEvent["type"], limit = 10) => {
      return events
        .filter((event) => event.type === type)
        .slice(-limit)
        .reverse();
    },
    [events],
  );

  // Get events for a specific user
  const getEventsByUser = useCallback(
    (userId: string, limit = 10) => {
      return events
        .filter((event) => event.userId === userId)
        .slice(-limit)
        .reverse();
    },
    [events],
  );

  return {
    // State
    events,
    isConnected,
    lastUpdateTime,
    connectionType,

    // Actions
    refresh,
    emitEvent,

    // Utilities
    getEventsByType,
    getEventsByUser,

    // Connection info
    connectionStatus: {
      isConnected,
      type: connectionType,
      lastUpdate: lastUpdateTime,
      eventCount: events.length,
    },
  };
};
