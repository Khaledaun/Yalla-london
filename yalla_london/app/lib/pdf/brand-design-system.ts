/**
 * Brand-Aware Design System
 *
 * Generates PDF designs using each website's brand guidelines, colors,
 * fonts, and design patterns. Supports editable text boxes and
 * per-site template customization.
 */

import { SITES, type SiteConfig } from "@/config/sites";

// ─── Design Element Types ─────────────────────────────────────────

export interface DesignElement {
  id: string;
  type: "text" | "image" | "shape" | "divider" | "logo" | "qr";
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  // Type-specific props
  text?: TextElementProps;
  image?: ImageElementProps;
  shape?: ShapeElementProps;
}

export interface TextElementProps {
  content: string;
  contentAr?: string;
  fontSize: number; // pt
  fontFamily: string;
  fontWeight: number;
  color: string;
  alignment: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  editable: boolean;
}

export interface ImageElementProps {
  src: string;
  alt: string;
  objectFit: "cover" | "contain" | "fill";
  borderRadius?: number;
  placeholder?: boolean; // true = needs user image
}

export interface ShapeElementProps {
  shapeType: "rectangle" | "circle" | "line" | "triangle";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

// ─── Design Template ──────────────────────────────────────────────

export interface DesignTemplate {
  id: string;
  name: string;
  nameAr: string;
  category: "travel-guide" | "social-post" | "flyer" | "menu" | "itinerary" | "infographic" | "poster" | "brochure";
  format: "A4" | "A5" | "letter" | "square" | "story" | "landscape";
  pages: DesignPage[];
  siteId?: string; // null = generic template
}

export interface DesignPage {
  id: string;
  elements: DesignElement[];
  background: {
    type: "solid" | "gradient" | "image";
    color?: string;
    gradient?: { from: string; to: string; angle: number };
    image?: string;
  };
}

// ─── Brand Profile ────────────────────────────────────────────────

export interface BrandProfile {
  siteId: string;
  siteName: string;
  destination: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textLight: string;
  };
  fonts: {
    heading: string;
    headingAr: string;
    body: string;
    bodyAr: string;
  };
  logoSvg: string;
  patterns: {
    borderRadius: number;
    shadowStyle: string;
    gradientAngle: number;
  };
}

// ─── Brand Profile Factory ────────────────────────────────────────

/**
 * Get complete brand profile for a site
 */
export function getBrandProfile(siteId: string): BrandProfile {
  const site = SITES[siteId];
  if (!site) {
    return getDefaultBrandProfile(siteId);
  }

  return {
    siteId: site.id,
    siteName: site.name,
    destination: site.destination,
    colors: {
      primary: site.primaryColor,
      secondary: site.secondaryColor,
      accent: adjustBrightness(site.secondaryColor, 20),
      background: "#F9FAFB",
      text: darkenColor(site.primaryColor, 20),
      textLight: "#6B7280",
    },
    fonts: {
      heading: "Anybody",
      headingAr: "IBM Plex Sans Arabic",
      body: "Source Serif 4",
      bodyAr: "IBM Plex Sans Arabic",
    },
    logoSvg: generateLogoSvg(site),
    patterns: {
      borderRadius: 12,
      shadowStyle: "0 4px 6px -1px rgba(0,0,0,0.1)",
      gradientAngle: 135,
    },
  };
}

function getDefaultBrandProfile(siteId: string): BrandProfile {
  return {
    siteId,
    siteName: "Yalla",
    destination: "Destination",
    colors: {
      primary: "#1C1917",
      secondary: "#C8322B",
      accent: "#F0816D",
      background: "#F9FAFB",
      text: "#111827",
      textLight: "#6B7280",
    },
    fonts: {
      heading: "Anybody",
      headingAr: "IBM Plex Sans Arabic",
      body: "Source Serif 4",
      bodyAr: "IBM Plex Sans Arabic",
    },
    logoSvg: "",
    patterns: {
      borderRadius: 12,
      shadowStyle: "0 4px 6px -1px rgba(0,0,0,0.1)",
      gradientAngle: 135,
    },
  };
}

// ─── Design Templates per Category ────────────────────────────────

/**
 * Generate brand-aware design template
 */
export function generateBrandedTemplate(
  siteId: string,
  category: DesignTemplate["category"],
  locale: "en" | "ar" = "en",
): DesignTemplate {
  const brand = getBrandProfile(siteId);
  const isRTL = locale === "ar";

  const generators: Record<DesignTemplate["category"], () => DesignTemplate> = {
    "travel-guide": () => travelGuideTemplate(brand, isRTL),
    "social-post": () => socialPostTemplate(brand, isRTL),
    "flyer": () => flyerTemplate(brand, isRTL),
    "menu": () => menuTemplate(brand, isRTL),
    "itinerary": () => itineraryTemplate(brand, isRTL),
    "infographic": () => infographicTemplate(brand, isRTL),
    "poster": () => posterTemplate(brand, isRTL),
    "brochure": () => brochureTemplate(brand, isRTL),
  };

  return generators[category]();
}

/**
 * Get all available templates for a site
 */
export function getAvailableTemplates(siteId: string): { category: string; name: string; nameAr: string }[] {
  return [
    { category: "travel-guide", name: "Travel Guide", nameAr: "دليل سفر" },
    { category: "social-post", name: "Social Media Post", nameAr: "منشور سوشيال ميديا" },
    { category: "flyer", name: "Promotional Flyer", nameAr: "فلاير ترويجي" },
    { category: "menu", name: "Restaurant Menu", nameAr: "قائمة مطعم" },
    { category: "itinerary", name: "Trip Itinerary", nameAr: "برنامج رحلة" },
    { category: "infographic", name: "Infographic", nameAr: "إنفوجرافيك" },
    { category: "poster", name: "Event Poster", nameAr: "بوستر فعالية" },
    { category: "brochure", name: "Brochure", nameAr: "بروشور" },
  ];
}

// ─── Template Generators ──────────────────────────────────────────

function travelGuideTemplate(brand: BrandProfile, isRTL: boolean): DesignTemplate {
  const align = isRTL ? "right" : "left";
  return {
    id: `travel-guide-${brand.siteId}`,
    name: `${brand.destination} Travel Guide`,
    nameAr: `دليل سفر ${brand.destination}`,
    category: "travel-guide",
    format: "A4",
    siteId: brand.siteId,
    pages: [
      // Cover page
      {
        id: "cover",
        background: { type: "gradient", gradient: { from: brand.colors.primary, to: brand.colors.secondary, angle: brand.patterns.gradientAngle } },
        elements: [
          makeText("cover-title", `${brand.destination} Guide`, isRTL ? `دليل ${brand.destination}` : undefined, {
            x: 10, y: 30, width: 80, height: 15,
            fontSize: 42, fontWeight: 700, color: "#FFFFFF", alignment: "center",
            fontFamily: isRTL ? brand.fonts.headingAr : brand.fonts.heading,
          }),
          makeText("cover-subtitle", "Your Complete Travel Companion", isRTL ? "رفيقك الشامل للسفر" : undefined, {
            x: 15, y: 48, width: 70, height: 8,
            fontSize: 18, fontWeight: 400, color: "#FFFFFFCC", alignment: "center",
            fontFamily: isRTL ? brand.fonts.bodyAr : brand.fonts.body,
          }),
          makeText("cover-brand", brand.siteName, undefined, {
            x: 25, y: 70, width: 50, height: 6,
            fontSize: 16, fontWeight: 600, color: "#FFFFFF99", alignment: "center",
            fontFamily: isRTL ? brand.fonts.headingAr : brand.fonts.heading,
          }),
          makePlaceholderImage("cover-hero", { x: 20, y: 78, width: 60, height: 15, alt: "Destination hero image" }),
        ],
      },
      // Content page
      {
        id: "content-1",
        background: { type: "solid", color: "#FFFFFF" },
        elements: [
          makeShape("header-bar", { x: 0, y: 0, width: 100, height: 8, fill: brand.colors.primary }),
          makeText("section-title", "Top Experiences", isRTL ? "أفضل التجارب" : undefined, {
            x: 5, y: 10, width: 90, height: 6,
            fontSize: 28, fontWeight: 700, color: brand.colors.primary, alignment: align,
            fontFamily: isRTL ? brand.fonts.headingAr : brand.fonts.heading,
          }),
          makeText("section-body", "Discover the best experiences and hidden gems.", isRTL ? "اكتشف أفضل التجارب والأماكن المخفية." : undefined, {
            x: 5, y: 18, width: 90, height: 20,
            fontSize: 12, fontWeight: 400, color: brand.colors.text, alignment: align,
            fontFamily: isRTL ? brand.fonts.bodyAr : brand.fonts.body,
          }),
          makePlaceholderImage("content-img-1", { x: 5, y: 42, width: 42, height: 25, alt: "Experience photo 1" }),
          makePlaceholderImage("content-img-2", { x: 53, y: 42, width: 42, height: 25, alt: "Experience photo 2" }),
          makeText("caption-1", "Experience Name", isRTL ? "اسم التجربة" : undefined, {
            x: 5, y: 68, width: 42, height: 4,
            fontSize: 11, fontWeight: 600, color: brand.colors.primary, alignment: align,
            fontFamily: isRTL ? brand.fonts.bodyAr : brand.fonts.body,
          }),
          makeText("caption-2", "Experience Name", isRTL ? "اسم التجربة" : undefined, {
            x: 53, y: 68, width: 42, height: 4,
            fontSize: 11, fontWeight: 600, color: brand.colors.primary, alignment: align,
            fontFamily: isRTL ? brand.fonts.bodyAr : brand.fonts.body,
          }),
          makeDivider("divider-1", { x: 5, y: 75, width: 90, color: brand.colors.secondary }),
          makeText("footer-text", brand.siteName, undefined, {
            x: 5, y: 92, width: 90, height: 4,
            fontSize: 9, fontWeight: 400, color: brand.colors.textLight, alignment: "center",
            fontFamily: brand.fonts.body,
          }),
        ],
      },
    ],
  };
}

function socialPostTemplate(brand: BrandProfile, isRTL: boolean): DesignTemplate {
  return {
    id: `social-${brand.siteId}`,
    name: "Social Media Post",
    nameAr: "منشور سوشيال ميديا",
    category: "social-post",
    format: "square",
    siteId: brand.siteId,
    pages: [{
      id: "post",
      background: { type: "gradient", gradient: { from: brand.colors.primary, to: brand.colors.secondary, angle: 180 } },
      elements: [
        makePlaceholderImage("bg-image", { x: 0, y: 0, width: 100, height: 60, alt: "Background photo" }),
        makeShape("overlay", { x: 0, y: 50, width: 100, height: 50, fill: brand.colors.primary + "E6" }),
        makeText("headline", "Your Headline Here", isRTL ? "العنوان هنا" : undefined, {
          x: 8, y: 55, width: 84, height: 15,
          fontSize: 28, fontWeight: 700, color: "#FFFFFF", alignment: "center",
          fontFamily: isRTL ? brand.fonts.headingAr : brand.fonts.heading,
        }),
        makeText("body-text", "Add your description or call to action", isRTL ? "أضف وصفك أو دعوة للعمل" : undefined, {
          x: 10, y: 72, width: 80, height: 10,
          fontSize: 14, fontWeight: 400, color: "#FFFFFFCC", alignment: "center",
          fontFamily: isRTL ? brand.fonts.bodyAr : brand.fonts.body,
        }),
        makeText("brand-tag", brand.siteName, undefined, {
          x: 30, y: 90, width: 40, height: 5,
          fontSize: 12, fontWeight: 600, color: brand.colors.secondary, alignment: "center",
          fontFamily: brand.fonts.heading,
        }),
      ],
    }],
  };
}

function flyerTemplate(brand: BrandProfile, isRTL: boolean): DesignTemplate {
  const align = isRTL ? "right" : "left";
  return {
    id: `flyer-${brand.siteId}`,
    name: "Promotional Flyer",
    nameAr: "فلاير ترويجي",
    category: "flyer",
    format: "A4",
    siteId: brand.siteId,
    pages: [{
      id: "flyer-page",
      background: { type: "solid", color: "#FFFFFF" },
      elements: [
        makeShape("top-bar", { x: 0, y: 0, width: 100, height: 40, fill: brand.colors.primary }),
        makePlaceholderImage("hero", { x: 0, y: 0, width: 100, height: 40, alt: "Hero image" }),
        makeShape("overlay-gradient", { x: 0, y: 20, width: 100, height: 20, fill: brand.colors.primary + "99" }),
        makeText("flyer-title", "Special Offer", isRTL ? "عرض خاص" : undefined, {
          x: 5, y: 25, width: 90, height: 10,
          fontSize: 36, fontWeight: 700, color: "#FFFFFF", alignment: "center",
          fontFamily: isRTL ? brand.fonts.headingAr : brand.fonts.heading,
        }),
        makeText("flyer-body", "Discover exclusive deals and experiences", isRTL ? "اكتشف العروض والتجارب الحصرية" : undefined, {
          x: 10, y: 45, width: 80, height: 15,
          fontSize: 14, fontWeight: 400, color: brand.colors.text, alignment: align,
          fontFamily: isRTL ? brand.fonts.bodyAr : brand.fonts.body,
        }),
        makeShape("cta-button", { x: 25, y: 75, width: 50, height: 7, fill: brand.colors.secondary, borderRadius: 8 }),
        makeText("cta-text", "Book Now", isRTL ? "احجز الآن" : undefined, {
          x: 25, y: 76, width: 50, height: 5,
          fontSize: 16, fontWeight: 700, color: "#FFFFFF", alignment: "center",
          fontFamily: isRTL ? brand.fonts.headingAr : brand.fonts.heading,
        }),
        makeText("flyer-footer", `${brand.siteName} | www.${brand.siteId}.com`, undefined, {
          x: 10, y: 92, width: 80, height: 4,
          fontSize: 10, fontWeight: 400, color: brand.colors.textLight, alignment: "center",
          fontFamily: brand.fonts.body,
        }),
      ],
    }],
  };
}

function menuTemplate(brand: BrandProfile, isRTL: boolean): DesignTemplate {
  return generateSimpleTemplate(brand, isRTL, "menu", "Menu", "قائمة مطعم", "A4");
}

function itineraryTemplate(brand: BrandProfile, isRTL: boolean): DesignTemplate {
  return generateSimpleTemplate(brand, isRTL, "itinerary", "Trip Itinerary", "برنامج رحلة", "A4");
}

function infographicTemplate(brand: BrandProfile, isRTL: boolean): DesignTemplate {
  return generateSimpleTemplate(brand, isRTL, "infographic", "Infographic", "إنفوجرافيك", "A4");
}

function posterTemplate(brand: BrandProfile, isRTL: boolean): DesignTemplate {
  return generateSimpleTemplate(brand, isRTL, "poster", "Event Poster", "بوستر فعالية", "A4");
}

function brochureTemplate(brand: BrandProfile, isRTL: boolean): DesignTemplate {
  return generateSimpleTemplate(brand, isRTL, "brochure", "Brochure", "بروشور", "landscape");
}

function generateSimpleTemplate(
  brand: BrandProfile,
  isRTL: boolean,
  category: DesignTemplate["category"],
  name: string,
  nameAr: string,
  format: DesignTemplate["format"],
): DesignTemplate {
  const align = isRTL ? "right" : "left";
  return {
    id: `${category}-${brand.siteId}`,
    name,
    nameAr,
    category,
    format,
    siteId: brand.siteId,
    pages: [{
      id: `${category}-page`,
      background: { type: "solid", color: "#FFFFFF" },
      elements: [
        makeShape("header", { x: 0, y: 0, width: 100, height: 12, fill: brand.colors.primary }),
        makeText("title", name, isRTL ? nameAr : undefined, {
          x: 5, y: 3, width: 90, height: 6,
          fontSize: 24, fontWeight: 700, color: "#FFFFFF", alignment: "center",
          fontFamily: isRTL ? brand.fonts.headingAr : brand.fonts.heading,
        }),
        makeText("content", "Add your content here", isRTL ? "أضف محتواك هنا" : undefined, {
          x: 5, y: 16, width: 90, height: 70,
          fontSize: 12, fontWeight: 400, color: brand.colors.text, alignment: align,
          fontFamily: isRTL ? brand.fonts.bodyAr : brand.fonts.body,
        }),
        makeText("footer", brand.siteName, undefined, {
          x: 5, y: 92, width: 90, height: 4,
          fontSize: 10, fontWeight: 400, color: brand.colors.textLight, alignment: "center",
          fontFamily: brand.fonts.body,
        }),
      ],
    }],
  };
}

// ─── Element Builders ─────────────────────────────────────────────

let elementCounter = 0;

function makeText(
  id: string,
  content: string,
  contentAr: string | undefined,
  props: {
    x: number; y: number; width: number; height: number;
    fontSize: number; fontWeight: number; color: string; alignment: "left" | "center" | "right";
    fontFamily: string; lineHeight?: number;
  },
): DesignElement {
  return {
    id,
    type: "text",
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    text: {
      content,
      contentAr,
      fontSize: props.fontSize,
      fontFamily: props.fontFamily,
      fontWeight: props.fontWeight,
      color: props.color,
      alignment: props.alignment,
      lineHeight: props.lineHeight || 1.5,
      editable: true,
    },
  };
}

function makePlaceholderImage(
  id: string,
  props: { x: number; y: number; width: number; height: number; alt: string },
): DesignElement {
  return {
    id,
    type: "image",
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    image: {
      src: "",
      alt: props.alt,
      objectFit: "cover",
      borderRadius: 0,
      placeholder: true,
    },
  };
}

function makeShape(
  id: string,
  props: { x: number; y: number; width: number; height: number; fill: string; borderRadius?: number },
): DesignElement {
  return {
    id,
    type: "shape",
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    shape: {
      shapeType: "rectangle",
      fill: props.fill,
      borderRadius: props.borderRadius || 0,
    },
  };
}

function makeDivider(
  id: string,
  props: { x: number; y: number; width: number; color: string },
): DesignElement {
  return {
    id,
    type: "divider",
    x: props.x,
    y: props.y,
    width: props.width,
    height: 0.2,
    shape: {
      shapeType: "line",
      fill: props.color,
      strokeWidth: 1,
    },
  };
}

// ─── Design to HTML Renderer ──────────────────────────────────────

/**
 * Render a design template to HTML (for PDF generation or preview)
 */
export function renderDesignToHTML(template: DesignTemplate, locale: "en" | "ar" = "en"): string {
  const isRTL = locale === "ar";
  const formatDimensions: Record<string, { width: string; height: string }> = {
    A4: { width: "210mm", height: "297mm" },
    A5: { width: "148mm", height: "210mm" },
    letter: { width: "8.5in", height: "11in" },
    square: { width: "1080px", height: "1080px" },
    story: { width: "1080px", height: "1920px" },
    landscape: { width: "297mm", height: "210mm" },
  };

  const dims = formatDimensions[template.format] || formatDimensions.A4;

  const pagesHTML = template.pages.map((page) => {
    let bgStyle = "";
    if (page.background.type === "solid") {
      bgStyle = `background: ${page.background.color};`;
    } else if (page.background.type === "gradient" && page.background.gradient) {
      bgStyle = `background: linear-gradient(${page.background.gradient.angle}deg, ${page.background.gradient.from}, ${page.background.gradient.to});`;
    } else if (page.background.type === "image" && page.background.image) {
      bgStyle = `background: url('${page.background.image}') center/cover;`;
    }

    const elementsHTML = page.elements.map((el) => {
      const style = `position: absolute; left: ${el.x}%; top: ${el.y}%; width: ${el.width}%; height: ${el.height}%; opacity: ${el.opacity ?? 1}; ${el.rotation ? `transform: rotate(${el.rotation}deg);` : ""}`;

      switch (el.type) {
        case "text": {
          const t = el.text!;
          const text = isRTL && t.contentAr ? t.contentAr : t.content;
          return `<div style="${style} font-family: '${t.fontFamily}', sans-serif; font-size: ${t.fontSize}pt; font-weight: ${t.fontWeight}; color: ${t.color}; text-align: ${t.alignment}; line-height: ${t.lineHeight || 1.5}; ${t.letterSpacing ? `letter-spacing: ${t.letterSpacing}px;` : ""} ${t.textTransform ? `text-transform: ${t.textTransform};` : ""}" ${t.editable ? 'contenteditable="true"' : ""}>${text}</div>`;
        }
        case "image": {
          const img = el.image!;
          if (img.placeholder || !img.src) {
            return `<div style="${style} background: #E5E7EB; display: flex; align-items: center; justify-content: center; border-radius: ${img.borderRadius || 0}px; color: #9CA3AF; font-size: 12px;">${img.alt || "Image"}</div>`;
          }
          return `<div style="${style} overflow: hidden; border-radius: ${img.borderRadius || 0}px;"><img src="${img.src}" alt="${img.alt}" style="width: 100%; height: 100%; object-fit: ${img.objectFit};" /></div>`;
        }
        case "shape": {
          const s = el.shape!;
          return `<div style="${style} background: ${s.fill}; border-radius: ${s.borderRadius || 0}px; ${s.stroke ? `border: ${s.strokeWidth || 1}px solid ${s.stroke};` : ""}"></div>`;
        }
        case "divider": {
          const d = el.shape!;
          return `<hr style="${style} border: none; border-top: ${d.strokeWidth || 1}px solid ${d.fill}; margin: 0;" />`;
        }
        default:
          return "";
      }
    }).join("\n      ");

    return `
    <div class="page" style="${bgStyle} position: relative; width: ${dims.width}; height: ${dims.height}; overflow: hidden; page-break-after: always;">
      ${elementsHTML}
    </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${isRTL ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Anybody:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: ${dims.width} ${dims.height}; margin: 0; }
    @media print { .page { page-break-after: always; } }
    [contenteditable="true"]:focus { outline: 2px dashed #3B82F6; outline-offset: 2px; }
  </style>
</head>
<body>
  ${pagesHTML}
</body>
</html>`;
}

// ─── Color Utilities ──────────────────────────────────────────────

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xFF) + Math.round(255 * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((num >> 16) & 0xFF) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0xFF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0xFF) - Math.round(255 * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function generateLogoSvg(site: SiteConfig): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"><rect width="200" height="50" rx="8" fill="${site.primaryColor}"/><text x="100" y="32" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="700" font-size="20">${site.name}</text></svg>`;
}
