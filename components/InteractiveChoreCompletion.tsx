"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";

import CelebrationAnimation from "./CelebrationAnimation";
import EnhancedPhotoVerification from "./EnhancedPhotoVerification";

interface InteractiveChoreCompletionProps {
  chore: ChoreData;
  onComplete: (completionData: ChoreCompletionData) => void;
  onCancel: () => void;
}

interface ChoreData {
  _id: string;
  title: string;
  description?: string;
  category: string;
  priority: "low" | "medium" | "high";
  points: number;
  estimatedMinutes: number;
  requiresPhotoVerification: boolean;
  instructions?: string;
  familyId: string;
  assignedTo: {
    _id: string;
    name: string;
  };
  assignedBy: {
    _id: string;
    name: string;
  };
  metadata?: {
    aiInstructions?: {
      stepByStep: string[];
      motivationalMessage: string;
      safetyReminders: string[];
      tips: string[];
    };
  };
}

interface ChoreCompletionData {
  choreId: string;
  completedAt: string;
  timeSpent: number;
  photos?: any[];
  feedback?: string;
  enjoymentLevel: number;
  difficultyRating: number;
}

const InteractiveChoreCompletion = ({
  chore,
  onComplete,
  onCancel,
}: InteractiveChoreCompletionProps) => {
  const { data: session } = useSession();
  const { emitEvent } = useRealTimeUpdates({ familyId: chore.familyId });

  const [currentStep, setCurrentStep] = useState<
    "instructions" | "timer" | "photo" | "feedback" | "celebration"
  >("instructions");
  const [isStarted, setIsStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [feedback, setFeedback] = useState("");
  const [enjoymentLevel, setEnjoymentLevel] = useState(5);
  const [difficultyRating, setDifficultyRating] = useState(3);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (isStarted && startTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor(
          (now.getTime() - startTime.getTime()) / 1000,
        );
        setTimeSpent(elapsed);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isStarted, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startChore = async () => {
    const now = new Date();
    setStartTime(now);
    startTimeRef.current = now;
    setIsStarted(true);
    setCurrentStep("timer");

    // Emit real-time event
    await emitEvent({
      type: "chore_started" as any,
      familyId: chore.familyId,
      data: {
        choreId: chore._id,
        choreTitle: chore.title,
        startTime: now.toISOString(),
      },
    });

    toast.success("🚀 Chore started! You've got this!", {
      icon: "💪",
      duration: 3000,
    });
  };

  const toggleStep = (stepIndex: number) => {
    setCompletedSteps((prev) => {
      const newSteps = prev.includes(stepIndex)
        ? prev.filter((i) => i !== stepIndex)
        : [...prev, stepIndex];

      // Animate step completion
      if (!prev.includes(stepIndex)) {
        toast.success(`Step ${stepIndex + 1} completed! 🎉`, {
          duration: 2000,
          icon: "✅",
        });
      }

      return newSteps;
    });
  };

  const finishTimer = () => {
    if (chore.requiresPhotoVerification) {
      setCurrentStep("photo");
    } else {
      setCurrentStep("feedback");
    }

    toast.success("Great job! Time to wrap up! 🏁", {
      duration: 3000,
    });
  };

  const handlePhotoSubmitted = (photoData: any) => {
    setPhotos((prev) => [...prev, photoData]);
    setCurrentStep("feedback");
  };

  const submitCompletion = async () => {
    if (!startTimeRef.current) return;

    setIsSubmitting(true);

    try {
      const completionData: ChoreCompletionData = {
        choreId: chore._id,
        completedAt: new Date().toISOString(),
        timeSpent: Math.floor(timeSpent / 60), // Convert to minutes
        photos: photos.length > 0 ? photos : undefined,
        feedback: feedback.trim() || undefined,
        enjoymentLevel,
        difficultyRating,
      };

      // Emit completion event
      await emitEvent({
        type: "chore_completed",
        familyId: chore.familyId,
        data: {
          choreId: chore._id,
          choreTitle: chore.title,
          timeSpent: completionData.timeSpent,
          enjoymentLevel,
          difficultyRating,
        },
      });

      // Show celebration before calling completion
      setShowCelebration(true);
      setCurrentStep("celebration");

      // Wait for celebration, then complete
      setTimeout(() => {
        onComplete(completionData);
      }, 3000);
    } catch (error) {
      console.error("Error submitting completion:", error);
      toast.error("Failed to submit completion. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInstructions = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-primary mb-2">
          📋 {chore.title}
        </h2>
        <p className="text-gray-600">
          Ready to start? Let's go through the instructions first!
        </p>
      </div>

      {/* Chore Details */}
      <div className="card bg-white shadow-lg border-2 border-blue-200">
        <div className="card-body p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {chore.points}
              </div>
              <div className="text-sm text-gray-600">Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {chore.estimatedMinutes}min
              </div>
              <div className="text-sm text-gray-600">Estimated Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {chore.category}
              </div>
              <div className="text-sm text-gray-600">Category</div>
            </div>
          </div>

          {chore.description && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Description:</h4>
              <p className="text-gray-700">{chore.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Instructions */}
      {chore.metadata?.aiInstructions && (
        <div className="space-y-4">
          {/* Motivational Message */}
          {chore.metadata.aiInstructions.motivationalMessage && (
            <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
              <div className="card-body p-6">
                <h4 className="font-bold text-yellow-700 mb-3">
                  🌟 Your Motivation
                </h4>
                <p className="text-yellow-700 italic text-lg">
                  "{chore.metadata.aiInstructions.motivationalMessage}"
                </p>
              </div>
            </div>
          )}

          {/* Step by Step Instructions */}
          <div className="card bg-white shadow-lg border-2 border-green-200">
            <div className="card-body p-6">
              <h4 className="font-bold text-green-700 mb-4">
                📝 Step-by-Step Instructions
              </h4>
              <div className="space-y-3">
                {chore.metadata.aiInstructions.stepByStep.map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 flex-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Safety Reminders */}
          {chore.metadata.aiInstructions.safetyReminders.length > 0 && (
            <div className="card bg-white shadow-lg border-2 border-red-200">
              <div className="card-body p-6">
                <h4 className="font-bold text-red-700 mb-4">
                  ⚠️ Safety Reminders
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {chore.metadata.aiInstructions.safetyReminders.map(
                    (reminder, index) => (
                      <li key={index} className="text-red-700">
                        {reminder}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Tips for Success */}
          {chore.metadata.aiInstructions.tips.length > 0 && (
            <div className="card bg-white shadow-lg border-2 border-blue-200">
              <div className="card-body p-6">
                <h4 className="font-bold text-blue-700 mb-4">
                  💡 Tips for Success
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {chore.metadata.aiInstructions.tips.map((tip, index) => (
                    <li key={index} className="text-blue-700">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Start Button */}
      <div className="text-center">
        <button onClick={startChore} className="btn btn-primary btn-lg">
          🚀 Start This Chore!
        </button>
      </div>
    </div>
  );

  const renderTimer = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-primary mb-2">
          ⏱️ Working on: {chore.title}
        </h2>
        <p className="text-gray-600">
          Track your progress and check off steps as you go!
        </p>
      </div>

      {/* Timer Display */}
      <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="card-body p-8 text-center">
          <div className="text-6xl font-bold text-blue-600 mb-2">
            {formatTime(timeSpent)}
          </div>
          <div className="text-gray-600">
            Estimated: {chore.estimatedMinutes} minutes
          </div>
          {timeSpent > 0 && (
            <div className="text-sm text-gray-500 mt-2">
              {timeSpent > chore.estimatedMinutes * 60
                ? "Taking your time - that's great!"
                : "Right on track!"}
            </div>
          )}
        </div>
      </div>

      {/* Progress Tracking */}
      {chore.metadata?.aiInstructions?.stepByStep && (
        <div className="card bg-white shadow-lg border-2 border-green-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-green-700 mb-4">
              ✅ Progress Tracker ({completedSteps.length}/
              {chore.metadata.aiInstructions.stepByStep.length})
            </h4>
            <div className="space-y-3">
              {chore.metadata.aiInstructions.stepByStep.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      isCompleted
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200 hover:border-green-300"
                    }`}
                    onClick={() => toggleStep(index)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {isCompleted ? "✓" : index + 1}
                    </div>
                    <p
                      className={`flex-1 transition-all ${
                        isCompleted
                          ? "text-green-700 line-through"
                          : "text-gray-700"
                      }`}
                    >
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${(completedSteps.length / chore.metadata.aiInstructions.stepByStep.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
        <button onClick={finishTimer} className="btn btn-primary btn-lg">
          🏁 I'm Done!
        </button>
      </div>
    </div>
  );

  const renderFeedback = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-primary mb-2">🎉 Great Job!</h2>
        <p className="text-gray-600">
          Tell us about your experience completing "{chore.title}"
        </p>
      </div>

      {/* Completion Summary */}
      <div className="card bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
        <div className="card-body p-6">
          <h4 className="font-bold text-green-700 mb-4">
            📊 Completion Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatTime(timeSpent)}
              </div>
              <div className="text-sm text-gray-600">Time Spent</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {chore.points}
              </div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {chore.metadata?.aiInstructions ? completedSteps.length : "N/A"}
              </div>
              <div className="text-sm text-gray-600">Steps Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {photos.length > 0 ? "📸" : "📝"}
              </div>
              <div className="text-sm text-gray-600">Evidence</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Form */}
      <div className="space-y-4">
        {/* Enjoyment Level */}
        <div className="card bg-white shadow-lg border-2 border-yellow-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-yellow-700 mb-4">
              😊 How much did you enjoy this chore?
            </h4>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setEnjoymentLevel(level)}
                  className={`btn btn-circle ${
                    enjoymentLevel === level ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  {level === 1
                    ? "😞"
                    : level === 2
                      ? "😐"
                      : level === 3
                        ? "🙂"
                        : level === 4
                          ? "😊"
                          : "😍"}
                </button>
              ))}
            </div>
            <div className="text-center mt-2 text-sm text-gray-600">
              {enjoymentLevel === 1
                ? "Not fun"
                : enjoymentLevel === 2
                  ? "Okay"
                  : enjoymentLevel === 3
                    ? "It was fine"
                    : enjoymentLevel === 4
                      ? "Pretty fun!"
                      : "Loved it!"}
            </div>
          </div>
        </div>

        {/* Difficulty Rating */}
        <div className="card bg-white shadow-lg border-2 border-orange-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-orange-700 mb-4">
              💪 How challenging was this chore?
            </h4>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficultyRating(level)}
                  className={`btn btn-circle ${
                    difficultyRating === level ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  {level === 1
                    ? "😴"
                    : level === 2
                      ? "🙂"
                      : level === 3
                        ? "🤔"
                        : level === 4
                          ? "😤"
                          : "🥵"}
                </button>
              ))}
            </div>
            <div className="text-center mt-2 text-sm text-gray-600">
              {difficultyRating === 1
                ? "Too easy"
                : difficultyRating === 2
                  ? "Easy"
                  : difficultyRating === 3
                    ? "Just right"
                    : difficultyRating === 4
                      ? "Challenging"
                      : "Very hard"}
            </div>
          </div>
        </div>

        {/* Optional Feedback */}
        <div className="card bg-white shadow-lg border-2 border-blue-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-blue-700 mb-4">
              💬 Anything else to share? (Optional)
            </h4>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="How did it go? Any challenges or things you learned?"
              className="textarea textarea-bordered w-full"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1">
              {feedback.length}/500 characters
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <button
          onClick={submitCompletion}
          disabled={isSubmitting}
          className="btn btn-primary btn-lg"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              Submitting...
            </>
          ) : (
            <>🎉 Complete Chore!</>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="steps steps-horizontal">
          <div
            className={`step ${currentStep === "instructions" || currentStep === "timer" || currentStep === "photo" || currentStep === "feedback" || currentStep === "celebration" ? "step-primary" : ""}`}
          >
            📋 Instructions
          </div>
          <div
            className={`step ${currentStep === "timer" || currentStep === "photo" || currentStep === "feedback" || currentStep === "celebration" ? "step-primary" : ""}`}
          >
            ⏱️ Work
          </div>
          {chore.requiresPhotoVerification && (
            <div
              className={`step ${currentStep === "photo" || currentStep === "feedback" || currentStep === "celebration" ? "step-primary" : ""}`}
            >
              📸 Photo
            </div>
          )}
          <div
            className={`step ${currentStep === "feedback" || currentStep === "celebration" ? "step-primary" : ""}`}
          >
            💬 Feedback
          </div>
          <div
            className={`step ${currentStep === "celebration" ? "step-primary" : ""}`}
          >
            🎉 Done
          </div>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === "instructions" && renderInstructions()}
      {currentStep === "timer" && renderTimer()}
      {currentStep === "photo" && (
        <EnhancedPhotoVerification
          chore={chore as any}
          onPhotoSubmitted={handlePhotoSubmitted}
          onCancel={() => setCurrentStep("feedback")}
          mode="capture"
        />
      )}
      {currentStep === "feedback" && renderFeedback()}

      {/* Celebration Overlay */}
      {showCelebration && (
        <CelebrationAnimation
          title="Chore Completed!"
          subtitle={`Great job on "${chore.title}"!`}
          points={chore.points}
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
};

export default InteractiveChoreCompletion;
