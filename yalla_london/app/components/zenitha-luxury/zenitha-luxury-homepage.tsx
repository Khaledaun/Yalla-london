'use client';

import { HeroSection } from './sections/hero-section';
import { Divider } from './sections/divider';
import { AboutSection } from './sections/about-section';
import { PartnershipsSection } from './sections/partnerships-section';
import { AmbassadorsSection } from './sections/ambassadors-section';
import { ServicesTabsSection } from './sections/services-tabs-section';
import { ComingSoonSection } from './sections/coming-soon-section';
import { YallaLondonSection } from './sections/yalla-london-section';
import { ZenithaYachtsSection } from './sections/zenitha-yachts-section';
import { ContactSection } from './sections/contact-section';

/**
 * ZenithaLuxuryHomepage — Full single-page scrolling landing page.
 *
 * Identity: "An AI venture studio for next-generation travel brands."
 *
 * Section order:
 * 1. Hero (#top) — Venture studio positioning
 * 2. About (#about) — Studio pillars
 * 3. Partnerships (#partnerships) — 4 collaboration models
 * 4. Ambassadors — Real people, real journeys
 * 5. Products (#products) — Tabbed live products + gallery
 * 6. Coming Soon (#coming-soon) — Pipeline brands
 * 7. Portfolio: Yalla London (#portfolio) — Detail
 * 8. Portfolio: Zenitha Yachts (#zenitha-yachts) — Detail (reversed)
 * 9. Contact (#contact) — Partnership-first form
 */
export function ZenithaLuxuryHomepage() {
  return (
    <main style={{ background: 'var(--zl-obsidian)', color: 'var(--zl-ivory)' }}>
      <HeroSection />
      <Divider />
      <AboutSection />
      <Divider />
      <PartnershipsSection />
      <Divider />
      <AmbassadorsSection />
      <Divider />
      <ServicesTabsSection />
      <Divider />
      <ComingSoonSection />
      <Divider />
      <YallaLondonSection />
      <Divider />
      <ZenithaYachtsSection />
      <Divider />
      <ContactSection />
    </main>
  );
}
