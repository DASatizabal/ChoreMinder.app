"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface PerformanceMetrics {
  cacheStats: {
    size: number;
    hitRate: number;
    maxSize: number;
  };
  queryStats: {
    averageExecutionTime: number;
    slowQueries: Array<{
      query: string;
      executionTime: number;
      timestamp: string;
      collection: string;
      result_count?: number;
    }>;
    totalQueries: number;
    queriesByCollection: { [key: string]: number };
  };
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
}

interface DatabaseHealth {
  connectionStatus: string;
  responseTime: number;
  activeConnections: number;
  indexUsage: Array<{
    collection: string;
    indexes: any[];
  }>;
}

interface SystemMetrics {
  performance: PerformanceMetrics;
  database: DatabaseHealth;
  timestamp: string;
  uptime: number;
  nodeVersion: string;
  platform: string;
}

export default function PerformanceDashboard() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchMetrics();
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [session]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/performance/metrics");
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        console.error("Failed to fetch performance metrics");
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch("/api/performance/metrics", {
        method: "DELETE",
      });
      
      if (response.ok) {
        alert("Cache cleared successfully");
        fetchMetrics(); // Refresh metrics
      } else {
        alert("Failed to clear cache");
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      alert("Error clearing cache");
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getHealthColor = (status: string): string => {
    switch (status) {
      case "healthy": return "text-success";
      case "warning": return "text-warning";
      case "error": return "text-error";
      default: return "text-base-content";
    }
  };

  const getPerformanceScore = (): { score: number; status: string; color: string } => {
    if (!metrics) return { score: 0, status: "Unknown", color: "text-base-content" };

    let score = 100;
    
    // Deduct points for poor performance
    if (metrics.performance.queryStats.averageExecutionTime > 100) score -= 20;
    if (metrics.performance.cacheStats.hitRate < 50) score -= 15;
    if (metrics.database.responseTime > 100) score -= 15;
    if (metrics.performance.memoryUsage.heapUsed > 500 * 1024 * 1024) score -= 10; // 500MB
    if (metrics.performance.queryStats.slowQueries.length > 5) score -= 10;

    let status = "Excellent";
    let color = "text-success";

    if (score < 90) {
      status = "Good";
      color = "text-info";
    }
    if (score < 70) {
      status = "Fair";
      color = "text-warning";
    }
    if (score < 50) {
      status = "Poor";
      color = "text-error";
    }

    return { score: Math.max(0, score), status, color };
  };

  if (loading && !metrics) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body text-center">
          <h2 className="card-title justify-center">Performance Dashboard</h2>
          <p className="text-base-content/60">
            Unable to load performance metrics. Please try again.
          </p>
          <button className="btn btn-primary mt-4" onClick={fetchMetrics}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const performanceScore = getPerformanceScore();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content mb-2">
            ⚡ Performance Dashboard
          </h1>
          <p className="text-base-content/70">
            Monitor system performance and optimize database operations
          </p>
        </div>

        <div className="flex gap-3">
          <div className="form-control">
            <label className="label cursor-pointer gap-2">
              <span className="label-text">Auto-refresh</span>
              <input 
                type="checkbox" 
                className="toggle toggle-primary"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            </label>
          </div>
          
          <button 
            className="btn btn-outline"
            onClick={fetchMetrics}
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "🔄 Refresh"
            )}
          </button>

          <button 
            className="btn btn-warning"
            onClick={clearCache}
          >
            🗑️ Clear Cache
          </button>
        </div>
      </div>

      {/* Overall Performance Score */}
      <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 shadow-lg mb-8">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Overall Performance Score</h2>
              <p className="text-base-content/70">
                Last updated: {new Date(metrics.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-5xl font-bold ${performanceScore.color}`}>
                {performanceScore.score}
              </div>
              <div className={`text-lg ${performanceScore.color}`}>
                {performanceScore.status}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat bg-primary text-primary-content rounded-lg">
          <div className="stat-title text-primary-content/70">System Uptime</div>
          <div className="stat-value text-xl">{formatUptime(metrics.uptime)}</div>
          <div className="stat-desc text-primary-content/60">
            Node.js {metrics.nodeVersion}
          </div>
        </div>

        <div className={`stat bg-base-200 rounded-lg`}>
          <div className="stat-title">Database Health</div>
          <div className={`stat-value text-xl ${getHealthColor(metrics.database.connectionStatus)}`}>
            {metrics.database.connectionStatus}
          </div>
          <div className="stat-desc">
            Response: {metrics.database.responseTime}ms
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Cache Hit Rate</div>
          <div className="stat-value text-xl">
            {metrics.performance.cacheStats.hitRate.toFixed(1)}%
          </div>
          <div className="stat-desc">
            {metrics.performance.cacheStats.size}/{metrics.performance.cacheStats.maxSize} entries
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Avg Query Time</div>
          <div className="stat-value text-xl">
            {metrics.performance.queryStats.averageExecutionTime}ms
          </div>
          <div className="stat-desc">
            {metrics.performance.queryStats.totalQueries} total queries
          </div>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">💾 Memory Usage</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Heap Used</span>
                  <span>{formatBytes(metrics.performance.memoryUsage.heapUsed)}</span>
                </div>
                <progress 
                  className="progress progress-primary w-full" 
                  value={metrics.performance.memoryUsage.heapUsed}
                  max={metrics.performance.memoryUsage.heapTotal}
                ></progress>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>RSS (Resident Set Size)</span>
                  <span>{formatBytes(metrics.performance.memoryUsage.rss)}</span>
                </div>
                <progress 
                  className="progress progress-secondary w-full" 
                  value={metrics.performance.memoryUsage.rss}
                  max={metrics.performance.memoryUsage.rss * 1.5}
                ></progress>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>External</span>
                  <span>{formatBytes(metrics.performance.memoryUsage.external)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">📊 Query Statistics</h2>
            <div className="space-y-3">
              {Object.entries(metrics.performance.queryStats.queriesByCollection).map(([collection, count]) => (
                <div key={collection} className="flex justify-between items-center">
                  <span className="capitalize">{collection}</span>
                  <div className="badge badge-primary">{count}</div>
                </div>
              ))}
            </div>
            <div className="divider"></div>
            <div className="text-sm text-base-content/60">
              Total queries in current session: {metrics.performance.queryStats.totalQueries}
            </div>
          </div>
        </div>
      </div>

      {/* Slow Queries */}
      <div className="card bg-base-200 shadow-lg mb-8">
        <div className="card-body">
          <h2 className="card-title">🐌 Slow Queries (&gt;100ms)</h2>
          {metrics.performance.queryStats.slowQueries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Execution Time</th>
                    <th>Results</th>
                    <th>Timestamp</th>
                    <th>Query</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.performance.queryStats.slowQueries.map((query, index) => (
                    <tr key={index}>
                      <td>
                        <div className="badge badge-outline">{query.collection}</div>
                      </td>
                      <td>
                        <div className={`font-bold ${query.executionTime > 500 ? "text-error" : query.executionTime > 200 ? "text-warning" : "text-info"}`}>
                          {query.executionTime}ms
                        </div>
                      </td>
                      <td>{query.result_count || "N/A"}</td>
                      <td className="text-sm text-base-content/60">
                        {new Date(query.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <div className="max-w-xs truncate font-mono text-xs bg-base-100 p-2 rounded">
                          {query.query}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🚀</div>
              <p className="text-base-content/60">No slow queries detected! Great performance!</p>
            </div>
          )}
        </div>
      </div>

      {/* Database Indexes */}
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">📑 Database Index Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.database.indexUsage.map((collection) => (
              <div key={collection.collection} className="bg-base-100 p-4 rounded-lg">
                <h3 className="font-bold capitalize mb-2">{collection.collection}</h3>
                <div className="space-y-2">
                  {collection.indexes.map((index, i) => (
                    <div key={i} className="text-sm">
                      <div className="font-medium">{index.name}</div>
                      <div className="text-base-content/60 text-xs">
                        Accesses: {index.accesses?.ops || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="card bg-gradient-to-r from-info/10 to-success/10 shadow-lg mt-8">
        <div className="card-body">
          <h2 className="card-title">💡 Performance Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold">Database Optimization</h3>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Use indexes for frequently queried fields</li>
                <li>Limit query results with pagination</li>
                <li>Use lean() for read-only operations</li>
                <li>Avoid deep population chains</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold">Caching Strategy</h3>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Cache frequently accessed data</li>
                <li>Set appropriate TTL values</li>
                <li>Use cache tags for selective invalidation</li>
                <li>Monitor cache hit rates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}