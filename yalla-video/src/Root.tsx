import React from "react";
import { Composition } from "remotion";
import { z } from "zod";
import { BRAND } from "./brand";

import { BrandIntro } from "./compositions/BrandIntro";
import { BrandOutro } from "./compositions/BrandOutro";
import { StoryOverlay } from "./compositions/StoryOverlay";
import { ContentPost } from "./compositions/ContentPost";
import { PromoSale } from "./compositions/PromoSale";
import { PhotoFeature } from "./compositions/PhotoFeature";
import { EventTicket } from "./compositions/EventTicket";
import {
  VideoWithBranding,
  calcVideoWithBrandingDuration,
} from "./compositions/VideoWithBranding";

const { width, height, fps } = BRAND.canvas;

// ─── Zod Schemas ──────────────────────────────────────────────

export const storyOverlaySchema = z.object({
  durationInFrames: z.number().min(30),
});

export const contentPostSchema = z.object({
  kicker: z.string(),
  headline: z.string(),
  items: z.array(z.string()),
});

export const promoSaleSchema = z.object({
  kicker: z.string(),
  headline: z.string(),
  date: z.string(),
  description: z.string(),
  cta: z.string(),
});

export const photoFeatureSchema = z.object({
  mediaSrc: z.string(),
  kicker: z.string(),
  headline: z.string(),
  body: z.string(),
});

export const eventTicketSchema = z.object({
  eventName: z.string(),
  headline: z.string(),
  date: z.string(),
  venue: z.string(),
  price: z.string(),
  description: z.string(),
});

export const videoWithBrandingSchema = z.object({
  footageSrc: z.string(),
  footageDurationInFrames: z.number().min(30),
  headline: z.string().optional(),
  kicker: z.string().optional(),
});

// ─── Compositions ──────────────────────────────────────────────

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 1. BrandIntro — 3 sec */}
      <Composition
        id="BrandIntro"
        component={BrandIntro}
        durationInFrames={90}
        fps={fps}
        width={width}
        height={height}
      />

      {/* 2. BrandOutro — 3 sec */}
      <Composition
        id="BrandOutro"
        component={BrandOutro}
        durationInFrames={90}
        fps={fps}
        width={width}
        height={height}
      />

      {/* 3. StoryOverlay — variable duration, alpha */}
      <Composition
        id="StoryOverlay"
        component={StoryOverlay}
        durationInFrames={300}
        fps={fps}
        width={width}
        height={height}
        schema={storyOverlaySchema}
        defaultProps={{ durationInFrames: 300 }}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.durationInFrames,
        })}
      />

      {/* 4. ContentPost — 15 sec */}
      <Composition
        id="ContentPost"
        component={ContentPost}
        durationInFrames={450}
        fps={fps}
        width={width}
        height={height}
        schema={contentPostSchema}
        defaultProps={{
          kicker: "INSIDER TIP",
          headline: "Top 5 Halal\nRestaurants\nin Mayfair",
          items: [
            "The Montagu — Michelin-starred halal fine dining",
            "Rüya — Ottoman-Turkish with Bosphorus views",
            "Novikov — Russian-Asian with certified halal menu",
            "Hakkasan — Cantonese with halal-friendly options",
            "Sexy Fish — Japanese with dedicated halal grill",
          ],
        }}
      />

      {/* 5. PromoSale — 15 sec */}
      <Composition
        id="PromoSale"
        component={PromoSale}
        durationInFrames={450}
        fps={fps}
        width={width}
        height={height}
        schema={promoSaleSchema}
        defaultProps={{
          kicker: "LIMITED TIME OFFER",
          headline: "FLASH\nSALE",
          date: "MARCH 28 – APRIL 3",
          description:
            "Exclusive deals on luxury London experiences — afternoon tea, private tours, and 5-star stays at up to 40% off.",
          cta: "SHOP NOW",
        }}
      />

      {/* 6. PhotoFeature — 15 sec */}
      <Composition
        id="PhotoFeature"
        component={PhotoFeature}
        durationInFrames={450}
        fps={fps}
        width={width}
        height={height}
        schema={photoFeatureSchema}
        defaultProps={{
          mediaSrc: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1080&q=80",
          kicker: "DESTINATION SPOTLIGHT",
          headline: "The Royal\nObservatory\nGreenwich",
          body: "Stand on the Prime Meridian, explore 400 years of astronomy, and take in London's best skyline views.",
        }}
      />

      {/* 7. EventTicket — 15 sec */}
      <Composition
        id="EventTicket"
        component={EventTicket}
        durationInFrames={450}
        fps={fps}
        width={width}
        height={height}
        schema={eventTicketSchema}
        defaultProps={{
          eventName: "YALLA LONDON PRESENTS",
          headline: "Ramadan Iftar\nat The Shard",
          date: "15 MAR 2026",
          venue: "The Shard, SE1",
          price: "£85 pp",
          description:
            "Join us for a luxury iftar 800ft above London with panoramic views of the Thames. Halal fine dining by Michelin-starred chef.",
        }}
      />

      {/* 8. VideoWithBranding — variable duration */}
      <Composition
        id="VideoWithBranding"
        component={VideoWithBranding}
        durationInFrames={calcVideoWithBrandingDuration(300)}
        fps={fps}
        width={width}
        height={height}
        schema={videoWithBrandingSchema}
        defaultProps={{
          footageSrc: "footage/sample.mp4",
          footageDurationInFrames: 300,
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: calcVideoWithBrandingDuration(
            props.footageDurationInFrames
          ),
        })}
      />
    </>
  );
};
