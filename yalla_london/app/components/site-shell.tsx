// SiteShell is intentionally a SERVER component — no 'use client'.
// ZenithaHeader, ZenithaFooter, DynamicHeader, Footer each carry their own
// 'use client' boundary. Making SiteShell a server component ensures the
// correct header/footer is selected server-side and included in the initial
// HTML response without any hydration delay or client-side branching.

import React from 'react';
import { DynamicHeader } from '@/components/dynamic-header';
import { Footer } from '@/components/footer';
import { ZenithaHeader } from '@/components/zenitha/zenitha-header';
import { ZenithaFooter } from '@/components/zenitha/zenitha-footer';
import { ZenithaLuxuryHeader } from '@/components/zenitha-luxury/zenitha-luxury-header';
import { ZenithaLuxuryFooter } from '@/components/zenitha-luxury/zenitha-luxury-footer';
import { isYachtSite as checkYacht, isParentBrandSite as checkParent } from '@/config/sites';
import { PageWatermarks } from '@/components/brand-kit';

/**
 * SiteShell — Renders the correct header/footer based on siteId.
 * This is the hermetic separation boundary between sites.
 * Each site gets its own navigation, branding, and footer.
 *
 * Admin routes (/admin/*) get NO public header/footer — the admin layout
 * (MophyAdminLayout) provides its own sidebar, header, and bottom nav.
 */
export function SiteShell({
  siteId,
  children,
  isAdmin = false,
}: {
  siteId: string;
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  // Admin pages: no public chrome — MophyAdminLayout handles its own layout
  if (isAdmin) {
    return <>{children}</>;
  }

  if (checkParent(siteId)) {
    return (
      <div className="min-h-screen flex flex-col">
        <ZenithaLuxuryHeader />
        <main id="main-content" className="flex-1 pt-[72px]">{children}</main>
        <ZenithaLuxuryFooter />
      </div>
    );
  }

  if (checkYacht(siteId)) {
    return (
      <div className="min-h-screen flex flex-col zenitha-site">
        <ZenithaHeader />
        <main id="main-content" className="flex-1 pt-[72px]">{children}</main>
        <ZenithaFooter />
      </div>
    );
  }

  // Default: Yalla London / travel blog sites
  return (
    <div className="min-h-screen flex flex-col">
      <DynamicHeader />
      <PageWatermarks />
      <main id="main-content" className="flex-1 pt-24">{children}</main>
      <Footer />
    </div>
  );
}
