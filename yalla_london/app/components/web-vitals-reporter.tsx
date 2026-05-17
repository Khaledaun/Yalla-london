"use client";

import { useEffect } from "react";
import type { Metric } from "web-vitals";

/**
 * Reports Core Web Vitals (LCP, INP, CLS, FCP, TTFB) to Google Analytics.
 * Uses the official web-vitals library for accurate measurement.
 * Thresholds from lib/seo/standards.ts: LCP <2500ms, INP <200ms, CLS <0.1, TTFB <600ms.
 */
function sendToGA(metric: Metric) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", metric.name, {
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    event_category: "Web Vitals",
    event_label: metric.id,
    non_interaction: true,
  });
}

export function WebVitalsReporter() {
  useEffect(() => {
    import("web-vitals").then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      onCLS(sendToGA);
      onINP(sendToGA);
      onLCP(sendToGA);
      onFCP(sendToGA);
      onTTFB(sendToGA);
    });
  }, []);

  return null;
}
