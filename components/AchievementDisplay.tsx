"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: "milestone" | "streak" | "points" | "special" | "category";
  earned: boolean;
  earnedDate?: string;
  progress?: number;
  target?: number;
  points: number;
}

interface UserStats {
  totalPoints: number;
  completedChores: number;
  streakDays: number;
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  recentEarnings: {
    points: number;
    achievements: string[];
    completedToday: number;
  };
}

interface AchievementDisplayProps {
  onClose?: () => void;
  showNewOnly?: boolean;
  triggerRefresh?: number;
}

const AchievementDisplay = ({ onClose, showNewOnly = false, triggerRefresh = 0 }: AchievementDisplayProps) => {
  const { data: session } = useSession();
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0,
    completedChores: 0,
    streakDays: 0,
    level: 1,
    currentLevelPoints: 0,
    nextLevelPoints: 100,
    recentEarnings: {
      points: 0,
      achievements: [],
      completedToday: 0
    }
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAnimation, setShowAnimation] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: "all", name: "All Achievements", emoji: "🏆" },
    { id: "milestone", name: "Milestones", emoji: "🎯" },
    { id: "streak", name: "Streaks", emoji: "🔥" },
    { id: "points", name: "Points", emoji: "💰" },
    { id: "special", name: "Special", emoji: "⭐" },
    { id: "category", name: "Categories", emoji: "🌈" }
  ];

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData();
    }
  }, [session, triggerRefresh]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chores?assignedTo=${session?.user?.id}&stats=true`);
      if (!response.ok) throw new Error("Failed to fetch user data");
      
      const data = await response.json();
      const stats = calculateUserStats(data.chores || []);
      setUserStats(stats);
      
      const allAchievements = generateAchievements(stats);
      setAchievements(allAchievements);
      
      // Check for new achievements (recently earned)
      const recentlyEarned = allAchievements.filter(a => 
        a.earned && a.earnedDate && 
        new Date(a.earnedDate) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      );
      setNewAchievements(recentlyEarned);
      
      if (recentlyEarned.length > 0) {
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 3000);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserStats = (chores: any[]): UserStats => {
    const completedChores = chores.filter(c => ["completed", "verified"].includes(c.status));
    const totalPoints = completedChores.reduce((sum, c) => sum + (c.points || 0), 0);
    
    const level = Math.floor(totalPoints / 100) + 1;
    const currentLevelPoints = totalPoints % 100;
    const nextLevelPoints = 100;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = completedChores.filter(c => {
      const completedDate = new Date(c.completedAt || c.verifiedAt);
      return completedDate >= today;
    }).length;

    const streakDays = calculateStreak(completedChores);
    
    // Calculate recent earnings (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentChores = completedChores.filter(c => {
      const completedDate = new Date(c.completedAt || c.verifiedAt);
      return completedDate >= weekAgo;
    });
    const recentPoints = recentChores.reduce((sum, c) => sum + (c.points || 0), 0);

    return {
      totalPoints,
      completedChores: completedChores.length,
      streakDays,
      level,
      currentLevelPoints,
      nextLevelPoints,
      recentEarnings: {
        points: recentPoints,
        achievements: [], // Would be populated from achievement system
        completedToday
      }
    };
  };

  const calculateStreak = (completedChores: any[]) => {
    if (completedChores.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const hasChoreThisDay = completedChores.some(chore => {
        const completedDate = new Date(chore.completedAt || chore.verifiedAt);
        return completedDate >= dayStart && completedDate <= dayEnd;
      });

      if (hasChoreThisDay) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const generateAchievements = (stats: UserStats): Achievement[] => {
    return [
      // Milestone Achievements
      {
        id: 'first_chore',
        title: 'First Steps',
        description: 'Complete your very first chore!',
        emoji: '👶',
        category: 'milestone',
        earned: stats.completedChores >= 1,
        earnedDate: stats.completedChores >= 1 ? new Date().toISOString() : undefined,
        points: 10,
      },
      {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Complete 5 chores',
        emoji: '🐦',
        category: 'milestone',
        earned: stats.completedChores >= 5,
        progress: Math.min(stats.completedChores, 5),
        target: 5,
        points: 25,
      },
      {
        id: 'getting_started',
        title: 'Getting Started',
        description: 'Complete 10 chores',
        emoji: '⭐',
        category: 'milestone',
        earned: stats.completedChores >= 10,
        progress: Math.min(stats.completedChores, 10),
        target: 10,
        points: 50,
      },
      {
        id: 'chore_master',
        title: 'Chore Master',
        description: 'Complete 50 chores',
        emoji: '🏆',
        category: 'milestone',
        earned: stats.completedChores >= 50,
        progress: Math.min(stats.completedChores, 50),
        target: 50,
        points: 200,
      },
      
      // Streak Achievements
      {
        id: 'streak_3',
        title: 'Three in a Row',
        description: 'Complete chores for 3 days straight',
        emoji: '🔥',
        category: 'streak',
        earned: stats.streakDays >= 3,
        progress: Math.min(stats.streakDays, 3),
        target: 3,
        points: 30,
      },
      {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        emoji: '⚡',
        category: 'streak',
        earned: stats.streakDays >= 7,
        progress: Math.min(stats.streakDays, 7),
        target: 7,
        points: 100,
      },
      {
        id: 'consistency_champion',
        title: 'Consistency Champion',
        description: 'Maintain a 14-day streak',
        emoji: '💎',
        category: 'streak',
        earned: stats.streakDays >= 14,
        progress: Math.min(stats.streakDays, 14),
        target: 14,
        points: 250,
      },
      
      // Points Achievements
      {
        id: 'point_collector',
        title: 'Point Collector',
        description: 'Earn 100 points',
        emoji: '💰',
        category: 'points',
        earned: stats.totalPoints >= 100,
        progress: Math.min(stats.totalPoints, 100),
        target: 100,
        points: 20,
      },
      {
        id: 'point_master',
        title: 'Point Master',
        description: 'Earn 500 points',
        emoji: '💎',
        category: 'points',
        earned: stats.totalPoints >= 500,
        progress: Math.min(stats.totalPoints, 500),
        target: 500,
        points: 100,
      },
      
      // Special Achievements
      {
        id: 'daily_hero',
        title: 'Daily Hero',
        description: 'Complete 3 chores in one day',
        emoji: '🦸',
        category: 'special',
        earned: stats.recentEarnings.completedToday >= 3,
        progress: Math.min(stats.recentEarnings.completedToday, 3),
        target: 3,
        points: 75,
      },
      {
        id: 'weekend_warrior',
        title: 'Weekend Warrior',
        description: 'Complete chores on weekend',
        emoji: '🎮',
        category: 'special',
        earned: false, // Would need weekend-specific logic
        points: 50,
      }
    ];
  };

  const filteredAchievements = achievements.filter(achievement => {
    if (showNewOnly) return newAchievements.includes(achievement);
    if (selectedCategory === "all") return true;
    return achievement.category === selectedCategory;
  });

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalAchievementPoints = achievements.filter(a => a.earned).reduce((sum, a) => sum + a.points, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  return (
    <div className={`${showAnimation ? 'animate-pulse' : ''}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-primary mb-2">
          Your Amazing Achievements!
        </h2>
        <p className="text-lg text-gray-600">
          Look at all the awesome things you've accomplished! 🌟
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="stat bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl shadow-lg border-2 border-yellow-200">
          <div className="stat-figure text-4xl">🏆</div>
          <div className="stat-title text-orange-700">Achievements</div>
          <div className="stat-value text-orange-800">{earnedCount}</div>
          <div className="stat-desc text-orange-600">out of {achievements.length}</div>
        </div>

        <div className="stat bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl shadow-lg border-2 border-green-200">
          <div className="stat-figure text-4xl">💰</div>
          <div className="stat-title text-green-700">Bonus Points</div>
          <div className="stat-value text-green-800">{totalAchievementPoints}</div>
          <div className="stat-desc text-green-600">from achievements</div>
        </div>

        <div className="stat bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl shadow-lg border-2 border-blue-200">
          <div className="stat-figure text-4xl">⭐</div>
          <div className="stat-title text-blue-700">Level</div>
          <div className="stat-value text-blue-800">{userStats.level}</div>
          <div className="stat-desc text-blue-600">Keep climbing!</div>
        </div>

        <div className="stat bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl shadow-lg border-2 border-purple-200">
          <div className="stat-figure text-4xl">🔥</div>
          <div className="stat-title text-purple-700">Streak</div>
          <div className="stat-value text-purple-800">{userStats.streakDays}</div>
          <div className="stat-desc text-purple-600">days in a row!</div>
        </div>
      </div>

      {/* New achievements alert */}
      {newAchievements.length > 0 && !showNewOnly && (
        <div className="alert alert-success mb-6 animate-bounce">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h4 className="font-bold">New Achievement{newAchievements.length > 1 ? 's' : ''} Unlocked!</h4>
              <p>You earned {newAchievements.length} new achievement{newAchievements.length > 1 ? 's' : ''} recently! You're amazing!</p>
            </div>
          </div>
        </div>
      )}

      {/* Category filters */}
      {!showNewOnly && (
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`btn btn-sm ${
                selectedCategory === category.id ? 'btn-primary' : 'btn-outline'
              } font-bold transition-all transform hover:scale-105`}
            >
              <span className="text-lg mr-1">{category.emoji}</span>
              {category.name}
              {category.id !== "all" && (
                <div className="badge badge-neutral ml-2">
                  {achievements.filter(a => a.category === category.id && a.earned).length}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Achievements grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`card shadow-xl border-4 transition-all transform hover:scale-105 ${
              achievement.earned
                ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 hover:shadow-2xl"
                : "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300"
            }`}
          >
            <div className="card-body p-6 text-center">
              <div className={`text-6xl mb-4 ${achievement.earned ? '' : 'opacity-50 grayscale'}`}>
                {achievement.emoji}
              </div>
              
              <h3 className={`font-bold text-xl mb-2 ${
                achievement.earned ? 'text-yellow-700' : 'text-gray-600'
              }`}>
                {achievement.title}
              </h3>
              
              <p className={`text-sm mb-4 ${
                achievement.earned ? 'text-yellow-600' : 'text-gray-500'
              }`}>
                {achievement.description}
              </p>

              {achievement.earned ? (
                <div>
                  <div className="badge badge-success badge-lg mb-2">
                    🎉 Earned!
                  </div>
                  <div className="badge badge-primary">
                    +{achievement.points} pts
                  </div>
                  {achievement.earnedDate && (
                    <p className="text-xs text-gray-500 mt-2">
                      Earned {new Date(achievement.earnedDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="badge badge-ghost badge-lg mb-2">
                    🎯 In Progress
                  </div>
                  {achievement.progress !== undefined && achievement.target && (
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div 
                          className="bg-primary h-3 rounded-full transition-all duration-500"
                          style={{width: `${(achievement.progress / achievement.target) * 100}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">
                        {achievement.progress} / {achievement.target}
                      </p>
                      <p className="text-xs text-primary font-bold">
                        {achievement.target - achievement.progress} more to go!
                      </p>
                    </div>
                  )}
                  <div className="badge badge-outline">
                    {achievement.points} pts when earned
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-16">
          <div className="text-8xl mb-4">🎯</div>
          <h3 className="text-2xl font-bold text-gray-600 mb-2">
            {showNewOnly ? "No new achievements yet!" : "No achievements in this category!"}
          </h3>
          <p className="text-gray-500">
            {showNewOnly 
              ? "Keep completing chores to unlock new achievements! 🚀"
              : "Try a different category or keep working on your chores! 💪"
            }
          </p>
        </div>
      )}

      {/* Encouraging footer */}
      <div className="card bg-gradient-to-r from-rainbow-100 to-rainbow-200 shadow-xl border-4 border-rainbow-300">
        <div className="card-body p-8 text-center">
          <div className="text-6xl mb-4">🌟</div>
          <h3 className="text-2xl font-bold text-rainbow-700 mb-4">
            You're Doing Amazing!
          </h3>
          <p className="text-lg text-rainbow-600 mb-4">
            Every achievement shows how responsible and helpful you are! 
          </p>
          <p className="text-rainbow-500">
            Keep up the fantastic work - more achievements are waiting for you! 🚀✨
          </p>
        </div>
      </div>

      {/* Close button if modal */}
      {onClose && (
        <div className="text-center mt-6">
          <button onClick={onClose} className="btn btn-primary btn-lg">
            Awesome! 🎉
          </button>
        </div>
      )}
    </div>
  );
};

export default AchievementDisplay;