'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { Mail, MessageCircle, Instagram, Linkedin, Anchor } from 'lucide-react';
import { ENTITY, getCopyrightLine } from '@/config/entity';

const FOOTER_NAV = {
  destinations: {
    title: { en: 'Destinations', ar: 'الوجهات' },
    links: [
      { label: { en: 'Greek Islands', ar: 'الجزر اليونانية' }, href: '/destinations/greek-islands' },
      { label: { en: 'Croatian Coast', ar: 'ساحل كرواتيا' }, href: '/destinations/croatian-coast' },
      { label: { en: 'Turkish Riviera', ar: 'الريفيرا التركية' }, href: '/destinations/turkish-riviera' },
      { label: { en: 'French Riviera', ar: 'الريفيرا الفرنسية' }, href: '/destinations/french-riviera' },
      { label: { en: 'Arabian Gulf', ar: 'الخليج العربي' }, href: '/destinations/arabian-gulf' },
      { label: { en: 'Red Sea', ar: 'البحر الأحمر' }, href: '/destinations/red-sea' },
    ],
  },
  charter: {
    title: { en: 'Charter', ar: 'استئجار' },
    links: [
      { label: { en: 'Browse Yachts', ar: 'تصفح اليخوت' }, href: '/yachts' },
      { label: { en: 'AI Planner', ar: 'مخطط ذكي' }, href: '/charter-planner' },
      { label: { en: 'Inquiry Form', ar: 'نموذج الاستفسار' }, href: '/inquiry' },
      { label: { en: 'Itineraries', ar: 'المسارات' }, href: '/itineraries' },
      { label: { en: 'Charter Types', ar: 'أنواع الاستئجار' }, href: '/how-it-works' },
    ],
  },
  company: {
    title: { en: 'Company', ar: 'الشركة' },
    links: [
      { label: { en: 'About Us', ar: 'عن زينيثا' }, href: '/about' },
      { label: { en: 'How It Works', ar: 'كيف يعمل' }, href: '/how-it-works' },
      { label: { en: 'Blog', ar: 'المدونة' }, href: '/blog' },
      { label: { en: 'FAQ', ar: 'الأسئلة الشائعة' }, href: '/faq' },
      { label: { en: 'Contact', ar: 'تواصل معنا' }, href: '/contact' },
      { label: { en: 'Privacy', ar: 'الخصوصية' }, href: '/privacy' },
      { label: { en: 'Terms', ar: 'الشروط' }, href: '/terms' },
    ],
  },
};

export function ZenithaFooter() {
  const { language, isRTL } = useLanguage();
  const t = (obj: { en: string; ar: string }) => obj[language as 'en' | 'ar'] || obj.en;

  return (
    <footer className="bg-[var(--z-navy)] text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Gold accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[var(--z-aegean)] via-[var(--z-gold)] to-[var(--z-aegean)]" />

      {/* Main Footer */}
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-5">
              <Anchor size={28} className="text-[var(--z-gold)]" />
              <div className="flex flex-col leading-none">
                <span className="font-display text-xl font-bold tracking-tight text-white">ZENITHA</span>
                <span className="text-[9px] font-heading font-semibold tracking-[0.2em] uppercase text-white/50">YACHTS</span>
              </div>
            </div>
            <p className="text-[var(--z-shallow)] text-sm font-body leading-relaxed max-w-xs mb-6">
              {language === 'ar'
                ? 'استئجار يخوت فاخرة في البحر المتوسط والخليج العربي وما وراءهما. طعام حلال. طواقم محترفة. رحلات مصممة خصيصاً لك.'
                : 'Curated yacht charters across the Mediterranean, Arabian Gulf, and beyond. Halal catering. Professional crews. Tailored itineraries.'}
            </p>
            {/* Contact */}
            <div className="space-y-2.5">
              <a href="mailto:hello@zenithayachts.com" className="flex items-center gap-2 text-sm text-[var(--z-shallow)] hover:text-[var(--z-gold)] transition-colors">
                <Mail size={16} /> hello@zenithayachts.com
              </a>
              <a href="https://wa.me/44000000000" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[var(--z-shallow)] hover:text-[var(--z-gold)] transition-colors">
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
            {/* Social */}
            <div className="flex items-center gap-3 mt-5">
              <a href="#" aria-label="Instagram" className="w-9 h-9 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:border-[var(--z-gold)] hover:text-[var(--z-gold)] transition-colors">
                <Instagram size={16} />
              </a>
              <a href="#" aria-label="LinkedIn" className="w-9 h-9 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:border-[var(--z-gold)] hover:text-[var(--z-gold)] transition-colors">
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          {/* Navigation Columns */}
          {Object.values(FOOTER_NAV).map((section, index) => (
            <div key={index}>
              <h3 className="text-xs font-heading font-semibold uppercase tracking-[0.12em] text-[var(--z-gold)] mb-4">
                {t(section.title)}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link, li) => (
                  <li key={li}>
                    <Link
                      href={link.href}
                      className="text-sm font-body text-[var(--z-shallow)] hover:text-white transition-colors duration-200"
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

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-white/40 font-body">
            {getCopyrightLine((language as 'en' | 'ar') || 'en')}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-white/40 hover:text-white/70 transition-colors font-body">
              {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
            <Link href="/terms" className="text-xs text-white/40 hover:text-white/70 transition-colors font-body">
              {language === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}
            </Link>
            <span className="text-xs text-white/30 font-body">
              {language === 'ar' ? 'خيارات حلال معتمدة متوفرة' : 'Certified Halal Options Available'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
