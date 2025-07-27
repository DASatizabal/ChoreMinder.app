"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";

interface ActivityFeedProps {
  familyId: string;
  maxItems?: number;
  showFilters?: boolean;
  compact?: boolean;
}

interface ActivityItem {
  id: string;
  type:
    | "chore_assigned"
    | "chore_completed"
    | "chore_approved"
    | "chore_rejected"
    | "member_joined"
    | "points_awarded"
    | "badge_earned"
    | "level_up"
    | "streak_achieved";
  familyId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  data: any;
  timestamp: string;
  isRead?: boolean;
}

const LiveActivityFeed = ({
  familyId,
  maxItems = 20,
  showFilters = true,
  compact = false,
}: ActivityFeedProps) => {
  const { data: session } = useSession();
  const { events, isConnected, connectionStatus } = useRealTimeUpdates({
    familyId,
    enablePolling: true,
    pollingInterval: 8000,
  });

  const [filter, setFilter] = useState<
    "all" | "chores" | "achievements" | "family"
  >("all");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  useEffect(() => {
    // Convert real-time events to activity items
    const activityItems = events.map((event) => ({
      id: event.id,
      type: event.type,
      familyId: event.familyId,
      userId: event.userId,
      userName: event.userName,
      userAvatar: getAvatarForUser(event.userId),
      data: event.data,
      timestamp: event.timestamp,
      isRead: false,
    }));

    setActivities(activityItems);
  }, [events]);

  const getAvatarForUser = (userId: string): string => {
    // Generate a consistent avatar based on user ID
    const avatars = ["🧑", "👩", "👨", "🧒", "👧", "👦", "👴", "👵"];
    const hash = userId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return avatars[Math.abs(hash) % avatars.length];
  };

  const getActivityIcon = (type: ActivityItem["type"]): string => {
    switch (type) {
      case "chore_assigned":
        return "📋";
      case "chore_completed":
        return "✅";
      case "chore_approved":
        return "⭐";
      case "chore_rejected":
        return "❌";
      case "member_joined":
        return "👋";
      case "points_awarded":
        return "🏆";
      case "badge_earned":
        return "🎖️";
      case "level_up":
        return "⬆️";
      case "streak_achieved":
        return "🔥";
      default:
        return "📄";
    }
  };

  const getActivityColor = (type: ActivityItem["type"]): string => {
    switch (type) {
      case "chore_assigned":
        return "border-blue-200 bg-blue-50";
      case "chore_completed":
        return "border-green-200 bg-green-50";
      case "chore_approved":
        return "border-yellow-200 bg-yellow-50";
      case "chore_rejected":
        return "border-red-200 bg-red-50";
      case "member_joined":
        return "border-purple-200 bg-purple-50";
      case "points_awarded":
        return "border-orange-200 bg-orange-50";
      case "badge_earned":
        return "border-pink-200 bg-pink-50";
      case "level_up":
        return "border-indigo-200 bg-indigo-50";
      case "streak_achieved":
        return "border-red-200 bg-red-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const formatActivityMessage = (
    activity: ActivityItem,
  ): { primary: string; secondary?: string } => {
    const isCurrentUser = activity.userId === session?.user?.id;
    const userName = isCurrentUser ? "You" : activity.userName;

    switch (activity.type) {
      case "chore_assigned":
        return {
          primary: `${userName} assigned "${activity.data.choreTitle}"`,
          secondary: activity.data.assignedToName
            ? `to ${activity.data.assignedToName}`
            : undefined,
        };

      case "chore_completed":
        return {
          primary: `${userName} completed "${activity.data.choreTitle}"`,
          secondary: activity.data.timeSpent
            ? `in ${activity.data.timeSpent} minutes`
            : undefined,
        };

      case "chore_approved":
        return {
          primary: `${activity.data.childName} earned ${activity.data.points} points!`,
          secondary: `for completing "${activity.data.choreTitle}"`,
        };

      case "chore_rejected":
        return {
          primary: `"${activity.data.choreTitle}" needs revision`,
          secondary: activity.data.reason
            ? `Reason: ${activity.data.reason}`
            : undefined,
        };

      case "member_joined":
        return {
          primary: `${userName} joined the family!`,
          secondary: "Welcome to ChoreMinder! 🎉",
        };

      case "points_awarded":
        return {
          primary: `${userName} earned ${activity.data.points} points!`,
          secondary: activity.data.reason || undefined,
        };

      case "badge_earned":
        return {
          primary: `${userName} earned "${activity.data.badgeName}"`,
          secondary: "New achievement unlocked! 🏆",
        };

      case "level_up":
        return {
          primary: `${userName} reached Level ${activity.data.level}!`,
          secondary: "Getting stronger every day! 💪",
        };

      case "streak_achieved":
        return {
          primary: `${userName} has a ${activity.data.streakDays}-day streak!`,
          secondary: "On fire! 🔥",
        };

      default:
        return { primary: "Unknown activity" };
    }
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return activityTime.toLocaleDateString();
  };

  const filteredActivities = activities
    .filter((activity) => {
      if (filter === "all") return true;
      if (filter === "chores")
        return [
          "chore_assigned",
          "chore_completed",
          "chore_approved",
          "chore_rejected",
        ].includes(activity.type);
      if (filter === "achievements")
        return [
          "points_awarded",
          "badge_earned",
          "level_up",
          "streak_achieved",
        ].includes(activity.type);
      if (filter === "family") return ["member_joined"].includes(activity.type);
      return true;
    })
    .slice(0, maxItems);

  const getFilterCount = (filterType: typeof filter): number => {
    if (filterType === "all") return activities.length;
    if (filterType === "chores")
      return activities.filter((a) =>
        [
          "chore_assigned",
          "chore_completed",
          "chore_approved",
          "chore_rejected",
        ].includes(a.type),
      ).length;
    if (filterType === "achievements")
      return activities.filter((a) =>
        [
          "points_awarded",
          "badge_earned",
          "level_up",
          "streak_achieved",
        ].includes(a.type),
      ).length;
    if (filterType === "family")
      return activities.filter((a) => ["member_joined"].includes(a.type))
        .length;
    return 0;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Connection Status */}
        {showOnlineStatus && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
            />
            <span>{isConnected ? "Live" : "Offline"}</span>
          </div>
        )}

        {/* Compact Activity List */}
        <div className="space-y-2">
          {filteredActivities.slice(0, 5).map((activity) => {
            const message = formatActivityMessage(activity);
            return (
              <div
                key={activity.id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-lg">
                  {getActivityIcon(activity.type)}
                </span>
                <span className="flex-1 truncate">{message.primary}</span>
                <span className="text-xs text-gray-400">
                  {getTimeAgo(activity.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-white shadow-lg border-2 border-primary/20">
      <div className="card-body p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-primary flex items-center gap-2">
            📡 Family Activity
            {isConnected && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </h3>

          {/* Connection Status */}
          <div className="text-xs text-gray-500">
            {isConnected ? (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live updates
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                Connecting...
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: "all", label: "All", emoji: "📊" },
              { key: "chores", label: "Chores", emoji: "📋" },
              { key: "achievements", label: "Achievements", emoji: "🏆" },
              { key: "family", label: "Family", emoji: "👨‍👩‍👧‍👦" },
            ].map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`btn btn-sm ${
                  filter === key ? "btn-primary" : "btn-ghost"
                }`}
              >
                <span className="mr-1">{emoji}</span>
                {label}
                <span className="badge badge-xs ml-1">
                  {getFilterCount(key as typeof filter)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Activity Feed */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>No activities yet</p>
              <p className="text-sm">
                Family activities will appear here in real-time
              </p>
            </div>
          ) : (
            filteredActivities.map((activity) => {
              const message = formatActivityMessage(activity);
              const isCurrentUser = activity.userId === session?.user?.id;

              return (
                <div
                  key={activity.id}
                  className={`flex gap-3 p-3 rounded-lg border-2 transition-all ${getActivityColor(activity.type)} ${
                    isCurrentUser ? "ring-2 ring-primary/20" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                      {activity.userAvatar || getAvatarForUser(activity.userId)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {getActivityIcon(activity.type)}
                          </span>
                          <p className="font-medium text-gray-900 text-sm">
                            {message.primary}
                          </p>
                        </div>
                        {message.secondary && (
                          <p className="text-xs text-gray-600">
                            {message.secondary}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {getTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {activities.length > maxItems && (
          <div className="text-center mt-4">
            <button className="btn btn-ghost btn-sm">
              View All Activities ({activities.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveActivityFeed;
