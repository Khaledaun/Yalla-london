'use client';

import { ScrollReveal } from '../scroll-reveal';
import { PROCESS_STEPS, type ProcessStep } from '../site-data';

/**
 * ProcessSection — Multi-step horizontal layout describing the agency workflow.
 * 4 steps: Discover, Design, Build, Grow — each with icon, title, and paragraph.
 */
export function ProcessSection() {
  return (
    <section
      id="process"
      className="relative px-6 py-24 md:py-32"
      style={{ background: 'var(--zl-obsidian)' }}
    >
      <div className="max-w-[1200px] mx-auto">
        <ScrollReveal variant="fade-up">
          <p
            className="text-center"
            style={{
              fontFamily: 'var(--zl-font-label)',
              fontSize: '0.6875rem',
              letterSpacing: 'var(--zl-tracking-luxury)',
              color: 'var(--zl-gold)',
              marginBottom: '1.5rem',
            }}
          >
            HOW WE WORK
          </p>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={100}>
          <h2
            className="text-center"
            style={{
              fontFamily: 'var(--zl-font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: 'var(--zl-ivory)',
              lineHeight: 1.25,
            }}
          >
            From Concept to Revenue
          </h2>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={200}>
          <div className="flex justify-center mt-6 mb-16">
            <div style={{ width: '60px', height: '1px', background: 'var(--zl-gold)' }} />
          </div>
        </ScrollReveal>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PROCESS_STEPS.map((step, i) => (
            <ScrollReveal key={step.number} variant="fade-up" delay={250 + i * 100}>
              <ProcessCard step={step} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessCard({ step }: { step: ProcessStep }) {
  return (
    <div
      className="group relative p-8 transition-all duration-500 hover:translate-y-[-4px]"
      style={{
        background: 'var(--zl-midnight)',
        border: '1px solid rgba(196, 169, 108, 0.08)',
      }}
    >
      {/* Top accent line — animates on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500 group-hover:opacity-100 opacity-40"
        style={{ background: 'linear-gradient(90deg, var(--zl-gold), var(--zl-brass))' }}
      />

      {/* Step number */}
      <div
        style={{
          fontFamily: 'var(--zl-font-display)',
          fontSize: '2.5rem',
          fontWeight: 300,
          color: 'rgba(196, 169, 108, 0.15)',
          lineHeight: 1,
        }}
      >
        {step.number}
      </div>

      {/* Icon */}
      <div className="mt-4 mb-4">
        <ProcessIcon icon={step.icon} />
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: 'var(--zl-font-display)',
          fontSize: '1.375rem',
          fontWeight: 500,
          letterSpacing: '0.03em',
          color: 'var(--zl-ivory)',
          margin: 0,
        }}
      >
        {step.title}
      </h3>

      {/* Description */}
      <p
        className="mt-3"
        style={{
          fontFamily: 'var(--zl-font-body)',
          fontSize: '0.9375rem',
          lineHeight: 1.75,
          color: 'var(--zl-mist)',
        }}
      >
        {step.description}
      </p>
    </div>
  );
}

function ProcessIcon({ icon }: { icon: ProcessStep['icon'] }) {
  const size = 32;
  const color = 'var(--zl-gold)';

  const icons: Record<string, JSX.Element> = {
    discover: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
        <path d="M11 8v6M8 11h6" />
      </svg>
    ),
    design: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    build: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <path d="M16 18l6-6-6-6" />
        <path d="M8 6l-6 6 6 6" />
        <path d="M14.5 4l-5 16" />
      </svg>
    ),
    grow: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  };

  return icons[icon] || null;
}
