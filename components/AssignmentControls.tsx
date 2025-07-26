"use client";

import { useState } from "react";
import toast from "react-hot-toast";

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

interface Chore {
  _id: string;
  title: string;
  status: string;
  dueDate?: string;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  family: {
    _id: string;
    name: string;
  };
}

interface AssignmentControlsProps {
  chore: Chore;
  familyMembers: FamilyMember[];
  onChoreUpdated: () => void;
}

const AssignmentControls = ({ chore, familyMembers, onChoreUpdated }: AssignmentControlsProps) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedMember, setSelectedMember] = useState(chore.assignedTo?._id || "");
  const [dueDate, setDueDate] = useState(() => {
    if (chore.dueDate) {
      return new Date(chore.dueDate).toISOString().slice(0, 16);
    }
    return "";
  });
  const [isScheduling, setIsScheduling] = useState(false);

  const assignChore = async (memberId: string) => {
    if (!memberId) return;

    setIsAssigning(true);
    try {
      const response = await fetch(`/api/chores/${chore._id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignedTo: memberId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign chore");
      }

      toast.success("Chore assigned successfully!");
      onChoreUpdated();
    } catch (error) {
      console.error("Error assigning chore:", error);
      toast.error(error instanceof Error ? error.message : "Failed to assign chore");
    } finally {
      setIsAssigning(false);
    }
  };

  const updateDueDate = async () => {
    setIsScheduling(true);
    try {
      const response = await fetch(`/api/chores/${chore._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update due date");
      }

      toast.success("Due date updated successfully!");
      onChoreUpdated();
    } catch (error) {
      console.error("Error updating due date:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update due date");
    } finally {
      setIsScheduling(false);
    }
  };

  const clearDueDate = async () => {
    setDueDate("");
    setIsScheduling(true);
    try {
      const response = await fetch(`/api/chores/${chore._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dueDate: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to clear due date");
      }

      toast.success("Due date cleared!");
      onChoreUpdated();
    } catch (error) {
      console.error("Error clearing due date:", error);
      toast.error(error instanceof Error ? error.message : "Failed to clear due date");
    } finally {
      setIsScheduling(false);
    }
  };

  const unassignChore = async () => {
    if (!confirm("Are you sure you want to unassign this chore?")) return;

    setIsAssigning(true);
    try {
      const response = await fetch(`/api/chores/${chore._id}/assign`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unassign chore");
      }

      toast.success("Chore unassigned successfully!");
      setSelectedMember("");
      onChoreUpdated();
    } catch (error) {
      console.error("Error unassigning chore:", error);
      toast.error(error instanceof Error ? error.message : "Failed to unassign chore");
    } finally {
      setIsAssigning(false);
    }
  };

  const getQuickDueDates = () => {
    const now = new Date();
    const dates = [];

    // Today
    const today = new Date(now);
    today.setHours(18, 0, 0, 0); // 6 PM today
    dates.push({
      label: "Today 6 PM",
      value: today.toISOString().slice(0, 16),
    });

    // Tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    dates.push({
      label: "Tomorrow 6 PM",
      value: tomorrow.toISOString().slice(0, 16),
    });

    // This Weekend (Saturday)
    const saturday = new Date(now);
    const daysUntilSaturday = (6 - now.getDay()) % 7;
    saturday.setDate(saturday.getDate() + (daysUntilSaturday || 7));
    saturday.setHours(12, 0, 0, 0); // Noon on Saturday
    dates.push({
      label: "This Weekend",
      value: saturday.toISOString().slice(0, 16),
    });

    // Next Week (next Friday)
    const nextFriday = new Date(now);
    const daysUntilNextFriday = ((5 - now.getDay()) % 7) + 7;
    nextFriday.setDate(nextFriday.getDate() + daysUntilNextFriday);
    nextFriday.setHours(18, 0, 0, 0);
    dates.push({
      label: "Next Friday",
      value: nextFriday.toISOString().slice(0, 16),
    });

    return dates;
  };

  const isOverdue = () => {
    if (!chore.dueDate) return false;
    return new Date(chore.dueDate) < new Date() && !["completed", "verified"].includes(chore.status);
  };

  return (
    <div className="space-y-8">
      {/* Current Assignment */}
      <div className="card bg-base-200 p-6">
        <h3 className="font-semibold text-lg mb-4">Current Assignment</h3>
        
        {chore.assignedTo ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="avatar">
                <div className="w-12 h-12 rounded-full">
                  {chore.assignedTo.image ? (
                    <img src={chore.assignedTo.image} alt={chore.assignedTo.name} />
                  ) : (
                    <div className="bg-primary text-primary-content flex items-center justify-center">
                      {chore.assignedTo.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="font-medium">{chore.assignedTo.name}</div>
                <div className="text-sm text-base-content/70">{chore.assignedTo.email}</div>
              </div>
            </div>
            <button
              onClick={unassignChore}
              disabled={isAssigning}
              className="btn btn-error btn-outline btn-sm"
            >
              {isAssigning ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Unassign"
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-base-content/60">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p>This chore is not assigned to anyone</p>
          </div>
        )}
      </div>

      {/* Assign to Family Member */}
      <div className="card bg-base-200 p-6">
        <h3 className="font-semibold text-lg mb-4">Assign to Family Member</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {familyMembers.map((member) => (
            <div
              key={member._id}
              className={`card bg-base-100 shadow-sm border-2 cursor-pointer transition-all ${
                selectedMember === member.user._id
                  ? "border-primary bg-primary/5"
                  : "border-base-300 hover:border-primary/50"
              }`}
              onClick={() => setSelectedMember(member.user._id)}
            >
              <div className="card-body p-4">
                <div className="flex items-center gap-3">
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full">
                      {member.user.image ? (
                        <img src={member.user.image} alt={member.user.name} />
                      ) : (
                        <div className="bg-primary text-primary-content flex items-center justify-center text-sm">
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{member.user.name}</div>
                    <div className="text-xs text-base-content/70 capitalize">{member.role}</div>
                  </div>
                  {selectedMember === member.user._id && (
                    <div className="text-primary">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedMember && (
          <div className="mt-4">
            <button
              onClick={() => assignChore(selectedMember)}
              disabled={isAssigning || selectedMember === chore.assignedTo?._id}
              className="btn btn-primary"
            >
              {isAssigning ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Assigning...
                </>
              ) : selectedMember === chore.assignedTo?._id ? (
                "Already Assigned"
              ) : (
                "Assign Chore"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Due Date Scheduling */}
      <div className="card bg-base-200 p-6">
        <h3 className="font-semibold text-lg mb-4">Schedule Due Date</h3>
        
        {/* Current Due Date */}
        {chore.dueDate && (
          <div className={`alert mb-4 ${isOverdue() ? "alert-error" : "alert-info"}`}>
            <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <div>
              <span className="font-medium">
                {isOverdue() ? "Overdue:" : "Due:"} {new Date(chore.dueDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <button
              onClick={clearDueDate}
              disabled={isScheduling}
              className="btn btn-ghost btn-sm"
              title="Clear due date"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Quick Date Buttons */}
        <div className="mb-4">
          <h4 className="font-medium mb-3">Quick Schedule Options</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {getQuickDueDates().map((date) => (
              <button
                key={date.label}
                onClick={() => setDueDate(date.value)}
                className={`btn btn-outline btn-sm ${dueDate === date.value ? "btn-primary" : ""}`}
              >
                {date.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date/Time Picker */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">Custom Date & Time</span>
          </label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input input-bordered flex-1"
            />
            <button
              onClick={updateDueDate}
              disabled={isScheduling || !dueDate}
              className="btn btn-primary"
            >
              {isScheduling ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Set Due Date"
              )}
            </button>
          </div>
        </div>

        {/* Scheduling Tips */}
        <div className="alert alert-info">
          <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div className="text-sm">
            <div className="font-medium">Scheduling Tips:</div>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Set realistic deadlines based on chore complexity</li>
              <li>Consider your child's school and activity schedule</li>
              <li>Weekend chores can have more flexible timing</li>
              <li>Daily chores work best with consistent times</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Assignment History */}
      <div className="card bg-base-200 p-6">
        <h3 className="font-semibold text-lg mb-4">Recent Assignment Changes</h3>
        <div className="text-sm text-base-content/70">
          <p>Assignment history will appear here once tracking is implemented.</p>
          <p className="mt-2">This will show who assigned/reassigned the chore and when.</p>
        </div>
      </div>
    </div>
  );
};

export default AssignmentControls;