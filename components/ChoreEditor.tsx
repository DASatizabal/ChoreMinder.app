"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import AssignmentControls from "./AssignmentControls";

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
  description?: string;
  instructions?: string;
  category?: string;
  notes?: string;
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "verified"
    | "rejected"
    | "cancelled";
  priority: "low" | "medium" | "high";
  points: number;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  assignedBy: {
    _id: string;
    name: string;
  };
  family: {
    _id: string;
    name: string;
  };
  requiresPhotoVerification: boolean;
  isRecurring: boolean;
  recurrence?: {
    type:
      | "daily"
      | "weekly"
      | "monthly"
      | "yearly"
      | "custom"
      | "once"
      | "none";
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    month?: number;
    endDate?: string;
    maxCount?: number;
  };
  estimatedMinutes?: number;
  actualMinutes?: number;
  history: Array<{
    action: string;
    timestamp: string;
    user: {
      _id: string;
      name: string;
    };
    details?: Record<string, any>;
  }>;
  photoVerification?: Array<{
    url: string;
    uploadedAt: string;
    uploadedBy: {
      _id: string;
      name: string;
    };
    status: "pending" | "approved" | "rejected";
    reviewedAt?: string;
    reviewedBy?: {
      _id: string;
      name: string;
    };
    rejectionReason?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ChoreEditorProps {
  chore: Chore | null;
  familyMembers: FamilyMember[];
  onClose: () => void;
  onChoreUpdated: () => void;
  isOpen: boolean;
}

const categories = [
  "Cleaning",
  "Kitchen",
  "Laundry",
  "Outdoor",
  "Pet Care",
  "Homework",
  "Organization",
  "General",
];

const ChoreEditor = ({
  chore,
  familyMembers,
  onClose,
  onChoreUpdated,
  isOpen,
}: ChoreEditorProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    category: "General",
    notes: "",
    priority: "medium" as "low" | "medium" | "high",
    points: 10,
    estimatedMinutes: 30,
    requiresPhotoVerification: false,
    isRecurring: false,
    recurrence: {
      type: "once" as const,
      interval: 1,
      daysOfWeek: [] as number[],
      dayOfMonth: 1,
      month: 0,
      endDate: "",
      maxCount: 0,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [showHistory, setShowHistory] = useState(false);

  // Initialize form data when chore changes
  useEffect(() => {
    if (chore) {
      setFormData({
        title: chore.title || "",
        description: chore.description || "",
        instructions: chore.instructions || "",
        category: chore.category || "General",
        notes: chore.notes || "",
        priority: chore.priority || "medium",
        points: chore.points || 10,
        estimatedMinutes: chore.estimatedMinutes || 30,
        requiresPhotoVerification: chore.requiresPhotoVerification || false,
        isRecurring: chore.isRecurring || false,
        recurrence: {
          type: (chore.recurrence?.type as "once") || "once",
          interval: chore.recurrence?.interval || 1,
          daysOfWeek: chore.recurrence?.daysOfWeek || [],
          dayOfMonth: chore.recurrence?.dayOfMonth || 1,
          month: chore.recurrence?.month || 0,
          endDate: chore.recurrence?.endDate || "",
          maxCount: chore.recurrence?.maxCount || 0,
        },
      });
    }
  }, [chore]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRecurrenceChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      recurrence: { ...prev.recurrence, [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !chore) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/chores/${chore._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          recurrence: formData.isRecurring
            ? formData.recurrence
            : { type: "none" },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update chore");
      }

      toast.success("Chore updated successfully!");
      onChoreUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating chore:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update chore",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteChore = async () => {
    if (
      !chore ||
      !confirm(
        "Are you sure you want to delete this chore? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/chores/${chore._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete chore");
      }

      toast.success("Chore deleted successfully!");
      onChoreUpdated();
      onClose();
    } catch (error) {
      console.error("Error deleting chore:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete chore",
      );
    }
  };

  const duplicateChore = async () => {
    if (!chore) return;

    try {
      const response = await fetch("/api/chores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          title: `${formData.title} (Copy)`,
          familyId: chore.family._id,
          assignedTo: chore.assignedTo?._id,
          recurrence: formData.isRecurring
            ? formData.recurrence
            : { type: "none" },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to duplicate chore");
      }

      toast.success("Chore duplicated successfully!");
      onChoreUpdated();
    } catch (error) {
      console.error("Error duplicating chore:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to duplicate chore",
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: "badge-warning",
      in_progress: "badge-info",
      completed: "badge-success",
      verified: "badge-primary",
      rejected: "badge-error",
      cancelled: "badge-ghost",
    };
    return badges[status as keyof typeof badges] || "badge-ghost";
  };

  if (!isOpen || !chore) return null;

  const children = familyMembers.filter((member) => member.role === "child");

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-xl">Edit Chore</h3>
            <div className={`badge ${getStatusBadge(chore.status)} badge-lg`}>
              {chore.status.replace("_", " ")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={duplicateChore}
              className="btn btn-ghost btn-sm"
              title="Duplicate chore"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn btn-ghost btn-sm"
              title="View history"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-sm">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-bordered mb-6">
          <button
            className={`tab tab-bordered ${activeTab === "basic" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("basic")}
          >
            Basic Info
          </button>
          <button
            className={`tab tab-bordered ${activeTab === "assignment" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("assignment")}
          >
            Assignment
          </button>
          <button
            className={`tab tab-bordered ${activeTab === "schedule" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("schedule")}
          >
            Schedule
          </button>
          <button
            className={`tab tab-bordered ${activeTab === "settings" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Tab */}
            {activeTab === "basic" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Title *</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="input input-bordered"
                      placeholder="Clean the kitchen"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Category</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="select select-bordered"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Description</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="textarea textarea-bordered h-20"
                    placeholder="Brief description of the chore..."
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Detailed Instructions
                    </span>
                  </label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    className="textarea textarea-bordered h-32"
                    placeholder="Step-by-step instructions on how to complete this chore..."
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Notes</span>
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="textarea textarea-bordered h-20"
                    placeholder="Additional notes or comments..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Priority</span>
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="select select-bordered"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Points</span>
                    </label>
                    <input
                      type="number"
                      name="points"
                      value={formData.points}
                      onChange={handleInputChange}
                      className="input input-bordered"
                      min="1"
                      max="100"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Est. Minutes
                      </span>
                    </label>
                    <input
                      type="number"
                      name="estimatedMinutes"
                      value={formData.estimatedMinutes}
                      onChange={handleInputChange}
                      className="input input-bordered"
                      min="5"
                      max="480"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Assignment Tab */}
            {activeTab === "assignment" && (
              <div className="space-y-6">
                <AssignmentControls
                  chore={chore}
                  familyMembers={children}
                  onChoreUpdated={onChoreUpdated}
                />
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === "schedule" && (
              <div className="space-y-6">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text font-medium">
                      Make this a recurring chore
                    </span>
                    <input
                      type="checkbox"
                      name="isRecurring"
                      checked={formData.isRecurring}
                      onChange={handleInputChange}
                      className="checkbox checkbox-primary"
                    />
                  </label>
                </div>

                {formData.isRecurring && (
                  <div className="card bg-base-200 p-6">
                    <h4 className="font-semibold mb-4">Recurrence Settings</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Repeat</span>
                        </label>
                        <select
                          value={formData.recurrence.type}
                          onChange={(e) =>
                            handleRecurrenceChange("type", e.target.value)
                          }
                          className="select select-bordered"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Every</span>
                        </label>
                        <input
                          type="number"
                          value={formData.recurrence.interval}
                          onChange={(e) =>
                            handleRecurrenceChange(
                              "interval",
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className="input input-bordered"
                          min="1"
                          max="30"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">
                            End Date (Optional)
                          </span>
                        </label>
                        <input
                          type="date"
                          value={formData.recurrence.endDate}
                          onChange={(e) =>
                            handleRecurrenceChange("endDate", e.target.value)
                          }
                          className="input input-bordered"
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">
                            Max Occurrences (Optional)
                          </span>
                        </label>
                        <input
                          type="number"
                          value={formData.recurrence.maxCount || ""}
                          onChange={(e) =>
                            handleRecurrenceChange(
                              "maxCount",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="input input-bordered"
                          min="1"
                          placeholder="No limit"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text font-medium">
                      Requires Photo Verification
                    </span>
                    <input
                      type="checkbox"
                      name="requiresPhotoVerification"
                      checked={formData.requiresPhotoVerification}
                      onChange={handleInputChange}
                      className="checkbox checkbox-primary"
                    />
                  </label>
                  <div className="label">
                    <span className="label-text-alt">
                      Child must submit a photo when completing this chore
                    </span>
                  </div>
                </div>

                {/* Chore Information */}
                <div className="card bg-base-200 p-6">
                  <h4 className="font-semibold mb-4">Chore Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-base-content/60">Created</span>
                      <div className="font-medium">
                        {formatDate(chore.createdAt)}
                      </div>
                    </div>
                    <div>
                      <span className="text-base-content/60">Last Updated</span>
                      <div className="font-medium">
                        {formatDate(chore.updatedAt)}
                      </div>
                    </div>
                    <div>
                      <span className="text-base-content/60">Assigned By</span>
                      <div className="font-medium">{chore.assignedBy.name}</div>
                    </div>
                    <div>
                      <span className="text-base-content/60">Family</span>
                      <div className="font-medium">{chore.family.name}</div>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="card bg-error/10 border border-error/20 p-6">
                  <h4 className="font-semibold text-error mb-4">Danger Zone</h4>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={deleteChore}
                      className="btn btn-error btn-outline"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete Chore
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="fixed inset-y-0 right-0 w-80 bg-base-100 shadow-xl border-l border-base-200 z-50 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Chore History</h4>
                <button
                  onClick={() => setShowHistory(false)}
                  className="btn btn-ghost btn-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                {chore.history.map((entry, index) => (
                  <div key={index} className="card bg-base-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm capitalize">
                        {entry.action.replace("_", " ")}
                      </span>
                      <span className="text-xs text-base-content/60">
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                    <div className="text-xs text-base-content/70">
                      By {entry.user.name}
                    </div>
                    {entry.details && (
                      <div className="text-xs text-base-content/60 mt-1">
                        {JSON.stringify(entry.details, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-action mt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={isSubmitting || !formData.title.trim()}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChoreEditor;
