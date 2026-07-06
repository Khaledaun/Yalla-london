"use client";

import React, { useState, useEffect } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminKPICard,
  AdminSectionLabel,
  AdminTabs,
} from "@/components/admin/admin-ui";
import {
  Bot,
  Calendar,
  Clock,
  Play,
  Pause,
  Settings,
  Activity,
  CheckCircle2,
  Plus,
  Edit,
  FileText,
  Search,
  Upload,
  Database,
  Globe,
  Trash2,
} from "lucide-react";

interface AutomationJob {
  id: string;
  name: string;
  type:
    | "content-generation"
    | "seo-audit"
    | "publishing"
    | "backup"
    | "sync"
    | "cleanup";
  description: string;
  schedule: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  status: "idle" | "running" | "completed" | "failed";
  successCount: number;
  failureCount: number;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

interface PublishingSchedule {
  id: string;
  name: string;
  contentType: string;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  days?: string[];
  isActive: boolean;
  nextPublish?: string;
  articlesQueue: number;
  lastPublished?: string;
}

export default function AutomationHubPage() {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [schedules, setSchedules] = useState<PublishingSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"jobs" | "schedules">("jobs");
  const [selectedJobType, setSelectedJobType] = useState("all");
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);

  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/automation-hub");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setSchedules(data.schedules || []);
      } else {
        setJobs([]);
        setSchedules([]);
      }
    } catch {
      setJobs([]);
      setSchedules([]);
    }
    setIsLoading(false);
  };

  const jobTypeIcons: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
    "content-generation": FileText,
    "seo-audit": Search,
    publishing: Upload,
    backup: Database,
    sync: Globe,
    cleanup: Trash2,
  };

  const filteredJobs =
    selectedJobType === "all"
      ? jobs
      : jobs.filter((job) => job.type === selectedJobType);

  const handleToggleJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, isActive: !job.isActive } : job,
      ),
    );
  };

  const handleRunJob = async (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: "running" as const,
              lastRun: new Date().toISOString(),
            }
          : job,
      ),
    );

    try {
      const startTime = Date.now();
      const res = await fetch("/api/admin/automation-hub/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const elapsed = Math.round((Date.now() - startTime) / 1000);

      if (res.ok) {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "completed" as const,
                  successCount: job.successCount + 1,
                  duration: elapsed,
                }
              : job,
          ),
        );
      } else {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "failed" as const,
                  failureCount: job.failureCount + 1,
                  duration: elapsed,
                }
              : job,
          ),
        );
      }
    } catch {
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status: "failed" as const,
                failureCount: job.failureCount + 1,
              }
            : job,
        ),
      );
    }
  };

  const handleToggleSchedule = (scheduleId: string) => {
    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.id === scheduleId
          ? { ...schedule, isActive: !schedule.isActive }
          : schedule,
      ),
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatSchedule = (schedule: string) => {
    const parts = schedule.split(" ");
    if (parts.length === 5) {
      const [minute, hour, , , weekday] = parts;
      if (minute === "0" && hour !== "*") {
        return `Daily at ${hour}:00`;
      }
      if (weekday !== "*") {
        return `Weekly on ${weekday === "0" ? "Sunday" : "Day " + weekday} at ${hour}:${minute}`;
      }
    }
    return schedule;
  };

  const successRate = Math.round(
    (jobs.reduce((acc, j) => acc + j.successCount, 0) /
      (jobs.reduce((acc, j) => acc + j.successCount + j.failureCount, 0) || 1)) *
      100,
  );

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Automation Hub"
        subtitle="Automated jobs and publishing schedules"
        action={
          <div className="flex gap-2">
            <AdminButton variant="secondary" onClick={() => setIsCreatingSchedule(true)}>
              <Calendar size={13} /> Schedule
            </AdminButton>
            <AdminButton variant="primary" onClick={() => setIsCreatingJob(true)}>
              <Plus size={14} /> New Job
            </AdminButton>
          </div>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AdminKPICard
          value={jobs.filter((j) => j.isActive).length}
          label="Active Jobs"
          color="#3B7EA1"
        />
        <AdminKPICard
          value={jobs.filter((j) => j.status === "running").length}
          label="Running Now"
          color="#7C3AED"
        />
        <AdminKPICard
          value={`${successRate}%`}
          label="Success Rate"
          color={successRate >= 80 ? "#2D5A3D" : successRate >= 50 ? "#C49A2A" : "#C8322B"}
        />
        <AdminKPICard
          value={schedules.reduce((acc, s) => acc + s.articlesQueue, 0)}
          label="Queued Content"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <AdminTabs
          tabs={[
            { id: "jobs", label: "Background Jobs", count: jobs.length },
            { id: "schedules", label: "Schedules", count: schedules.length },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as "jobs" | "schedules")}
        />
      </div>

      {/* Jobs Tab */}
      {activeTab === "jobs" && (
        <AdminCard elevated>
          <div className="flex items-center justify-between mb-4">
            <AdminSectionLabel>Background Jobs</AdminSectionLabel>
            <select
              value={selectedJobType}
              onChange={(e) => setSelectedJobType(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Types</option>
              <option value="content-generation">Content Generation</option>
              <option value="seo-audit">SEO Audit</option>
              <option value="publishing">Publishing</option>
              <option value="backup">Backup</option>
              <option value="sync">Sync</option>
              <option value="cleanup">Cleanup</option>
            </select>
          </div>

          {isLoading ? (
            <AdminLoadingState label="Loading jobs…" />
          ) : filteredJobs.length === 0 ? (
            <AdminEmptyState
              icon={Bot}
              title="No automation jobs"
              description="Create your first automation job to get started"
              action={
                <AdminButton variant="primary" onClick={() => setIsCreatingJob(true)}>
                  <Plus size={14} /> Create Job
                </AdminButton>
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => {
                const IconComponent = jobTypeIcons[job.type] || Bot;
                return (
                  <div key={job.id} className="admin-card-inset">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <IconComponent size={15} className="text-stone-500 flex-shrink-0" />
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#1C1917" }}>
                            {job.name}
                          </span>
                          <AdminStatusBadge status={job.status === "idle" ? "inactive" : job.status === "completed" ? "success" : job.status} />
                          <AdminStatusBadge status={job.isActive ? "active" : "inactive"} />
                        </div>

                        <p style={{ fontSize: 12, color: "#78716C", marginBottom: 8 }}>{job.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ fontFamily: "var(--font-system)", fontSize: 10 }}>
                          <div>
                            <span style={{ color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Schedule</span>
                            <p style={{ color: "#1C1917", marginTop: 2 }}>{formatSchedule(job.schedule)}</p>
                          </div>
                          <div>
                            <span style={{ color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Success / Fail</span>
                            <p style={{ color: "#1C1917", marginTop: 2 }}>
                              <span className="score-high">{job.successCount}</span> / <span className="score-low">{job.failureCount}</span>
                            </p>
                          </div>
                          <div>
                            <span style={{ color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Run</span>
                            <p style={{ color: "#1C1917", marginTop: 2 }}>{job.lastRun ? new Date(job.lastRun).toLocaleString() : "Never"}</p>
                          </div>
                          <div>
                            <span style={{ color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Duration</span>
                            <p style={{ color: "#1C1917", marginTop: 2 }}>{formatDuration(job.duration)}</p>
                          </div>
                        </div>

                        {job.nextRun && (
                          <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#78716C", marginTop: 6 }}>
                            Next: {new Date(job.nextRun).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                        <AdminButton
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRunJob(job.id)}
                          disabled={job.status === "running" || !job.isActive}
                          loading={job.status === "running"}
                        >
                          <Play size={12} />
                        </AdminButton>
                        <AdminButton variant="ghost" size="sm" onClick={() => handleToggleJob(job.id)}>
                          {job.isActive ? <Pause size={12} /> : <Play size={12} />}
                        </AdminButton>
                        <AdminButton variant="ghost" size="sm" onClick={() => { window.location.href = '/admin/health-monitoring'; }}>
                          <Settings size={12} />
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminCard>
      )}

      {/* Schedules Tab */}
      {activeTab === "schedules" && (
        <AdminCard elevated>
          <AdminSectionLabel>Publishing Schedules</AdminSectionLabel>

          {isLoading ? (
            <AdminLoadingState label="Loading schedules…" />
          ) : schedules.length === 0 ? (
            <AdminEmptyState
              icon={Calendar}
              title="No publishing schedules"
              description="Create a schedule to automate content publishing"
              action={
                <AdminButton variant="primary" onClick={() => setIsCreatingSchedule(true)}>
                  <Calendar size={14} /> Create Schedule
                </AdminButton>
              }
            />
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="admin-card-inset">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Calendar size={15} className="text-stone-500 flex-shrink-0" />
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#1C1917" }}>
                          {schedule.name}
                        </span>
                        <span className="admin-filter-pill" style={{ fontSize: 9, padding: "2px 8px" }}>{schedule.contentType}</span>
                        <AdminStatusBadge status={schedule.isActive ? "active" : "inactive"} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ fontFamily: "var(--font-system)", fontSize: 10 }}>
                        <div>
                          <span style={{ color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Frequency</span>
                          <p style={{ color: "#1C1917", marginTop: 2, textTransform: "capitalize" }}>
                            {schedule.frequency} at {schedule.time}
                            {schedule.days && schedule.days.length > 0 && ` (${schedule.days.join(", ")})`}
                          </p>
                        </div>
                        <div>
                          <span style={{ color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Queue</span>
                          <p style={{ color: "#1C1917", marginTop: 2 }}>{schedule.articlesQueue} articles</p>
                        </div>
                        <div>
                          <span style={{ color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Next Publish</span>
                          <p style={{ color: "#1C1917", marginTop: 2 }}>
                            {schedule.nextPublish ? new Date(schedule.nextPublish).toLocaleString() : "Not scheduled"}
                          </p>
                        </div>
                        <div>
                          <span style={{ color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Published</span>
                          <p style={{ color: "#1C1917", marginTop: 2 }}>
                            {schedule.lastPublished ? new Date(schedule.lastPublished).toLocaleDateString() : "Never"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      <AdminButton variant="ghost" size="sm" onClick={() => handleToggleSchedule(schedule.id)}>
                        {schedule.isActive ? <Pause size={12} /> : <Play size={12} />}
                      </AdminButton>
                      <AdminButton variant="ghost" size="sm" onClick={() => { window.location.href = '/admin/workflow'; }}>
                        <Edit size={12} />
                      </AdminButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      )}

      {/* System Status */}
      <AdminCard className="mt-4">
        <AdminSectionLabel>System Status</AdminSectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${jobs.filter((j) => j.isActive).length > 0 ? "bg-[#2D5A3D]" : "bg-stone-400"}`} />
            <div>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>Job Scheduler</p>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#78716C" }}>
                {jobs.filter((j) => j.isActive).length} active job{jobs.filter((j) => j.isActive).length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${jobs.filter((j) => j.status === "running").length > 0 ? "bg-[#3B7EA1] animate-pulse" : "bg-[#2D5A3D]"}`} />
            <div>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>Content Generation</p>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#78716C" }}>
                {jobs.filter((j) => j.type === "content-generation" && j.status === "completed").length > 0
                  ? `${jobs.filter((j) => j.type === "content-generation").reduce((a, j) => a + j.successCount, 0)} runs completed`
                  : "No runs yet"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${jobs.filter((j) => j.status === "failed").length > 0 ? "bg-[#C49A2A]" : "bg-[#2D5A3D]"}`} />
            <div>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>System Health</p>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#78716C" }}>
                {jobs.filter((j) => j.status === "failed").length > 0
                  ? `${jobs.filter((j) => j.status === "failed").length} job(s) failed`
                  : "All systems operational"}
              </p>
            </div>
          </div>
        </div>
      </AdminCard>

      {/* Create Job Modal */}
      {isCreatingJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <AdminCard elevated className="w-full max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={16} className="text-stone-500" />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "#1C1917" }}>
                Create New Automation Job
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <AdminSectionLabel>Job Name</AdminSectionLabel>
                <input className="admin-input" placeholder="Enter job name..." />
              </div>
              <div>
                <AdminSectionLabel>Job Type</AdminSectionLabel>
                <select className="admin-select w-full">
                  <option value="">Select job type</option>
                  <option value="content-generation">Content Generation</option>
                  <option value="seo-audit">SEO Audit</option>
                  <option value="publishing">Publishing</option>
                  <option value="backup">Backup</option>
                  <option value="sync">Sync</option>
                  <option value="cleanup">Cleanup</option>
                </select>
              </div>
              <div>
                <AdminSectionLabel>Schedule (Cron)</AdminSectionLabel>
                <input className="admin-input" placeholder="0 9 * * * (9 AM daily)" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <AdminButton variant="secondary" onClick={() => setIsCreatingJob(false)}>Cancel</AdminButton>
                <AdminButton variant="primary" onClick={() => { setIsCreatingJob(false); window.location.href = '/admin/workflow'; }}>
                  Create Job
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Create Schedule Modal */}
      {isCreatingSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <AdminCard elevated className="w-full max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-stone-500" />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "#1C1917" }}>
                Create Publishing Schedule
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <AdminSectionLabel>Schedule Name</AdminSectionLabel>
                <input className="admin-input" placeholder="Enter schedule name..." />
              </div>
              <div>
                <AdminSectionLabel>Content Type</AdminSectionLabel>
                <select className="admin-select w-full">
                  <option value="">Select content type</option>
                  <option value="travel-guide">Travel Guide</option>
                  <option value="restaurant-review">Restaurant Review</option>
                  <option value="event-coverage">Event Coverage</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <AdminSectionLabel>Frequency</AdminSectionLabel>
                  <select className="admin-select w-full">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <AdminSectionLabel>Time</AdminSectionLabel>
                  <input type="time" className="admin-input" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <AdminButton variant="secondary" onClick={() => setIsCreatingSchedule(false)}>Cancel</AdminButton>
                <AdminButton variant="primary" onClick={() => { setIsCreatingSchedule(false); window.location.href = '/admin/workflow'; }}>
                  Create Schedule
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
}
