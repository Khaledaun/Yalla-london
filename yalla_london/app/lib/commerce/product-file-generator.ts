/**
 * Product File Auto-Generation System
 *
 * Creates actual PDF/digital product files from ProductBriefs and BlogPosts.
 * Uses AI to generate content, wraps in branded HTML templates, converts to
 * PDF via Puppeteer (lib/pdf/html-to-pdf.ts).
 *
 * Supports: itineraries, travel guides, blog-to-product repurposing,
 * planners, and worksheets.
 *
 * DB access: `const { prisma } = await import("@/lib/db")`
 * Brand data: `getBrandProfile(siteId)` from `@/lib/design/brand-provider`
 * AI: `generateJSON` / `generateCompletion` from `@/lib/ai/provider`
 * PDF: `generatePdfFromHtml` from `@/lib/pdf/html-to-pdf`
 */

import { getBrandProfile, type BrandProfile } from "@/lib/design/brand-provider";
import { generatePdfFromHtml } from "@/lib/pdf/html-to-pdf";
import { generateJSON, generateCompletion } from "@/lib/ai/provider";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeneratedFile {
  buffer: Buffer;
  fileName: string;
  pageCount?: number;
}

interface ItineraryDay {
  day: number;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
  insiderTip: string;
  estimatedBudget: string;
}

interface ItineraryContent {
  destination: string;
  duration: string;
  tagline: string;
  overview: string;
  bestTimeToVisit: string;
  days: ItineraryDay[];
  packingEssentials: string[];
  budgetSummary: string;
  importantNotes: string[];
}

interface GuideSectionContent {
  heading: string;
  body: string;
  highlights?: string[];
}

interface TravelGuideContent {
  destination: string;
  tagline: string;
  overview: string;
  sections: GuideSectionContent[];
  quickFacts: { label: string; value: string }[];
  packingList: string[];
  usefulPhrases?: { phrase: string; meaning: string }[];
}

interface PlannerItem {
  label: string;
  checked: boolean;
}

interface PlannerSection {
  heading: string;
  items: PlannerItem[];
}

interface WorksheetField {
  label: string;
  type: "text" | "textarea" | "checkbox" | "date" | "rating";
  placeholder?: string;
}

interface WorksheetSection {
  heading: string;
  instructions?: string;
  fields: WorksheetField[];
}

// ─── Template Helpers ────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate Google Fonts import link for the brand fonts.
 * Used in the HTML <head> so PDF rendering picks them up.
 */
function fontImportLink(brand: BrandProfile): string {
  const families = [
    `${brand.fonts.heading.name}:wght@${brand.fonts.heading.weights.join(";")}`,
    `${brand.fonts.body.name}:wght@${brand.fonts.body.weights.join(";")}`,
  ];
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f)}`).join("&")}&display=swap`;
}

/**
 * Base CSS shared across all templates. Inline for PDF compatibility.
 */
function baseStyles(brand: BrandProfile): string {
  return `
    @page {
      size: A4;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: '${brand.fonts.body.name}', 'Georgia', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: ${brand.colors.text};
      background: ${brand.colors.background};
    }
    h1, h2, h3, h4 {
      font-family: '${brand.fonts.heading.name}', 'Georgia', serif;
      color: ${brand.colors.primary};
      line-height: 1.25;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm 18mm;
      page-break-after: always;
      position: relative;
    }
    .page:last-child { page-break-after: auto; }
    .cover-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: ${brand.colors.gradient};
      color: #FFFFFF;
      padding: 30mm 25mm;
    }
    .cover-page h1 {
      font-size: 32pt;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 12mm;
      letter-spacing: -0.5px;
    }
    .cover-page .tagline {
      font-size: 14pt;
      font-weight: 400;
      opacity: 0.9;
      margin-bottom: 20mm;
      max-width: 140mm;
    }
    .cover-page .brand-name {
      font-size: 11pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 3px;
      opacity: 0.7;
      margin-top: auto;
    }
    .cover-page .divider {
      width: 60mm;
      height: 2px;
      background: rgba(255,255,255,0.4);
      margin: 8mm 0;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 4mm;
      border-bottom: 1px solid ${brand.colors.accent}40;
      margin-bottom: 6mm;
      font-size: 8pt;
      color: ${brand.colors.textLight};
    }
    .page-footer {
      position: absolute;
      bottom: 12mm;
      left: 18mm;
      right: 18mm;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: ${brand.colors.textLight};
      border-top: 1px solid ${brand.colors.accent}20;
      padding-top: 3mm;
    }
    .section-title {
      font-size: 18pt;
      font-weight: 700;
      margin-bottom: 4mm;
      padding-bottom: 3mm;
      border-bottom: 3px solid ${brand.colors.accent};
    }
    .subsection-title {
      font-size: 13pt;
      font-weight: 600;
      margin-top: 5mm;
      margin-bottom: 3mm;
    }
    p { margin-bottom: 3mm; }
    ul, ol { margin-left: 5mm; margin-bottom: 3mm; }
    li { margin-bottom: 1.5mm; }
    .highlight-box {
      background: ${brand.colors.accent}10;
      border-left: 4px solid ${brand.colors.accent};
      padding: 4mm 5mm;
      margin: 4mm 0;
      border-radius: 0 ${brand.designTokens.borderRadius} ${brand.designTokens.borderRadius} 0;
    }
    .tip-box {
      background: ${brand.colors.primary}08;
      border: 1px solid ${brand.colors.primary}25;
      border-radius: ${brand.designTokens.borderRadius};
      padding: 4mm 5mm;
      margin: 4mm 0;
    }
    .tip-box .tip-label {
      font-weight: 700;
      color: ${brand.colors.primary};
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2mm;
    }
    .two-col {
      display: flex;
      gap: 6mm;
    }
    .two-col > div { flex: 1; }
    .badge {
      display: inline-block;
      background: ${brand.colors.primary};
      color: #FFFFFF;
      padding: 1.5mm 4mm;
      border-radius: 3mm;
      font-size: 8pt;
      font-weight: 600;
      margin-right: 2mm;
      margin-bottom: 2mm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4mm 0;
    }
    th {
      background: ${brand.colors.primary};
      color: #FFFFFF;
      padding: 3mm 4mm;
      text-align: left;
      font-size: 9pt;
      font-weight: 600;
    }
    td {
      padding: 3mm 4mm;
      border-bottom: 1px solid ${brand.colors.accent}20;
      font-size: 10pt;
    }
    tr:nth-child(even) td { background: ${brand.colors.surface}; }
    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: 3mm;
      margin-bottom: 2.5mm;
    }
    .checklist-box {
      width: 4mm;
      height: 4mm;
      border: 1.5px solid ${brand.colors.primary};
      border-radius: 1mm;
      flex-shrink: 0;
      margin-top: 1.5mm;
    }
    .checklist-box.checked {
      background: ${brand.colors.primary};
    }
    .form-field {
      margin-bottom: 4mm;
    }
    .form-label {
      font-size: 9pt;
      font-weight: 600;
      color: ${brand.colors.primary};
      margin-bottom: 1.5mm;
    }
    .form-input {
      width: 100%;
      border: 1px solid ${brand.colors.accent}40;
      border-radius: 2mm;
      padding: 3mm;
      min-height: 8mm;
      background: ${brand.colors.surface};
    }
    .form-textarea {
      min-height: 20mm;
    }
    .rating-dots {
      display: flex;
      gap: 2mm;
    }
    .rating-dot {
      width: 5mm;
      height: 5mm;
      border-radius: 50%;
      border: 1.5px solid ${brand.colors.primary};
    }
  `;
}

/**
 * Wrap HTML body content in a full document with brand fonts and styles.
 */
function wrapDocument(bodyHtml: string, brand: BrandProfile, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <link href="${fontImportLink(brand)}" rel="stylesheet" />
  <style>${baseStyles(brand)}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/**
 * Render a cover page.
 */
function renderCoverPage(
  title: string,
  tagline: string,
  brand: BrandProfile,
  extraLines?: string[],
): string {
  const extra = (extraLines || [])
    .map((l) => `<div style="font-size:10pt;opacity:0.8;margin-top:2mm;">${escapeHtml(l)}</div>`)
    .join("");

  return `
  <div class="page cover-page">
    <div class="brand-name">${escapeHtml(brand.name)}</div>
    <div class="divider"></div>
    <h1>${escapeHtml(title)}</h1>
    <div class="tagline">${escapeHtml(tagline)}</div>
    ${extra}
    <div class="divider"></div>
    <div style="font-size:9pt;opacity:0.6;margin-top:4mm;">${brand.domain}</div>
  </div>`;
}

/**
 * Render a page header + footer with page number.
 */
function pageWrapper(
  content: string,
  brand: BrandProfile,
  title: string,
  pageNum: number,
  totalPages: number,
): string {
  return `
  <div class="page">
    <div class="page-header">
      <span>${escapeHtml(title)}</span>
      <span>${escapeHtml(brand.name)}</span>
    </div>
    ${content}
    <div class="page-footer">
      <span>${brand.domain}</span>
      <span>Page ${pageNum} of ${totalPages}</span>
    </div>
  </div>`;
}

// ─── AI Content Generation ──────────────────────────────────────────────────

/**
 * Use AI to generate structured itinerary content for a product brief.
 */
async function generateItineraryContent(
  title: string,
  description: string,
  siteId: string,
): Promise<ItineraryContent> {
  const prompt = `Create a detailed travel itinerary product based on:

Title: ${title}
Description: ${description}

Generate a complete day-by-day itinerary in JSON format. Make it practical, detailed, and full of insider tips that feel like first-hand experience. Include specific restaurant names, neighborhood names, timing suggestions, and budget estimates.

Return JSON with this exact structure:
{
  "destination": "City/Region Name",
  "duration": "X Days",
  "tagline": "A compelling one-line description",
  "overview": "2-3 sentence overview of the trip",
  "bestTimeToVisit": "When to visit and why",
  "days": [
    {
      "day": 1,
      "title": "Day theme title",
      "morning": "Detailed morning activities (3-4 sentences with specific places)",
      "afternoon": "Detailed afternoon activities (3-4 sentences with specific places)",
      "evening": "Detailed evening activities (3-4 sentences with specific places)",
      "insiderTip": "A genuine insider tip for this day",
      "estimatedBudget": "Estimated budget range for this day"
    }
  ],
  "packingEssentials": ["item1", "item2", ...],
  "budgetSummary": "Overall trip budget breakdown",
  "importantNotes": ["note1", "note2", ...]
}

Generate 3-5 days depending on the destination. Each section should be 3-4 sentences minimum. Make insider tips sound authentic and first-hand.`;

  return generateJSON<ItineraryContent>(prompt, {
    maxTokens: 4096,
    temperature: 0.7,
    siteId,
    taskType: "content_writing_en",
    calledFrom: "product-file-generator/itinerary",
  });
}

/**
 * Use AI to generate structured travel guide content.
 */
async function generateGuideContent(
  title: string,
  description: string,
  siteId: string,
): Promise<TravelGuideContent> {
  const prompt = `Create a comprehensive travel guide product based on:

Title: ${title}
Description: ${description}

Generate a detailed travel guide in JSON format. Include practical information, cultural context, and insider knowledge. The guide should feel authoritative and genuinely helpful.

Return JSON with this exact structure:
{
  "destination": "City/Region Name",
  "tagline": "Compelling one-line description",
  "overview": "3-4 sentence overview",
  "sections": [
    {
      "heading": "Section Title",
      "body": "Detailed content (5-8 sentences minimum per section with specific recommendations)",
      "highlights": ["Key point 1", "Key point 2"]
    }
  ],
  "quickFacts": [
    { "label": "Currency", "value": "..." },
    { "label": "Language", "value": "..." },
    { "label": "Best Time", "value": "..." },
    { "label": "Visa", "value": "..." },
    { "label": "Time Zone", "value": "..." },
    { "label": "Tipping", "value": "..." }
  ],
  "packingList": ["item1", "item2", ...],
  "usefulPhrases": [
    { "phrase": "Local phrase", "meaning": "English meaning" }
  ]
}

Include these sections at minimum:
1. Getting There & Getting Around
2. Where to Stay (with neighborhood recommendations)
3. What to Eat & Drink (with specific restaurant types)
4. Must-See Attractions & Experiences
5. Hidden Gems & Local Secrets
6. Cultural Etiquette & Tips
7. Safety & Practical Information
8. Day Trip Suggestions

Each section body should be 5-8 sentences with specific place names and practical advice.`;

  return generateJSON<TravelGuideContent>(prompt, {
    maxTokens: 6144,
    temperature: 0.7,
    siteId,
    taskType: "content_writing_en",
    calledFrom: "product-file-generator/guide",
  });
}

// ─── HTML Renderers ─────────────────────────────────────────────────────────

/**
 * Render a complete itinerary PDF from generated content.
 */
function renderItineraryHtml(
  content: ItineraryContent,
  brand: BrandProfile,
  title: string,
): string {
  const pages: string[] = [];

  // Cover page
  pages.push(
    renderCoverPage(title, content.tagline, brand, [
      content.duration,
      `Best time to visit: ${content.bestTimeToVisit}`,
    ]),
  );

  // Overview page
  let overviewHtml = `
    <h2 class="section-title">Trip Overview</h2>
    <p style="font-size:12pt;margin-bottom:6mm;">${escapeHtml(content.overview)}</p>
    <div class="highlight-box">
      <strong>Duration:</strong> ${escapeHtml(content.duration)}<br/>
      <strong>Best Time to Visit:</strong> ${escapeHtml(content.bestTimeToVisit)}
    </div>
    <h3 class="subsection-title">Budget Summary</h3>
    <p>${escapeHtml(content.budgetSummary)}</p>
  `;
  if (content.importantNotes && content.importantNotes.length > 0) {
    overviewHtml += `
    <div class="tip-box" style="margin-top:6mm;">
      <div class="tip-label">Important Notes</div>
      <ul>${content.importantNotes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
    </div>`;
  }
  pages.push(pageWrapper(overviewHtml, brand, title, 2, 2 + content.days.length + 1));

  // Day pages
  for (const day of content.days) {
    const dayHtml = `
      <h2 class="section-title">Day ${day.day}: ${escapeHtml(day.title)}</h2>
      <div class="two-col" style="margin-top:4mm;">
        <div>
          <h3 class="subsection-title" style="color:${brand.colors.accent};">Morning</h3>
          <p>${escapeHtml(day.morning)}</p>
        </div>
        <div>
          <h3 class="subsection-title" style="color:${brand.colors.accent};">Afternoon</h3>
          <p>${escapeHtml(day.afternoon)}</p>
        </div>
      </div>
      <h3 class="subsection-title" style="color:${brand.colors.accent};margin-top:5mm;">Evening</h3>
      <p>${escapeHtml(day.evening)}</p>
      <div class="tip-box" style="margin-top:5mm;">
        <div class="tip-label">Insider Tip</div>
        <p>${escapeHtml(day.insiderTip)}</p>
      </div>
      <div class="highlight-box" style="margin-top:4mm;">
        <strong>Estimated Budget:</strong> ${escapeHtml(day.estimatedBudget)}
      </div>
    `;
    const totalPages = 2 + content.days.length + 1;
    pages.push(pageWrapper(dayHtml, brand, title, 2 + day.day, totalPages));
  }

  // Packing list page
  const totalPages = 2 + content.days.length + 1;
  const packingHtml = `
    <h2 class="section-title">Packing Essentials</h2>
    <div style="columns:2;column-gap:8mm;margin-top:4mm;">
      ${content.packingEssentials
        .map(
          (item) => `
        <div class="checklist-item">
          <div class="checklist-box"></div>
          <span>${escapeHtml(item)}</span>
        </div>`,
        )
        .join("")}
    </div>
    <div style="margin-top:10mm;text-align:center;color:${brand.colors.textLight};font-size:10pt;">
      <p>Created with care by <strong>${escapeHtml(brand.name)}</strong></p>
      <p style="font-size:8pt;margin-top:2mm;">${brand.domain}</p>
    </div>
  `;
  pages.push(pageWrapper(packingHtml, brand, title, totalPages, totalPages));

  return wrapDocument(pages.join("\n"), brand, title);
}

/**
 * Render a complete travel guide PDF from generated content.
 */
function renderGuideHtml(
  content: TravelGuideContent,
  brand: BrandProfile,
  title: string,
): string {
  const pages: string[] = [];

  // Cover page
  pages.push(renderCoverPage(title, content.tagline, brand));

  // Estimate total pages: cover + quick facts + sections + packing/phrases
  const contentPageCount = content.sections.length;
  const totalPages = 2 + contentPageCount + 1;

  // Quick facts & overview page
  let factsHtml = `
    <h2 class="section-title">At a Glance</h2>
    <p style="font-size:12pt;margin-bottom:6mm;">${escapeHtml(content.overview)}</p>
    <table>
      <tr><th>Quick Fact</th><th>Details</th></tr>
      ${content.quickFacts
        .map(
          (f) => `<tr><td><strong>${escapeHtml(f.label)}</strong></td><td>${escapeHtml(f.value)}</td></tr>`,
        )
        .join("")}
    </table>
  `;
  pages.push(pageWrapper(factsHtml, brand, title, 2, totalPages));

  // Content section pages
  for (let i = 0; i < content.sections.length; i++) {
    const section = content.sections[i];
    let sectionHtml = `
      <h2 class="section-title">${escapeHtml(section.heading)}</h2>
      <p>${escapeHtml(section.body)}</p>
    `;
    if (section.highlights && section.highlights.length > 0) {
      sectionHtml += `
      <div class="highlight-box" style="margin-top:5mm;">
        <strong>Key Highlights</strong>
        <ul>${section.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>
      </div>`;
    }
    pages.push(pageWrapper(sectionHtml, brand, title, 3 + i, totalPages));
  }

  // Packing list + useful phrases page
  let lastPageHtml = `
    <h2 class="section-title">Packing Checklist</h2>
    <div style="columns:2;column-gap:8mm;margin-top:3mm;">
      ${content.packingList
        .map(
          (item) => `
        <div class="checklist-item">
          <div class="checklist-box"></div>
          <span>${escapeHtml(item)}</span>
        </div>`,
        )
        .join("")}
    </div>
  `;
  if (content.usefulPhrases && content.usefulPhrases.length > 0) {
    lastPageHtml += `
    <h3 class="subsection-title" style="margin-top:8mm;">Useful Phrases</h3>
    <table>
      <tr><th>Phrase</th><th>Meaning</th></tr>
      ${content.usefulPhrases
        .map(
          (p) => `<tr><td>${escapeHtml(p.phrase)}</td><td>${escapeHtml(p.meaning)}</td></tr>`,
        )
        .join("")}
    </table>`;
  }
  lastPageHtml += `
    <div style="margin-top:10mm;text-align:center;color:${brand.colors.textLight};font-size:10pt;">
      <p>Created with care by <strong>${escapeHtml(brand.name)}</strong></p>
      <p style="font-size:8pt;margin-top:2mm;">${brand.domain}</p>
    </div>
  `;
  pages.push(pageWrapper(lastPageHtml, brand, title, totalPages, totalPages));

  return wrapDocument(pages.join("\n"), brand, title);
}

/**
 * Render a blog post repurposed as a PDF product.
 */
function renderBlogPostPdf(
  postTitle: string,
  postContent: string,
  brand: BrandProfile,
): string {
  const pages: string[] = [];

  // Cover
  pages.push(
    renderCoverPage(postTitle, `A comprehensive guide by ${brand.name}`, brand),
  );

  // Strip HTML tags for clean text, but preserve paragraph breaks
  const cleanContent = postContent
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n## $1\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "\n- $1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();

  // Split into sections by ## headings
  const sections = cleanContent.split(/\n##\s+/);
  const intro = sections.shift() || "";

  // Estimate page count
  const totalPages = 2 + Math.max(1, Math.ceil(sections.length / 2));

  // Intro page
  const introHtml = `
    <h2 class="section-title">Introduction</h2>
    ${intro
      .split("\n\n")
      .filter((p) => p.trim())
      .map((p) => {
        if (p.trim().startsWith("- ")) {
          const items = p
            .split("\n")
            .filter((l) => l.trim().startsWith("- "))
            .map((l) => `<li>${escapeHtml(l.replace(/^-\s*/, ""))}</li>`)
            .join("");
          return `<ul>${items}</ul>`;
        }
        return `<p>${escapeHtml(p.trim())}</p>`;
      })
      .join("")}
  `;
  pages.push(pageWrapper(introHtml, brand, postTitle, 2, totalPages));

  // Content pages (combine 2 sections per page where possible)
  let pageNum = 3;
  for (let i = 0; i < sections.length; i += 2) {
    let contentHtml = "";
    for (let j = i; j < Math.min(i + 2, sections.length); j++) {
      const lines = sections[j].split("\n").filter((l) => l.trim());
      const heading = lines.shift() || `Section ${j + 1}`;
      const body = lines.join("\n");

      contentHtml += `
        <h2 class="section-title">${escapeHtml(heading)}</h2>
        ${body
          .split("\n\n")
          .filter((p) => p.trim())
          .map((p) => {
            if (p.trim().startsWith("- ")) {
              const items = p
                .split("\n")
                .filter((l) => l.trim().startsWith("- "))
                .map((l) => `<li>${escapeHtml(l.replace(/^-\s*/, ""))}</li>`)
                .join("");
              return `<ul>${items}</ul>`;
            }
            return `<p>${escapeHtml(p.trim())}</p>`;
          })
          .join("")}
      `;
      if (j < Math.min(i + 2, sections.length) - 1) {
        contentHtml += `<div style="height:6mm;"></div>`;
      }
    }
    pages.push(pageWrapper(contentHtml, brand, postTitle, pageNum, totalPages));
    pageNum++;
  }

  // Closing page
  if (sections.length === 0) {
    // If no sections found, put all content on one page
    const fallbackHtml = `
      <h2 class="section-title">${escapeHtml(postTitle)}</h2>
      ${cleanContent
        .split("\n\n")
        .filter((p) => p.trim())
        .slice(0, 20)
        .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
        .join("")}
    `;
    pages.push(pageWrapper(fallbackHtml, brand, postTitle, 2, 3));
  }

  return wrapDocument(pages.join("\n"), brand, postTitle);
}

// ─── Template Renderers (for preview) ───────────────────────────────────────

/**
 * Render a planner template with checklist sections.
 */
function renderPlannerTemplate(brand: BrandProfile, title: string): string {
  const sections: PlannerSection[] = [
    {
      heading: "Pre-Trip Planning",
      items: [
        { label: "Book flights", checked: false },
        { label: "Reserve accommodation", checked: false },
        { label: "Check visa requirements", checked: false },
        { label: "Purchase travel insurance", checked: false },
        { label: "Notify bank of travel dates", checked: false },
        { label: "Download offline maps", checked: false },
      ],
    },
    {
      heading: "Packing Checklist",
      items: [
        { label: "Passport & copies", checked: false },
        { label: "Chargers & adapters", checked: false },
        { label: "Medications", checked: false },
        { label: "Comfortable walking shoes", checked: false },
        { label: "Weather-appropriate clothing", checked: false },
        { label: "Toiletries", checked: false },
      ],
    },
    {
      heading: "Daily Itinerary",
      items: [
        { label: "Day 1: ________________________________", checked: false },
        { label: "Day 2: ________________________________", checked: false },
        { label: "Day 3: ________________________________", checked: false },
        { label: "Day 4: ________________________________", checked: false },
        { label: "Day 5: ________________________________", checked: false },
      ],
    },
    {
      heading: "Budget Tracker",
      items: [
        { label: "Flights: $________", checked: false },
        { label: "Accommodation: $________", checked: false },
        { label: "Food & Drink: $________", checked: false },
        { label: "Activities: $________", checked: false },
        { label: "Transport: $________", checked: false },
        { label: "Shopping: $________", checked: false },
        { label: "TOTAL: $________", checked: false },
      ],
    },
  ];

  const pages: string[] = [];
  pages.push(renderCoverPage(title, "Your personal trip organiser", brand));

  const totalPages = 1 + Math.ceil(sections.length / 2);
  let pageNum = 2;

  for (let i = 0; i < sections.length; i += 2) {
    let html = "";
    for (let j = i; j < Math.min(i + 2, sections.length); j++) {
      const section = sections[j];
      html += `
        <h2 class="section-title">${escapeHtml(section.heading)}</h2>
        ${section.items
          .map(
            (item) => `
          <div class="checklist-item">
            <div class="checklist-box${item.checked ? " checked" : ""}"></div>
            <span>${escapeHtml(item.label)}</span>
          </div>`,
          )
          .join("")}
        <div style="height:8mm;"></div>
      `;
    }
    pages.push(pageWrapper(html, brand, title, pageNum, totalPages));
    pageNum++;
  }

  return wrapDocument(pages.join("\n"), brand, title);
}

/**
 * Render a worksheet template with fillable fields.
 */
function renderWorksheetTemplate(brand: BrandProfile, title: string): string {
  const sections: WorksheetSection[] = [
    {
      heading: "Trip Details",
      instructions: "Fill in your trip basics to keep everything organized.",
      fields: [
        { label: "Destination", type: "text", placeholder: "City, Country" },
        { label: "Travel Dates", type: "date" },
        { label: "Number of Travelers", type: "text", placeholder: "Adults / Children" },
        { label: "Trip Purpose", type: "text", placeholder: "Anniversary, Family Holiday, Adventure..." },
      ],
    },
    {
      heading: "Accommodation Notes",
      fields: [
        { label: "Hotel / Airbnb Name", type: "text" },
        { label: "Address", type: "text" },
        { label: "Check-in / Check-out", type: "text" },
        { label: "Confirmation Number", type: "text" },
        { label: "Special Requests or Notes", type: "textarea" },
      ],
    },
    {
      heading: "Daily Activity Planner",
      instructions: "Plan your must-do activities for each day.",
      fields: [
        { label: "Day 1 Activities", type: "textarea", placeholder: "Morning: ...\nAfternoon: ...\nEvening: ..." },
        { label: "Day 2 Activities", type: "textarea", placeholder: "Morning: ...\nAfternoon: ...\nEvening: ..." },
        { label: "Day 3 Activities", type: "textarea", placeholder: "Morning: ...\nAfternoon: ...\nEvening: ..." },
      ],
    },
    {
      heading: "Restaurant Wishlist",
      instructions: "Rate each restaurant after visiting.",
      fields: [
        { label: "Restaurant 1", type: "text" },
        { label: "Rating", type: "rating" },
        { label: "Restaurant 2", type: "text" },
        { label: "Rating", type: "rating" },
        { label: "Restaurant 3", type: "text" },
        { label: "Rating", type: "rating" },
      ],
    },
    {
      heading: "Trip Highlights & Memories",
      fields: [
        { label: "Best Moment", type: "textarea", placeholder: "Describe your favourite memory..." },
        { label: "Best Meal", type: "text" },
        { label: "Unexpected Discovery", type: "textarea" },
        { label: "Would Return?", type: "checkbox" },
        { label: "Overall Trip Rating", type: "rating" },
      ],
    },
  ];

  const pages: string[] = [];
  pages.push(renderCoverPage(title, "Your personal travel worksheet", brand));

  const totalPages = 1 + sections.length;
  let pageNum = 2;

  for (const section of sections) {
    let html = `<h2 class="section-title">${escapeHtml(section.heading)}</h2>`;
    if (section.instructions) {
      html += `<p style="color:${brand.colors.textLight};font-style:italic;margin-bottom:5mm;">${escapeHtml(section.instructions)}</p>`;
    }
    for (const field of section.fields) {
      html += `<div class="form-field">`;
      html += `<div class="form-label">${escapeHtml(field.label)}</div>`;
      switch (field.type) {
        case "textarea":
          html += `<div class="form-input form-textarea"></div>`;
          break;
        case "checkbox":
          html += `<div class="checklist-item"><div class="checklist-box"></div><span>Yes</span></div>`;
          break;
        case "rating":
          html += `<div class="rating-dots">${Array.from({ length: 5 })
            .map(() => `<div class="rating-dot"></div>`)
            .join("")}</div>`;
          break;
        case "date":
          html += `<div class="form-input" style="display:flex;gap:4mm;">
            <span style="flex:1;border-right:1px solid ${brand.colors.accent}30;padding-right:3mm;">From: ___/___/______</span>
            <span style="flex:1;padding-left:3mm;">To: ___/___/______</span>
          </div>`;
          break;
        default:
          html += `<div class="form-input"></div>`;
      }
      html += `</div>`;
    }
    pages.push(pageWrapper(html, brand, title, pageNum, totalPages));
    pageNum++;
  }

  return wrapDocument(pages.join("\n"), brand, title);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create a PDF itinerary from a ProductBrief.
 *
 * Flow: Load brief from DB -> AI generates itinerary content -> Branded HTML
 * template -> Puppeteer PDF conversion -> Return buffer + filename.
 */
export async function generateItineraryPdf(briefId: string): Promise<GeneratedFile> {
  const { prisma } = await import("@/lib/db");

  const brief = await prisma.productBrief.findUnique({ where: { id: briefId } });
  if (!brief) {
    throw new Error(`[product-file-generator] ProductBrief not found: ${briefId}`);
  }

  const brand = getBrandProfile(brief.siteId);

  console.log(`[product-file-generator] Generating itinerary PDF for brief "${brief.title}" (${briefId})`);

  // AI generates the itinerary content
  const content = await generateItineraryContent(brief.title, brief.description, brief.siteId);

  // Render branded HTML
  const html = renderItineraryHtml(content, brand, brief.title);

  // Convert to PDF
  const buffer = await generatePdfFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  const slug = brief.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = `${slug}-itinerary.pdf`;

  console.log(
    `[product-file-generator] Itinerary PDF generated: ${fileName} (${buffer.length} bytes)`,
  );

  // Update brief status
  await prisma.productBrief.update({
    where: { id: briefId },
    data: { status: "in_production" },
  });

  return { buffer, fileName, pageCount: 2 + content.days.length + 1 };
}

/**
 * Create a comprehensive travel guide PDF from a ProductBrief.
 *
 * Flow: Load brief -> AI generates guide sections -> Branded HTML template
 * -> Puppeteer PDF -> Return buffer + filename.
 */
export async function generateTravelGuidePdf(briefId: string): Promise<GeneratedFile> {
  const { prisma } = await import("@/lib/db");

  const brief = await prisma.productBrief.findUnique({ where: { id: briefId } });
  if (!brief) {
    throw new Error(`[product-file-generator] ProductBrief not found: ${briefId}`);
  }

  const brand = getBrandProfile(brief.siteId);

  console.log(`[product-file-generator] Generating travel guide PDF for brief "${brief.title}" (${briefId})`);

  // AI generates the guide content
  const content = await generateGuideContent(brief.title, brief.description, brief.siteId);

  // Render branded HTML
  const html = renderGuideHtml(content, brand, brief.title);

  // Convert to PDF
  const buffer = await generatePdfFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  const slug = brief.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = `${slug}-travel-guide.pdf`;

  console.log(
    `[product-file-generator] Travel guide PDF generated: ${fileName} (${buffer.length} bytes)`,
  );

  // Update brief status
  await prisma.productBrief.update({
    where: { id: briefId },
    data: { status: "in_production" },
  });

  return { buffer, fileName, pageCount: 2 + content.sections.length + 1 };
}

/**
 * Repurpose an existing BlogPost into a downloadable PDF product.
 *
 * Flow: Load post from DB -> Reformat content for PDF -> Branded template
 * -> Puppeteer PDF -> Return buffer + filename.
 */
export async function generateFromBlogPost(
  postId: string,
  productType: string,
): Promise<GeneratedFile> {
  const { prisma } = await import("@/lib/db");

  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error(`[product-file-generator] BlogPost not found: ${postId}`);
  }

  const { getDefaultSiteId } = await import("@/config/sites");
  const siteId = post.siteId || getDefaultSiteId();
  const brand = getBrandProfile(siteId);

  console.log(
    `[product-file-generator] Converting blog post "${post.title_en}" to ${productType} PDF`,
  );

  let html: string;

  switch (productType) {
    case "PLANNER":
      html = renderPlannerTemplate(brand, post.title_en);
      break;
    case "WORKSHEET":
      html = renderWorksheetTemplate(brand, post.title_en);
      break;
    default:
      // Default: reformat blog content as a branded PDF guide
      html = renderBlogPostPdf(post.title_en, post.content_en, brand);
      break;
  }

  const buffer = await generatePdfFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  const slug = post.slug || post.title_en.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fileName = `${slug}-${productType.toLowerCase()}.pdf`;

  console.log(
    `[product-file-generator] Blog-to-product PDF generated: ${fileName} (${buffer.length} bytes)`,
  );

  return { buffer, fileName };
}

/**
 * Get an HTML template string with site branding for a given product type.
 * Useful for previewing the template layout before generating content.
 *
 * Returns the full HTML document with sample/placeholder content.
 */
export function getProductTemplate(
  productType: string,
  siteId: string,
): string {
  const brand = getBrandProfile(siteId);
  const title = `${brand.name} — ${productType} Template Preview`;

  switch (productType) {
    case "TEMPLATE":
    case "PDF_GUIDE": {
      // Magazine-style guide template with placeholder content
      const sampleContent: TravelGuideContent = {
        destination: "Sample Destination",
        tagline: "Your complete guide to an unforgettable trip",
        overview:
          "This is a preview of the travel guide template. The final product will contain AI-generated content customised to your destination, complete with local tips, restaurant recommendations, and cultural insights.",
        sections: [
          {
            heading: "Getting There",
            body: "This section will contain detailed transportation options including flights, trains, and local transit. Specific carrier recommendations and booking tips will be included.",
            highlights: [
              "Direct flight options",
              "Airport transfer guide",
              "Public transit overview",
            ],
          },
          {
            heading: "Where to Stay",
            body: "Neighborhood-by-neighborhood accommodation guide with options across all budget ranges. Each area description includes atmosphere, walkability, and nearby attractions.",
            highlights: [
              "Luxury hotels",
              "Boutique stays",
              "Budget-friendly options",
            ],
          },
        ],
        quickFacts: [
          { label: "Currency", value: "To be populated" },
          { label: "Language", value: "To be populated" },
          { label: "Best Time", value: "To be populated" },
        ],
        packingList: [
          "Passport",
          "Comfortable shoes",
          "Weather-appropriate clothing",
          "Chargers & adapters",
        ],
      };
      return renderGuideHtml(sampleContent, brand, title);
    }

    case "PLANNER":
      return renderPlannerTemplate(brand, `${brand.name} Trip Planner`);

    case "WORKSHEET":
      return renderWorksheetTemplate(brand, `${brand.name} Travel Worksheet`);

    default: {
      // Generic itinerary template with placeholder
      const sampleItinerary: ItineraryContent = {
        destination: "Sample Destination",
        duration: "3 Days",
        tagline: "A curated itinerary for the perfect short break",
        overview:
          "This is a preview of the itinerary template. The final product will contain a detailed day-by-day plan with specific venues, times, and insider tips.",
        bestTimeToVisit: "Year-round (specifics in final version)",
        days: [
          {
            day: 1,
            title: "Arrival & First Impressions",
            morning: "Arrive and settle into your accommodation. This section will contain specific neighbourhood suggestions and first-meal recommendations.",
            afternoon:
              "Explore the main attractions at a relaxed pace. Detailed walking routes and entry tickets advice will be included.",
            evening: "Dinner at a carefully selected restaurant followed by evening activities. Specific venue names and reservation tips provided.",
            insiderTip: "Real insider tips based on the destination will appear here.",
            estimatedBudget: "$XX - $XX per person",
          },
        ],
        packingEssentials: [
          "Comfortable walking shoes",
          "Universal adapter",
          "Light layers",
        ],
        budgetSummary: "Detailed budget breakdown will be generated for the final product.",
        importantNotes: [
          "Final product includes destination-specific notes and warnings.",
        ],
      };
      return renderItineraryHtml(sampleItinerary, brand, title);
    }
  }
}

/**
 * Link a generated product file to the DigitalProduct and EtsyListingDraft.
 *
 * Updates:
 * - DigitalProduct.file_url (if the brief has a digitalProductId)
 * - EtsyListingDraft.fileUrl (if the brief has an EtsyListingDraft)
 * - ProductBrief.status to "listed"
 */
export async function linkFileToListing(
  briefId: string,
  fileUrl: string,
): Promise<{ updatedDigitalProduct: boolean; updatedEtsyDraft: boolean }> {
  const { prisma } = await import("@/lib/db");

  const brief = await prisma.productBrief.findUnique({
    where: { id: briefId },
    include: { etsyDraft: true },
  });

  if (!brief) {
    throw new Error(`[product-file-generator] ProductBrief not found: ${briefId}`);
  }

  let updatedDigitalProduct = false;
  let updatedEtsyDraft = false;

  // Update DigitalProduct if linked
  if (brief.digitalProductId) {
    try {
      await prisma.digitalProduct.update({
        where: { id: brief.digitalProductId },
        data: { file_url: fileUrl },
      });
      updatedDigitalProduct = true;
      console.log(
        `[product-file-generator] Updated DigitalProduct ${brief.digitalProductId} file_url`,
      );
    } catch (err) {
      console.warn(
        `[product-file-generator] Failed to update DigitalProduct:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Update EtsyListingDraft if it exists
  if (brief.etsyDraft) {
    try {
      await prisma.etsyListingDraft.update({
        where: { id: brief.etsyDraft.id },
        data: { fileUrl },
      });
      updatedEtsyDraft = true;
      console.log(
        `[product-file-generator] Updated EtsyListingDraft ${brief.etsyDraft.id} fileUrl`,
      );
    } catch (err) {
      console.warn(
        `[product-file-generator] Failed to update EtsyListingDraft:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Mark brief as listed
  await prisma.productBrief.update({
    where: { id: briefId },
    data: { status: "listed" },
  });

  return { updatedDigitalProduct, updatedEtsyDraft };
}
