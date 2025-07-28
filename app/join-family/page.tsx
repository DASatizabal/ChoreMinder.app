"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface InvitationInfo {
  valid: boolean;
  family: {
    name: string;
    memberCount: number;
  };
  invitation: {
    role: string;
    invitedBy: string;
    expiresAt: string;
  };
  isAlreadyMember: boolean;
  requiresAuth: boolean;
}

export default function JoinFamilyPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  // Get code from URL params
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode);
      validateInvitation(urlCode);
    }
  }, [searchParams]);

  const validateInvitation = async (inviteCode: string) => {
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/families/join?code=${inviteCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid invitation code");
      }

      setInvitationInfo(data);
    } catch (error) {
      console.error("Error validating invitation:", error);
      setError(error instanceof Error ? error.message : "Invalid invitation code");
      setInvitationInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!code.trim() || !session?.user) return;

    setJoining(true);
    setError("");

    try {
      const response = await fetch("/api/families/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join family");
      }

      toast.success(`Successfully joined ${data.family.name}!`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error joining family:", error);
      setError(error instanceof Error ? error.message : "Failed to join family");
    } finally {
      setJoining(false);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateInvitation(code);
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="card w-full max-w-md bg-base-200 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl mb-6 justify-center">
            🏠 Join Family
          </h1>

          {/* Code Input Form */}
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Invitation Code</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter invitation code"
                className="input input-bordered"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Validating...
                </>
              ) : (
                "Validate Code"
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error mt-4">
              <svg
                className="stroke-current shrink-0 w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Invitation Details */}
          {invitationInfo && invitationInfo.valid && (
            <div className="mt-6 space-y-4">
              <div className="divider">Invitation Details</div>
              
              <div className="bg-base-100 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Family:</span>
                  <span>{invitationInfo.family.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Role:</span>
                  <span className="capitalize">{invitationInfo.invitation.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Invited by:</span>
                  <span>{invitationInfo.invitation.invitedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Members:</span>
                  <span>{invitationInfo.family.memberCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Expires:</span>
                  <span>{new Date(invitationInfo.invitation.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Join Button or Messages */}
              {invitationInfo.isAlreadyMember ? (
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
                    />
                  </svg>
                  <span>You are already a member of this family!</span>
                </div>
              ) : invitationInfo.requiresAuth ? (
                <div className="alert alert-warning">
                  <svg
                    className="stroke-current shrink-0 w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <div>
                    <div className="font-bold">Authentication Required</div>
                    <div>Please sign in to join this family</div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleJoinFamily}
                  disabled={joining}
                  className="btn btn-success w-full"
                >
                  {joining ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Joining Family...
                    </>
                  ) : (
                    <>
                      ✅ Join {invitationInfo.family.name}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 text-center">
            <div className="text-sm text-base-content/70">
              Don&apos;t have an invitation code?<br/>
              Ask a family member to invite you from the Family Management page.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}