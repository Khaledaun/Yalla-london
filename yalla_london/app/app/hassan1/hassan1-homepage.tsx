'use client';

import { useState, useEffect } from 'react';

const CLIENTS = [
  { name: '24 News', logo: '/hassan/client-logo/new-logos/24news.png' },
  { name: 'EDF', logo: '/hassan/client-logo/new-logos/edf.png' },
  { name: 'Haifa', logo: '/hassan/client-logo/new-logos/haifa.png' },
  { name: 'Rebonim', logo: '/hassan/client-logo/new-logos/rebonim.png' },
  { name: 'Democracy', logo: '/hassan/client-logo/new-logos/democracy.png' },
  { name: 'CAL', logo: '/hassan/client-logo/new-logos/cal.png' },
  { name: 'Volt', logo: '/hassan/client-logo/new-logos/volt.png' },
  { name: 'JFNIL', logo: '/hassan/client-logo/new-logos/jfnil.png' },
  { name: 'Zen Energy', logo: '/hassan/client-logo/new-logos/zenenergy.png' },
  { name: 'Negev Galil', logo: '/hassan/client-logo/new-logos/negev-galel.png' },
  { name: 'Yad HaNadiv', logo: '/hassan/client-logo/new-logos/YadHanaDivv2.png' },
  { name: 'Partner 5G', logo: '/hassan/client-logo/new-logos/partner5g.png' },
];

const SERVICES = [
  {
    icon: '/hassan/wheelicon/icon1.svg',
    title: 'Strategic Intelligence',
    desc: 'We construct full intelligence architectures — mapping audience psychology, competitive terrain, and decision triggers — then translate insight into a precision operational playbook.',
  },
  {
    icon: '/hassan/wheelicon/icon2.svg',
    title: 'Narrative Engineering',
    desc: 'We design and deploy strategic narratives calibrated to persuade specific segments at the exact moments they are most receptive. Campaigns with coherent narrative frameworks win 2.3× more often.',
  },
  {
    icon: '/hassan/wheelicon/icon3.svg',
    title: 'Mission Execution',
    desc: 'Principal-level oversight across every phase of political and commercial mandates — from strategic brief to final outcome, with full accountability structures at every stage.',
  },
  {
    icon: '/hassan/wheelicon/icon4.svg',
    title: 'Strategic Communication',
    desc: 'Every message is a strategic instrument. We engineer communications designed to move a specific audience in a specific direction — with evidence, precision, and measurable intent.',
  },
  {
    icon: '/hassan/wheelicon/icon5.svg',
    title: 'Intelligence & Measurement',
    desc: 'Real-time intelligence frameworks that give principals the situational awareness to make decisive moves before the window closes. Data-integrated campaigns outperform by 67% on audience conversion.',
  },
  {
    icon: '/hassan/wheelicon/icon6.svg',
    title: 'Capital Deployment',
    desc: 'We allocate media capital with portfolio-manager discipline — maximizing decisive reach in the precise segments where outcomes are actually determined, averaging 3.2× media ROI across mandates.',
  },
];

const STATS = [
  { value: '82%', label: 'Campaign Win Rate' },
  { value: '12+', label: 'Years Strategic Advisory' },
  { value: '3.2×', label: 'Average Media ROI' },
  { value: '3M+', label: 'Audiences & Voters Reached' },
];

const TEAM = [
  { name: 'Hassan', role: 'Founder & Principal Advisor', photo: '/hassan/hassan.png' },
  { name: 'Salam', role: 'Senior Strategic Advisor', photo: '/hassan/salam-2.jpg' },
  { name: 'Noa', role: 'Intelligence & Digital Director', photo: '/hassan/01.jpg' },
  { name: 'Rania', role: 'Strategic Communications Director', photo: '/hassan/02.jpg' },
  { name: 'Maya', role: 'Mandate Operations Lead', photo: '/hassan/03.jpg' },
  { name: 'Dana', role: 'Analytics & Intelligence Lead', photo: '/hassan/04.jpg' },
];

const TESTIMONIALS = [
  {
    quote: 'Maximize provided strategic counsel that fundamentally changed how we approached the electorate. They identified the precise voter segments we needed and built the architecture to reach them. We won a race the polls said was lost.',
    author: 'National Campaign Director · Knesset Election',
    avatar: '/hassan/TestiPeople1.png',
  },
  {
    quote: "Their strategic intelligence brief identified 340,000 undecided voters we hadn't seen. The precision was unlike anything we'd experienced. This is elite advisory work — not standard agency execution.",
    author: 'Senior Political Principal · City Council Campaign',
    avatar: '/hassan/TestiPeople3.png',
  },
  {
    quote: 'Maximize understood our market segmentation challenge better than our internal team did. They deployed a strategic operation — not a campaign — and the ROI validated every decision.',
    author: 'Chief Marketing Officer · National Brand',
    avatar: '/hassan/TestiPeople5.png',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Strategic Intelligence',
    desc: 'We conduct a full intelligence brief: audience mapping, competitive analysis, and psychographic profiling of key decision-making segments across your landscape.',
  },
  {
    step: '02',
    title: 'Advisory Architecture',
    desc: 'We design the mandate — selecting channels, calibrating messages, and building an operational playbook with clear accountability and measurable strategic objectives.',
  },
  {
    step: '03',
    title: 'Execution & Governance',
    desc: 'We execute with principal-level discipline: daily intelligence reviews, adaptive resource deployment, and relentless optimization toward the defined strategic outcome.',
  },
];

export default function Hassan1Homepage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#fff', color: '#111827' }}>

      {/* ──────────────── NAV ──────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.97)' : '#fff',
        borderBottom: scrolled ? '1px solid #f0f0f0' : '1px solid transparent',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.3s ease',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/hassan/maximize-logo.svg" alt="Maximize" style={{ height: 38, width: 'auto' }} />
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="h1-desktop-nav">
            {['Services', 'Clients', 'Team', 'Contact'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} style={{
                textDecoration: 'none', color: '#374151', fontSize: 15, fontWeight: 500,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#FF6B35')}
              onMouseLeave={e => (e.currentTarget.style.color = '#374151')}
              >{item}</a>
            ))}
            <a href="#contact" style={{
              background: 'linear-gradient(135deg, #FF6B35, #E91E8C)',
              color: '#fff', padding: '10px 24px', borderRadius: 50,
              textDecoration: 'none', fontSize: 14, fontWeight: 600,
              boxShadow: '0 4px 14px rgba(255,107,53,0.35)',
            }}>Strategic Briefing</a>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'none' }}
            className="h1-hamburger"
            aria-label="Toggle menu"
          >
            <div style={{ width: 22, height: 2, background: '#111827', marginBottom: 5, borderRadius: 2 }} />
            <div style={{ width: 22, height: 2, background: '#111827', marginBottom: 5, borderRadius: 2 }} />
            <div style={{ width: 22, height: 2, background: '#111827', borderRadius: 2 }} />
          </button>
        </div>

        {menuOpen && (
          <div style={{ background: '#fff', borderTop: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Services', 'Clients', 'Team', 'Contact'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)} style={{ color: '#374151', textDecoration: 'none', fontSize: 16, fontWeight: 500 }}>{item}</a>
            ))}
          </div>
        )}
      </nav>

      {/* ──────────────── HERO ──────────────── */}
      <section style={{ paddingTop: 120, paddingBottom: 96, position: 'relative', overflow: 'hidden', minHeight: 620 }}>
        {/* Video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            objectFit: 'cover', zIndex: 0,
          }}
        >
          <source src="/hassan/gemini_generated_video_8768F30C.mp4" type="video/mp4" />
        </video>
        {/* Light overlay — keeps text readable while letting video show through */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,247,244,0.90) 100%)',
          zIndex: 1,
        }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
          <div style={{ flex: '1 1 480px', minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFF1EC', border: '1px solid #FECDC0', borderRadius: 50, padding: '6px 16px', marginBottom: 24 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B35' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#FF6B35', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Strategic Advisory · Political & Commercial Consulting</span>
            </div>

            <h1 style={{ fontSize: 'clamp(44px, 6vw, 76px)', fontWeight: 800, lineHeight: 1.05, margin: '0 0 8px', color: '#111827', letterSpacing: '-0.03em' }}>
              Be near.{' '}
              <span style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', background: 'linear-gradient(135deg, #FF6B35, #E91E8C)', backgroundClip: 'text' }}>Go far.</span>
            </h1>

            <p style={{ fontSize: 18, fontWeight: 600, color: '#6B7280', marginBottom: 20, letterSpacing: '0.02em' }}>
              Intelligence · Architecture · Execution.
            </p>

            <p style={{ fontSize: 17, lineHeight: 1.7, color: '#4B5563', marginBottom: 40, maxWidth: 520 }}>
              We advise at the highest levels of political and commercial decision-making — deploying intelligence-led strategy, precision narrative architecture, and principal-level execution accountability across every mandate we accept.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a href="#contact" style={{
                background: 'linear-gradient(135deg, #FF6B35, #E91E8C)',
                color: '#fff', padding: '14px 32px', borderRadius: 50,
                textDecoration: 'none', fontSize: 16, fontWeight: 700,
                boxShadow: '0 6px 24px rgba(255,107,53,0.35)',
                display: 'inline-block',
              }}>Request a Strategic Briefing</a>
              <a href="#clients" style={{
                border: '2px solid #E5E7EB', color: '#374151', padding: '14px 32px',
                borderRadius: 50, textDecoration: 'none', fontSize: 16, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>View Our Mandates →</a>
            </div>

            <div style={{ display: 'flex', gap: 32, marginTop: 52, flexWrap: 'wrap' }}>
              {STATS.slice(0, 3).map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: '1 1 340px', maxWidth: 460, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: -30, right: -30, width: 420, height: 420,
              borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(233,30,140,0.08))',
              zIndex: 0,
            }} />
            <div style={{
              position: 'relative', zIndex: 1, borderRadius: 24, overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
              background: '#fff',
            }}>
              <img
                src="/hassan/hassan.png"
                alt="Hassan — Founder & CEO of Maximize"
                style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 480 }}
              />
              <div style={{
                position: 'absolute', bottom: 20, left: 20, right: 20,
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
                borderRadius: 14, padding: '14px 18px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Hassan</div>
                <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Founder & Principal Advisor, Maximize</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ color: '#FF6B35', fontSize: 13 }}>★</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── CLIENT LOGOS ──────────────── */}
      <section id="clients" style={{ padding: '64px 24px', background: '#F9FAFB', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 36 }}>
            Trusted by 12+ leading campaigns and brands
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', alignItems: 'center' }}>
            {CLIENTS.map(c => (
              <div key={c.name} style={{
                background: '#1E2A3A', borderRadius: 12, padding: '12px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 110, height: 64, transition: 'all 0.25s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(255,107,53,0.25)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
              >
                <img src={c.logo} alt={c.name} style={{ maxHeight: 36, maxWidth: 110, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── SERVICES ──────────────── */}
      <section id="services" style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-block', background: '#FFF1EC', color: '#FF6B35', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 50, marginBottom: 16 }}>
              What We Do
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#111827', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Six Strategic Disciplines
            </h2>
            <p style={{ fontSize: 17, color: '#6B7280', maxWidth: 520, margin: '0 auto' }}>
              Evidence-based advisory spanning political mandates, corporate reputation, and commercial growth.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
            {SERVICES.map(s => (
              <div key={s.title} style={{
                background: '#F9FAFB', borderRadius: 20, padding: '32px 28px',
                border: '1px solid #F3F4F6', transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = '#fff';
                el.style.boxShadow = '0 12px 40px rgba(255,107,53,0.12)';
                el.style.transform = 'translateY(-4px)';
                el.style.borderColor = '#FECDC0';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = '#F9FAFB';
                el.style.boxShadow = 'none';
                el.style.transform = 'translateY(0)';
                el.style.borderColor = '#F3F4F6';
              }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(233,30,140,0.06))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <img src={s.icon} alt={s.title} style={{ width: 28, height: 28 }} />
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, color: '#111827', marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── STATS ──────────────── */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #FF6B35, #E91E8C)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'space-around' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', flex: '1 1 180px' }}>
              <div style={{ fontSize: 'clamp(48px, 6vw, 72px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>{s.value}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────── TEAM ──────────────── */}
      <section id="team" style={{ padding: '96px 24px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-block', background: '#FFF1EC', color: '#FF6B35', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 50, marginBottom: 16 }}>
              The Team
            </div>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 800, color: '#111827', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
              The Advisory Team
            </h2>
            <p style={{ fontSize: 17, color: '#6B7280', maxWidth: 480, margin: '0 auto' }}>
              Senior advisors and intelligence specialists with direct accountability across every mandate — no handoffs to juniors, no outsourced execution.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
            {TEAM.map(m => (
              <div key={m.name} style={{ textAlign: 'center' }}>
                <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 14, aspectRatio: '1', background: '#E5E7EB' }}>
                  <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block', transition: 'transform 0.4s ease' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
                  />
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{m.name}</div>
                <div style={{ fontSize: 13, color: '#FF6B35', fontWeight: 500, marginTop: 3 }}>{m.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── HOW IT WORKS ──────────────── */}
      <section style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-block', background: '#FFF1EC', color: '#FF6B35', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 50, marginBottom: 16 }}>
              Our Process
            </div>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Our Methodology
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            {STEPS.map(step => (
              <div key={step.step} style={{ flex: '1 1 260px', maxWidth: 300, textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF6B35, #E91E8C)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', boxShadow: '0 6px 20px rgba(255,107,53,0.3)',
                }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{step.step}</span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── TESTIMONIALS ──────────────── */}
      <section style={{ padding: '96px 24px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: '#FFF1EC', color: '#FF6B35', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 50, marginBottom: 16 }}>
              Testimonials
            </div>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              What Our Clients Say
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 20, padding: '32px 28px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6',
              }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 18 }}>
                  {[...Array(5)].map((_, si) => (
                    <span key={si} style={{ color: '#FF6B35', fontSize: 16 }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: 16, color: '#374151', lineHeight: 1.7, marginBottom: 24, fontStyle: 'italic' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={t.avatar} alt={t.author} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FECDC0' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{t.author}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── CTA BANNER ──────────────── */}
      <section id="contact" style={{ padding: '96px 24px', background: 'linear-gradient(135deg, #FF6B35 0%, #E91E8C 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, color: '#fff', margin: '0 0 20px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Ready for Principal-Level Strategy?
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, marginBottom: 40 }}>
            We accept a limited number of mandates each cycle. If your campaign or commercial objective demands elite strategic counsel — and you are ready to win — we want to hear from you.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:hello@campaign-l.com" style={{
              background: '#fff', color: '#FF6B35',
              padding: '16px 36px', borderRadius: 50,
              textDecoration: 'none', fontSize: 17, fontWeight: 800,
              boxShadow: '0 8px 28px rgba(0,0,0,0.15)',
              display: 'inline-block',
            }}>Request a Strategic Briefing</a>
            <a href="https://campaign-l.com/maximize/" target="_blank" rel="noopener noreferrer" style={{
              border: '2px solid rgba(255,255,255,0.5)', color: '#fff',
              padding: '16px 36px', borderRadius: 50,
              textDecoration: 'none', fontSize: 17, fontWeight: 700,
              display: 'inline-block',
            }}>Visit Our Website</a>
          </div>
        </div>
      </section>

      {/* ──────────────── FOOTER ──────────────── */}
      <footer style={{ background: '#111827', color: '#9CA3AF', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
            <img src="/hassan/maximize-logo.svg" alt="Maximize" style={{ height: 36, filter: 'brightness(10)' }} />
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              {['Services', 'Clients', 'Team', 'Contact'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} style={{ color: '#6B7280', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#FF6B35')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#6B7280')}
                >{item}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1F2937', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13 }}>© 2025 Maximize. All rights reserved. Strategic Advisory · Political &amp; Commercial Consulting.</div>
            <div style={{ fontSize: 13 }}>
              <a href="https://campaign-l.com/maximize/" target="_blank" rel="noopener noreferrer" style={{ color: '#FF6B35', textDecoration: 'none' }}>campaign-l.com/maximize</a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .h1-desktop-nav { display: none !important; }
          .h1-hamburger { display: block !important; }
        }
      `}</style>
    </div>
  );
}
