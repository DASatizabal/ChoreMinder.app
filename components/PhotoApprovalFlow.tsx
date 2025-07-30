"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import { useNotifications } from "@/hooks/useNotifications";

interface PhotoApprovalFlowProps {
  chore: Chore;
  onApprovalComplete: (approved: boolean, reason?: string) => void;
  onFlowClose: () => void;
  mode: "review" | "batch" | "detailed";
  familyId: string;
}

interface Chore {
  _id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "verified" | "rejected";
  points: number;
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
    _id?: string;
    url: string;
    uploadedAt: string;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    metadata?: {
      size: number;
      type: string;
      dimensions?: { width: number; height: number };
    };
  }>;
  completedAt?: string;
  createdAt: string;
}

interface ApprovalCriteria {
  taskCompletion: boolean;
  qualityStandard: boolean;
  followedInstructions: boolean;
  overallSatisfaction: 1 | 2 | 3 | 4 | 5;
  feedback: string;
}

interface QuickApprovalOption {
  id: string;
  action: "approve" | "reject";
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  reason?: string;
}

const PhotoApprovalFlow = ({
  chore,
  onApprovalComplete,
  onFlowClose,
  mode = "review",
  familyId,
}: PhotoApprovalFlowProps) => {
  const { data: session } = useSession();
  const notifications = useNotifications({ familyId });
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvalCriteria, setApprovalCriteria] = useState<ApprovalCriteria>({
    taskCompletion: false,
    qualityStandard: false,
    followedInstructions: false,
    overallSatisfaction: 3,
    feedback: "",
  });
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const photos =
    chore.photoVerification?.filter((p) => p.status === "pending") || [];
  const currentPhoto = photos[currentPhotoIndex];

  const quickApprovalOptions: QuickApprovalOption[] = [
    {
      id: "excellent",
      action: "approve",
      title: "Excellent Work!",
      subtitle: "Perfect completion, great job!",
      emoji: "🌟",
      color: "btn-success",
      reason:
        "Outstanding work! The chore was completed exactly as requested with excellent attention to detail.",
    },
    {
      id: "good",
      action: "approve",
      title: "Good Job!",
      subtitle: "Well done, meets expectations",
      emoji: "👍",
      color: "btn-success",
      reason:
        "Good work! The chore was completed satisfactorily and meets our standards.",
    },
    {
      id: "needs_improvement",
      action: "reject",
      title: "Needs Improvement",
      subtitle: "Some areas need attention",
      emoji: "📝",
      color: "btn-warning",
      reason:
        "The work needs some improvement. Please review the instructions and try again.",
    },
    {
      id: "not_complete",
      action: "reject",
      title: "Not Complete",
      subtitle: "Task wasn't finished properly",
      emoji: "❌",
      color: "btn-error",
      reason:
        "The chore doesn't appear to be completed. Please finish the task and submit a new photo.",
    },
    {
      id: "unclear_photo",
      action: "reject",
      title: "Photo Unclear",
      subtitle: "Can't see the work clearly",
      emoji: "📷",
      color: "btn-warning",
      reason:
        "The photo is unclear or doesn't show the completed work well. Please take a clearer photo.",
    },
  ];

  useEffect(() => {
    if (photos.length === 0) {
      toast("No pending photos to review", { icon: "ℹ️" });
      onFlowClose();
    }
  }, [photos.length, onFlowClose]);

  const handleQuickApproval = async (option: QuickApprovalOption) => {
    if (!currentPhoto) return;

    setIsProcessing(true);
    try {
      await processApproval(
        option.action === "approve",
        option.reason || "",
        currentPhoto,
      );

      // Move to next photo or complete
      if (currentPhotoIndex < photos.length - 1) {
        setCurrentPhotoIndex(currentPhotoIndex + 1);
      } else {
        onApprovalComplete(option.action === "approve", option.reason || "");
      }
    } catch (error) {
      console.error("Error in quick approval:", error);
      toast.error("Failed to process approval. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDetailedApproval = async () => {
    if (!currentPhoto) return;

    const isApproved =
      approvalCriteria.taskCompletion &&
      approvalCriteria.qualityStandard &&
      approvalCriteria.followedInstructions &&
      approvalCriteria.overallSatisfaction >= 3;

    const detailedFeedback = generateDetailedFeedback(
      approvalCriteria,
      isApproved,
    );

    setIsProcessing(true);
    try {
      await processApproval(isApproved, detailedFeedback, currentPhoto);

      // Move to next photo or complete
      if (currentPhotoIndex < photos.length - 1) {
        setCurrentPhotoIndex(currentPhotoIndex + 1);
        resetApprovalCriteria();
      } else {
        onApprovalComplete(isApproved, detailedFeedback);
      }
    } catch (error) {
      console.error("Error in detailed approval:", error);
      toast.error("Failed to process approval. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processApproval = async (
    approved: boolean,
    reason: string,
    photo: any,
  ) => {
    const response = await fetch(`/api/chores/${chore._id}/photos/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photoId: photo._id || photo.url,
        approved,
        reason,
        reviewedBy: session?.user?.id,
        criteria: showDetailedForm ? approvalCriteria : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to process approval");
    }

    const successMessage = approved
      ? `🎉 Photo approved! ${chore.assignedTo.name} earned ${chore.points} points!`
      : `📝 Photo feedback sent to ${chore.assignedTo.name}`;

    toast.success(successMessage, {
      duration: approved ? 6000 : 4000,
      icon: approved ? "🏆" : "📋",
    });

    // Send notification to child
    if (approved) {
      await notifications.notifyPhotoApproved(
        chore._id,
        chore.assignedTo._id,
        chore.title,
        chore.points,
      );
    } else {
      await notifications.notifyPhotoRejected(
        chore._id,
        chore.assignedTo._id,
        chore.title,
        reason,
      );
    }
  };

  const generateDetailedFeedback = (
    criteria: ApprovalCriteria,
    isApproved: boolean,
  ) => {
    let feedback = "";

    if (isApproved) {
      feedback = "Great work! ";
      if (criteria.overallSatisfaction === 5) {
        feedback += "This is absolutely perfect! ";
      } else if (criteria.overallSatisfaction === 4) {
        feedback += "This is really well done! ";
      }
    } else {
      feedback = "Thanks for your effort! ";
    }

    // Add specific feedback based on criteria
    const feedbackPoints = [];

    if (criteria.taskCompletion) {
      feedbackPoints.push("✅ Task completed successfully");
    } else {
      feedbackPoints.push("❌ Task needs to be finished completely");
    }

    if (criteria.qualityStandard) {
      feedbackPoints.push("✅ Quality meets our standards");
    } else {
      feedbackPoints.push("📈 Quality could be improved");
    }

    if (criteria.followedInstructions) {
      feedbackPoints.push("✅ Instructions followed well");
    } else {
      feedbackPoints.push("📋 Please review the instructions carefully");
    }

    if (feedbackPoints.length > 0) {
      feedback += `\n\n${feedbackPoints.join("\n")}`;
    }

    if (criteria.feedback.trim()) {
      feedback += `\n\nPersonal note: ${criteria.feedback}`;
    }

    if (isApproved) {
      feedback += "\n\n🎉 Congratulations! You've earned your points!";
    } else {
      feedback += "\n\n💪 Please try again - you've got this!";
    }

    return feedback;
  };

  const resetApprovalCriteria = () => {
    setApprovalCriteria({
      taskCompletion: false,
      qualityStandard: false,
      followedInstructions: false,
      overallSatisfaction: 3,
      feedback: "",
    });
  };

  const renderPhotoViewer = () => (
    <div className="card bg-white shadow-xl border-2 border-gray-200 mb-6">
      <div className="card-body p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">
            📸 Photo Review ({currentPhotoIndex + 1} of {photos.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))
              }
              disabled={currentPhotoIndex === 0}
              className="btn btn-ghost btn-sm"
            >
              ← Previous
            </button>
            <button
              onClick={() =>
                setCurrentPhotoIndex(
                  Math.min(photos.length - 1, currentPhotoIndex + 1),
                )
              }
              disabled={currentPhotoIndex === photos.length - 1}
              className="btn btn-ghost btn-sm"
            >
              Next →
            </button>
          </div>
        </div>

        {currentPhoto && (
          <div className="space-y-4">
            {/* Photo Display */}
            <div className="relative">
              <img
                src={currentPhoto.url}
                alt="Chore completion photo"
                className="w-full max-h-96 object-contain rounded-lg border-2 border-gray-200 cursor-zoom-in"
                onClick={() => setZoomedPhoto(currentPhoto.url)}
              />
              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Click to zoom
              </div>
            </div>

            {/* Photo Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-semibold">Submitted:</span>
                <div>{new Date(currentPhoto.uploadedAt).toLocaleString()}</div>
              </div>
              <div>
                <span className="font-semibold">By:</span>
                <div>{chore.assignedTo.name}</div>
              </div>
              {currentPhoto.metadata && (
                <>
                  <div>
                    <span className="font-semibold">Size:</span>
                    <div>
                      {Math.round(currentPhoto.metadata.size / 1024)} KB
                    </div>
                  </div>
                  {currentPhoto.metadata.dimensions && (
                    <div>
                      <span className="font-semibold">Dimensions:</span>
                      <div>
                        {currentPhoto.metadata.dimensions.width}×
                        {currentPhoto.metadata.dimensions.height}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderQuickApproval = () => (
    <div className="card bg-white shadow-xl border-2 border-primary/20 mb-6">
      <div className="card-body p-6">
        <h4 className="text-lg font-bold mb-4">⚡ Quick Approval</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickApprovalOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleQuickApproval(option)}
              disabled={isProcessing}
              className={`btn ${option.color} btn-outline h-auto py-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform`}
            >
              <span className="text-2xl">{option.emoji}</span>
              <div className="text-center">
                <div className="font-bold text-sm">{option.title}</div>
                <div className="text-xs opacity-80">{option.subtitle}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="divider">OR</div>

        <button
          onClick={() => setShowDetailedForm(!showDetailedForm)}
          className="btn btn-primary btn-outline w-full"
        >
          📋 Detailed Review
        </button>
      </div>
    </div>
  );

  const renderDetailedApproval = () => (
    <div className="card bg-white shadow-xl border-2 border-blue-200 mb-6">
      <div className="card-body p-6">
        <h4 className="text-lg font-bold mb-4">📋 Detailed Review</h4>

        <div className="space-y-6">
          {/* Criteria Checkboxes */}
          <div className="space-y-4">
            <h5 className="font-semibold">Evaluation Criteria:</h5>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">
                  ✅ Task completed as requested
                </span>
                <input
                  type="checkbox"
                  checked={approvalCriteria.taskCompletion}
                  onChange={(e) =>
                    setApprovalCriteria((prev) => ({
                      ...prev,
                      taskCompletion: e.target.checked,
                    }))
                  }
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">⭐ Quality meets standards</span>
                <input
                  type="checkbox"
                  checked={approvalCriteria.qualityStandard}
                  onChange={(e) =>
                    setApprovalCriteria((prev) => ({
                      ...prev,
                      qualityStandard: e.target.checked,
                    }))
                  }
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">
                  📋 Instructions followed correctly
                </span>
                <input
                  type="checkbox"
                  checked={approvalCriteria.followedInstructions}
                  onChange={(e) =>
                    setApprovalCriteria((prev) => ({
                      ...prev,
                      followedInstructions: e.target.checked,
                    }))
                  }
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>
          </div>

          {/* Satisfaction Rating */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">
                Overall Satisfaction:
              </span>
            </label>
            <div className="rating rating-lg">
              {[1, 2, 3, 4, 5].map((star) => (
                <input
                  key={star}
                  type="radio"
                  name="satisfaction"
                  className="mask mask-star-2 bg-orange-400"
                  checked={approvalCriteria.overallSatisfaction === star}
                  onChange={() =>
                    setApprovalCriteria((prev) => ({
                      ...prev,
                      overallSatisfaction: star as 1 | 2 | 3 | 4 | 5,
                    }))
                  }
                />
              ))}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {approvalCriteria.overallSatisfaction} out of 5 stars
            </div>
          </div>

          {/* Personal Feedback */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">
                Personal Feedback:
              </span>
            </label>
            <textarea
              placeholder="Add a personal note for the child (e.g., 'Great attention to detail!' or 'Next time, please remember to clean under the bed too.')"
              value={approvalCriteria.feedback}
              onChange={(e) =>
                setApprovalCriteria((prev) => ({
                  ...prev,
                  feedback: e.target.value,
                }))
              }
              className="textarea textarea-bordered w-full"
              rows={3}
              maxLength={500}
            />
            <div className="label">
              <span className="label-text-alt text-blue-600">
                💡 Personal feedback helps children learn and feel appreciated!
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleDetailedApproval}
            disabled={isProcessing}
            className="btn btn-primary btn-lg w-full"
          >
            {isProcessing ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2"></span>
                Processing...
              </>
            ) : (
              <>
                {approvalCriteria.taskCompletion &&
                approvalCriteria.qualityStandard &&
                approvalCriteria.followedInstructions
                  ? "✅ Approve & Award Points"
                  : "📝 Send Feedback & Request Retry"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderChoreContext = () => (
    <div className="card bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-primary/20 mb-6">
      <div className="card-body p-6">
        <h4 className="text-lg font-bold mb-4">📋 Chore Context</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Chore:</strong> {chore.title}
          </div>
          <div>
            <strong>Child:</strong> {chore.assignedTo.name}
          </div>
          <div>
            <strong>Points:</strong> {chore.points}
          </div>
          <div>
            <strong>Status:</strong> {chore.status}
          </div>
          {chore.completedAt && (
            <div>
              <strong>Completed:</strong>{" "}
              {new Date(chore.completedAt).toLocaleString()}
            </div>
          )}
          <div>
            <strong>Photos:</strong> {photos.length} pending review
          </div>
        </div>

        {chore.description && (
          <div className="mt-4">
            <strong>Description:</strong>
            <p className="text-gray-700 mt-1">{chore.description}</p>
          </div>
        )}
      </div>
    </div>
  );

  if (photos.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">📸</div>
        <h3 className="text-xl font-bold mb-2">No Photos to Review</h3>
        <p className="text-gray-600">All photos have been reviewed</p>
        <button onClick={onFlowClose} className="btn btn-primary mt-4">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary">
          Photo Approval Workflow
        </h2>
        <button onClick={onFlowClose} className="btn btn-ghost">
          ✕ Close
        </button>
      </div>

      {/* Content */}
      {renderChoreContext()}
      {renderPhotoViewer()}
      {renderQuickApproval()}
      {showDetailedForm && renderDetailedApproval()}

      {/* Photo Zoom Modal */}
      {zoomedPhoto && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-5xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Photo Detail View</h3>
              <button
                onClick={() => setZoomedPhoto(null)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>
            <img
              src={zoomedPhoto}
              alt="Zoomed chore photo"
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoApprovalFlow;
