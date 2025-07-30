"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useEffect, useRef } from "react";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface TimeSeriesData {
  date: string;
  completed: number;
  points: number;
  streakDays: number;
}

interface ProgressChartProps {
  data: TimeSeriesData[];
  type: "line" | "bar";
  metric: "completed" | "points";
  title: string;
  color?: string;
  showTrend?: boolean;
}

export default function ProgressChart({
  data,
  type = "line",
  metric = "completed",
  title,
  color = "#3B82F6",
  showTrend = true,
}: ProgressChartProps) {
  const chartRef = useRef<ChartJS>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const chartData = {
    labels: data.map((d) => formatDate(d.date)),
    datasets: [
      {
        label: metric === "completed" ? "Chores Completed" : "Points Earned",
        data: data.map((d) => d[metric]),
        borderColor: color,
        backgroundColor:
          type === "line"
            ? `${color}20` // Semi-transparent for area fill
            : color,
        borderWidth: 2,
        fill: type === "line" && showTrend,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend since we have a title
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: "bold" as const,
        },
        color: "#374151",
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: "#1F2937",
        titleColor: "#F3F4F6",
        bodyColor: "#F3F4F6",
        borderColor: color,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            const dataIndex = context[0].dataIndex;
            return formatDate(data[dataIndex].date);
          },
          label: (context: any) => {
            const value = context.parsed.y;
            const label = metric === "completed" ? "chores" : "points";
            return `${value} ${label}`;
          },
          afterLabel: (context: any) => {
            const dataIndex = context.dataIndex;
            const item = data[dataIndex];
            if (metric === "completed" && item.points > 0) {
              return `${item.points} points earned`;
            }
            if (metric === "points" && item.completed > 0) {
              return `${item.completed} chores completed`;
            }
            return "";
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#6B7280",
          font: {
            size: 12,
          },
          maxTicksLimit: 7, // Prevent overcrowding
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#F3F4F6",
          borderDash: [2, 2],
        },
        ticks: {
          color: "#6B7280",
          font: {
            size: 12,
          },
          stepSize: 1,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
    elements: {
      point: {
        hoverBorderWidth: 3,
      },
    },
    animation: {
      duration: 1000,
      easing: "easeInOutQuart" as const,
    },
  };

  // Calculate trend line if enabled
  const trendData =
    showTrend && type === "line" ? calculateTrend(data, metric) : null;

  if (trendData) {
    chartData.datasets.push({
      label: "Trend",
      data: trendData,
      borderColor: "#EF4444",
      backgroundColor: "transparent",
      borderWidth: 2,
      // borderDash: [5, 5], // Removed due to type issues
      fill: false,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointBackgroundColor: "#EF4444",
      pointBorderColor: "#EF4444",
      pointBorderWidth: 2,
    });
  }

  return (
    <div className="w-full h-64 relative">
      {type === "line" ? (
        <Line data={chartData} options={options} />
      ) : (
        <Bar data={chartData} options={options} />
      )}
    </div>
  );
}

// Calculate linear trend line
function calculateTrend(
  data: TimeSeriesData[],
  metric: "completed" | "points",
): number[] {
  if (data.length < 2) return [];

  const values = data.map((d) => d[metric]);
  const n = values.length;
  const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ...
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, index) => sum + index * val, 0);
  const sumXX = ((n - 1) * n * (2 * n - 1)) / 6; // Sum of squares

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return data.map((_, index) => slope * index + intercept);
}
