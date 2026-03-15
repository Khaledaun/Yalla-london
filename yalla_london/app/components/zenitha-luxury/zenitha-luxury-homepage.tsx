'use client';

import { HeroSection } from './sections/hero-section';
import { Divider } from './sections/divider';
import { AboutSection } from './sections/about-section';
import { ServicesTabsSection } from './sections/services-tabs-section';
import { ComingSoonSection } from './sections/coming-soon-section';
import { YallaLondonSection } from './sections/yalla-london-section';
import { ZenithaYachtsSection } from './sections/zenitha-yachts-section';
import { ContactSection } from './sections/contact-section';

/**
 * ZenithaLuxuryHomepage — Full single-page scrolling landing page.
 * Section order matches zenitha-layout-skeleton.html exactly:
 *
 * 1. Hero (#top) — Split 2-column
 * 2. Divider
 * 3. About (#about) — 2-column with pillars
 * 4. Divider
 * 5. Services (#services) — Tabbed panels + gallery strip
 * 6. Divider
 * 7. Coming Soon (#coming-soon) — 3-column cards
 * 8. Divider
 * 9. Yalla London (#yalla-london) — Detail section
 * 10. Divider
 * 11. Zenitha Yachts (#zenitha-yachts) — Detail section (reversed)
 * 12. Divider
 * 13. Contact (#contact) — 2-column form
 */
export function ZenithaLuxuryHomepage() {
  return (
    <main style={{ background: 'var(--zl-obsidian)', color: 'var(--zl-ivory)' }}>
      <HeroSection />
      <Divider />
      <AboutSection />
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
