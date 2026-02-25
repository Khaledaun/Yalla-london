'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { Mail, MessageCircle, Instagram, Linkedin, Anchor } from 'lucide-react';
import { getCopyrightLine } from '@/config/entity';
import { ZENITHA_CONTACT } from './zenitha-config';

/* ════════════════════════════════════════════════════════════════════
   FOOTER NAV — aligned with header nav + legal/social
   ════════════════════════════════════════════════════════════════════ */

const FOOTER_SECTIONS = {
  explore: {
    title: { en: 'Explore', ar: 'استكشف' },
    links: [
      { label: { en: 'Fleet', ar: 'الأسطول' }, href: '/fleet' },
      { label: { en: 'Destinations', ar: 'الوجهات' }, href: '/destinations' },
      { label: { en: 'How It Works', ar: 'كيف يعمل' }, href: '/how-it-works' },
      { label: { en: 'Journal', ar: 'المجلة' }, href: '/journal' },
    ],
  },
  destinations: {
    title: { en: 'Destinations', ar: 'الوجهات' },
    links: [
      { label: { en: 'Greek Islands', ar: 'الجزر اليونانية' }, href: '/destinations/greek-islands' },
      { label: { en: 'Croatian Coast', ar: 'ساحل كرواتيا' }, href: '/destinations/croatian-coast' },
      { label: { en: 'Turkish Riviera', ar: 'الريفيرا التركية' }, href: '/destinations/turkish-riviera' },
      { label: { en: 'French Riviera', ar: 'الريفيرا الفرنسية' }, href: '/destinations/french-riviera' },
      { label: { en: 'Amalfi Coast', ar: 'ساحل أمالفي' }, href: '/destinations/amalfi-coast' },
      { label: { en: 'Dubai & Abu Dhabi', ar: 'دبي وأبوظبي' }, href: '/destinations/arabian-gulf' },
    ],
  },
  company: {
    title: { en: 'Company', ar: 'الشركة' },
    links: [
      { label: { en: 'About Us', ar: 'عن زينيثا' }, href: '/about' },
      { label: { en: 'Contact', ar: 'تواصل معنا' }, href: '/contact' },
      { label: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' }, href: '/privacy' },
      { label: { en: 'Terms of Service', ar: 'الشروط والأحكام' }, href: '/terms' },
    ],
  },
};

/* ════════════════════════════════════════════════════════════════════
   FOOTER COMPONENT
   ════════════════════════════════════════════════════════════════════ */

export function ZenithaFooter() {
  const { language, isRTL } = useLanguage();
  const t = (obj: { en: string; ar: string }) => obj[language as 'en' | 'ar'] || obj.en;

  return (
    <footer
      className="text-white"
      style={{ background: 'var(--z-navy, #0a1628)' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top accent */}
      <div
        className="h-[2px] w-full"
        style={{ background: 'linear-gradient(to right, var(--z-sea,#0ea5a2), var(--z-gold,#c9a96e), var(--z-sea,#0ea5a2))' }}
      />

      {/* ── Main grid ── */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand column — 2 cols wide */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-5">
              <Anchor size={26} style={{ color: 'var(--z-gold, #c9a96e)' }} />
              <div className="flex flex-col leading-none">
                <span className="font-display text-xl font-bold tracking-tight text-white">ZENITHA</span>
                <span className="text-[10px] font-heading font-semibold tracking-[0.22em] uppercase text-white/45">YACHTS</span>
              </div>
            </div>

            {/* Brand description — global audience, specific countries */}
            <p className="text-[15px] font-body leading-relaxed text-white/60 max-w-sm mb-2">
              {t({
                en: 'Luxury private yacht charters across the Mediterranean, Adriatic, Aegean, and selected global destinations.',
                ar: 'استئجار يخوت فاخرة خاصة عبر البحر المتوسط والأدرياتيكي وبحر إيجة ووجهات عالمية مختارة.',
              })}
            </p>
            <p className="text-sm font-body leading-relaxed text-white/45 max-w-sm mb-6">
              {t({
                en: 'Tailored experiences for travellers from the United Kingdom, France, Germany, Italy, the United States, Canada, Saudi Arabia, the UAE, Qatar, Kuwait, Egypt, Singapore, and Australia.',
                ar: 'تجارب مصممة خصيصاً للمسافرين من المملكة المتحدة وفرنسا وألمانيا وإيطاليا والولايات المتحدة وكندا والسعودية والإمارات وقطر والكويت ومصر وسنغافورة وأستراليا.',
              })}
            </p>

            {/* Contact links */}
            <div className="space-y-2.5">
              <a
                href={`mailto:${ZENITHA_CONTACT.email}`}
                className="flex items-center gap-2 text-sm text-white/55 hover:text-[var(--z-gold,#c9a96e)] transition-colors"
              >
                <Mail size={15} /> {ZENITHA_CONTACT.email}
              </a>
              {ZENITHA_CONTACT.whatsapp && (
                <a
                  href={`https://wa.me/${ZENITHA_CONTACT.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/55 hover:text-[var(--z-gold,#c9a96e)] transition-colors"
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}
            </div>

            {/* Social — only render if URLs configured */}
            {(ZENITHA_CONTACT.instagram || ZENITHA_CONTACT.linkedin) && (
              <div className="flex items-center gap-3 mt-5">
                {ZENITHA_CONTACT.instagram && (
                  <a
                    href={ZENITHA_CONTACT.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-white/15 text-white/50 hover:border-[var(--z-gold,#c9a96e)] hover:text-[var(--z-gold,#c9a96e)] transition-colors"
                  >
                    <Instagram size={16} />
                  </a>
                )}
                {ZENITHA_CONTACT.linkedin && (
                  <a
                    href={ZENITHA_CONTACT.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-white/15 text-white/50 hover:border-[var(--z-gold,#c9a96e)] hover:text-[var(--z-gold,#c9a96e)] transition-colors"
                  >
                    <Linkedin size={16} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Nav columns */}
          {Object.values(FOOTER_SECTIONS).map((section, i) => (
            <div key={i}>
              <h3
                className="text-xs font-heading font-semibold uppercase tracking-[0.14em] mb-4"
                style={{ color: 'var(--z-gold, #c9a96e)' }}
              >
                {t(section.title)}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link, li) => (
                  <li key={li}>
                    <Link
                      href={link.href}
                      className="text-sm font-body text-white/55 hover:text-white transition-colors duration-200"
                    >
                      {t(link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-white/35 font-body">
            {getCopyrightLine((language as 'en' | 'ar') || 'en')}
            {' · '}
            <span className="text-white/25">Zenitha.Luxury LLC · Delaware, USA</span>
          </p>
          <div className="flex items-center gap-4 text-xs text-white/35 font-body">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">
              {t({ en: 'Privacy', ar: 'الخصوصية' })}
            </Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">
              {t({ en: 'Terms', ar: 'الشروط' })}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
