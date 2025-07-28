"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface EmailLog {
  id: string;
  timestamp: string;
  type: string;
  to: string;
  subject: string;
  details: any;
  success: boolean;
}

interface EmailStats {
  totalEmails: number;
  invitations: number;
  notifications: number;
  successful: number;
  failed: number;
}

export default function EmailLogsPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    totalEmails: 0,
    invitations: 0,
    notifications: 0,
    successful: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchEmailLogs();
  }, [filter]);

  const fetchEmailLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.append("type", filter);
      }
      
      const response = await fetch(`/api/email-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch email logs");
      
      const data = await response.json();
      setLogs(data.logs);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      toast.error("Failed to fetch email logs");
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm("Are you sure you want to clear all email logs?")) return;
    
    try {
      const response = await fetch("/api/email-logs", { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to clear logs");
      
      toast.success("Email logs cleared successfully");
      await fetchEmailLogs();
    } catch (error) {
      console.error("Error clearing logs:", error);
      toast.error("Failed to clear email logs");
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "invitation": return "badge-primary";
      case "notification": return "badge-secondary";
      case "reminder": return "badge-warning";
      default: return "badge-neutral";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">📧 Email Logs</h1>
            <button onClick={clearLogs} className="btn btn-error btn-sm">
              Clear All Logs
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">Total Emails</div>
              <div className="stat-value text-primary">{stats.totalEmails}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">Invitations</div>
              <div className="stat-value text-secondary">{stats.invitations}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">Notifications</div>
              <div className="stat-value text-accent">{stats.notifications}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">Successful</div>
              <div className="stat-value text-success">{stats.successful}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">Failed</div>
              <div className="stat-value text-error">{stats.failed}</div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter("all")}
              className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-outline"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("invitation")}
              className={`btn btn-sm ${filter === "invitation" ? "btn-primary" : "btn-outline"}`}
            >
              Invitations
            </button>
            <button
              onClick={() => setFilter("notification")}
              className={`btn btn-sm ${filter === "notification" ? "btn-primary" : "btn-outline"}`}
            >
              Notifications
            </button>
          </div>

          {/* Email Logs Table */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h2 className="card-title mb-4">Recent Email Activity</h2>
              
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-lg">No email logs found</p>
                  <p className="text-sm text-base-content/70">
                    Email logs will appear here when invitations are sent
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Type</th>
                        <th>To</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td className="text-sm">
                            {formatDate(log.timestamp)}
                          </td>
                          <td>
                            <div className={`badge ${getTypeColor(log.type)} badge-sm`}>
                              {log.type}
                            </div>
                          </td>
                          <td className="font-mono text-sm">{log.to}</td>
                          <td className="max-w-xs truncate">{log.subject}</td>
                          <td>
                            <div className={`badge ${log.success ? "badge-success" : "badge-error"} badge-sm`}>
                              {log.success ? "✓ Sent" : "✗ Failed"}
                            </div>
                          </td>
                          <td>
                            <details className="dropdown">
                              <summary className="btn btn-xs">View</summary>
                              <div className="dropdown-content z-[1] p-4 shadow bg-base-100 rounded-box w-96 max-h-60 overflow-auto">
                                <pre className="text-xs">{JSON.stringify(log.details, null, 2)}</pre>
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="alert alert-info mt-6">
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
            <div>
              <h3 className="font-bold">Email Logging Information:</h3>
              <div className="text-sm">
                • All email activity is logged here for debugging and monitoring<br/>
                • Logs are stored in memory and will reset when the server restarts<br/>
                • In production, these would be stored in a database<br/>
                • View details to see full invitation codes and links
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}