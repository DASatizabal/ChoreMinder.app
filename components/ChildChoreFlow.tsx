"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

import { useNotifications } from "@/hooks/useNotifications.tsx";

import ChoreDetail from "./ChoreDetail";
import HelpRequest from "./HelpRequest";
import PhotoSubmission from "./PhotoSubmission";
import StatusControls from "./StatusControls";

interface ChildChoreFlowProps {
  chore: Chore;
  onChoreUpdated: () => void;
  onFlowComplete: (chore: Chore) => void;
  familyId: string;
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
  assignedTo: {
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
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface FlowStep {
  id: string;
  title: string;
  description: string;
  emoji: string;
  isActive: boolean;
  isCompleted: boolean;
  isRequired: boolean;
  action?: () => void;
}

const ChildChoreFlow = ({
  chore,
  onChoreUpdated,
  onFlowComplete,
  familyId,
}: ChildChoreFlowProps) => {
  const { data: session } = useSession();
  const notifications = useNotifications({ familyId });
  const [currentFlow, setCurrentFlow] = useState<
    "overview" | "details" | "execution" | "photo" | "help"
  >("overview");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [workTime, setWorkTime] = useState({
    startTime: null as Date | null,
    endTime: null as Date | null,
    totalMinutes: 0,
    isTracking: false,
  });
  const [encouragement, setEncouragement] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const encouragingMessages = [
    "You've got this! Every step counts! 💪",
    "Amazing work so far! Keep going! 🌟",
    "You're doing great! Almost there! 🚀",
    "Fantastic effort! You're a champion! 🏆",
    "Keep up the awesome work! 🎉",
    "You're making your family proud! ❤️",
    "Every minute of work makes you stronger! 💫",
    "You're building amazing habits! 🏗️",
  ];

  useEffect(() => {
    // Set random encouraging message
    setEncouragement(
      encouragingMessages[
        Math.floor(Math.random() * encouragingMessages.length)
      ],
    );

    // Auto-advance flow based on chore status
    if (chore.status === "pending") {
      setCurrentFlow("overview");
    } else if (chore.status === "in_progress") {
      setCurrentFlow("execution");
    } else if (
      chore.status === "completed" &&
      chore.requiresPhotoVerification
    ) {
      setCurrentFlow("photo");
    }
  }, [chore.status]);

  useEffect(() => {
    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const getFlowSteps = (): FlowStep[] => {
    const steps: FlowStep[] = [
      {
        id: "accept",
        title: "Accept Chore",
        description: "Review and accept the assigned chore",
        emoji: "👀",
        isActive: chore.status === "pending",
        isCompleted: ["in_progress", "completed", "verified"].includes(
          chore.status,
        ),
        isRequired: true,
        action: () => setShowAcceptanceModal(true),
      },
      {
        id: "execute",
        title: "Do the Work",
        description: "Complete the chore following instructions",
        emoji: "💪",
        isActive: chore.status === "in_progress",
        isCompleted: ["completed", "verified"].includes(chore.status),
        isRequired: true,
        action: () => setCurrentFlow("execution"),
      },
    ];

    if (chore.requiresPhotoVerification) {
      steps.push({
        id: "photo",
        title: "Take Photo",
        description: "Submit photo proof of completion",
        emoji: "📸",
        isActive:
          chore.status === "completed" && chore.requiresPhotoVerification,
        isCompleted:
          chore.photoVerification?.some((p) => p.status !== "rejected") ||
          false,
        isRequired: true,
        action: () => setCurrentFlow("photo"),
      });
    }

    steps.push({
      id: "approval",
      title: "Get Approval",
      description: "Wait for parent to approve your work",
      emoji: "⭐",
      isActive:
        chore.status === "completed" &&
        (!chore.requiresPhotoVerification ||
          chore.photoVerification?.some((p) => p.status === "pending")),
      isCompleted: chore.status === "verified",
      isRequired: true,
    });

    return steps;
  };

  const startWorkTimer = () => {
    const now = new Date();
    setWorkTime((prev) => ({
      ...prev,
      startTime: now,
      isTracking: true,
    }));

    timerRef.current = setInterval(() => {
      setWorkTime((prev) => {
        if (prev.startTime) {
          const elapsed = Math.floor(
            (new Date().getTime() - prev.startTime.getTime()) / 1000 / 60,
          );
          return { ...prev, totalMinutes: elapsed };
        }
        return prev;
      });
    }, 60000); // Update every minute

    toast.success("Timer started! You've got this! 🚀", {
      icon: "⏱️",
      duration: 3000,
    });
  };

  const stopWorkTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setWorkTime((prev) => ({
      ...prev,
      endTime: new Date(),
      isTracking: false,
    }));

    toast.success(
      `Great work! You spent ${workTime.totalMinutes} minutes on this chore! 🎉`,
      {
        icon: "⏰",
        duration: 4000,
      },
    );
  };

  const handleAcceptChore = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/chores/${chore._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });

      if (!response.ok) throw new Error("Failed to accept chore");

      toast.success("Awesome! You accepted the chore! Let's get started! 🚀", {
        icon: "✅",
        duration: 5000,
      });

      setShowAcceptanceModal(false);
      setCurrentFlow("execution");
      onChoreUpdated();
      startWorkTimer();

      // Send notification to parent
      await notifications.notifyChoreAccepted(
        chore._id,
        chore.assignedBy._id,
        chore.title,
      );
    } catch (error) {
      console.error("Error accepting chore:", error);
      toast.error("Oops! Couldn't accept the chore. Try again!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineChore = async () => {
    if (!declineReason.trim()) {
      toast.error(
        "Please let us know why you can't do this chore right now 😊",
      );
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/chores/${chore._id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason }),
      });

      if (!response.ok) throw new Error("Failed to decline chore");

      toast.success(
        "Thanks for letting us know! We'll work something out! 🤝",
        {
          icon: "💬",
          duration: 4000,
        },
      );

      setShowDeclineModal(false);
      setDeclineReason("");
      onChoreUpdated();

      // Send notification to parent
      await notifications.notifyChoreDeclined(
        chore._id,
        chore.assignedBy._id,
        chore.title,
        declineReason,
      );
    } catch (error) {
      console.error("Error declining chore:", error);
      toast.error("Couldn't send your response. Please try again!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteChore = async () => {
    setIsProcessing(true);
    try {
      if (workTime.isTracking) {
        stopWorkTimer();
      }

      const response = await fetch(`/api/chores/${chore._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          workTime: workTime.totalMinutes,
        }),
      });

      if (!response.ok) throw new Error("Failed to complete chore");

      toast.success(
        `🎉 Fantastic job! You completed "${chore.title}"! You earned ${chore.points} points!`,
        {
          icon: "🏆",
          duration: 6000,
        },
      );

      if (chore.requiresPhotoVerification) {
        setCurrentFlow("photo");
        toast.success("Now take a photo to show your awesome work! 📸", {
          icon: "🎯",
          duration: 4000,
        });
      }

      onChoreUpdated();

      // Send notification to parent
      await notifications.notifyChoreCompleted(
        chore._id,
        chore.assignedBy._id,
        chore.title,
        chore.points,
      );
    } catch (error) {
      console.error("Error completing chore:", error);
      toast.error("Couldn't mark chore as complete. Try again!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusUpdate = async (choreId: string, newStatus: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/chores/${choreId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update chore status");

      onChoreUpdated();

      // Handle specific status changes
      if (newStatus === "in_progress") {
        startWorkTimer();
        setCurrentFlow("execution");
      } else if (newStatus === "completed") {
        if (workTime.isTracking) stopWorkTimer();
        if (chore.requiresPhotoVerification) {
          setCurrentFlow("photo");
        }
      }
    } catch (error) {
      console.error("Error updating chore status:", error);
      toast.error("Couldn't update chore status. Try again!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHelpRequest = async (choreId: string, message: string) => {
    try {
      const response = await fetch("/api/help-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choreId,
          userId: session?.user?.id,
          message,
        }),
      });

      if (!response.ok) throw new Error("Failed to send help request");

      toast.success("Help request sent! Someone will help you soon! 🤝", {
        icon: "🆘",
        duration: 4000,
      });
    } catch (error) {
      console.error("Error sending help request:", error);
      toast.error("Couldn't send help request. Try again!");
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Chore Preview Card */}
      <div className="card bg-gradient-to-br from-blue-50 to-purple-50 shadow-xl border-4 border-primary/20">
        <div className="card-body p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-6xl">{getCategoryEmoji(chore.category)}</div>
            <div className="text-right">
              <div className="badge badge-primary badge-lg font-bold">
                {chore.points} points
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {chore.assignedBy.name} assigned this
              </div>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-2">{chore.title}</h3>

          {chore.description && (
            <p className="text-gray-700 mb-4">{chore.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Priority:</span>
              <div className="flex items-center gap-1">
                {getPriorityEmoji(chore.priority)}
                {chore.priority}
              </div>
            </div>
            <div>
              <span className="font-semibold">Time needed:</span>
              <div>{chore.estimatedMinutes || "?"} minutes</div>
            </div>
            {chore.dueDate && (
              <div className="col-span-2">
                <span className="font-semibold">Due:</span>
                <div>{new Date(chore.dueDate).toLocaleDateString()}</div>
              </div>
            )}
          </div>

          {chore.requiresPhotoVerification && (
            <div className="alert alert-info mt-4">
              <span className="text-2xl">📸</span>
              <span>You'll need to take a photo when you're done!</span>
            </div>
          )}
        </div>
      </div>

      {/* Flow Steps */}
      <div className="card bg-white shadow-xl border-2 border-gray-200">
        <div className="card-body p-6">
          <h4 className="text-xl font-bold mb-4">What happens next:</h4>
          <div className="space-y-4">
            {getFlowSteps().map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                  step.isCompleted
                    ? "bg-green-50 border-2 border-green-200"
                    : step.isActive
                      ? "bg-blue-50 border-2 border-blue-200"
                      : "bg-gray-50 border-2 border-gray-200"
                }`}
              >
                <div className="text-3xl">{step.emoji}</div>
                <div className="flex-1">
                  <h5 className="font-bold">{step.title}</h5>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
                <div className="text-2xl">
                  {step.isCompleted ? "✅" : step.isActive ? "👈" : "⏳"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {chore.status === "pending" && (
          <>
            <button
              onClick={() => setShowAcceptanceModal(true)}
              className="btn btn-primary btn-lg font-bold shadow-lg transform hover:scale-105"
            >
              🚀 Accept & Start Chore!
            </button>
            <button
              onClick={() => setShowDeclineModal(true)}
              className="btn btn-ghost btn-sm"
            >
              💬 Can't do this right now
            </button>
          </>
        )}

        <button
          onClick={() => setCurrentFlow("details")}
          className="btn btn-info btn-outline"
        >
          📋 View Full Details
        </button>

        <button
          onClick={() => setCurrentFlow("help")}
          className="btn btn-warning btn-outline"
        >
          🆘 Need Help?
        </button>
      </div>
    </div>
  );

  const renderExecution = () => (
    <div className="space-y-6">
      {/* Work Timer */}
      <div className="card bg-gradient-to-r from-orange-100 to-yellow-100 shadow-xl border-4 border-orange-200">
        <div className="card-body p-6 text-center">
          <h3 className="text-2xl font-bold text-orange-700 mb-4">
            ⏱️ Work Timer
          </h3>

          <div className="text-6xl font-bold text-orange-800 mb-4">
            {Math.floor(workTime.totalMinutes / 60)}:
            {(workTime.totalMinutes % 60).toString().padStart(2, "0")}
          </div>

          {chore.estimatedMinutes && (
            <div className="text-lg text-orange-600 mb-4">
              Goal: {chore.estimatedMinutes} minutes
            </div>
          )}

          <div className="flex justify-center gap-3">
            {!workTime.isTracking ? (
              <button
                onClick={startWorkTimer}
                className="btn btn-success btn-lg"
              >
                ▶️ Start Timer
              </button>
            ) : (
              <button
                onClick={stopWorkTimer}
                className="btn btn-warning btn-lg"
              >
                ⏸️ Pause Timer
              </button>
            )}
          </div>

          <p className="text-sm text-orange-600 mt-3">{encouragement}</p>
        </div>
      </div>

      {/* Status Controls */}
      <div className="card bg-white shadow-xl border-2 border-primary/20">
        <div className="card-body p-6">
          <h4 className="text-xl font-bold mb-4 text-center">
            Update Your Progress
          </h4>
          <StatusControls
            chore={chore}
            onStatusUpdate={handleStatusUpdate}
            onPhotoRequired={() => setCurrentFlow("photo")}
            isLoading={isProcessing}
            showConfirmation={true}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setCurrentFlow("details")}
          className="btn btn-info btn-outline btn-lg"
        >
          📋 Review Instructions
        </button>
        <button
          onClick={() => setCurrentFlow("help")}
          className="btn btn-warning btn-outline btn-lg"
        >
          🆘 Get Help
        </button>
      </div>

      {/* Motivational Messages */}
      <div className="card bg-gradient-to-r from-green-100 to-blue-100 border-4 border-green-200">
        <div className="card-body p-6 text-center">
          <div className="text-4xl mb-3">🌟</div>
          <h4 className="text-lg font-bold text-green-700 mb-2">
            You're Doing Amazing!
          </h4>
          <p className="text-green-600">
            Every minute you work on this chore is making you stronger and more
            responsible! Your family is so proud of your effort! 💪✨
          </p>
        </div>
      </div>
    </div>
  );

  const getCategoryEmoji = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "cleaning":
        return "🧹";
      case "kitchen":
        return "🍽️";
      case "laundry":
        return "👕";
      case "outdoor":
        return "🌳";
      case "pet care":
        return "🐕";
      case "homework":
        return "📚";
      case "organization":
        return "📦";
      default:
        return "⭐";
    }
  };

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case "high":
        return "🚨";
      case "medium":
        return "⚡";
      case "low":
        return "😎";
      default:
        return "📝";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Flow Navigation */}
      <div className="tabs tabs-boxed mb-6 bg-white shadow-lg border-2 border-primary/20">
        <button
          className={`tab tab-lg font-bold ${currentFlow === "overview" ? "tab-active" : ""}`}
          onClick={() => setCurrentFlow("overview")}
        >
          🏠 Overview
        </button>
        <button
          className={`tab tab-lg font-bold ${currentFlow === "details" ? "tab-active" : ""}`}
          onClick={() => setCurrentFlow("details")}
        >
          📋 Details
        </button>
        {chore.status !== "pending" && (
          <button
            className={`tab tab-lg font-bold ${currentFlow === "execution" ? "tab-active" : ""}`}
            onClick={() => setCurrentFlow("execution")}
          >
            💪 Work Mode
          </button>
        )}
        {chore.requiresPhotoVerification && chore.status === "completed" && (
          <button
            className={`tab tab-lg font-bold ${currentFlow === "photo" ? "tab-active" : ""}`}
            onClick={() => setCurrentFlow("photo")}
          >
            📸 Photo
          </button>
        )}
      </div>

      {/* Flow Content */}
      {currentFlow === "overview" && renderOverview()}

      {currentFlow === "details" && (
        <ChoreDetail
          chore={chore}
          onClose={() => setCurrentFlow("overview")}
          onStatusUpdate={handleStatusUpdate}
          onHelpRequest={handleHelpRequest}
          isOpen={true}
        />
      )}

      {currentFlow === "execution" && renderExecution()}

      {currentFlow === "photo" && (
        <PhotoSubmission
          userId={session?.user?.id || ""}
          familyId={familyId}
          onPhotoSubmitted={() => {
            onChoreUpdated();
            setCurrentFlow("overview");
          }}
        />
      )}

      {currentFlow === "help" && (
        <HelpRequest
          chore={chore}
          userId={session?.user?.id || ""}
          onClose={() => setCurrentFlow("overview")}
          onHelpSent={() => setCurrentFlow("overview")}
          isOpen={true}
        />
      )}

      {/* Acceptance Modal */}
      {showAcceptanceModal && (
        <div className="modal modal-open">
          <div className="modal-box bg-gradient-to-br from-white to-green-50 border-4 border-green-200">
            <h3 className="font-bold text-2xl mb-4 text-center text-green-700">
              🚀 Ready to Start?
            </h3>

            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🌟</div>
              <p className="text-lg text-gray-700 mb-4">
                You're about to start "<strong>{chore.title}</strong>"
              </p>
              <p className="text-green-600 font-medium">
                You'll earn <strong>{chore.points} points</strong> for
                completing this chore!
              </p>
              {chore.estimatedMinutes && (
                <p className="text-sm text-gray-600 mt-2">
                  Estimated time: {chore.estimatedMinutes} minutes
                </p>
              )}
            </div>

            <div className="modal-action">
              <button
                onClick={() => setShowAcceptanceModal(false)}
                className="btn btn-ghost"
                disabled={isProcessing}
              >
                Maybe Later
              </button>
              <button
                onClick={handleAcceptChore}
                disabled={isProcessing}
                className="btn btn-success btn-lg font-bold"
              >
                {isProcessing ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Starting...
                  </>
                ) : (
                  "🚀 Yes, Let's Do This!"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="modal modal-open">
          <div className="modal-box bg-gradient-to-br from-white to-orange-50 border-4 border-orange-200">
            <h3 className="font-bold text-2xl mb-4 text-center text-orange-700">
              💬 Can't Do This Right Now?
            </h3>

            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🤝</div>
              <p className="text-lg text-gray-700 mb-4">
                That's totally okay! Let us know why so we can work something
                out.
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                placeholder="I can't do this because... (e.g., I have homework, I'm not feeling well, I don't understand how to do it)"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="textarea textarea-bordered w-full"
                rows={4}
                maxLength={500}
              />

              <div className="text-xs text-gray-500">
                💡 Being honest helps us find better solutions together!
              </div>
            </div>

            <div className="modal-action">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason("");
                }}
                className="btn btn-ghost"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineChore}
                disabled={isProcessing || !declineReason.trim()}
                className="btn btn-warning btn-lg font-bold"
              >
                {isProcessing ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Sending...
                  </>
                ) : (
                  "💬 Send Message"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildChoreFlow;
