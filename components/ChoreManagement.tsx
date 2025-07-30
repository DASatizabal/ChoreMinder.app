"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import ChoreEditor from "./ChoreEditor";
import ChoreList from "./ChoreList";
import PhotoVerification from "./PhotoVerification";
import ProgressTracker from "./ProgressTracker";

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

interface FamilyContext {
  activeFamily: {
    id: string;
    name: string;
    createdBy: string;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
  } | null;
  role: string | null;
  familyCount: number;
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
  recurrence?: any;
  estimatedMinutes?: number;
  actualMinutes?: number;
  history: any[];
  photoVerification?: any[];
  createdAt: string;
  updatedAt: string;
}

const ChoreManagement = () => {
  const { data: session } = useSession();
  const [familyContext, setFamilyContext] = useState<FamilyContext | null>(
    null,
  );
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch family context
  useEffect(() => {
    const fetchFamilyContext = async () => {
      try {
        const response = await fetch("/api/families/context");
        if (!response.ok) throw new Error("Failed to fetch family context");
        const data = await response.json();
        setFamilyContext(data);
      } catch (error) {
        console.error("Error fetching family context:", error);
      }
    };

    if (session?.user) {
      fetchFamilyContext();
    }
  }, [session]);

  // Fetch family members
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!familyContext?.activeFamily?.id) return;

      try {
        const response = await fetch(
          `/api/families/${familyContext.activeFamily.id}/members`,
        );
        if (!response.ok) throw new Error("Failed to fetch family members");
        const data = await response.json();
        setFamilyMembers(data.members || []);
      } catch (error) {
        console.error("Error fetching family members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyMembers();
  }, [familyContext]);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEditChore = (chore: Chore) => {
    setSelectedChore(chore);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setSelectedChore(null);
    setIsEditorOpen(false);
  };

  const pendingPhotoChores = () => {
    // This would come from API in real implementation
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!familyContext?.activeFamily) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Active Family</h2>
          <p className="text-base-content/70 mb-6">
            You need to join or create a family to access chore management.
          </p>
          <a href="/families" className="btn btn-primary">
            Manage Families
          </a>
        </div>
      </div>
    );
  }

  const children = familyMembers.filter((member) => member.role === "child");

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-primary-content">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Chore Management</h1>
              <p className="text-primary-content/80">
                Comprehensive chore management for{" "}
                {familyContext.activeFamily.name}
              </p>
            </div>
            <div className="breadcrumbs text-sm">
              <ul>
                <li>
                  <a href="/dashboard/parent">Dashboard</a>
                </li>
                <li>Chore Management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="tabs tabs-boxed mb-8 bg-base-200 p-1">
          <button
            className={`tab tab-lg ${activeTab === "overview" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Overview
          </button>
          <button
            className={`tab tab-lg ${activeTab === "chores" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("chores")}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            All Chores
          </button>
          <button
            className={`tab tab-lg ${activeTab === "photos" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("photos")}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
            </svg>
            Photo Review
            {pendingPhotoChores().length > 0 && (
              <div className="badge badge-error badge-sm ml-2">
                {pendingPhotoChores().length}
              </div>
            )}
          </button>
          <button
            className={`tab tab-lg ${activeTab === "analytics" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Analytics
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="stat bg-base-200 rounded-lg shadow">
                <div className="stat-figure text-primary">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="stat-title">Active Chores</div>
                <div className="stat-value text-primary">-</div>
                <div className="stat-desc">Pending completion</div>
              </div>

              <div className="stat bg-base-200 rounded-lg shadow">
                <div className="stat-figure text-warning">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                  </svg>
                </div>
                <div className="stat-title">Photo Reviews</div>
                <div className="stat-value text-warning">
                  {pendingPhotoChores().length}
                </div>
                <div className="stat-desc">Awaiting approval</div>
              </div>

              <div className="stat bg-base-200 rounded-lg shadow">
                <div className="stat-figure text-success">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="stat-title">Completed Today</div>
                <div className="stat-value text-success">-</div>
                <div className="stat-desc">Great progress!</div>
              </div>

              <div className="stat bg-base-200 rounded-lg shadow">
                <div className="stat-figure text-info">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="stat-title">Family Members</div>
                <div className="stat-value text-info">{children.length}</div>
                <div className="stat-desc">Children in family</div>
              </div>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Chores */}
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="card-title">Recent Chores</h3>
                    <button
                      onClick={() => setActiveTab("chores")}
                      className="btn btn-ghost btn-sm"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {/* This would be populated with actual recent chores */}
                    <p className="text-base-content/60 text-center py-8">
                      Recent chores will appear here
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() =>
                        (window.location.href = "/dashboard/parent")
                      }
                      className="btn btn-primary btn-outline"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Create New Chore
                    </button>
                    <button
                      onClick={() => setActiveTab("photos")}
                      className="btn btn-warning btn-outline"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                      </svg>
                      Review Photos
                      {pendingPhotoChores().length > 0 && (
                        <div className="badge badge-error">
                          {pendingPhotoChores().length}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("analytics")}
                      className="btn btn-info btn-outline"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      View Analytics
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Family Members Overview */}
            <div className="card bg-base-200 shadow-lg">
              <div className="card-body">
                <h3 className="card-title mb-4">Family Members</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {familyMembers.map((member) => (
                    <div
                      key={member._id}
                      className="card bg-base-100 shadow-sm"
                    >
                      <div className="card-body p-4">
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="w-12 h-12 rounded-full">
                              {member.user.image ? (
                                <img
                                  src={member.user.image}
                                  alt={member.user.name}
                                />
                              ) : (
                                <div className="bg-primary text-primary-content flex items-center justify-center">
                                  {member.user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">
                              {member.user.name}
                            </div>
                            <div className="text-sm text-base-content/70 capitalize">
                              {member.role}
                            </div>
                          </div>
                          <div
                            className={`badge ${member.role === "parent" ? "badge-primary" : "badge-secondary"}`}
                          >
                            {member.role}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "chores" && (
          <div>
            <ChoreList
              familyId={familyContext.activeFamily.id}
              refreshTrigger={refreshTrigger}
              onRefresh={refreshData}
              onEditChore={(chore: any) => handleEditChore(chore as Chore)}
              showEditButton={true}
            />
          </div>
        )}

        {activeTab === "photos" && (
          <div>
            {selectedChore ? (
              <PhotoVerification
                chore={selectedChore}
                onChoreUpdated={refreshData}
              />
            ) : (
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-base-content/30"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                    </svg>
                    <h3 className="text-xl font-semibold mb-2">
                      No Photos to Review
                    </h3>
                    <p className="text-base-content/60 mb-6">
                      When family members submit photos for verification,
                      they'll appear here.
                    </p>
                    <button
                      onClick={() => setActiveTab("chores")}
                      className="btn btn-primary"
                    >
                      View All Chores
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div>
            <ProgressTracker
              familyId={familyContext.activeFamily.id}
              familyMembers={familyMembers}
            />
          </div>
        )}
      </div>

      {/* Chore Editor Modal */}
      <ChoreEditor
        chore={selectedChore}
        familyMembers={children}
        onClose={handleCloseEditor}
        onChoreUpdated={refreshData}
        isOpen={isEditorOpen}
      />
    </div>
  );
};

export default ChoreManagement;
