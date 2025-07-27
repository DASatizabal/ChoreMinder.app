"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface ApprovalWorkflowProps {
  chore: CompletedChore;
  onApproval: (decision: ApprovalDecision) => void;
  onClose: () => void;
  mode: "review" | "bulk" | "quick";
}

interface CompletedChore {
  _id: string;
  title: string;
  description?: string;
  category: string;
  priority: "low" | "medium" | "high";
  points: number;
  status: string;
  completedAt: string;
  assignedTo: {
    _id: string;
    name: string;
    email: string;
  };
  assignedBy: {
    _id: string;
    name: string;
  };
  photoVerification?: {
    photos: Photo[];
    status: "pending" | "approved" | "rejected";
  };
  metadata?: {
    aiAnalysis?: AIAnalysis;
    qualityScore?: number;
    difficultyLevel?: string;
  };
  estimatedMinutes: number;
  actualMinutes?: number;
}

interface Photo {
  id: string;
  url: string;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
  metadata?: {
    size: number;
    type: string;
    quality?: PhotoQuality;
    aiAnalysis?: AIAnalysis;
  };
  rejectionReason?: string;
  feedback?: string;
}

interface PhotoQuality {
  brightness: number;
  clarity: number;
  composition: number;
  overall: number;
  issues: string[];
  suggestions: string[];
}

interface AIAnalysis {
  confidence: number;
  detected: string[];
  suggestions: string[];
  completionScore: number;
  taskAlignment: number;
}

interface ApprovalDecision {
  decision: "approve" | "reject" | "request_revision";
  feedback?: string;
  points?: number;
  badges?: string[];
  photoApprovals?: {
    [photoId: string]: {
      approved: boolean;
      feedback?: string;
    };
  };
  revisionRequests?: {
    type: "photo" | "task";
    reason: string;
    guidance: string;
  }[];
}

const ApprovalWorkflow = ({
  chore,
  onApproval,
  onClose,
  mode,
}: ApprovalWorkflowProps) => {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState<
    "review" | "photos" | "decision"
  >("review");
  const [decision, setDecision] = useState<
    "approve" | "reject" | "request_revision" | null
  >(null);
  const [feedback, setFeedback] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState(chore.points);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [photoApprovals, setPhotoApprovals] = useState<{
    [key: string]: { approved: boolean; feedback?: string };
  }>({});
  const [revisionRequests, setRevisionRequests] = useState<
    { type: "photo" | "task"; reason: string; guidance: string }[]
  >([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const availableBadges = [
    {
      id: "excellent",
      name: "Excellent Work",
      emoji: "⭐",
      description: "Outstanding effort and results",
    },
    {
      id: "initiative",
      name: "Great Initiative",
      emoji: "🚀",
      description: "Went above and beyond",
    },
    {
      id: "improvement",
      name: "Big Improvement",
      emoji: "📈",
      description: "Showed significant progress",
    },
    {
      id: "creative",
      name: "Creative Approach",
      emoji: "🎨",
      description: "Found a creative solution",
    },
    {
      id: "helpful",
      name: "Super Helpful",
      emoji: "🤝",
      description: "Really helped the family",
    },
    {
      id: "persistent",
      name: "Never Give Up",
      emoji: "💪",
      description: "Showed great persistence",
    },
    {
      id: "careful",
      name: "Attention to Detail",
      emoji: "🔍",
      description: "Very careful and thorough",
    },
    {
      id: "responsible",
      name: "Responsible",
      emoji: "👍",
      description: "Showed great responsibility",
    },
  ];

  useEffect(() => {
    // Initialize photo approvals
    if (chore.photoVerification?.photos) {
      const initialApprovals: {
        [key: string]: { approved: boolean; feedback?: string };
      } = {};
      chore.photoVerification.photos.forEach((photo) => {
        initialApprovals[photo.id] = { approved: true, feedback: "" };
      });
      setPhotoApprovals(initialApprovals);
    }
  }, [chore]);

  const getCompletionQuality = () => {
    if (chore.metadata?.aiAnalysis?.completionScore) {
      const score = chore.metadata.aiAnalysis.completionScore;
      if (score >= 90)
        return {
          level: "excellent",
          color: "text-green-600",
          label: "Excellent",
        };
      if (score >= 75)
        return { level: "good", color: "text-blue-600", label: "Good" };
      if (score >= 60)
        return {
          level: "acceptable",
          color: "text-yellow-600",
          label: "Acceptable",
        };
      return {
        level: "needs_improvement",
        color: "text-red-600",
        label: "Needs Improvement",
      };
    }
    return { level: "unknown", color: "text-gray-600", label: "Unknown" };
  };

  const getPhotoQuality = (photo: Photo) => {
    if (photo.metadata?.quality?.overall) {
      const score = photo.metadata.quality.overall;
      if (score >= 80)
        return {
          color: "border-green-200 bg-green-50",
          label: "Excellent Quality",
        };
      if (score >= 60)
        return { color: "border-blue-200 bg-blue-50", label: "Good Quality" };
      if (score >= 40)
        return {
          color: "border-yellow-200 bg-yellow-50",
          label: "Acceptable Quality",
        };
      return { color: "border-red-200 bg-red-50", label: "Needs Better Photo" };
    }
    return { color: "border-gray-200 bg-gray-50", label: "Quality Unknown" };
  };

  const handlePhotoApproval = (
    photoId: string,
    approved: boolean,
    feedback?: string,
  ) => {
    setPhotoApprovals((prev) => ({
      ...prev,
      [photoId]: { approved, feedback: feedback || "" },
    }));
  };

  const addRevisionRequest = (
    type: "photo" | "task",
    reason: string,
    guidance: string,
  ) => {
    setRevisionRequests((prev) => [...prev, { type, reason, guidance }]);
  };

  const removeRevisionRequest = (index: number) => {
    setRevisionRequests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApproval = () => {
    if (!decision) return;

    const approvalData: ApprovalDecision = {
      decision,
      feedback: feedback.trim() || undefined,
      points: decision === "approve" ? pointsAwarded : undefined,
      badges: decision === "approve" ? selectedBadges : undefined,
      photoApprovals: chore.photoVerification?.photos
        ? photoApprovals
        : undefined,
      revisionRequests:
        decision === "request_revision" ? revisionRequests : undefined,
    };

    onApproval(approvalData);

    const messages = {
      approve: `✅ Chore approved! ${chore.assignedTo.name} earned ${pointsAwarded} points!`,
      reject: `❌ Chore not approved. Feedback has been sent to ${chore.assignedTo.name}.`,
      request_revision: `🔄 Revision requested. ${chore.assignedTo.name} will be notified with guidance.`,
    };

    toast.success(messages[decision], {
      duration: 5000,
      icon: decision === "approve" ? "🎉" : decision === "reject" ? "📝" : "🔄",
    });
  };

  const renderChoreReview = () => (
    <div className="space-y-6">
      {/* Chore Overview */}
      <div className="card bg-white shadow-lg border-2 border-blue-200">
        <div className="card-body p-6">
          <h3 className="text-xl font-bold text-blue-700 mb-4">
            📋 Chore Overview
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-lg mb-2">{chore.title}</h4>
              {chore.description && (
                <p className="text-gray-600 mb-3">{chore.description}</p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Category:</span>
                  <span
                    className={`badge ${chore.category === "Kitchen" ? "badge-warning" : chore.category === "Cleaning" ? "badge-info" : "badge-secondary"}`}
                  >
                    {chore.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Priority:</span>
                  <span
                    className={`badge ${chore.priority === "high" ? "badge-error" : chore.priority === "medium" ? "badge-warning" : "badge-success"}`}
                  >
                    {chore.priority}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Points Available:</span>
                  <span className="font-bold text-blue-600">
                    {chore.points}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Completed by:</span>
                  <div className="text-lg font-semibold text-primary">
                    {chore.assignedTo.name}
                  </div>
                </div>

                <div>
                  <span className="font-medium">Completed at:</span>
                  <div className="text-gray-700">
                    {new Date(chore.completedAt).toLocaleString()}
                  </div>
                </div>

                {chore.actualMinutes && (
                  <div>
                    <span className="font-medium">Time taken:</span>
                    <div className="text-gray-700">
                      {chore.actualMinutes} minutes
                      <span className="text-sm text-gray-500">
                        (estimated: {chore.estimatedMinutes}m)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      {chore.metadata?.aiAnalysis && (
        <div className="card bg-white shadow-lg border-2 border-purple-200">
          <div className="card-body p-6">
            <h3 className="text-xl font-bold text-purple-700 mb-4">
              🤖 AI Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {chore.metadata.aiAnalysis.completionScore}%
                </div>
                <div className="text-sm text-gray-600">Task Completion</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {chore.metadata.aiAnalysis.confidence}%
                </div>
                <div className="text-sm text-gray-600">AI Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {chore.metadata.aiAnalysis.taskAlignment}%
                </div>
                <div className="text-sm text-gray-600">Task Alignment</div>
              </div>
            </div>

            {chore.metadata.aiAnalysis.detected.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Detected in Photos:</h4>
                <div className="flex flex-wrap gap-2">
                  {chore.metadata.aiAnalysis.detected.map((item, index) => (
                    <span key={index} className="badge badge-outline badge-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {chore.metadata.aiAnalysis.suggestions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">AI Feedback:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {chore.metadata.aiAnalysis.suggestions.map(
                    (suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => {
            setDecision("approve");
            setCurrentStep("decision");
          }}
          className="btn btn-success btn-lg"
        >
          ✅ Approve Chore
        </button>
        <button
          onClick={() => {
            setDecision("request_revision");
            setCurrentStep("decision");
          }}
          className="btn btn-warning btn-lg"
        >
          🔄 Request Changes
        </button>
        <button
          onClick={() => {
            setDecision("reject");
            setCurrentStep("decision");
          }}
          className="btn btn-error btn-lg"
        >
          ❌ Reject
        </button>
      </div>
    </div>
  );

  const renderPhotoReview = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-primary mb-4">📸 Photo Review</h3>

      {chore.photoVerification?.photos.map((photo, index) => {
        const quality = getPhotoQuality(photo);
        const isApproved = photoApprovals[photo.id]?.approved !== false;

        return (
          <div
            key={photo.id}
            className={`card shadow-lg border-2 ${quality.color}`}
          >
            <div className="card-body p-6">
              <div className="flex items-start justify-between mb-4">
                <h4 className="font-bold text-lg">Photo {index + 1}</h4>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${quality.color.includes("green") ? "badge-success" : quality.color.includes("yellow") ? "badge-warning" : quality.color.includes("red") ? "badge-error" : "badge-ghost"}`}
                  >
                    {quality.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Photo Display */}
                <div>
                  <img
                    src={photo.url}
                    alt={`Chore completion photo ${index + 1}`}
                    className="w-full max-h-64 object-contain rounded-lg border-2 border-gray-200"
                  />

                  <div className="mt-3 text-xs text-gray-500">
                    Uploaded: {new Date(photo.uploadedAt).toLocaleString()}
                  </div>
                </div>

                {/* Photo Metadata */}
                <div className="space-y-4">
                  {photo.metadata?.quality && (
                    <div>
                      <h5 className="font-semibold mb-2">Quality Analysis</h5>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-semibold">Brightness</div>
                          <div>{photo.metadata.quality.brightness}%</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">Clarity</div>
                          <div>{photo.metadata.quality.clarity}%</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">Overall</div>
                          <div>{photo.metadata.quality.overall}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {photo.metadata?.aiAnalysis && (
                    <div>
                      <h5 className="font-semibold mb-2">AI Analysis</h5>
                      <div className="text-sm space-y-1">
                        <div>
                          Completion:{" "}
                          {photo.metadata.aiAnalysis.completionScore}%
                        </div>
                        <div>
                          Confidence: {photo.metadata.aiAnalysis.confidence}%
                        </div>
                        {photo.metadata.aiAnalysis.detected.length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium">Detected:</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {photo.metadata.aiAnalysis.detected.map(
                                (item, i) => (
                                  <span
                                    key={i}
                                    className="badge badge-xs badge-outline"
                                  >
                                    {item}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Photo Approval Controls */}
                  <div className="border-t pt-4">
                    <h5 className="font-semibold mb-3">Photo Approval</h5>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <label className="label cursor-pointer">
                          <input
                            type="radio"
                            name={`photo-${photo.id}`}
                            checked={isApproved}
                            onChange={() => handlePhotoApproval(photo.id, true)}
                            className="radio radio-success"
                          />
                          <span className="label-text ml-2">✅ Approve</span>
                        </label>
                        <label className="label cursor-pointer">
                          <input
                            type="radio"
                            name={`photo-${photo.id}`}
                            checked={!isApproved}
                            onChange={() =>
                              handlePhotoApproval(photo.id, false)
                            }
                            className="radio radio-error"
                          />
                          <span className="label-text ml-2">❌ Reject</span>
                        </label>
                      </div>

                      <textarea
                        placeholder="Optional feedback for this photo..."
                        value={photoApprovals[photo.id]?.feedback || ""}
                        onChange={(e) =>
                          handlePhotoApproval(
                            photo.id,
                            isApproved,
                            e.target.value,
                          )
                        }
                        className="textarea textarea-bordered w-full text-sm"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderDecisionStep = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-primary mb-4">
        {decision === "approve"
          ? "✅ Approve Chore"
          : decision === "reject"
            ? "❌ Reject Chore"
            : "🔄 Request Revision"}
      </h3>

      {decision === "approve" && (
        <div className="space-y-6">
          {/* Points Award */}
          <div className="card bg-green-50 border-2 border-green-200">
            <div className="card-body p-6">
              <h4 className="font-bold text-green-700 mb-4">
                🏆 Points & Recognition
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">
                      Points to Award
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max={chore.points * 1.5}
                      value={pointsAwarded}
                      onChange={(e) => setPointsAwarded(Number(e.target.value))}
                      className="range range-primary"
                    />
                    <span className="font-bold text-primary text-lg">
                      {pointsAwarded}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Original: {chore.points} points | Max:{" "}
                    {Math.round(chore.points * 1.5)} points
                  </div>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">
                      Achievement Badges
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableBadges.map((badge) => (
                      <label key={badge.id} className="label cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBadges.includes(badge.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBadges((prev) => [...prev, badge.id]);
                            } else {
                              setSelectedBadges((prev) =>
                                prev.filter((id) => id !== badge.id),
                              );
                            }
                          }}
                          className="checkbox checkbox-primary checkbox-sm"
                        />
                        <span className="label-text text-sm">
                          {badge.emoji} {badge.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {decision === "request_revision" && (
        <div className="card bg-yellow-50 border-2 border-yellow-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-yellow-700 mb-4">
              🔄 Revision Requests
            </h4>

            <div className="space-y-4">
              {revisionRequests.map((request, index) => (
                <div key={index} className="alert alert-warning">
                  <div className="flex-1">
                    <div className="font-semibold">
                      {request.type === "photo"
                        ? "📸 Photo Issue"
                        : "📋 Task Issue"}
                      : {request.reason}
                    </div>
                    <div className="text-sm mt-1">{request.guidance}</div>
                  </div>
                  <button
                    onClick={() => removeRevisionRequest(index)}
                    className="btn btn-ghost btn-xs"
                  >
                    ❌
                  </button>
                </div>
              ))}

              <button
                onClick={() => {
                  const reason = prompt("What needs to be revised?");
                  const guidance = prompt("What guidance should they receive?");
                  if (reason && guidance) {
                    addRevisionRequest("task", reason, guidance);
                  }
                }}
                className="btn btn-warning btn-sm"
              >
                + Add Revision Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      <div className="card bg-white shadow-lg border-2 border-gray-200">
        <div className="card-body p-6">
          <h4 className="font-bold mb-4">
            💬 Feedback for {chore.assignedTo.name}
          </h4>
          <textarea
            placeholder={`Write encouraging feedback for ${chore.assignedTo.name}...`}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="textarea textarea-bordered w-full"
            rows={4}
          />
          <div className="text-xs text-gray-500 mt-2">
            This feedback will be sent to {chore.assignedTo.name} along with
            your decision.
          </div>
        </div>
      </div>

      {/* Submit Decision */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setCurrentStep("review")}
          className="btn btn-ghost"
        >
          ← Back to Review
        </button>
        <button
          onClick={handleApproval}
          className={`btn btn-lg ${
            decision === "approve"
              ? "btn-success"
              : decision === "reject"
                ? "btn-error"
                : "btn-warning"
          }`}
        >
          {decision === "approve"
            ? "✅ Approve & Award Points"
            : decision === "reject"
              ? "❌ Reject Chore"
              : "🔄 Send Revision Request"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">
          🔍 Chore Review & Approval
        </h2>
        <p className="text-gray-600">
          Review {chore.assignedTo.name}'s completion of "{chore.title}"
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="steps steps-horizontal">
          <div
            className={`step ${currentStep === "review" || currentStep === "photos" || currentStep === "decision" ? "step-primary" : ""}`}
          >
            📋 Review
          </div>
          {chore.photoVerification?.photos &&
            chore.photoVerification.photos.length > 0 && (
              <div
                className={`step ${currentStep === "photos" || currentStep === "decision" ? "step-primary" : ""}`}
              >
                📸 Photos
              </div>
            )}
          <div
            className={`step ${currentStep === "decision" ? "step-primary" : ""}`}
          >
            ✅ Decision
          </div>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === "review" && renderChoreReview()}
      {currentStep === "photos" && renderPhotoReview()}
      {currentStep === "decision" && renderDecisionStep()}

      {/* Navigation */}
      {currentStep !== "decision" && (
        <div className="flex justify-between items-center mt-8">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel Review
          </button>

          <div className="flex gap-4">
            {currentStep === "review" &&
              chore.photoVerification?.photos &&
              chore.photoVerification.photos.length > 0 && (
                <button
                  onClick={() => setCurrentStep("photos")}
                  className="btn btn-primary"
                >
                  Review Photos →
                </button>
              )}
            {currentStep === "photos" && (
              <button
                onClick={() => setCurrentStep("decision")}
                className="btn btn-primary"
              >
                Make Decision →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalWorkflow;
