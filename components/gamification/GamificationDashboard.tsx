"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface PointsData {
  totalPoints: number;
  level: number;
  pointsToNextLevel: number;
  streak: number;
  choresCompleted: number;
  weeklyStats: {
    totalPoints: number;
    totalChores: number;
  };
  recentActivity: Array<{
    id: string;
    title: string;
    points: number;
    completedAt: string;
  }>;
}

interface Achievement {
  achievementId: string;
  name: string;
  description: string;
  category: string;
  currentProgress: number;
  targetValue: number;
  isCompleted: boolean;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

interface Challenge {
  challengeId: string;
  name: string;
  description: string;
  currentProgress: number;
  targetValue: number;
  pointsReward: number;
  expiresAt: string;
  isCompleted: boolean;
}

interface Reward {
  rewardId: string;
  name: string;
  description: string;
  pointsCost: number;
  canAfford: boolean;
  requiresApproval: boolean;
  category: string;
  icon: string;
}

export default function GamificationDashboard() {
  const { data: session } = useSession();
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "achievements" | "challenges" | "rewards">("overview");

  useEffect(() => {
    if (session?.user?.id) {
      fetchGamificationData();
    }
  }, [session]);

  const fetchGamificationData = async () => {
    try {
      setLoading(true);
      
      const [pointsRes, achievementsRes, challengesRes, rewardsRes] = await Promise.all([
        fetch("/api/gamification/points"),
        fetch("/api/gamification/achievements"),
        fetch("/api/gamification/challenges"),
        fetch("/api/gamification/rewards"),
      ]);

      if (pointsRes.ok) {
        const pointsData = await pointsRes.json();
        setPointsData(pointsData);
      }

      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json();
        setAchievements(achievementsData.achievements || []);
      }

      if (challengesRes.ok) {
        const challengesData = await challengesRes.json();
        setChallenges(challengesData.challenges || []);
      }

      if (rewardsRes.ok) {
        const rewardsData = await rewardsRes.json();
        setRewards(rewardsData.availableRewards || []);
      }
    } catch (error) {
      console.error("Failed to fetch gamification data:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestReward = async (rewardId: string) => {
    try {
      const response = await fetch("/api/gamification/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchGamificationData(); // Refresh data
      } else {
        const error = await response.json();
        alert(error.error || "Failed to request reward");
      }
    } catch (error) {
      console.error("Failed to request reward:", error);
      alert("Failed to request reward");
    }
  };

  const createWeeklyChallenge = async () => {
    try {
      const response = await fetch("/api/gamification/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "weekly" }),
      });

      if (response.ok) {
        const result = await response.json();
        alert("Weekly challenge created!");
        fetchGamificationData(); // Refresh data
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create challenge");
      }
    } catch (error) {
      console.error("Failed to create challenge:", error);
      alert("Failed to create challenge");
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "bronze": return "text-amber-600";
      case "silver": return "text-gray-500";
      case "gold": return "text-yellow-500";
      case "platinum": return "text-purple-500";
      default: return "text-gray-400";
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-base-content mb-2">🎮 Your Game Progress</h1>
        <p className="text-base-content/70">Keep growing stronger with every chore! 💪</p>
      </div>

      {/* Overview Cards */}
      {pointsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="stat bg-primary text-primary-content rounded-lg">
            <div className="stat-title text-primary-content/70">Total Points</div>
            <div className="stat-value text-2xl">{pointsData.totalPoints.toLocaleString()}</div>
            <div className="stat-desc text-primary-content/60">
              {pointsData.pointsToNextLevel} to next level
            </div>
          </div>

          <div className="stat bg-secondary text-secondary-content rounded-lg">
            <div className="stat-title text-secondary-content/70">Level</div>
            <div className="stat-value text-2xl">{pointsData.level}</div>
            <div className="stat-desc text-secondary-content/60">
              {pointsData.choresCompleted} chores completed
            </div>
          </div>

          <div className="stat bg-accent text-accent-content rounded-lg">
            <div className="stat-title text-accent-content/70">Streak</div>
            <div className="stat-value text-2xl">{pointsData.streak} 🔥</div>
            <div className="stat-desc text-accent-content/60">
              days in a row
            </div>
          </div>

          <div className="stat bg-success text-success-content rounded-lg">
            <div className="stat-title text-success-content/70">This Week</div>
            <div className="stat-value text-2xl">{pointsData.weeklyStats.totalPoints}</div>
            <div className="stat-desc text-success-content/60">
              from {pointsData.weeklyStats.totalChores} chores
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button 
          className={`tab ${activeTab === "overview" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </button>
        <button 
          className={`tab ${activeTab === "achievements" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("achievements")}
        >
          🏆 Achievements
        </button>
        <button 
          className={`tab ${activeTab === "challenges" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("challenges")}
        >
          🎯 Challenges
        </button>
        <button 
          className={`tab ${activeTab === "rewards" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("rewards")}
        >
          🎁 Rewards
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && pointsData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">📈 Recent Activity</h2>
              <div className="space-y-3">
                {pointsData.recentActivity.length > 0 ? (
                  pointsData.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-base-content/60">
                          {new Date(activity.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="badge badge-primary">+{activity.points}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-base-content/60 text-center py-4">
                    Complete your first chore to see activity here! 🌟
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">🎖️ Level Progress</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Level {pointsData.level}</span>
                    <span className="text-sm text-base-content/60">
                      {pointsData.pointsToNextLevel} points to level {pointsData.level + 1}
                    </span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full" 
                    value={100 - (pointsData.pointsToNextLevel / 100) * 100} 
                    max="100"
                  ></progress>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-primary">
                    {pointsData.totalPoints.toLocaleString()} total points
                  </p>
                  <p className="text-sm text-base-content/60">
                    Keep going! You're doing amazing! ⭐
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "achievements" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.length > 0 ? (
            achievements.map((achievement) => (
              <div 
                key={achievement.achievementId} 
                className={`card shadow-lg ${achievement.isCompleted ? "bg-success text-success-content" : "bg-base-200"}`}
              >
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div className={`badge ${getTierColor(achievement.tier)}`}>
                      {achievement.tier}
                    </div>
                  </div>
                  <h3 className="card-title text-lg">{achievement.name}</h3>
                  <p className="text-sm opacity-80 mb-3">{achievement.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{achievement.currentProgress}/{achievement.targetValue}</span>
                    </div>
                    <progress 
                      className={`progress w-full ${achievement.isCompleted ? "progress-success" : "progress-primary"}`}
                      value={getProgressPercentage(achievement.currentProgress, achievement.targetValue)}
                      max="100"
                    ></progress>
                  </div>

                  {achievement.isCompleted && (
                    <div className="badge badge-success mt-2">✓ Completed!</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-base-content/60">Complete more chores to unlock achievements! 🏆</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "challenges" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Active Challenges</h2>
            <button className="btn btn-primary" onClick={createWeeklyChallenge}>
              Create Weekly Challenge
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.length > 0 ? (
              challenges.map((challenge) => (
                <div key={challenge.challengeId} className="card bg-base-200 shadow-lg">
                  <div className="card-body">
                    <h3 className="card-title">{challenge.name}</h3>
                    <p className="text-sm text-base-content/60 mb-3">{challenge.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{challenge.currentProgress}/{challenge.targetValue}</span>
                      </div>
                      <progress 
                        className={`progress progress-primary w-full`}
                        value={getProgressPercentage(challenge.currentProgress, challenge.targetValue)}
                        max="100"
                      ></progress>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <div className="badge badge-accent">+{challenge.pointsReward} points</div>
                      <div className="text-xs text-base-content/60">
                        Expires: {new Date(challenge.expiresAt).toLocaleDateString()}
                      </div>
                    </div>

                    {challenge.isCompleted && (
                      <div className="badge badge-success mt-2">✓ Completed!</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-base-content/60">Create your first personal challenge! 🎯</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "rewards" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Available Rewards</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.length > 0 ? (
              rewards.map((reward) => (
                <div key={reward.rewardId} className="card bg-base-200 shadow-lg">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{reward.icon}</span>
                      <div className="badge badge-primary">
                        {reward.pointsCost} points
                      </div>
                    </div>
                    
                    <h3 className="card-title text-lg">{reward.name}</h3>
                    <p className="text-sm text-base-content/60 mb-3">{reward.description}</p>
                    
                    <div className="card-actions justify-end">
                      <button 
                        className={`btn btn-sm ${reward.canAfford ? "btn-primary" : "btn-disabled"}`}
                        onClick={() => reward.canAfford && requestReward(reward.rewardId)}
                        disabled={!reward.canAfford}
                      >
                        {reward.canAfford ? "Request" : "Need more points"}
                      </button>
                    </div>

                    {reward.requiresApproval && (
                      <div className="badge badge-warning badge-sm mt-2">
                        Needs parent approval
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-base-content/60">No rewards available right now. Check back later! 🎁</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}