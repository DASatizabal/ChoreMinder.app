"use client";

import {
  motion,
  useAnimation,
  useSpring,
  useTransform,
  useMotionValue,
} from "framer-motion";
import { useState, useRef, useEffect } from "react";

// Haptic feedback utility
const hapticFeedback = (
  type: "light" | "medium" | "heavy" | "selection" = "light",
) => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50],
      selection: [5],
    };
    navigator.vibrate(patterns[type]);
  }
};

// Button with micro-interactions
interface InteractiveButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  haptic?: boolean;
}

export const InteractiveButton = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  className = "",
  haptic = true,
}: InteractiveButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const controls = useAnimation();

  const baseClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    success: "btn-success",
    warning: "btn-warning",
    error: "btn-error",
  };

  const sizeClasses = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
  };

  const handleClick = () => {
    if (disabled || loading) return;

    if (haptic) {
      hapticFeedback("medium");
    }

    controls.start({
      scale: [1, 0.95, 1],
      transition: { duration: 0.2 },
    });

    onClick?.();
  };

  return (
    <motion.button
      animate={controls}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onTapStart={() => setIsPressed(true)}
      onTap={() => setIsPressed(false)}
      onTapCancel={() => setIsPressed(false)}
      className={`btn ${baseClasses[variant]} ${sizeClasses[size]} ${className} relative overflow-hidden ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {/* Ripple effect */}
      {isPressed && !disabled && (
        <motion.div
          className="absolute inset-0 bg-white/20 rounded-full"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}

      {/* Loading spinner */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="loading loading-spinner loading-sm mr-2"
        />
      )}

      {children}
    </motion.button>
  );
};

// Floating Action Button with hover effects
interface FloatingActionButtonProps {
  icon: string;
  onClick: () => void;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  color?: string;
  size?: number;
  tooltip?: string;
}

export const FloatingActionButton = ({
  icon,
  onClick,
  position = "bottom-right",
  color = "bg-primary",
  size = 56,
  tooltip,
}: FloatingActionButtonProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  return (
    <motion.div
      className={`fixed ${positionClasses[position]} z-50`}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
    >
      {/* Tooltip */}
      {tooltip && showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full mb-2 right-0 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap"
        >
          {tooltip}
        </motion.div>
      )}

      <motion.button
        whileHover={{
          scale: 1.1,
          rotate: 5,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        }}
        whileTap={{ scale: 0.9 }}
        onHoverStart={() => setShowTooltip(true)}
        onHoverEnd={() => setShowTooltip(false)}
        onClick={() => {
          hapticFeedback("medium");
          onClick();
        }}
        className={`${color} text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-bold`}
        style={{ width: size, height: size }}
      >
        <motion.span whileHover={{ rotate: 15 }} transition={{ duration: 0.2 }}>
          {icon}
        </motion.span>
      </motion.button>
    </motion.div>
  );
};

// Swipe Card with gesture controls
interface SwipeCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  swipeThreshold?: number;
  className?: string;
}

export const SwipeCard = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 100,
  className = "",
}: SwipeCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-200, 200], [5, -5]);
  const rotateY = useTransform(x, [-200, 200], [-5, 5]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);

  const handleDragEnd = (event: any, info: any) => {
    const { offset, velocity } = info;

    if (Math.abs(offset.x) > swipeThreshold || Math.abs(velocity.x) > 500) {
      if (offset.x > 0) {
        onSwipeRight?.();
        hapticFeedback("medium");
      } else {
        onSwipeLeft?.();
        hapticFeedback("medium");
      }
    } else if (
      Math.abs(offset.y) > swipeThreshold ||
      Math.abs(velocity.y) > 500
    ) {
      if (offset.y > 0) {
        onSwipeDown?.();
        hapticFeedback("light");
      } else {
        onSwipeUp?.();
        hapticFeedback("light");
      }
    }

    // Reset position
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: -300, right: 300, top: -300, bottom: 300 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      style={{ x, y, rotateX, rotateY, opacity }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`cursor-grab active:cursor-grabbing ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Progress Ring with animation
interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  label?: string;
}

export const ProgressRing = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = "#3b82f6",
  backgroundColor = "#e5e7eb",
  showLabel = true,
  label,
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      </svg>

      {/* Center label */}
      {showLabel && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(progress)}%
            </div>
            {label && <div className="text-xs text-gray-600 mt-1">{label}</div>}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Magnetic Button Effect
interface MagneticButtonProps {
  children: React.ReactNode;
  strength?: number;
  onClick?: () => void;
  className?: string;
}

export const MagneticButton = ({
  children,
  strength = 0.3,
  onClick,
  className = "",
}: MagneticButtonProps) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useSpring(0, { stiffness: 300, damping: 30 });
  const y = useSpring(0, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    x.set(deltaX);
    y.set(deltaY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`transition-shadow hover:shadow-lg ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
};

// Pulse Animation Component
interface PulseProps {
  children: React.ReactNode;
  color?: string;
  size?: number;
  speed?: number;
}

export const Pulse = ({
  children,
  color = "rgba(59, 130, 246, 0.3)",
  size = 1.2,
  speed = 2,
}: PulseProps) => {
  return (
    <div className="relative inline-block">
      {children}

      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ backgroundColor: color }}
        animate={{
          scale: [1, size, 1],
          opacity: [0.7, 0, 0.7],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

export default {
  InteractiveButton,
  FloatingActionButton,
  SwipeCard,
  ProgressRing,
  MagneticButton,
  Pulse,
  hapticFeedback,
};
