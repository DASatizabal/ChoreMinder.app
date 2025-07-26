"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ChoreDetail from "./ChoreDetail";
import StatusControls from "./StatusControls";
import HelpRequest from "./HelpRequest";

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
}

interface MyChoresProps {
  userId: string;
  familyId: string;
  onChoreUpdated: () => void;
  refreshTrigger: number;
}

const MyChores = ({ userId, familyId, onChoreUpdated, refreshTrigger }: MyChoresProps) => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [showChoreDetail, setShowChoreDetail] = useState(false);
  const [showHelpRequest, setShowHelpRequest] = useState(false);
  const [helpRequestChore, setHelpRequestChore] = useState<Chore | null>(null);

  useEffect(() => {
    fetchMyChores();
  }, [userId, familyId, refreshTrigger]);

  const fetchMyChores = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chores?assignedTo=${userId}&familyId=${familyId}`);
      if (!response.ok) throw new Error("Failed to fetch chores");
      
      const data = await response.json();
      setChores(data.chores || []);
    } catch (error) {
      console.error("Error fetching chores:", error);
      toast.error("Couldn't load your chores. Try refreshing!");
    } finally {
      setLoading(false);
    }
  };

  const updateChoreStatus = async (choreId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/chores/${choreId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update chore");
      }

      // Show encouraging messages
      if (newStatus === "in_progress") {
        toast.success("Great! You started the chore! 🚀", {
          icon: "🎯",
          duration: 4000,
        });
      } else if (newStatus === "completed") {
        toast.success("Awesome job! Chore completed! 🎉", {
          icon: "🏆",
          duration: 5000,
        });
      }

      onChoreUpdated();
      fetchMyChores(); // Refresh the chores list
    } catch (error) {
      console.error("Error updating chore:", error);
      toast.error(error instanceof Error ? error.message : "Oops! Something went wrong");
    }
  };

  const handleHelpRequest = async (choreId: string, message: string) => {
    try {
      const response = await fetch("/api/help-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          choreId,
          userId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send help request");
      }

      toast.success("Help request sent! Someone will help you soon! 🤝", {
        icon: "🆘",
        duration: 4000,
      });
    } catch (error) {
      console.error("Error sending help request:", error);
      toast.error("Oops! Couldn't send help request. Try again! 😊");
    }
  };

  const openChoreDetail = (chore: Chore) => {
    setSelectedChore(chore);
    setShowChoreDetail(true);
  };

  const openHelpRequest = (chore: Chore) => {
    setHelpRequestChore(chore);
    setShowHelpRequest(true);
  };

  const filteredChores = chores.filter(chore => {
    if (filter === "todo") return chore.status === "pending";
    if (filter === "doing") return chore.status === "in_progress";
    if (filter === "done") return ["completed", "verified"].includes(chore.status);
    if (filter === "overdue") {
      return chore.dueDate && new Date(chore.dueDate) < new Date() && 
             !["completed", "verified"].includes(chore.status);
    }
    return true;
  });

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

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case "high": return "🚨";
      case "medium": return "⚡";
      case "low": return "😎";
      default: return "📝";
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

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getTimeUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) return "Overdue!";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return "Due soon!";
  };

  const getEncouragingMessage = (chore: Chore) => {
    if (chore.status === "verified") return "🏆 Amazing work! You're a champion!";
    if (chore.status === "completed") return "🎉 Fantastic! Waiting for approval!";
    if (chore.status === "in_progress") return "🔥 You're on fire! Keep going!";
    if (isOverdue(chore.dueDate)) return "⏰ Almost there! You can do this!";
    return "🌟 Ready for this challenge?";
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-lg font-medium">Loading your awesome chores... 🚀</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Fun Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">
          📋 My Super Chores!
        </h2>
        <p className="text-lg text-gray-600">
          Complete chores, earn points, become a family hero! 🦸‍♀️🦸‍♂️
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {[
          { key: "all", label: "All Chores", emoji: "📜", color: "btn-primary" },
          { key: "todo", label: "To Do", emoji: "⏳", color: "btn-warning" },
          { key: "doing", label: "Doing", emoji: "🔥", color: "btn-info" },
          { key: "done", label: "Done", emoji: "✅", color: "btn-success" },
          { key: "overdue", label: "Overdue", emoji: "⏰", color: "btn-error" },
        ].map(({ key, label, emoji, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`btn ${filter === key ? color : 'btn-outline'} btn-sm font-bold transition-all transform hover:scale-105`}
          >
            <span className="text-lg mr-1">{emoji}</span>
            {label}
            {key !== "all" && (
              <div className="badge badge-neutral ml-2">
                {chores.filter(c => {
                  if (key === "todo") return c.status === "pending";
                  if (key === "doing") return c.status === "in_progress";
                  if (key === "done") return ["completed", "verified"].includes(c.status);
                  if (key === "overdue") return isOverdue(c.dueDate) && !["completed", "verified"].includes(c.status);
                  return true;
                }).length}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Chores Grid */}
      {filteredChores.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-8xl mb-4">
            {filter === "done" ? "🎉" : filter === "todo" ? "😴" : "🤔"}
          </div>
          <h3 className="text-2xl font-bold text-gray-600 mb-2">
            {filter === "done" 
              ? "No completed chores yet!" 
              : filter === "todo" 
              ? "No chores to do right now!"
              : filter === "doing"
              ? "No chores in progress!"
              : "No chores here!"}
          </h3>
          <p className="text-gray-500">
            {filter === "done" 
              ? "Complete some chores to see them here! 🚀" 
              : filter === "todo"
              ? "Check back later for new adventures! ✨"
              : "Start a chore to see progress here! 💪"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChores.map((chore) => (
            <div
              key={chore._id}
              className={`card shadow-xl border-4 transition-all transform hover:scale-105 cursor-pointer ${
                chore.status === "verified" 
                  ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" :
                chore.status === "completed"
                  ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200" :
                chore.status === "in_progress"
                  ? "bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200" :
                isOverdue(chore.dueDate)
                  ? "bg-gradient-to-br from-red-50 to-pink-50 border-red-200" :
                  "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200"
              } hover:shadow-2xl`}
              onClick={() => openChoreDetail(chore)}
            >
              <div className="card-body p-6">
                {/* Header with status and priority */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{getCategoryEmoji(chore.category)}</span>
                    <span className="text-2xl">{getStatusEmoji(chore.status)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getPriorityEmoji(chore.priority)}</span>
                    <div className="badge badge-primary font-bold">
                      {chore.points} pts
                    </div>
                  </div>
                </div>

                {/* Title and description */}
                <h3 className="card-title text-xl font-bold text-gray-800 mb-2">
                  {chore.title}
                </h3>
                
                {chore.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {chore.description}
                  </p>
                )}

                {/* Due date and time estimate */}
                <div className="flex flex-wrap gap-2 mb-4 text-xs">
                  {chore.dueDate && (
                    <div className={`badge ${isOverdue(chore.dueDate) ? 'badge-error' : 'badge-info'}`}>
                      ⏰ {getTimeUntilDue(chore.dueDate)}
                    </div>
                  )}
                  {chore.estimatedMinutes && (
                    <div className="badge badge-secondary">
                      ⏱️ {chore.estimatedMinutes} min
                    </div>
                  )}
                  {chore.requiresPhotoVerification && (
                    <div className="badge badge-accent">
                      📸 Photo needed
                    </div>
                  )}
                </div>

                {/* Encouraging message */}
                <div className="bg-white/50 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-center">
                    {getEncouragingMessage(chore)}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="card-actions justify-center gap-2">
                  <div onClick={(e) => e.stopPropagation()} className="w-full">
                    <StatusControls
                      chore={chore}
                      onStatusUpdate={updateChoreStatus}
                      showConfirmation={false}
                    />
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openHelpRequest(chore);
                    }}
                    className="btn btn-info btn-sm mt-2"
                  >
                    🆘 Help
                  </button>
                </div>

                {/* Quick info */}
                <div className="text-xs text-gray-500 text-center mt-2">
                  Assigned by {chore.assignedBy.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chore Detail Modal */}
      <ChoreDetail
        chore={selectedChore!}
        onClose={() => {
          setSelectedChore(null);
          setShowChoreDetail(false);
        }}
        onStatusUpdate={updateChoreStatus}
        onHelpRequest={handleHelpRequest}
        isOpen={showChoreDetail && selectedChore !== null}
      />

      {/* Help Request Modal */}
      <HelpRequest
        chore={helpRequestChore!}
        userId={userId}
        onClose={() => {
          setHelpRequestChore(null);
          setShowHelpRequest(false);
        }}
        onHelpSent={() => {
          setHelpRequestChore(null);
          setShowHelpRequest(false);
        }}
        isOpen={showHelpRequest && helpRequestChore !== null}
      />
    </div>
  );
};

export default MyChores;