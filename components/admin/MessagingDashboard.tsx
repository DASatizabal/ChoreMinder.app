"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface MessagingStats {
  services: {
    whatsapp: { configured: boolean; available: boolean; fromNumber: string };
    sms: { configured: boolean; available: boolean; fromNumber: string };
    email: { configured: boolean; available: boolean };
  };
  delivery: {
    timeRange: string;
    stats: {
      total: number;
      successful: number;
      failed: number;
      byChannel: {
        whatsapp: number;
        sms: number;
        email: number;
      };
      avgAttempts: number;
    };
  };
  scheduler: {
    stats: {
      scheduledMessages: {
        total: number;
        pending: number;
        sent: number;
        failed: number;
        cancelled: number;
      };
      recurringRules: {
        total: number;
        enabled: number;
        disabled: number;
      };
      throttles: {
        active: number;
        byChannel: {
          whatsapp: number;
          sms: number;
          email: number;
        };
      };
    };
    upcoming: any[];
  };
  system: {
    queueSize: number;
    rateLimiters: number;
    deliveryTracking: number;
    uptime: number;
  };
}

interface TestResult {
  success: boolean;
  channel: string;
  error?: string;
  message: string;
}

const MessagingDashboard = () => {
  const [stats, setStats] = useState<MessagingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testChannel, setTestChannel] = useState<"whatsapp" | "sms" | "email">(
    "whatsapp",
  );
  const [testing, setTesting] = useState(false);
  const [timeRange, setTimeRange] = useState<"hour" | "day" | "week">("day");

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `/api/messaging/status?timeRange=${timeRange}`,
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch messaging stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    if (!testPhone.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch("/api/messaging/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: testChannel,
          message: `Test message from ChoreMinder at ${new Date().toLocaleString()}`,
        }),
      });

      const result: TestResult = await response.json();

      if (result.success) {
        toast.success(`Test ${testChannel.toUpperCase()} sent successfully!`);
      } else {
        toast.error(`Test failed: ${result.error}`);
      }
    } catch (error) {
      toast.error("Failed to send test message");
    } finally {
      setTesting(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card bg-error text-error-content">
        <div className="card-body">
          <h2 className="card-title">Error Loading Stats</h2>
          <p>Unable to load messaging statistics. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messaging Dashboard</h1>
          <p className="text-gray-600">
            Monitor and manage unified messaging system
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select
            className="select select-bordered"
            value={timeRange}
            onChange={(e) =>
              setTimeRange(e.target.value as "hour" | "day" | "week")
            }
          >
            <option value="hour">Last Hour</option>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
          </select>

          <button
            onClick={fetchStats}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "🔄"
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(stats.services).map(([service, config]) => (
          <motion.div
            key={service}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card shadow-lg ${
              config.available
                ? "bg-success text-success-content"
                : "bg-warning text-warning-content"
            }`}
          >
            <div className="card-body">
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {service === "whatsapp"
                    ? "💬"
                    : service === "sms"
                      ? "📱"
                      : "📧"}
                </div>
                <div>
                  <h3 className="font-bold capitalize">{service}</h3>
                  <p className="text-sm opacity-75">
                    {config.available ? "Available" : "Not Configured"}
                  </p>
                </div>
              </div>

              {"fromNumber" in config && config.fromNumber && (
                <div className="text-xs opacity-75 mt-2">
                  From: {config.fromNumber}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delivery Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-white shadow-lg"
        >
          <div className="card-body">
            <h2 className="card-title">Delivery Statistics</h2>
            <p className="text-sm text-gray-600 mb-4">
              {timeRange === "hour"
                ? "Last Hour"
                : timeRange === "day"
                  ? "Last 24 Hours"
                  : "Last Week"}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="stat">
                <div className="stat-title">Total Messages</div>
                <div className="stat-value text-primary">
                  {stats.delivery.stats.total}
                </div>
              </div>

              <div className="stat">
                <div className="stat-title">Success Rate</div>
                <div className="stat-value text-success">
                  {stats.delivery.stats.total > 0
                    ? Math.round(
                        (stats.delivery.stats.successful /
                          stats.delivery.stats.total) *
                          100,
                      )
                    : 0}
                  %
                </div>
              </div>

              <div className="stat">
                <div className="stat-title">Failed</div>
                <div className="stat-value text-error">
                  {stats.delivery.stats.failed}
                </div>
              </div>

              <div className="stat">
                <div className="stat-title">Avg Attempts</div>
                <div className="stat-value">
                  {stats.delivery.stats.avgAttempts.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Channel Breakdown */}
            <div className="mt-4">
              <h3 className="font-semibold mb-2">By Channel</h3>
              <div className="space-y-2">
                {Object.entries(stats.delivery.stats.byChannel).map(
                  ([channel, count]) => (
                    <div key={channel} className="flex justify-between">
                      <span className="capitalize">{channel}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scheduler Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-white shadow-lg"
        >
          <div className="card-body">
            <h2 className="card-title">Scheduler Status</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Scheduled Messages</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Pending: {stats.scheduler.stats.scheduledMessages.pending}
                  </div>
                  <div>
                    Sent: {stats.scheduler.stats.scheduledMessages.sent}
                  </div>
                  <div>
                    Failed: {stats.scheduler.stats.scheduledMessages.failed}
                  </div>
                  <div>
                    Cancelled:{" "}
                    {stats.scheduler.stats.scheduledMessages.cancelled}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Recurring Rules</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Active: {stats.scheduler.stats.recurringRules.enabled}
                  </div>
                  <div>
                    Disabled: {stats.scheduler.stats.recurringRules.disabled}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Rate Limiting</h3>
                <div className="text-sm">
                  Active Throttles: {stats.scheduler.stats.throttles.active}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card bg-white shadow-lg"
      >
        <div className="card-body">
          <h2 className="card-title">System Status</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat">
              <div className="stat-title">Queue Size</div>
              <div className="stat-value text-sm">{stats.system.queueSize}</div>
            </div>

            <div className="stat">
              <div className="stat-title">Rate Limiters</div>
              <div className="stat-value text-sm">
                {stats.system.rateLimiters}
              </div>
            </div>

            <div className="stat">
              <div className="stat-title">Tracking Records</div>
              <div className="stat-value text-sm">
                {stats.system.deliveryTracking}
              </div>
            </div>

            <div className="stat">
              <div className="stat-title">Uptime</div>
              <div className="stat-value text-sm">
                {formatUptime(stats.system.uptime)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Test Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card bg-white shadow-lg"
      >
        <div className="card-body">
          <h2 className="card-title">Test Messaging</h2>
          <p className="text-gray-600 mb-4">
            Send a test message to verify your messaging setup
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Phone Number</span>
              </label>
              <input
                type="tel"
                placeholder="+1234567890"
                className="input input-bordered"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Channel</span>
              </label>
              <select
                className="select select-bordered"
                value={testChannel}
                onChange={(e) =>
                  setTestChannel(e.target.value as "whatsapp" | "sms" | "email")
                }
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">&nbsp;</span>
              </label>
              <button
                onClick={runTest}
                className="btn btn-primary"
                disabled={testing || !testPhone.trim()}
              >
                {testing ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Sending...
                  </>
                ) : (
                  "Send Test"
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Upcoming Messages */}
      {stats.scheduler.upcoming.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card bg-white shadow-lg"
        >
          <div className="card-body">
            <h2 className="card-title">Upcoming Messages</h2>

            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>User</th>
                    <th>Scheduled</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.scheduler.upcoming.slice(0, 5).map((message) => (
                    <tr key={message.id}>
                      <td className="capitalize">{message.type}</td>
                      <td>{message.userId}</td>
                      <td>{new Date(message.scheduleAt).toLocaleString()}</td>
                      <td>
                        {message.attempts}/{message.maxAttempts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MessagingDashboard;
