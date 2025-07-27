"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";

import { useOfflineSync } from "@/hooks/useOfflineSync";
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization";

import LazyImage from "../performance/LazyImage";
import VirtualizedList from "../performance/VirtualizedList";
import {
  InteractiveButton,
  ProgressRing,
  SwipeCard,
} from "../ui/MicroInteractions";

import MobileChoreCard from "./MobileChoreCard";

interface MobileDashboardProps {
  chores: any[];
  familyMembers: any[];
  achievements: any[];
  onChoreComplete: (chore: any) => void;
  onChoreEdit: (chore: any) => void;
  onChoreDelete: (chore: any) => void;
}

const MobileDashboard = ({
  chores,
  familyMembers,
  achievements,
  onChoreComplete,
  onChoreEdit,
  onChoreDelete,
}: MobileDashboardProps) => {
  const { data: session } = useSession();
  const { adaptiveSettings, isLowEndDevice, recommendations } =
    usePerformanceOptimization();
  const { addOfflineAction, isOnline } = useOfflineSync();

  const [viewMode, setViewMode] = useState<"overview" | "chores" | "progress">(
    "overview",
  );
  const [timeOfDay, setTimeOfDay] = useState("");
  const [todaysProgress, setTodaysProgress] = useState({
    completed: 0,
    total: 0,
    points: 0,
    streak: 0,
  });

  // Calculate user's chores and progress
  const userChores = useMemo(() => {
    return chores.filter((chore) => chore.assignedTo._id === session?.user?.id);
  }, [chores, session?.user?.id]);

  const todaysChores = useMemo(() => {
    const today = new Date().toDateString();
    return userChores.filter((chore) => {
      const choreDate = new Date(
        chore.createdAt || chore.dueDate,
      ).toDateString();
      return choreDate === today;
    });
  }, [userChores]);

  const completedToday = useMemo(() => {
    return todaysChores.filter(
      (chore) => chore.status === "completed" || chore.status === "approved",
    ).length;
  }, [todaysChores]);

  const pendingChores = useMemo(() => {
    return userChores.filter((chore) => chore.status === "pending");
  }, [userChores]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay("morning");
    else if (hour < 17) setTimeOfDay("afternoon");
    else setTimeOfDay("evening");

    setTodaysProgress({
      completed: completedToday,
      total: todaysChores.length,
      points: todaysChores
        .filter((chore) => chore.status === "approved")
        .reduce((sum, chore) => sum + chore.points, 0),
      streak: calculateStreak(),
    });
  }, [completedToday, todaysChores]);

  const calculateStreak = () => {
    // Simple streak calculation - could be enhanced
    const recentChores = userChores
      .filter((chore) => chore.status === "approved")
      .sort(
        (a, b) =>
          new Date(b.completedAt || b.updatedAt).getTime() -
          new Date(a.completedAt || a.updatedAt).getTime(),
      );

    let streak = 0;
    const today = new Date();

    for (const chore of recentChores) {
      const choreDate = new Date(chore.completedAt || chore.updatedAt);
      const daysDiff = Math.floor(
        (today.getTime() - choreDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff <= streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const getGreeting = () => {
    const name = session?.user?.name?.split(" ")[0] || "there";
    const greetings = {
      morning: [`Good morning, ${name}! 🌅`, `Rise and shine, ${name}! ☀️`],
      afternoon: [
        `Good afternoon, ${name}! 🌞`,
        `Hope you're having a great day, ${name}! 😊`,
      ],
      evening: [`Good evening, ${name}! 🌙`, `Winding down, ${name}? 🌆`],
    };

    const options =
      greetings[timeOfDay as keyof typeof greetings] || greetings.morning;
    return options[Math.floor(Math.random() * options.length)];
  };

  const getMotivationalMessage = () => {
    const messages = [
      "You're doing amazing! Keep it up! 💪",
      "Every chore completed is a step forward! 🚀",
      "Your family appreciates your hard work! ❤️",
      "Small steps lead to big achievements! ⭐",
      "You're building great habits! 🌱",
    ];

    if (todaysProgress.completed === 0) {
      return "Ready to start your day? Let's do this! 🎯";
    } else if (todaysProgress.completed === todaysProgress.total) {
      return "All done for today! You're a superstar! 🌟";
    } else {
      return messages[Math.floor(Math.random() * messages.length)];
    }
  };

  const handleQuickComplete = async (chore: any) => {
    if (!isOnline) {
      addOfflineAction("chore_complete", {
        choreId: chore._id,
        completedAt: new Date().toISOString(),
        quickComplete: true,
      });
      toast.success("💾 Chore marked complete offline!", {
        duration: 3000,
        position: "bottom-center",
      });
    } else {
      onChoreComplete(chore);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Greeting Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-br from-primary to-secondary text-white shadow-xl"
      >
        <div className="card-body p-6">
          <h1 className="text-2xl font-bold mb-2">{getGreeting()}</h1>
          <p className="opacity-90">{getMotivationalMessage()}</p>
        </div>
      </motion.div>

      {/* Progress Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card bg-white shadow-lg"
      >
        <div className="card-body p-6">
          <h2 className="text-xl font-bold mb-4">Today's Progress</h2>

          <div className="flex items-center justify-center mb-6">
            <ProgressRing
              progress={
                (todaysProgress.completed / Math.max(todaysProgress.total, 1)) *
                100
              }
              size={isLowEndDevice ? 100 : 120}
              color="#3b82f6"
              showLabel={true}
              label={`${todaysProgress.completed}/${todaysProgress.total} chores`}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {todaysProgress.points}
              </div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {todaysProgress.streak}
              </div>
              <div className="text-sm text-gray-600">Day Streak</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {pendingChores.length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card bg-white shadow-lg"
      >
        <div className="card-body p-6">
          <h3 className="font-bold mb-4">Quick Actions</h3>

          <div className="grid grid-cols-2 gap-3">
            <InteractiveButton
              variant="primary"
              size="md"
              className="h-16 flex-col"
              onClick={() => setViewMode("chores")}
            >
              <span className="text-xl mb-1">📋</span>
              <span className="text-sm">View Chores</span>
            </InteractiveButton>

            <InteractiveButton
              variant="secondary"
              size="md"
              className="h-16 flex-col"
              onClick={() => setViewMode("progress")}
            >
              <span className="text-xl mb-1">📊</span>
              <span className="text-sm">Progress</span>
            </InteractiveButton>
          </div>
        </div>
      </motion.div>

      {/* Upcoming Chores Preview */}
      {pendingChores.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-white shadow-lg"
        >
          <div className="card-body p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Next Up</h3>
              <button
                onClick={() => setViewMode("chores")}
                className="text-primary text-sm font-medium"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {pendingChores.slice(0, 2).map((chore) => (
                <SwipeCard
                  key={chore._id}
                  onSwipeRight={() => handleQuickComplete(chore)}
                  onSwipeLeft={() => onChoreEdit(chore)}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{chore.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>⏱️ {chore.estimatedMinutes}m</span>
                        <span>🏆 {chore.points} pts</span>
                      </div>
                    </div>

                    <InteractiveButton
                      variant="success"
                      size="sm"
                      onClick={() => handleQuickComplete(chore)}
                    >
                      ✅
                    </InteractiveButton>
                  </div>
                </SwipeCard>
              ))}
            </div>

            {pendingChores.length > 2 && (
              <div className="text-center mt-4">
                <span className="text-sm text-gray-500">
                  +{pendingChores.length - 2} more chores
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );

  const renderChores = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Your Chores</h2>
        <InteractiveButton
          variant="ghost"
          size="sm"
          onClick={() => setViewMode("overview")}
        >
          ← Back
        </InteractiveButton>
      </div>

      {userChores.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold mb-2">No chores assigned!</h3>
          <p className="text-gray-600">Enjoy your free time!</p>
        </div>
      ) : (
        <VirtualizedList
          items={userChores}
          itemHeight={120}
          containerHeight={600}
          renderItem={(chore, index) => (
            <MobileChoreCard
              key={chore._id}
              chore={chore}
              onComplete={onChoreComplete}
              onEdit={onChoreEdit}
              onDelete={onChoreDelete}
            />
          )}
          keyExtractor={(chore) => chore._id}
          loading={false}
          emptyComponent={
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2">No chores found</h3>
              <p className="text-gray-600">Check back later!</p>
            </div>
          }
        />
      )}
    </div>
  );

  const renderProgress = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Your Progress</h2>
        <InteractiveButton
          variant="ghost"
          size="sm"
          onClick={() => setViewMode("overview")}
        >
          ← Back
        </InteractiveButton>
      </div>

      {/* Detailed progress content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {/* Progress cards, charts, achievements, etc. */}
        <div className="card bg-white shadow-lg">
          <div className="card-body p-6">
            <h3 className="font-bold mb-4">This Week</h3>
            <div className="space-y-4">
              {/* Weekly progress content */}
              <div className="text-center">
                <div className="text-lg text-gray-600">
                  More detailed progress coming soon!
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-4">
      <AnimatePresence mode="wait">
        {viewMode === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{
              duration: adaptiveSettings.animationsEnabled ? 0.3 : 0.1,
            }}
          >
            {renderOverview()}
          </motion.div>
        )}

        {viewMode === "chores" && (
          <motion.div
            key="chores"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: adaptiveSettings.animationsEnabled ? 0.3 : 0.1,
            }}
          >
            {renderChores()}
          </motion.div>
        )}

        {viewMode === "progress" && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: adaptiveSettings.animationsEnabled ? 0.3 : 0.1,
            }}
          >
            {renderProgress()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileDashboard;
