"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import AnalyticsDashboard from "./AnalyticsDashboard";

interface FamilyMember {
  userId: string;
  name: string;
  completionRate: number;
  totalPoints: number;
  level: number;
  streak: number;
  thisWeekChores: number;
  trend: "improving" | "stable" | "declining";
}

interface FamilyOverview {
  totalFamilyChores: number;
  totalFamilyPoints: number;
  averageCompletionRate: number;
  activeChildren: number;
  thisWeekImprovement: number;
}

interface FamilyInsights {
  topPerformer: string;
  mostImproved: string;
  consistencyChampion: string;
  suggestions: string[];
}

interface FamilyAnalyticsData {
  overview: FamilyOverview;
  memberProgress: FamilyMember[];
  insights: FamilyInsights;
}

export default function FamilyAnalyticsDashboard() {
  const { data: session } = useSession();
  const [familyData, setFamilyData] = useState<FamilyAnalyticsData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"family" | "individual">("family");

  useEffect(() => {
    if (session?.user?.id) {
      fetchFamilyAnalytics();
    }
  }, [session, timeRange]);

  const fetchFamilyAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/family?timeRange=${timeRange}`,
      );

      if (response.ok) {
        const data = await response.json();
        setFamilyData(data.analytics);
      } else {
        console.error("Failed to fetch family analytics");
      }
    } catch (error) {
      console.error("Error fetching family analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "json" | "csv" | "summary") => {
    try {
      const response = await fetch(
        `/api/analytics/export?timeRange=${timeRange}&format=${format}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `family-analytics-${timeRange}-${new Date().toISOString().split("T")[0]}.${format === "summary" ? "txt" : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return "📈";
      case "declining":
        return "📉";
      default:
        return "➡️";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving":
        return "text-success";
      case "declining":
        return "text-error";
      default:
        return "text-info";
    }
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 90) return "text-success";
    if (rate >= 70) return "text-warning";
    return "text-error";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!familyData) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body text-center">
          <div className="text-4xl mb-4">👨‍👩‍👧‍👦</div>
          <h2 className="card-title justify-center">No Family Data</h2>
          <p className="text-base-content/60">
            Family members need to complete chores to see analytics!
          </p>
        </div>
      </div>
    );
  }

  // If viewing individual member, show their personal dashboard
  if (viewMode === "individual" && selectedMember) {
    return (
      <div>
        <div className="mb-6">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setViewMode("family");
              setSelectedMember(null);
            }}
          >
            ← Back to Family Overview
          </button>
        </div>
        <AnalyticsDashboard userId={selectedMember} showExportButton={true} />
      </div>
    );
  }

  const { overview, memberProgress, insights } = familyData;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content mb-2">
            👨‍👩‍👧‍👦 Family Analytics Dashboard
          </h1>
          <p className="text-base-content/70">
            Track your family's progress and celebrate together! 🌟
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Time Range Selector */}
          <select
            className="select select-bordered"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>

          {/* Export Button */}
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-outline">
              📤 Export Report
            </label>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
            >
              <li>
                <button onClick={() => handleExport("json")}>
                  Export as JSON
                </button>
              </li>
              <li>
                <button onClick={() => handleExport("csv")}>
                  Export as CSV
                </button>
              </li>
              <li>
                <button onClick={() => handleExport("summary")}>
                  Export Summary
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Family Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="stat bg-primary text-primary-content rounded-lg">
          <div className="stat-title text-primary-content/70">Total Chores</div>
          <div className="stat-value text-xl">{overview.totalFamilyChores}</div>
          <div className="stat-desc text-primary-content/60">
            this {timeRange}
          </div>
        </div>

        <div className="stat bg-secondary text-secondary-content rounded-lg">
          <div className="stat-title text-secondary-content/70">
            Total Points
          </div>
          <div className="stat-value text-xl">
            {overview.totalFamilyPoints.toLocaleString()}
          </div>
          <div className="stat-desc text-secondary-content/60">
            family total
          </div>
        </div>

        <div className="stat bg-accent text-accent-content rounded-lg">
          <div className="stat-title text-accent-content/70">Avg. Rate</div>
          <div className="stat-value text-xl">
            {overview.averageCompletionRate}%
          </div>
          <div className="stat-desc text-accent-content/60">completion</div>
        </div>

        <div className="stat bg-success text-success-content rounded-lg">
          <div className="stat-title text-success-content/70">Active Kids</div>
          <div className="stat-value text-xl">{overview.activeChildren}</div>
          <div className="stat-desc text-success-content/60">participating</div>
        </div>

        <div className="stat bg-info text-info-content rounded-lg">
          <div className="stat-title text-info-content/70">Weekly Trend</div>
          <div className="stat-value text-xl">
            {overview.thisWeekImprovement > 0 ? "+" : ""}
            {overview.thisWeekImprovement}%
          </div>
          <div className="stat-desc text-info-content/60">vs last week</div>
        </div>
      </div>

      {/* Family Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card bg-success/10 border border-success/20 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏆</div>
              <div>
                <h3 className="card-title text-success">Top Performer</h3>
                <p className="text-lg font-semibold">{insights.topPerformer}</p>
                <p className="text-sm text-base-content/60">
                  Highest completion rate this {timeRange}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-primary/10 border border-primary/20 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📈</div>
              <div>
                <h3 className="card-title text-primary">Most Improved</h3>
                <p className="text-lg font-semibold">{insights.mostImproved}</p>
                <p className="text-sm text-base-content/60">
                  Biggest improvement this {timeRange}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-accent/10 border border-accent/20 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔥</div>
              <div>
                <h3 className="card-title text-accent">Consistency Champion</h3>
                <p className="text-lg font-semibold">
                  {insights.consistencyChampion}
                </p>
                <p className="text-sm text-base-content/60">
                  Longest streak this {timeRange}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Member Progress Table */}
      <div className="card bg-base-200 shadow-lg mb-8">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">👨‍👩‍👧‍👦 Individual Progress</h2>
            <div className="text-sm text-base-content/60">
              Click on a member to view detailed analytics
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Completion Rate</th>
                  <th>Points</th>
                  <th>Level</th>
                  <th>Streak</th>
                  <th>This Week</th>
                  <th>Trend</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberProgress.map((member) => (
                  <tr key={member.userId} className="hover">
                    <td>
                      <div className="font-medium">{member.name}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-base-300 rounded-full h-2 max-w-[80px]">
                          <div
                            className={`h-2 rounded-full ${
                              member.completionRate >= 90
                                ? "bg-success"
                                : member.completionRate >= 70
                                  ? "bg-warning"
                                  : "bg-error"
                            }`}
                            style={{
                              width: `${Math.min(member.completionRate, 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span
                          className={`font-medium ${getCompletionRateColor(member.completionRate)}`}
                        >
                          {member.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="badge badge-primary">
                        {member.totalPoints.toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div className="badge badge-secondary">
                        Level {member.level}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <span>{member.streak}</span>
                        {member.streak > 0 && <span>🔥</span>}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">{member.thisWeekChores}</div>
                    </td>
                    <td>
                      <div
                        className={`flex items-center gap-1 ${getTrendColor(member.trend)}`}
                      >
                        <span>{getTrendIcon(member.trend)}</span>
                        <span className="capitalize text-sm">
                          {member.trend}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setSelectedMember(member.userId);
                          setViewMode("individual");
                        }}
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Family Suggestions */}
      <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 shadow-lg">
        <div className="card-body">
          <h2 className="card-title mb-4">💡 Family Success Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-base-100 rounded-lg"
              >
                <div className="text-xl flex-shrink-0">💡</div>
                <div>
                  <p className="text-sm">{suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="text-center mt-8 p-6 bg-gradient-to-r from-success/20 to-primary/20 rounded-lg">
        <div className="text-2xl mb-2">🌟 Amazing Family Teamwork! 🌟</div>
        <p className="text-base-content/80">
          Every chore completed together builds stronger family bonds and life
          skills.
        </p>
        <p className="text-sm text-base-content/60 mt-2">
          Keep celebrating the small wins and supporting each other! 💪
        </p>
      </div>
    </div>
  );
}
