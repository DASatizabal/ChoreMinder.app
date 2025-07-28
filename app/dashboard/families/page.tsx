"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
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

interface Family {
  _id: string;
  name: string;
  members: FamilyMember[];
  createdBy: string;
  createdAt: string;
}

interface Invitation {
  code: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export default function FamiliesPage() {
  const { data: session } = useSession();
  const [family, setFamily] = useState<Family | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("child");
  const [inviting, setInviting] = useState(false);

  // Fetch family data
  useEffect(() => {
    const fetchFamily = async () => {
      if (!session?.user) return;

      try {
        // For now, use mock family data since the context returns mock data
        const mockFamily = {
          _id: "mock_family_id",
          name: "Smith Family",
          createdBy: session.user.id || "",
          createdAt: new Date().toISOString(),
          members: [
            {
              _id: "member_1",
              user: {
                _id: session.user.id || "",
                name: session.user.name || "You",
                email: session.user.email || "",
                image: session.user.image,
              },
              role: "parent" as const,
            },
          ],
        };

        setFamily(mockFamily);
        
        // Fetch pending invitations
        // const inviteResponse = await fetch(`/api/families/${mockFamily._id}/invite`);
        // if (inviteResponse.ok) {
        //   const inviteData = await inviteResponse.json();
        //   setInvitations(inviteData.invitations || []);
        // }
      } catch (error) {
        console.error("Error fetching family:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFamily();
  }, [session]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family || !inviteEmail.trim()) return;

    setInviting(true);
    try {
      const response = await fetch(`/api/families/${family._id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invitation");
      }

      // Show success message with proper formatting
      toast.success(`📧 Invitation email sent to ${inviteEmail}!`);
      
      // Show detailed invitation info in a more user-friendly way
      const confirmationMessage = `
✅ Invitation Successfully Sent!

📧 Email: ${inviteEmail}
👤 Role: ${inviteRole}
🔑 Invite Code: ${data.inviteCode}

The invitation has been sent! They can either:
• Use the invite code: ${data.inviteCode}
• Click this link: ${data.inviteLink}

💡 Invite codes expire in 7 days.
      `.trim();
      
      alert(confirmationMessage);
      
      setInviteEmail("");
      
      // Refresh invitations
      // Add new invitation to the list
      setInvitations(prev => [...prev, {
        code: data.inviteCode,
        email: inviteEmail,
        role: inviteRole,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }]);
    } catch (error) {
      console.error("Error creating invitation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create invitation");
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Family Management</h1>

          {family ? (
            <div className="space-y-8">
              {/* Family Overview */}
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <h2 className="card-title text-2xl mb-4">
                    🏠 {family.name}
                  </h2>
                  <div className="stats stats-vertical lg:stats-horizontal shadow">
                    <div className="stat">
                      <div className="stat-title">Family Members</div>
                      <div className="stat-value">{family.members.length}</div>
                      <div className="stat-desc">Active members</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Created</div>
                      <div className="stat-value text-sm">
                        {new Date(family.createdAt).toLocaleDateString()}
                      </div>
                      <div className="stat-desc">Family started</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Members */}
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title mb-4">👥 Family Members</h3>
                  <div className="grid gap-4">
                    {family.members.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-4 p-4 bg-base-100 rounded-lg"
                      >
                        <div className="avatar">
                          <div className="w-12 h-12 rounded-full">
                            {member.user.image ? (
                              <img src={member.user.image} alt={member.user.name} />
                            ) : (
                              <div className="bg-primary text-primary-content flex items-center justify-center">
                                {member.user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">{member.user.name}</div>
                          <div className="text-sm text-base-content/70">
                            {member.user.email}
                          </div>
                        </div>
                        <div className={`badge ${member.role === "parent" ? "badge-primary" : "badge-secondary"}`}>
                          {member.role}
                        </div>
                        {member.user._id === session?.user?.id && (
                          <div className="badge badge-accent">You</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Invite New Member */}
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title mb-4">✉️ Invite Family Member</h3>
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Email Address</span>
                        </label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="Enter email address"
                          className="input input-bordered"
                          required
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Role</span>
                        </label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="select select-bordered"
                        >
                          <option value="child">Child</option>
                          <option value="parent">Parent</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="btn btn-primary"
                    >
                      {inviting ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Creating Invitation...
                        </>
                      ) : (
                        "Send Invitation"
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="card bg-base-200 shadow-lg">
                  <div className="card-body">
                    <h3 className="card-title mb-4">⏳ Pending Invitations</h3>
                    <div className="grid gap-4">
                      {invitations.map((invitation, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-base-100 rounded-lg"
                        >
                          <div>
                            <div className="font-bold">{invitation.email}</div>
                            <div className="text-sm text-base-content/70">
                              Role: {invitation.role} • Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-sm font-mono bg-neutral text-neutral-content px-3 py-1 rounded">
                            {invitation.code}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="alert alert-info">
                <svg
                  className="stroke-current shrink-0 w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <div>
                  <h3 className="font-bold">How to invite family members:</h3>
                  <div className="text-sm">
                    1. Enter their email address and select their role<br/>
                    2. Click "Send Invitation" to generate an invite code<br/>
                    3. Share the code or link with them<br/>
                    4. They can join by visiting /join-family?code=INVITE_CODE
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">No Family Found</h2>
              <p className="text-base-content/70 mb-6">
                You need to create or join a family to get started.
              </p>
              <button className="btn btn-primary">Create Family</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}