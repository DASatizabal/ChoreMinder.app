"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface ChoreAssignmentFlowProps {
  onChoreAssigned: (chore: Chore, assignedMember: FamilyMember) => void;
  onFlowCancel: () => void;
  familyMembers: FamilyMember[];
  familyId: string;
  existingChore?: Chore;
  isOpen: boolean;
}

interface Chore {
  _id?: string;
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
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  assignedBy: {
    _id: string;
    name: string;
  };
  recurrence?: {
    type: "daily" | "weekly" | "monthly";
    interval: number;
    endDate?: string;
  };
}

interface FamilyMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  role: "parent" | "child" | "admin";
  preferences?: {
    notifications: boolean;
    reminderTime: string;
    categories: string[];
  };
  stats?: {
    totalChores: number;
    completedChores: number;
    currentStreak: number;
    averageCompletionTime: number;
  };
}

interface AssignmentStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  isValid: boolean;
  isRequired: boolean;
}

const ChoreAssignmentFlow = ({
  onChoreAssigned,
  onFlowCancel,
  familyMembers,
  familyId,
  existingChore,
  isOpen,
}: ChoreAssignmentFlowProps) => {
  const { data: session } = useSession();
  const notifications = useNotifications({ familyId });
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [choreData, setChoreData] = useState<Partial<Chore>>({
    title: "",
    description: "",
    instructions: "",
    category: "General",
    priority: "medium",
    points: 10,
    estimatedMinutes: 30,
    requiresPhotoVerification: false,
    status: "pending",
    assignedBy: {
      _id: session?.user?.id || "",
      name: session?.user?.name || "",
    },
  });
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(
    null,
  );
  const [assignmentOptions, setAssignmentOptions] = useState({
    sendNotification: true,
    scheduleReminder: false,
    reminderTime: "",
    customMessage: "",
    allowDecline: true,
    deadlineMode: "flexible", // "strict" | "flexible" | "suggested"
  });

  // Initialize with existing chore data if editing
  useEffect(() => {
    if (existingChore) {
      setChoreData(existingChore);
      const assignedMember = familyMembers.find(
        (m) => m.user._id === existingChore.assignedTo?._id,
      );
      if (assignedMember) {
        setSelectedMember(assignedMember);
      }
    }
  }, [existingChore, familyMembers]);

  const children = familyMembers.filter((member) => member.role === "child");

  const validateChoreData = () => {
    return (
      choreData.title &&
      choreData.title.trim().length >= 3 &&
      choreData.points &&
      choreData.points > 0
    );
  };

  const validateMemberSelection = () => {
    return selectedMember !== null;
  };

  const validateAssignmentOptions = () => {
    if (assignmentOptions.scheduleReminder && !assignmentOptions.reminderTime) {
      return false;
    }
    return true;
  };

  const steps: AssignmentStep[] = [
    {
      id: "chore-details",
      title: "Chore Details",
      description: "Define the chore and requirements",
      component: renderChoreDetailsStep(),
      isValid: validateChoreData(),
      isRequired: true,
    },
    {
      id: "member-selection",
      title: "Assign to Child",
      description: "Choose who will complete this chore",
      component: renderMemberSelectionStep(),
      isValid: validateMemberSelection(),
      isRequired: true,
    },
    {
      id: "assignment-options",
      title: "Assignment Options",
      description: "Configure notifications and preferences",
      component: renderAssignmentOptionsStep(),
      isValid: validateAssignmentOptions(),
      isRequired: false,
    },
    {
      id: "review-confirm",
      title: "Review & Assign",
      description: "Review details and confirm assignment",
      component: renderReviewStep(),
      isValid: true,
      isRequired: true,
    },
  ];

  function renderChoreDetailsStep() {
    return (
      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="label">
            <span className="label-text font-bold">Chore Title *</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Clean your bedroom"
            value={choreData.title}
            onChange={(e) =>
              setChoreData((prev) => ({ ...prev, title: e.target.value }))
            }
            className="input input-bordered w-full"
            maxLength={100}
          />
          <div className="label">
            <span className="label-text-alt text-gray-500">
              {choreData.title?.length || 0}/100 characters
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">
            <span className="label-text font-bold">Description</span>
          </label>
          <textarea
            placeholder="Brief description of what needs to be done..."
            value={choreData.description}
            onChange={(e) =>
              setChoreData((prev) => ({ ...prev, description: e.target.value }))
            }
            className="textarea textarea-bordered w-full"
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Instructions */}
        <div>
          <label className="label">
            <span className="label-text font-bold">
              Step-by-Step Instructions
            </span>
          </label>
          <textarea
            placeholder="1. Make your bed&#10;2. Put clothes in hamper&#10;3. Organize desk..."
            value={choreData.instructions}
            onChange={(e) =>
              setChoreData((prev) => ({
                ...prev,
                instructions: e.target.value,
              }))
            }
            className="textarea textarea-bordered w-full"
            rows={5}
            maxLength={1000}
          />
          <div className="label">
            <span className="label-text-alt text-blue-600">
              💡 Clear instructions help children succeed!
            </span>
          </div>
        </div>

        {/* Category and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text font-bold">Category</span>
            </label>
            <select
              value={choreData.category}
              onChange={(e) =>
                setChoreData((prev) => ({ ...prev, category: e.target.value }))
              }
              className="select select-bordered w-full"
            >
              <option value="General">🔧 General</option>
              <option value="Cleaning">🧹 Cleaning</option>
              <option value="Kitchen">🍽️ Kitchen</option>
              <option value="Laundry">👕 Laundry</option>
              <option value="Outdoor">🌳 Outdoor</option>
              <option value="Pet Care">🐕 Pet Care</option>
              <option value="Homework">📚 Homework</option>
              <option value="Organization">📦 Organization</option>
            </select>
          </div>

          <div>
            <label className="label">
              <span className="label-text font-bold">Priority</span>
            </label>
            <select
              value={choreData.priority}
              onChange={(e) =>
                setChoreData((prev) => ({
                  ...prev,
                  priority: e.target.value as any,
                }))
              }
              className="select select-bordered w-full"
            >
              <option value="low">😎 Low Priority</option>
              <option value="medium">⚡ Medium Priority</option>
              <option value="high">🚨 High Priority</option>
            </select>
          </div>
        </div>

        {/* Points and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text font-bold">Points Reward</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={choreData.points}
              onChange={(e) =>
                setChoreData((prev) => ({
                  ...prev,
                  points: parseInt(e.target.value) || 0,
                }))
              }
              className="input input-bordered w-full"
            />
            <div className="label">
              <span className="label-text-alt text-green-600">
                💰 Higher points = more motivation!
              </span>
            </div>
          </div>

          <div>
            <label className="label">
              <span className="label-text font-bold">
                Estimated Time (minutes)
              </span>
            </label>
            <input
              type="number"
              min="5"
              max="480"
              value={choreData.estimatedMinutes}
              onChange={(e) =>
                setChoreData((prev) => ({
                  ...prev,
                  estimatedMinutes: parseInt(e.target.value) || 0,
                }))
              }
              className="input input-bordered w-full"
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="label">
            <span className="label-text font-bold">Due Date (Optional)</span>
          </label>
          <input
            type="datetime-local"
            value={
              choreData.dueDate
                ? new Date(choreData.dueDate).toISOString().slice(0, 16)
                : ""
            }
            onChange={(e) =>
              setChoreData((prev) => ({
                ...prev,
                dueDate: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              }))
            }
            className="input input-bordered w-full"
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>

        {/* Photo Verification */}
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text font-bold">
              Require Photo Verification
            </span>
            <input
              type="checkbox"
              checked={choreData.requiresPhotoVerification}
              onChange={(e) =>
                setChoreData((prev) => ({
                  ...prev,
                  requiresPhotoVerification: e.target.checked,
                }))
              }
              className="checkbox checkbox-primary"
            />
          </label>
          <div className="label">
            <span className="label-text-alt text-purple-600">
              📸 Child must submit a photo when completing the chore
            </span>
          </div>
        </div>
      </div>
    );
  }

  function renderMemberSelectionStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Who should do this chore?</h3>
          <p className="text-gray-600">
            Select a family member to assign this chore to
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((member) => (
            <div
              key={member._id}
              className={`card cursor-pointer transition-all transform hover:scale-105 ${
                selectedMember?._id === member._id
                  ? "bg-primary text-primary-content border-2 border-primary shadow-xl"
                  : "bg-white hover:bg-base-200 border-2 border-transparent shadow-lg"
              }`}
              onClick={() => setSelectedMember(member)}
            >
              <div className="card-body p-6">
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      {member.user.image ? (
                        <img
                          src={member.user.image}
                          alt={member.user.name}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <span className="text-2xl text-white font-bold">
                          {member.user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{member.user.name}</h4>
                    <p className="text-sm opacity-70">Child</p>

                    {member.stats && (
                      <div className="text-xs mt-2 space-y-1">
                        <div>✅ {member.stats.completedChores} completed</div>
                        <div>🔥 {member.stats.currentStreak} day streak</div>
                        {member.stats.averageCompletionTime > 0 && (
                          <div>
                            ⏱️ Avg:{" "}
                            {Math.round(member.stats.averageCompletionTime)} min
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedMember?._id === member._id && (
                    <div className="text-2xl">✅</div>
                  )}
                </div>

                {/* Member Preferences */}
                {member.preferences && (
                  <div className="mt-4 pt-4 border-t border-current/20">
                    <div className="text-xs space-y-1">
                      <div>
                        🔔 Notifications:{" "}
                        {member.preferences.notifications ? "On" : "Off"}
                      </div>
                      {member.preferences.categories.length > 0 && (
                        <div>
                          ⭐ Prefers:{" "}
                          {member.preferences.categories.slice(0, 2).join(", ")}
                          {member.preferences.categories.length > 2 && "..."}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {children.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">👶</div>
            <h3 className="text-xl font-bold mb-2">No Children in Family</h3>
            <p className="text-gray-600">
              Add children to your family to assign chores
            </p>
          </div>
        )}

        {/* Assignment Recommendations */}
        {selectedMember && choreData.category && (
          <div className="card bg-blue-50 border-2 border-blue-200">
            <div className="card-body p-4">
              <h4 className="font-bold text-blue-700 mb-2">
                💡 Smart Recommendations
              </h4>
              <div className="text-sm text-blue-600 space-y-1">
                {getAssignmentRecommendations(selectedMember, choreData).map(
                  (rec, index) => (
                    <div key={index}>• {rec}</div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderAssignmentOptionsStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Assignment Options</h3>
          <p className="text-gray-600">
            Configure how this chore will be assigned
          </p>
        </div>

        {/* Notification Settings */}
        <div className="card bg-white shadow-lg border-2 border-gray-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-lg mb-4">📱 Notification Settings</h4>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">
                    Send immediate notification
                  </span>
                  <input
                    type="checkbox"
                    checked={assignmentOptions.sendNotification}
                    onChange={(e) =>
                      setAssignmentOptions((prev) => ({
                        ...prev,
                        sendNotification: e.target.checked,
                      }))
                    }
                    className="checkbox checkbox-primary"
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Schedule reminder</span>
                  <input
                    type="checkbox"
                    checked={assignmentOptions.scheduleReminder}
                    onChange={(e) =>
                      setAssignmentOptions((prev) => ({
                        ...prev,
                        scheduleReminder: e.target.checked,
                      }))
                    }
                    className="checkbox checkbox-primary"
                  />
                </label>
              </div>

              {assignmentOptions.scheduleReminder && (
                <div className="ml-6">
                  <label className="label">
                    <span className="label-text">Reminder time</span>
                  </label>
                  <input
                    type="time"
                    value={assignmentOptions.reminderTime}
                    onChange={(e) =>
                      setAssignmentOptions((prev) => ({
                        ...prev,
                        reminderTime: e.target.value,
                      }))
                    }
                    className="input input-bordered"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Behavior */}
        <div className="card bg-white shadow-lg border-2 border-gray-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-lg mb-4">⚙️ Assignment Behavior</h4>

            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text font-bold">Deadline Mode</span>
                </label>
                <select
                  value={assignmentOptions.deadlineMode}
                  onChange={(e) =>
                    setAssignmentOptions((prev) => ({
                      ...prev,
                      deadlineMode: e.target.value as any,
                    }))
                  }
                  className="select select-bordered w-full"
                >
                  <option value="flexible">
                    😊 Flexible - Gentle reminders
                  </option>
                  <option value="suggested">
                    📅 Suggested - Regular reminders
                  </option>
                  <option value="strict">⏰ Strict - Firm deadlines</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">
                    Allow child to decline initially
                  </span>
                  <input
                    type="checkbox"
                    checked={assignmentOptions.allowDecline}
                    onChange={(e) =>
                      setAssignmentOptions((prev) => ({
                        ...prev,
                        allowDecline: e.target.checked,
                      }))
                    }
                    className="checkbox checkbox-primary"
                  />
                </label>
                <div className="label">
                  <span className="label-text-alt text-gray-500">
                    Child can request to negotiate or decline the chore
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Message */}
        <div className="card bg-white shadow-lg border-2 border-gray-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-lg mb-4">💬 Personal Message</h4>
            <textarea
              placeholder="Hey [child's name]! I thought you'd be great at this chore because..."
              value={assignmentOptions.customMessage}
              onChange={(e) =>
                setAssignmentOptions((prev) => ({
                  ...prev,
                  customMessage: e.target.value,
                }))
              }
              className="textarea textarea-bordered w-full"
              rows={3}
              maxLength={500}
            />
            <div className="label">
              <span className="label-text-alt text-green-600">
                ✨ Personal messages increase acceptance rates!
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderReviewStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Review Assignment</h3>
          <p className="text-gray-600">
            Check all details before assigning the chore
          </p>
        </div>

        {/* Chore Summary */}
        <div className="card bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-primary/20">
          <div className="card-body p-6">
            <h4 className="font-bold text-lg mb-4">📋 Chore Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Title:</strong> {choreData.title}
              </div>
              <div>
                <strong>Category:</strong> {choreData.category}
              </div>
              <div>
                <strong>Priority:</strong> {choreData.priority}
              </div>
              <div>
                <strong>Points:</strong> {choreData.points}
              </div>
              <div>
                <strong>Est. Time:</strong> {choreData.estimatedMinutes} min
              </div>
              <div>
                <strong>Photo Required:</strong>{" "}
                {choreData.requiresPhotoVerification ? "Yes" : "No"}
              </div>
              {choreData.dueDate && (
                <div>
                  <strong>Due:</strong>{" "}
                  {new Date(choreData.dueDate).toLocaleString()}
                </div>
              )}
            </div>

            {choreData.description && (
              <div className="mt-4">
                <strong>Description:</strong>
                <p className="mt-1 text-gray-700">{choreData.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Assignment Summary */}
        <div className="card bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-lg mb-4">👤 Assignment Details</h4>

            {selectedMember && (
              <div className="flex items-center gap-4 mb-4">
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    {selectedMember.user.image ? (
                      <img
                        src={selectedMember.user.image}
                        alt={selectedMember.user.name}
                        className="w-full h-full rounded-full"
                      />
                    ) : (
                      <span className="text-white font-bold">
                        {selectedMember.user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="font-bold">{selectedMember.user.name}</div>
                  <div className="text-sm text-gray-600">Child</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Notification:</strong>{" "}
                {assignmentOptions.sendNotification ? "Yes" : "No"}
              </div>
              <div>
                <strong>Reminder:</strong>{" "}
                {assignmentOptions.scheduleReminder
                  ? assignmentOptions.reminderTime
                  : "None"}
              </div>
              <div>
                <strong>Deadline Mode:</strong> {assignmentOptions.deadlineMode}
              </div>
              <div>
                <strong>Can Decline:</strong>{" "}
                {assignmentOptions.allowDecline ? "Yes" : "No"}
              </div>
            </div>

            {assignmentOptions.customMessage && (
              <div className="mt-4">
                <strong>Custom Message:</strong>
                <p className="mt-1 text-gray-700 italic">
                  "{assignmentOptions.customMessage}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Assignment Preview */}
        <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-lg mb-4">
              👀 How it will appear to {selectedMember?.user.name}
            </h4>

            <div className="mockup-phone border-primary">
              <div className="camera"></div>
              <div className="display">
                <div className="artboard artboard-demo phone-1 bg-base-100 p-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📋</div>
                    <h5 className="font-bold">New Chore Assigned!</h5>
                    <p className="text-sm">{choreData.title}</p>
                    <div className="badge badge-primary mt-2">
                      {choreData.points} points
                    </div>

                    {assignmentOptions.customMessage && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                        💬 "{assignmentOptions.customMessage.slice(0, 50)}..."
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <button className="btn btn-primary btn-xs">Accept</button>
                      {assignmentOptions.allowDecline && (
                        <button className="btn btn-ghost btn-xs">
                          Negotiate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getAssignmentRecommendations = (
    member: FamilyMember,
    chore: Partial<Chore>,
  ) => {
    const recommendations = [];

    if (member.preferences?.categories.includes(chore.category || "")) {
      recommendations.push(
        `${member.user.name} likes ${chore.category} chores`,
      );
    }

    if (member.stats?.averageCompletionTime && chore.estimatedMinutes) {
      if (chore.estimatedMinutes <= member.stats.averageCompletionTime * 1.2) {
        recommendations.push(
          "Time estimate matches their typical completion speed",
        );
      } else {
        recommendations.push("This might take longer than their usual chores");
      }
    }

    if (member.stats?.currentStreak && member.stats.currentStreak > 3) {
      recommendations.push(
        `They're on a ${member.stats.currentStreak}-day streak - great momentum!`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "This looks like a good match for their skill level",
      );
    }

    return recommendations;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAssignChore = async () => {
    if (!selectedMember || !validateChoreData()) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsProcessing(true);
    try {
      const choreToAssign = {
        ...choreData,
        assignedTo: {
          _id: selectedMember.user._id,
          name: selectedMember.user.name,
          email: selectedMember.user.email,
        },
        familyId,
        assignmentOptions,
      };

      const response = await fetch("/api/chores/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(choreToAssign),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign chore");
      }

      const result = await response.json();

      toast.success(`Chore assigned to ${selectedMember.user.name}! 🎉`, {
        icon: "📋",
        duration: 5000,
      });

      // Send notification to assigned child
      await notifications.notifyChoreAssigned(
        result.chore._id,
        selectedMember.user._id,
        result.chore.title,
        result.chore.points,
      );

      onChoreAssigned(result.chore, selectedMember);
    } catch (error) {
      console.error("Error assigning chore:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to assign chore",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-primary">
            {existingChore ? "Edit Chore Assignment" : "Assign New Chore"}
          </h3>
          <button
            onClick={onFlowCancel}
            className="btn btn-ghost btn-sm"
            disabled={isProcessing}
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div className="steps steps-horizontal w-full mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`step ${index <= currentStep ? "step-primary" : ""} ${
                !step.isValid && index === currentStep ? "step-error" : ""
              }`}
            >
              <span className="hidden sm:inline">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h4 className="text-xl font-bold">{currentStepData.title}</h4>
            <p className="text-gray-600">{currentStepData.description}</p>
          </div>

          {currentStepData.component}
        </div>

        {/* Navigation */}
        <div className="modal-action">
          <div className="flex justify-between w-full">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0 || isProcessing}
              className="btn btn-ghost"
            >
              Previous
            </button>

            <div className="flex gap-3">
              {currentStep === steps.length - 1 ? (
                <button
                  onClick={handleAssignChore}
                  disabled={!currentStepData.isValid || isProcessing}
                  className="btn btn-primary btn-lg"
                >
                  {isProcessing ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2"></span>
                      Assigning...
                    </>
                  ) : (
                    <>📋 Assign Chore</>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!currentStepData.isValid || isProcessing}
                  className="btn btn-primary"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChoreAssignmentFlow;
