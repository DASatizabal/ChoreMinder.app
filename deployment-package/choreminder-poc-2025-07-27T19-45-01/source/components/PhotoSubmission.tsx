"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

interface Chore {
  _id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "verified" | "rejected";
  requiresPhotoVerification: boolean;
  points: number;
  photoVerification?: Array<{
    url: string;
    uploadedAt: string;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string;
  }>;
}

interface PhotoSubmissionProps {
  userId: string;
  familyId: string;
  onPhotoSubmitted: () => void;
  choreId?: string; // Optional - if provided, directly submit for this chore
}

const PhotoSubmission = ({
  userId,
  familyId,
  onPhotoSubmitted,
  choreId,
}: PhotoSubmissionProps) => {
  const notifications = useNotifications({ familyId });
  const [chores, setChores] = useState<Chore[]>([]);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraMode, setCameraMode] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChoresWithPhotoRequirement();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [userId, familyId]);

  const fetchChoresWithPhotoRequirement = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/chores?assignedTo=${userId}&familyId=${familyId}&requiresPhoto=true`,
      );
      if (!response.ok) throw new Error("Failed to fetch chores");

      const data = await response.json();
      const photoChores = (data.chores || []).filter(
        (chore: Chore) =>
          chore.requiresPhotoVerification &&
          (chore.status === "in_progress" || chore.status === "completed"),
      );
      setChores(photoChores);
    } catch (error) {
      console.error("Error fetching chores:", error);
      toast.error("Couldn't load photo chores!");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Try to use rear camera on mobile
      });
      setStream(mediaStream);
      setCameraMode(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Could not access camera. Please use file upload instead!");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraMode(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `chore-photo-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setSelectedFile(file);
          setPreview(URL.createObjectURL(file));
          stopCamera();
        }
      },
      "image/jpeg",
      0.8,
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        "File is too big! Please choose a smaller photo (under 10MB)",
      );
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file!");
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async () => {
    if (!selectedFile || !selectedChore) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", selectedFile);
      formData.append("choreId", selectedChore._id);

      const response = await fetch(`/api/chores/${selectedChore._id}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload photo");
      }

      toast.success("🎉 Photo uploaded successfully! Great job!", {
        duration: 5000,
        icon: "📸",
      });

      // Reset states
      setSelectedFile(null);
      setPreview(null);
      setSelectedChore(null);

      // Send notification to parent that photo was submitted
      const parentId = selectedChore.assignedBy?._id; // Assuming chore has assignedBy field
      if (parentId) {
        await notifications.notifyPhotoSubmitted(
          selectedChore._id,
          parentId,
          selectedChore.title,
          URL.createObjectURL(selectedFile),
        );
      }

      // Refresh data
      onPhotoSubmitted();
      fetchChoresWithPhotoRequirement();
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photo",
      );
    } finally {
      setUploading(false);
    }
  };

  const clearPhoto = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getChoreStatusEmoji = (chore: Chore) => {
    if (chore.photoVerification && chore.photoVerification.length > 0) {
      const latestPhoto =
        chore.photoVerification[chore.photoVerification.length - 1];
      if (latestPhoto.status === "approved") return "✅";
      if (latestPhoto.status === "rejected") return "❌";
      return "⏳";
    }
    return "📸";
  };

  const getPhotoStatus = (chore: Chore) => {
    if (!chore.photoVerification || chore.photoVerification.length === 0) {
      return "No photo yet";
    }
    const latestPhoto =
      chore.photoVerification[chore.photoVerification.length - 1];
    return latestPhoto.status === "pending"
      ? "Waiting for approval"
      : latestPhoto.status === "approved"
        ? "Photo approved!"
        : "Photo needs work";
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-lg font-medium">
            Looking for chores that need photos... 📸
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Fun Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">
          📸 Photo Mission Center!
        </h2>
        <p className="text-lg text-gray-600">
          Show off your amazing work with photos! 🌟
        </p>
      </div>

      {/* No chores message */}
      {chores.length === 0 && (
        <div className="text-center py-16">
          <div className="text-8xl mb-4">🎯</div>
          <h3 className="text-2xl font-bold text-gray-600 mb-2">
            No photo missions right now!
          </h3>
          <p className="text-gray-500 mb-4">
            Complete chores that need photos to unlock this feature!
          </p>
          <div className="text-4xl">📸✨</div>
        </div>
      )}

      {/* Chores requiring photos */}
      {chores.length > 0 && !selectedChore && (
        <div>
          <h3 className="text-xl font-bold mb-6 text-center">
            🎯 Choose a chore to photograph:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {chores.map((chore) => (
              <div
                key={chore._id}
                className="card bg-gradient-to-br from-blue-50 to-purple-50 shadow-xl border-4 border-primary/20 hover:shadow-2xl transition-all transform hover:scale-105 cursor-pointer"
                onClick={() => setSelectedChore(chore)}
              >
                <div className="card-body p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">{getChoreStatusEmoji(chore)}</div>
                    <div className="badge badge-primary font-bold">
                      {chore.points} pts
                    </div>
                  </div>

                  <h4 className="card-title text-lg mb-2">{chore.title}</h4>

                  {chore.description && (
                    <p className="text-gray-600 text-sm mb-3">
                      {chore.description}
                    </p>
                  )}

                  <div className="bg-white/50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-center">
                      📸 {getPhotoStatus(chore)}
                    </p>
                  </div>

                  {chore.photoVerification &&
                    chore.photoVerification.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Last photo:{" "}
                        {new Date(
                          chore.photoVerification[
                            chore.photoVerification.length - 1
                          ].uploadedAt,
                        ).toLocaleDateString()}
                      </div>
                    )}

                  <div className="card-actions justify-center mt-4">
                    <button className="btn btn-primary btn-wide font-bold">
                      📸 Take Photo!
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo capture interface */}
      {selectedChore && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-primary mb-2">
              📸 Photo Time for: {selectedChore.title}
            </h3>
            <p className="text-gray-600">
              Take a great photo to show your awesome work! 🌟
            </p>
          </div>

          {/* Camera/Upload Options */}
          {!preview && (
            <div className="card bg-white shadow-xl border-4 border-primary/20 mb-6">
              <div className="card-body p-6">
                <h4 className="font-bold text-lg mb-4 text-center">
                  How do you want to add your photo?
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={startCamera}
                    className="btn btn-primary btn-lg font-bold shadow-lg transform hover:scale-105"
                    disabled={cameraMode}
                  >
                    <span className="text-2xl mr-2">📷</span>
                    Take Photo
                  </button>

                  <label className="btn btn-secondary btn-lg font-bold shadow-lg transform hover:scale-105 cursor-pointer">
                    <span className="text-2xl mr-2">📁</span>
                    Choose Photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Camera view */}
          {cameraMode && (
            <div className="card bg-white shadow-xl border-4 border-primary/20 mb-6">
              <div className="card-body p-6">
                <div className="text-center mb-4">
                  <h4 className="font-bold text-lg">📷 Camera Ready!</h4>
                  <p className="text-sm text-gray-600">
                    Make sure your work looks awesome in the frame!
                  </p>
                </div>

                <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover"
                  />
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={capturePhoto}
                    className="btn btn-success btn-lg font-bold shadow-lg"
                  >
                    <span className="text-2xl mr-2">📸</span>
                    Capture!
                  </button>
                  <button onClick={stopCamera} className="btn btn-ghost btn-lg">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Photo preview */}
          {preview && (
            <div className="card bg-white shadow-xl border-4 border-success/20 mb-6">
              <div className="card-body p-6">
                <div className="text-center mb-4">
                  <h4 className="font-bold text-lg text-success">
                    🎉 Awesome Photo!
                  </h4>
                  <p className="text-sm text-gray-600">
                    Does this show your great work?
                  </p>
                </div>

                <div className="relative mb-4">
                  <img
                    src={preview}
                    alt="Photo preview"
                    className="w-full max-h-64 object-contain rounded-lg border-2 border-gray-200"
                  />
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={uploadPhoto}
                    disabled={uploading}
                    className="btn btn-success btn-lg font-bold shadow-lg"
                  >
                    {uploading ? (
                      <>
                        <span className="loading loading-spinner loading-sm mr-2"></span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <span className="text-2xl mr-2">🚀</span>
                        Submit Photo!
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearPhoto}
                    disabled={uploading}
                    className="btn btn-ghost btn-lg"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Photo tips */}
          <div className="card bg-gradient-to-r from-yellow-50 to-orange-50 shadow-xl border-4 border-yellow-200">
            <div className="card-body p-6">
              <h4 className="font-bold text-lg mb-4 text-yellow-700">
                📸 Photo Tips for Success!
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    <span>Good lighting helps!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <span>Show the completed work clearly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📐</span>
                    <span>Keep the camera steady</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧹</span>
                    <span>Show before and after if helpful</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">😊</span>
                    <span>Be proud of your work!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <span>Make it look awesome!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back button */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setSelectedChore(null);
                clearPhoto();
                stopCamera();
              }}
              className="btn btn-ghost btn-lg"
            >
              ← Back to Chores
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PhotoSubmission;
