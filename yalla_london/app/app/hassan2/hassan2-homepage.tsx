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
  { icon: '/hassan/wheelicon/icon1.svg', title: 'Strategic Intelligence', desc: 'We construct full intelligence architectures — mapping audience psychology, competitive terrain, and decision triggers — then translate insight into a precision operational playbook.' },
  { icon: '/hassan/wheelicon/icon2.svg', title: 'Narrative Engineering', desc: 'We design and deploy strategic narratives calibrated to persuade specific segments at the exact moments they are most receptive. Campaigns with coherent narrative frameworks win 2.3× more often.' },
  { icon: '/hassan/wheelicon/icon3.svg', title: 'Mission Execution', desc: 'Principal-level oversight across every phase of political and commercial mandates — from strategic brief to final outcome, with full accountability structures at every stage.' },
  { icon: '/hassan/wheelicon/icon4.svg', title: 'Strategic Communication', desc: 'Every message is a strategic instrument. We engineer communications designed to move a specific audience in a specific direction — with evidence, precision, and measurable intent.' },
  { icon: '/hassan/wheelicon/icon5.svg', title: 'Intelligence & Measurement', desc: 'Real-time intelligence frameworks that give principals the situational awareness to make decisive moves before the window closes. Data-integrated campaigns outperform by 67% on audience conversion.' },
  { icon: '/hassan/wheelicon/icon6.svg', title: 'Capital Deployment', desc: 'We allocate media capital with portfolio-manager discipline — maximizing decisive reach in the precise segments where outcomes are actually determined, averaging 3.2× media ROI across mandates.' },
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

export default function Hassan2Homepage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { background: #0A0A0A; color: #FAFAFA; font-family: 'Inter', sans-serif; }
        .h2-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; transition: all 0.3s ease; }
        .h2-nav.scrolled { background: rgba(10,10,10,0.97); border-bottom: 1px solid rgba(212,160,23,0.2); }
        .h2-nav-inner { max-width: 1280px; margin: 0 auto; padding: 0 40px; height: 72px; display: flex; align-items: center; justify-content: space-between; }
        .h2-nav-links { display: flex; gap: 40px; list-style: none; }
        .h2-nav-links a { color: rgba(250,250,250,0.6); text-decoration: none; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; transition: color 0.2s; }
        .h2-nav-links a:hover { color: #D4A017; }
        .h2-btn-gold { background: transparent; border: 1px solid #D4A017; color: #D4A017; padding: 10px 24px; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-block; }
        .h2-btn-gold:hover { background: #D4A017; color: #0A0A0A; }
        .h2-btn-gold-filled { background: #D4A017; border: 1px solid #D4A017; color: #0A0A0A; padding: 16px 40px; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-block; }
        .h2-btn-gold-filled:hover { background: #c9950f; border-color: #c9950f; }
        .h2-btn-ghost { background: transparent; border: 1px solid rgba(250,250,250,0.2); color: #FAFAFA; padding: 16px 40px; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-block; }
        .h2-btn-ghost:hover { border-color: rgba(250,250,250,0.5); }
        .h2-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; }
        .h2-hamburger span { display: block; width: 24px; height: 1px; background: #FAFAFA; margin: 6px 0; transition: all 0.3s; }
        .h2-mobile-menu { display: none; position: fixed; top: 72px; left: 0; right: 0; background: #0A0A0A; border-top: 1px solid rgba(212,160,23,0.2); padding: 32px 24px; z-index: 99; }
        .h2-mobile-menu.open { display: block; }
        .h2-mobile-menu a { display: block; color: rgba(250,250,250,0.6); text-decoration: none; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .h2-mobile-menu a:last-child { border-bottom: none; }
        @media (max-width: 768px) {
          .h2-nav-links { display: none; }
          .h2-nav-cta { display: none; }
          .h2-hamburger { display: block; }
          .h2-nav-inner { padding: 0 24px; }
          .h2-hero-inner { flex-direction: column; padding-top: 100px; }
          .h2-hero-text { max-width: 100%; }
          .h2-hero-photo { width: 100%; max-width: 400px; margin: 0 auto; }
          .h2-hero-title { font-size: clamp(42px, 10vw, 72px) !important; }
          .h2-manifesto-grid { grid-template-columns: 1fr !important; }
          .h2-services-grid { grid-template-columns: 1fr !important; }
          .h2-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .h2-clients-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .h2-team-grid { grid-template-columns: 1fr 1fr !important; }
          .h2-testi-grid { grid-template-columns: 1fr !important; }
          .h2-section { padding: 80px 24px !important; }
          .h2-hero { padding: 120px 24px 80px !important; }
          .h2-cta-inner { padding: 80px 24px !important; }
          .h2-footer-inner { padding: 48px 24px !important; }
          .h2-footer-links { flex-direction: column; gap: 16px !important; }
          .h2-cta-btns { flex-direction: column; align-items: flex-start !important; }
          .h2-stat-divider { display: none !important; }
        }
        .gold-line { display: inline-block; width: 60px; height: 2px; background: #D4A017; margin-bottom: 24px; }
        .gold-label { font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #D4A017; margin-bottom: 16px; display: block; }
      `}</style>

      {/* NAV */}
      <nav className={`h2-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="h2-nav-inner">
          <img src="/hassan/maximize-logo.svg" alt="Maximize" style={{ height: 32 }} />
          <ul className="h2-nav-links">
            <li><a href="#services">Services</a></li>
            <li><a href="#clients">Clients</a></li>
            <li><a href="#team">Team</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <a href="#contact" className="h2-btn-gold h2-nav-cta">Get In Touch</a>
          <button
            className="h2-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <div className={`h2-mobile-menu${menuOpen ? ' open' : ''}`}>
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
          <a href="#clients" onClick={() => setMenuOpen(false)}>Clients</a>
          <a href="#team" onClick={() => setMenuOpen(false)}>Team</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Get In Touch</a>
        </div>
      </nav>

      {/* HERO */}
      <section
        className="h2-hero"
        style={{
          minHeight: '100vh',
          background: '#0A0A0A',
          display: 'flex',
          alignItems: 'center',
          padding: '140px 40px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            objectFit: 'cover', zIndex: 0, opacity: 0.35,
          }}
        >
          <source src="/hassan/gemini_generated_video_E68BD1D6.mp4" type="video/mp4" />
        </video>
        {/* Deep dark overlay — preserves black luxury feel */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.60) 100%)',
          zIndex: 1,
        }} />
        {/* Background grid lines */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          backgroundImage: 'linear-gradient(rgba(212,160,23,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          pointerEvents: 'none',
        }} />
        <div className="h2-hero-inner" style={{ maxWidth: 1280, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 80, position: 'relative', zIndex: 3 }}>
          <div className="h2-hero-text" style={{ flex: 1, maxWidth: 680 }}>
            <span className="gold-label">Strategic Advisory · Elite Campaign Consulting</span>
            <h1
              className="h2-hero-title"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 'clamp(56px, 7vw, 96px)',
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: '#FAFAFA',
                marginBottom: 8,
              }}
            >
              Be Near.
            </h1>
            <h1
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 'clamp(56px, 7vw, 96px)',
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: '#D4A017',
                marginBottom: 40,
              }}
            >
              Go Far.
            </h1>
            <div style={{ width: 80, height: 1, background: '#D4A017', marginBottom: 32 }} />
            <p style={{ fontSize: 18, color: 'rgba(250,250,250,0.6)', lineHeight: 1.7, marginBottom: 12, fontWeight: 300 }}>
              Intelligence · Architecture · Execution.
            </p>
            <p style={{ fontSize: 15, color: 'rgba(250,250,250,0.4)', lineHeight: 1.8, marginBottom: 48, maxWidth: 520 }}>
              We provide principal-level strategic advisory to political campaigns and commercial enterprises that cannot afford to lose — constructing intelligence architectures, narrative frameworks, and operational mandates built to deliver decisive outcomes.
            </p>
            <div className="h2-cta-btns" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <a href="#contact" className="h2-btn-gold-filled">Request a Strategic Briefing</a>
              <a href="#clients" className="h2-btn-ghost">View Our Mandates</a>
            </div>
          </div>
          <div className="h2-hero-photo" style={{ flex: '0 0 420px', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              inset: -1,
              border: '1px solid rgba(212,160,23,0.3)',
              pointerEvents: 'none',
              zIndex: 2,
            }} />
            <img
              src="/hassan/hassan.png"
              alt="Hassan — Founder & Principal Advisor, Maximize"
              style={{ width: '100%', display: 'block', filter: 'grayscale(20%)' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(10,10,10,0.8))',
              padding: '40px 24px 24px',
              zIndex: 3,
            }}>
              <div style={{ fontSize: 11, letterSpacing: '0.2em', color: '#D4A017', textTransform: 'uppercase', fontWeight: 600 }}>Hassan</div>
              <div style={{ fontSize: 12, color: 'rgba(250,250,250,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Founder & Principal Advisor</div>
            </div>
          </div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section style={{ background: '#111111', borderTop: '1px solid rgba(212,160,23,0.1)', borderBottom: '1px solid rgba(212,160,23,0.1)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '100px 40px' }}>
          <div className="h2-manifesto-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'rgba(212,160,23,0.1)' }}>
            {[
              {
                label: 'Advisory Philosophy',
                headline: "Intelligence\nBefore Action.",
                body: "Every mandate begins with a rigorous strategic intelligence brief. We map the audience terrain, identify decision triggers, and construct a precise operational playbook before a single resource is deployed.",
              },
              {
                label: 'Consulting Approach',
                headline: 'Principal-Level\nAccountability.',
                body: "We operate with the discipline of a McKinsey engagement and the conviction of a campaign general. Full accountability to outcome — not deliverables. Our principals are measured by wins, not outputs.",
              },
              {
                label: 'Proven Outcomes',
                headline: '82% Mandate\nWin Rate.',
                body: "Across 12+ years of advisory and 50+ political and commercial mandates, our strategic architecture has delivered an 82% win rate — with 3.2× average media ROI and 3M+ audiences precisely reached.",
              },
            ].map((item, i) => (
              <div key={i} style={{ background: '#111111', padding: '60px 48px' }}>
                <span style={{ fontSize: 10, letterSpacing: '0.25em', color: '#D4A017', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 24 }}>{item.label}</span>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, lineHeight: 1.2, color: '#FAFAFA', marginBottom: 24, whiteSpace: 'pre-line' }}>{item.headline}</h3>
                <p style={{ fontSize: 14, color: 'rgba(250,250,250,0.45)', lineHeight: 1.8, fontWeight: 300 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="h2-section" style={{ background: '#0A0A0A', padding: '120px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 72 }}>
            <span className="gold-label">What We Do</span>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 400, color: '#FAFAFA', letterSpacing: '-0.02em' }}>
              Six Disciplines.<br />One Strategic Mandate.
            </h2>
          </div>
          <div className="h2-services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(212,160,23,0.15)' }}>
            {SERVICES.map((s, i) => (
              <div
                key={i}
                style={{
                  background: '#0A0A0A',
                  padding: '48px 40px',
                  transition: 'background 0.2s',
                  cursor: 'default',
                  borderTop: i < 3 ? 'none' : '1px solid rgba(212,160,23,0.15)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#111111'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#0A0A0A'; }}
              >
                <div style={{
                  width: 56, height: 56,
                  border: '1px solid rgba(212,160,23,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 28,
                }}>
                  <img src={s.icon} alt={s.title} style={{ width: 28, height: 28, filter: 'brightness(0) invert(0.7) sepia(1) saturate(2) hue-rotate(5deg)' }} />
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#D4A017', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>0{i + 1}</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#FAFAFA', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(250,250,250,0.4)', lineHeight: 1.8, fontWeight: 300 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: '#111111', borderTop: '1px solid rgba(212,160,23,0.15)', borderBottom: '1px solid rgba(212,160,23,0.15)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 40px' }}>
          <div className="h2-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'center' }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(48px, 5vw, 72px)', fontWeight: 400, color: '#D4A017', lineHeight: 1, marginBottom: 12 }}>{s.value}</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(250,250,250,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                </div>
                {i < STATS.length - 1 && (
                  <div className="h2-stat-divider" style={{ width: 1, height: 80, background: 'rgba(212,160,23,0.2)', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLIENTS */}
      <section id="clients" className="h2-section" style={{ background: '#0A0A0A', padding: '120px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 72 }}>
            <span className="gold-label">Our Clients</span>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 400, color: '#FAFAFA', letterSpacing: '-0.02em' }}>
              Trusted by Leaders.<br />Chosen by Winners.
            </h2>
          </div>
          <div className="h2-clients-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(212,160,23,0.15)' }}>
            {CLIENTS.map((c, i) => (
              <div
                key={i}
                style={{
                  background: '#0A0A0A',
                  padding: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = '#111111';
                  (e.currentTarget as HTMLDivElement).style.outline = '1px solid rgba(212,160,23,0.4)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = '#0A0A0A';
                  (e.currentTarget as HTMLDivElement).style.outline = 'none';
                }}
              >
                <img
                  src={c.logo}
                  alt={c.name}
                  style={{ maxWidth: 120, maxHeight: 50, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.5, transition: 'opacity 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.5'; }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section id="team" style={{ background: '#111111', padding: '120px 40px', borderTop: '1px solid rgba(212,160,23,0.1)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 72 }}>
            <span className="gold-label">The Team</span>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 400, color: '#FAFAFA', letterSpacing: '-0.02em' }}>
              The People Behind<br />Every Victory.
            </h2>
          </div>
          <div className="h2-team-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {TEAM.map((member, i) => (
              <div
                key={i}
                style={{ position: 'relative', overflow: 'hidden', cursor: 'default', background: '#0A0A0A' }}
              >
                <img
                  src={member.photo}
                  alt={member.name}
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block', filter: 'grayscale(30%)' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(10,10,10,0.92))',
                  padding: '60px 24px 24px',
                }}>
                  <div style={{ height: 1, background: '#D4A017', width: 32, marginBottom: 12 }} />
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#FAFAFA', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{member.name}</div>
                  <div style={{ fontSize: 10, color: '#D4A017', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, marginTop: 4 }}>{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        style={{
          background: '#0A0A0A',
          padding: '120px 40px',
          backgroundImage: 'url(/hassan/TestiBG.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'luminosity',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.88)' }} />
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 72 }}>
            <span className="gold-label">Client Results</span>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 400, color: '#FAFAFA', letterSpacing: '-0.02em' }}>
              What Winning<br />Looks Like.
            </h2>
          </div>
          <div className="h2-testi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(212,160,23,0.15)' }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: 'rgba(10,10,10,0.9)', padding: '52px 40px' }}>
                <div style={{ fontSize: 48, color: '#D4A017', fontFamily: 'Georgia, serif', lineHeight: 0.8, marginBottom: 32, opacity: 0.6 }}>"</div>
                <p style={{ fontSize: 15, color: 'rgba(250,250,250,0.7)', lineHeight: 1.8, fontWeight: 300, fontStyle: 'italic', marginBottom: 40 }}>{t.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img
                    src={t.avatar}
                    alt={t.author}
                    style={{ width: 44, height: 44, objectFit: 'cover', filter: 'grayscale(40%)' }}
                  />
                  <div>
                    <div style={{ width: 24, height: 1, background: '#D4A017', marginBottom: 8 }} />
                    <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(250,250,250,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>{t.author}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" style={{ background: '#111111', borderTop: '1px solid rgba(212,160,23,0.2)' }}>
        <div className="h2-cta-inner" style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 48 }}>
          <div>
            <span className="gold-label">Selective Engagements Only</span>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(42px, 5vw, 72px)', fontWeight: 400, color: '#FAFAFA', letterSpacing: '-0.02em', lineHeight: 1 }}>
              READY FOR<br />
              <span style={{ color: '#D4A017' }}>ELITE COUNSEL?</span>
            </h2>
          </div>
          <p style={{ fontSize: 16, color: 'rgba(250,250,250,0.45)', lineHeight: 1.8, maxWidth: 560, fontWeight: 300 }}>
            We accept a limited number of mandates each cycle. If your campaign or commercial objective demands elite strategic counsel — and you are ready to commit to winning — we want to hear from you.
          </p>
          <div className="h2-cta-btns" style={{ display: 'flex', gap: 16 }}>
            <a href="mailto:info@maximize.co.il" className="h2-btn-gold-filled">Request a Strategic Briefing</a>
            <a href="tel:+972" className="h2-btn-ghost">Call Us Now</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0A0A0A', borderTop: '1px solid rgba(212,160,23,0.3)' }}>
        <div className="h2-footer-inner" style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 32 }}>
            <div>
              <img src="/hassan/maximize-logo.svg" alt="Maximize" style={{ height: 28, marginBottom: 16 }} />
              <p style={{ fontSize: 11, color: 'rgba(250,250,250,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Strategic Advisory · Political & Commercial Consulting.
              </p>
            </div>
            <div className="h2-footer-links" style={{ display: 'flex', gap: 40, listStyle: 'none' }}>
              {['Services', 'Clients', 'Team', 'Contact'].map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(250,250,250,0.3)', textDecoration: 'none', textTransform: 'uppercase', fontWeight: 600, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#D4A017'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,250,250,0.3)'; }}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontSize: 10, color: 'rgba(250,250,250,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              © 2025 Maximize. All Rights Reserved.
            </p>
            <p style={{ fontSize: 10, color: 'rgba(250,250,250,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              campaign-l.com/maximize
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
