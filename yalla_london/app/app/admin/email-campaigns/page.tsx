"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminKPICard,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminTabs,
} from "@/components/admin/admin-ui";
import {
  Mail,
  Plus,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Copy,
  RefreshCw,
  FileText,
  Users,
  BarChart3,
  Calendar,
  Inbox,
  Loader2,
  MousePointerClick,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  siteId: string;
  siteName: string;
  thumbnail: string | null;
  subject: string;
  updatedAt: string;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  siteId: string;
  siteName: string;
  templateId: string | null;
  recipientCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────

const CAMPAIGN_STATUS_MAP: Record<string, { label: string; badgeStatus: string; icon: React.ElementType }> = {
  draft: { label: "Draft", badgeStatus: "draft", icon: FileText },
  scheduled: { label: "Scheduled", badgeStatus: "pending", icon: Clock },
  sending: { label: "Sending", badgeStatus: "generating", icon: Loader2 },
  sent: { label: "Sent", badgeStatus: "success", icon: CheckCircle },
  failed: { label: "Failed", badgeStatus: "failed", icon: AlertCircle },
};

// ─── Helpers ─────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function openRate(campaign: Campaign): string {
  if (campaign.sentCount === 0) return "0%";
  return ((campaign.openCount / campaign.sentCount) * 100).toFixed(1) + "%";
}

function clickRate(campaign: Campaign): string {
  if (campaign.sentCount === 0) return "0%";
  return ((campaign.clickCount / campaign.sentCount) * 100).toFixed(1) + "%";
}

// ─── Main Component ──────────────────────────────────────────────

export default function EmailCampaignsPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState({ name: "", subject: "", htmlContent: "<p>Your email content here</p>" });
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", subject: "", htmlBody: "<p>Your template content here</p>" });
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSeedingTemplates, setIsSeedingTemplates] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);
  const [providerStatus, setProviderStatus] = useState<{ activeProvider: string; configured: boolean; domainVerified?: boolean; sendingFrom?: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [templatesRes, campaignsRes, emailCenterRes] = await Promise.allSettled([
        fetch("/api/admin/email-templates"),
        fetch("/api/admin/email-campaigns"),
        fetch("/api/admin/email-center"),
      ]);

      if (templatesRes.status === "fulfilled" && templatesRes.value.ok) {
        const data = await templatesRes.value.json();
        const items = data.templates || data.data || [];
        setTemplates(
          items.map((t: Record<string, unknown>) => ({
            id: String(t.id || ""),
            name: String(t.name || t.title || "Untitled"),
            type: String(t.type || t.category || "general"),
            siteId: String(t.siteId || t.site_id || ""),
            siteName: String(t.siteName || t.site_name || ""),
            thumbnail: (t.thumbnail || t.preview_url || null) as string | null,
            subject: String(t.subject || t.default_subject || ""),
            updatedAt: String(t.updatedAt || t.updated_at || ""),
          }))
        );
      } else {
        setTemplates([]);
      }

      if (campaignsRes.status === "fulfilled" && campaignsRes.value.ok) {
        const data = await campaignsRes.value.json();
        const items = data.campaigns || data.data || [];
        setCampaigns(
          items.map((c: Record<string, unknown>) => ({
            id: String(c.id || ""),
            name: String(c.name || c.title || "Untitled"),
            subject: String(c.subject || ""),
            status: String(c.status || "draft") as Campaign["status"],
            siteId: String(c.siteId || c.site_id || ""),
            siteName: String(c.siteName || c.site_name || ""),
            templateId: (c.templateId || c.template_id || null) as string | null,
            recipientCount: Number(c.recipientCount || c.recipient_count || 0),
            sentCount: Number(c.sentCount || c.sent_count || 0),
            openCount: Number(c.openCount || c.open_count || 0),
            clickCount: Number(c.clickCount || c.click_count || 0),
            scheduledFor: (c.scheduledFor || c.scheduled_for || null) as string | null,
            sentAt: (c.sentAt || c.sent_at || null) as string | null,
            createdAt: String(c.createdAt || c.created_at || ""),
          }))
        );
      } else {
        setCampaigns([]);
      }
      // Load provider status
      if (emailCenterRes.status === "fulfilled" && emailCenterRes.value.ok) {
        const ecData = await emailCenterRes.value.json();
        const prov = ecData.provider || ecData.providerStatus;
        if (prov) {
          setProviderStatus({
            activeProvider: prov.activeProvider || "none",
            configured: prov.active ?? false,
            domainVerified: prov.domainVerified ?? false,
            sendingFrom: prov.sendingFrom || "",
          });
        }
      }
    } catch (err) {
      console.warn("[email-campaigns] Failed to load data:", err);
      setError("Failed to load email data. Check your connection and try again.");
      setTemplates([]);
      setCampaigns([]);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success("Email data refreshed");
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.subject.trim()) {
      toast.error("Name and subject are required");
      return;
    }
    setIsCreating(true);
    try {
      // Read siteId from cookie or let server default — never hardcode a specific site
      const siteId = document.cookie.match(/x-site-id=([^;]+)/)?.[1] || undefined;
      const res = await fetch("/api/admin/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampaign.name.trim(),
          subject: newCampaign.subject.trim(),
          htmlContent: newCampaign.htmlContent,
          site: siteId,
        }),
      });
      if (res.ok) {
        toast.success("Campaign created successfully");
        setShowCreateModal(false);
        setNewCampaign({ name: "", subject: "", htmlContent: "<p>Your email content here</p>" });
        await loadData();
        setActiveTab("campaigns");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create campaign");
      }
    } catch (err) {
      console.warn("[email-campaigns] Create failed:", err);
      toast.error("Network error creating campaign");
    } finally {
      setIsCreating(false);
    }
  };

  // Resend sandbox can only send to the account owner's email.
  // Show a clear message and pre-fill the prompt.
  const isSandbox = providerStatus?.activeProvider === "resend" && !providerStatus?.domainVerified;

  const promptForRecipient = (label: string): string | null => {
    if (isSandbox) {
      const msg =
        "⚠️ Resend sandbox mode — can only send to your account email.\n\n" +
        "Enter your Resend account email:";
      const addr = window.prompt(msg, "");
      if (!addr || !addr.includes("@")) {
        toast.error("Please enter your Resend account email");
        return null;
      }
      return addr;
    }
    const addr = window.prompt(`${label}:`, "");
    if (!addr || !addr.includes("@")) {
      toast.error("Please enter a valid email address");
      return null;
    }
    return addr;
  };

  const handleSendTest = async () => {
    const testRecipient = promptForRecipient("Send test email to");
    if (!testRecipient) return;

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_send",
          to: testRecipient,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setTestResult({
          success: false,
          message: errBody.error || `Failed (${res.status})`,
        });
        toast.error("Test email failed");
      } else {
        const data = await res.json();
        setTestResult({
          success: data.success ?? true,
          message: data.success ? `Test email sent to ${testRecipient}! Check your inbox.` : (data.error || "Unknown error"),
          messageId: data.messageId || data.result?.messageId,
        });
        if (data.success) {
          toast.success(`Test email sent to ${testRecipient}`);
        } else {
          toast.error(data.error || "Test email failed");
        }
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Network error: ${err instanceof Error ? err.message : "unknown"}`,
      });
      toast.error("Network error sending test email");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendWelcome = async () => {
    const testRecipient = promptForRecipient("Send welcome email to");
    if (!testRecipient) return;

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_welcome",
          to: testRecipient,
          language: "en",
        }),
      });
      const data = await res.json().catch(() => ({}));
      setTestResult({
        success: data.success ?? false,
        message: data.success
          ? `Welcome email sent to ${testRecipient}! Check your inbox.`
          : (data.error || `Failed (${res.status})`),
        messageId: data.messageId,
      });
      if (data.success) {
        toast.success(`Welcome email sent to ${testRecipient}`);
      } else {
        toast.error(data.error || "Welcome email failed");
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Network error: ${err instanceof Error ? err.message : "unknown"}`,
      });
      toast.error("Network error sending welcome email");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim()) {
      toast.error("Name and subject are required");
      return;
    }
    setIsCreatingTemplate(true);
    try {
      const res = await fetch("/api/admin/email-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_template",
          name: newTemplate.name.trim(),
          subject: newTemplate.subject.trim(),
          htmlBody: newTemplate.htmlBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        toast.success("Template created");
        setShowCreateTemplateModal(false);
        setNewTemplate({ name: "", subject: "", htmlBody: "<p>Your template content here</p>" });
        await loadData();
      } else {
        toast.error(data.error || "Failed to create template");
      }
    } catch (err) {
      console.warn("[email-campaigns] Create template failed:", err);
      toast.error("Network error creating template");
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  // Filtered campaign lists
  const activeCampaigns = campaigns.filter((c) => c.status !== "sent");
  const sentCampaigns = campaigns.filter((c) => c.status === "sent");

  // Summary stats
  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + c.openCount, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clickCount, 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : "0";

  const tabItems = [
    { id: "templates", label: "Templates", count: templates.length },
    { id: "campaigns", label: "Campaigns", count: activeCampaigns.length },
    { id: "sent", label: "Sent", count: sentCampaigns.length },
  ];

  // ─── Render ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminLoadingState label="Loading email campaigns..." />
      </div>
    );
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <AdminPageHeader
          title="Email Campaigns"
          subtitle="Templates, campaigns & performance"
          action={
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              loading={isRefreshing}
            >
              <RefreshCw size={13} />
              Refresh
            </AdminButton>
          }
        />

        {/* Error Banner */}
        {error && (
          <AdminAlertBanner
            severity="critical"
            message={error}
            onDismiss={() => setError(null)}
            action={
              <AdminButton variant="secondary" size="sm" onClick={handleRefresh}>
                Retry
              </AdminButton>
            }
          />
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AdminKPICard
            value={totalSent.toLocaleString()}
            label="Emails Sent"
            color="#3B7EA1"
          />
          <AdminKPICard
            value={totalOpens.toLocaleString()}
            label="Opens"
            color="#2D5A3D"
          />
          <AdminKPICard
            value={totalClicks.toLocaleString()}
            label="Clicks"
            color="#C49A2A"
          />
          <AdminKPICard
            value={`${avgOpenRate}%`}
            label="Avg Open Rate"
            color="#C8322B"
          />
        </div>

        {/* Provider Status + Send Test */}
        <AdminCard>
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: providerStatus?.configured
                      ? "rgba(45,90,61,0.08)"
                      : "rgba(200,50,43,0.08)",
                  }}
                >
                  <Zap
                    size={18}
                    color={providerStatus?.configured ? "#2D5A3D" : "#C8322B"}
                  />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#1C1917",
                    }}
                  >
                    Email Provider:{" "}
                    <span style={{ color: providerStatus?.configured ? "#2D5A3D" : "#C8322B" }}>
                      {providerStatus?.activeProvider || "Not configured"}
                    </span>
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 11,
                      color: "#78716C",
                      marginTop: 2,
                    }}
                  >
                    {!providerStatus?.configured
                      ? "Set RESEND_API_KEY in Vercel env vars to enable email sending."
                      : isSandbox
                        ? "Resend sandbox mode — can only send to your account email. Verify your domain to send to anyone."
                        : "Resend is connected and domain verified. Ready to send."}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <AdminButton
                  variant="secondary"
                  size="sm"
                  onClick={handleSendTest}
                  loading={isSendingTest}
                  disabled={!providerStatus?.configured}
                >
                  <Send size={13} />
                  Send Test
                </AdminButton>
                <AdminButton
                  variant="primary"
                  size="sm"
                  onClick={handleSendWelcome}
                  loading={isSendingTest}
                  disabled={!providerStatus?.configured}
                >
                  <Mail size={13} />
                  Send Welcome
                </AdminButton>
              </div>
            </div>
            {testResult && (
              <div
                className="mt-3 p-3 rounded-lg"
                style={{
                  backgroundColor: testResult.success ? "rgba(45,90,61,0.06)" : "rgba(200,50,43,0.06)",
                  borderLeft: `3px solid ${testResult.success ? "#2D5A3D" : "#C8322B"}`,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 12,
                    color: testResult.success ? "#2D5A3D" : "#C8322B",
                    fontWeight: 600,
                  }}
                >
                  {testResult.success ? "Sent successfully" : "Failed"}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 11,
                    color: "#78716C",
                    marginTop: 2,
                  }}
                >
                  {testResult.message}
                  {testResult.messageId && (
                    <span style={{ display: "block", fontSize: 10, marginTop: 2, color: "#A8A29E" }}>
                      Message ID: {testResult.messageId}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </AdminCard>

        {/* Tabs */}
        <AdminTabs tabs={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <AdminSectionLabel>Email Templates</AdminSectionLabel>
              <AdminButton variant="primary" size="sm" onClick={() => setShowCreateTemplateModal(true)}>
                <Plus size={13} />
                Create Template
              </AdminButton>
            </div>
            {templates.length === 0 ? (
              <AdminEmptyState
                icon={Mail}
                title="No templates yet"
                description="Seed 10 professionally designed Yalla London templates, or create your own from scratch."
                action={
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                    <AdminButton variant="primary" size="sm" loading={isSeedingTemplates} onClick={async () => {
                      setIsSeedingTemplates(true);
                      try {
                        const res = await fetch("/api/admin/email-templates", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "seed_templates", site: "yalla-london" }),
                        });
                        if (!res.ok) throw new Error("Seed failed");
                        const data = await res.json();
                        toast.success(`Created ${data.created} templates (${data.skipped} already existed)`);
                        loadData();
                      } catch {
                        toast.error("Failed to seed templates");
                      } finally {
                        setIsSeedingTemplates(false);
                      }
                    }}>
                      <Zap size={13} />
                      Seed 10 Templates
                    </AdminButton>
                    <AdminButton variant="ghost" size="sm" onClick={() => setShowCreateTemplateModal(true)}>
                      <Plus size={13} />
                      Create from Scratch
                    </AdminButton>
                  </div>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onDuplicated={loadData}
                    promptForRecipient={promptForRecipient}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === "campaigns" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <AdminSectionLabel>Active Campaigns</AdminSectionLabel>
              <AdminButton variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus size={13} />
                Create Campaign
              </AdminButton>
            </div>
            {activeCampaigns.length === 0 ? (
              <AdminEmptyState
                icon={Send}
                title="No active campaigns"
                description="Create a campaign to send emails to your subscribers."
                action={
                  <AdminButton variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                    <Plus size={13} />
                    Create Campaign
                  </AdminButton>
                }
              />
            ) : (
              <div className="space-y-3">
                {activeCampaigns.map((campaign) => (
                  <CampaignRow key={campaign.id} campaign={campaign} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sent Tab */}
        {activeTab === "sent" && (
          <div>
            <AdminSectionLabel>Sent Campaigns</AdminSectionLabel>
            {sentCampaigns.length === 0 ? (
              <AdminEmptyState
                icon={Inbox}
                title="No sent campaigns"
                description="Sent campaigns and their performance stats will appear here."
              />
            ) : (
              <div className="space-y-3">
                {sentCampaigns.map((campaign) => (
                  <CampaignRow key={campaign.id} campaign={campaign} showStats />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateTemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(28,25,23,0.4)" }}
          onClick={() => setShowCreateTemplateModal(false)}
        >
          <div
            className="admin-card-elevated w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 18,
                  color: "#1C1917",
                  marginBottom: 20,
                }}
              >
                Create Email Template
              </h2>
              <div className="space-y-4">
                <div>
                  <label
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      color: "#78716C",
                    }}
                  >
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g. Welcome Email, Monthly Newsletter"
                    className="admin-input mt-1.5"
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      color: "#78716C",
                    }}
                  >
                    Default Subject
                  </label>
                  <input
                    type="text"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    placeholder="e.g. Welcome to Yalla London!"
                    className="admin-input mt-1.5"
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      color: "#78716C",
                    }}
                  >
                    HTML Content
                  </label>
                  <textarea
                    value={newTemplate.htmlBody}
                    onChange={(e) => setNewTemplate({ ...newTemplate, htmlBody: e.target.value })}
                    rows={6}
                    className="admin-input mt-1.5 font-mono"
                    style={{ resize: "vertical", fontSize: 11 }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <AdminButton variant="ghost" size="sm" onClick={() => setShowCreateTemplateModal(false)}>
                  Cancel
                </AdminButton>
                <AdminButton
                  variant="primary"
                  size="sm"
                  onClick={handleCreateTemplate}
                  loading={isCreatingTemplate}
                >
                  <Plus size={13} />
                  Create Template
                </AdminButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(28,25,23,0.4)" }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="admin-card-elevated w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 18,
                  color: "#1C1917",
                  marginBottom: 20,
                }}
              >
                Create Campaign
              </h2>
              <div className="space-y-4">
                <div>
                  <label
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      color: "#78716C",
                    }}
                  >
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="e.g. March Newsletter"
                    className="admin-input mt-1.5"
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      color: "#78716C",
                    }}
                  >
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={newCampaign.subject}
                    onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                    placeholder="e.g. Discover London this Spring"
                    className="admin-input mt-1.5"
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      color: "#78716C",
                    }}
                  >
                    Content (HTML)
                  </label>
                  <textarea
                    value={newCampaign.htmlContent}
                    onChange={(e) => setNewCampaign({ ...newCampaign, htmlContent: e.target.value })}
                    rows={4}
                    className="admin-input mt-1.5 font-mono"
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <AdminButton variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </AdminButton>
                <AdminButton
                  variant="primary"
                  size="sm"
                  onClick={handleCreateCampaign}
                  loading={isCreating}
                >
                  <Plus size={13} />
                  Create Campaign
                </AdminButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function TemplateCard({
  template,
  onDuplicated,
  promptForRecipient,
}: {
  template: EmailTemplate;
  onDuplicated: () => void;
  promptForRecipient: (label: string) => string | null;
}) {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editSubject, setEditSubject] = useState(template.subject || "");
  const [editHtml, setEditHtml] = useState("");
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEditor = async () => {
    setIsLoadingHtml(true);
    setShowEditor(true);
    try {
      const res = await fetch(`/api/admin/email-templates?search=${encodeURIComponent(template.name)}&site=${template.siteId}`);
      const data = res.ok ? await res.json() : null;
      const found = data?.templates?.find((t: Record<string, unknown>) => t.id === template.id);
      setEditHtml(found?.htmlContent || "");
      setEditSubject(found?.subject || template.subject || "");
    } catch {
      toast.error("Failed to load template content");
    } finally {
      setIsLoadingHtml(false);
    }
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template.id,
          subject: editSubject,
          htmlContent: editHtml,
        }),
      });
      if (res.ok) {
        toast.success("Template saved");
        setShowEditor(false);
        onDuplicated(); // reload list
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save template");
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const srcRes = await fetch(`/api/admin/email-templates?search=${encodeURIComponent(template.name)}&site=${template.siteId}`);
      const srcData = srcRes.ok ? await srcRes.json() : null;
      const srcTemplate = srcData?.templates?.find((t: Record<string, unknown>) => t.id === template.id);
      const htmlContent = srcTemplate?.htmlContent || "<div>Duplicated template</div>";

      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          subject: template.subject,
          type: template.type,
          site: template.siteId,
          htmlContent,
          jsonContent: srcTemplate?.jsonContent || null,
        }),
      });
      if (res.ok) {
        toast.success("Template duplicated");
        onDuplicated();
      } else {
        toast.error("Failed to duplicate template");
      }
    } catch {
      toast.error("Failed to duplicate template");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleSendTemplateTest = async () => {
    const testRecipient = promptForRecipient(`Send test of "${template.name}" to`);
    if (!testRecipient) return;

    setIsSendingTest(true);
    try {
      const res = await fetch("/api/admin/email-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_template",
          templateId: template.id,
          to: testRecipient,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        toast.error(errBody.error || `Failed to send test (${res.status})`);
      } else {
        const data = await res.json();
        if (data.success) {
          toast.success(`Test email sent to ${testRecipient}`);
        } else {
          toast.error(data.error || "Test email failed");
        }
      }
    } catch (err) {
      toast.error(`Network error: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <AdminCard className="overflow-hidden group">
      {/* Thumbnail */}
      <div
        className="aspect-[16/10] relative overflow-hidden"
        style={{ backgroundColor: "#FAF8F4" }}
      >
        {template.thumbnail ? (
          <Image
            src={template.thumbnail}
            alt={template.name}
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            style={{ width: "100%", height: "100%" }}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Mail size={28} color="#D6D0C4" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3
          className="truncate mb-1"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 14,
            color: "#1C1917",
          }}
        >
          {template.name}
        </h3>
        {template.subject && (
          <p
            className="truncate mb-2"
            style={{
              fontFamily: "var(--font-system)",
              fontSize: 11,
              color: "#78716C",
            }}
          >
            Subject: {template.subject}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <AdminStatusBadge status="active" label={template.type} />
          {template.siteName && (
            <span
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 10,
                color: "#A8A29E",
              }}
            >
              {template.siteName}
            </span>
          )}
          <span
            className="ml-auto"
            style={{
              fontFamily: "var(--font-system)",
              fontSize: 10,
              color: "#A8A29E",
            }}
          >
            {formatDate(template.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <AdminButton variant="secondary" size="sm" className="w-full" onClick={handleOpenEditor}>
              <Edit size={12} />
              Edit
            </AdminButton>
          </div>
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={handleSendTemplateTest}
            loading={isSendingTest}
          >
            <Send size={12} />
          </AdminButton>
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={handleDuplicate}
            loading={isDuplicating}
          >
            <Copy size={12} />
          </AdminButton>
        </div>
      </div>

      {/* Inline Template Editor Modal */}
      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(28,25,23,0.5)" }}
          onClick={() => setShowEditor(false)}
        >
          <div
            className="admin-card-elevated w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 18,
                    color: "#1C1917",
                  }}
                >
                  Edit: {template.name}
                </h2>
                <AdminButton variant="ghost" size="sm" onClick={() => setShowEditor(false)}>
                  <RefreshCw size={12} />
                </AdminButton>
              </div>

              {isLoadingHtml ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin" size={24} color="#78716C" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Subject Line */}
                  <div>
                    <label
                      style={{
                        fontFamily: "var(--font-system)",
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        color: "#78716C",
                      }}
                    >
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="Email subject line"
                      className="admin-input mt-1.5"
                    />
                  </div>

                  {/* Merge Tags Helper */}
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(59,126,161,0.06)",
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: "var(--font-system)",
                      color: "#3B7EA1",
                    }}
                  >
                    <strong>Merge tags:</strong>{" "}
                    {"{{first_name}} {{last_name}} {{full_name}} {{email}} {{site_name}} {{unsubscribe_url}} {{current_year}}"}
                  </div>

                  {/* HTML Content */}
                  <div>
                    <label
                      style={{
                        fontFamily: "var(--font-system)",
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        color: "#78716C",
                      }}
                    >
                      HTML Content
                    </label>
                    <textarea
                      value={editHtml}
                      onChange={(e) => setEditHtml(e.target.value)}
                      rows={16}
                      className="admin-input mt-1.5 font-mono"
                      style={{ resize: "vertical", fontSize: 11, lineHeight: 1.5 }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <AdminButton variant="ghost" size="sm" onClick={() => setShowEditor(false)}>
                  Cancel
                </AdminButton>
                <AdminButton
                  variant="primary"
                  size="sm"
                  onClick={handleSaveTemplate}
                  loading={isSaving}
                  disabled={isLoadingHtml}
                >
                  <CheckCircle size={13} />
                  Save Template
                </AdminButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminCard>
  );
}

function CampaignRow({ campaign, showStats }: { campaign: Campaign; showStats?: boolean }) {
  const config = CAMPAIGN_STATUS_MAP[campaign.status] || CAMPAIGN_STATUS_MAP.draft;
  const StatusIcon = config.icon;

  return (
    <AdminCard>
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Status + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor:
                  campaign.status === "sent" ? "rgba(45,90,61,0.08)" :
                  campaign.status === "failed" ? "rgba(200,50,43,0.08)" :
                  campaign.status === "sending" ? "rgba(124,58,237,0.08)" :
                  campaign.status === "scheduled" ? "rgba(59,126,161,0.08)" :
                  "rgba(120,113,108,0.08)",
              }}
            >
              <StatusIcon
                size={15}
                className={campaign.status === "sending" ? "animate-spin" : ""}
                color={
                  campaign.status === "sent" ? "#2D5A3D" :
                  campaign.status === "failed" ? "#C8322B" :
                  campaign.status === "sending" ? "#7C3AED" :
                  campaign.status === "scheduled" ? "#3B7EA1" :
                  "#78716C"
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="truncate"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#1C1917",
                  }}
                >
                  {campaign.name}
                </h3>
                <AdminStatusBadge status={config.badgeStatus} label={config.label} />
              </div>
              <p
                className="truncate mt-0.5"
                style={{
                  fontFamily: "var(--font-system)",
                  fontSize: 11,
                  color: "#78716C",
                }}
              >
                {campaign.subject}
              </p>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 flex-shrink-0 flex-wrap">
            {campaign.siteName && (
              <span
                style={{
                  fontFamily: "var(--font-system)",
                  fontSize: 10,
                  color: "#A8A29E",
                }}
              >
                {campaign.siteName}
              </span>
            )}
            <span
              className="flex items-center gap-1"
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 10,
                color: "#78716C",
              }}
            >
              <Users size={12} color="#A8A29E" />
              {campaign.recipientCount}
            </span>
            {campaign.scheduledFor && (
              <span
                className="flex items-center gap-1"
                style={{
                  fontFamily: "var(--font-system)",
                  fontSize: 10,
                  color: "#3B7EA1",
                }}
              >
                <Calendar size={12} />
                {formatDateTime(campaign.scheduledFor)}
              </span>
            )}
            {campaign.sentAt && (
              <span
                className="flex items-center gap-1"
                style={{
                  fontFamily: "var(--font-system)",
                  fontSize: 10,
                  color: "#2D5A3D",
                }}
              >
                <Send size={12} />
                {formatDateTime(campaign.sentAt)}
              </span>
            )}
          </div>

          {/* Stats (shown on Sent tab) */}
          {showStats && campaign.sentCount > 0 && (
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-center">
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 14,
                    color: "#1C1917",
                  }}
                >
                  {campaign.sentCount}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 9,
                    color: "#A8A29E",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Sent
                </p>
              </div>
              <div className="text-center">
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 14,
                    color: "#2D5A3D",
                  }}
                >
                  {openRate(campaign)}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 9,
                    color: "#A8A29E",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Opens
                </p>
              </div>
              <div className="text-center">
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 14,
                    color: "#C49A2A",
                  }}
                >
                  {clickRate(campaign)}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 9,
                    color: "#A8A29E",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Clicks
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminCard>
  );
}
