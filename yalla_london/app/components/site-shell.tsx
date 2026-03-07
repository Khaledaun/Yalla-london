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
import { isYachtSite as checkYacht } from '@/config/sites';

/**
 * SiteShell — Renders the correct header/footer based on siteId.
 * This is the hermetic separation boundary between sites.
 * Each site gets its own navigation, branding, and footer.
 */
export function SiteShell({
  siteId,
  children,
}: {
  siteId: string;
  children: React.ReactNode;
}) {
  const isYachtSite = checkYacht(siteId);

  if (isYachtSite) {
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
      <main id="main-content" className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}
