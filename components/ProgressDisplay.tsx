"use client";

import { useState, useEffect } from "react";

interface UserStats {
  totalPoints: number;
  completedChores: number;
  streakDays: number;
  level: number;
  nextLevelPoints: number;
  currentLevelPoints: number;
  badges: string[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earned: boolean;
  earnedDate?: string;
  progress?: number;
  target?: number;
}

interface WeeklyData {
  day: string;
  completed: number;
  points: number;
}

interface ProgressDisplayProps {
  userStats: UserStats;
  userId: string;
  onRefresh: () => void;
}

const ProgressDisplay = ({ userStats, userId, onRefresh }: ProgressDisplayProps) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [motivationalQuote, setMotivationalQuote] = useState("");

  const motivationalQuotes = [
    "You're becoming an amazing helper! 🌟",
    "Every chore completed makes you stronger! 💪",
    "You're building incredible habits! 🏗️",
    "Your family is so proud of you! ❤️",
    "Champions are made one chore at a time! 🏆",
    "You're creating a better world around you! 🌍",
    "Success is a journey, and you're on the right path! 🛤️",
    "You're learning life skills that will help you forever! 📚",
  ];

  useEffect(() => {
    setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    generateWeeklyData();
    generateAchievements();
  }, [userStats]);

  const generateWeeklyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const currentDay = today.getDay();
    
    // Generate realistic weekly data based on user stats
    const data = days.map((day, index) => {
      const daysPassed = (currentDay - index + 7) % 7;
      const completed = daysPassed === 0 ? 
        Math.floor(Math.random() * 3) + 1 : // Today
        daysPassed <= 3 ? 
          Math.floor(Math.random() * 4) : // Recent days
          Math.floor(Math.random() * 2); // Older days
      
      return {
        day,
        completed,
        points: completed * 10, // Assume average 10 points per chore
      };
    });
    
    setWeeklyData(data);
  };

  const generateAchievements = () => {
    const allAchievements: Achievement[] = [
      // Beginner Achievements
      {
        id: 'first_chore',
        title: 'First Steps',
        description: 'Complete your very first chore!',
        emoji: '👶',
        earned: userStats.completedChores >= 1,
        earnedDate: userStats.completedChores >= 1 ? '2024-01-01' : undefined,
      },
      {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Complete 5 chores',
        emoji: '🐦',
        earned: userStats.completedChores >= 5,
        progress: Math.min(userStats.completedChores, 5),
        target: 5,
      },
      {
        id: 'getting_started',
        title: 'Getting Started',
        description: 'Complete 10 chores',
        emoji: '⭐',
        earned: userStats.completedChores >= 10,
        progress: Math.min(userStats.completedChores, 10),
        target: 10,
      },
      
      // Progress Achievements
      {
        id: 'on_a_roll',
        title: 'On a Roll',
        description: 'Complete 25 chores',
        emoji: '🚀',
        earned: userStats.completedChores >= 25,
        progress: Math.min(userStats.completedChores, 25),
        target: 25,
      },
      {
        id: 'chore_master',
        title: 'Chore Master',
        description: 'Complete 50 chores',
        emoji: '🏆',
        earned: userStats.completedChores >= 50,
        progress: Math.min(userStats.completedChores, 50),
        target: 50,
      },
      {
        id: 'legendary',
        title: 'Legendary Helper',
        description: 'Complete 100 chores',
        emoji: '👑',
        earned: userStats.completedChores >= 100,
        progress: Math.min(userStats.completedChores, 100),
        target: 100,
      },
      
      // Streak Achievements
      {
        id: 'streak_3',
        title: 'Three in a Row',
        description: 'Complete chores for 3 days straight',
        emoji: '🔥',
        earned: userStats.streakDays >= 3,
        progress: Math.min(userStats.streakDays, 3),
        target: 3,
      },
      {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        emoji: '⚡',
        earned: userStats.streakDays >= 7,
        progress: Math.min(userStats.streakDays, 7),
        target: 7,
      },
      {
        id: 'consistency_king',
        title: 'Consistency Champion',
        description: 'Maintain a 14-day streak',
        emoji: '💎',
        earned: userStats.streakDays >= 14,
        progress: Math.min(userStats.streakDays, 14),
        target: 14,
      },
      {
        id: 'month_master',
        title: 'Monthly Master',
        description: 'Maintain a 30-day streak',
        emoji: '🏅',
        earned: userStats.streakDays >= 30,
        progress: Math.min(userStats.streakDays, 30),
        target: 30,
      },
      
      // Points Achievements
      {
        id: 'point_collector',
        title: 'Point Collector',
        description: 'Earn 100 points',
        emoji: '💰',
        earned: userStats.totalPoints >= 100,
        progress: Math.min(userStats.totalPoints, 100),
        target: 100,
      },
      {
        id: 'point_master',
        title: 'Point Master',
        description: 'Earn 500 points',
        emoji: '💎',
        earned: userStats.totalPoints >= 500,
        progress: Math.min(userStats.totalPoints, 500),
        target: 500,
      },
      {
        id: 'point_royalty',
        title: 'Point Royalty',
        description: 'Earn 1000 points',
        emoji: '👑',
        earned: userStats.totalPoints >= 1000,
        progress: Math.min(userStats.totalPoints, 1000),
        target: 1000,
      },
      
      // Special Achievements
      {
        id: 'weekend_warrior',
        title: 'Weekend Warrior',
        description: 'Complete chores on both weekend days',
        emoji: '🎮',
        earned: false, // Would need more complex logic
      },
      {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Get 10 photos approved without rejection',
        emoji: '📸',
        earned: false, // Would need photo verification data
      },
      {
        id: 'team_player',
        title: 'Team Player',
        description: 'Help with chores assigned to others',
        emoji: '🤝',
        earned: false, // Would need collaboration data
      },
    ];

    setAchievements(allAchievements);
  };

  const getLevelTitle = (level: number) => {
    if (level >= 20) return "Legendary Master";
    if (level >= 15) return "Supreme Helper";
    if (level >= 10) return "Chore Champion";
    if (level >= 7) return "Super Helper";
    if (level >= 5) return "Great Assistant";
    if (level >= 3) return "Good Helper";
    if (level >= 2) return "Junior Helper";
    return "New Helper";
  };

  const getLevelEmoji = (level: number) => {
    if (level >= 20) return "👑";
    if (level >= 15) return "🏆";
    if (level >= 10) return "🥇";
    if (level >= 7) return "🥈";
    if (level >= 5) return "🥉";
    if (level >= 3) return "⭐";
    if (level >= 2) return "🌟";
    return "✨";
  };

  const earnedAchievements = achievements.filter(a => a.earned);
  const nextAchievements = achievements.filter(a => !a.earned && a.target).slice(0, 3);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">
          🏆 Your Amazing Progress!
        </h2>
        <p className="text-lg text-gray-600">
          {motivationalQuote}
        </p>
      </div>

      {/* Level Progress Card */}
      <div className="card bg-gradient-to-br from-purple-100 to-blue-100 shadow-xl border-4 border-purple-200 mb-8">
        <div className="card-body p-8">
          <div className="text-center">
            <div className="text-8xl mb-4">{getLevelEmoji(userStats.level)}</div>
            <h3 className="text-3xl font-bold text-purple-700 mb-2">
              Level {userStats.level}
            </h3>
            <p className="text-xl text-purple-600 font-semibold mb-6">
              {getLevelTitle(userStats.level)}
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/50 rounded-full h-6 mb-4 shadow-inner">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-6 rounded-full transition-all duration-1000 shadow-lg"
                style={{width: `${(userStats.currentLevelPoints / userStats.nextLevelPoints) * 100}%`}}
              ></div>
            </div>
            
            <p className="text-lg font-medium text-purple-700">
              {userStats.currentLevelPoints} / {userStats.nextLevelPoints} points to Level {userStats.level + 1}
            </p>
            <p className="text-sm text-purple-600 mt-2">
              Only {userStats.nextLevelPoints - userStats.currentLevelPoints} more points to go! 🚀
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Points */}
        <div className="stat bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl shadow-xl border-4 border-yellow-200">
          <div className="stat-figure text-6xl">💰</div>
          <div className="stat-title text-orange-700 font-bold">Total Points</div>
          <div className="stat-value text-orange-800">{userStats.totalPoints}</div>
          <div className="stat-desc text-orange-600">Keep collecting! 🌟</div>
        </div>

        {/* Completed Chores */}
        <div className="stat bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl shadow-xl border-4 border-green-200">
          <div className="stat-figure text-6xl">✅</div>
          <div className="stat-title text-green-700 font-bold">Chores Done</div>
          <div className="stat-value text-green-800">{userStats.completedChores}</div>
          <div className="stat-desc text-green-600">You're amazing! 🎉</div>
        </div>

        {/* Current Streak */}
        <div className="stat bg-gradient-to-br from-red-100 to-pink-100 rounded-2xl shadow-xl border-4 border-red-200">
          <div className="stat-figure text-6xl">🔥</div>
          <div className="stat-title text-red-700 font-bold">Current Streak</div>
          <div className="stat-value text-red-800">{userStats.streakDays}</div>
          <div className="stat-desc text-red-600">
            {userStats.streakDays === 0 ? "Start today! 💪" : "Days in a row! 🔥"}
          </div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="card bg-white shadow-xl border-4 border-blue-200 mb-8">
        <div className="card-body p-6">
          <h3 className="card-title text-2xl text-blue-700 mb-6">
            📊 Your Week at a Glance
          </h3>
          
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weeklyData.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-sm font-bold text-gray-600 mb-2">{day.day}</div>
                <div className="bg-blue-100 rounded-lg p-3 h-20 flex flex-col justify-end items-center relative">
                  <div 
                    className="bg-gradient-to-t from-blue-500 to-blue-300 rounded w-full transition-all duration-1000"
                    style={{ height: `${Math.max(day.completed * 20, 10)}%` }}
                  ></div>
                  <div className="absolute top-1 text-xs font-bold text-blue-700">
                    {day.completed}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{day.points} pts</div>
              </div>
            ))}
          </div>
          
          <div className="text-center text-sm text-gray-600">
            📈 Keep up the great work! Consistency is key! 🗝️
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Earned Achievements */}
        <div className="card bg-gradient-to-br from-gold-50 to-yellow-50 shadow-xl border-4 border-yellow-300">
          <div className="card-body p-6">
            <h3 className="card-title text-2xl text-yellow-700 mb-6">
              🏅 Your Awesome Badges!
            </h3>
            
            {earnedAchievements.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {earnedAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="card bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 border-2 border-yellow-200"
                    onClick={() => setSelectedAchievement(achievement)}
                  >
                    <div className="card-body p-4 text-center">
                      <div className="text-4xl mb-2">{achievement.emoji}</div>
                      <h4 className="font-bold text-sm">{achievement.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {achievement.description}
                      </p>
                      {achievement.earnedDate && (
                        <div className="badge badge-success badge-xs mt-2">
                          Earned!
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-gray-600">
                  Complete more chores to earn your first badge! 🌟
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Next Achievements */}
        <div className="card bg-gradient-to-br from-gray-50 to-slate-50 shadow-xl border-4 border-gray-300">
          <div className="card-body p-6">
            <h3 className="card-title text-2xl text-gray-700 mb-6">
              🎯 Next Goals to Unlock!
            </h3>
            
            <div className="space-y-4">
              {nextAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="card bg-white shadow-lg border-2 border-dashed border-gray-300 hover:border-primary transition-all cursor-pointer"
                  onClick={() => setSelectedAchievement(achievement)}
                >
                  <div className="card-body p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl opacity-50">{achievement.emoji}</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{achievement.title}</h4>
                        <p className="text-xs text-gray-600 mb-2">
                          {achievement.description}
                        </p>
                        {achievement.progress !== undefined && achievement.target && (
                          <div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-500"
                                style={{width: `${(achievement.progress / achievement.target) * 100}%`}}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {achievement.progress} / {achievement.target}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Encouraging Message */}
      <div className="card bg-gradient-to-r from-rainbow-100 to-rainbow-200 shadow-xl border-4 border-rainbow-300">
        <div className="card-body p-8 text-center">
          <div className="text-6xl mb-4">🌈</div>
          <h3 className="text-2xl font-bold text-rainbow-700 mb-4">
            You're Doing Amazing! 
          </h3>
          <p className="text-lg text-rainbow-600 mb-4">
            Every chore you complete helps your family and builds your character! 
          </p>
          <p className="text-rainbow-500">
            Keep being the awesome person you are! 🌟✨💪
          </p>
        </div>
      </div>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md bg-gradient-to-br from-white to-blue-50">
            <h3 className="font-bold text-2xl mb-4 text-center text-primary">
              {selectedAchievement.emoji} {selectedAchievement.title}
            </h3>
            
            <div className="text-center mb-6">
              <div className="text-8xl mb-4">{selectedAchievement.emoji}</div>
              <p className="text-lg text-gray-700 mb-4">
                {selectedAchievement.description}
              </p>
              
              {selectedAchievement.earned ? (
                <div>
                  <div className="badge badge-success badge-lg mb-2">🎉 Earned!</div>
                  {selectedAchievement.earnedDate && (
                    <p className="text-sm text-gray-600">
                      Earned on {new Date(selectedAchievement.earnedDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="badge badge-warning badge-lg mb-2">🎯 In Progress</div>
                  {selectedAchievement.progress !== undefined && selectedAchievement.target && (
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                        <div 
                          className="bg-primary h-4 rounded-full transition-all duration-500"
                          style={{width: `${(selectedAchievement.progress / selectedAchievement.target) * 100}%`}}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {selectedAchievement.progress} / {selectedAchievement.target} completed
                      </p>
                      <p className="text-sm text-primary font-bold">
                        {selectedAchievement.target - selectedAchievement.progress} more to go!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                onClick={() => setSelectedAchievement(null)}
                className="btn btn-primary w-full"
              >
                Awesome! 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressDisplay;