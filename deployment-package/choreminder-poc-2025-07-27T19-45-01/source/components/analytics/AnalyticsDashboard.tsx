"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ProgressChart from "./ProgressChart";
import CategoryChart from "./CategoryChart";
import InsightsPanel from "./InsightsPanel";

interface ProgressMetrics {
  totalChores: number;
  completedChores: number;
  completionRate: number;
  totalPoints: number;
  averageCompletionTime: number;
  streakDays: number;
  improvementTrend: "improving" | "stable" | "declining";
  consistencyScore: number;
}

interface TimeSeriesData {
  date: string;
  completed: number;
  points: number;
  streakDays: number;
}

interface CategoryInsights {
  category: string;
  totalChores: number;
  completedChores: number;
  completionRate: number;
  averagePoints: number;
  favoriteDay: string;
  improvementSuggestion: string;
}

interface TrendInsight {
  type: "achievement" | "improvement" | "suggestion" | "celebration";
  title: string;
  description: string;
  icon: string;
  priority: "high" | "medium" | "low";
  actionable?: boolean;
  action?: string;
}

interface AnalyticsData {
  userId: string;
  userName: string;
  timeRange: string;
  progressMetrics: ProgressMetrics;
  timeSeriesData: TimeSeriesData[];
  categoryInsights: CategoryInsights[];
  trendInsights: TrendInsight[];
  generatedAt: string;
}

interface AnalyticsDashboardProps {
  userId?: string; // If not provided, uses current user
  showExportButton?: boolean;
}

export default function AnalyticsDashboard({ 
  userId, 
  showExportButton = false 
}: AnalyticsDashboardProps) {
  const { data: session } = useSession();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter" | "year">("month");
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "categories" | "insights">("overview");

  const targetUserId = userId || session?.user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchAnalyticsData();
    }
  }, [targetUserId, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/progress?userId=${targetUserId}&timeRange=${timeRange}`);
      
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        console.error("Failed to fetch analytics data");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "json" | "csv" | "summary") => {
    try {
      const response = await fetch(`/api/analytics/export?timeRange=${timeRange}&format=${format}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.${format === "summary" ? "txt" : format}`;
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
      case "improving": return "📈";
      case "declining": return "📉";
      default: return "➡️";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving": return "text-success";
      case "declining": return "text-error";
      default: return "text-info";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="card-title justify-center">No Analytics Data</h2>
          <p className="text-base-content/60">
            Complete some chores to start seeing your progress analytics!
          </p>
        </div>
      </div>
    );
  }

  const { progressMetrics, timeSeriesData, categoryInsights, trendInsights } = analyticsData;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content mb-2">
            📊 {analyticsData.userName}'s Progress Analytics
          </h1>
          <p className="text-base-content/70">
            Track your growth and celebrate improvements! 🌟
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
          {showExportButton && (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-outline">
                📤 Export
              </label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                <li><button onClick={() => handleExport("json")}>Export as JSON</button></li>
                <li><button onClick={() => handleExport("csv")}>Export as CSV</button></li>
                <li><button onClick={() => handleExport("summary")}>Export Summary</button></li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat bg-primary text-primary-content rounded-lg">
          <div className="stat-title text-primary-content/70">Completion Rate</div>
          <div className="stat-value text-2xl">{progressMetrics.completionRate}%</div>
          <div className="stat-desc text-primary-content/60 flex items-center gap-1">
            <span>{getTrendIcon(progressMetrics.improvementTrend)}</span>
            <span className={getTrendColor(progressMetrics.improvementTrend)}>
              {progressMetrics.improvementTrend}
            </span>
          </div>
        </div>

        <div className="stat bg-secondary text-secondary-content rounded-lg">
          <div className="stat-title text-secondary-content/70">Total Points</div>
          <div className="stat-value text-2xl">{progressMetrics.totalPoints.toLocaleString()}</div>
          <div className="stat-desc text-secondary-content/60">
            {progressMetrics.completedChores} chores completed
          </div>
        </div>

        <div className="stat bg-accent text-accent-content rounded-lg">
          <div className="stat-title text-accent-content/70">Current Streak</div>
          <div className="stat-value text-2xl">{progressMetrics.streakDays} 🔥</div>
          <div className="stat-desc text-accent-content/60">
            consecutive days
          </div>
        </div>

        <div className="stat bg-success text-success-content rounded-lg">
          <div className="stat-title text-success-content/70">Consistency</div>
          <div className="stat-value text-2xl">{progressMetrics.consistencyScore}%</div>
          <div className="stat-desc text-success-content/60">
            daily activity score
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button 
          className={`tab ${activeTab === "overview" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📈 Overview
        </button>
        <button 
          className={`tab ${activeTab === "trends" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("trends")}
        >
          📊 Trends
        </button>
        <button 
          className={`tab ${activeTab === "categories" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("categories")}
        >
          🏷️ Categories
        </button>
        <button 
          className={`tab ${activeTab === "insights" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("insights")}
        >
          💡 Insights
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <ProgressChart
                data={timeSeriesData}
                type="line"
                metric="completed"
                title="Chores Completed Over Time"
                color="#3B82F6"
                showTrend={true}
              />
            </div>
          </div>

          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <ProgressChart
                data={timeSeriesData}
                type="bar"
                metric="points"
                title="Points Earned Over Time"
                color="#10B981"
                showTrend={false}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-base-200 shadow-lg">
              <div className="card-body text-center">
                <div className="text-3xl mb-2">⏱️</div>
                <h3 className="card-title justify-center">Avg. Time</h3>
                <p className="text-2xl font-bold">{progressMetrics.averageCompletionTime.toFixed(1)}h</p>
                <p className="text-sm text-base-content/60">per chore</p>
              </div>
            </div>

            <div className="card bg-base-200 shadow-lg">
              <div className="card-body text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="card-title justify-center">Total Chores</h3>
                <p className="text-2xl font-bold">{progressMetrics.totalChores}</p>
                <p className="text-sm text-base-content/60">in {timeRange}</p>
              </div>
            </div>

            <div className="card bg-base-200 shadow-lg">
              <div className="card-body text-center">
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="card-title justify-center">Success Rate</h3>
                <p className="text-2xl font-bold">{progressMetrics.completionRate}%</p>
                <p className="text-sm text-base-content/60">completion rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <ProgressChart
                data={timeSeriesData}
                type="line"
                metric="completed"
                title="Daily Completion Trend"
                color="#8B5CF6"
                showTrend={true}
              />
            </div>
          </div>

          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <ProgressChart
                data={timeSeriesData}
                type="line"
                metric="points"
                title="Points Accumulation Trend"
                color="#F59E0B"
                showTrend={true}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <CategoryChart
                data={categoryInsights}
                type="doughnut"
                metric="completionRate"
                title="Completion Rate by Category"
              />
            </div>
          </div>

          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <CategoryChart
                data={categoryInsights}
                type="bar"
                metric="totalChores"
                title="Chore Distribution by Category"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "insights" && (
        <div className="max-w-4xl mx-auto">
          <InsightsPanel
            insights={trendInsights}
            onActionClick={(insight) => {
              console.log("Action clicked:", insight);
              // Handle insight actions (e.g., show tips, navigate to specific feature)
            }}
          />
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-8 text-sm text-base-content/60">
        <p>Analytics generated on {new Date(analyticsData.generatedAt).toLocaleString()}</p>
        <p>Keep up the amazing work! Every chore completed is progress toward your goals! 🌟</p>
      </div>
    </div>
  );
}