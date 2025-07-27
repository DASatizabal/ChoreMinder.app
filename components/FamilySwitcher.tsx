"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Family {
  _id: string;
  name: string;
  createdBy: string;
  memberCount: number;
  role: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
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

interface FamilySwitcherProps {
  familyContext: FamilyContext;
  onFamilyChange: () => void;
}

const FamilySwitcher = ({
  familyContext,
  onFamilyChange,
}: FamilySwitcherProps) => {
  const { data: session } = useSession();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/families");
      if (!response.ok) throw new Error("Failed to fetch families");

      const data = await response.json();
      setFamilies(data.families || []);
    } catch (error) {
      console.error("Error fetching families:", error);
      toast.error("Failed to load families");
    } finally {
      setLoading(false);
    }
  };

  const switchFamily = async (familyId: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/families/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ familyId }),
      });

      if (!response.ok) throw new Error("Failed to switch family");

      toast.success("Switched family successfully! 🏠", {
        icon: "✅",
        duration: 3000,
      });

      onFamilyChange();
    } catch (error) {
      console.error("Error switching family:", error);
      toast.error("Failed to switch family");
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async () => {
    if (!newFamilyName.trim()) {
      toast.error("Please enter a family name! 😊");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/families", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newFamilyName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create family");
      }

      const data = await response.json();

      toast.success(`Family "${newFamilyName}" created successfully! 🎉`, {
        icon: "🏠",
        duration: 4000,
      });

      setNewFamilyName("");
      setShowCreateForm(false);
      fetchFamilies();
      onFamilyChange();
    } catch (error) {
      console.error("Error creating family:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create family",
      );
    } finally {
      setLoading(false);
    }
  };

  const joinFamily = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a family code! 😊");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/families/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to join family");
      }

      const data = await response.json();

      toast.success(`Joined family "${data.family.name}" successfully! 🎉`, {
        icon: "👨‍👩‍👧‍👦",
        duration: 4000,
      });

      setJoinCode("");
      setShowJoinForm(false);
      fetchFamilies();
      onFamilyChange();
    } catch (error) {
      console.error("Error joining family:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join family",
      );
    } finally {
      setLoading(false);
    }
  };

  const getRoleEmoji = (role: string) => {
    switch (role) {
      case "parent":
        return "👨‍👩‍👧‍👦";
      case "child":
        return "🧒";
      case "admin":
        return "⚙️";
      default:
        return "👤";
    }
  };

  const getFamilyDisplayName = (family: Family) => {
    const isCreator = family.createdBy === session?.user?.id;
    return isCreator ? `${family.name} (Owner)` : family.name;
  };

  if (loading && families.length === 0) {
    return (
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-ghost btn-sm loading">
          Loading...
        </label>
      </div>
    );
  }

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-sm gap-2">
        <span className="text-lg">🏠</span>
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-xs opacity-70">Family</span>
          <span className="text-sm font-bold">
            {familyContext.activeFamily?.name || "Select Family"}
          </span>
        </div>
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
            d="M19 9l-7 7-7-7"
          />
        </svg>
        {familyContext.familyCount > 1 && (
          <div className="badge badge-primary badge-xs">
            {familyContext.familyCount}
          </div>
        )}
      </label>

      <div
        tabIndex={0}
        className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-80 max-h-96 overflow-y-auto"
      >
        {/* Current Family Info */}
        {familyContext.activeFamily && (
          <>
            <div className="px-4 py-2 bg-primary/10 rounded-lg mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🏠</span>
                <span className="font-bold text-primary">Current Family</span>
              </div>
              <div className="text-sm">
                <div className="font-medium">
                  {familyContext.activeFamily.name}
                </div>
                <div className="text-xs opacity-70 flex items-center gap-1">
                  {getRoleEmoji(familyContext.role || "user")}
                  Role: {familyContext.role || "member"}
                </div>
                <div className="text-xs opacity-70">
                  👥 {familyContext.activeFamily.memberCount} member
                  {familyContext.activeFamily.memberCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            <div className="divider my-2">Switch to</div>
          </>
        )}

        {/* Available Families */}
        {families.length > 0 && (
          <div className="max-h-40 overflow-y-auto">
            {families
              .filter((family) => family._id !== familyContext.activeFamily?.id)
              .map((family) => (
                <li key={family._id}>
                  <button
                    onClick={() => switchFamily(family._id)}
                    disabled={loading}
                    className="justify-start w-full text-left"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-lg">🏠</span>
                      <div className="flex-1">
                        <div className="font-medium">
                          {getFamilyDisplayName(family)}
                        </div>
                        <div className="text-xs opacity-70 flex items-center gap-2">
                          <span>
                            {getRoleEmoji(family.role)} {family.role}
                          </span>
                          <span>👥 {family.memberCount}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
          </div>
        )}

        {/* Family Management Actions */}
        <div className="divider my-2">Manage Families</div>

        {/* Create New Family */}
        {!showCreateForm ? (
          <li>
            <button
              onClick={() => setShowCreateForm(true)}
              className="justify-start text-primary"
            >
              <span className="text-lg">➕</span>
              Create New Family
            </button>
          </li>
        ) : (
          <div className="p-2 bg-base-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">➕</span>
              <span className="font-bold">Create Family</span>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Family name (e.g., Smith Family)"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                className="input input-bordered input-sm w-full"
                maxLength={50}
              />
              <div className="flex gap-2">
                <button
                  onClick={createFamily}
                  disabled={loading || !newFamilyName.trim()}
                  className="btn btn-primary btn-sm flex-1"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewFamilyName("");
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Family */}
        {!showJoinForm ? (
          <li>
            <button
              onClick={() => setShowJoinForm(true)}
              className="justify-start text-secondary"
            >
              <span className="text-lg">🔗</span>
              Join Family
            </button>
          </li>
        ) : (
          <div className="p-2 bg-base-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔗</span>
              <span className="font-bold">Join Family</span>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter family invite code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="input input-bordered input-sm w-full"
                maxLength={10}
              />
              <div className="text-xs opacity-70">
                Ask a family member for the invite code
              </div>
              <div className="flex gap-2">
                <button
                  onClick={joinFamily}
                  disabled={loading || !joinCode.trim()}
                  className="btn btn-secondary btn-sm flex-1"
                >
                  {loading ? "Joining..." : "Join"}
                </button>
                <button
                  onClick={() => {
                    setShowJoinForm(false);
                    setJoinCode("");
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Families Message */}
        {families.length === 0 && !familyContext.activeFamily && (
          <div className="p-4 text-center">
            <div className="text-4xl mb-2">🏠</div>
            <div className="text-sm opacity-70 mb-3">
              No families yet! Create your first family or join an existing one.
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="px-2 py-1">
          <div className="text-xs opacity-50 text-center">
            💡 Tip: Switch between families to manage different households
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilySwitcher;
