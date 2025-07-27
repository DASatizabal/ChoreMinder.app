import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/libs/mongoose";
import { getAnalyticsService } from "@/libs/analytics";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeRange = (searchParams.get("timeRange") as "week" | "month" | "quarter" | "year") || "month";
    const format = searchParams.get("format") || "json";

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user?.familyId) {
      return NextResponse.json({ error: "User not in a family" }, { status: 400 });
    }

    // Verify user is parent or admin
    if (!["parent", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Only parents can export family reports" }, { status: 403 });
    }

    const analyticsService = getAnalyticsService();

    // Export family report
    const reportData = await analyticsService.exportFamilyReport(user.familyId.toString(), timeRange);

    if (format === "json") {
      return NextResponse.json(reportData);
    }

    if (format === "csv") {
      const csv = generateCSVReport(reportData);
      
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="family-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (format === "summary") {
      const summary = generateSummaryReport(reportData);
      
      return new NextResponse(summary, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="family-summary-${timeRange}-${new Date().toISOString().split('T')[0]}.txt"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format. Use 'json', 'csv', or 'summary'" }, { status: 400 });
  } catch (error: any) {
    console.error("Export analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

function generateCSVReport(reportData: any): string {
  const lines = [];
  
  // Header
  lines.push("Family Progress Report");
  lines.push(`Generated: ${reportData.generatedAt}`);
  lines.push(`Period: ${reportData.summary.timeRange}`);
  lines.push("");

  // Family Overview
  lines.push("Family Overview");
  lines.push("Metric,Value");
  lines.push(`Total Chores,${reportData.summary.overview.totalFamilyChores}`);
  lines.push(`Total Points,${reportData.summary.overview.totalFamilyPoints}`);
  lines.push(`Average Completion Rate,${reportData.summary.overview.averageCompletionRate}%`);
  lines.push(`Active Children,${reportData.summary.overview.activeChildren}`);
  lines.push(`This Week Improvement,${reportData.summary.overview.thisWeekImprovement}%`);
  lines.push("");

  // Member Progress
  lines.push("Member Progress");
  lines.push("Name,Completion Rate,Total Points,Level,Streak,This Week Chores,Trend");
  
  reportData.memberData.forEach((member: any) => {
    lines.push(`${member.name},${member.completionRate}%,${member.totalPoints},${member.level},${member.streak},${member.thisWeekChores},${member.trend}`);
  });

  lines.push("");

  // Chart Data (simplified)
  lines.push("Daily Progress Summary");
  lines.push("Date,Total Completed,Total Points");
  
  if (reportData.chartData.length > 0) {
    const combinedData = new Map();
    
    reportData.chartData.forEach((memberChart: any) => {
      memberChart.timeSeriesData.forEach((day: any) => {
        const existing = combinedData.get(day.date) || { completed: 0, points: 0 };
        combinedData.set(day.date, {
          completed: existing.completed + day.completed,
          points: existing.points + day.points,
        });
      });
    });

    Array.from(combinedData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        lines.push(`${date},${data.completed},${data.points}`);
      });
  }

  return lines.join("\n");
}

function generateSummaryReport(reportData: any): string {
  const lines = [];
  
  lines.push("🏠 FAMILY PROGRESS REPORT");
  lines.push("=" .repeat(50));
  lines.push(`📅 Period: ${reportData.summary.timeRange.toUpperCase()}`);
  lines.push(`📊 Generated: ${new Date(reportData.generatedAt).toLocaleDateString()}`);
  lines.push("");

  // Family Overview
  lines.push("📈 FAMILY OVERVIEW");
  lines.push("-".repeat(30));
  lines.push(`📋 Total Chores: ${reportData.summary.overview.totalFamilyChores}`);
  lines.push(`⭐ Total Points: ${reportData.summary.overview.totalFamilyPoints}`);
  lines.push(`✅ Average Completion: ${reportData.summary.overview.averageCompletionRate}%`);
  lines.push(`👶 Active Children: ${reportData.summary.overview.activeChildren}`);
  lines.push(`📊 Weekly Improvement: ${reportData.summary.overview.thisWeekImprovement > 0 ? '+' : ''}${reportData.summary.overview.thisWeekImprovement}%`);
  lines.push("");

  // Top Insights
  lines.push("🏆 FAMILY HIGHLIGHTS");
  lines.push("-".repeat(30));
  lines.push(`🥇 Top Performer: ${reportData.summary.topInsights.topPerformer}`);
  lines.push(`📈 Most Improved: ${reportData.summary.topInsights.mostImproved}`);
  lines.push(`🔥 Consistency Champion: ${reportData.summary.topInsights.consistencyChampion}`);
  lines.push("");

  // Member Progress
  lines.push("👨‍👩‍👧‍👦 INDIVIDUAL PROGRESS");
  lines.push("-".repeat(30));
  
  reportData.memberData.forEach((member: any) => {
    lines.push(`${member.name}:`);
    lines.push(`  ✅ Completion Rate: ${member.completionRate}%`);
    lines.push(`  ⭐ Total Points: ${member.totalPoints}`);
    lines.push(`  🎖️ Level: ${member.level}`);
    lines.push(`  🔥 Streak: ${member.streak} days`);
    lines.push(`  📊 This Week: ${member.thisWeekChores} chores`);
    lines.push(`  📈 Trend: ${member.trend.toUpperCase()}`);
    lines.push("");
  });

  // Suggestions
  lines.push("💡 SUGGESTIONS");
  lines.push("-".repeat(30));
  reportData.summary.topInsights.suggestions.forEach((suggestion: string, index: number) => {
    lines.push(`${index + 1}. ${suggestion}`);
  });
  lines.push("");

  // Positive encouragement
  lines.push("🌟 KEEP UP THE GREAT WORK! 🌟");
  lines.push("Every chore completed is a step toward building");
  lines.push("responsibility, teamwork, and family success!");

  return lines.join("\n");
}