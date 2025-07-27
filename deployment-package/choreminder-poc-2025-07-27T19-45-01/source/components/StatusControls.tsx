"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface Chore {
  _id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "verified" | "rejected";
  points: number;
  requiresPhotoVerification: boolean;
}

interface StatusControlsProps {
  chore: Chore;
  onStatusUpdate: (choreId: string, newStatus: string) => void;
  onPhotoRequired?: () => void;
  isLoading?: boolean;
  showConfirmation?: boolean;
}

const StatusControls = ({
  chore,
  onStatusUpdate,
  onPhotoRequired,
  isLoading = false,
  showConfirmation = true,
}: StatusControlsProps) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    status: string;
    message: string;
  } | null>(null);

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "in_progress":
        return "🔥";
      case "completed":
        return "✅";
      case "verified":
        return "🏆";
      case "rejected":
        return "😅";
      default:
        return "📝";
    }
  };

  const getActionMessage = (fromStatus: string, toStatus: string) => {
    if (fromStatus === "pending" && toStatus === "in_progress") {
      return {
        title: "Ready to Start? 🚀",
        message:
          "You're about to begin this chore! Are you ready to show what an awesome helper you are?",
        buttonText: "Yes, Let's Start!",
        encouragement:
          "You've got this! Every great accomplishment starts with the decision to try! 💪",
      };
    }

    if (fromStatus === "in_progress" && toStatus === "completed") {
      return {
        title: "All Done? 🎉",
        message: `Fantastic work! You're about to mark this chore as complete and earn ${chore.points} points!`,
        buttonText: "Yes, I'm Done!",
        encouragement: chore.requiresPhotoVerification
          ? "Great job! Don't forget to take a photo to show your awesome work! 📸✨"
          : "You're amazing! Your hard work is really paying off! 🌟",
      };
    }

    if (fromStatus === "rejected" && toStatus === "pending") {
      return {
        title: "Ready to Try Again? 🔄",
        message:
          "No worries at all! Everyone learns and improves. Ready to give it another awesome try?",
        buttonText: "Yes, Let's Do This!",
        encouragement:
          "You learn something new every time you try! That's what makes you so amazing! 🌈",
      };
    }

    return {
      title: "Confirm Action",
      message: "Are you sure you want to update this chore?",
      buttonText: "Confirm",
      encouragement: "You're doing great! Keep up the awesome work! ⭐",
    };
  };

  const handleStatusChange = (newStatus: string) => {
    if (showConfirmation) {
      const actionMessage = getActionMessage(chore.status, newStatus);
      setPendingAction({
        status: newStatus,
        message: JSON.stringify(actionMessage),
      });
      setShowConfirmModal(true);
    } else {
      executeStatusChange(newStatus);
    }
  };

  const executeStatusChange = (newStatus: string) => {
    // Check if photo is required before completing
    if (
      newStatus === "completed" &&
      chore.requiresPhotoVerification &&
      onPhotoRequired
    ) {
      toast.success(
        "Great work! Now let's take a photo to show off your awesome work! 📸",
        {
          duration: 4000,
          icon: "🎉",
        },
      );
      onPhotoRequired();
      return;
    }

    onStatusUpdate(chore._id, newStatus);

    // Show encouraging messages
    if (newStatus === "in_progress") {
      toast.success("Awesome! You started the chore! You're amazing! 🚀", {
        icon: "🎯",
        duration: 4000,
      });
    } else if (newStatus === "completed") {
      toast.success(`Fantastic job! You earned ${chore.points} points! 🎉`, {
        icon: "🏆",
        duration: 5000,
      });
    } else if (newStatus === "pending") {
      toast.success("Ready for a fresh start! You've got this! 💪", {
        icon: "🔄",
        duration: 3000,
      });
    }

    setShowConfirmModal(false);
    setPendingAction(null);
  };

  const getButtonConfig = () => {
    switch (chore.status) {
      case "pending":
        return {
          action: () => handleStatusChange("in_progress"),
          text: "🚀 Start Chore!",
          className: "btn-primary btn-lg",
          disabled: false,
        };

      case "in_progress":
        return {
          action: () => handleStatusChange("completed"),
          text: "✅ Mark Complete!",
          className: "btn-success btn-lg",
          disabled: false,
        };

      case "completed":
        return {
          action: null,
          text: chore.requiresPhotoVerification
            ? "📸 Take Photo First!"
            : "🎉 Waiting for Approval!",
          className: "btn-ghost btn-lg",
          disabled: true,
        };

      case "verified":
        return {
          action: null,
          text: "🏆 You're Amazing!",
          className: "btn-ghost btn-lg",
          disabled: true,
        };

      case "rejected":
        return {
          action: () => handleStatusChange("pending"),
          text: "🔄 Try Again!",
          className: "btn-warning btn-lg",
          disabled: false,
        };

      default:
        return {
          action: null,
          text: "📝 Unknown Status",
          className: "btn-ghost",
          disabled: true,
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <>
      {/* Main status control */}
      <div className="w-full">
        {/* Current status display */}
        <div className="text-center mb-4">
          <div className="text-6xl mb-2">{getStatusEmoji(chore.status)}</div>
          <div
            className={`badge badge-lg font-bold mb-2 ${
              chore.status === "verified"
                ? "badge-success"
                : chore.status === "completed"
                  ? "badge-info"
                  : chore.status === "in_progress"
                    ? "badge-warning"
                    : chore.status === "rejected"
                      ? "badge-error"
                      : "badge-ghost"
            }`}
          >
            {chore.status.replace("_", " ").toUpperCase()}
          </div>
        </div>

        {/* Action button */}
        {buttonConfig.action ? (
          <button
            onClick={buttonConfig.action}
            disabled={isLoading || buttonConfig.disabled}
            className={`btn ${buttonConfig.className} w-full font-bold shadow-lg transform hover:scale-105 transition-all`}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2"></span>
                Working on it...
              </>
            ) : (
              buttonConfig.text
            )}
          </button>
        ) : (
          <div
            className={`btn ${buttonConfig.className} w-full font-bold cursor-default`}
          >
            {buttonConfig.text}
          </div>
        )}

        {/* Status-specific messages */}
        <div className="text-center mt-4">
          {chore.status === "pending" && (
            <p className="text-sm text-gray-600">
              🌟 Ready when you are! Take your time and do your best!
            </p>
          )}

          {chore.status === "in_progress" && (
            <p className="text-sm text-gray-600">
              🔥 You're doing amazing! Keep up the great work!
            </p>
          )}

          {chore.status === "completed" && !chore.requiresPhotoVerification && (
            <p className="text-sm text-gray-600">
              🎉 Fantastic work! Waiting for your parent to approve it!
            </p>
          )}

          {chore.status === "completed" && chore.requiresPhotoVerification && (
            <p className="text-sm text-gray-600">
              📸 Great job! Now take a photo to show your awesome work!
            </p>
          )}

          {chore.status === "verified" && (
            <p className="text-sm text-green-600 font-medium">
              🏆 You're a chore champion! Amazing work!
            </p>
          )}

          {chore.status === "rejected" && (
            <p className="text-sm text-orange-600">
              😊 No worries! Learning is part of growing. Ready to try again?
            </p>
          )}
        </div>

        {/* Additional quick actions */}
        {chore.status === "in_progress" && (
          <div className="text-center mt-4">
            <button
              onClick={() => handleStatusChange("pending")}
              className="btn btn-ghost btn-sm"
              disabled={isLoading}
            >
              ⏸️ Pause for Now
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingAction && (
        <div className="modal modal-open">
          <div className="modal-box bg-gradient-to-br from-white to-blue-50 border-4 border-primary/20">
            {(() => {
              const actionMessage = JSON.parse(pendingAction.message);
              return (
                <>
                  <h3 className="font-bold text-2xl mb-4 text-center text-primary">
                    {actionMessage.title}
                  </h3>

                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">
                      {getStatusEmoji(pendingAction.status)}
                    </div>
                    <p className="text-lg text-gray-700 mb-4">
                      {actionMessage.message}
                    </p>
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border-2 border-yellow-200">
                      <p className="text-sm text-orange-700 font-medium">
                        💡 {actionMessage.encouragement}
                      </p>
                    </div>
                  </div>

                  <div className="modal-action">
                    <button
                      onClick={() => {
                        setShowConfirmModal(false);
                        setPendingAction(null);
                      }}
                      className="btn btn-ghost"
                    >
                      Maybe Later
                    </button>
                    <button
                      onClick={() => executeStatusChange(pendingAction.status)}
                      className="btn btn-primary btn-lg font-bold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="loading loading-spinner loading-sm mr-2"></span>
                          Working...
                        </>
                      ) : (
                        actionMessage.buttonText
                      )}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
};

export default StatusControls;
