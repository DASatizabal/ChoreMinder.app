"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

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
  assignedBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

interface ChoreDetailProps {
  chore: Chore;
  onClose: () => void;
  onStatusUpdate: (choreId: string, newStatus: string) => void;
  onHelpRequest: (choreId: string, message: string) => void;
  isOpen: boolean;
}

const ChoreDetail = ({ chore, onClose, onStatusUpdate, onHelpRequest, isOpen }: ChoreDetailProps) => {
  const [showInstructions, setShowInstructions] = useState(true);
  const [helpMessage, setHelpMessage] = useState("");
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Timer effect for tracking time spent
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setTimeSpent(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, startTime]);

  const getCategoryEmoji = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "cleaning": return "🧹";
      case "kitchen": return "🍽️";
      case "laundry": return "👕";
      case "outdoor": return "🌳";
      case "pet care": return "🐕";
      case "homework": return "📚";
      case "organization": return "📦";
      default: return "⭐";
    }
  };

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case "high": return "🚨";
      case "medium": return "⚡";
      case "low": return "😎";
      default: return "📝";
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case "pending": return "⏳";
      case "in_progress": return "🔥";
      case "completed": return "✅";
      case "verified": return "🏆";
      case "rejected": return "😅";
      default: return "📝";
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending": return "Ready to start this awesome chore! 🚀";
      case "in_progress": return "You're doing great! Keep going! 💪";
      case "completed": return "Amazing work! Waiting for approval! 🎉";
      case "verified": return "You're a champion! This chore is complete! 🏆";
      case "rejected": return "No worries! Let's try again together! 😊";
      default: return "Let's get started! 🌟";
    }
  };

  const isOverdue = () => {
    if (!chore.dueDate) return false;
    return new Date(chore.dueDate) < new Date();
  };

  const getTimeUntilDue = () => {
    if (!chore.dueDate) return null;
    
    const now = new Date();
    const due = new Date(chore.dueDate);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) return "Overdue - but you can still do it! 💪";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left - plenty of time! ⏰`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left - you've got this! ⏰`;
    return "Due soon - but no pressure! 🕐";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartChore = () => {
    setTimerRunning(true);
    setStartTime(new Date());
    onStatusUpdate(chore._id, "in_progress");
    toast.success("Great job starting! You're awesome! 🚀", {
      icon: "🎯",
      duration: 4000,
    });
  };

  const handleCompleteChore = () => {
    setTimerRunning(false);
    onStatusUpdate(chore._id, "completed");
    toast.success("Fantastic work! You completed the chore! 🎉", {
      icon: "🏆",
      duration: 5000,
    });
  };

  const handleHelpSubmit = () => {
    if (!helpMessage.trim()) {
      toast.error("Please tell us what you need help with! 😊");
      return;
    }
    
    onHelpRequest(chore._id, helpMessage);
    setHelpMessage("");
    setShowHelpForm(false);
    toast.success("Help request sent! Someone will help you soon! 🤝", {
      icon: "🆘",
      duration: 4000,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl bg-gradient-to-br from-white to-blue-50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">{getCategoryEmoji(chore.category)}</span>
            <span className="text-4xl">{getStatusEmoji(chore.status)}</span>
          </div>
          
          <h3 className="text-3xl font-bold text-primary mb-2">
            {chore.title}
          </h3>
          
          <p className="text-lg text-gray-600 mb-4">
            {getStatusMessage(chore.status)}
          </p>

          {/* Status badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            <div className={`badge badge-lg font-bold ${
              chore.status === "verified" ? "badge-success" :
              chore.status === "completed" ? "badge-info" :
              chore.status === "in_progress" ? "badge-warning" :
              chore.status === "rejected" ? "badge-error" :
              "badge-ghost"
            }`}>
              {getStatusEmoji(chore.status)} {chore.status.replace("_", " ")}
            </div>
            
            <div className={`badge badge-lg font-bold ${
              chore.priority === "high" ? "badge-error" :
              chore.priority === "medium" ? "badge-warning" :
              "badge-success"
            }`}>
              {getPriorityEmoji(chore.priority)} {chore.priority} priority
            </div>
            
            <div className="badge badge-primary badge-lg font-bold">
              💰 {chore.points} points
            </div>
            
            {chore.requiresPhotoVerification && (
              <div className="badge badge-accent badge-lg font-bold">
                📸 Photo needed
              </div>
            )}
          </div>
        </div>

        {/* Timer for in-progress chores */}
        {chore.status === "in_progress" && (
          <div className="card bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-300 mb-6">
            <div className="card-body p-4 text-center">
              <h4 className="font-bold text-lg text-orange-700">⏱️ Time Tracker</h4>
              <div className="text-3xl font-bold text-orange-800 mb-2">
                {formatTime(timeSpent)}
              </div>
              <p className="text-sm text-orange-600">
                {chore.estimatedMinutes ? 
                  `Goal: ${chore.estimatedMinutes} minutes - You're doing great! 💪` :
                  "Take your time and do your best! 🌟"
                }
              </p>
            </div>
          </div>
        )}

        {/* Due date warning */}
        {chore.dueDate && (
          <div className={`alert mb-6 ${isOverdue() ? "alert-warning" : "alert-info"}`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <div>
                <h4 className="font-bold">Due Date Info</h4>
                <p>{getTimeUntilDue()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {chore.description && (
          <div className="card bg-white shadow-lg border-2 border-blue-200 mb-6">
            <div className="card-body p-6">
              <h4 className="card-title text-xl text-blue-700 mb-3">
                📝 What is this chore about?
              </h4>
              <p className="text-gray-700 text-lg leading-relaxed">
                {chore.description}
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        {chore.instructions && (
          <div className="card bg-white shadow-lg border-2 border-green-200 mb-6">
            <div className="card-body p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="card-title text-xl text-green-700">
                  📋 Step-by-Step Instructions
                </h4>
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="btn btn-ghost btn-sm"
                >
                  {showInstructions ? "Hide" : "Show"} Instructions
                </button>
              </div>
              
              {showInstructions && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-gray-700 font-sans text-base leading-relaxed">
                    {chore.instructions}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rejection reason */}
        {chore.status === "rejected" && chore.rejectionReason && (
          <div className="alert alert-warning mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💭</span>
              <div>
                <h4 className="font-bold">Feedback from {chore.assignedBy.name}</h4>
                <p>{chore.rejectionReason}</p>
                <p className="text-sm mt-1">Don't worry - we can fix this together! 😊</p>
              </div>
            </div>
          </div>
        )}

        {/* Help request form */}
        {showHelpForm && (
          <div className="card bg-gradient-to-r from-purple-100 to-pink-100 border-4 border-purple-300 mb-6">
            <div className="card-body p-6">
              <h4 className="card-title text-xl text-purple-700 mb-4">
                🆘 Ask for Help
              </h4>
              <p className="text-purple-600 mb-4">
                It's totally okay to ask for help! What do you need assistance with?
              </p>
              <textarea
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder="Tell us what you're confused about or what you need help with..."
                className="textarea textarea-bordered w-full mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleHelpSubmit}
                  className="btn btn-primary"
                >
                  Send Help Request 🚀
                </button>
                <button
                  onClick={() => {
                    setShowHelpForm(false);
                    setHelpMessage("");
                  }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="stat bg-white shadow-lg rounded-xl border-2 border-gray-200">
            <div className="stat-figure text-4xl">💰</div>
            <div className="stat-title text-gray-600">You'll Earn</div>
            <div className="stat-value text-primary">{chore.points}</div>
            <div className="stat-desc text-gray-500">Awesome points!</div>
          </div>

          <div className="stat bg-white shadow-lg rounded-xl border-2 border-gray-200">
            <div className="stat-figure text-4xl">⏱️</div>
            <div className="stat-title text-gray-600">Time Needed</div>
            <div className="stat-value text-secondary">{chore.estimatedMinutes || "?"}</div>
            <div className="stat-desc text-gray-500">Minutes (about)</div>
          </div>

          <div className="stat bg-white shadow-lg rounded-xl border-2 border-gray-200">
            <div className="stat-figure text-4xl">👤</div>
            <div className="stat-title text-gray-600">Assigned By</div>
            <div className="stat-value text-accent text-sm">{chore.assignedBy.name}</div>
            <div className="stat-desc text-gray-500">Your awesome parent!</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="modal-action">
          <div className="flex flex-wrap gap-3 w-full">
            <button
              onClick={onClose}
              className="btn btn-ghost"
            >
              Close
            </button>

            {!showHelpForm && (
              <button
                onClick={() => setShowHelpForm(true)}
                className="btn btn-info"
              >
                🆘 Need Help?
              </button>
            )}

            {chore.status === "pending" && (
              <button
                onClick={handleStartChore}
                className="btn btn-primary btn-lg font-bold flex-1"
              >
                🚀 Start This Chore!
              </button>
            )}

            {chore.status === "in_progress" && (
              <button
                onClick={handleCompleteChore}
                className="btn btn-success btn-lg font-bold flex-1"
              >
                ✅ Mark as Complete!
              </button>
            )}

            {chore.status === "rejected" && (
              <button
                onClick={() => onStatusUpdate(chore._id, "pending")}
                className="btn btn-warning btn-lg font-bold flex-1"
              >
                🔄 Try Again!
              </button>
            )}
          </div>
        </div>

        {/* Encouraging footer */}
        <div className="text-center mt-6 p-4 bg-white/50 rounded-xl">
          <div className="text-3xl mb-2">🌟</div>
          <p className="text-sm text-gray-600">
            Remember: Every chore helps your family and makes you stronger! 
            You've got this, champion! 💪✨
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChoreDetail;