"use client";

import { useCallback, useRef, type ReactNode, type MouseEvent } from "react";

/**
 * HOC wrapper that adds click tracking + impression logging to any affiliate element.
 * Wraps children in a div that intercepts outbound affiliate clicks.
 */

interface AffiliateWrapperProps {
  linkId: string;
  advertiserName: string;
  placement: string;
  baseUrl?: string;
  children: ReactNode;
  className?: string;
}

export default function AffiliateWrapper({
  linkId,
  advertiserName,
  placement,
  baseUrl = "",
  children,
  className,
}: AffiliateWrapperProps) {
  const impressionLogged = useRef(false);

  // Log impression once on first render via IntersectionObserver
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || impressionLogged.current) return;
      if (typeof IntersectionObserver === "undefined") return;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !impressionLogged.current) {
              impressionLogged.current = true;
              // Fire-and-forget impression tracking
              fetch(`${baseUrl}/api/affiliate/click`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  linkId,
                  event: "impression",
                  placement,
                }),
              }).catch(() => {});
              observer.disconnect();
            }
          }
        },
        { threshold: 0.5 },
      );

      observer.observe(node);
    },
    [linkId, placement, baseUrl],
  );

  // Intercept clicks on affiliate links within children
  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a[rel*='sponsored']") as HTMLAnchorElement | null;
      if (!anchor) return;

      // Track the click (non-blocking)
      navigator.sendBeacon?.(
        `${baseUrl}/api/affiliate/click?id=${encodeURIComponent(linkId)}`,
      );
    },
    [linkId, baseUrl],
  );

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={className}
      data-affiliate-wrapper=""
      data-link-id={linkId}
      data-advertiser={advertiserName}
      data-placement={placement}
    >
      {children}
    </div>
  );
}
