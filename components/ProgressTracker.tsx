"use client";

import { useState, useEffect } from "react";

interface FamilyMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  role: "parent" | "child" | "admin";
}

interface ChoreStats {
  totalChores: number;
  completedChores: number;
  pendingChores: number;
  overdueChores: number;
  totalPoints: number;
  earnedPoints: number;
  averageCompletionTime: number;
  completionRate: number;
}

interface MemberProgress {
  member: FamilyMember;
  stats: ChoreStats;
  recentChores: Array<{
    _id: string;
    title: string;
    status: string;
    points: number;
    completedAt?: string;
    dueDate?: string;
  }>;
  trend: "up" | "down" | "stable";
  weeklyProgress: Array<{
    day: string;
    completed: number;
    assigned: number;
  }>;
}

interface ProgressTrackerProps {
  familyId: string;
  familyMembers: FamilyMember[];
}

const ProgressTracker = ({ familyId, familyMembers }: ProgressTrackerProps) => {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter">(
    "month",
  );
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [familyStats, setFamilyStats] = useState<ChoreStats>({
    totalChores: 0,
    completedChores: 0,
    pendingChores: 0,
    overdueChores: 0,
    totalPoints: 0,
    earnedPoints: 0,
    averageCompletionTime: 0,
    completionRate: 0,
  });
  const [memberProgress, setMemberProgress] = useState<MemberProgress[]>([]);
  const [familyTrend, setFamilyTrend] = useState<
    Array<{
      date: string;
      completed: number;
      assigned: number;
      completionRate: number;
    }>
  >([]);

  const children = familyMembers.filter((member) => member.role === "child");

  useEffect(() => {
    fetchProgressData();
  }, [familyId, timeframe]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/chores?familyId=${familyId}&analytics=true&timeframe=${timeframe}`,
      );
      if (!response.ok) throw new Error("Failed to fetch progress data");

      const data = await response.json();
      processProgressData(data.chores || []);
    } catch (error) {
      console.error("Error fetching progress data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processProgressData = (chores: any[]) => {
    const now = new Date();
    const timeframeDays =
      timeframe === "week" ? 7 : timeframe === "month" ? 30 : 90;
    const cutoffDate = new Date(
      now.getTime() - timeframeDays * 24 * 60 * 60 * 1000,
    );

    // Filter chores by timeframe
    const recentChores = chores.filter(
      (chore) => new Date(chore.createdAt) >= cutoffDate,
    );

    // Calculate family stats
    const familyStats: ChoreStats = {
      totalChores: recentChores.length,
      completedChores: recentChores.filter((c) =>
        ["completed", "verified"].includes(c.status),
      ).length,
      pendingChores: recentChores.filter((c) => c.status === "pending").length,
      overdueChores: recentChores.filter(
        (c) =>
          c.dueDate &&
          new Date(c.dueDate) < now &&
          !["completed", "verified"].includes(c.status),
      ).length,
      totalPoints: recentChores.reduce((sum, c) => sum + (c.points || 0), 0),
      earnedPoints: recentChores
        .filter((c) => ["completed", "verified"].includes(c.status))
        .reduce((sum, c) => sum + (c.points || 0), 0),
      averageCompletionTime: calculateAverageCompletionTime(recentChores),
      completionRate:
        recentChores.length > 0
          ? (recentChores.filter((c) =>
              ["completed", "verified"].includes(c.status),
            ).length /
              recentChores.length) *
            100
          : 0,
    };

    // Calculate member progress
    const memberProgress: MemberProgress[] = children.map((member) => {
      const memberChores = recentChores.filter(
        (c) => c.assignedTo?._id === member.user._id,
      );
      const completedChores = memberChores.filter((c) =>
        ["completed", "verified"].includes(c.status),
      );

      return {
        member,
        stats: {
          totalChores: memberChores.length,
          completedChores: completedChores.length,
          pendingChores: memberChores.filter((c) => c.status === "pending")
            .length,
          overdueChores: memberChores.filter(
            (c) =>
              c.dueDate &&
              new Date(c.dueDate) < now &&
              !["completed", "verified"].includes(c.status),
          ).length,
          totalPoints: memberChores.reduce(
            (sum, c) => sum + (c.points || 0),
            0,
          ),
          earnedPoints: completedChores.reduce(
            (sum, c) => sum + (c.points || 0),
            0,
          ),
          averageCompletionTime: calculateAverageCompletionTime(memberChores),
          completionRate:
            memberChores.length > 0
              ? (completedChores.length / memberChores.length) * 100
              : 0,
        },
        recentChores: memberChores.slice(0, 5),
        trend: calculateTrend(member.user._id, chores),
        weeklyProgress: calculateWeeklyProgress(member.user._id, chores),
      };
    });

    // Calculate family trend
    const familyTrend = calculateFamilyTrend(chores, timeframeDays);

    setFamilyStats(familyStats);
    setMemberProgress(memberProgress);
    setFamilyTrend(familyTrend);
  };

  const calculateAverageCompletionTime = (chores: any[]) => {
    const completedWithTime = chores.filter(
      (c) =>
        c.completedAt &&
        c.createdAt &&
        ["completed", "verified"].includes(c.status),
    );

    if (completedWithTime.length === 0) return 0;

    const totalHours = completedWithTime.reduce((sum, c) => {
      const created = new Date(c.createdAt);
      const completed = new Date(c.completedAt);
      return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
    }, 0);

    return totalHours / completedWithTime.length;
  };

  const calculateTrend = (
    memberId: string,
    allChores: any[],
  ): "up" | "down" | "stable" => {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekBefore = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentCompleted = allChores.filter(
      (c) =>
        c.assignedTo?._id === memberId &&
        ["completed", "verified"].includes(c.status) &&
        new Date(c.completedAt) >= lastWeek,
    ).length;

    const previousCompleted = allChores.filter(
      (c) =>
        c.assignedTo?._id === memberId &&
        ["completed", "verified"].includes(c.status) &&
        new Date(c.completedAt) >= weekBefore &&
        new Date(c.completedAt) < lastWeek,
    ).length;

    if (recentCompleted > previousCompleted) return "up";
    if (recentCompleted < previousCompleted) return "down";
    return "stable";
  };

  const calculateWeeklyProgress = (memberId: string, allChores: any[]) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return days.map((day, index) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + index);
      dayDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(dayDate);
      nextDay.setDate(dayDate.getDate() + 1);

      const dayChores = allChores.filter(
        (c) =>
          c.assignedTo?._id === memberId &&
          new Date(c.createdAt) >= dayDate &&
          new Date(c.createdAt) < nextDay,
      );

      return {
        day,
        completed: dayChores.filter((c) =>
          ["completed", "verified"].includes(c.status),
        ).length,
        assigned: dayChores.length,
      };
    });
  };

  const calculateFamilyTrend = (chores: any[], days: number) => {
    const trend = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const dayChores = chores.filter(
        (c) =>
          new Date(c.createdAt) >= date && new Date(c.createdAt) < nextDate,
      );

      const completed = dayChores.filter((c) =>
        ["completed", "verified"].includes(c.status),
      ).length;
      const assigned = dayChores.length;

      trend.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        completed,
        assigned,
        completionRate: assigned > 0 ? (completed / assigned) * 100 : 0,
      });
    }

    return trend;
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return (
          <svg
            className="w-4 h-4 text-success"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "down":
        return (
          <svg
            className="w-4 h-4 text-error"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4 text-info"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const selectedMemberData =
    selectedMember === "all"
      ? null
      : memberProgress.find((mp) => mp.member.user._id === selectedMember);

  if (loading) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Progress Tracker</h2>
          <p className="text-base-content/70">
            Monitor family chore completion and performance
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="select select-bordered select-sm"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>

          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="select select-bordered select-sm"
          >
            <option value="all">All Family Members</option>
            {children.map((member) => (
              <option key={member.user._id} value={member.user._id}>
                {member.user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Family Overview Stats */}
      {selectedMember === "all" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat bg-base-200 rounded-lg shadow">
            <div className="stat-figure text-primary">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="stat-title">Completion Rate</div>
            <div className="stat-value text-primary">
              {familyStats.completionRate.toFixed(1)}%
            </div>
            <div className="stat-desc">
              {familyStats.completedChores} of {familyStats.totalChores} chores
            </div>
          </div>

          <div className="stat bg-base-200 rounded-lg shadow">
            <div className="stat-figure text-secondary">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <div className="stat-title">Points Earned</div>
            <div className="stat-value text-secondary">
              {familyStats.earnedPoints}
            </div>
            <div className="stat-desc">
              of {familyStats.totalPoints} possible
            </div>
          </div>

          <div className="stat bg-base-200 rounded-lg shadow">
            <div className="stat-figure text-warning">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="stat-title">Avg. Completion</div>
            <div className="stat-value text-warning">
              {familyStats.averageCompletionTime.toFixed(1)}h
            </div>
            <div className="stat-desc">per chore</div>
          </div>

          <div className="stat bg-base-200 rounded-lg shadow">
            <div className="stat-figure text-error">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="stat-title">Overdue</div>
            <div className="stat-value text-error">
              {familyStats.overdueChores}
            </div>
            <div className="stat-desc">need attention</div>
          </div>
        </div>
      )}

      {/* Individual Member Progress */}
      {selectedMember === "all" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {memberProgress.map((mp) => (
            <div
              key={mp.member.user._id}
              className="card bg-base-100 shadow-lg"
            >
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="w-12 h-12 rounded-full">
                        {mp.member.user.image ? (
                          <img
                            src={mp.member.user.image}
                            alt={mp.member.user.name}
                          />
                        ) : (
                          <div className="bg-primary text-primary-content flex items-center justify-center">
                            {mp.member.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold">{mp.member.user.name}</h3>
                      <p className="text-sm text-base-content/70 capitalize">
                        {mp.member.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(mp.trend)}
                    <span className="text-sm font-medium">
                      {mp.stats.completionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="stat-value text-success text-lg">
                      {mp.stats.completedChores}
                    </div>
                    <div className="stat-desc">Completed</div>
                  </div>
                  <div>
                    <div className="stat-value text-warning text-lg">
                      {mp.stats.pendingChores}
                    </div>
                    <div className="stat-desc">Pending</div>
                  </div>
                </div>

                <div className="progress progress-primary mb-4">
                  <div
                    className="progress-bar"
                    style={{ width: `${mp.stats.completionRate}%` }}
                  ></div>
                </div>

                {mp.stats.earnedPoints > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Points Earned:</span>
                    <span className="font-medium">
                      {mp.stats.earnedPoints} / {mp.stats.totalPoints}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        selectedMemberData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Member Stats */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-6">
                  <div className="avatar">
                    <div className="w-16 h-16 rounded-full">
                      {selectedMemberData.member.user.image ? (
                        <img
                          src={selectedMemberData.member.user.image}
                          alt={selectedMemberData.member.user.name}
                        />
                      ) : (
                        <div className="bg-primary text-primary-content flex items-center justify-center text-xl">
                          {selectedMemberData.member.user.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedMemberData.member.user.name}
                    </h3>
                    <p className="text-base-content/70 capitalize">
                      {selectedMemberData.member.role}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {getTrendIcon(selectedMemberData.trend)}
                      <span className="text-sm">Performance trend</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="stat">
                    <div className="stat-title text-xs">Completion Rate</div>
                    <div className="stat-value text-primary text-2xl">
                      {selectedMemberData.stats.completionRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-xs">Points Earned</div>
                    <div className="stat-value text-secondary text-2xl">
                      {selectedMemberData.stats.earnedPoints}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-xs">Avg. Time</div>
                    <div className="stat-value text-info text-2xl">
                      {selectedMemberData.stats.averageCompletionTime.toFixed(
                        1,
                      )}
                      h
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-xs">Overdue</div>
                    <div className="stat-value text-error text-2xl">
                      {selectedMemberData.stats.overdueChores}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Chores */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h4 className="font-semibold mb-4">Recent Chores</h4>
                <div className="space-y-3">
                  {selectedMemberData.recentChores.map((chore) => (
                    <div
                      key={chore._id}
                      className="flex items-center justify-between p-2 bg-base-200 rounded"
                    >
                      <div>
                        <div className="font-medium text-sm">{chore.title}</div>
                        <div className="text-xs text-base-content/60">
                          {chore.completedAt
                            ? `Completed ${new Date(chore.completedAt).toLocaleDateString()}`
                            : chore.dueDate
                              ? `Due ${new Date(chore.dueDate).toLocaleDateString()}`
                              : "No due date"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{chore.points} pts</span>
                        <div
                          className={`badge badge-sm ${
                            chore.status === "completed" ||
                            chore.status === "verified"
                              ? "badge-success"
                              : chore.status === "pending"
                                ? "badge-warning"
                                : "badge-error"
                          }`}
                        >
                          {chore.status}
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedMemberData.recentChores.length === 0 && (
                    <p className="text-sm text-base-content/60 text-center py-4">
                      No recent chores
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Family Trend Chart */}
      {selectedMember === "all" && familyTrend.length > 0 && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="font-semibold mb-4">Family Progress Trend</h3>
            <div className="overflow-x-auto">
              <div className="flex items-end gap-2 h-32 min-w-max">
                {familyTrend.map((day, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-1 min-w-12"
                  >
                    <div className="flex flex-col items-center gap-1 flex-1 justify-end">
                      {day.assigned > 0 && (
                        <div
                          className="w-6 bg-base-300 rounded-t"
                          style={{
                            height: `${(day.assigned / Math.max(...familyTrend.map((d) => d.assigned), 1)) * 100}px`,
                          }}
                          title={`${day.assigned} assigned`}
                        ></div>
                      )}
                      {day.completed > 0 && (
                        <div
                          className="w-6 bg-success rounded-t -mt-1"
                          style={{
                            height: `${(day.completed / Math.max(...familyTrend.map((d) => d.assigned), 1)) * 100}px`,
                          }}
                          title={`${day.completed} completed`}
                        ></div>
                      )}
                    </div>
                    <span className="text-xs text-center">{day.date}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-base-300 rounded"></div>
                <span>Assigned</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-success rounded"></div>
                <span>Completed</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights and Recommendations */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="font-semibold mb-4">Insights & Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {familyStats.completionRate > 80 && (
              <div className="alert alert-success">
                <svg
                  className="stroke-current shrink-0 w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span className="text-sm">
                  Great job! Your family has an excellent completion rate.
                </span>
              </div>
            )}

            {familyStats.overdueChores > 0 && (
              <div className="alert alert-warning">
                <svg
                  className="stroke-current shrink-0 w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  ></path>
                </svg>
                <span className="text-sm">
                  {familyStats.overdueChores} chore
                  {familyStats.overdueChores > 1 ? "s are" : " is"} overdue.
                  Consider adjusting deadlines or providing support.
                </span>
              </div>
            )}

            {familyStats.completionRate < 50 && (
              <div className="alert alert-info">
                <svg
                  className="stroke-current shrink-0 w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span className="text-sm">
                  Consider breaking down complex chores or adding more
                  incentives to improve completion rates.
                </span>
              </div>
            )}

            {memberProgress.some((mp) => mp.trend === "down") && (
              <div className="alert alert-warning">
                <svg
                  className="stroke-current shrink-0 w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span className="text-sm">
                  Some family members show declining performance. Consider
                  one-on-one check-ins.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
