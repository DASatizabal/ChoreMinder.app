"use client";

import { useSession } from "next-auth/react";
import React, { useState, useEffect, useCallback } from "react";

import { createNotification } from "@/components/NotificationSystem";

interface UseNotificationsProps {
  familyId: string;
  enableAutoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface NotificationTrigger {
  choreId: string;
  type:
    | "assigned"
    | "accepted"
    | "declined"
    | "in_progress"
    | "completed"
    | "photo_submitted"
    | "photo_approved"
    | "photo_rejected";
  targetUserId?: string;
  metadata?: {
    choreName?: string;
    points?: number;
    reason?: string;
    photoUrl?: string;
    dueDate?: string;
  };
}

export const useNotifications = ({
  familyId,
  enableAutoRefresh = true,
  refreshInterval = 30000,
}: UseNotificationsProps) => {
  const { data: session } = useSession();
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger workflow notifications based on chore lifecycle events
  const triggerWorkflowNotification = useCallback(
    async ({
      choreId,
      type,
      targetUserId,
      metadata = {},
    }: NotificationTrigger) => {
      if (!session?.user?.id || !familyId) {
        console.warn("Missing session or family context for notification");
        return false;
      }

      setIsTriggering(true);
      setError(null);

      try {
        // Determine notification type mapping
        const notificationTypeMap = {
          assigned: "chore_assigned",
          accepted: "chore_accepted",
          declined: "chore_declined",
          in_progress: "chore_in_progress",
          completed: "chore_completed",
          photo_submitted: "photo_submitted",
          photo_approved: "photo_approved",
          photo_rejected: "photo_rejected",
        };

        const notificationType = notificationTypeMap[type];
        if (!notificationType) {
          throw new Error(`Unknown notification type: ${type}`);
        }

        // Create the notification
        await createNotification(
          notificationType as any,
          choreId,
          familyId,
          session.user.id,
          targetUserId || session.user.id,
          metadata,
        );

        console.log(`Notification triggered: ${type} for chore ${choreId}`);
        return true;
      } catch (error) {
        console.error("Failed to trigger workflow notification:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to send notification",
        );
        return false;
      } finally {
        setIsTriggering(false);
      }
    },
    [session?.user?.id, familyId],
  );

  // Convenience methods for specific workflow stages
  const notifyChoreAssigned = useCallback(
    (
      choreId: string,
      childUserId: string,
      choreName: string,
      points: number,
    ) => {
      return triggerWorkflowNotification({
        choreId,
        type: "assigned",
        targetUserId: childUserId,
        metadata: { choreName, points },
      });
    },
    [triggerWorkflowNotification],
  );

  const notifyChoreAccepted = useCallback(
    (choreId: string, parentUserId: string, choreName: string) => {
      return triggerWorkflowNotification({
        choreId,
        type: "accepted",
        targetUserId: parentUserId,
        metadata: { choreName },
      });
    },
    [triggerWorkflowNotification],
  );

  const notifyChoreDeclined = useCallback(
    (
      choreId: string,
      parentUserId: string,
      choreName: string,
      reason: string,
    ) => {
      return triggerWorkflowNotification({
        choreId,
        type: "declined",
        targetUserId: parentUserId,
        metadata: { choreName, reason },
      });
    },
    [triggerWorkflowNotification],
  );

  const notifyChoreInProgress = useCallback(
    (choreId: string, parentUserId: string, choreName: string) => {
      return triggerWorkflowNotification({
        choreId,
        type: "in_progress",
        targetUserId: parentUserId,
        metadata: { choreName },
      });
    },
    [triggerWorkflowNotification],
  );

  const notifyChoreCompleted = useCallback(
    (
      choreId: string,
      parentUserId: string,
      choreName: string,
      points: number,
    ) => {
      return triggerWorkflowNotification({
        choreId,
        type: "completed",
        targetUserId: parentUserId,
        metadata: { choreName, points },
      });
    },
    [triggerWorkflowNotification],
  );

  const notifyPhotoSubmitted = useCallback(
    (
      choreId: string,
      parentUserId: string,
      choreName: string,
      photoUrl: string,
    ) => {
      return triggerWorkflowNotification({
        choreId,
        type: "photo_submitted",
        targetUserId: parentUserId,
        metadata: { choreName, photoUrl },
      });
    },
    [triggerWorkflowNotification],
  );

  const notifyPhotoApproved = useCallback(
    (
      choreId: string,
      childUserId: string,
      choreName: string,
      points: number,
    ) => {
      return triggerWorkflowNotification({
        choreId,
        type: "photo_approved",
        targetUserId: childUserId,
        metadata: { choreName, points },
      });
    },
    [triggerWorkflowNotification],
  );

  const notifyPhotoRejected = useCallback(
    (
      choreId: string,
      childUserId: string,
      choreName: string,
      reason: string,
    ) => {
      return triggerWorkflowNotification({
        choreId,
        type: "photo_rejected",
        targetUserId: childUserId,
        metadata: { choreName, reason },
      });
    },
    [triggerWorkflowNotification],
  );

  return {
    // Core functionality
    triggerWorkflowNotification,
    isTriggering,
    error,

    // Convenience methods for workflow stages
    notifyChoreAssigned,
    notifyChoreAccepted,
    notifyChoreDeclined,
    notifyChoreInProgress,
    notifyChoreCompleted,
    notifyPhotoSubmitted,
    notifyPhotoApproved,
    notifyPhotoRejected,

    // Clear error
    clearError: () => setError(null),
  };
};

// Higher-order component to automatically trigger notifications
export function withNotifications<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  familyId: string,
) {
  return function NotificationWrappedComponent(props: T) {
    const notifications = useNotifications({ familyId });

    return <Component {...props} notifications={notifications} />;
  };
}

export default useNotifications;
