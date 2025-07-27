"use client";

import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";

interface SwipeablePhotoCaptureProps {
  onPhotoTaken: (photo: File) => void;
  onCancel: () => void;
  choreTitle: string;
  maxPhotos?: number;
}

const SwipeablePhotoCapture = ({
  onPhotoTaken,
  onCancel,
  choreTitle,
  maxPhotos = 3,
}: SwipeablePhotoCaptureProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">(
    "environment",
  );
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraFacing]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Camera access denied. Please allow camera permissions.");
    }
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    setIsCapturing(true);

    try {
      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Apply flash effect
      if (flashEnabled) {
        document.body.style.backgroundColor = "white";
        setTimeout(() => {
          document.body.style.backgroundColor = "";
        }, 200);
      }

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `chore-photo-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });

            setPhotos((prev) => [...prev, file]);
            onPhotoTaken(file);

            toast.success("📸 Photo captured!", {
              duration: 2000,
              position: "bottom-center",
            });
          }
          setIsProcessing(false);
          setIsCapturing(false);
        },
        "image/jpeg",
        0.8,
      );
    } catch (error) {
      console.error("Error capturing photo:", error);
      toast.error("Failed to capture photo");
      setIsProcessing(false);
      setIsCapturing(false);
    }
  }, [onPhotoTaken, flashEnabled, isProcessing]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onPhotoTaken(file);
      toast.success("📁 Photo uploaded!", {
        duration: 2000,
        position: "bottom-center",
      });
    }
  };

  const handleSwipe = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const offset = info.offset.x;

    if (Math.abs(offset) > 100) {
      if (offset > 0) {
        // Swipe right - Switch camera
        setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
        toast("🔄 Camera switched!", {
          duration: 1500,
          position: "top-center",
        });
      } else {
        // Swipe left - Toggle flash
        setFlashEnabled((prev) => !prev);
        toast(`💡 Flash ${!flashEnabled ? "enabled" : "disabled"}`, {
          duration: 1500,
          position: "top-center",
        });
      }
    }

    x.set(0);
  };

  const switchCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const toggleFlash = () => {
    setFlashEnabled((prev) => !prev);
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white z-10">
        <button
          onClick={onCancel}
          className="btn btn-ghost btn-circle text-white"
        >
          ✕
        </button>

        <div className="text-center flex-1">
          <h3 className="font-bold">Take Photo</h3>
          <p className="text-sm opacity-75">{choreTitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">
            {photos.length}/{maxPhotos}
          </span>
        </div>
      </div>

      {/* Camera View */}
      <motion.div
        className="flex-1 relative overflow-hidden"
        drag="x"
        dragConstraints={{ left: -300, right: 300 }}
        dragElastic={0.3}
        onDragEnd={handleSwipe}
        style={{ x, opacity, scale }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Camera overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Grid lines */}
          <div className="absolute inset-4 border border-white/30">
            <div className="absolute top-1/3 left-0 right-0 border-t border-white/20" />
            <div className="absolute top-2/3 left-0 right-0 border-t border-white/20" />
            <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/20" />
            <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/20" />
          </div>

          {/* Center focus ring */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 border-2 border-white rounded-full"
            />
          </div>

          {/* Flash indicator */}
          {flashEnabled && (
            <div className="absolute top-4 right-4 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold">
              💡 FLASH
            </div>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="text-black text-xl font-bold">Processing...</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Controls */}
      <div className="bg-black/50 p-6 text-white">
        {/* Swipe hints */}
        <div className="text-center text-xs opacity-75 mb-4">
          ← Swipe for flash • Swipe for camera →
        </div>

        {/* Primary controls */}
        <div className="flex items-center justify-center gap-8">
          {/* Gallery/Upload */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl"
          >
            📁
          </motion.button>

          {/* Capture button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={capturePhoto}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative ${
              isCapturing ? "bg-red-500" : "bg-white/20"
            }`}
          >
            <motion.div
              animate={{
                scale: isCapturing ? [1, 0.8, 1] : 1,
                rotate: isCapturing ? 360 : 0,
              }}
              transition={{ duration: 0.3 }}
              className={`w-16 h-16 rounded-full ${
                isCapturing ? "bg-white" : "bg-white"
              }`}
            />
          </motion.button>

          {/* Camera switch */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={switchCamera}
            className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl"
          >
            🔄
          </motion.button>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleFlash}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              flashEnabled
                ? "bg-yellow-400 text-black"
                : "bg-white/20 text-white"
            }`}
          >
            💡 Flash
          </motion.button>

          {photos.length >= maxPhotos && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              className="px-4 py-2 bg-green-500 rounded-lg text-sm font-medium"
            >
              ✅ Done ({photos.length})
            </motion.button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Hidden canvas for photo processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SwipeablePhotoCapture;
