"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface MemberInvitationProps {
  familyId: string;
  familyName: string;
  onInvitationSent?: (invitation: Invitation) => void;
  onClose?: () => void;
  existingMembers?: FamilyMember[];
}

interface FamilyMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  role: "parent" | "child" | "admin";
  status: "active" | "pending" | "declined";
  joinedAt?: string;
}

interface Invitation {
  id: string;
  familyId: string;
  familyName: string;
  email: string;
  role: "parent" | "child";
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  status: "pending" | "accepted" | "declined" | "expired";
  token: string;
  expiresAt: string;
  sentAt: string;
  personalMessage?: string;
  reminderCount: number;
}

interface InvitationForm {
  email: string;
  role: "parent" | "child";
  personalMessage: string;
  sendWelcomeEmail: boolean;
  setReminder: boolean;
  reminderDays: number;
}

const MemberInvitation = ({
  familyId,
  familyName,
  onInvitationSent,
  onClose,
  existingMembers = [],
}: MemberInvitationProps) => {
  const { data: session } = useSession();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);

  const [invitationForm, setInvitationForm] = useState<InvitationForm>({
    email: "",
    role: "child",
    personalMessage: "",
    sendWelcomeEmail: true,
    setReminder: true,
    reminderDays: 3,
  });

  const [bulkEmails, setBulkEmails] = useState("");

  useEffect(() => {
    loadExistingInvitations();
  }, [familyId]);

  const loadExistingInvitations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/families/${familyId}/invitations`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error("Error loading invitations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isEmailAlreadyInvited = (email: string) => {
    return invitations.some(
      (inv) =>
        inv.email.toLowerCase() === email.toLowerCase() &&
        inv.status === "pending",
    );
  };

  const isEmailAlreadyMember = (email: string) => {
    return existingMembers.some(
      (member) => member.user.email.toLowerCase() === email.toLowerCase(),
    );
  };

  const generatePersonalMessage = (role: "parent" | "child") => {
    const userName = session?.user?.name || "A family member";

    if (role === "parent") {
      return `Hi! ${userName} has invited you to join "${familyName}" on ChoreMinder. As a parent, you'll be able to assign chores, track progress, and celebrate your family's achievements together. Join us in making household management fun and rewarding!`;
    } else {
      return `Hey there! ${userName} has invited you to join "${familyName}" on ChoreMinder. You'll be able to see your chores, earn points for completing them, and show off your hard work with photos. Ready to become a chore champion?`;
    }
  };

  const sendSingleInvitation = async () => {
    if (!validateEmail(invitationForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (isEmailAlreadyMember(invitationForm.email)) {
      toast.error("This person is already a family member");
      return;
    }

    if (isEmailAlreadyInvited(invitationForm.email)) {
      toast.error("An invitation has already been sent to this email");
      return;
    }

    setIsSending(true);
    try {
      const invitationData = {
        ...invitationForm,
        personalMessage:
          invitationForm.personalMessage ||
          generatePersonalMessage(invitationForm.role),
      };

      const response = await fetch(`/api/families/${familyId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invitationData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invitation");
      }

      const result = await response.json();

      toast.success(`📧 Invitation sent to ${invitationForm.email}!`, {
        duration: 5000,
        icon: "✉️",
      });

      // Reset form
      setInvitationForm({
        email: "",
        role: "child",
        personalMessage: "",
        sendWelcomeEmail: true,
        setReminder: true,
        reminderDays: 3,
      });

      // Refresh invitations
      loadExistingInvitations();

      if (onInvitationSent) {
        onInvitationSent(result.invitation);
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation",
      );
    } finally {
      setIsSending(false);
    }
  };

  const sendBulkInvitations = async () => {
    const emails = bulkEmails
      .split(/[,\n]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emails.length === 0) {
      toast.error("Please enter at least one email address");
      return;
    }

    const invalidEmails = emails.filter((email) => !validateEmail(email));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email addresses: ${invalidEmails.join(", ")}`);
      return;
    }

    setIsSending(true);
    try {
      const bulkData = {
        emails,
        role: invitationForm.role,
        personalMessage:
          invitationForm.personalMessage ||
          generatePersonalMessage(invitationForm.role),
        sendWelcomeEmail: invitationForm.sendWelcomeEmail,
        setReminder: invitationForm.setReminder,
        reminderDays: invitationForm.reminderDays,
      };

      const response = await fetch(
        `/api/families/${familyId}/invitations/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bulkData),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send bulk invitations");
      }

      const result = await response.json();

      toast.success(`📧 ${result.sentCount} invitations sent successfully!`, {
        duration: 6000,
        icon: "✉️",
      });

      if (result.skippedCount > 0) {
        toast.info(
          `⚠️ ${result.skippedCount} invitations were skipped (already members or invited)`,
          {
            duration: 4000,
          },
        );
      }

      // Reset form
      setBulkEmails("");
      setShowBulkInvite(false);

      // Refresh invitations
      loadExistingInvitations();
    } catch (error) {
      console.error("Error sending bulk invitations:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send bulk invitations",
      );
    } finally {
      setIsSending(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(
        `/api/families/${familyId}/invitations/${invitationId}/resend`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to resend invitation");
      }

      toast.success("📧 Invitation resent successfully!");
      loadExistingInvitations();
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation");
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(
        `/api/families/${familyId}/invitations/${invitationId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel invitation");
      }

      toast.success("Invitation cancelled successfully");
      loadExistingInvitations();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  const getInvitationStatusColor = (status: Invitation["status"]) => {
    const colors = {
      pending: "badge-warning",
      accepted: "badge-success",
      declined: "badge-error",
      expired: "badge-neutral",
    };
    return colors[status] || "badge-neutral";
  };

  const getInvitationStatusText = (status: Invitation["status"]) => {
    const texts = {
      pending: "Pending",
      accepted: "Accepted",
      declined: "Declined",
      expired: "Expired",
    };
    return texts[status] || status;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    if (diffHours > 0)
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffMinutes > 0)
      return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    return "Just now";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-primary">
            Invite Family Members
          </h3>
          <p className="text-gray-600">Add new members to "{familyName}"</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn btn-ghost btn-circle">
            ✕
          </button>
        )}
      </div>

      {/* Invitation Form */}
      <div className="card bg-white shadow-xl border-2 border-primary/20">
        <div className="card-body p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg">Send Invitation</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkInvite(!showBulkInvite)}
                className={`btn btn-sm ${showBulkInvite ? "btn-primary" : "btn-outline"}`}
              >
                {showBulkInvite ? "Single" : "Bulk"} Invite
              </button>
            </div>
          </div>

          {!showBulkInvite ? (
            /* Single Invitation Form */
            <div className="space-y-4">
              {/* Email and Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">
                      Email Address *
                    </span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={invitationForm.email}
                    onChange={(e) =>
                      setInvitationForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="input input-bordered w-full"
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Role *</span>
                  </label>
                  <select
                    value={invitationForm.role}
                    onChange={(e) =>
                      setInvitationForm((prev) => ({
                        ...prev,
                        role: e.target.value as "parent" | "child",
                      }))
                    }
                    className="select select-bordered w-full"
                  >
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>
              </div>

              {/* Personal Message */}
              <div>
                <label className="label">
                  <span className="label-text font-semibold">
                    Personal Message (Optional)
                  </span>
                </label>
                <textarea
                  placeholder={generatePersonalMessage(invitationForm.role)}
                  value={invitationForm.personalMessage}
                  onChange={(e) =>
                    setInvitationForm((prev) => ({
                      ...prev,
                      personalMessage: e.target.value,
                    }))
                  }
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  maxLength={500}
                />
                <div className="label">
                  <span className="label-text-alt text-blue-600">
                    💡 A personal touch increases acceptance rates!
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Send welcome email</span>
                    <input
                      type="checkbox"
                      checked={invitationForm.sendWelcomeEmail}
                      onChange={(e) =>
                        setInvitationForm((prev) => ({
                          ...prev,
                          sendWelcomeEmail: e.target.checked,
                        }))
                      }
                      className="checkbox checkbox-primary"
                    />
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Set reminder</span>
                    <input
                      type="checkbox"
                      checked={invitationForm.setReminder}
                      onChange={(e) =>
                        setInvitationForm((prev) => ({
                          ...prev,
                          setReminder: e.target.checked,
                        }))
                      }
                      className="checkbox checkbox-primary"
                    />
                  </label>
                </div>
              </div>

              {invitationForm.setReminder && (
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">
                      Reminder after (days)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={invitationForm.reminderDays}
                    onChange={(e) =>
                      setInvitationForm((prev) => ({
                        ...prev,
                        reminderDays: parseInt(e.target.value) || 3,
                      }))
                    }
                    className="input input-bordered w-full max-w-xs"
                  />
                </div>
              )}

              <button
                onClick={sendSingleInvitation}
                disabled={isSending || !invitationForm.email}
                className="btn btn-primary btn-lg w-full"
              >
                {isSending ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Sending...
                  </>
                ) : (
                  <>📧 Send Invitation</>
                )}
              </button>
            </div>
          ) : (
            /* Bulk Invitation Form */
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text font-semibold">
                    Email Addresses *
                  </span>
                </label>
                <textarea
                  placeholder="Enter email addresses separated by commas or new lines:&#10;john@example.com, jane@example.com&#10;or&#10;john@example.com&#10;jane@example.com"
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  className="textarea textarea-bordered w-full h-32"
                />
                <div className="label">
                  <span className="label-text-alt text-gray-500">
                    Separate multiple emails with commas or new lines
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">
                      Role for all invites
                    </span>
                  </label>
                  <select
                    value={invitationForm.role}
                    onChange={(e) =>
                      setInvitationForm((prev) => ({
                        ...prev,
                        role: e.target.value as "parent" | "child",
                      }))
                    }
                    className="select select-bordered w-full"
                  >
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">
                      Reminder after (days)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={invitationForm.reminderDays}
                    onChange={(e) =>
                      setInvitationForm((prev) => ({
                        ...prev,
                        reminderDays: parseInt(e.target.value) || 3,
                      }))
                    }
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-semibold">
                    Personal Message (Optional)
                  </span>
                </label>
                <textarea
                  placeholder={generatePersonalMessage(invitationForm.role)}
                  value={invitationForm.personalMessage}
                  onChange={(e) =>
                    setInvitationForm((prev) => ({
                      ...prev,
                      personalMessage: e.target.value,
                    }))
                  }
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <button
                onClick={sendBulkInvitations}
                disabled={isSending || !bulkEmails.trim()}
                className="btn btn-primary btn-lg w-full"
              >
                {isSending ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Sending...
                  </>
                ) : (
                  <>📧 Send All Invitations</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="card bg-white shadow-xl border-2 border-gray-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-lg mb-4">Invitation History</h4>

            {isLoading ? (
              <div className="text-center py-4">
                <div className="loading loading-spinner loading-md"></div>
                <p className="text-gray-600 mt-2">Loading invitations...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">
                          {invitation.email}
                        </span>
                        <div
                          className={`badge ${getInvitationStatusColor(invitation.status)}`}
                        >
                          {getInvitationStatusText(invitation.status)}
                        </div>
                        <div className="badge badge-outline">
                          {invitation.role}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Sent {formatTimeAgo(invitation.sentAt)}
                        {invitation.reminderCount > 0 && (
                          <span className="ml-2">
                            • {invitation.reminderCount} reminder
                            {invitation.reminderCount !== 1 ? "s" : ""} sent
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {invitation.status === "pending" && (
                        <>
                          <button
                            onClick={() => resendInvitation(invitation.id)}
                            className="btn btn-ghost btn-sm"
                            title="Resend invitation"
                          >
                            📧
                          </button>
                          <button
                            onClick={() => cancelInvitation(invitation.id)}
                            className="btn btn-ghost btn-sm text-red-500"
                            title="Cancel invitation"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="alert alert-info">
        <span className="text-lg">💡</span>
        <div>
          <p className="font-semibold">Tips for successful invitations:</p>
          <ul className="text-sm mt-1 space-y-1">
            <li>• Personal messages increase acceptance rates by 40%</li>
            <li>• Children respond better to fun, encouraging language</li>
            <li>• Parents appreciate clear expectations and benefits</li>
            <li>• Follow up with a phone call for important family members</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MemberInvitation;
