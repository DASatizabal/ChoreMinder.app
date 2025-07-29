"use client";

import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import CelebrationAnimation from "./CelebrationAnimation";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category:
    | "completion"
    | "streak"
    | "quality"
    | "helpfulness"
    | "improvement"
    | "special";
  requirement: {
    type:
      | "chores_completed"
      | "streak_days"
      | "points_earned"
      | "perfect_photos"
      | "help_siblings"
      | "improvement_rating";
    target: number;
    timeframe?: "daily" | "weekly" | "monthly" | "all-time";
  };
  points: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlockedAt?: string;
}

interface UserProgress {
  choresCompleted: number;
  currentStreak: number;
  totalPoints: number;
  perfectPhotos: number;
  helpCount: number;
  avgImprovementRating: number;
  achievements: string[];
  level: number;
  nextLevelPoints: number;
}

interface AchievementSystemProps {
  familyId: string;
  userId: string;
  onAchievementUnlocked?: (achievement: Achievement) => void;
}

const AchievementSystem = ({
  familyId,
  userId,
  onAchievementUnlocked,
}: AchievementSystemProps) => {
  const { data: session } = useSession();
  const { emitEvent } = useRealTimeUpdates({ familyId });

  const [userProgress, setUserProgress] = useState<UserProgress>({
    choresCompleted: 0,
    currentStreak: 0,
    totalPoints: 0,
    perfectPhotos: 0,
    helpCount: 0,
    avgImprovementRating: 0,
    achievements: [],
    level: 1,
    nextLevelPoints: 100,
  });

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    type: "achievement" | "levelup";
    achievement?: Achievement;
    level?: number;
  } | null>(null);

  // Predefined achievements
  const allAchievements: Achievement[] = [
    // Completion Achievements
    {
      id: "first-chore",
      name: "First Steps",
      description: "Complete your very first chore",
      icon: "🎯",
      category: "completion",
      requirement: { type: "chores_completed", target: 1 },
      points: 25,
      rarity: "common",
    },
    {
      id: "chore-warrior",
      name: "Chore Warrior",
      description: "Complete 10 chores",
      icon: "⚔️",
      category: "completion",
      requirement: { type: "chores_completed", target: 10 },
      points: 100,
      rarity: "rare",
    },
    {
      id: "chore-master",
      name: "Chore Master",
      description: "Complete 50 chores",
      icon: "👑",
      category: "completion",
      requirement: { type: "chores_completed", target: 50 },
      points: 500,
      rarity: "epic",
    },
    {
      id: "chore-legend",
      name: "Chore Legend",
      description: "Complete 100 chores",
      icon: "🏆",
      category: "completion",
      requirement: { type: "chores_completed", target: 100 },
      points: 1000,
      rarity: "legendary",
    },

    // Streak Achievements
    {
      id: "on-fire",
      name: "On Fire!",
      description: "Complete chores for 3 days in a row",
      icon: "🔥",
      category: "streak",
      requirement: { type: "streak_days", target: 3 },
      points: 75,
      rarity: "common",
    },
    {
      id: "streak-master",
      name: "Streak Master",
      description: "Complete chores for 7 days in a row",
      icon: "🌟",
      category: "streak",
      requirement: { type: "streak_days", target: 7 },
      points: 200,
      rarity: "rare",
    },
    {
      id: "unstoppable",
      name: "Unstoppable",
      description: "Complete chores for 30 days in a row",
      icon: "💫",
      category: "streak",
      requirement: { type: "streak_days", target: 30 },
      points: 750,
      rarity: "legendary",
    },

    // Quality Achievements
    {
      id: "perfectionist",
      name: "Perfectionist",
      description: "Submit 5 perfect quality photos",
      icon: "📸",
      category: "quality",
      requirement: { type: "perfect_photos", target: 5 },
      points: 150,
      rarity: "rare",
    },

    // Point Achievements
    {
      id: "point-collector",
      name: "Point Collector",
      description: "Earn 500 total points",
      icon: "💎",
      category: "completion",
      requirement: { type: "points_earned", target: 500 },
      points: 100,
      rarity: "rare",
    },
    {
      id: "point-master",
      name: "Point Master",
      description: "Earn 2000 total points",
      icon: "💰",
      category: "completion",
      requirement: { type: "points_earned", target: 2000 },
      points: 300,
      rarity: "epic",
    },

    // Helpfulness Achievements
    {
      id: "helpful-sibling",
      name: "Helpful Sibling",
      description: "Help family members with 5 chores",
      icon: "🤝",
      category: "helpfulness",
      requirement: { type: "help_siblings", target: 5 },
      points: 200,
      rarity: "rare",
    },

    // Improvement Achievements
    {
      id: "getting-better",
      name: "Getting Better",
      description: "Maintain high improvement ratings",
      icon: "📈",
      category: "improvement",
      requirement: { type: "improvement_rating", target: 4 },
      points: 150,
      rarity: "rare",
    },

    // Special Achievements
    {
      id: "early-bird",
      name: "Early Bird",
      description: "Complete a chore before 8 AM",
      icon: "🌅",
      category: "special",
      requirement: { type: "chores_completed", target: 1 }, // Special logic needed
      points: 100,
      rarity: "rare",
    },
    {
      id: "weekend-warrior",
      name: "Weekend Warrior",
      description: "Complete chores on both weekend days",
      icon: "🏋️",
      category: "special",
      requirement: { type: "chores_completed", target: 2 }, // Special logic needed
      points: 125,
      rarity: "rare",
    },
  ];

  // Calculate level from points
  const calculateLevel = (points: number) => {
    return Math.floor(points / 100) + 1;
  };

  const calculateNextLevelPoints = (level: number) => {
    return level * 100;
  };

  // Check for newly unlocked achievements
  const checkAchievements = (progress: UserProgress) => {
    const newAchievements: Achievement[] = [];

    allAchievements.forEach((achievement) => {
      if (progress.achievements.includes(achievement.id)) return;

      let isUnlocked = false;

      switch (achievement.requirement.type) {
        case "chores_completed":
          isUnlocked =
            progress.choresCompleted >= achievement.requirement.target;
          break;
        case "streak_days":
          isUnlocked = progress.currentStreak >= achievement.requirement.target;
          break;
        case "points_earned":
          isUnlocked = progress.totalPoints >= achievement.requirement.target;
          break;
        case "perfect_photos":
          isUnlocked = progress.perfectPhotos >= achievement.requirement.target;
          break;
        case "help_siblings":
          isUnlocked = progress.helpCount >= achievement.requirement.target;
          break;
        case "improvement_rating":
          isUnlocked =
            progress.avgImprovementRating >= achievement.requirement.target;
          break;
      }

      if (isUnlocked) {
        newAchievements.push({
          ...achievement,
          unlockedAt: new Date().toISOString(),
        });
      }
    });

    return newAchievements;
  };

  // Update progress and check achievements
  const updateProgress = async (newProgress: Partial<UserProgress>) => {
    const updatedProgress = { ...userProgress, ...newProgress };

    // Calculate new level
    const newLevel = calculateLevel(updatedProgress.totalPoints);
    const leveledUp = newLevel > userProgress.level;

    updatedProgress.level = newLevel;
    updatedProgress.nextLevelPoints = calculateNextLevelPoints(newLevel);

    setUserProgress(updatedProgress);

    // Check for new achievements
    const newAchievements = checkAchievements(updatedProgress);

    if (newAchievements.length > 0) {
      // Add achievements to progress
      updatedProgress.achievements = [
        ...updatedProgress.achievements,
        ...newAchievements.map((a) => a.id),
      ];

      setUserProgress(updatedProgress);

      // Show celebration for first achievement
      const firstAchievement = newAchievements[0];
      setCelebrationData({
        type: "achievement",
        achievement: firstAchievement,
      });
      setShowCelebration(true);

      // Emit achievement event
      await emitEvent({
        type: "badge_earned",
        familyId,
        data: {
          badgeName: firstAchievement.name,
          badgeIcon: firstAchievement.icon,
          points: firstAchievement.points,
        },
      });

      if (onAchievementUnlocked) {
        onAchievementUnlocked(firstAchievement);
      }
    }

    // Show level up celebration
    if (leveledUp) {
      setTimeout(
        () => {
          setCelebrationData({
            type: "levelup",
            level: newLevel,
          });
          setShowCelebration(true);
        },
        newAchievements.length > 0 ? 5000 : 0,
      ); // Delay if showing achievement first
    }

    // Save progress to backend
    try {
      await fetch(`/api/users/${userId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProgress),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  // Load initial progress
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/progress`);
        if (response.ok) {
          const progress = await response.json();
          setUserProgress(progress);
        }
      } catch (error) {
        console.error("Error loading progress:", error);
      }
    };

    if (userId) {
      loadProgress();
    }
  }, [userId]);

  // Public methods for updating progress
  const choreCompleted = (points: number, isStreak: boolean = false) => {
    updateProgress({
      choresCompleted: userProgress.choresCompleted + 1,
      totalPoints: userProgress.totalPoints + points,
      currentStreak: isStreak ? userProgress.currentStreak + 1 : 0,
    });
  };

  const perfectPhotoSubmitted = () => {
    updateProgress({
      perfectPhotos: userProgress.perfectPhotos + 1,
    });
  };

  const helpedSibling = () => {
    updateProgress({
      helpCount: userProgress.helpCount + 1,
    });
  };

  const improvementRatingSubmitted = (rating: number) => {
    const newAvg = (userProgress.avgImprovementRating + rating) / 2;
    updateProgress({
      avgImprovementRating: newAvg,
    });
  };

  const getRarityColor = (rarity: Achievement["rarity"]) => {
    switch (rarity) {
      case "common":
        return "border-gray-300 bg-gray-50";
      case "rare":
        return "border-blue-300 bg-blue-50";
      case "epic":
        return "border-purple-300 bg-purple-50";
      case "legendary":
        return "border-yellow-300 bg-yellow-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  const getProgressPercentage = () => {
    const currentLevelPoints = (userProgress.level - 1) * 100;
    const pointsInCurrentLevel = userProgress.totalPoints - currentLevelPoints;
    return (pointsInCurrentLevel / 100) * 100;
  };

  return (
    <>
      {/* Progress Display */}
      <div className="card bg-white shadow-lg border-2 border-primary/20">
        <div className="card-body p-6">
          <h3 className="text-xl font-bold text-primary mb-4">
            🏆 Your Progress
          </h3>

          {/* Level Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Level {userProgress.level}</span>
              <span className="text-sm text-gray-600">
                {userProgress.totalPoints - (userProgress.level - 1) * 100}/100
                XP
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {userProgress.choresCompleted}
              </div>
              <div className="text-xs text-gray-600">Chores Done</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {userProgress.currentStreak}
              </div>
              <div className="text-xs text-gray-600">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {userProgress.totalPoints}
              </div>
              <div className="text-xs text-gray-600">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {userProgress.achievements.length}
              </div>
              <div className="text-xs text-gray-600">Badges</div>
            </div>
          </div>

          {/* Recent Achievements */}
          <div>
            <h4 className="font-semibold mb-3">Recent Badges</h4>
            <div className="flex flex-wrap gap-2">
              {allAchievements
                .filter((a) => userProgress.achievements.includes(a.id))
                .slice(-5)
                .map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 ${getRarityColor(achievement.rarity)} text-sm`}
                  >
                    <span>{achievement.icon}</span>
                    <span className="font-medium">{achievement.name}</span>
                  </div>
                ))}
              {userProgress.achievements.length === 0 && (
                <p className="text-gray-500 text-sm italic">
                  Complete your first chore to earn badges!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Celebration Animation */}
      {showCelebration && celebrationData && (
        <CelebrationAnimation
          type={celebrationData.type}
          title={
            celebrationData.type === "achievement"
              ? `${celebrationData.achievement?.name}!`
              : `Level ${celebrationData.level}!`
          }
          subtitle={
            celebrationData.type === "achievement"
              ? celebrationData.achievement?.description
              : "You're getting stronger!"
          }
          points={celebrationData.achievement?.points}
          level={celebrationData.level}
          onComplete={() => setShowCelebration(false)}
          duration={5000}
        />
      )}

      {/* Export methods for parent components */}
      <div style={{ display: "none" }}>
        {JSON.stringify({
          choreCompleted,
          perfectPhotoSubmitted,
          helpedSibling,
          improvementRatingSubmitted,
          userProgress,
        })}
      </div>
    </>
  );
};

export default AchievementSystem;
export type { Achievement, UserProgress };
