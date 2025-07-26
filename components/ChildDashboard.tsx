"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import MyChores from "./MyChores";
import ProgressDisplay from "./ProgressDisplay";
import PhotoSubmission from "./PhotoSubmission";
import AchievementDisplay from "./AchievementDisplay";

interface UserStats {
  totalPoints: number;
  completedChores: number;
  streakDays: number;
  level: number;
  nextLevelPoints: number;
  currentLevelPoints: number;
  badges: string[];
}

interface FamilyContext {
  activeFamily: {
    id: string;
    name: string;
    createdBy: string;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
  } | null;
  role: string | null;
  familyCount: number;
}

const ChildDashboard = () => {
  const { data: session } = useSession();
  const [familyContext, setFamilyContext] = useState<FamilyContext | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0,
    completedChores: 0,
    streakDays: 0,
    level: 1,
    nextLevelPoints: 100,
    currentLevelPoints: 0,
    badges: [],
  });
  const [activeTab, setActiveTab] = useState("chores");
  const [greeting, setGreeting] = useState("");
  const [motivationalMessage, setMotivationalMessage] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    const name = session?.user?.name?.split(' ')[0] || 'Champion';
    
    if (hour < 12) {
      setGreeting(`Good morning, ${name}! 🌅`);
    } else if (hour < 17) {
      setGreeting(`Good afternoon, ${name}! ☀️`);
    } else {
      setGreeting(`Good evening, ${name}! 🌙`);
    }

    // Set motivational messages
    const messages = [
      "You're doing amazing! Keep up the great work! 🌟",
      "Every completed chore makes you stronger! 💪",
      "You're a chore champion in the making! 🏆",
      "Small steps lead to big achievements! ✨",
      "You've got this! One chore at a time! 🚀",
      "Your family is proud of your hard work! ❤️",
      "Success is built one chore at a time! 🏗️",
      "You're making a difference every day! 🌈"
    ];
    setMotivationalMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, [session]);

  // Fetch family context
  useEffect(() => {
    const fetchFamilyContext = async () => {
      try {
        const response = await fetch("/api/families/context");
        if (!response.ok) throw new Error("Failed to fetch family context");
        const data = await response.json();
        setFamilyContext(data);
      } catch (error) {
        console.error("Error fetching family context:", error);
      }
    };

    if (session?.user) {
      fetchFamilyContext();
    }
  }, [session]);

  // Fetch user stats
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!session?.user?.id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/chores?assignedTo=${session.user.id}&stats=true`);
        if (!response.ok) throw new Error("Failed to fetch user stats");
        
        const data = await response.json();
        calculateUserStats(data.chores || []);
      } catch (error) {
        console.error("Error fetching user stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [session, refreshTrigger]);

  const calculateUserStats = (chores: any[]) => {
    const completedChores = chores.filter(c => ["completed", "verified"].includes(c.status));
    const totalPoints = completedChores.reduce((sum, c) => sum + (c.points || 0), 0);
    
    // Calculate level (every 100 points = 1 level)
    const level = Math.floor(totalPoints / 100) + 1;
    const currentLevelPoints = totalPoints % 100;
    const nextLevelPoints = 100;

    // Calculate streak (consecutive days with completed chores)
    const streakDays = calculateStreak(completedChores);

    // Calculate badges
    const badges = calculateBadges(completedChores, streakDays, totalPoints);

    setUserStats({
      totalPoints,
      completedChores: completedChores.length,
      streakDays,
      level,
      nextLevelPoints,
      currentLevelPoints,
      badges,
    });
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

  const calculateBadges = (completedChores: any[], streak: number, totalPoints: number) => {
    const badges = [];

    // First chore badge
    if (completedChores.length >= 1) badges.push("🎯 First Step");
    
    // Milestone badges
    if (completedChores.length >= 10) badges.push("⭐ Getting Started");
    if (completedChores.length >= 25) badges.push("🏃 On a Roll");
    if (completedChores.length >= 50) badges.push("🚀 Chore Master");
    if (completedChores.length >= 100) badges.push("👑 Legendary");

    // Streak badges
    if (streak >= 3) badges.push("🔥 3-Day Streak");
    if (streak >= 7) badges.push("⚡ Week Warrior");
    if (streak >= 14) badges.push("💎 Two-Week Champion");
    if (streak >= 30) badges.push("🏆 Monthly Master");

    // Points badges
    if (totalPoints >= 100) badges.push("💰 Point Collector");
    if (totalPoints >= 500) badges.push("💎 Point Master");
    if (totalPoints >= 1000) badges.push("👑 Point Royalty");

    // Category badges (would need more data from API)
    const categories = completedChores.map(c => c.category).filter(Boolean);
    const uniqueCategories = [...new Set(categories)];
    if (uniqueCategories.length >= 3) badges.push("🌈 All-Rounder");

    return badges;
  };

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading && !familyContext) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-lg font-medium text-primary">Loading your awesome dashboard... 🚀</p>
        </div>
      </div>
    );
  }

  if (!familyContext?.activeFamily) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold mb-4 text-primary">No Family Yet!</h2>
          <p className="text-base-content/70 mb-6">
            Ask your parents to add you to a family so you can start earning points and completing chores!
          </p>
          <div className="text-4xl">🎯✨</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Fun Header */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white relative overflow-hidden mb-8">
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-6xl animate-bounce">⭐</div>
          <div className="absolute top-8 right-8 text-4xl animate-pulse">🚀</div>
          <div className="absolute bottom-4 left-1/4 text-5xl animate-bounce" style={{animationDelay: '1s'}}>✨</div>
          <div className="absolute bottom-8 right-1/4 text-3xl animate-pulse" style={{animationDelay: '2s'}}>🏆</div>
        </div>

        <div className="container mx-auto px-4 py-8 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">
              {greeting}
            </h1>
            <p className="text-xl text-white/90 mb-4">
              {motivationalMessage}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <span className="text-2xl">⭐</span>
                <span className="font-bold">Level {userStats.level}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <span className="text-2xl">💰</span>
                <span className="font-bold">{userStats.totalPoints} Points</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <span className="text-2xl">🔥</span>
                <span className="font-bold">{userStats.streakDays}-Day Streak</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* Fun Navigation */}
        <div className="tabs tabs-boxed mb-8 bg-white shadow-xl border-4 border-primary/20 rounded-2xl p-2">
          <button
            className={`tab tab-lg font-bold rounded-xl transition-all ${
              activeTab === "chores" 
                ? "tab-active bg-gradient-to-r from-primary to-secondary text-white shadow-lg transform scale-105" 
                : "hover:bg-primary/10"
            }`}
            onClick={() => setActiveTab("chores")}
          >
            <span className="text-2xl mr-2">📋</span>
            My Chores
          </button>
          <button
            className={`tab tab-lg font-bold rounded-xl transition-all ${
              activeTab === "progress" 
                ? "tab-active bg-gradient-to-r from-secondary to-accent text-white shadow-lg transform scale-105" 
                : "hover:bg-secondary/10"
            }`}
            onClick={() => setActiveTab("progress")}
          >
            <span className="text-2xl mr-2">🏆</span>
            My Progress
          </button>
          <button
            className={`tab tab-lg font-bold rounded-xl transition-all ${
              activeTab === "achievements" 
                ? "tab-active bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-lg transform scale-105" 
                : "hover:bg-yellow-100"
            }`}
            onClick={() => setActiveTab("achievements")}
          >
            <span className="text-2xl mr-2">🏆</span>
            Achievements
          </button>
          <button
            className={`tab tab-lg font-bold rounded-xl transition-all ${
              activeTab === "photos" 
                ? "tab-active bg-gradient-to-r from-accent to-primary text-white shadow-lg transform scale-105" 
                : "hover:bg-accent/10"
            }`}
            onClick={() => setActiveTab("photos")}
          >
            <span className="text-2xl mr-2">📸</span>
            Photo Upload
          </button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Level Progress */}
          <div className="card bg-white shadow-xl border-4 border-primary/20 hover:shadow-2xl transition-all transform hover:scale-105">
            <div className="card-body text-center">
              <div className="text-4xl mb-2">⭐</div>
              <h3 className="font-bold text-xl text-primary">Level {userStats.level}</h3>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div 
                  className="bg-gradient-to-r from-primary to-secondary h-4 rounded-full transition-all duration-1000"
                  style={{width: `${(userStats.currentLevelPoints / userStats.nextLevelPoints) * 100}%`}}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {userStats.currentLevelPoints}/{userStats.nextLevelPoints} to Level {userStats.level + 1}
              </p>
            </div>
          </div>

          {/* Today's Challenge */}
          <div className="card bg-white shadow-xl border-4 border-secondary/20 hover:shadow-2xl transition-all transform hover:scale-105">
            <div className="card-body text-center">
              <div className="text-4xl mb-2">🎯</div>
              <h3 className="font-bold text-xl text-secondary">Today's Goal</h3>
              <p className="text-2xl font-bold text-secondary">{userStats.completedChores}</p>
              <p className="text-sm text-gray-600">Chores Completed</p>
            </div>
          </div>

          {/* Streak Counter */}
          <div className="card bg-white shadow-xl border-4 border-accent/20 hover:shadow-2xl transition-all transform hover:scale-105">
            <div className="card-body text-center">
              <div className="text-4xl mb-2">🔥</div>
              <h3 className="font-bold text-xl text-accent">Streak</h3>
              <p className="text-2xl font-bold text-accent">{userStats.streakDays}</p>
              <p className="text-sm text-gray-600">
                {userStats.streakDays === 0 ? "Start your streak!" : "Days in a row!"}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Badges */}
        {userStats.badges.length > 0 && (
          <div className="card bg-white shadow-xl border-4 border-warning/20 mb-8">
            <div className="card-body">
              <h3 className="card-title text-warning text-xl mb-4">
                🏅 Your Awesome Badges!
              </h3>
              <div className="flex flex-wrap gap-3">
                {userStats.badges.map((badge, index) => (
                  <div 
                    key={index}
                    className="badge badge-lg bg-gradient-to-r from-warning to-accent text-white font-bold py-3 px-4 shadow-lg transform hover:scale-110 transition-all"
                  >
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-primary/10 overflow-hidden">
          {activeTab === "chores" && (
            <MyChores
              userId={session?.user?.id || ""}
              familyId={familyContext.activeFamily.id}
              onChoreUpdated={refreshData}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activeTab === "progress" && (
            <ProgressDisplay
              userStats={userStats}
              userId={session?.user?.id || ""}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "achievements" && (
            <AchievementDisplay
              triggerRefresh={refreshTrigger}
            />
          )}

          {activeTab === "photos" && (
            <PhotoSubmission
              userId={session?.user?.id || ""}
              familyId={familyContext.activeFamily.id}
              onPhotoSubmitted={refreshData}
            />
          )}
        </div>

        {/* Encouraging Footer */}
        <div className="text-center mt-8 p-6 bg-white/50 rounded-2xl backdrop-blur">
          <div className="text-4xl mb-2">🌟</div>
          <p className="text-lg font-medium text-primary">
            Remember: Every chore completed makes you stronger and helps your family! 
          </p>
          <p className="text-sm text-gray-600 mt-2">
            You're doing amazing work! Keep it up, champion! 💪✨
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChildDashboard;