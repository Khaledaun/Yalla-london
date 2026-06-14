"use client";

import type { UnsplashAttribution } from "@/lib/unsplash";

interface UnsplashAttributionProps {
  attribution: UnsplashAttribution;
  locale?: "en" | "ar";
  className?: string;
}

/**
 * Unsplash-compliant attribution line with proper UTM links.
 *
 * Displays: "Photo by [Name] on Unsplash" (EN) or "تصوير [Name] على Unsplash" (AR)
 * Both [Name] and "Unsplash" are clickable links with required UTM params.
 *
 * Typography: IBM Plex Mono, 0.75rem, muted.
 * Arabic: Noto Sans Arabic, NO letter-spacing.
 */
export function UnsplashAttributionLine({
  attribution,
  locale = "en",
  className,
}: UnsplashAttributionProps) {
  const isAr = locale === "ar";

  return (
    <span
      className={className}
      style={{
        fontFamily: isAr
          ? "'Noto Sans Arabic', sans-serif"
          : "'IBM Plex Mono', monospace",
        fontSize: "0.75rem",
        lineHeight: 1.4,
        color: "var(--admin-muted, #78716C)",
        letterSpacing: isAr ? "0" : "0.01em",
        direction: isAr ? "rtl" : "ltr",
      }}
    >
      {isAr ? (
        <>
          تصوير{" "}
          <a
            href={attribution.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color =
                "var(--admin-text, #1C1917)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color =
                "var(--admin-muted, #78716C)")
            }
          >
            {attribution.photographerName}
          </a>{" "}
          على{" "}
          <a
            href={attribution.unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color =
                "var(--admin-text, #1C1917)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color =
                "var(--admin-muted, #78716C)")
            }
          >
            Unsplash
          </a>
        </>
      ) : (
        <>
          Photo by{" "}
          <a
            href={attribution.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color =
                "var(--admin-text, #1C1917)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color =
                "var(--admin-muted, #78716C)")
            }
          >
            {attribution.photographerName}
          </a>{" "}
          on{" "}
          <a
            href={attribution.unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color =
                "var(--admin-text, #1C1917)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color =
                "var(--admin-muted, #78716C)")
            }
          >
            Unsplash
          </a>
        </>
      )}
    </span>
  );
}

export default UnsplashAttributionLine;
