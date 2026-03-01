import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import {
  Ship,
  Anchor,
  Compass,
  Wind,
  Users,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId } from "@/config/sites";

/* ═══════════════════════════════════════════════════════════════════
   YACHT TYPE DATA — marketing descriptions for the fleet landing
   ═══════════════════════════════════════════════════════════════════ */

const YACHT_TYPES = [
  {
    slug: "motor-yachts",
    name: "Motor Yachts",
    tagline: "Speed, space, and effortless luxury",
    description:
      "Ideal for guests who want to cover more ground without sacrificing comfort. Our motor yachts range from sleek 50-footers for intimate cruises to 100-foot-plus superyachts with jacuzzis, water toy garages, and onboard chefs. Popular for the French Riviera and Arabian Gulf.",
    specs: { length: "50–120 ft", guests: "6–12", crew: "3–8" },
    image:
      "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80&auto=format&fit=crop",
    Icon: Ship,
  },
  {
    slug: "sailing-yachts",
    name: "Sailing Yachts",
    tagline: "The authentic way to experience the sea",
    description:
      "For those who love the rhythm of wind and waves. Our sailing yachts combine traditional craftsmanship with modern navigation. Perfect for the Greek Islands and Croatian coast, where gentle meltemi winds create ideal sailing conditions from May through October.",
    specs: { length: "40–80 ft", guests: "4–10", crew: "2–5" },
    image:
      "https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=800&q=80&auto=format&fit=crop",
    Icon: Wind,
  },
  {
    slug: "catamarans",
    name: "Catamarans",
    tagline: "Stability, space, and family comfort",
    description:
      "Twin hulls provide exceptional stability, generous living space, and shallow drafts that allow anchoring in secluded bays inaccessible to monohulls. The most popular choice for families with children and first-time charterers exploring the Balearic Islands or Cyclades.",
    specs: { length: "38–62 ft", guests: "6–12", crew: "2–4" },
    image:
      "https://images.unsplash.com/photo-1724261813677-05803b039805?w=800&q=80&auto=format&fit=crop",
    Icon: Anchor,
  },
  {
    slug: "gulets",
    name: "Turkish Gulets",
    tagline: "Handcrafted wooden vessels with timeless character",
    description:
      "Traditional Turkish wooden sailing vessels, reimagined for modern comfort. Gulets are purpose-built for the legendary blue cruise along Turkey's Lycian coast, with spacious sun decks, onboard barbecues, and cabins that blend Ottoman craftsmanship with contemporary amenities.",
    specs: { length: "60–100 ft", guests: "8–16", crew: "4–8" },
    image:
      "https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?w=800&q=80&auto=format&fit=crop",
    Icon: Compass,
  },
];

/* ═══════════════════════════════════════════════════════════════════
   FLEET ADVANTAGES
   ═══════════════════════════════════════════════════════════════════ */

const FLEET_ADVANTAGES = [
  {
    title: "Personally Vetted",
    description:
      "Every vessel in our fleet has been inspected by our charter team. We check safety equipment, crew qualifications, maintenance logs, and guest reviews before recommending any yacht.",
  },
  {
    title: "Halal Catering on Every Charter",
    description:
      "We arrange certified halal provisioning at every departure port. Our kitchen coordinators work with local halal suppliers across the Mediterranean and Gulf to ensure authentic, high-quality meals onboard.",
  },
  {
    title: "Multilingual Crews",
    description:
      "Our network includes Arabic-speaking captains and crew members. We match your language preferences so every interaction — from safety briefings to dinner orders — feels natural.",
  },
  {
    title: "Transparent Pricing",
    description:
      "No hidden fees. We provide detailed cost breakdowns including base charter, APA (Advance Provisioning Allowance), port fees, and any extras so you know exactly what to expect.",
  },
];

/* ═══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default async function FleetPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();

  /* Structured data: ItemList of yacht types */
  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Zenitha Yachts Fleet — Yacht Types",
    description:
      "Browse our curated fleet of motor yachts, sailing yachts, catamarans, and Turkish gulets for Mediterranean and Arabian Gulf charters.",
    url: `${baseUrl}/fleet`,
    numberOfItems: YACHT_TYPES.length,
    itemListElement: YACHT_TYPES.map((type, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: type.name,
      url: `${baseUrl}/yachts?type=${type.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }}
      />

      <main>
        {/* ═══ Hero Section ══════════════════════════════════════ */}
        <section
          style={{
            background: "var(--z-gradient-hero-vertical)",
            color: "var(--z-pearl)",
            position: "relative",
            overflow: "hidden",
          }}
        >
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

          <div
            className="z-container"
            style={{ position: "relative", zIndex: 1 }}
          >
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
                Our Fleet
              </p>

              <h1
                className="z-text-display"
                style={{
                  color: "var(--z-pearl)",
                  marginBottom: "var(--z-space-6)",
                }}
              >
                Yachts Handpicked for{" "}
                <span style={{ color: "var(--z-gold)" }}>
                  Exceptional Voyages
                </span>
              </h1>

              <p
                className="z-text-body-lg"
                style={{
                  color: "var(--z-champagne)",
                  maxWidth: "640px",
                  marginInline: "auto",
                  lineHeight: "var(--z-leading-relaxed)",
                }}
              >
                From sleek motor yachts on the French Riviera to traditional
                gulets along Turkey&rsquo;s turquoise coast &mdash; every vessel
                in our fleet is vetted for safety, comfort, and the kind of
                service discerning travellers expect.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "var(--z-space-4)",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  marginTop: "var(--z-space-8)",
                }}
              >
                <Link
                  href="/yachts"
                  className="z-btn z-btn-primary z-btn-lg"
                >
                  <Compass className="w-5 h-5" />
                  Search All Yachts
                </Link>
                <Link
                  href="/charter-planner"
                  className="z-btn z-btn-secondary z-btn-lg"
                  style={{
                    color: "var(--z-pearl)",
                    borderColor: "rgba(255,255,255,0.3)",
                  }}
                >
                  <Ship className="w-5 h-5" />
                  Plan Your Charter
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Yacht Types ══════════════════════════════════════ */}
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
                marginBottom: "var(--z-space-14)",
              }}
            >
              <p
                className="z-text-overline"
                style={{ marginBottom: "var(--z-space-3)" }}
              >
                Vessel Types
              </p>
              <h2
                className="z-text-title-lg"
                style={{ marginBottom: "var(--z-space-4)" }}
              >
                Find the Right Yacht for Your Journey
              </h2>
              <span
                className="z-gold-bar-wide"
                style={{ marginInline: "auto", display: "block" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--z-space-12)",
              }}
            >
              {YACHT_TYPES.map((yacht, index) => {
                const TypeIcon = yacht.Icon;
                const isReversed = index % 2 === 1;

                return (
                  <div
                    key={yacht.slug}
                    className="z-card"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="yacht-type-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: 0,
                      }}
                    >
                      {/* Image */}
                      <div
                        className={`yacht-type-image ${isReversed ? "yacht-type-image-reversed" : ""}`}
                        style={{
                          position: "relative",
                          minHeight: "280px",
                          background: "var(--z-gradient-card)",
                        }}
                      >
                        <Image
                          src={yacht.image}
                          alt={`${yacht.name} — luxury charter yacht`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(to top, rgba(10,22,40,0.3), transparent 50%)",
                          }}
                        />
                      </div>

                      {/* Content */}
                      <div
                        className="z-card-body"
                        style={{ padding: "var(--z-space-8)" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--z-space-3)",
                            marginBottom: "var(--z-space-4)",
                          }}
                        >
                          <TypeIcon
                            size={28}
                            style={{ color: "var(--z-gold)", flexShrink: 0 }}
                          />
                          <div>
                            <h3
                              className="z-text-title"
                              style={{ margin: 0 }}
                            >
                              {yacht.name}
                            </h3>
                            <p
                              className="z-text-caption"
                              style={{
                                color: "var(--z-gold-dark)",
                                margin: 0,
                              }}
                            >
                              {yacht.tagline}
                            </p>
                          </div>
                        </div>

                        <p
                          className="z-text-body-lg"
                          style={{
                            color: "var(--z-muted)",
                            marginBottom: "var(--z-space-6)",
                            lineHeight: "var(--z-leading-relaxed)",
                          }}
                        >
                          {yacht.description}
                        </p>

                        {/* Specs */}
                        <div
                          style={{
                            display: "flex",
                            gap: "var(--z-space-6)",
                            flexWrap: "wrap",
                            marginBottom: "var(--z-space-6)",
                            paddingTop: "var(--z-space-4)",
                            borderTop:
                              "var(--z-border-width) solid var(--z-border-subtle)",
                          }}
                        >
                          <div>
                            <span
                              className="z-text-overline"
                              style={{ fontSize: "var(--z-text-micro)" }}
                            >
                              Length
                            </span>
                            <p
                              className="z-text-body"
                              style={{
                                fontWeight: "var(--z-weight-semibold)",
                                color: "var(--z-navy)",
                                margin: 0,
                              }}
                            >
                              {yacht.specs.length}
                            </p>
                          </div>
                          <div>
                            <span
                              className="z-text-overline"
                              style={{ fontSize: "var(--z-text-micro)" }}
                            >
                              Guests
                            </span>
                            <p
                              className="z-text-body"
                              style={{
                                fontWeight: "var(--z-weight-semibold)",
                                color: "var(--z-navy)",
                                margin: 0,
                              }}
                            >
                              {yacht.specs.guests}
                            </p>
                          </div>
                          <div>
                            <span
                              className="z-text-overline"
                              style={{ fontSize: "var(--z-text-micro)" }}
                            >
                              Crew
                            </span>
                            <p
                              className="z-text-body"
                              style={{
                                fontWeight: "var(--z-weight-semibold)",
                                color: "var(--z-navy)",
                                margin: 0,
                              }}
                            >
                              {yacht.specs.crew}
                            </p>
                          </div>
                        </div>

                        <Link
                          href={`/yachts?type=${yacht.slug}`}
                          className="z-btn z-btn-primary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "var(--z-space-2)",
                          }}
                        >
                          Browse {yacht.name}
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </div>

                    {/* Responsive grid for image + content side by side on desktop */}
                    <style>{`
                      @media (min-width: 768px) {
                        .yacht-type-grid {
                          grid-template-columns: 1fr 1fr !important;
                        }
                        .yacht-type-image {
                          min-height: 360px !important;
                          order: 0;
                        }
                        .yacht-type-image-reversed {
                          order: 2 !important;
                        }
                      }
                    `}</style>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══ Why Our Fleet ════════════════════════════════════ */}
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
                The Zenitha Standard
              </p>
              <h2
                className="z-text-title-lg"
                style={{ marginBottom: "var(--z-space-4)" }}
              >
                Why Charter With Us
              </h2>
              <span
                className="z-gold-bar-wide"
                style={{ marginInline: "auto", display: "block" }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "var(--z-space-8)",
                maxWidth: "var(--z-container-wide)",
                marginInline: "auto",
              }}
            >
              {FLEET_ADVANTAGES.map((advantage) => (
                <div
                  key={advantage.title}
                  className="z-card"
                  style={{ textAlign: "center" }}
                >
                  <div
                    className="z-card-body"
                    style={{ padding: "var(--z-space-8)" }}
                  >
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
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Ideal For Travellers From ═══════════════════════ */}
        <section
          className="z-section"
          style={{ background: "var(--z-pearl)" }}
        >
          <div className="z-container">
            <div
              style={{
                maxWidth: "var(--z-container-text)",
                marginInline: "auto",
                textAlign: "center",
              }}
            >
              <h2
                className="z-text-title-lg"
                style={{ marginBottom: "var(--z-space-4)" }}
              >
                Tailored for Global Travellers
              </h2>
              <p
                className="z-text-body-lg"
                style={{
                  color: "var(--z-muted)",
                  lineHeight: "var(--z-leading-relaxed)",
                  marginBottom: "var(--z-space-6)",
                }}
              >
                Zenitha Yachts serves discerning travellers from the United
                Kingdom, France, Germany, Italy, the United States, Canada,
                Saudi Arabia, the UAE, Qatar, Kuwait, Egypt, Singapore, and
                Australia. Our charter specialists understand the expectations
                of each market &mdash; from halal provisioning and
                Arabic-speaking crew for Gulf families, to wine pairings and
                Michelin-level cuisine for European guests.
              </p>
              <p
                className="z-text-body"
                style={{
                  color: "var(--z-muted)",
                  lineHeight: "var(--z-leading-relaxed)",
                  marginBottom: "var(--z-space-8)",
                }}
              >
                Whether you are chartering from Dubai Marina, Athens Piraeus, or
                Palma de Mallorca, our local operations teams ensure seamless
                embarkation, provisioning, and concierge support from day one.
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
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/destinations"
                  className="z-btn z-btn-secondary z-btn-lg"
                >
                  Explore Destinations
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CTA Section ═══════════════════════════════════════ */}
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
              <Users
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
                Not Sure Which Yacht Is Right?
              </h2>
              <p
                className="z-text-body-lg"
                style={{
                  color: "var(--z-champagne)",
                  marginBottom: "var(--z-space-8)",
                  lineHeight: "var(--z-leading-relaxed)",
                }}
              >
                Tell us your group size, destination, and budget, and our charter
                specialists will recommend the perfect vessel. No obligation, no
                pressure &mdash; just expert guidance.
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
                  href="/charter-planner"
                  className="z-btn z-btn-primary z-btn-lg"
                >
                  Try the AI Charter Planner
                </Link>
                <Link
                  href="/yachts"
                  className="z-btn z-btn-lg"
                  style={{
                    background: "transparent",
                    color: "var(--z-pearl)",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                  }}
                >
                  Browse All Yachts
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
