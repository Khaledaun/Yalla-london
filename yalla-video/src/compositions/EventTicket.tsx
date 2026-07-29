import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import {
  BRAND,
  FONT_FAMILIES,
  TricolorBar,
  Wordmark,
  Footer,
} from "../brand";

/**
 * EventTicket — 450 frames (15 sec)
 * Navy bg, cream ticket card slides up with event details
 */
interface EventTicketProps {
  eventName: string;
  headline: string;
  date: string;
  venue: string;
  price: string;
  description: string;
  [key: string]: unknown;
}

export const EventTicket: React.FC<EventTicketProps> = ({
  eventName,
  headline,
  date,
  venue,
  price,
  description,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card slide up (frame 20)
  const cardY = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 15, mass: 1 },
    from: 600,
    to: 0,
  });

  // Event details inside card (frame 60+)
  const detailsOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tear line draw (frame 120)
  const tearProgress = interpolate(frame, [120, 145], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Footer row stagger (frame 140)
  const footerItems = [date, venue, price];

  // CTA (frame 350)
  const ctaOpacity = interpolate(frame, [350, 370], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bottom footer (frame 380)
  const bottomFooterOpacity = interpolate(frame, [380, 395], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: BRAND.colors.navy,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        padding: "0 36px",
      }}
    >
      {/* Top bar + wordmark */}
      <div style={{ width: "100%" }}>
        <TricolorBar startFrame={0} />
      </div>
      <div style={{ alignSelf: "flex-start", marginTop: 24 }}>
        <Wordmark startFrame={0} size="sm" variant="dark" />
      </div>

      {/* Ticket card */}
      <div
        style={{
          marginTop: 48,
          width: "100%",
          maxWidth: 960,
          backgroundColor: BRAND.colors.cream,
          borderRadius: 16,
          padding: "48px 40px",
          transform: `translateY(${cardY}px)`,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Event header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              fontFamily: FONT_FAMILIES.mono,
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: BRAND.colors.gray,
            }}
          >
            {eventName}
          </div>
          <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden" }}>
            <Img
              src={staticFile("yalla-stamp-500.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            marginTop: 20,
            fontFamily: FONT_FAMILIES.display,
            fontWeight: 700,
            fontSize: 36,
            lineHeight: 1.15,
            color: BRAND.colors.charcoal,
            opacity: detailsOpacity,
          }}
        >
          {headline}
        </div>

        {/* Red rule */}
        <div
          style={{
            marginTop: 16,
            width: 48,
            height: 3,
            backgroundColor: BRAND.colors.red,
            opacity: detailsOpacity,
          }}
        />

        {/* Description */}
        <div
          style={{
            marginTop: 16,
            fontFamily: FONT_FAMILIES.body,
            fontSize: 16,
            lineHeight: 1.5,
            color: BRAND.colors.charcoal,
            opacity: detailsOpacity,
          }}
        >
          {description}
        </div>

        {/* Tear line */}
        <div
          style={{
            marginTop: 28,
            height: 0,
            borderBottom: `2px dashed ${BRAND.colors.gray}`,
            opacity: 0.4,
            clipPath: `inset(0 ${(1 - tearProgress) * 100}% 0 0)`,
          }}
        />

        {/* Footer row: DATE | VENUE | PRICE */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {footerItems.map((item, i) => {
            const itemStart = 140 + i * 10;
            const itemOpacity = interpolate(frame, [itemStart, itemStart + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const labels = ["DATE", "VENUE", "PRICE"];

            return (
              <div key={i} style={{ opacity: itemOpacity, textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: FONT_FAMILIES.mono,
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    color: BRAND.colors.gray,
                  }}
                >
                  {labels[i]}
                </div>
                <div
                  style={{
                    fontFamily: FONT_FAMILIES.display,
                    fontWeight: 600,
                    fontSize: 16,
                    color: BRAND.colors.charcoal,
                    marginTop: 4,
                  }}
                >
                  {item}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA below card */}
      <div
        style={{
          marginTop: 28,
          border: `2px solid ${BRAND.colors.gold}`,
          borderRadius: 8,
          padding: "14px 32px",
          fontFamily: FONT_FAMILIES.display,
          fontWeight: 600,
          fontSize: 16,
          color: BRAND.colors.gold,
          opacity: ctaOpacity,
        }}
      >
        Get Tickets →
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 0,
          right: 0,
          opacity: bottomFooterOpacity,
        }}
      >
        <Footer startFrame={-999} />
      </div>
    </div>
  );
};
