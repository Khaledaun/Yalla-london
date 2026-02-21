"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowRight,
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

const CAMPAIGN_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: FileText },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: Clock },
  sending: { label: "Sending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", icon: Loader2 },
  sent: { label: "Sent", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: AlertCircle },
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

  const loadData = useCallback(async () => {
    try {
      const [templatesRes, campaignsRes] = await Promise.allSettled([
        fetch("/api/admin/email-templates"),
        fetch("/api/admin/email-campaigns"),
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
    } catch (err) {
      console.warn("[email-campaigns] Failed to load data:", err);
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

  // Filtered campaign lists
  const activeCampaigns = campaigns.filter((c) => c.status !== "sent");
  const sentCampaigns = campaigns.filter((c) => c.status === "sent");

  // Summary stats
  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + c.openCount, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clickCount, 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : "0";

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Mail className="h-7 w-7 text-blue-600" />
              Email Campaigns
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Create email templates, manage campaigns, and track performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : (
            <>
              <EmailStatCard icon={Send} label="Emails Sent" value={totalSent.toLocaleString()} color="text-blue-600 dark:text-blue-400" />
              <EmailStatCard icon={Eye} label="Opens" value={totalOpens.toLocaleString()} color="text-green-600 dark:text-green-400" />
              <EmailStatCard icon={MousePointerClick} label="Clicks" value={totalClicks.toLocaleString()} color="text-violet-600 dark:text-violet-400" />
              <EmailStatCard icon={BarChart3} label="Avg Open Rate" value={`${avgOpenRate}%`} color="text-amber-600 dark:text-amber-400" />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="templates" className="flex-1 sm:flex-none">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex-1 sm:flex-none">
              <Send className="h-4 w-4 mr-2" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex-1 sm:flex-none">
              <Inbox className="h-4 w-4 mr-2" />
              Sent
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Email Templates
              </h2>
              <Link href="/admin/design-studio?type=email">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </Link>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Mail className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No templates yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create your first email template to start sending campaigns.
                  </p>
                  <Link href="/admin/design-studio?type=email">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="overflow-hidden hover:shadow-md transition-all group">
                    {/* Thumbnail */}
                    <div className="aspect-[16/10] bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                      {template.thumbnail ? (
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Mail className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate mb-1">
                        {template.name}
                      </h3>
                      {template.subject && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
                          Subject: {template.subject}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {template.type}
                        </Badge>
                        {template.siteName && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">{template.siteName}</span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                          {formatDate(template.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Link href={`/admin/design-studio?type=email&id=${template.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={async () => {
                          try {
                            // Fetch the full source template to get htmlContent
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
                              loadData();
                            } else {
                              toast.error("Failed to duplicate template");
                            }
                          } catch {
                            toast.error("Failed to duplicate template");
                          }
                        }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Active Campaigns
              </h2>
              <Button size="sm" onClick={() => toast.info("Campaign creation coming soon")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : activeCampaigns.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Send className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No active campaigns</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create a campaign to send emails to your subscribers.
                  </p>
                  <Button onClick={() => toast.info("Campaign creation coming soon")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeCampaigns.map((campaign) => (
                  <CampaignRow key={campaign.id} campaign={campaign} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sent Tab */}
          <TabsContent value="sent" className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Sent Campaigns
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : sentCampaigns.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No sent campaigns</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Sent campaigns and their performance stats will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sentCampaigns.map((campaign) => (
                  <CampaignRow key={campaign.id} campaign={campaign} showStats />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function EmailStatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color} shrink-0`} />
        <div className="min-w-0">
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignRow({ campaign, showStats }: { campaign: Campaign; showStats?: boolean }) {
  const config = CAMPAIGN_STATUS_CONFIG[campaign.status] || CAMPAIGN_STATUS_CONFIG.draft;
  const StatusIcon = config.icon;

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Status + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <StatusIcon
              className={`h-5 w-5 shrink-0 ${
                campaign.status === "sending" ? "animate-spin text-amber-500" : ""
              } ${campaign.status === "sent" ? "text-green-500" : ""} ${
                campaign.status === "failed" ? "text-red-500" : ""
              } ${campaign.status === "scheduled" ? "text-blue-500" : ""} ${
                campaign.status === "draft" ? "text-gray-400" : ""
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {campaign.name}
                </h3>
                <Badge className={`text-xs border-0 ${config.color}`}>
                  {config.label}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {campaign.subject}
              </p>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 shrink-0 flex-wrap">
            {campaign.siteName && (
              <span>{campaign.siteName}</span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {campaign.recipientCount}
            </span>
            {campaign.scheduledFor && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateTime(campaign.scheduledFor)}
              </span>
            )}
            {campaign.sentAt && (
              <span className="flex items-center gap-1">
                <Send className="h-3.5 w-3.5" />
                {formatDateTime(campaign.sentAt)}
              </span>
            )}
          </div>

          {/* Stats (shown on Sent tab) */}
          {showStats && campaign.sentCount > 0 && (
            <div className="flex items-center gap-4 text-xs shrink-0">
              <div className="text-center">
                <p className="font-semibold text-gray-900 dark:text-white">{campaign.sentCount}</p>
                <p className="text-gray-400">Sent</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-green-600 dark:text-green-400">{openRate(campaign)}</p>
                <p className="text-gray-400">Opens</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-violet-600 dark:text-violet-400">{clickRate(campaign)}</p>
                <p className="text-gray-400">Clicks</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
