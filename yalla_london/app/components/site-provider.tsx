"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Site } from "@/lib/prisma-types";

/**
 * Fallback sites matching config/sites.ts identities.
 * IDs MUST match the actual site IDs used by cron jobs, SEO agent, and middleware.
 * The API at /api/admin/sites replaces these with DB data on mount.
 */
function makeSite(
  id: string, name: string, slug: string, domain: string,
  locale: string, direction: string, primaryColor: string, secondaryColor: string,
): Site {
  return {
    id, name, slug, domain, theme_id: null, settings_json: {}, homepage_json: null,
    logo_url: null, is_active: true, created_at: new Date(), updated_at: new Date(),
    default_locale: locale, direction, favicon_url: null,
    primary_color: primaryColor, secondary_color: secondaryColor, features_json: null,
  };
}

const DEFAULT_SITE: Site = makeSite(
  "yalla-london", "Yalla London", "yalla-london", "yalla-london.com",
  "en", "ltr", "#1C1917", "#C8322B",
);

const FALLBACK_SITES: Site[] = [
  DEFAULT_SITE,
  makeSite("arabaldives", "Arab Aldives", "arabaldives", "arabaldives.com", "ar", "rtl", "#0C4A6E", "#0EA5E9"),
  makeSite("dubai", "Dubai Travel Guide", "dubai", "arabluxurytravel.com", "en", "ltr", "#B45309", "#F59E0B"),
  makeSite("istanbul", "Istanbul Guide", "istanbul", "arabistanbul.com", "en", "ltr", "#DC2626", "#F97316"),
  makeSite("thailand", "Thailand Guide", "thailand", "arabtravels.com", "en", "ltr", "#059669", "#10B981"),
];

interface SiteContextType {
  // Current site
  currentSite: Site;
  setCurrentSite: (site: Site) => void;

  // All available sites
  sites: Site[];
  setSites: (sites: Site[]) => void;

  // Site loading state
  isLoading: boolean;

  // Helpers
  getSiteById: (id: string) => Site | undefined;
  getSiteBySlug: (slug: string) => Site | undefined;

  // Refresh sites from API
  refreshSites: () => Promise<void>;
}

const SiteContext = createContext<SiteContextType | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [currentSite, setCurrentSiteState] = useState<Site>(DEFAULT_SITE);
  const [sites, setSites] = useState<Site[]>(FALLBACK_SITES);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load saved site preference from localStorage, then refresh from API
  useEffect(() => {
    const savedSiteId = localStorage.getItem("admin_current_site_id");
    if (savedSiteId) {
      const savedSite = sites.find((s) => s.id === savedSiteId);
      if (savedSite) {
        setCurrentSiteState(savedSite);
      }
    }
    setMounted(true);
    setIsLoading(false);

    // Fetch real sites from API on mount
    fetch("/api/admin/sites")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.sites && Array.isArray(data.sites) && data.sites.length > 0) {
          setSites(data.sites);
          // Restore saved site from real data
          if (savedSiteId) {
            const realSite = data.sites.find((s: Site) => s.id === savedSiteId);
            if (realSite) setCurrentSiteState(realSite);
          }
        }
      })
      .catch(() => {
        // Keep using default sites on error
      });
  }, []);

  // Save site preference to localStorage when it changes
  const setCurrentSite = useCallback((site: Site) => {
    setCurrentSiteState(site);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_current_site_id", site.id);
    }
  }, []);

  // Helper to get site by ID
  const getSiteById = useCallback(
    (id: string) => {
      return sites.find((s) => s.id === id);
    },
    [sites],
  );

  // Helper to get site by slug
  const getSiteBySlug = useCallback(
    (slug: string) => {
      return sites.find((s) => s.slug === slug);
    },
    [sites],
  );

  // Refresh sites from API
  const refreshSites = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/sites");
      if (response.ok) {
        const data = await response.json();
        if (data.sites && Array.isArray(data.sites)) {
          setSites(data.sites);
          // Update current site if it still exists
          const updatedCurrentSite = data.sites.find(
            (s: Site) => s.id === currentSite.id,
          );
          if (updatedCurrentSite) {
            setCurrentSiteState(updatedCurrentSite);
          }
        }
      }
    } catch (error) {
      console.error("Failed to refresh sites:", error);
      // Keep using fallback sites on error
    } finally {
      setIsLoading(false);
    }
  }, [currentSite.id]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <SiteContext.Provider
      value={{
        currentSite,
        setCurrentSite,
        sites,
        setSites,
        isLoading,
        getSiteById,
        getSiteBySlug,
        refreshSites,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error("useSite must be used within SiteProvider");
  }
  return context;
}

// Hook for getting the current site ID for API calls
export function useSiteId() {
  const { currentSite } = useSite();
  return currentSite.id;
}

// Hook for site-scoped data fetching
export function useSiteData<T>(
  fetcher: (siteId: string) => Promise<T>,
  dependencies: any[] = [],
) {
  const { currentSite, isLoading: siteLoading } = useSite();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (siteLoading) return;

    setIsLoading(true);
    setError(null);

    fetcher(currentSite.id)
      .then((result) => {
        setData(result);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, [currentSite.id, siteLoading, ...dependencies]);

  return {
    data,
    isLoading: isLoading || siteLoading,
    error,
    siteId: currentSite.id,
  };
}
