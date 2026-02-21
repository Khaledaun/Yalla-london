'use client';

import { DynamicHeader } from '@/components/dynamic-header';
import { Footer } from '@/components/footer';
import { ZenithaHeader } from '@/components/zenitha/zenitha-header';
import { ZenithaFooter } from '@/components/zenitha/zenitha-footer';

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
  const isYachtSite = siteId === 'zenitha-yachts-med';

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
