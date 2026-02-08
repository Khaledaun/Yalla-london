"use client";

/**
 * Autopilot Control Panel
 *
 * Configure and manage automated content generation, SEO optimization,
 * social media posting, and email campaigns.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Play,
  Pause,
  Settings,
  Clock,
  Zap,
  FileText,
  Share2,
  Mail,
  Search,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Eye,
  Activity,
  Target,
  Globe,
} from "lucide-react";

interface AutopilotTask {
  id: string;
  name: string;
  type: "content" | "seo" | "social" | "email" | "analytics";
  status: "running" | "paused" | "scheduled" | "error";
  schedule: string;
  lastRun: string | null;
  nextRun: string | null;
  sites: string[];
  config: Record<string, any>;
  stats: {
    totalRuns: number;
    successRate: number;
    itemsProcessed: number;
  };
}

interface AutopilotLog {
  id: string;
  taskId: string;
  taskName: string;
  type: string;
  status: "success" | "error" | "warning";
  message: string;
  timestamp: string;
  details?: string;
}

const TASK_TYPES = [
  {
    id: "content",
    name: "Content Generation",
    icon: FileText,
    color: "purple",
    description: "Auto-generate articles using AI",
  },
  {
    id: "seo",
    name: "SEO Optimization",
    icon: Search,
    color: "green",
    description: "Optimize meta tags and content",
  },
  {
    id: "social",
    name: "Social Media",
    icon: Share2,
    color: "blue",
    description: "Auto-post to social platforms",
  },
  {
    id: "email",
    name: "Email Campaigns",
    icon: Mail,
    color: "amber",
    description: "Automated newsletter sending",
  },
  {
    id: "analytics",
    name: "Analytics Reports",
    icon: TrendingUp,
    color: "indigo",
    description: "Weekly performance reports",
  },
];

export default function AutopilotPage() {
  const [tasks, setTasks] = useState<AutopilotTask[]>([]);
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<"running" | "paused">(
    "running",
  );

  useEffect(() => {
    loadAutopilotData();
  }, []);

  const loadAutopilotData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, logsRes] = await Promise.all([
        fetch("/api/admin/command-center/autopilot/tasks"),
        fetch("/api/admin/command-center/autopilot/logs"),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      } else {
        setTasks([]);
      }

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      } else {
        setLogs([]);
      }
    } catch (error) {
      setTasks([]);
      setLogs([]);
    }
    setIsLoading(false);
  };

  const toggleTaskStatus = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === "running" ? "paused" : "running",
            }
          : task,
      ),
    );
  };

  const toggleGlobalStatus = () => {
    setGlobalStatus((prev) => (prev === "running" ? "paused" : "running"));
    setTasks((prev) =>
      prev.map((task) => ({
        ...task,
        status:
          globalStatus === "running"
            ? "paused"
            : task.status === "paused"
              ? "running"
              : task.status,
      })),
    );
  };

  const runningTasks = tasks.filter((t) => t.status === "running").length;
  const totalItemsProcessed = tasks.reduce(
    (sum, t) => sum + t.stats.itemsProcessed,
    0,
  );
  const avgSuccessRate = tasks.length
    ? tasks.reduce((sum, t) => sum + t.stats.successRate, 0) / tasks.length
    : 0;

  const getTaskIcon = (type: string) => {
    const taskType = TASK_TYPES.find((t) => t.id === type);
    return taskType?.icon || Bot;
  };

  const getTaskColor = (type: string) => {
    const colors: Record<string, string> = {
      content: "purple",
      seo: "green",
      social: "blue",
      email: "amber",
      analytics: "indigo",
    };
    return colors[type] || "gray";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/command-center"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-semibold text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  Autopilot Control
                </h1>
                <p className="text-sm text-gray-500">
                  Manage automated tasks across all sites
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Global Status Toggle */}
              <button
                onClick={toggleGlobalStatus}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  globalStatus === "running"
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                }`}
              >
                {globalStatus === "running" ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Autopilot Active
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Autopilot Paused
                  </>
                )}
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Active Tasks</span>
              <Activity className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold">
              {runningTasks} / {tasks.length}
            </div>
            <div className="text-sm text-green-600">Running</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Items Processed</span>
              <CheckCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">
              {totalItemsProcessed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">This month</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Success Rate</span>
              <Target className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">
              {avgSuccessRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Average</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Next Task</span>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-lg font-bold">In 2 hours</div>
            <div className="text-sm text-gray-500">Content Generation</div>
          </div>
        </div>

        {/* Task Cards */}
        <h2 className="font-semibold text-lg mb-4">Automated Tasks</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
              >
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-16 bg-gray-200 rounded mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-12 mb-8">
            <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No automated tasks yet
            </h3>
            <p className="text-gray-500 mb-4">
              Configure your first autopilot task to automate content and SEO
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {tasks.map((task) => {
              const TaskIcon = getTaskIcon(task.type);
              const color = getTaskColor(task.type);

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-100`}
                        >
                          <TaskIcon className={`h-5 w-5 text-${color}-600`} />
                        </div>
                        <div>
                          <h3 className="font-medium">{task.name}</h3>
                          <p className="text-sm text-gray-500">
                            {task.schedule}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className={`p-2 rounded-lg ${
                          task.status === "running"
                            ? "bg-green-100 text-green-600 hover:bg-green-200"
                            : task.status === "paused"
                              ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                              : task.status === "error"
                                ? "bg-red-100 text-red-600"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {task.status === "running" ? (
                          <Play className="h-4 w-4" />
                        ) : task.status === "error" ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Sites */}
                    <div className="flex items-center gap-1 mb-3">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {task.sites.length === 0
                          ? "All sites"
                          : task.sites.join(", ")}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-lg p-2">
                      <div>
                        <div className="text-sm font-medium">
                          {task.stats.totalRuns}
                        </div>
                        <div className="text-xs text-gray-500">Runs</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {task.stats.successRate}%
                        </div>
                        <div className="text-xs text-gray-500">Success</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {task.stats.itemsProcessed}
                        </div>
                        <div className="text-xs text-gray-500">Items</div>
                      </div>
                    </div>

                    {/* Timing */}
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div className="text-gray-500">
                        {task.lastRun ? `Last: ${task.lastRun}` : "Never run"}
                      </div>
                      <div className="text-blue-600">
                        {task.nextRun
                          ? `Next: ${task.nextRun}`
                          : "Not scheduled"}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-100 px-4 py-2 flex justify-between">
                    <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      View Logs
                    </button>
                    <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <Settings className="h-4 w-4" />
                      Configure
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Activity Log */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold">Recent Activity</h2>
            <button
              onClick={loadAutopilotData}
              className="text-gray-500 hover:text-gray-700"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No activity logs yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Logs will appear here once autopilot tasks start running
                </p>
              </div>
            ) : (
              logs.slice(0, 10).map((log) => (
                <div key={log.id} className="p-4 flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      log.status === "success"
                        ? "bg-green-100"
                        : log.status === "error"
                          ? "bg-red-100"
                          : "bg-yellow-100"
                    }`}
                  >
                    {log.status === "success" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : log.status === "error" ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.taskName}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          log.status === "success"
                            ? "bg-green-100 text-green-700"
                            : log.status === "error"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{log.message}</p>
                    {log.details && (
                      <p className="text-xs text-gray-400 mt-1">
                        {log.details}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">{log.timestamp}</div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-100 text-center">
            <Link
              href="/admin/command-center/autopilot/logs"
              className="text-blue-600 text-sm hover:underline"
            >
              View All Logs
            </Link>
          </div>
        </div>

        {/* Quick Setup Guide */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-3">
            Autopilot Quick Start Guide
          </h3>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-medium flex-shrink-0">
                1
              </div>
              <p className="text-blue-700">
                Configure your AI API keys in Settings
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-medium flex-shrink-0">
                2
              </div>
              <p className="text-blue-700">Set up content generation prompts</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-medium flex-shrink-0">
                3
              </div>
              <p className="text-blue-700">Connect social media accounts</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-medium flex-shrink-0">
                4
              </div>
              <p className="text-blue-700">Enable autopilot and let it run!</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
