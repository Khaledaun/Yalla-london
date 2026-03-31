"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  ExternalLink,
  FileText,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminCard,
  AdminEmptyState,
  AdminAlertBanner,
} from "@/components/admin/admin-ui";

interface TeamMember {
  id: string;
  name_en: string;
  name_ar: string | null;
  slug: string;
  title_en: string;
  title_ar: string | null;
  bio_en: string;
  bio_ar: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  site_id: string | null;
  site?: { slug: string; name: string } | null;
  _count?: { content_credits: number };
  content_credits?: { id: string }[];
}

export default function MembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMembers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/admin/team?limit=50&include_inactive=true"
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Failed to fetch team members (${res.status}): ${text.slice(0, 200)}`
        );
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMembers(json.data);
      } else {
        setMembers([]);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load team members";
      console.warn("[members-page] fetch error:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  const activeMembers = members.filter((m) => m.is_active);
  const inactiveMembers = members.filter((m) => !m.is_active);

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function getSiteLabel(member: TeamMember): string {
    if (member.site?.name) return member.site.name;
    if (member.site?.slug) return member.site.slug;
    if (!member.site_id) return "All Sites (Global)";
    return member.site_id;
  }

  function getArticleCount(member: TeamMember): number {
    if (member._count?.content_credits != null) {
      return member._count.content_credits;
    }
    if (Array.isArray(member.content_credits)) {
      return member.content_credits.length;
    }
    return 0;
  }

  function truncateBio(bio: string, maxLen = 160): string {
    if (!bio || bio.length <= maxLen) return bio || "";
    return bio.slice(0, maxLen).replace(/\s+\S*$/, "") + "...";
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
      <AdminPageHeader
        title="Author Profiles"
        subtitle="E-E-A-T bylines used on published articles"
        action={
          <button
            onClick={fetchMembers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg
              bg-white border border-[rgba(214,208,196,0.6)] text-stone-600
              hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        }
      />

      {/* Explanation banner */}
      <AdminCard className="mb-5 !bg-[#F0F4F8] !border-[#3B7EA1]/20">
        <div className="flex gap-3 items-start">
          <Info size={18} className="text-[#3B7EA1] mt-0.5 flex-shrink-0" />
          <div className="text-[13px] text-stone-600 leading-relaxed">
            <p className="font-medium text-stone-700 mb-1">
              Author Profiles for E-E-A-T Compliance
            </p>
            <p>
              These profiles appear as bylines on published articles. Google's
              January 2026 Authenticity Update demotes anonymous content —
              named authors with bios and social links strengthen E-E-A-T
              signals. The content pipeline assigns authors via load-balanced
              rotation (fewest recent articles first).
            </p>
          </div>
        </div>
      </AdminCard>

      {/* Error state */}
      {error && (
        <div className="mb-5">
          <AdminAlertBanner
            severity="critical"
            message={error}
          />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw
            size={24}
            className="animate-spin text-stone-400"
          />
          <span className="ml-3 text-[14px] text-stone-500">
            Loading author profiles...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && members.length === 0 && (
        <AdminEmptyState
          icon={Users}
          title="No Author Profiles Configured"
          description='No TeamMember records found in the database. The content pipeline falls back to generic "Editorial Team" bylines. Add authors via /api/admin/team to strengthen E-E-A-T signals.'
        />
      )}

      {/* Active members */}
      {!loading && activeMembers.length > 0 && (
        <>
          <h2 className="text-[14px] font-semibold text-stone-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2D5A3D]" />
            Active Authors ({activeMembers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {activeMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                getInitials={getInitials}
                getSiteLabel={getSiteLabel}
                getArticleCount={getArticleCount}
                truncateBio={truncateBio}
              />
            ))}
          </div>
        </>
      )}

      {/* Inactive members */}
      {!loading && inactiveMembers.length > 0 && (
        <>
          <h2 className="text-[14px] font-semibold text-stone-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-stone-300" />
            Inactive ({inactiveMembers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
            {inactiveMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                getInitials={getInitials}
                getSiteLabel={getSiteLabel}
                getArticleCount={getArticleCount}
                truncateBio={truncateBio}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MemberCard({
  member,
  getInitials,
  getSiteLabel,
  getArticleCount,
  truncateBio,
}: {
  member: TeamMember;
  getInitials: (name: string) => string;
  getSiteLabel: (m: TeamMember) => string;
  getArticleCount: (m: TeamMember) => number;
  truncateBio: (bio: string, max?: number) => string;
}) {
  const articleCount = getArticleCount(member);
  const socialLinks = [
    { url: member.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { url: member.twitter_url, icon: Twitter, label: "X / Twitter" },
    { url: member.instagram_url, icon: Instagram, label: "Instagram" },
    { url: member.website_url, icon: ExternalLink, label: "Website" },
  ].filter((s) => s.url);

  return (
    <AdminCard className="!p-0 overflow-hidden">
      {/* Header with avatar + name */}
      <div className="flex items-start gap-3.5 p-4 pb-3">
        {/* Avatar or initials */}
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.name_en}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-[rgba(214,208,196,0.4)]"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center
              bg-gradient-to-br from-[#3B7EA1]/20 to-[#C49A2A]/20 text-[#3B7EA1]
              font-semibold text-[15px] border border-[rgba(214,208,196,0.4)]"
          >
            {getInitials(member.name_en)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Name */}
          <h3 className="text-[15px] font-semibold text-stone-800 leading-tight truncate">
            {member.name_en}
          </h3>
          {member.name_ar && (
            <p
              className="text-[13px] text-stone-500 leading-tight mt-0.5 truncate"
              dir="rtl"
            >
              {member.name_ar}
            </p>
          )}
          {/* Title */}
          <p className="text-[12px] text-[#3B7EA1] font-medium mt-1 truncate">
            {member.title_en}
          </p>
        </div>

        {/* Featured badge */}
        {member.is_featured && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#C49A2A]/10 text-[#C49A2A] flex-shrink-0">
            FEATURED
          </span>
        )}
      </div>

      {/* Bio excerpt */}
      {member.bio_en && (
        <p className="px-4 text-[12px] text-stone-500 leading-relaxed line-clamp-3">
          {truncateBio(member.bio_en, 180)}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-3 px-4 py-3 mt-2 border-t border-[rgba(214,208,196,0.4)] bg-[var(--admin-bg)]/50">
        {/* Site badge */}
        <span className="flex items-center gap-1 text-[11px] text-stone-500">
          <Globe size={12} className="text-stone-400" />
          {getSiteLabel(member)}
        </span>

        {/* Article count */}
        <span className="flex items-center gap-1 text-[11px] text-stone-500">
          <FileText size={12} className="text-stone-400" />
          {articleCount} article{articleCount !== 1 ? "s" : ""}
        </span>

        {/* Social links */}
        {socialLinks.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-400 hover:text-[#3B7EA1] transition-colors"
                title={link.label}
              >
                <link.icon size={13} />
              </a>
            ))}
          </div>
        )}
      </div>
    </AdminCard>
  );
}
