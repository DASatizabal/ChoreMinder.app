"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

interface ChoreWorkflowState {
  stage:
    | "created"
    | "assigned"
    | "accepted"
    | "in_progress"
    | "completed"
    | "photo_submitted"
    | "under_review"
    | "approved"
    | "rejected";
  chore: Chore | null;
  assignedChild: FamilyMember | null;
  notifications: WorkflowNotification[];
  errors: WorkflowError[];
  isProcessing: boolean;
}

interface Chore {
  _id: string;
  title: string;
  description?: string;
  instructions?: string;
  category?: string;
  status: "pending" | "in_progress" | "completed" | "verified" | "rejected";
  priority: "low" | "medium" | "high";
  points: number;
  dueDate?: string;
  estimatedMinutes?: number;
  requiresPhotoVerification: boolean;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  assignedBy: {
    _id: string;
    name: string;
  };
  photoVerification?: Array<{
    url: string;
    uploadedAt: string;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string;
    reviewedBy?: string;
    reviewedAt?: string;
  }>;
  history: Array<{
    action: string;
    timestamp: string;
    userId: string;
    details?: any;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface FamilyMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  role: "parent" | "child" | "admin";
}

interface WorkflowNotification {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  timestamp: string;
  stage: string;
  actionRequired?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    style: "primary" | "secondary" | "success" | "warning" | "error";
  }>;
}

interface WorkflowError {
  id: string;
  stage: string;
  error: string;
  details?: any;
  timestamp: string;
  resolved: boolean;
  retryAction?: () => void;
}

interface ChoreWorkflowProps {
  familyId: string;
  familyMembers: FamilyMember[];
  onWorkflowComplete: (chore: Chore) => void;
  onWorkflowError: (error: WorkflowError) => void;
  initialChore?: Chore;
  mode: "create" | "monitor" | "manage";
}

const ChoreWorkflow = ({
  familyId,
  familyMembers,
  onWorkflowComplete,
  onWorkflowError,
  initialChore,
  mode = "monitor",
}: ChoreWorkflowProps) => {
  const { data: session } = useSession();
  const [workflowState, setWorkflowState] = useState<ChoreWorkflowState>({
    stage: initialChore ? getChoreStage(initialChore) : "created",
    chore: initialChore || null,
    assignedChild: null,
    notifications: [],
    errors: [],
    isProcessing: false,
  });

  const workflowRef = useRef<{
    stageTimeouts: Map<string, NodeJS.Timeout>;
    notificationQueue: WorkflowNotification[];
  }>({
    stageTimeouts: new Map(),
    notificationQueue: [],
  });

  // Workflow stage mapping
  function getChoreStage(chore: Chore): ChoreWorkflowState["stage"] {
    if (!chore.assignedTo) return "created";

    switch (chore.status) {
      case "pending":
        return "assigned";
      case "in_progress":
        return "accepted";
      case "completed":
        if (chore.requiresPhotoVerification) {
          const hasPhoto =
            chore.photoVerification && chore.photoVerification.length > 0;
          if (!hasPhoto) return "completed";

          const latestPhoto =
            chore.photoVerification[chore.photoVerification.length - 1];
          if (latestPhoto.status === "pending") return "under_review";
          if (latestPhoto.status === "approved") return "approved";
          return "rejected";
        }
        return "completed";
      case "verified":
        return "approved";
      case "rejected":
        return "rejected";
      default:
        return "created";
    }
  }

  // Initialize workflow
  useEffect(() => {
    if (initialChore) {
      const stage = getChoreStage(initialChore);
      const assignedChild = familyMembers.find(
        (m) => m.user._id === initialChore.assignedTo?._id,
      );

      setWorkflowState((prev) => ({
        ...prev,
        stage,
        chore: initialChore,
        assignedChild: assignedChild || null,
      }));

      // Add initial notification
      addNotification({
        type: "info",
        title: "Chore Workflow Active",
        message: `Monitoring "${initialChore.title}" - Stage: ${stage}`,
        stage,
        actionRequired: false,
      });
    }
  }, [initialChore, familyMembers]);

  // Stage transition monitoring
  useEffect(() => {
    if (workflowState.chore) {
      monitorStageTransition(workflowState.stage);
    }
  }, [workflowState.stage, workflowState.chore]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      workflowRef.current.stageTimeouts.forEach((timeout) =>
        clearTimeout(timeout),
      );
    };
  }, []);

  const addNotification = (
    notification: Omit<WorkflowNotification, "id" | "timestamp">,
  ) => {
    const newNotification: WorkflowNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    setWorkflowState((prev) => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications.slice(0, 9)], // Keep last 10
    }));

    // Show toast notification
    const toastOptions = {
      duration: notification.actionRequired ? 8000 : 4000,
      icon: getNotificationIcon(notification.type),
    };

    switch (notification.type) {
      case "success":
        toast.success(notification.message, toastOptions);
        break;
      case "warning":
        toast.error(notification.message, toastOptions);
        break;
      case "error":
        toast.error(notification.message, toastOptions);
        break;
      default:
        toast(notification.message, toastOptions);
    }
  };

  const addError = (
    error: Omit<WorkflowError, "id" | "timestamp" | "resolved">,
  ) => {
    const newError: WorkflowError = {
      ...error,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    setWorkflowState((prev) => ({
      ...prev,
      errors: [newError, ...prev.errors],
    }));

    onWorkflowError(newError);
  };

  const getNotificationIcon = (type: WorkflowNotification["type"]) => {
    switch (type) {
      case "success":
        return "🎉";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "info":
        return "ℹ️";
      default:
        return "📋";
    }
  };

  const monitorStageTransition = (stage: ChoreWorkflowState["stage"]) => {
    // Set up stage-specific monitoring and timeouts
    const stageConfigs = {
      assigned: {
        timeout: 24 * 60 * 60 * 1000, // 24 hours
        warningTime: 20 * 60 * 60 * 1000, // 20 hours
        message: "Chore assigned - waiting for child to accept",
      },
      accepted: {
        timeout: 48 * 60 * 60 * 1000, // 48 hours
        warningTime: 36 * 60 * 60 * 1000, // 36 hours
        message: "Chore in progress - child is working on it",
      },
      completed: {
        timeout: 12 * 60 * 60 * 1000, // 12 hours
        warningTime: 8 * 60 * 60 * 1000, // 8 hours
        message: "Chore completed - waiting for photo submission",
      },
      under_review: {
        timeout: 24 * 60 * 60 * 1000, // 24 hours
        warningTime: 20 * 60 * 60 * 1000, // 20 hours
        message: "Photo submitted - waiting for parent review",
      },
    };

    const config = stageConfigs[stage as keyof typeof stageConfigs];
    if (!config) return;

    // Clear existing timeouts for this stage
    const existingTimeout = workflowRef.current.stageTimeouts.get(stage);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set warning timeout
    const warningTimeout = setTimeout(() => {
      addNotification({
        type: "warning",
        title: "Stage Taking Longer Than Expected",
        message: `${config.message} - Consider following up`,
        stage,
        actionRequired: true,
        actions: [
          {
            label: "Send Reminder",
            action: () => sendStageReminder(stage),
            style: "warning",
          },
          {
            label: "View Details",
            action: () => showStageDetails(stage),
            style: "secondary",
          },
        ],
      });
    }, config.warningTime);

    // Set escalation timeout
    const escalationTimeout = setTimeout(() => {
      addNotification({
        type: "error",
        title: "Stage Timeout Reached",
        message: `${config.message} - Immediate attention required`,
        stage,
        actionRequired: true,
        actions: [
          {
            label: "Escalate",
            action: () => escalateStage(stage),
            style: "error",
          },
          {
            label: "Reset Stage",
            action: () => resetStage(stage),
            style: "warning",
          },
        ],
      });
    }, config.timeout);

    workflowRef.current.stageTimeouts.set(stage, escalationTimeout);
  };

  const sendStageReminder = async (stage: ChoreWorkflowState["stage"]) => {
    if (!workflowState.chore) return;

    try {
      setWorkflowState((prev) => ({ ...prev, isProcessing: true }));

      const response = await fetch("/api/chores/workflow/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choreId: workflowState.chore._id,
          stage,
          familyId,
        }),
      });

      if (!response.ok) throw new Error("Failed to send reminder");

      addNotification({
        type: "success",
        title: "Reminder Sent",
        message: `Reminder sent for ${stage} stage`,
        stage,
        actionRequired: false,
      });
    } catch (error) {
      addError({
        stage,
        error: "Failed to send reminder",
        details: error,
        retryAction: () => sendStageReminder(stage),
      });
    } finally {
      setWorkflowState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const escalateStage = async (stage: ChoreWorkflowState["stage"]) => {
    if (!workflowState.chore) return;

    try {
      setWorkflowState((prev) => ({ ...prev, isProcessing: true }));

      const response = await fetch("/api/chores/workflow/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choreId: workflowState.chore._id,
          stage,
          familyId,
        }),
      });

      if (!response.ok) throw new Error("Failed to escalate");

      addNotification({
        type: "warning",
        title: "Stage Escalated",
        message: `${stage} stage has been escalated to family admins`,
        stage,
        actionRequired: false,
      });
    } catch (error) {
      addError({
        stage,
        error: "Failed to escalate stage",
        details: error,
        retryAction: () => escalateStage(stage),
      });
    } finally {
      setWorkflowState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const resetStage = async (stage: ChoreWorkflowState["stage"]) => {
    if (!workflowState.chore) return;

    const confirmReset = confirm(
      `Are you sure you want to reset the ${stage} stage? This will require the workflow to restart from this point.`,
    );

    if (!confirmReset) return;

    try {
      setWorkflowState((prev) => ({ ...prev, isProcessing: true }));

      const response = await fetch("/api/chores/workflow/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choreId: workflowState.chore._id,
          stage,
          familyId,
        }),
      });

      if (!response.ok) throw new Error("Failed to reset stage");

      // Refresh chore data
      await refreshChoreData();

      addNotification({
        type: "info",
        title: "Stage Reset",
        message: `${stage} stage has been reset`,
        stage,
        actionRequired: false,
      });
    } catch (error) {
      addError({
        stage,
        error: "Failed to reset stage",
        details: error,
        retryAction: () => resetStage(stage),
      });
    } finally {
      setWorkflowState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const showStageDetails = (stage: ChoreWorkflowState["stage"]) => {
    // This would open a detailed view of the current stage
    addNotification({
      type: "info",
      title: "Stage Details",
      message: `Showing details for ${stage} stage`,
      stage,
      actionRequired: false,
    });
  };

  const refreshChoreData = async () => {
    if (!workflowState.chore) return;

    try {
      const response = await fetch(`/api/chores/${workflowState.chore._id}`);
      if (!response.ok) throw new Error("Failed to refresh chore data");

      const updatedChore = await response.json();
      const newStage = getChoreStage(updatedChore.chore);

      setWorkflowState((prev) => ({
        ...prev,
        chore: updatedChore.chore,
        stage: newStage,
      }));

      // Check if stage changed
      if (newStage !== workflowState.stage) {
        addNotification({
          type: "success",
          title: "Stage Progression",
          message: `Chore progressed from ${workflowState.stage} to ${newStage}`,
          stage: newStage,
          actionRequired: false,
        });
      }
    } catch (error) {
      addError({
        stage: workflowState.stage,
        error: "Failed to refresh chore data",
        details: error,
        retryAction: refreshChoreData,
      });
    }
  };

  const getStageProgress = () => {
    const stages = [
      "created",
      "assigned",
      "accepted",
      "in_progress",
      "completed",
      "photo_submitted",
      "under_review",
      "approved",
    ];
    const currentIndex = stages.indexOf(workflowState.stage);
    return Math.max(0, ((currentIndex + 1) / stages.length) * 100);
  };

  const getStageColor = (stage: ChoreWorkflowState["stage"]) => {
    const colors = {
      created: "bg-gray-400",
      assigned: "bg-blue-400",
      accepted: "bg-yellow-400",
      in_progress: "bg-orange-400",
      completed: "bg-green-400",
      photo_submitted: "bg-purple-400",
      under_review: "bg-indigo-400",
      approved: "bg-green-600",
      rejected: "bg-red-400",
    };
    return colors[stage] || "bg-gray-400";
  };

  if (mode === "monitor" && !workflowState.chore) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-bold mb-2">No Chore Selected</h3>
        <p className="text-gray-600">
          Select a chore to monitor its workflow progress
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <div className="card bg-white shadow-xl border-2 border-primary/20">
        <div className="card-body p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-primary">
                Chore Workflow
              </h3>
              <p className="text-gray-600">
                {workflowState.chore?.title || "No chore selected"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`badge badge-lg ${getStageColor(workflowState.stage)} text-white`}
              >
                {workflowState.stage.replace("_", " ").toUpperCase()}
              </div>
              {workflowState.isProcessing && (
                <div className="loading loading-spinner loading-sm text-primary"></div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-1000"
              style={{ width: `${getStageProgress()}%` }}
            ></div>
          </div>

          {/* Stage Info */}
          {workflowState.chore && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold">Assigned To:</span>
                <div>
                  {workflowState.chore.assignedTo?.name || "Unassigned"}
                </div>
              </div>
              <div>
                <span className="font-semibold">Points:</span>
                <div>{workflowState.chore.points} points</div>
              </div>
              <div>
                <span className="font-semibold">Due Date:</span>
                <div>
                  {workflowState.chore.dueDate
                    ? new Date(workflowState.chore.dueDate).toLocaleDateString()
                    : "No due date"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {workflowState.notifications.length > 0 && (
        <div className="card bg-white shadow-xl border-2 border-blue-200">
          <div className="card-body p-6">
            <h4 className="text-lg font-bold mb-4">Workflow Notifications</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {workflowState.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`alert ${
                    notification.type === "success"
                      ? "alert-success"
                      : notification.type === "warning"
                        ? "alert-warning"
                        : notification.type === "error"
                          ? "alert-error"
                          : "alert-info"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-bold">{notification.title}</div>
                    <div className="text-sm">{notification.message}</div>
                    <div className="text-xs opacity-70">
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {notification.actions && (
                    <div className="flex gap-2">
                      {notification.actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={action.action}
                          className={`btn btn-sm btn-${action.style}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {workflowState.errors.filter((e) => !e.resolved).length > 0 && (
        <div className="card bg-white shadow-xl border-2 border-red-200">
          <div className="card-body p-6">
            <h4 className="text-lg font-bold mb-4 text-red-700">
              Workflow Errors
            </h4>
            <div className="space-y-3">
              {workflowState.errors
                .filter((e) => !e.resolved)
                .map((error) => (
                  <div key={error.id} className="alert alert-error">
                    <div className="flex-1">
                      <div className="font-bold">{error.error}</div>
                      <div className="text-sm">Stage: {error.stage}</div>
                      <div className="text-xs opacity-70">
                        {new Date(error.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {error.retryAction && (
                      <button
                        onClick={error.retryAction}
                        className="btn btn-sm btn-outline"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Workflow Actions */}
      <div className="card bg-white shadow-xl border-2 border-gray-200">
        <div className="card-body p-6">
          <h4 className="text-lg font-bold mb-4">Workflow Actions</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refreshChoreData}
              disabled={workflowState.isProcessing}
              className="btn btn-primary"
            >
              🔄 Refresh Data
            </button>
            {workflowState.chore && (
              <>
                <button
                  onClick={() => sendStageReminder(workflowState.stage)}
                  disabled={workflowState.isProcessing}
                  className="btn btn-warning"
                >
                  📧 Send Reminder
                </button>
                <button
                  onClick={() => showStageDetails(workflowState.stage)}
                  className="btn btn-info"
                >
                  📊 Stage Details
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChoreWorkflow;
