"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface HelpRequest {
  _id: string;
  choreId: string;
  message: string;
  status: "pending" | "in_progress" | "resolved";
  response?: string;
  createdAt: string;
  respondedAt?: string;
}

interface Chore {
  _id: string;
  title: string;
  category?: string;
}

interface HelpRequestProps {
  chore: Chore;
  userId: string;
  onClose: () => void;
  onHelpSent: () => void;
  isOpen: boolean;
}

const HelpRequest = ({ chore, userId, onClose, onHelpSent, isOpen }: HelpRequestProps) => {
  const [helpMessage, setHelpMessage] = useState("");
  const [helpType, setHelpType] = useState("question");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequests, setExistingRequests] = useState<HelpRequest[]>([]);
  const [showExisting, setShowExisting] = useState(false);

  const helpTypes = [
    {
      id: "question",
      emoji: "❓",
      title: "I have a question",
      description: "Ask about how to do something"
    },
    {
      id: "stuck",
      emoji: "😅",
      title: "I'm stuck",
      description: "Need help figuring out a step"
    },
    {
      id: "confused",
      emoji: "🤔",
      title: "I'm confused",
      description: "Don't understand the instructions"
    },
    {
      id: "need_supplies",
      emoji: "🧰",
      title: "Need supplies",
      description: "Missing tools or materials"
    },
    {
      id: "safety",
      emoji: "⚠️",
      title: "Safety concern",
      description: "Something doesn't feel safe"
    },
    {
      id: "other",
      emoji: "💭",
      title: "Something else",
      description: "Other type of help needed"
    }
  ];

  const helpSuggestions = [
    "How do I start this chore?",
    "What tools do I need?",
    "I don't understand step 3",
    "Is this the right way to do it?",
    "Where can I find the supplies?",
    "How long should this take?",
    "Can you show me how?",
    "Is this safe for me to do?",
    "I'm having trouble with...",
    "Can someone help me?"
  ];

  useEffect(() => {
    if (isOpen) {
      fetchExistingRequests();
    }
  }, [isOpen, chore._id]);

  const fetchExistingRequests = async () => {
    try {
      const response = await fetch(`/api/help-requests?choreId=${chore._id}&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setExistingRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching help requests:", error);
    }
  };

  const handleSubmitHelp = async () => {
    if (!helpMessage.trim()) {
      toast.error("Please tell us what you need help with! 😊");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/help-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          choreId: chore._id,
          userId,
          message: helpMessage,
          type: helpType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send help request");
      }

      toast.success("Help request sent! Someone will help you soon! 🤝", {
        icon: "🆘",
        duration: 5000,
      });

      setHelpMessage("");
      setHelpType("question");
      onHelpSent();
      fetchExistingRequests();
    } catch (error) {
      console.error("Error sending help request:", error);
      toast.error("Oops! Couldn't send help request. Try again! 😊");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case "pending": return "⏳";
      case "in_progress": return "👀";
      case "resolved": return "✅";
      default: return "❓";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-3xl bg-gradient-to-br from-white to-purple-50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🆘</div>
          <h3 className="text-3xl font-bold text-primary mb-2">
            Ask for Help!
          </h3>
          <p className="text-lg text-gray-600">
            It's totally okay to ask for help with: <strong>{chore.title}</strong> {getCategoryEmoji(chore.category)}
          </p>
        </div>

        {/* Encouraging message */}
        <div className="alert alert-info mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💡</span>
            <div>
              <h4 className="font-bold">Remember:</h4>
              <p>Asking for help is super smart! Even adults ask for help all the time. 
                 We're here to support you and make sure you succeed! 🌟</p>
            </div>
          </div>
        </div>

        {/* Existing help requests */}
        {existingRequests.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-lg">📋 Your Previous Requests</h4>
              <button
                onClick={() => setShowExisting(!showExisting)}
                className="btn btn-ghost btn-sm"
              >
                {showExisting ? "Hide" : "Show"} ({existingRequests.length})
              </button>
            </div>
            
            {showExisting && (
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {existingRequests.map((request) => (
                  <div key={request._id} className="card bg-white shadow-sm border-l-4 border-l-info">
                    <div className="card-body p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{getStatusEmoji(request.status)}</span>
                            <span className={`badge badge-sm ${
                              request.status === "resolved" ? "badge-success" :
                              request.status === "in_progress" ? "badge-warning" :
                              "badge-info"
                            }`}>
                              {request.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(request.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{request.message}</p>
                          {request.response && (
                            <div className="bg-green-50 p-2 rounded border-l-4 border-l-green-300">
                              <p className="text-sm text-green-700">
                                <strong>Response:</strong> {request.response}
                              </p>
                              {request.respondedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                  Responded {formatTimeAgo(request.respondedAt)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Help type selection */}
        <div className="mb-6">
          <h4 className="font-bold text-lg mb-4">🤔 What kind of help do you need?</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {helpTypes.map((type) => (
              <label
                key={type.id}
                className={`card cursor-pointer transition-all transform hover:scale-105 ${
                  helpType === type.id 
                    ? "bg-primary text-primary-content border-2 border-primary" 
                    : "bg-white hover:bg-base-200 border-2 border-transparent"
                }`}
              >
                <div className="card-body p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="helpType"
                      value={type.id}
                      checked={helpType === type.id}
                      onChange={(e) => setHelpType(e.target.value)}
                      className="radio radio-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{type.emoji}</span>
                        <span className="font-bold">{type.title}</span>
                      </div>
                      <p className="text-sm opacity-80">{type.description}</p>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Message input */}
        <div className="mb-6">
          <h4 className="font-bold text-lg mb-3">✍️ Tell us what you need help with:</h4>
          <textarea
            value={helpMessage}
            onChange={(e) => setHelpMessage(e.target.value)}
            placeholder="Don't worry about spelling or grammar - just tell us what's on your mind! For example: 'I don't know where to find the cleaning supplies' or 'Step 2 is confusing to me'..."
            className="textarea textarea-bordered w-full h-32 text-base"
            disabled={isSubmitting}
          />
          
          {/* Quick suggestions */}
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">💡 Need ideas? Click any of these:</p>
            <div className="flex flex-wrap gap-2">
              {helpSuggestions.slice(0, 6).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setHelpMessage(suggestion)}
                  className="btn btn-ghost btn-xs normal-case"
                  disabled={isSubmitting}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Safety reminder */}
        {helpType === "safety" && (
          <div className="alert alert-warning mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h4 className="font-bold">Safety First!</h4>
                <p>Great job thinking about safety! If something feels unsafe, 
                   STOP what you're doing and ask for help right away. You're being very smart! 🛡️</p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="modal-action">
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            
            <button
              onClick={handleSubmitHelp}
              disabled={isSubmitting || !helpMessage.trim()}
              className="btn btn-primary btn-lg font-bold flex-1"
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  Sending Help Request...
                </>
              ) : (
                <>
                  <span className="text-xl mr-2">🚀</span>
                  Send Help Request
                </>
              )}
            </button>
          </div>
        </div>

        {/* Encouraging footer */}
        <div className="text-center mt-6 p-4 bg-white/50 rounded-xl">
          <div className="text-3xl mb-2">🤝</div>
          <p className="text-sm text-gray-600">
            You're being super responsible by asking for help! 
            Someone will respond to you as soon as possible. Keep being awesome! 💪✨
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpRequest;