"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  Ship,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Anchor,
  Waves,
  UtensilsCrossed,
  Baby,
  Dumbbell,
  PartyPopper,
  Landmark,
  Wine,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════ */

interface PlannerState {
  /* Step 1: When */
  month: string;
  year: number;
  duration: number;
  /* Step 2: Where */
  destination: string;
  /* Step 3: Who */
  guests: number;
  children: number;
  specialNeeds: string;
  /* Step 4: What */
  yachtType: string;
  budgetMin: number;
  budgetMax: number;
  /* Step 5: Preferences */
  preferences: string[];
}

const INITIAL_STATE: PlannerState = {
  month: "",
  year: new Date().getFullYear(),
  duration: 7,
  destination: "",
  guests: 4,
  children: 0,
  specialNeeds: "",
  yachtType: "",
  budgetMin: 5000,
  budgetMax: 25000,
  preferences: [],
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DURATIONS = [3, 5, 7, 10, 14];

const DESTINATIONS = [
  {
    id: "greek-islands",
    name: "Greek Islands",
    description: "Cyclades, Dodecanese, Ionian Islands",
    emoji: "\u{1F1EC}\u{1F1F7}",
  },
  {
    id: "croatia",
    name: "Croatia",
    description: "Dalmatian Coast, Split, Dubrovnik",
    emoji: "\u{1F1ED}\u{1F1F7}",
  },
  {
    id: "turkey",
    name: "Turkey",
    description: "Turkish Riviera, Bodrum, Gocek",
    emoji: "\u{1F1F9}\u{1F1F7}",
  },
  {
    id: "french-riviera",
    name: "French Riviera",
    description: "Cannes, Saint-Tropez, Monaco",
    emoji: "\u{1F1EB}\u{1F1F7}",
  },
  {
    id: "amalfi-coast",
    name: "Amalfi Coast",
    description: "Positano, Capri, Amalfi",
    emoji: "\u{1F1EE}\u{1F1F9}",
  },
  {
    id: "balearics",
    name: "Balearic Islands",
    description: "Mallorca, Ibiza, Menorca",
    emoji: "\u{1F1EA}\u{1F1F8}",
  },
];

const YACHT_TYPES = [
  {
    id: "sailing",
    name: "Sailing Yacht",
    description: "Classic wind-powered sailing",
    icon: "sailboat",
  },
  {
    id: "catamaran",
    name: "Catamaran",
    description: "Stable, spacious twin-hull",
    icon: "catamaran",
  },
  {
    id: "motor",
    name: "Motor Yacht",
    description: "Speed and modern luxury",
    icon: "motor",
  },
  {
    id: "gulet",
    name: "Gulet",
    description: "Traditional Turkish wooden yacht",
    icon: "gulet",
  },
  {
    id: "superyacht",
    name: "Superyacht",
    description: "Ultimate luxury over 24m",
    icon: "superyacht",
  },
];

const PREFERENCE_OPTIONS = [
  { id: "halal-catering", label: "Halal Catering", Icon: UtensilsCrossed },
  { id: "family-friendly", label: "Family-Friendly", Icon: Baby },
  { id: "water-sports", label: "Water Sports", Icon: Waves },
  { id: "diving", label: "Diving", Icon: Anchor },
  { id: "nightlife", label: "Nightlife", Icon: PartyPopper },
  { id: "cultural-excursions", label: "Cultural Excursions", Icon: Landmark },
  { id: "wine-tasting", label: "Wine Tasting", Icon: Wine },
  { id: "fitness", label: "Fitness & Wellness", Icon: Dumbbell },
];

const STEP_LABELS = ["When", "Where", "Who", "What", "Preferences", "Results"];
const STEP_ICONS = [Calendar, MapPin, Users, Ship, Sparkles, Check];

const TOTAL_STEPS = STEP_LABELS.length;

/* ═══════════════════════════════════════════════════════════════════
   Utility — build inquiry URL with pre-filled params
   ═══════════════════════════════════════════════════════════════════ */

function buildInquiryUrl(state: PlannerState): string {
  const params = new URLSearchParams();
  if (state.month) params.set("month", state.month);
  if (state.year) params.set("year", String(state.year));
  if (state.duration) params.set("duration", String(state.duration));
  if (state.destination) params.set("destination", state.destination);
  if (state.guests) params.set("guests", String(state.guests));
  if (state.children) params.set("children", String(state.children));
  if (state.yachtType) params.set("yachtType", state.yachtType);
  if (state.budgetMin) params.set("budgetMin", String(state.budgetMin));
  if (state.budgetMax) params.set("budgetMax", String(state.budgetMax));
  if (state.preferences.length > 0)
    params.set("preferences", state.preferences.join(","));
  if (state.specialNeeds) params.set("notes", state.specialNeeds);
  return `/inquiry?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function CharterPlannerPage() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<PlannerState>(INITIAL_STATE);

  /* ── Step Navigation ── */
  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return state.month !== "" && state.duration > 0;
      case 1:
        return state.destination !== "";
      case 2:
        return state.guests >= 2;
      case 3:
        return state.yachtType !== "";
      case 4:
        return true; // Preferences are optional
      default:
        return false;
    }
  }, [step, state]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1 && canProceed) setStep((s) => s + 1);
  }, [step, canProceed]);

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const update = useCallback(
    <K extends keyof PlannerState>(key: K, value: PlannerState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const togglePreference = useCallback((prefId: string) => {
    setState((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(prefId)
        ? prev.preferences.filter((p) => p !== prefId)
        : [...prev.preferences, prefId],
    }));
  }, []);

  /* ── Shared styles ── */
  const sectionStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  };

  const contentMaxWidth = "var(--z-container)";

  return (
    <main style={sectionStyle}>
      {/* ═══ Hero Header ═══════════════════════════════════════════ */}
      <section
        style={{
          background: "var(--z-gradient-hero-vertical)",
          color: "var(--z-pearl)",
          paddingTop: "clamp(64px, 8vw, 96px)",
          paddingBottom: "var(--z-space-8)",
        }}
      >
        <div className="z-container" style={{ textAlign: "center" }}>
          <p
            className="z-text-overline"
            style={{ marginBottom: "var(--z-space-3)" }}
          >
            AI Charter Planner
          </p>
          <h1
            className="z-text-title-lg"
            style={{
              color: "var(--z-pearl)",
              marginBottom: "var(--z-space-4)",
            }}
          >
            Plan Your{" "}
            <span style={{ color: "var(--z-gold)" }}>Dream Charter</span>
          </h1>
          <p
            className="z-text-body-lg"
            style={{
              color: "var(--z-champagne)",
              maxWidth: "560px",
              marginInline: "auto",
            }}
          >
            Answer a few questions and we will craft personalised
            recommendations for your perfect Mediterranean voyage.
          </p>
        </div>
      </section>

      {/* ═══ Progress Bar ══════════════════════════════════════════ */}
      <div
        style={{
          background: "var(--z-navy)",
          borderBottom: "1px solid rgba(201, 169, 110, 0.2)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          className="z-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--z-space-1)",
            paddingBlock: "var(--z-space-4)",
            overflowX: "auto",
          }}
        >
          {STEP_LABELS.map((label, i) => {
            const StepIcon = STEP_ICONS[i];
            const isActive = i === step;
            const isCompleted = i < step;

            return (
              <button
                key={label}
                onClick={() => {
                  if (i < step) setStep(i);
                }}
                disabled={i > step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--z-space-2)",
                  padding: "var(--z-space-2) var(--z-space-3)",
                  borderRadius: "var(--z-radius-full)",
                  border: "none",
                  cursor: i <= step ? "pointer" : "default",
                  background: isActive
                    ? "rgba(201, 169, 110, 0.2)"
                    : "transparent",
                  color: isActive
                    ? "var(--z-gold)"
                    : isCompleted
                    ? "var(--z-champagne)"
                    : "rgba(255, 255, 255, 0.3)",
                  transition: "all 200ms ease",
                  whiteSpace: "nowrap",
                  fontFamily: "var(--z-font-heading)",
                  fontSize: "var(--z-text-caption)",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: "var(--z-tracking-wide)",
                }}
              >
                <StepIcon size={16} />
                <span
                  style={{
                    display: "none",
                  }}
                  className="step-label-text"
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress track */}
        <div
          style={{
            height: "2px",
            background: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
              background: "var(--z-gradient-cta)",
              transition: "width 400ms cubic-bezier(0.25, 0.1, 0.25, 1)",
            }}
          />
        </div>

        {/* Responsive label visibility */}
        <style>{`
          @media (min-width: 640px) {
            .step-label-text { display: inline !important; }
          }
        `}</style>
      </div>

      {/* ═══ Step Content Area ═════════════════════════════════════ */}
      <section
        style={{
          flex: 1,
          background:
            step === TOTAL_STEPS - 1
              ? "var(--z-pearl)"
              : "var(--z-surface)",
          paddingBlock: "var(--z-space-12)",
        }}
      >
        <div
          className="z-container"
          style={{ maxWidth: contentMaxWidth }}
        >
          {/* ─── Step 0: When ─────────────────────────────────── */}
          {step === 0 && (
            <StepWrapper title="When would you like to charter?">
              <div style={{ marginBottom: "var(--z-space-8)" }}>
                <label
                  className="z-text-body"
                  style={{
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "var(--z-space-3)",
                    color: "var(--z-navy)",
                  }}
                >
                  Preferred Month
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(120px, 1fr))",
                    gap: "var(--z-space-3)",
                  }}
                >
                  {MONTHS.map((m) => (
                    <SelectCard
                      key={m}
                      label={m}
                      selected={state.month === m}
                      onClick={() => update("month", m)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label
                  className="z-text-body"
                  style={{
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "var(--z-space-3)",
                    color: "var(--z-navy)",
                  }}
                >
                  Duration (days)
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--z-space-3)",
                    flexWrap: "wrap",
                  }}
                >
                  {DURATIONS.map((d) => (
                    <SelectCard
                      key={d}
                      label={`${d} days`}
                      selected={state.duration === d}
                      onClick={() => update("duration", d)}
                      style={{ minWidth: "100px" }}
                    />
                  ))}
                </div>
              </div>
            </StepWrapper>
          )}

          {/* ─── Step 1: Where ────────────────────────────────── */}
          {step === 1 && (
            <StepWrapper title="Where would you like to sail?">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "var(--z-space-4)",
                }}
              >
                {DESTINATIONS.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => update("destination", dest.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--z-space-4)",
                      padding: "var(--z-space-5) var(--z-space-6)",
                      borderRadius: "var(--z-radius-lg)",
                      border:
                        state.destination === dest.id
                          ? "2px solid var(--z-gold)"
                          : "1px solid var(--z-border)",
                      background:
                        state.destination === dest.id
                          ? "rgba(201, 169, 110, 0.06)"
                          : "var(--z-surface)",
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow:
                        state.destination === dest.id
                          ? "var(--z-shadow-gold)"
                          : "var(--z-shadow-card)",
                      transition: "all 250ms ease",
                    }}
                  >
                    <span style={{ fontSize: "2rem", lineHeight: 1 }}>
                      {dest.emoji}
                    </span>
                    <div>
                      <div
                        className="z-text-heading"
                        style={{
                          fontSize: "var(--z-text-body-lg)",
                          marginBottom: "2px",
                        }}
                      >
                        {dest.name}
                      </div>
                      <div
                        className="z-text-body-sm"
                        style={{ color: "var(--z-muted)" }}
                      >
                        {dest.description}
                      </div>
                    </div>
                    {state.destination === dest.id && (
                      <Check
                        size={20}
                        style={{
                          color: "var(--z-gold)",
                          marginLeft: "auto",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </StepWrapper>
          )}

          {/* ─── Step 2: Who ──────────────────────────────────── */}
          {step === 2 && (
            <StepWrapper title="Who is joining the voyage?">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "var(--z-space-8)",
                  marginBottom: "var(--z-space-8)",
                }}
              >
                <NumberStepper
                  label="Adults"
                  value={state.guests}
                  min={2}
                  max={20}
                  onChange={(v) => update("guests", v)}
                />
                <NumberStepper
                  label="Children"
                  value={state.children}
                  min={0}
                  max={10}
                  onChange={(v) => update("children", v)}
                />
              </div>

              <div>
                <label
                  className="z-text-body"
                  style={{
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "var(--z-space-3)",
                    color: "var(--z-navy)",
                  }}
                >
                  Special Requirements (optional)
                </label>
                <textarea
                  className="z-input z-textarea"
                  placeholder="Accessibility needs, mobility considerations, allergies..."
                  value={state.specialNeeds}
                  onChange={(e) => update("specialNeeds", e.target.value)}
                  rows={3}
                />
              </div>
            </StepWrapper>
          )}

          {/* ─── Step 3: What ─────────────────────────────────── */}
          {step === 3 && (
            <StepWrapper title="What type of yacht do you prefer?">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "var(--z-space-4)",
                  marginBottom: "var(--z-space-10)",
                }}
              >
                {YACHT_TYPES.map((yt) => (
                  <button
                    key={yt.id}
                    onClick={() => update("yachtType", yt.id)}
                    style={{
                      padding: "var(--z-space-6)",
                      borderRadius: "var(--z-radius-lg)",
                      border:
                        state.yachtType === yt.id
                          ? "2px solid var(--z-gold)"
                          : "1px solid var(--z-border)",
                      background:
                        state.yachtType === yt.id
                          ? "rgba(201, 169, 110, 0.06)"
                          : "var(--z-surface)",
                      cursor: "pointer",
                      textAlign: "center",
                      boxShadow:
                        state.yachtType === yt.id
                          ? "var(--z-shadow-gold)"
                          : "var(--z-shadow-card)",
                      transition: "all 250ms ease",
                    }}
                  >
                    <Ship
                      size={32}
                      style={{
                        color:
                          state.yachtType === yt.id
                            ? "var(--z-gold)"
                            : "var(--z-aegean)",
                        marginBottom: "var(--z-space-3)",
                      }}
                    />
                    <div
                      className="z-text-heading"
                      style={{
                        fontSize: "var(--z-text-body)",
                        marginBottom: "4px",
                      }}
                    >
                      {yt.name}
                    </div>
                    <div
                      className="z-text-body-sm"
                      style={{ color: "var(--z-muted)", fontSize: "var(--z-text-caption)" }}
                    >
                      {yt.description}
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <label
                  className="z-text-body"
                  style={{
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "var(--z-space-3)",
                    color: "var(--z-navy)",
                  }}
                >
                  Weekly Budget Range (EUR)
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--z-space-4)",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: "1 1 200px" }}>
                    <span
                      className="z-text-caption"
                      style={{
                        color: "var(--z-muted)",
                        display: "block",
                        marginBottom: "var(--z-space-1)",
                      }}
                    >
                      From
                    </span>
                    <input
                      type="number"
                      className="z-input"
                      value={state.budgetMin}
                      onChange={(e) =>
                        update("budgetMin", Number(e.target.value))
                      }
                      min={1000}
                      step={1000}
                    />
                  </div>
                  <span
                    style={{
                      color: "var(--z-muted)",
                      paddingTop: "var(--z-space-5)",
                    }}
                  >
                    &mdash;
                  </span>
                  <div style={{ flex: "1 1 200px" }}>
                    <span
                      className="z-text-caption"
                      style={{
                        color: "var(--z-muted)",
                        display: "block",
                        marginBottom: "var(--z-space-1)",
                      }}
                    >
                      To
                    </span>
                    <input
                      type="number"
                      className="z-input"
                      value={state.budgetMax}
                      onChange={(e) =>
                        update("budgetMax", Number(e.target.value))
                      }
                      min={1000}
                      step={1000}
                    />
                  </div>
                </div>
              </div>
            </StepWrapper>
          )}

          {/* ─── Step 4: Preferences ──────────────────────────── */}
          {step === 4 && (
            <StepWrapper title="Any special preferences?">
              <p
                className="z-text-body"
                style={{
                  color: "var(--z-muted)",
                  marginBottom: "var(--z-space-6)",
                }}
              >
                Select everything that matters to you. These are optional but
                help us tailor your experience.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "var(--z-space-4)",
                }}
              >
                {PREFERENCE_OPTIONS.map((pref) => {
                  const PrefIcon = pref.Icon;
                  const isSelected = state.preferences.includes(pref.id);

                  return (
                    <button
                      key={pref.id}
                      onClick={() => togglePreference(pref.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--z-space-3)",
                        padding: "var(--z-space-4) var(--z-space-5)",
                        borderRadius: "var(--z-radius-lg)",
                        border: isSelected
                          ? "2px solid var(--z-gold)"
                          : "1px solid var(--z-border)",
                        background: isSelected
                          ? "rgba(201, 169, 110, 0.06)"
                          : "var(--z-surface)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 200ms ease",
                        boxShadow: isSelected
                          ? "var(--z-shadow-gold)"
                          : "none",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "var(--z-radius-md)",
                          background: isSelected
                            ? "rgba(201, 169, 110, 0.15)"
                            : "var(--z-surface-sunken)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <PrefIcon
                          size={20}
                          style={{
                            color: isSelected
                              ? "var(--z-gold)"
                              : "var(--z-muted)",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--z-font-heading)",
                          fontSize: "var(--z-text-body)",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected
                            ? "var(--z-navy)"
                            : "var(--z-fg)",
                        }}
                      >
                        {pref.label}
                      </span>
                      {isSelected && (
                        <Check
                          size={18}
                          style={{
                            color: "var(--z-gold)",
                            marginLeft: "auto",
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </StepWrapper>
          )}

          {/* ─── Step 5: Results ──────────────────────────────── */}
          {step === 5 && (
            <div
              style={{
                maxWidth: "var(--z-container-text)",
                marginInline: "auto",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "var(--z-space-10)" }}>
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "var(--z-radius-full)",
                    background: "var(--z-gradient-cta)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginInline: "auto",
                    marginBottom: "var(--z-space-5)",
                    boxShadow: "var(--z-shadow-gold-lg)",
                  }}
                >
                  <Check size={36} style={{ color: "var(--z-navy)" }} />
                </div>
                <h2 className="z-text-title-lg" style={{ marginBottom: "var(--z-space-3)" }}>
                  Your Charter Summary
                </h2>
                <p className="z-text-body-lg" style={{ color: "var(--z-muted)" }}>
                  Here is what we have captured. Submit your inquiry and our
                  charter advisors will prepare personalised yacht recommendations.
                </p>
              </div>

              {/* Summary Card */}
              <div
                className="z-card-gold"
                style={{
                  padding: "var(--z-space-8)",
                  marginBottom: "var(--z-space-8)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "var(--z-space-6)",
                  }}
                >
                  <SummaryRow
                    label="Travel Date"
                    value={`${state.month} ${state.year}`}
                  />
                  <SummaryRow
                    label="Duration"
                    value={`${state.duration} days`}
                  />
                  <SummaryRow
                    label="Destination"
                    value={
                      DESTINATIONS.find((d) => d.id === state.destination)
                        ?.name || state.destination
                    }
                  />
                  <SummaryRow
                    label="Guests"
                    value={`${state.guests} adults${
                      state.children > 0
                        ? `, ${state.children} children`
                        : ""
                    }`}
                  />
                  <SummaryRow
                    label="Yacht Type"
                    value={
                      YACHT_TYPES.find((y) => y.id === state.yachtType)
                        ?.name || state.yachtType
                    }
                  />
                  <SummaryRow
                    label="Budget"
                    value={`${state.budgetMin.toLocaleString()} - ${state.budgetMax.toLocaleString()} EUR / week`}
                  />
                </div>

                {state.preferences.length > 0 && (
                  <div
                    style={{
                      marginTop: "var(--z-space-6)",
                      paddingTop: "var(--z-space-6)",
                      borderTop:
                        "1px solid var(--z-border)",
                    }}
                  >
                    <span
                      className="z-text-caption"
                      style={{
                        color: "var(--z-muted)",
                        display: "block",
                        marginBottom: "var(--z-space-3)",
                        textTransform: "uppercase",
                        letterSpacing: "var(--z-tracking-wider)",
                      }}
                    >
                      Preferences
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "var(--z-space-2)",
                      }}
                    >
                      {state.preferences.map((prefId) => {
                        const pref = PREFERENCE_OPTIONS.find(
                          (p) => p.id === prefId
                        );
                        return (
                          <span
                            key={prefId}
                            className="z-badge z-badge-gold"
                          >
                            {pref?.label || prefId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {state.specialNeeds && (
                  <div
                    style={{
                      marginTop: "var(--z-space-4)",
                      paddingTop: "var(--z-space-4)",
                      borderTop:
                        "1px solid var(--z-border)",
                    }}
                  >
                    <span
                      className="z-text-caption"
                      style={{
                        color: "var(--z-muted)",
                        display: "block",
                        marginBottom: "var(--z-space-2)",
                        textTransform: "uppercase",
                        letterSpacing: "var(--z-tracking-wider)",
                      }}
                    >
                      Special Requirements
                    </span>
                    <p
                      className="z-text-body"
                      style={{ margin: 0 }}
                    >
                      {state.specialNeeds}
                    </p>
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "var(--z-space-4)",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={buildInquiryUrl(state)}
                  className="z-btn z-btn-primary z-btn-lg"
                >
                  Submit Charter Inquiry
                </Link>
                <button
                  onClick={() => {
                    setState(INITIAL_STATE);
                    setStep(0);
                  }}
                  className="z-btn z-btn-secondary z-btn-lg"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ Bottom Navigation ═════════════════════════════════════ */}
      {step < TOTAL_STEPS - 1 && (
        <div
          style={{
            borderTop: "1px solid var(--z-border)",
            background: "var(--z-surface)",
            padding: "var(--z-space-5) 0",
            position: "sticky",
            bottom: 0,
            zIndex: 20,
          }}
        >
          <div
            className="z-container"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              maxWidth: contentMaxWidth,
            }}
          >
            <button
              onClick={goBack}
              disabled={step === 0}
              className="z-btn z-btn-secondary"
              style={{
                opacity: step === 0 ? 0.4 : 1,
                cursor: step === 0 ? "default" : "pointer",
              }}
            >
              <ChevronLeft size={18} />
              Back
            </button>

            <span
              className="z-text-caption"
              style={{ color: "var(--z-muted)" }}
            >
              Step {step + 1} of {TOTAL_STEPS}
            </span>

            <button
              onClick={goNext}
              disabled={!canProceed}
              className="z-btn z-btn-primary"
              style={{
                opacity: canProceed ? 1 : 0.4,
                cursor: canProceed ? "pointer" : "default",
              }}
            >
              {step === TOTAL_STEPS - 2 ? "View Summary" : "Next"}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════ */

function StepWrapper({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ maxWidth: "var(--z-container-lg)", marginInline: "auto" }}>
      <h2
        className="z-text-title"
        style={{ marginBottom: "var(--z-space-2)" }}
      >
        {title}
      </h2>
      <span
        className="z-gold-bar"
        style={{
          display: "block",
          marginBottom: "var(--z-space-8)",
        }}
      />
      {children}
    </div>
  );
}

function SelectCard({
  label,
  selected,
  onClick,
  style,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "var(--z-space-3) var(--z-space-4)",
        borderRadius: "var(--z-radius-md)",
        border: selected
          ? "2px solid var(--z-gold)"
          : "1px solid var(--z-border)",
        background: selected
          ? "rgba(201, 169, 110, 0.08)"
          : "var(--z-surface)",
        color: selected ? "var(--z-navy)" : "var(--z-fg)",
        fontFamily: "var(--z-font-heading)",
        fontSize: "var(--z-text-body-sm)",
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        transition: "all 200ms ease",
        boxShadow: selected ? "var(--z-shadow-gold)" : "none",
        textAlign: "center",
        ...style,
      }}
    >
      {label}
    </button>
  );
}

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label
        className="z-text-body"
        style={{
          fontWeight: 600,
          display: "block",
          marginBottom: "var(--z-space-3)",
          color: "var(--z-navy)",
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--z-space-4)",
          background: "var(--z-surface-sunken)",
          borderRadius: "var(--z-radius-lg)",
          padding: "var(--z-space-3) var(--z-space-4)",
          border: "1px solid var(--z-border)",
        }}
      >
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "var(--z-radius-full)",
            border: "1px solid var(--z-border)",
            background: "var(--z-surface)",
            cursor: value <= min ? "default" : "pointer",
            opacity: value <= min ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.25rem",
            color: "var(--z-navy)",
            transition: "all 150ms ease",
            flexShrink: 0,
          }}
        >
          &minus;
        </button>
        <span
          style={{
            fontFamily: "var(--z-font-mono)",
            fontSize: "var(--z-text-title)",
            fontWeight: 700,
            color: "var(--z-navy)",
            minWidth: "48px",
            textAlign: "center",
          }}
        >
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "var(--z-radius-full)",
            border: "1px solid var(--z-border)",
            background: "var(--z-surface)",
            cursor: value >= max ? "default" : "pointer",
            opacity: value >= max ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.25rem",
            color: "var(--z-navy)",
            transition: "all 150ms ease",
            flexShrink: 0,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span
        className="z-text-caption"
        style={{
          color: "var(--z-muted)",
          display: "block",
          marginBottom: "var(--z-space-1)",
          textTransform: "uppercase",
          letterSpacing: "var(--z-tracking-wider)",
        }}
      >
        {label}
      </span>
      <span
        className="z-text-body-lg"
        style={{ fontWeight: 600, color: "var(--z-navy)" }}
      >
        {value}
      </span>
    </div>
  );
}
