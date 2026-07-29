import Link from "next/link";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";
import {
  Compass,
  Ship,
  MessageCircle,
  Anchor,
  Award,
  Heart,
  MapPin,
  Headphones,
  HelpCircle,
} from "lucide-react";

/* ─── Step Data ──────────────────────────────────────────────────── */

const STEPS = [
  {
    number: "01",
    title: "Share Your Vision",
    description:
      "Tell us your preferred travel dates, Mediterranean destination, group size, and any special preferences. Whether it is a romantic getaway, a family reunion, or a corporate retreat, every detail matters to us.",
    details: [
      "Preferred dates and duration",
      "Destination and itinerary ideas",
      "Number of guests and cabin requirements",
      "Dietary preferences and special requests",
    ],
    Icon: Compass,
  },
  {
    number: "02",
    title: "Expert Curation",
    description:
      "Our charter specialists handpick the perfect yachts from our fleet of over 200 verified vessels. We match your requirements with the ideal yacht type, crew, and amenities for an unforgettable voyage.",
    details: [
      "Personalised yacht shortlist",
      "Crew and captain matching",
      "Itinerary crafting with local knowledge",
      "Transparent pricing with no hidden fees",
    ],
    Icon: Ship,
  },
  {
    number: "03",
    title: "Personal Consultation",
    description:
      "Connect with your dedicated charter advisor via video call or WhatsApp. Review yacht options together, fine-tune your itinerary, and ask any questions before confirming your booking.",
    details: [
      "Video walkthrough of yacht options",
      "Live itinerary planning session",
      "WhatsApp support in English and Arabic",
      "Flexible payment arrangements",
    ],
    Icon: MessageCircle,
  },
  {
    number: "04",
    title: "Set Sail",
    description:
      "Everything is arranged. From airport transfers to provisioning, your yacht is prepared to perfection. Board your vessel, meet your crew, and let the Mediterranean unfold before you.",
    details: [
      "Airport-to-marina transfers arranged",
      "Yacht fully provisioned and prepared",
      "Welcome aboard briefing with crew",
      "24/7 concierge support throughout",
    ],
    Icon: Anchor,
  },
] as const;

/* ─── Why Choose Us Data ─────────────────────────────────────────── */

const ADVANTAGES = [
  {
    title: "200+ Premium Yachts",
    description:
      "A curated fleet of verified vessels across the Mediterranean, from elegant sailing yachts to luxurious superyachts. Every vessel meets our rigorous quality standards.",
    Icon: Ship,
  },
  {
    title: "Halal-Certified Options",
    description:
      "We understand the needs of Muslim travellers. Halal catering, prayer mats, Qibla direction, and alcohol-free options are available on request.",
    Icon: Heart,
  },
  {
    title: "Expert Mediterranean Knowledge",
    description:
      "With over 15 years of Mediterranean charter experience, our advisors offer insider tips on hidden coves, the finest coastal restaurants, and the best anchorages.",
    Icon: MapPin,
  },
  {
    title: "24/7 Concierge Support",
    description:
      "From the moment you inquire to the moment you return to shore, our multilingual team is available around the clock to assist with anything you need.",
    Icon: Headphones,
  },
] as const;

/* ─── FAQ Data ────────────────────────────────────────────────────── */

const CHARTER_FAQS = [
  {
    question: "How far in advance should I book a Mediterranean yacht charter?",
    answer:
      "For peak season (June through September), we recommend booking 3 to 6 months ahead. The most popular yachts in the Greek Islands and Croatian coast are reserved by February for the summer season. Off-peak charters (April-May, October) can often be arranged with 4 to 6 weeks' notice.",
  },
  {
    question: "Is halal catering available on every charter?",
    answer:
      "Yes. We arrange certified halal provisioning on every charter we book, regardless of destination. Our kitchen coordinators work with vetted halal suppliers at every major Mediterranean port — including Athens, Bodrum, Split, Palma de Mallorca, and Dubai. We can also accommodate vegetarian, vegan, kosher, and allergy-specific dietary requirements.",
  },
  {
    question: "Are Zenitha Yachts charters suitable for families with children?",
    answer:
      "Absolutely. Many of our catamarans and motor yachts are specifically designed for families. Features include enclosed trampolines, shallow-water toys (paddleboards, kayaks, snorkelling gear), child-sized life jackets, and cabins with connecting doors. Our crew members are experienced with young guests and can adjust itineraries for shorter sailing days and child-friendly anchorages.",
  },
  {
    question: "Which destination do you recommend for a first-time charter?",
    answer:
      "For first-time charterers, we typically recommend either the Greek Islands (Ionian or Saronic) or the Croatian coast. Both offer calm waters, short distances between ports, excellent marinas, and reliable summer weather. The Turkish Riviera is another excellent choice, particularly for those interested in a traditional gulet experience with relaxed, bay-to-bay sailing.",
  },
  {
    question: "What is included in the charter price?",
    answer:
      "The base charter fee typically covers the yacht, professional crew, insurance, standard equipment, and bed linen. The APA (Advance Provisioning Allowance) — usually 25-35% of the charter fee — covers fuel, food, beverages, port fees, and any extras such as water sports equipment hire or special excursions. We provide a transparent cost breakdown before you commit.",
  },
  {
    question: "Can I charter a yacht if I have no sailing experience?",
    answer:
      "Yes. All our crewed charters come with a professional captain and crew who handle all navigation, sailing, and safety. You are a guest — no sailing skills required. For those interested in learning, many of our captains are happy to teach basic sailing techniques during the voyage.",
  },
] as const;

/* ─── Page Component ─────────────────────────────────────────────── */

export default async function HowItWorksPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteName = getSiteConfig(siteId)?.name || "Zenitha Yachts";
  const baseUrl = await getBaseUrl();

  /* FAQPage JSON-LD */
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CHARTER_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
  return (
    <main>
      {/* FAQPage structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ═══ Hero Section ══════════════════════════════════════════ */}
      <section
        style={{
          background: "var(--z-gradient-hero-vertical)",
          color: "var(--z-pearl)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative wave accent */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "120px",
            background:
              "linear-gradient(to top, var(--z-pearl) 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        <div className="z-container" style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              paddingTop: "clamp(96px, 12vw, 160px)",
              paddingBottom: "clamp(80px, 10vw, 140px)",
              maxWidth: "var(--z-container-text)",
              marginInline: "auto",
              textAlign: "center",
            }}
          >
            <p
              className="z-text-overline"
              style={{ marginBottom: "var(--z-space-4)" }}
            >
              Your Charter Journey
            </p>

            <h1
              className="z-text-display"
              style={{
                color: "var(--z-pearl)",
                marginBottom: "var(--z-space-6)",
              }}
            >
              Your Journey to the{" "}
              <span style={{ color: "var(--z-gold)" }}>Perfect Charter</span>
            </h1>

            <p
              className="z-text-body-lg"
              style={{
                color: "var(--z-champagne)",
                maxWidth: "600px",
                marginInline: "auto",
                lineHeight: "var(--z-leading-relaxed)",
              }}
            >
              From your first inquiry to stepping aboard, we handle every detail
              so you can focus on what matters — creating unforgettable memories
              on the Mediterranean.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ Timeline Steps ════════════════════════════════════════ */}
      <section
        className="z-section"
        style={{ background: "var(--z-pearl)" }}
      >
        <div className="z-container">
          <div
            style={{
              maxWidth: "var(--z-container-lg)",
              marginInline: "auto",
              position: "relative",
            }}
          >
            {/* Vertical connecting line */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "39px",
                top: "40px",
                bottom: "40px",
                width: "2px",
                background: "var(--z-gradient-cta)",
                display: "none", // hidden on mobile
              }}
              className="timeline-line"
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--z-space-16)" }}>
              {STEPS.map((step, index) => {
                const StepIcon = step.Icon;
                const isEven = index % 2 === 0;

                return (
                  <div
                    key={step.number}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr",
                      gap: "var(--z-space-8)",
                      alignItems: "start",
                    }}
                  >
                    {/* Step Number Circle */}
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "var(--z-radius-full)",
                        background: "var(--z-gradient-cta)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "var(--z-shadow-gold)",
                        flexShrink: 0,
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--z-font-display)",
                          fontSize: "var(--z-text-title)",
                          fontWeight: "var(--z-weight-bold)",
                          color: "var(--z-navy)",
                          lineHeight: 1,
                        }}
                      >
                        {step.number}
                      </span>
                    </div>

                    {/* Step Content */}
                    <div
                      style={{
                        background: isEven
                          ? "var(--z-surface)"
                          : "var(--z-sand)",
                        borderRadius: "var(--z-radius-lg)",
                        padding: "var(--z-space-8)",
                        border: "var(--z-border-width) solid var(--z-border)",
                        boxShadow: "var(--z-shadow-card)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--z-space-3)",
                          marginBottom: "var(--z-space-4)",
                        }}
                      >
                        <StepIcon
                          size={28}
                          style={{ color: "var(--z-gold)", flexShrink: 0 }}
                        />
                        <h2
                          className="z-text-title"
                          style={{ margin: 0 }}
                        >
                          {step.title}
                        </h2>
                      </div>

                      <p
                        className="z-text-body-lg"
                        style={{
                          color: "var(--z-muted)",
                          marginBottom: "var(--z-space-6)",
                          lineHeight: "var(--z-leading-relaxed)",
                        }}
                      >
                        {step.description}
                      </p>

                      <ul
                        style={{
                          listStyle: "none",
                          padding: 0,
                          margin: 0,
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: "var(--z-space-3)",
                        }}
                      >
                        {step.details.map((detail) => (
                          <li
                            key={detail}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "var(--z-space-2)",
                              fontSize: "var(--z-text-body-sm)",
                              fontFamily: "var(--z-font-body)",
                              color: "var(--z-fg)",
                            }}
                          >
                            <span
                              style={{
                                color: "var(--z-gold)",
                                fontWeight: "var(--z-weight-bold)",
                                lineHeight: "1.5",
                                flexShrink: 0,
                              }}
                            >
                              &#x2713;
                            </span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Responsive CSS for timeline line ── */}
            <style>{`
              @media (min-width: 768px) {
                .timeline-line {
                  display: block !important;
                }
              }
            `}</style>
          </div>
        </div>
      </section>

      {/* ═══ Why Choose Us ═════════════════════════════════════════ */}
      <section
        className="z-section"
        style={{ background: "var(--z-surface)" }}
      >
        <div className="z-container">
          <div
            style={{
              textAlign: "center",
              maxWidth: "var(--z-container-text)",
              marginInline: "auto",
              marginBottom: "var(--z-space-14)",
            }}
          >
            <p
              className="z-text-overline"
              style={{ marginBottom: "var(--z-space-3)" }}
            >
              Why Zenitha Yachts
            </p>
            <h2
              className="z-text-title-lg"
              style={{ marginBottom: "var(--z-space-4)" }}
            >
              The Zenitha Difference
            </h2>
            <span className="z-gold-bar-wide" style={{ marginInline: "auto", display: "block" }} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "var(--z-space-8)",
              maxWidth: "var(--z-container-wide)",
              marginInline: "auto",
            }}
          >
            {ADVANTAGES.map((advantage) => {
              const AdvIcon = advantage.Icon;

              return (
                <div
                  key={advantage.title}
                  className="z-card"
                  style={{ textAlign: "center" }}
                >
                  <div className="z-card-body" style={{ padding: "var(--z-space-8)" }}>
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "var(--z-radius-xl)",
                        background:
                          "linear-gradient(135deg, rgba(201, 169, 110, 0.12), rgba(201, 169, 110, 0.04))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginInline: "auto",
                        marginBottom: "var(--z-space-5)",
                      }}
                    >
                      <AdvIcon size={28} style={{ color: "var(--z-gold)" }} />
                    </div>
                    <h3
                      className="z-text-heading"
                      style={{ marginBottom: "var(--z-space-3)" }}
                    >
                      {advantage.title}
                    </h3>
                    <p
                      className="z-text-body"
                      style={{
                        color: "var(--z-muted)",
                        lineHeight: "var(--z-leading-relaxed)",
                        margin: 0,
                      }}
                    >
                      {advantage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FAQ Section ═══════════════════════════════════════════ */}
      <section
        className="z-section"
        style={{ background: "var(--z-pearl)" }}
      >
        <div className="z-container">
          <div
            style={{
              textAlign: "center",
              maxWidth: "var(--z-container-text)",
              marginInline: "auto",
              marginBottom: "var(--z-space-12)",
            }}
          >
            <p
              className="z-text-overline"
              style={{ marginBottom: "var(--z-space-3)" }}
            >
              Common Questions
            </p>
            <h2
              className="z-text-title-lg"
              style={{ marginBottom: "var(--z-space-4)" }}
            >
              Frequently Asked Questions
            </h2>
            <span className="z-gold-bar-wide" style={{ marginInline: "auto", display: "block" }} />
          </div>

          <div
            style={{
              maxWidth: "var(--z-container-lg)",
              marginInline: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "var(--z-space-4)",
            }}
          >
            {CHARTER_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="z-card"
                style={{ overflow: "hidden" }}
              >
                <summary
                  style={{
                    padding: "var(--z-space-5) var(--z-space-6)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--z-space-3)",
                    listStyle: "none",
                    fontFamily: "var(--z-font-heading)",
                    fontSize: "var(--z-text-heading)",
                    fontWeight: "var(--z-weight-semibold)",
                    color: "var(--z-navy)",
                  }}
                >
                  <HelpCircle
                    size={20}
                    style={{ color: "var(--z-gold)", flexShrink: 0 }}
                  />
                  {faq.question}
                </summary>
                <div
                  style={{
                    padding: "0 var(--z-space-6) var(--z-space-5) calc(var(--z-space-6) + 20px + var(--z-space-3))",
                    fontFamily: "var(--z-font-body)",
                    fontSize: "var(--z-text-body)",
                    color: "var(--z-muted)",
                    lineHeight: "var(--z-leading-relaxed)",
                  }}
                >
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "var(--z-space-8)" }}>
            <Link
              href="/faq"
              className="z-text-body"
              style={{
                color: "var(--z-aegean)",
                fontWeight: "var(--z-weight-semibold)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              View All FAQs →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ CTA Section ═══════════════════════════════════════════ */}
      <section
        className="z-section-lg"
        style={{
          background: "var(--z-gradient-hero)",
          color: "var(--z-pearl)",
          textAlign: "center",
        }}
      >
        <div className="z-container">
          <div
            style={{
              maxWidth: "var(--z-container-text)",
              marginInline: "auto",
            }}
          >
            <Award
              size={48}
              style={{
                color: "var(--z-gold)",
                marginBottom: "var(--z-space-6)",
                marginInline: "auto",
                display: "block",
              }}
            />
            <h2
              className="z-text-title-lg"
              style={{
                color: "var(--z-pearl)",
                marginBottom: "var(--z-space-4)",
              }}
            >
              Ready to Start Your Journey?
            </h2>
            <p
              className="z-text-body-lg"
              style={{
                color: "var(--z-champagne)",
                marginBottom: "var(--z-space-8)",
                lineHeight: "var(--z-leading-relaxed)",
              }}
            >
              Tell us about your dream charter and our expert team will craft a
              personalised Mediterranean experience just for you. No obligation,
              no pressure — just inspiration.
            </p>
            <div
              style={{
                display: "flex",
                gap: "var(--z-space-4)",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/inquiry"
                className="z-btn z-btn-primary z-btn-lg"
              >
                Start Your Charter Inquiry
              </Link>
              <Link
                href="/fleet"
                className="z-btn z-btn-lg"
                style={{
                  background: "transparent",
                  color: "var(--z-pearl)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                }}
              >
                Browse Our Fleet
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
