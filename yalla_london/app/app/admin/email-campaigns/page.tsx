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
  htmlContent: string;
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
  const [newCampaign, setNewCampaign] = useState({ name: "", subject: "", htmlContent: "<p>Your email content here</p>", templateId: "" });
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", subject: "", templateType: "newsletter" });
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
            htmlContent: String(t.htmlContent || t.html_content || ""),
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
          templateId: newCampaign.templateId || undefined,
          site: siteId,
        }),
      });
      if (res.ok) {
        toast.success("Campaign created successfully");
        setShowCreateModal(false);
        setNewCampaign({ name: "", subject: "", htmlContent: "<p>Your email content here</p>", templateId: "" });
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

  // Pre-built template starters — Khaled picks a type, we generate the HTML
  const TEMPLATE_STARTERS: { id: string; label: string; icon: string; subject: string; description: string }[] = [
    { id: "newsletter", label: "Newsletter", icon: "📰", subject: "Your Weekly London Guide", description: "Weekly digest with featured articles, top picks, and latest guides" },
    { id: "welcome", label: "Welcome Email", icon: "👋", subject: "Welcome to Yalla London!", description: "First email new subscribers receive — sets the tone" },
    { id: "promotion", label: "Promotion", icon: "🎁", subject: "An Exclusive Offer Just for You", description: "Special deal, discount, or limited-time offer" },
    { id: "new_article", label: "New Article", icon: "✨", subject: "New Guide Published — Don't Miss This", description: "Alert subscribers when a new article is published" },
    { id: "seasonal", label: "Seasonal Guide", icon: "🌸", subject: "London This Season — Your Complete Guide", description: "Seasonal recommendations, events, and experiences" },
    { id: "reengagement", label: "We Miss You", icon: "💌", subject: "We miss you — here's what you've been missing", description: "Win back subscribers who haven't opened in 30+ days" },
  ];

  function generateTemplateHtml(type: string, name: string): string {
    const brand = { primary: "#C8322B", gold: "#C49A2A", bg: "#FAF8F4", text: "#1C1917", muted: "#78716C" };
    const header = `<div style="background:${brand.primary};padding:24px 20px;text-align:center"><h1 style="color:white;font-size:22px;margin:0;font-family:Georgia,serif">Yalla London</h1></div>`;
    const footer = `<div style="padding:20px;text-align:center;font-size:11px;color:${brand.muted};border-top:1px solid #E7E5E4"><p>Yalla London — Your Luxury London Guide</p><p><a href="{{unsubscribe_url}}" style="color:${brand.muted}">Unsubscribe</a></p></div>`;
    const btn = (text: string, href: string) => `<div style="text-align:center;margin:24px 0"><a href="${href}" style="background:${brand.primary};color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">${text}</a></div>`;

    const wrap = (content: string) => `<div style="max-width:600px;margin:0 auto;background:white;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${header}<div style="padding:24px 20px">${content}</div>${footer}</div>`;

    switch (type) {
      case "welcome":
        return wrap(`<h2 style="color:${brand.text};font-size:20px;margin:0 0 12px">Welcome, {{first_name}}! 👋</h2><p style="color:${brand.text};line-height:1.6;font-size:15px">We're thrilled to have you. Yalla London is your personal guide to the best luxury experiences London has to offer.</p><p style="color:${brand.text};line-height:1.6;font-size:15px">Here's what you'll get from us:</p><ul style="color:${brand.text};line-height:1.8;font-size:15px"><li>Weekly curated guides to London's best</li><li>Exclusive deals on hotels and experiences</li><li>Insider tips from our editorial team</li></ul>${btn("Explore Our Guides", "{{site_url}}/blog")}<p style="color:${brand.muted};font-size:13px;text-align:center">Questions? Just reply to this email.</p>`);
      case "promotion":
        return wrap(`<h2 style="color:${brand.text};font-size:20px;margin:0 0 12px">{{first_name}}, this is for you 🎁</h2><p style="color:${brand.text};line-height:1.6;font-size:15px">We've partnered with one of London's top experiences to bring you an exclusive deal.</p><div style="background:${brand.bg};border:2px solid ${brand.gold};border-radius:8px;padding:20px;margin:20px 0;text-align:center"><p style="font-size:22px;font-weight:700;color:${brand.primary};margin:0">SPECIAL OFFER</p><p style="font-size:15px;color:${brand.text};margin:8px 0 0">Replace this with your offer details</p></div>${btn("Claim Your Offer", "{{site_url}}")}<p style="color:${brand.muted};font-size:12px;text-align:center">Offer expires [DATE]. Terms apply.</p>`);
      case "new_article":
        return wrap(`<p style="color:${brand.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">New Guide</p><h2 style="color:${brand.text};font-size:20px;margin:0 0 16px">[Article Title Here]</h2><p style="color:${brand.text};line-height:1.6;font-size:15px">[2-3 sentence preview of the article — what the reader will learn and why they should read it]</p>${btn("Read the Full Guide", "{{site_url}}/blog/article-slug")}<p style="color:${brand.muted};font-size:13px;text-align:center">Found this useful? Share it with a friend.</p>`);
      case "seasonal":
        return wrap(`<h2 style="color:${brand.text};font-size:20px;margin:0 0 12px">London This Season 🌸</h2><p style="color:${brand.text};line-height:1.6;font-size:15px">{{first_name}}, here's your seasonal guide to the best London has to offer right now.</p><h3 style="color:${brand.primary};font-size:16px;margin:20px 0 8px">🏨 Where to Stay</h3><p style="color:${brand.text};line-height:1.6;font-size:15px">[Hotel recommendations]</p><h3 style="color:${brand.primary};font-size:16px;margin:20px 0 8px">🍽️ Where to Eat</h3><p style="color:${brand.text};line-height:1.6;font-size:15px">[Restaurant recommendations]</p><h3 style="color:${brand.primary};font-size:16px;margin:20px 0 8px">🎭 What to Do</h3><p style="color:${brand.text};line-height:1.6;font-size:15px">[Activity recommendations]</p>${btn("See All Seasonal Picks", "{{site_url}}/blog")}`);
      case "reengagement":
        return wrap(`<h2 style="color:${brand.text};font-size:20px;margin:0 0 12px">We miss you, {{first_name}} 💌</h2><p style="color:${brand.text};line-height:1.6;font-size:15px">It's been a while since we've seen you. London hasn't stopped being amazing — and we've published some incredible guides since your last visit.</p><h3 style="color:${brand.primary};font-size:16px;margin:20px 0 8px">Here's what you've missed:</h3><ul style="color:${brand.text};line-height:1.8;font-size:15px"><li>[Popular Article 1]</li><li>[Popular Article 2]</li><li>[Popular Article 3]</li></ul>${btn("Catch Up Now", "{{site_url}}/blog")}<p style="color:${brand.muted};font-size:12px;text-align:center">Not interested anymore? <a href="{{unsubscribe_url}}" style="color:${brand.muted}">Unsubscribe</a></p>`);
      default: // newsletter
        return wrap(`<p style="color:${brand.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px">Weekly Newsletter</p><h2 style="color:${brand.text};font-size:20px;margin:0 0 16px">This Week in London</h2><p style="color:${brand.text};line-height:1.6;font-size:15px">Hi {{first_name}}, here are this week's top picks from our editorial team.</p><hr style="border:none;border-top:1px solid #E7E5E4;margin:20px 0"><h3 style="color:${brand.primary};font-size:16px;margin:0 0 8px">📌 Featured Article</h3><p style="color:${brand.text};line-height:1.6;font-size:15px">[Article title and 1-2 line summary]</p>${btn("Read More", "{{site_url}}/blog")}<hr style="border:none;border-top:1px solid #E7E5E4;margin:20px 0"><h3 style="color:${brand.primary};font-size:16px;margin:0 0 8px">🔥 More This Week</h3><ul style="color:${brand.text};line-height:1.8;font-size:15px"><li>[Article 2]</li><li>[Article 3]</li><li>[Article 4]</li></ul>`);
    }
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim()) {
      toast.error("Name and subject are required");
      return;
    }
    setIsCreatingTemplate(true);
    try {
      const htmlBody = generateTemplateHtml(newTemplate.templateType, newTemplate.name.trim());
      const res = await fetch("/api/admin/email-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_template",
          name: newTemplate.name.trim(),
          subject: newTemplate.subject.trim(),
          htmlBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        toast.success("Template created! Edit it to customize the content.");
        setShowCreateTemplateModal(false);
        setNewTemplate({ name: "", subject: "", templateType: "newsletter" });
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

        {/* Quick Start — only shown when no templates exist */}
        {templates.length === 0 && !isLoading && (
          <AdminCard>
            <div className="p-4 text-center space-y-3">
              <div
                className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(200,50,43,0.08)" }}
              >
                <Zap size={20} color="#C8322B" />
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#1C1917" }}>
                Get Started with Email
              </p>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#78716C" }}>
                Seed 10 professionally designed templates to start sending campaigns immediately.
              </p>
              <AdminButton
                variant="primary"
                size="lg"
                loading={isSeedingTemplates}
                className="mx-auto"
                onClick={async () => {
                  setIsSeedingTemplates(true);
                  try {
                    const res = await fetch("/api/admin/email-templates", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "seed_templates", site: document.cookie.match(/x-site-id=([^;]+)/)?.[1] || "yalla-london" }),
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
                }}
              >
                <Zap size={15} />
                Seed 10 Templates
              </AdminButton>
            </div>
          </AdminCard>
        )}

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
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <AdminSectionLabel>Email Templates</AdminSectionLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <AdminButton variant="ghost" size="sm" loading={isSeedingTemplates} onClick={async () => {
                  setIsSeedingTemplates(true);
                  try {
                    const res = await fetch("/api/admin/email-templates", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "seed_templates", site: document.cookie.match(/x-site-id=([^;]+)/)?.[1] || "yalla-london" }),
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
                <AdminButton variant="primary" size="sm" onClick={() => setShowCreateTemplateModal(true)}>
                  <Plus size={13} />
                  Create Template
                </AdminButton>
              </div>
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
                          body: JSON.stringify({ action: "seed_templates", site: document.cookie.match(/x-site-id=([^;]+)/)?.[1] || "yalla-london" }),
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
            className="admin-card-elevated w-full max-w-lg mx-4"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 18,
                  color: "#1C1917",
                  marginBottom: 4,
                }}
              >
                Create Email Template
              </h2>
              <p style={{ fontFamily: "var(--font-system)", fontSize: 13, color: "#78716C", marginBottom: 20 }}>
                Pick a template type — we&apos;ll generate the HTML for you. Edit it after.
              </p>
              <div className="space-y-4">
                {/* Template Type Picker */}
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
                    Template Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {TEMPLATE_STARTERS.map((starter) => {
                      const isSelected = newTemplate.templateType === starter.id;
                      return (
                        <button
                          key={starter.id}
                          type="button"
                          onClick={() => {
                            setNewTemplate({
                              ...newTemplate,
                              templateType: starter.id,
                              name: newTemplate.name || starter.label,
                              subject: starter.subject,
                            });
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            padding: "12px",
                            borderRadius: 8,
                            border: isSelected ? "2px solid #C8322B" : "1.5px solid rgba(214,208,196,0.5)",
                            background: isSelected ? "#FEF2F2" : "white",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{starter.icon}</span>
                            <span style={{ fontFamily: "var(--font-system)", fontSize: 13, fontWeight: 600, color: "#1C1917" }}>
                              {starter.label}
                            </span>
                          </div>
                          <span style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", lineHeight: 1.3 }}>
                            {starter.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name */}
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
                    placeholder="e.g. March Newsletter, Eid Offer"
                    className="admin-input mt-1.5"
                  />
                </div>

                {/* Subject */}
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
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    placeholder="e.g. Your Weekly London Guide"
                    className="admin-input mt-1.5"
                  />
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#A8A29E", marginTop: 4 }}>
                    Use {"{{first_name}}"} to personalize, e.g. &quot;Hey {"{{first_name}}"}, check this out&quot;
                  </p>
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
                    Use Template (optional)
                  </label>
                  <select
                    value={newCampaign.templateId}
                    onChange={(e) => {
                      const tplId = e.target.value;
                      if (tplId) {
                        const tpl = templates.find((t) => t.id === tplId);
                        if (tpl) {
                          setNewCampaign((prev) => ({
                            ...prev,
                            templateId: tplId,
                            subject: tpl.subject || prev.subject,
                            htmlContent: tpl.htmlContent || prev.htmlContent,
                          }));
                        }
                      } else {
                        setNewCampaign((prev) => ({ ...prev, templateId: "", htmlContent: "<p>Your email content here</p>" }));
                      }
                    }}
                    className="admin-input mt-1.5"
                  >
                    <option value="">— No template (write from scratch) —</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.type})
                      </option>
                    ))}
                  </select>
                  {templates.length === 0 && (
                    <p style={{ fontSize: 11, color: "#A8A29E", marginTop: 4 }}>
                      No templates available. Go to Templates tab to seed defaults.
                    </p>
                  )}
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
