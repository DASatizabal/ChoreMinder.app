"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface PhotoVerification {
  url: string;
  uploadedAt: string;
  uploadedBy: {
    _id: string;
    name: string;
    image?: string;
  };
  status: "pending" | "approved" | "rejected";
  reviewedAt?: string;
  reviewedBy?: {
    _id: string;
    name: string;
    image?: string;
  };
  rejectionReason?: string;
}

interface Chore {
  _id: string;
  title: string;
  status: string;
  assignedTo?: {
    _id: string;
    name: string;
    image?: string;
  };
  photoVerification?: PhotoVerification[];
  requiresPhotoVerification: boolean;
}

interface PhotoVerificationProps {
  chore: Chore;
  onChoreUpdated: () => void;
}

const PhotoVerification = ({ chore, onChoreUpdated }: PhotoVerificationProps) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "detail">("grid");

  const pendingPhotos = chore.photoVerification?.filter(photo => photo.status === "pending") || [];
  const approvedPhotos = chore.photoVerification?.filter(photo => photo.status === "approved") || [];
  const rejectedPhotos = chore.photoVerification?.filter(photo => photo.status === "rejected") || [];

  const handlePhotoAction = async (photoIndex: number, action: "approve" | "reject", reason?: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/chores/${chore._id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photoIndex,
          action,
          rejectionReason: reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} photo`);
      }

      toast.success(`Photo ${action}d successfully!`);
      onChoreUpdated();
      setSelectedPhotoIndex(null);
      setRejectionReason("");
    } catch (error) {
      console.error(`Error ${action}ing photo:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} photo`);
    } finally {
      setIsProcessing(false);
    }
  };

  const bulkApproveAll = async () => {
    if (!confirm(`Approve all ${pendingPhotos.length} pending photos?`)) return;

    setIsProcessing(true);
    try {
      const promises = chore.photoVerification?.map((photo, index) => {
        if (photo.status === "pending") {
          return fetch(`/api/chores/${chore._id}/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              photoIndex: index,
              action: "approve",
            }),
          });
        }
        return Promise.resolve();
      }) || [];

      await Promise.all(promises);
      toast.success("All photos approved!");
      onChoreUpdated();
    } catch (error) {
      console.error("Error bulk approving photos:", error);
      toast.error("Failed to approve all photos");
    } finally {
      setIsProcessing(false);
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
      approved: "badge-success",
      rejected: "badge-error",
    };
    return badges[status as keyof typeof badges] || "badge-ghost";
  };

  if (!chore.requiresPhotoVerification) {
    return (
      <div className="card bg-base-200 p-6">
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="font-medium text-lg mb-2">No Photo Verification Required</h3>
          <p className="text-base-content/60">This chore does not require photo verification.</p>
        </div>
      </div>
    );
  }

  if (!chore.photoVerification || chore.photoVerification.length === 0) {
    return (
      <div className="card bg-base-200 p-6">
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="font-medium text-lg mb-2">No Photos Submitted</h3>
          <p className="text-base-content/60">
            {chore.assignedTo?.name || "The assigned person"} hasn't submitted any photos yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">Photo Verification</h3>
          <p className="text-sm text-base-content/70">
            Review and approve photos submitted by {chore.assignedTo?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="btn-group">
            <button
              className={`btn btn-sm ${viewMode === "grid" ? "btn-active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Grid
            </button>
            <button
              className={`btn btn-sm ${viewMode === "detail" ? "btn-active" : ""}`}
              onClick={() => setViewMode("detail")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
          </div>
          {pendingPhotos.length > 0 && (
            <button
              onClick={bulkApproveAll}
              disabled={isProcessing}
              className="btn btn-success btn-sm"
            >
              {isProcessing ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                `Approve All (${pendingPhotos.length})`
              )}
            </button>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat bg-warning/10 border border-warning/20 rounded-lg">
          <div className="stat-figure text-warning">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">Pending Review</div>
          <div className="stat-value text-warning">{pendingPhotos.length}</div>
        </div>

        <div className="stat bg-success/10 border border-success/20 rounded-lg">
          <div className="stat-figure text-success">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">Approved</div>
          <div className="stat-value text-success">{approvedPhotos.length}</div>
        </div>

        <div className="stat bg-error/10 border border-error/20 rounded-lg">
          <div className="stat-figure text-error">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">Rejected</div>
          <div className="stat-value text-error">{rejectedPhotos.length}</div>
        </div>
      </div>

      {/* Photos Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chore.photoVerification.map((photo, index) => (
            <div key={index} className="card bg-base-100 shadow-lg">
              <figure className="relative">
                <img
                  src={photo.url}
                  alt={`Verification photo ${index + 1}`}
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={() => setSelectedPhotoIndex(index)}
                />
                <div className="absolute top-2 right-2">
                  <div className={`badge ${getStatusBadge(photo.status)} badge-lg`}>
                    {photo.status}
                  </div>
                </div>
              </figure>
              <div className="card-body p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="avatar">
                    <div className="w-6 h-6 rounded-full">
                      {photo.uploadedBy.image ? (
                        <img src={photo.uploadedBy.image} alt={photo.uploadedBy.name} />
                      ) : (
                        <div className="bg-primary text-primary-content flex items-center justify-center text-xs">
                          {photo.uploadedBy.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm">{photo.uploadedBy.name}</span>
                </div>
                <p className="text-xs text-base-content/60 mb-3">
                  Uploaded {formatDate(photo.uploadedAt)}
                </p>

                {photo.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePhotoAction(index, "approve")}
                      disabled={isProcessing}
                      className="btn btn-success btn-sm flex-1"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setSelectedPhotoIndex(index)}
                      disabled={isProcessing}
                      className="btn btn-error btn-outline btn-sm flex-1"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {photo.status === "rejected" && photo.rejectionReason && (
                  <div className="alert alert-error py-2">
                    <span className="text-xs">{photo.rejectionReason}</span>
                  </div>
                )}

                {photo.reviewedAt && photo.reviewedBy && (
                  <p className="text-xs text-base-content/60">
                    {photo.status === "approved" ? "Approved" : "Rejected"} by {photo.reviewedBy.name} on {formatDate(photo.reviewedAt)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {chore.photoVerification.map((photo, index) => (
            <div key={index} className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={photo.url}
                    alt={`Verification photo ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                    onClick={() => setSelectedPhotoIndex(index)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="avatar">
                          <div className="w-6 h-6 rounded-full">
                            {photo.uploadedBy.image ? (
                              <img src={photo.uploadedBy.image} alt={photo.uploadedBy.name} />
                            ) : (
                              <div className="bg-primary text-primary-content flex items-center justify-center text-xs">
                                {photo.uploadedBy.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="font-medium">{photo.uploadedBy.name}</span>
                      </div>
                      <div className={`badge ${getStatusBadge(photo.status)}`}>
                        {photo.status}
                      </div>
                    </div>
                    <p className="text-sm text-base-content/60 mb-2">
                      Uploaded {formatDate(photo.uploadedAt)}
                    </p>

                    {photo.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePhotoAction(index, "approve")}
                          disabled={isProcessing}
                          className="btn btn-success btn-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setSelectedPhotoIndex(index)}
                          disabled={isProcessing}
                          className="btn btn-error btn-outline btn-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {photo.status === "rejected" && photo.rejectionReason && (
                      <div className="alert alert-error py-2 mt-2">
                        <span className="text-sm">{photo.rejectionReason}</span>
                      </div>
                    )}

                    {photo.reviewedAt && photo.reviewedBy && (
                      <p className="text-sm text-base-content/60 mt-2">
                        {photo.status === "approved" ? "Approved" : "Rejected"} by {photo.reviewedBy.name} on {formatDate(photo.reviewedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhotoIndex !== null && chore.photoVerification && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl">
            <h3 className="font-bold text-lg mb-4">
              Photo Verification - {selectedPhotoIndex + 1} of {chore.photoVerification.length}
            </h3>
            
            <div className="mb-4">
              <img
                src={chore.photoVerification[selectedPhotoIndex].url}
                alt={`Verification photo ${selectedPhotoIndex + 1}`}
                className="w-full max-h-96 object-contain rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="font-medium mb-2">Photo Details</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-base-content/60">Uploaded by:</span> {chore.photoVerification[selectedPhotoIndex].uploadedBy.name}
                  </p>
                  <p>
                    <span className="text-base-content/60">Upload time:</span> {formatDate(chore.photoVerification[selectedPhotoIndex].uploadedAt)}
                  </p>
                  <p>
                    <span className="text-base-content/60">Status:</span>
                    <span className={`badge ${getStatusBadge(chore.photoVerification[selectedPhotoIndex].status)} badge-sm ml-2`}>
                      {chore.photoVerification[selectedPhotoIndex].status}
                    </span>
                  </p>
                </div>
              </div>

              {chore.photoVerification[selectedPhotoIndex].status === "pending" && (
                <div>
                  <h4 className="font-medium mb-2">Review Actions</h4>
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">Rejection Reason (if rejecting)</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="textarea textarea-bordered h-20"
                      placeholder="Please provide specific feedback..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePhotoAction(selectedPhotoIndex, "approve")}
                      disabled={isProcessing}
                      className="btn btn-success flex-1"
                    >
                      {isProcessing ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        "Approve"
                      )}
                    </button>
                    <button
                      onClick={() => handlePhotoAction(selectedPhotoIndex, "reject", rejectionReason)}
                      disabled={isProcessing || !rejectionReason.trim()}
                      className="btn btn-error flex-1"
                    >
                      {isProcessing ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        "Reject"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="btn btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoVerification;