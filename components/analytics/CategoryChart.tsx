"use client";

import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface CategoryInsights {
  category: string;
  totalChores: number;
  completedChores: number;
  completionRate: number;
  averagePoints: number;
  favoriteDay: string;
  improvementSuggestion: string;
}

interface CategoryChartProps {
  data: CategoryInsights[];
  type: "doughnut" | "bar";
  metric: "completionRate" | "totalChores" | "averagePoints";
  title: string;
}

const CATEGORY_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#84CC16", // Lime
  "#EC4899", // Pink
  "#6B7280", // Gray
];

export default function CategoryChart({
  data,
  type = "doughnut",
  metric = "completionRate",
  title,
}: CategoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-base-200 rounded-lg">
        <div className="text-center">
          <p className="text-base-content/60">No category data available</p>
          <p className="text-sm text-base-content/40">
            Complete more chores to see insights
          </p>
        </div>
      </div>
    );
  }

  const getMetricLabel = () => {
    switch (metric) {
      case "completionRate":
        return "Completion Rate (%)";
      case "totalChores":
        return "Total Chores";
      case "averagePoints":
        return "Average Points";
      default:
        return "Value";
    }
  };

  const getMetricValue = (item: CategoryInsights) => {
    switch (metric) {
      case "completionRate":
        return item.completionRate;
      case "totalChores":
        return item.totalChores;
      case "averagePoints":
        return item.averagePoints;
      default:
        return 0;
    }
  };

  const chartData = {
    labels: data.map((d) => d.category || "Uncategorized"),
    datasets: [
      {
        label: getMetricLabel(),
        data: data.map(getMetricValue),
        backgroundColor: CATEGORY_COLORS.slice(0, data.length),
        borderColor: CATEGORY_COLORS.slice(0, data.length).map(
          (color) => `${color}CC`,
        ),
        borderWidth: 2,
        borderRadius: type === "bar" ? 4 : 0,
        ...(type === "bar" && { borderSkipped: "bottom" as const }),
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
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
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 15,
          font: {
            size: 12,
          },
          color: "#374151",
        },
      },
      tooltip: {
        backgroundColor: "#1F2937",
        titleColor: "#F3F4F6",
        bodyColor: "#F3F4F6",
        borderColor: "#4B5563",
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const categoryData = data[context.dataIndex];
            const value = context.parsed;

            const lines = [
              `${getMetricLabel()}: ${value}${metric === "completionRate" ? "%" : ""}`,
              `Total Chores: ${categoryData.totalChores}`,
              `Completed: ${categoryData.completedChores}`,
            ];

            if (categoryData.favoriteDay !== "No pattern") {
              lines.push(`Favorite Day: ${categoryData.favoriteDay}`);
            }

            return lines;
          },
        },
      },
    },
    cutout: "60%",
    radius: "90%",
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
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
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1F2937",
        titleColor: "#F3F4F6",
        bodyColor: "#F3F4F6",
        borderColor: "#4B5563",
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const categoryData = data[context.dataIndex];
            const value = context.parsed.y;

            return [
              `${getMetricLabel()}: ${value}${metric === "completionRate" ? "%" : ""}`,
              `Completion Rate: ${categoryData.completionRate}%`,
              `${categoryData.completedChores}/${categoryData.totalChores} completed`,
            ];
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
          maxRotation: 45,
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
        },
      },
    },
    animation: {
      duration: 1000,
      easing: "easeInOutQuart" as const,
    },
  };

  return (
    <div className="w-full">
      <div className="h-64 relative mb-4">
        {type === "doughnut" ? (
          <Doughnut data={chartData} options={doughnutOptions} />
        ) : (
          <Bar data={chartData} options={barOptions} />
        )}
      </div>

      {/* Category insights table */}
      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr>
              <th>Category</th>
              <th>Progress</th>
              <th>Rate</th>
              <th>Favorite Day</th>
              <th>Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {data.map((category, index) => (
              <tr key={category.category} className="hover">
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[index] }}
                    ></div>
                    <span className="font-medium">{category.category}</span>
                  </div>
                </td>
                <td>
                  <div className="text-sm">
                    {category.completedChores}/{category.totalChores}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-base-300 rounded-full h-2 max-w-[60px]">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.min(category.completionRate, 100)}%`,
                          backgroundColor: CATEGORY_COLORS[index],
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {category.completionRate}%
                    </span>
                  </div>
                </td>
                <td>
                  <span className="text-sm">{category.favoriteDay}</span>
                </td>
                <td>
                  <div className="text-xs text-base-content/70 max-w-[200px]">
                    {category.improvementSuggestion}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
