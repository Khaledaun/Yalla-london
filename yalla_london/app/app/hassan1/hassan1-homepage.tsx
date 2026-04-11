'use client';

import { useState } from 'react';
import {
  CheckCircle,
  TrendingUp,
  Zap,
  BarChart3,
  Globe,
  Shield,
  RefreshCw,
  Target,
  ChevronRight,
  Star,
  ArrowRight,
  Play,
} from 'lucide-react';

// ─── Design Tokens (Wise-inspired) ───────────────────────────────────────────
const T = {
  bg: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  bgAccentLight: '#F0FDF9',
  text: '#111827',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  accent: '#00B67A',       // Wise green
  accentHover: '#00A06B',
  accentLight: '#D1FAE5',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  navy: '#163300',         // Dark green for contrast
  white: '#FFFFFF',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  shadowMd: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
  shadowLg: '0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)',
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
type PricingTier = {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlighted: boolean;
};

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <nav style={{ background: T.white, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color={T.white} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>Maximize</span>
        </div>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hide-mobile">
          {['Product', 'Pricing', 'Case Studies', 'About'].map(l => (
            <a key={l} href="#" style={{ color: T.textMuted, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="#" style={{ color: T.text, fontSize: 15, fontWeight: 600, textDecoration: 'none', padding: '8px 16px' }} className="hide-mobile">Log in</a>
          <a href="#" style={{
            background: T.accent, color: T.white, padding: '10px 20px', borderRadius: 50,
            fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-block',
          }}>
            Start free
          </a>
        </div>
      </div>
      <style>{`.hide-mobile { @media (max-width:768px) { display:none; } }`}</style>
    </nav>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ background: T.white, padding: '80px 24px 0', textAlign: 'center' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Pill badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.accentLight, borderRadius: 50, padding: '6px 16px', marginBottom: 28 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent }} />
          <span style={{ color: T.accent, fontSize: 14, fontWeight: 700 }}>Now with AI Campaign Intelligence v3</span>
        </div>

        <h1 style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-2px', color: T.text, margin: '0 0 24px' }}>
          3x Your Campaign ROI{' '}
          <span style={{ color: T.accent }}>With AI</span>
        </h1>

        <p style={{ fontSize: 20, color: T.textMuted, lineHeight: 1.6, maxWidth: 580, margin: '0 auto 40px', fontWeight: 400 }}>
          Stop wasting budget on guesswork. Maximize uses real-time AI to optimize every bid, channel, and creative — automatically. Most clients see results in 14 days.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <a href="#" style={{
            background: T.accent, color: T.white, padding: '16px 36px', borderRadius: 50,
            fontSize: 17, fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: `0 4px 20px ${T.accent}40`,
          }}>
            Start for free <ArrowRight size={18} />
          </a>
          <a href="#" style={{
            background: 'transparent', color: T.text, padding: '16px 36px', borderRadius: 50,
            fontSize: 17, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
            border: `2px solid ${T.border}`,
          }}>
            <Play size={16} fill={T.text} /> Watch demo
          </a>
        </div>
        <p style={{ fontSize: 13, color: T.textLight, marginBottom: 56 }}>Free 14-day trial · No credit card required · Cancel anytime</p>

        {/* Stats bar */}
        <div style={{ background: T.bgSecondary, borderRadius: 20, padding: '28px 40px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 720, margin: '0 auto' }}>
          {[
            { val: '$2.1B', label: 'Ad spend managed' },
            { val: '47K+', label: 'Marketers using Maximize' },
            { val: '3.2×', label: 'Average ROI increase' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: T.text, letterSpacing: '-1px' }}>{s.val}</div>
              <div style={{ fontSize: 14, color: T.textMuted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard mockup */}
      <div style={{ maxWidth: 1100, margin: '60px auto 0', position: 'relative' }}>
        <div style={{
          background: T.text, borderRadius: '24px 24px 0 0', padding: '20px 24px 0',
          overflow: 'hidden', boxShadow: `0 -4px 60px rgba(0,0,0,0.15)`,
        }}>
          {/* Browser chrome */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
          </div>
          {/* Mock dashboard */}
          <div style={{ background: '#1A1A2E', borderRadius: '12px 12px 0 0', padding: 24, minHeight: 280 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'ROAS', value: '4.2×', delta: '+18%', color: T.accent },
                { label: 'CPC', value: '$0.84', delta: '-23%', color: '#60A5FA' },
                { label: 'CTR', value: '5.7%', delta: '+9%', color: '#F59E0B' },
                { label: 'Conversions', value: '2,841', delta: '+41%', color: '#A78BFA' },
              ].map(m => (
                <div key={m.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.white }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: m.color, fontWeight: 700, marginTop: 4 }}>{m.delta} vs last month</div>
                </div>
              ))}
            </div>
            {/* Fake chart bars */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
              {[45, 62, 55, 80, 70, 90, 75, 95, 85, 100, 88, 92, 78, 96].map((h, i) => (
                <div key={i} style={{
                  flex: 1, background: i % 3 === 0 ? T.accent : 'rgba(255,255,255,0.1)',
                  borderRadius: 4, height: `${h}%`, minHeight: 8,
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SOCIAL PROOF ─────────────────────────────────────────────────────────────
function SocialProof() {
  const brands = ['Google', 'Shopify', 'HubSpot', 'Salesforce', 'Stripe', 'Notion', 'Figma', 'Vercel'];
  return (
    <section style={{ background: T.bgSecondary, padding: '48px 24px', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ textAlign: 'center', fontSize: 14, color: T.textLight, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 32 }}>
          Trusted by teams at
        </p>
        <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          {brands.map(b => (
            <span key={b} style={{ fontSize: 18, fontWeight: 800, color: T.textLight, letterSpacing: '-0.5px', opacity: 0.6 }}>{b}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FEATURES ─────────────────────────────────────────────────────────────────
const features = [
  { icon: Zap, title: 'AI Bid Optimization', desc: 'Our AI analyzes 200+ signals per second to set the perfect bid for every auction — automatically, 24/7.' },
  { icon: BarChart3, title: 'Real-Time Analytics', desc: 'See exactly what is working across every channel as it happens. No more waiting for yesterday\'s data.' },
  { icon: Globe, title: 'Multi-Channel Sync', desc: 'Google, Meta, TikTok, LinkedIn — unified under one dashboard. One source of truth for all your campaigns.' },
  { icon: RefreshCw, title: 'Auto-Reporting', desc: 'Beautiful, branded reports sent automatically to your stakeholders. Weekly, monthly, or on-demand.' },
  { icon: Target, title: 'A/B Creative Testing', desc: 'Test hundreds of ad variations simultaneously. Maximize AI picks winners and pauses losers in real time.' },
  { icon: Shield, title: 'Budget Guard™', desc: 'Our proprietary overspend protection stops budget bleed the moment anomalies are detected.' },
];

function Features() {
  return (
    <section style={{ background: T.white, padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ background: T.accentLight, color: T.accent, fontSize: 14, fontWeight: 700, padding: '6px 16px', borderRadius: 50, display: 'inline-block', marginBottom: 20 }}>
            Features
          </span>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', color: T.text, margin: '0 0 16px' }}>
            Everything you need to dominate your market
          </h2>
          <p style={{ fontSize: 18, color: T.textMuted, maxWidth: 560, margin: '0 auto' }}>
            Built for performance marketers who are tired of platforms that do half the job.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {features.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} style={{
                background: T.bgSecondary, borderRadius: 20, padding: 32,
                border: `1px solid ${T.borderLight}`, transition: 'box-shadow 0.2s',
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Icon size={22} color={T.accent} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: '0 0 10px', letterSpacing: '-0.3px' }}>{f.title}</h3>
                <p style={{ fontSize: 15, color: T.textMuted, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function Stats() {
  return (
    <section style={{ background: T.navy, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, textAlign: 'center' }}>
          {[
            { val: '$2.1B', label: 'Ad spend optimized', sub: 'in the last 12 months' },
            { val: '47,000+', label: 'Active marketers', sub: 'across 90 countries' },
            { val: '3.2×', label: 'Average ROI lift', sub: 'within first 90 days' },
            { val: '99.9%', label: 'Platform uptime', sub: 'guaranteed SLA' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, color: T.accent, letterSpacing: '-2px', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.white, margin: '12px 0 6px' }}>{s.label}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Connect your channels', desc: 'Link Google Ads, Meta, TikTok and more in under 5 minutes. No developer needed.' },
    { n: '02', title: 'Set your goals', desc: 'Tell Maximize what you want — more leads, lower CPA, higher ROAS. Our AI does the rest.' },
    { n: '03', title: 'Watch revenue grow', desc: 'Sit back while Maximize continuously optimizes every campaign in real time, every day.' },
  ];
  return (
    <section style={{ background: T.bgSecondary, padding: '100px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ background: T.accentLight, color: T.accent, fontSize: 14, fontWeight: 700, padding: '6px 16px', borderRadius: 50, display: 'inline-block', marginBottom: 20 }}>
            How it works
          </span>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', color: T.text, margin: 0 }}>
            Up and running in 15 minutes
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
          {steps.map(s => (
            <div key={s.n} style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: T.accent, color: T.white,
                fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                {s.n}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: '0 0 12px' }}>{s.title}</h3>
              <p style={{ fontSize: 16, color: T.textMuted, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
const testimonials = [
  { quote: 'Within 30 days, our Google Ads ROAS went from 1.8× to 4.6×. The AI found optimizations our team had been missing for months.', name: 'Sarah Chen', role: 'Head of Growth, Luma Commerce', stars: 5 },
  { quote: "Maximize replaced three separate tools and a junior analyst. It's genuinely the smartest thing we've ever added to our stack.", name: 'Marcus Oliveira', role: 'CMO, Finblock', stars: 5 },
  { quote: "We were skeptical about AI optimization. After 14 days our CAC dropped 31%. Now we can't imagine running campaigns without it.", name: 'Amira Hassan', role: 'Digital Marketing Lead, Nomad', stars: 5 },
];

function Testimonials() {
  return (
    <section style={{ background: T.white, padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', color: T.text, margin: '0 0 16px' }}>
            Marketers who switched never went back
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {testimonials.map(t => (
            <div key={t.name} style={{ background: T.bgSecondary, borderRadius: 20, padding: 32, border: `1px solid ${T.borderLight}` }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={16} fill={T.accent} color={T.accent} />
                ))}
              </div>
              <p style={{ fontSize: 16, color: T.text, lineHeight: 1.65, fontStyle: 'italic', margin: '0 0 24px' }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <div style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>{t.name}</div>
                <div style={{ fontSize: 14, color: T.textMuted }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PRICING ─────────────────────────────────────────────────────────────────
const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '$199',
    period: '/month',
    desc: 'For solo marketers and small teams getting serious.',
    features: ['Up to $50K monthly ad spend', '3 ad channels', 'AI bid optimization', 'Weekly auto-reports', 'Email support'],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$499',
    period: '/month',
    desc: 'For scaling teams who need full automation.',
    features: ['Up to $500K monthly ad spend', 'Unlimited channels', 'AI bid + creative optimization', 'Daily auto-reports', 'A/B testing suite', 'Slack alerts', 'Priority support'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For agencies and enterprise marketing teams.',
    features: ['Unlimited ad spend', 'Dedicated AI model', 'Custom integrations', 'White-label reports', 'API access', 'SLA guarantee', 'Dedicated CSM'],
    cta: 'Talk to sales',
    highlighted: false,
  },
];

function Pricing() {
  return (
    <section style={{ background: T.bgSecondary, padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ background: T.accentLight, color: T.accent, fontSize: 14, fontWeight: 700, padding: '6px 16px', borderRadius: 50, display: 'inline-block', marginBottom: 20 }}>
            Pricing
          </span>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', color: T.text, margin: '0 0 16px' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 18, color: T.textMuted }}>Start free for 14 days. No credit card required.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
          {pricingTiers.map(tier => (
            <div key={tier.name} style={{
              background: tier.highlighted ? T.navy : T.white,
              borderRadius: 24, padding: 36,
              border: tier.highlighted ? 'none' : `1px solid ${T.border}`,
              boxShadow: tier.highlighted ? `0 20px 60px rgba(0,0,0,0.25)` : T.shadow,
              transform: tier.highlighted ? 'scale(1.04)' : 'scale(1)',
            }}>
              {tier.highlighted && (
                <div style={{ background: T.accent, color: T.white, fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 50, display: 'inline-block', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Most Popular
                </div>
              )}
              <div style={{ fontSize: 18, fontWeight: 800, color: tier.highlighted ? T.white : T.text, marginBottom: 8 }}>{tier.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 42, fontWeight: 900, color: tier.highlighted ? T.white : T.text, letterSpacing: '-2px' }}>{tier.price}</span>
                <span style={{ fontSize: 16, color: tier.highlighted ? 'rgba(255,255,255,0.6)' : T.textMuted }}>{tier.period}</span>
              </div>
              <p style={{ fontSize: 15, color: tier.highlighted ? 'rgba(255,255,255,0.6)' : T.textMuted, marginBottom: 28 }}>{tier.desc}</p>

              <a href="#" style={{
                display: 'block', textAlign: 'center', padding: '14px',
                borderRadius: 50, fontWeight: 800, fontSize: 15, textDecoration: 'none',
                background: tier.highlighted ? T.accent : 'transparent',
                color: tier.highlighted ? T.white : T.text,
                border: tier.highlighted ? 'none' : `2px solid ${T.border}`,
                marginBottom: 28,
              }}>
                {tier.cta}
              </a>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tier.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: tier.highlighted ? 'rgba(255,255,255,0.85)' : T.textMuted }}>
                    <CheckCircle size={16} color={T.accent} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA BANNER ───────────────────────────────────────────────────────────────
function CtaBanner() {
  return (
    <section style={{ background: T.accent, padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-1.5px', color: T.white, margin: '0 0 20px' }}>
          Ready to Maximize?
        </h2>
        <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.85)', marginBottom: 40, lineHeight: 1.5 }}>
          Join 47,000+ marketers running smarter campaigns. Start your free 14-day trial today.
        </p>
        <a href="#" style={{
          background: T.white, color: T.navy, padding: '18px 48px', borderRadius: 50,
          fontSize: 18, fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          Get started free <ChevronRight size={20} />
        </a>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 16 }}>No credit card · Cancel anytime · Setup in 15 minutes</p>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { heading: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
    { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
    { heading: 'Resources', links: ['Documentation', 'API Reference', 'Help Center', 'Case Studies'] },
    { heading: 'Legal', links: ['Privacy', 'Terms', 'Security', 'GDPR'] },
  ];
  return (
    <footer style={{ background: T.text, color: T.white, padding: '64px 24px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 48, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} color={T.white} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 20, fontWeight: 800 }}>Maximize</span>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 200 }}>
              AI-powered campaign optimization for modern marketing teams.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              {['Twitter', 'LinkedIn', 'YouTube'].map(s => (
                <a key={s} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{s}</a>
              ))}
            </div>
          </div>

          {cols.map(col => (
            <div key={col.heading}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{col.heading}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(l => (
                  <li key={l}><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 15 }}>{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 32, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>© 2026 Maximize AI, Inc. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={14} color={T.accent} />
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Built on AI. Obsessed with ROI.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function Hassan1Homepage() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
      <div style={{ background: T.white, minHeight: '100vh' }}>
        <Nav />
        <Hero />
        <SocialProof />
        <Features />
        <Stats />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <CtaBanner />
        <Footer />
      </div>
    </>
  );
}
