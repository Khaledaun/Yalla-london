'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { ENTITY } from '@/config/entity'
import {
  Anchor,
  Shield,
  Heart,
  Users,
  Compass,
  Award,
  Mail,
  Globe,
} from 'lucide-react'

export default function AboutZenithaYachts() {
  const { language, isRTL } = useLanguage()
  const isEn = language === 'en'

  const values = [
    {
      icon: Compass,
      title_en: 'Curation',
      title_ar: '\u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0621',
      desc_en:
        'Every yacht in our portfolio is personally inspected. We visit marinas, walk the decks, and interview captains before any vessel earns a place on Zenitha. We reject more boats than we accept.',
      desc_ar:
        '\u0643\u0644 \u064a\u062e\u062a \u0641\u064a \u0645\u062d\u0641\u0638\u062a\u0646\u0627 \u064a\u062a\u0645 \u0641\u062d\u0635\u0647 \u0634\u062e\u0635\u064a\u0627\u064b. \u0646\u0632\u0648\u0631 \u0627\u0644\u0645\u0631\u0627\u0633\u064a \u0648\u0646\u0645\u0634\u064a \u0639\u0644\u0649 \u0627\u0644\u0633\u0637\u062d \u0648\u0646\u0642\u0627\u0628\u0644 \u0627\u0644\u0642\u0628\u0627\u0637\u0646\u0629 \u0642\u0628\u0644 \u0627\u0639\u062a\u0645\u0627\u062f \u0623\u064a \u0642\u0627\u0631\u0628.',
    },
    {
      icon: Heart,
      title_en: 'Cultural Sensitivity',
      title_ar: '\u0627\u0644\u062d\u0633\u0627\u0633\u064a\u0629 \u0627\u0644\u062b\u0642\u0627\u0641\u064a\u0629',
      desc_en:
        'We understand the needs of Arab and Muslim travelers. Halal catering, prayer-time awareness, family privacy, and crew who respect cultural expectations are not add-ons \u2014 they are built into every charter we arrange.',
      desc_ar:
        '\u0646\u062a\u0641\u0647\u0645 \u0627\u062d\u062a\u064a\u0627\u062c\u0627\u062a \u0627\u0644\u0645\u0633\u0627\u0641\u0631\u064a\u0646 \u0627\u0644\u0639\u0631\u0628 \u0648\u0627\u0644\u0645\u0633\u0644\u0645\u064a\u0646. \u0627\u0644\u0637\u0639\u0627\u0645 \u0627\u0644\u062d\u0644\u0627\u0644 \u0648\u0645\u0631\u0627\u0639\u0627\u0629 \u0623\u0648\u0642\u0627\u062a \u0627\u0644\u0635\u0644\u0627\u0629 \u0648\u062e\u0635\u0648\u0635\u064a\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0644\u064a\u0633\u062a \u0625\u0636\u0627\u0641\u0627\u062a \u0628\u0644 \u0623\u0633\u0627\u0633\u064a\u0627\u062a.',
    },
    {
      icon: Shield,
      title_en: 'Seamless Service',
      title_ar: '\u062e\u062f\u0645\u0629 \u0633\u0644\u0633\u0629',
      desc_en:
        'From the first inquiry to the moment you step off the yacht, one dedicated charter advisor handles everything. Visa logistics, provisioning, crew briefings, itinerary adjustments \u2014 we handle the complexity so you enjoy the sea.',
      desc_ar:
        '\u0645\u0646 \u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u0627\u0644\u0623\u0648\u0644 \u062d\u062a\u0649 \u0644\u062d\u0638\u0629 \u0646\u0632\u0648\u0644\u0643 \u0645\u0646 \u0627\u0644\u064a\u062e\u062a\u060c \u0645\u0633\u062a\u0634\u0627\u0631 \u0645\u062e\u0635\u0635 \u0648\u0627\u062d\u062f \u064a\u062a\u0648\u0644\u0649 \u0643\u0644 \u0634\u064a\u0621.',
    },
  ]

  const team = [
    {
      name_en: 'Khaled N. Aun',
      name_ar: '\u062e\u0627\u0644\u062f \u0646. \u0639\u0648\u0646',
      role_en: 'Founder & CEO',
      role_ar: '\u0627\u0644\u0645\u0624\u0633\u0633 \u0648\u0627\u0644\u0631\u0626\u064a\u0633 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a',
      bio_en:
        'A Lebanese-American entrepreneur with deep roots in Gulf hospitality and a passion for the sea. Khaled founded Zenitha to bridge the gap between world-class yacht experiences and the cultural expectations of Arab travelers.',
      bio_ar:
        '\u0631\u0627\u0626\u062f \u0623\u0639\u0645\u0627\u0644 \u0644\u0628\u0646\u0627\u0646\u064a-\u0623\u0645\u0631\u064a\u0643\u064a \u0630\u0648 \u062c\u0630\u0648\u0631 \u0639\u0645\u064a\u0642\u0629 \u0641\u064a \u0636\u064a\u0627\u0641\u0629 \u0627\u0644\u062e\u0644\u064a\u062c \u0648\u0634\u063a\u0641 \u0628\u0627\u0644\u0628\u062d\u0631.',
      initials: 'KA',
    },
    {
      name_en: 'Charter Advisory Team',
      name_ar: '\u0641\u0631\u064a\u0642 \u0627\u0633\u062a\u0634\u0627\u0631\u0627\u062a \u0627\u0644\u0625\u064a\u062c\u0627\u0631',
      role_en: 'Yacht Specialists',
      role_ar: '\u0645\u062a\u062e\u0635\u0635\u0648 \u064a\u062e\u0648\u062a',
      bio_en:
        'Bilingual charter advisors with first-hand sailing experience across the Mediterranean, Arabian Gulf, and Red Sea. Each team member has logged thousands of nautical miles and personally inspected dozens of yachts.',
      bio_ar:
        '\u0645\u0633\u062a\u0634\u0627\u0631\u0648\u0646 \u062b\u0646\u0627\u0626\u064a\u0648 \u0627\u0644\u0644\u063a\u0629 \u0645\u0639 \u062e\u0628\u0631\u0629 \u0625\u0628\u062d\u0627\u0631 \u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0628\u0631 \u0627\u0644\u0628\u062d\u0631 \u0627\u0644\u0645\u062a\u0648\u0633\u0637 \u0648\u0627\u0644\u062e\u0644\u064a\u062c \u0627\u0644\u0639\u0631\u0628\u064a.',
      initials: 'CA',
    },
    {
      name_en: 'Destination Research Team',
      name_ar: '\u0641\u0631\u064a\u0642 \u0623\u0628\u062d\u0627\u062b \u0627\u0644\u0648\u062c\u0647\u0627\u062a',
      role_en: 'Content & SEO',
      role_ar: '\u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0648\u062a\u062d\u0633\u064a\u0646 \u0627\u0644\u0628\u062d\u062b',
      bio_en:
        'Travel journalists and sailing enthusiasts who create in-depth destination guides, itinerary blueprints, and honest yacht reviews based on real experience on the water.',
      bio_ar:
        '\u0635\u062d\u0641\u064a\u0648\u0646 \u0631\u062d\u0627\u0644\u0648\u0646 \u0648\u0639\u0634\u0627\u0642 \u0625\u0628\u062d\u0627\u0631 \u064a\u0646\u0634\u0626\u0648\u0646 \u0623\u062f\u0644\u0629 \u0648\u062c\u0647\u0627\u062a \u0645\u0639\u0645\u0642\u0629 \u0648\u0645\u0631\u0627\u062c\u0639\u0627\u062a \u064a\u062e\u0648\u062a \u0635\u0627\u062f\u0642\u0629.',
      initials: 'DR',
    },
  ]

  return (
    <div className={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--z-bg)' }}>
      {/* ── Hero ── */}
      <section
        className="relative"
        style={{
          background: 'var(--z-gradient-hero)',
          minHeight: '55vh',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full border-2 border-dashed" style={{ borderColor: 'var(--z-gold)' }} />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full border border-dashed" style={{ borderColor: 'var(--z-ocean)' }} />
        </div>

        <div className="z-container relative z-10 py-24">
          <p className="z-text-overline mb-4">{isEn ? 'About Zenitha Yachts' : '\u0639\u0646 \u0632\u064a\u0646\u064a\u062b\u0627 \u064a\u062e\u0648\u062a'}</p>
          <h1
            className="font-display mb-6"
            style={{
              fontSize: 'var(--z-text-hero-display)',
              fontWeight: 'var(--z-weight-bold)',
              lineHeight: 'var(--z-leading-tight)',
              color: 'var(--z-pearl)',
            }}
          >
            {isEn ? 'Your Partner on the Water' : '\u0634\u0631\u064a\u0643\u0643 \u0639\u0644\u0649 \u0627\u0644\u0645\u0627\u0621'}
          </h1>
          <p
            className="font-body"
            style={{
              fontSize: 'var(--z-text-body-lg)',
              color: 'var(--z-champagne)',
              lineHeight: 'var(--z-leading-relaxed)',
              maxWidth: '600px',
            }}
          >
            {isEn
              ? 'We match discerning travelers with exceptional yachts across the Mediterranean, Arabian Gulf, and Red Sea.'
              : '\u0646\u0648\u0635\u0644 \u0627\u0644\u0645\u0633\u0627\u0641\u0631\u064a\u0646 \u0627\u0644\u0645\u0645\u064a\u0632\u064a\u0646 \u0628\u064a\u062e\u0648\u062a \u0627\u0633\u062a\u062b\u0646\u0627\u0626\u064a\u0629 \u0639\u0628\u0631 \u0627\u0644\u0628\u062d\u0631 \u0627\u0644\u0645\u062a\u0648\u0633\u0637 \u0648\u0627\u0644\u062e\u0644\u064a\u062c \u0627\u0644\u0639\u0631\u0628\u064a \u0648\u0627\u0644\u0628\u062d\u0631 \u0627\u0644\u0623\u062d\u0645\u0631.'}
          </p>
        </div>
      </section>

      {/* ── Brand Story ── */}
      <section className="z-section" style={{ background: 'var(--z-pearl)' }}>
        <div className="z-container-text">
          <div className="mb-6">
            <span className="z-gold-bar z-gold-bar-wide" />
          </div>
          <div className="space-y-5">
            <p className="font-body" style={{ fontSize: 'var(--z-text-body-lg)', color: 'var(--z-navy)', lineHeight: 'var(--z-leading-relaxed)' }}>
              {isEn
                ? 'Zenitha Yachts was born from a simple frustration: the yacht charter industry, for all its beauty, was not built with Arab and Gulf travelers in mind. Halal provisions were an afterthought. Cultural expectations were overlooked. Communication was in one language only.'
                : '\u0648\u0644\u062f\u062a \u0632\u064a\u0646\u064a\u062b\u0627 \u064a\u062e\u0648\u062a \u0645\u0646 \u0625\u062d\u0628\u0627\u0637 \u0628\u0633\u064a\u0637: \u0635\u0646\u0627\u0639\u0629 \u062a\u0623\u062c\u064a\u0631 \u0627\u0644\u064a\u062e\u0648\u062a\u060c \u0639\u0644\u0649 \u0627\u0644\u0631\u063a\u0645 \u0645\u0646 \u062c\u0645\u0627\u0644\u0647\u0627\u060c \u0644\u0645 \u062a\u0643\u0646 \u0645\u0628\u0646\u064a\u0629 \u0645\u0639 \u0645\u0631\u0627\u0639\u0627\u0629 \u0627\u0644\u0645\u0633\u0627\u0641\u0631\u064a\u0646 \u0627\u0644\u0639\u0631\u0628 \u0648\u0627\u0644\u062e\u0644\u064a\u062c\u064a\u064a\u0646.'}
            </p>
            <p className="font-body" style={{ fontSize: 'var(--z-text-body-lg)', color: 'var(--z-navy)', lineHeight: 'var(--z-leading-relaxed)' }}>
              {isEn
                ? 'We set out to change that. Our team combines genuine nautical expertise with deep cultural understanding. We do not just list yachts \u2014 we personally vet every vessel, train crews on cultural sensitivity, and design itineraries that balance adventure with the comforts our clients expect.'
                : '\u0642\u0631\u0631\u0646\u0627 \u062a\u063a\u064a\u064a\u0631 \u0630\u0644\u0643. \u0641\u0631\u064a\u0642\u0646\u0627 \u064a\u062c\u0645\u0639 \u0628\u064a\u0646 \u0627\u0644\u062e\u0628\u0631\u0629 \u0627\u0644\u0628\u062d\u0631\u064a\u0629 \u0627\u0644\u062d\u0642\u064a\u0642\u064a\u0629 \u0648\u0627\u0644\u0641\u0647\u0645 \u0627\u0644\u062b\u0642\u0627\u0641\u064a \u0627\u0644\u0639\u0645\u064a\u0642.'}
            </p>
            <p className="font-body" style={{ fontSize: 'var(--z-text-body-lg)', color: 'var(--z-navy)', lineHeight: 'var(--z-leading-relaxed)' }}>
              {isEn
                ? 'Whether it is your first week on the water or your twentieth, Zenitha is here to make it your best. That is not a tagline. It is the standard we hold ourselves to every single day.'
                : '\u0633\u0648\u0627\u0621 \u0643\u0627\u0646 \u0623\u0633\u0628\u0648\u0639\u0643 \u0627\u0644\u0623\u0648\u0644 \u0639\u0644\u0649 \u0627\u0644\u0645\u0627\u0621 \u0623\u0648 \u0627\u0644\u0639\u0634\u0631\u064a\u0646\u060c \u0632\u064a\u0646\u064a\u062b\u0627 \u0647\u0646\u0627 \u0644\u062a\u062c\u0639\u0644\u0647 \u0627\u0644\u0623\u0641\u0636\u0644.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="z-section" style={{ background: 'var(--z-sand)' }}>
        <div className="z-container">
          <div className="text-center mb-12">
            <p className="z-text-overline mb-2">{isEn ? 'Our Values' : '\u0642\u064a\u0645\u0646\u0627'}</p>
            <h2
              className="font-display mb-4"
              style={{ fontSize: 'var(--z-text-title-lg)', fontWeight: 'var(--z-weight-bold)', color: 'var(--z-navy)' }}
            >
              {isEn ? 'What Sets Us Apart' : '\u0645\u0627 \u064a\u0645\u064a\u0632\u0646\u0627'}
            </h2>
            <span className="z-gold-bar z-gold-bar-wide mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <div key={i} className="z-card" style={{ background: 'var(--z-surface)' }}>
                <div className="z-card-body text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(201,169,110,0.1)' }}
                  >
                    <v.icon className="w-7 h-7" style={{ color: 'var(--z-gold)' }} />
                  </div>
                  <h3
                    className="font-heading mb-3"
                    style={{ fontSize: 'var(--z-text-subtitle)', fontWeight: 'var(--z-weight-bold)', color: 'var(--z-navy)' }}
                  >
                    {isEn ? v.title_en : v.title_ar}
                  </h3>
                  <p className="font-body" style={{ color: 'var(--z-muted)', fontSize: 'var(--z-text-body-sm)', lineHeight: 'var(--z-leading-relaxed)' }}>
                    {isEn ? v.desc_en : v.desc_ar}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="z-section" style={{ background: 'var(--z-pearl)' }}>
        <div className="z-container">
          <div className="text-center mb-12">
            <p className="z-text-overline mb-2">{isEn ? 'Our Team' : '\u0641\u0631\u064a\u0642\u0646\u0627'}</p>
            <h2
              className="font-display mb-4"
              style={{ fontSize: 'var(--z-text-title-lg)', fontWeight: 'var(--z-weight-bold)', color: 'var(--z-navy)' }}
            >
              {isEn ? 'The People Behind Zenitha' : '\u0627\u0644\u0623\u0634\u062e\u0627\u0635 \u0648\u0631\u0627\u0621 \u0632\u064a\u0646\u064a\u062b\u0627'}
            </h2>
            <span className="z-gold-bar z-gold-bar-wide mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, i) => (
              <div key={i} className="z-card" style={{ background: 'var(--z-surface)' }}>
                <div className="z-card-body text-center">
                  <div
                    className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center font-display"
                    style={{
                      background: 'var(--z-gradient-card)',
                      fontSize: 'var(--z-text-subtitle)',
                      fontWeight: 'var(--z-weight-bold)',
                      color: 'var(--z-gold)',
                    }}
                  >
                    {member.initials}
                  </div>
                  <h3
                    className="font-heading mb-1"
                    style={{ fontSize: 'var(--z-text-heading)', fontWeight: 'var(--z-weight-bold)', color: 'var(--z-navy)' }}
                  >
                    {isEn ? member.name_en : member.name_ar}
                  </h3>
                  <p className="z-text-overline mb-3" style={{ fontSize: 'var(--z-text-micro)' }}>
                    {isEn ? member.role_en : member.role_ar}
                  </p>
                  <p className="font-body" style={{ color: 'var(--z-muted)', fontSize: 'var(--z-text-body-sm)', lineHeight: 'var(--z-leading-relaxed)' }}>
                    {isEn ? member.bio_en : member.bio_ar}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Parent Entity ── */}
      <section className="z-section-sm" style={{ background: 'var(--z-sand)' }}>
        <div className="z-container max-w-3xl mx-auto text-center">
          <Globe className="w-8 h-8 mx-auto mb-4" style={{ color: 'var(--z-gold)' }} />
          <h2
            className="font-heading mb-3"
            style={{ fontSize: 'var(--z-text-subtitle)', fontWeight: 'var(--z-weight-bold)', color: 'var(--z-navy)' }}
          >
            {isEn ? `Part of ${ENTITY.legalName}` : `\u062c\u0632\u0621 \u0645\u0646 ${ENTITY.legalName}`}
          </h2>
          <p className="font-body mb-2" style={{ color: 'var(--z-muted)', fontSize: 'var(--z-text-body)', lineHeight: 'var(--z-leading-relaxed)' }}>
            {isEn
              ? `Zenitha Yachts operates under ${ENTITY.legalName}, a ${ENTITY.jurisdiction} ${ENTITY.entityType} founded by ${ENTITY.founder.name}. The company also operates a network of luxury travel platforms serving Arab travelers worldwide.`
              : `\u062a\u0639\u0645\u0644 \u0632\u064a\u0646\u064a\u062b\u0627 \u064a\u062e\u0648\u062a \u062a\u062d\u062a \u0645\u0638\u0644\u0629 ${ENTITY.legalName}\u060c \u0634\u0631\u0643\u0629 \u0630\u0627\u062a \u0645\u0633\u0624\u0648\u0644\u064a\u0629 \u0645\u062d\u062f\u0648\u062f\u0629 \u0645\u0633\u062c\u0644\u0629 \u0641\u064a ${ENTITY.jurisdiction}.`}
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'var(--z-gradient-hero)', padding: 'var(--z-space-16) 0' }}>
        <div className="z-container text-center">
          <h2
            className="font-display mb-4"
            style={{ fontSize: 'var(--z-text-title-lg)', fontWeight: 'var(--z-weight-bold)', color: 'var(--z-pearl)' }}
          >
            {isEn ? 'Ready to Set Sail?' : '\u0645\u0633\u062a\u0639\u062f \u0644\u0644\u0625\u0628\u062d\u0627\u0631\u061f'}
          </h2>
          <p
            className="font-body mb-8"
            style={{ fontSize: 'var(--z-text-body-lg)', color: 'var(--z-champagne)', maxWidth: '500px', margin: '0 auto var(--z-space-8)' }}
          >
            {isEn
              ? 'Tell us about your dream charter and we will take it from there.'
              : '\u0623\u062e\u0628\u0631\u0646\u0627 \u0639\u0646 \u0631\u062d\u0644\u062a\u0643 \u0627\u0644\u0645\u062b\u0627\u0644\u064a\u0629 \u0648\u0633\u0646\u062a\u0648\u0644\u0649 \u0627\u0644\u0628\u0627\u0642\u064a.'}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/charter-planner" className="z-btn z-btn-primary z-btn-lg">
              <Compass className="w-5 h-5" />
              {isEn ? 'Plan Your Charter' : '\u062e\u0637\u0637 \u0631\u062d\u0644\u062a\u0643'}
            </Link>
            <Link
              href="/contact"
              className="z-btn z-btn-secondary z-btn-lg"
              style={{ color: 'var(--z-pearl)', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <Mail className="w-5 h-5" />
              {isEn ? 'Contact Us' : '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
