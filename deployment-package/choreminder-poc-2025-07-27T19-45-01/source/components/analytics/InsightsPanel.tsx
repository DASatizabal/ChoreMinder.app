"use client";

interface TrendInsight {
  type: "achievement" | "improvement" | "suggestion" | "celebration";
  title: string;
  description: string;
  icon: string;
  priority: "high" | "medium" | "low";
  actionable?: boolean;
  action?: string;
}

interface InsightsPanelProps {
  insights: TrendInsight[];
  onActionClick?: (insight: TrendInsight) => void;
}

export default function InsightsPanel({
  insights,
  onActionClick,
}: InsightsPanelProps) {
  if (!insights || insights.length === 0) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body text-center">
          <div className="text-4xl mb-2">📊</div>
          <h3 className="card-title justify-center">No Insights Yet</h3>
          <p className="text-base-content/60">
            Complete more chores to get personalized insights and suggestions!
          </p>
        </div>
      </div>
    );
  }

  const getInsightStyle = (type: string, priority: string) => {
    const baseClasses = "card shadow-lg border-l-4";

    switch (type) {
      case "achievement":
        return `${baseClasses} bg-success/10 border-l-success`;
      case "celebration":
        return `${baseClasses} bg-primary/10 border-l-primary`;
      case "improvement":
        return `${baseClasses} bg-info/10 border-l-info`;
      case "suggestion":
        return priority === "high"
          ? `${baseClasses} bg-warning/10 border-l-warning`
          : `${baseClasses} bg-base-200 border-l-base-300`;
      default:
        return `${baseClasses} bg-base-200 border-l-base-300`;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <div className="badge badge-error badge-sm">High</div>;
      case "medium":
        return <div className="badge badge-warning badge-sm">Medium</div>;
      case "low":
        return <div className="badge badge-info badge-sm">Low</div>;
      default:
        return null;
    }
  };

  const sortedInsights = [...insights].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const typeOrder = {
      celebration: 4,
      achievement: 3,
      improvement: 2,
      suggestion: 1,
    };

    // Sort by priority first, then by type
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return typeOrder[b.type] - typeOrder[a.type];
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">📈 Personal Insights</h3>
        <div className="badge badge-primary">{insights.length} insights</div>
      </div>

      <div className="grid gap-4">
        {sortedInsights.map((insight, index) => (
          <div
            key={index}
            className={getInsightStyle(insight.type, insight.priority)}
          >
            <div className="card-body p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-2xl flex-shrink-0">{insight.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-base">
                        {insight.title}
                      </h4>
                      {getPriorityBadge(insight.priority)}
                    </div>
                    <p className="text-sm text-base-content/80 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>

              {insight.actionable && insight.action && (
                <div className="card-actions justify-end mt-3">
                  <button
                    className="btn btn-sm btn-outline btn-primary"
                    onClick={() => onActionClick?.(insight)}
                  >
                    {insight.action}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="stat bg-success/10 rounded-lg p-3">
          <div className="stat-title text-xs">Celebrations</div>
          <div className="stat-value text-lg text-success">
            {insights.filter((i) => i.type === "celebration").length}
          </div>
        </div>

        <div className="stat bg-primary/10 rounded-lg p-3">
          <div className="stat-title text-xs">Achievements</div>
          <div className="stat-value text-lg text-primary">
            {insights.filter((i) => i.type === "achievement").length}
          </div>
        </div>

        <div className="stat bg-info/10 rounded-lg p-3">
          <div className="stat-title text-xs">Improvements</div>
          <div className="stat-value text-lg text-info">
            {insights.filter((i) => i.type === "improvement").length}
          </div>
        </div>

        <div className="stat bg-warning/10 rounded-lg p-3">
          <div className="stat-title text-xs">Suggestions</div>
          <div className="stat-value text-lg text-warning">
            {insights.filter((i) => i.type === "suggestion").length}
          </div>
        </div>
      </div>

      {/* Motivational footer */}
      <div className="card bg-gradient-to-r from-primary/20 to-secondary/20 mt-6">
        <div className="card-body text-center p-4">
          <div className="flex items-center justify-center gap-2 text-lg font-semibold">
            <span>🌟</span>
            <span>Keep Growing!</span>
            <span>🌟</span>
          </div>
          <p className="text-sm text-base-content/70">
            Every chore completed is a step toward building great habits and
            achieving your goals!
          </p>
        </div>
      </div>
    </div>
  );
}
