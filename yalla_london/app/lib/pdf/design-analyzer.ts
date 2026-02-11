/**
 * Design Analyzer — "Give Me Similar Design"
 *
 * Accepts an uploaded image, uses AI vision to analyze design patterns,
 * then generates a brand-adapted editable design template.
 */

import { getBrandProfile, type DesignTemplate, type DesignElement, type BrandProfile } from "./brand-design-system";

// ─── Analysis Types ───────────────────────────────────────────────

export interface DesignAnalysis {
  layout: {
    type: "single-column" | "two-column" | "grid" | "hero-centered" | "asymmetric";
    headerPosition: "top" | "center" | "bottom" | "none";
    textDensity: "minimal" | "moderate" | "text-heavy";
    imageRatio: number; // 0-100 percentage of image area
  };
  colors: {
    dominant: string;
    secondary: string;
    accent: string;
    background: string;
    textColor: string;
  };
  typography: {
    headingStyle: "bold" | "light" | "decorative" | "condensed";
    headingSize: "small" | "medium" | "large" | "extra-large";
    bodySize: "small" | "medium" | "large";
    alignment: "left" | "center" | "right" | "mixed";
  };
  elements: {
    hasLogo: boolean;
    hasHeroImage: boolean;
    hasOverlay: boolean;
    hasIcons: boolean;
    hasDividers: boolean;
    hasCTA: boolean;
    hasGrid: boolean;
    numberOfImages: number;
    numberOfTextBlocks: number;
  };
  mood: "luxury" | "playful" | "corporate" | "minimal" | "bold" | "elegant" | "rustic" | "modern";
  format: "portrait" | "landscape" | "square";
}

// ─── AI Vision Analysis ───────────────────────────────────────────

/**
 * Analyze an uploaded design image using AI vision
 * Returns structured design analysis
 */
export async function analyzeDesignImage(
  imageBase64: string,
  mimeType: string = "image/png",
): Promise<DesignAnalysis> {
  // Try Claude vision API first, then OpenAI, then fallback
  const analysis = await callVisionAPI(imageBase64, mimeType);
  if (analysis) return analysis;

  // Fallback: return a reasonable default analysis
  return getDefaultAnalysis();
}

async function callVisionAPI(
  imageBase64: string,
  mimeType: string,
): Promise<DesignAnalysis | null> {
  // Try Anthropic Claude vision
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mimeType, data: imageBase64 },
              },
              {
                type: "text",
                text: VISION_PROMPT,
              },
            ],
          }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || "";
        return parseAnalysisJSON(text);
      }
    } catch (e) {
      console.warn("Claude vision failed:", e);
    }
  }

  // Try OpenAI vision
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              { type: "text", text: VISION_PROMPT },
            ],
          }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";
        return parseAnalysisJSON(text);
      }
    } catch (e) {
      console.warn("OpenAI vision failed:", e);
    }
  }

  return null;
}

const VISION_PROMPT = `Analyze this design/layout image and return a JSON object with the following structure. Be precise about colors (hex), layout patterns, and design elements.

Return ONLY valid JSON, no markdown:
{
  "layout": {
    "type": "single-column" | "two-column" | "grid" | "hero-centered" | "asymmetric",
    "headerPosition": "top" | "center" | "bottom" | "none",
    "textDensity": "minimal" | "moderate" | "text-heavy",
    "imageRatio": <0-100 number>
  },
  "colors": {
    "dominant": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "textColor": "#hex"
  },
  "typography": {
    "headingStyle": "bold" | "light" | "decorative" | "condensed",
    "headingSize": "small" | "medium" | "large" | "extra-large",
    "bodySize": "small" | "medium" | "large",
    "alignment": "left" | "center" | "right" | "mixed"
  },
  "elements": {
    "hasLogo": boolean,
    "hasHeroImage": boolean,
    "hasOverlay": boolean,
    "hasIcons": boolean,
    "hasDividers": boolean,
    "hasCTA": boolean,
    "hasGrid": boolean,
    "numberOfImages": number,
    "numberOfTextBlocks": number
  },
  "mood": "luxury" | "playful" | "corporate" | "minimal" | "bold" | "elegant" | "rustic" | "modern",
  "format": "portrait" | "landscape" | "square"
}`;

function parseAnalysisJSON(text: string): DesignAnalysis | null {
  try {
    // Extract JSON from potential markdown wrapping
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as DesignAnalysis;
  } catch {
    return null;
  }
}

function getDefaultAnalysis(): DesignAnalysis {
  return {
    layout: { type: "hero-centered", headerPosition: "center", textDensity: "minimal", imageRatio: 60 },
    colors: { dominant: "#1C1917", secondary: "#C8322B", accent: "#F59E0B", background: "#FFFFFF", textColor: "#111827" },
    typography: { headingStyle: "bold", headingSize: "large", bodySize: "medium", alignment: "center" },
    elements: { hasLogo: true, hasHeroImage: true, hasOverlay: true, hasIcons: false, hasDividers: true, hasCTA: true, hasGrid: false, numberOfImages: 1, numberOfTextBlocks: 3 },
    mood: "modern",
    format: "portrait",
  };
}

// ─── Generate Design from Analysis ────────────────────────────────

/**
 * Generate a brand-adapted design template from a design analysis
 * Maps the analyzed patterns to the target site's brand
 */
export function generateDesignFromAnalysis(
  analysis: DesignAnalysis,
  siteId: string,
  locale: "en" | "ar" = "en",
): DesignTemplate {
  const brand = getBrandProfile(siteId);
  const isRTL = locale === "ar";

  // Map analyzed format to template format
  const formatMap: Record<string, DesignTemplate["format"]> = {
    portrait: "A4",
    landscape: "landscape",
    square: "square",
  };

  const elements = buildElementsFromAnalysis(analysis, brand, isRTL);

  return {
    id: `similar-${brand.siteId}-${Date.now()}`,
    name: "Custom Design (from reference)",
    nameAr: "تصميم مخصص (من مرجع)",
    category: "poster",
    format: formatMap[analysis.format] || "A4",
    siteId: brand.siteId,
    pages: [{
      id: "main",
      background: buildBackground(analysis, brand),
      elements,
    }],
  };
}

function buildBackground(
  analysis: DesignAnalysis,
  brand: BrandProfile,
): { type: "solid" | "gradient" | "image"; color?: string; gradient?: { from: string; to: string; angle: number } } {
  if (analysis.elements.hasHeroImage && analysis.layout.imageRatio > 60) {
    // Hero-image style: use gradient as base (image to be added by user)
    return {
      type: "gradient",
      gradient: { from: brand.colors.primary, to: brand.colors.secondary, angle: brand.patterns.gradientAngle },
    };
  }

  if (analysis.mood === "luxury" || analysis.mood === "elegant") {
    return {
      type: "gradient",
      gradient: { from: brand.colors.primary, to: darken(brand.colors.primary, 30), angle: 180 },
    };
  }

  return { type: "solid", color: brand.colors.background };
}

function buildElementsFromAnalysis(
  analysis: DesignAnalysis,
  brand: BrandProfile,
  isRTL: boolean,
): DesignElement[] {
  const elements: DesignElement[] = [];
  const align = isRTL ? "right" as const : analysis.typography.alignment === "center" ? "center" as const : "left" as const;
  const headingFont = isRTL ? brand.fonts.headingAr : brand.fonts.heading;
  const bodyFont = isRTL ? brand.fonts.bodyAr : brand.fonts.body;

  // Heading size mapping
  const headingSizes: Record<string, number> = {
    small: 20, medium: 28, large: 36, "extra-large": 48,
  };
  const headingFontSize = headingSizes[analysis.typography.headingSize] || 32;

  const isDarkBg = analysis.elements.hasOverlay || analysis.layout.imageRatio > 50;
  const textColor = isDarkBg ? "#FFFFFF" : brand.colors.text;
  const subtextColor = isDarkBg ? "#FFFFFFCC" : brand.colors.textLight;

  // Hero image if detected
  if (analysis.elements.hasHeroImage) {
    const imgHeight = Math.min(analysis.layout.imageRatio, 70);
    elements.push({
      id: "hero-image",
      type: "image",
      x: 0, y: 0, width: 100, height: imgHeight,
      image: { src: "", alt: "Hero image", objectFit: "cover", placeholder: true },
    });

    // Overlay
    if (analysis.elements.hasOverlay) {
      elements.push({
        id: "hero-overlay",
        type: "shape",
        x: 0, y: 0, width: 100, height: imgHeight,
        shape: { shapeType: "rectangle", fill: brand.colors.primary + "99" },
      });
    }
  }

  // Header position logic
  let titleY = 10;
  if (analysis.layout.headerPosition === "center") titleY = 30;
  else if (analysis.layout.headerPosition === "bottom") titleY = 60;

  // Main heading
  elements.push({
    id: "heading",
    type: "text",
    x: 8, y: titleY, width: 84, height: 12,
    text: {
      content: "Your Title Here",
      contentAr: isRTL ? "عنوانك هنا" : undefined,
      fontSize: headingFontSize,
      fontFamily: headingFont,
      fontWeight: analysis.typography.headingStyle === "light" ? 400 : 700,
      color: textColor,
      alignment: align,
      editable: true,
    },
  });

  // Subtitle / body text
  if (analysis.typography.headingSize !== "extra-large" || analysis.elements.numberOfTextBlocks > 1) {
    elements.push({
      id: "subtitle",
      type: "text",
      x: 10, y: titleY + 14, width: 80, height: 8,
      text: {
        content: "Add your subtitle or description here",
        contentAr: isRTL ? "أضف العنوان الفرعي أو الوصف هنا" : undefined,
        fontSize: analysis.typography.bodySize === "large" ? 16 : 13,
        fontFamily: bodyFont,
        fontWeight: 400,
        color: subtextColor,
        alignment: align,
        editable: true,
      },
    });
  }

  // Grid items if detected
  if (analysis.elements.hasGrid && analysis.elements.numberOfImages > 1) {
    const gridY = Math.max(titleY + 25, 50);
    const cols = Math.min(analysis.elements.numberOfImages, 3);
    const colWidth = Math.floor(85 / cols);

    for (let i = 0; i < cols; i++) {
      elements.push({
        id: `grid-img-${i}`,
        type: "image",
        x: 5 + i * (colWidth + 2), y: gridY, width: colWidth, height: 20,
        image: { src: "", alt: `Grid image ${i + 1}`, objectFit: "cover", borderRadius: brand.patterns.borderRadius, placeholder: true },
      });
      elements.push({
        id: `grid-caption-${i}`,
        type: "text",
        x: 5 + i * (colWidth + 2), y: gridY + 22, width: colWidth, height: 4,
        text: {
          content: `Item ${i + 1}`,
          contentAr: isRTL ? `العنصر ${i + 1}` : undefined,
          fontSize: 11,
          fontFamily: bodyFont,
          fontWeight: 600,
          color: isDarkBg ? "#FFFFFF" : brand.colors.primary,
          alignment: "center",
          editable: true,
        },
      });
    }
  }

  // CTA button if detected
  if (analysis.elements.hasCTA) {
    const ctaY = 80;
    elements.push({
      id: "cta-bg",
      type: "shape",
      x: 25, y: ctaY, width: 50, height: 7,
      shape: { shapeType: "rectangle", fill: brand.colors.secondary, borderRadius: 8 },
    });
    elements.push({
      id: "cta-text",
      type: "text",
      x: 25, y: ctaY + 1, width: 50, height: 5,
      text: {
        content: "Call to Action",
        contentAr: isRTL ? "دعوة للعمل" : undefined,
        fontSize: 15,
        fontFamily: headingFont,
        fontWeight: 700,
        color: "#FFFFFF",
        alignment: "center",
        editable: true,
      },
    });
  }

  // Dividers
  if (analysis.elements.hasDividers) {
    elements.push({
      id: "divider",
      type: "divider",
      x: 10, y: titleY + 12, width: 80, height: 0.2,
      shape: { shapeType: "line", fill: brand.colors.secondary + "66", strokeWidth: 1 },
    });
  }

  // Logo/brand
  if (analysis.elements.hasLogo) {
    elements.push({
      id: "brand-name",
      type: "text",
      x: 30, y: 92, width: 40, height: 4,
      text: {
        content: brand.siteName,
        fontSize: 11,
        fontFamily: headingFont,
        fontWeight: 600,
        color: subtextColor,
        alignment: "center",
        editable: false,
      },
    });
  }

  return elements;
}

// ─── Color Utilities ──────────────────────────────────────────────

function darken(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((num >> 16) & 0xFF) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0xFF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0xFF) - Math.round(255 * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
