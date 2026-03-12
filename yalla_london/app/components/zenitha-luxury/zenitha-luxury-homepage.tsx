'use client';

import { HeroSection } from './sections/hero-section';
import { IntroSection } from './sections/intro-section';
import { ProcessSection } from './sections/process-section';
import { ValuesSection } from './sections/values-section';
import { ServicesSection } from './sections/services-section';
import { PortfolioSection } from './sections/portfolio-section';
import { TestimonialsSection } from './sections/testimonials-section';
import { ContactSection } from './sections/contact-section';
import { FAQSection } from './sections/faq-section';

/**
 * ZenithaLuxuryHomepage — Full single-page scrolling landing page.
 * Nest-inspired editorial layout with alternating dark/darker sections.
 *
 * Section order:
 * 1. Hero (full viewport)
 * 2. Intro / Who We Are (with AEO summary)
 * 3. Process / How We Work (4 steps)
 * 4. Services / What We Build (9 cards)
 * 5. Portfolio / Our Brands (6 brand cards)
 * 6. Values / What We Believe (6 cards)
 * 7. Testimonials (carousel)
 * 8. FAQ (accordion, structured for schema)
 * 9. Contact / CTA (form + company details)
 */
export function ZenithaLuxuryHomepage() {
  return (
    <div style={{ background: 'var(--zl-obsidian)', color: 'var(--zl-ivory)' }}>
      <HeroSection />
      <IntroSection />
      <ProcessSection />
      <ServicesSection />
      <PortfolioSection />
      <ValuesSection />
      <TestimonialsSection />
      <FAQSection />
      <ContactSection />
    </div>
  );
}
