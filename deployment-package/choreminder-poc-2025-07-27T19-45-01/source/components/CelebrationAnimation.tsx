"use client";

import { useState, useEffect, useRef } from "react";

interface CelebrationAnimationProps {
  title: string;
  subtitle?: string;
  points?: number;
  badges?: string[];
  level?: number;
  streakCount?: number;
  onComplete: () => void;
  duration?: number;
  type?: "completion" | "achievement" | "levelup" | "streak";
}

const CelebrationAnimation = ({
  title,
  subtitle,
  points,
  badges = [],
  level,
  streakCount,
  onComplete,
  duration = 4000,
  type = "completion",
}: CelebrationAnimationProps) => {
  const [phase, setPhase] = useState<"entrance" | "main" | "exit">("entrance");
  const [confettiPieces, setConfettiPieces] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      rotation: number;
      color: string;
      delay: number;
    }>
  >([]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate confetti pieces
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      rotation: Math.random() * 360,
      color: getRandomColor(),
      delay: Math.random() * 1000,
    }));
    setConfettiPieces(pieces);

    // Animation phases
    const timer1 = setTimeout(() => setPhase("main"), 500);
    const timer2 = setTimeout(() => setPhase("exit"), duration - 500);
    const timer3 = setTimeout(() => onComplete(), duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [duration, onComplete]);

  const getRandomColor = () => {
    const colors = [
      "#FFD700",
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getCelebrationConfig = () => {
    switch (type) {
      case "achievement":
        return {
          icon: "🏆",
          primaryColor: "text-yellow-500",
          bgGradient: "from-yellow-400 via-orange-400 to-red-400",
          borderColor: "border-yellow-300",
        };
      case "levelup":
        return {
          icon: "⭐",
          primaryColor: "text-purple-500",
          bgGradient: "from-purple-400 via-pink-400 to-red-400",
          borderColor: "border-purple-300",
        };
      case "streak":
        return {
          icon: "🔥",
          primaryColor: "text-orange-500",
          bgGradient: "from-orange-400 via-red-400 to-pink-400",
          borderColor: "border-orange-300",
        };
      default:
        return {
          icon: "🎉",
          primaryColor: "text-green-500",
          bgGradient: "from-green-400 via-blue-400 to-purple-400",
          borderColor: "border-green-300",
        };
    }
  };

  const config = getCelebrationConfig();

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-all duration-500 ${
        phase === "entrance"
          ? "opacity-0 scale-95"
          : phase === "exit"
            ? "opacity-0 scale-105"
            : "opacity-100 scale-100"
      }`}
      style={{ backdropFilter: "blur(4px)" }}
    >
      {/* Confetti */}
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-bounce"
          style={{
            left: `${piece.x}%`,
            animationDelay: `${piece.delay}ms`,
            animationDuration: "3s",
            animationIterationCount: "infinite",
          }}
        >
          <div
            className="w-3 h-3 rounded-sm animate-spin"
            style={{
              backgroundColor: piece.color,
              transform: `rotate(${piece.rotation}deg)`,
              animationDuration: "2s",
            }}
          />
        </div>
      ))}

      {/* Main Celebration Card */}
      <div
        className={`relative max-w-md w-full mx-4 transform transition-all duration-700 ${
          phase === "entrance"
            ? "translate-y-10 rotate-2"
            : phase === "exit"
              ? "-translate-y-10 -rotate-1"
              : "translate-y-0 rotate-0"
        }`}
      >
        <div
          className={`card bg-gradient-to-br ${config.bgGradient} shadow-2xl border-4 ${config.borderColor} overflow-hidden`}
        >
          <div className="card-body p-8 text-center text-white relative">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 animate-pulse">✨</div>
              <div className="absolute top-8 right-6 animate-bounce">🌟</div>
              <div className="absolute bottom-6 left-8 animate-ping">💫</div>
              <div className="absolute bottom-4 right-4 animate-pulse">⭐</div>
            </div>

            {/* Main Icon */}
            <div
              className={`text-8xl mb-4 animate-bounce ${
                phase === "main" ? "animate-pulse" : ""
              }`}
            >
              {config.icon}
            </div>

            {/* Title */}
            <h1
              className={`text-4xl font-bold mb-2 animate-fade-in ${
                phase === "main" ? "animate-pulse" : ""
              }`}
            >
              {title}
            </h1>

            {/* Subtitle */}
            {subtitle && <p className="text-xl mb-6 opacity-90">{subtitle}</p>}

            {/* Points Display */}
            {points !== undefined && (
              <div className="mb-6">
                <div className="inline-flex items-center bg-white bg-opacity-20 rounded-full px-6 py-3">
                  <span className="text-3xl font-bold mr-2">+{points}</span>
                  <span className="text-lg">Points!</span>
                </div>
              </div>
            )}

            {/* Level Up Display */}
            {level !== undefined && (
              <div className="mb-6">
                <div className="inline-flex items-center bg-white bg-opacity-20 rounded-full px-6 py-3">
                  <span className="text-2xl mr-2">🆙</span>
                  <span className="text-xl font-bold">Level {level}!</span>
                </div>
              </div>
            )}

            {/* Streak Display */}
            {streakCount !== undefined && (
              <div className="mb-6">
                <div className="inline-flex items-center bg-white bg-opacity-20 rounded-full px-6 py-3">
                  <span className="text-2xl mr-2">🔥</span>
                  <span className="text-xl font-bold">
                    {streakCount} Day Streak!
                  </span>
                </div>
              </div>
            )}

            {/* Badges */}
            {badges.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  New Badges Earned!
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {badges.map((badge, index) => (
                    <div
                      key={index}
                      className={`bg-white bg-opacity-20 rounded-full px-4 py-2 text-sm font-medium animate-fade-in`}
                      style={{ animationDelay: `${index * 200}ms` }}
                    >
                      🏅 {badge}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encouraging Messages */}
            <div className="space-y-2">
              {type === "completion" && (
                <p className="text-lg opacity-90">Outstanding work! 🌟</p>
              )}
              {type === "achievement" && (
                <p className="text-lg opacity-90">You're crushing it! 💪</p>
              )}
              {type === "levelup" && (
                <p className="text-lg opacity-90">
                  You're getting stronger! 🚀
                </p>
              )}
              {type === "streak" && (
                <p className="text-lg opacity-90">
                  Keep the momentum going! 🔥
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-close button */}
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 btn btn-circle btn-ghost text-white hover:bg-white hover:bg-opacity-20"
      >
        ✕
      </button>

      {/* Celebration Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CelebrationAnimation;
