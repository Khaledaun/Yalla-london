"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { getTranslation } from "@/lib/i18n";
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp } from "@/components/brand-kit";
import {
  Calendar,
  User,
  ArrowLeft,
  Heart,
  BookOpen,
  ChevronRight,
  Tag,
  Clock,
  Share2,
  ChevronDown,
  List,
} from "lucide-react";
import { ShareButtons } from "@/components/share-buttons";
import { FollowUs } from "@/components/follow-us";
import { Stay22Map } from "@/components/integrations/stay22-map";
import { WeatherWidget } from "@/components/integrations/weather-widget";
import AffiliateDisclosure from "@/components/affiliate/AffiliateDisclosure";
import { convertPipeTables, unwrapPipeParagraphs } from "@/lib/markdown/pipe-tables";

interface AuthorData {
  name_en: string;
  name_ar: string;
  title_en: string;
  bio_en: string;
  bio_ar: string;
  slug: string;
  avatar_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
}

// Reviewer interface for E-E-A-T "Experience" signal (July 2026)
interface ReviewerData {
  id: string;
  name: string;
  bio: string;
  profile_photo: string | null;
  expertise: string[];
  linkedin_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  verified: boolean;
}

interface BlogPostData {
  id: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  slug: string;
  featured_image: string;
  created_at: string;
  updated_at: string;
  reading_time?: number;
  tags: string[];
  category: {
    id: string;
    name_en: string;
    name_ar: string;
    slug: string;
  } | null;
  author: AuthorData | null;
  // Reviewer fields for E-E-A-T "Experience" signal (July 2026)
  reviewer: ReviewerData | null;
  reviewed_at: string | null;
  reviewer_byline: string | null;
  siteId?: string;
  unsplash_attribution?: string;
}

interface BlogPostClientProps {
  post: BlogPostData | null;
  /** Server-determined locale from x-locale header — ensures correct content in initial SSR HTML for Google */
  serverLocale?: "en" | "ar";
  /** Unsplash photographer attribution — required by Unsplash ToS when displaying their photos */
  unsplashAttribution?: string;
}

/**
 * Lightweight script/event-handler strip for SSR — runs instantly (no jsdom).
 * Full DOMPurify sanitization runs client-side only (where it uses native DOM
 * and is ~100x faster than isomorphic-dompurify's jsdom fallback).
 */
function fastStripScripts(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

export default function BlogPostClient({ post, serverLocale, unsplashAttribution }: BlogPostClientProps) {
  const { language, isRTL } = useLanguage();
  // For SSR: use serverLocale to ensure correct language in initial HTML that Google indexes.
  // After hydration, the client-side language context takes over (allows user toggle).
  const effectiveLanguage = (serverLocale ?? language) as "en" | "ar";
  const t = (key: string) => getTranslation(language, key);
  const [isLiked, setIsLiked] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [showStickyShare, setShowStickyShare] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  // Reading progress bar — debounced with requestAnimationFrame to improve INP
  useEffect(() => {
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!articleRef.current) return;
        const el = articleRef.current;
        const rect = el.getBoundingClientRect();
        const total = el.scrollHeight;
        const visible = window.innerHeight;
        const scrolled = Math.max(0, -rect.top);
        const progress = Math.min(100, (scrolled / (total - visible)) * 100);
        setReadProgress(progress);
        setShowStickyShare(rect.top < -200 && rect.bottom > 200);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "en" ? "en-GB" : "ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Internal pipeline tags that should never be shown to visitors
  const INTERNAL_TAGS = new Set(["auto-generated", "reservoir-pipeline", "needs-review", "needs-expansion"]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- INTERNAL_TAGS is a module-level constant, not a reactive dependency
  const publicTags = useMemo(
    () =>
      (post?.tags || []).filter(
        (t: string) =>
          !INTERNAL_TAGS.has(t) && !t.startsWith("site-") && !t.startsWith("primary-") && !t.startsWith("missing-"),
      ),
    [post?.tags],
  );

  // Content sanitization — hooks must be before any conditional returns
  // Demote <h1> to <h2> at render time — the page template already provides
  // the H1 via the article title. This is a safety net for articles not yet
  // cleaned by the content-auto-fix-lite cron.
  // Use effectiveLanguage (server-determined on initial render, client-context after hydration)
  // Fall back to content_en when content_ar is empty (incomplete translations)
  const rawContentPreH1 = post
    ? effectiveLanguage === "ar" && post.content_ar
      ? post.content_ar
      : post.content_en
    : "";

  // convertPipeTables + unwrapPipeParagraphs imported from @/lib/markdown/pipe-tables
  // (shared with assembly phase so pipe tables are converted at write time too).

  // Safety net: convert markdown syntax to HTML if content was stored as
  // markdown instead of HTML (some older or failed pipeline runs). This
  // prevents raw `# Heading`, `**bold**`, `| table |`, `---` from showing
  // as plain text.
  //
  // IMPORTANT: stage-1 conversions (tables, HR, bold, italic, links) ALWAYS
  // run because their regex patterns are unique to markdown — they cannot
  // false-match valid HTML. Stage-2 (headings/lists/paragraph wrapping)
  // only runs when the input is pure markdown; otherwise it would
  // double-wrap inline text inside HTML paragraphs.
  const markdownToHtml = (text: string): string => {
    if (!text) return text;
    let html = text;

    // ── Stage 1: idempotent transforms (always safe to run on mixed content) ──

    // Tables: `| col | col |` blocks with `|---|---|` header separator → <table>
    html = convertPipeTables(html);

    // Horizontal rules: --- (or longer) on its own line → <hr />
    // Use \r?\n boundaries instead of ^/$ because multiline anchors interact
    // poorly with mixed CR/LF endings from AI-generated content.
    html = html.replace(/(^|\r?\n)\s*-{3,}\s*(?=\r?\n|$)/g, "$1<hr />");

    // Bold + italic + bold-italic. Lazy quantifiers prevent runaway matches
    // across paragraphs.
    html = html.replace(/\*\*\*([^*\n]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(^|[\s(>])\*([^*\n]+)\*(?=[\s),.!?]|$)/g, "$1<em>$2</em>");

    // Inline links — markdown-only, won't match HTML <a> tags
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // ── Stage 2: only when input is pure markdown (no HTML structural tags) ──
    const hasStructuralHtml = /<(p|div|article|section|h[1-6]|ul|ol|table|figure|blockquote)\b/i.test(text);
    if (!hasStructuralHtml) {
      // Headings: # H1 → <h2> (demoted), ## H2 → <h2>, ### H3 → <h3>, etc.
      html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
      html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
      html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
      html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
      html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
      html = html.replace(/^#\s+(.+)$/gm, "<h2>$1</h2>");
      // Unordered + ordered lists → <li>, then wrap consecutive <li> in <ul>
      html = html.replace(/^[\-\*]\s+(.+)$/gm, "<li>$1</li>");
      html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");
      html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, "<ul>$1</ul>");
      // Paragraphs: wrap non-tag lines in <p>
      html = html.replace(/^(?!<[a-z/])((?!$).+)$/gm, "<p>$1</p>");
      html = html.replace(/<p>\s*<\/p>/g, "");
    }

    return html;
  };

  // Wrap restaurant/venue fact patterns (Cuisine: X, Location: Y, Price: Z,
  // Halal: Cert) as styled pills. Per May 17 audit: restaurant listicles
  // rendered these as plain inline text — looked like dropped editorial,
  // unscannable. Lookahead pattern ensures we stop a value at the next
  // recognized label OR a tag boundary, so we don't swallow neighboring
  // prose. CSS in globals.css scopes .restaurant-fact / .restaurant-fact__label.
  const transformRestaurantFacts = (input: string): string => {
    if (!input) return input;
    const LABELS = "(?:Cuisine|Location|Address|Price|Halal|Reservation|Booking|Dress\\s+code)";
    const re = new RegExp(`\\b(${LABELS})\\s*[:|—-]\\s*([^\\n<]{2,80}?)(?=\\s+${LABELS}\\s*[:|—-]|<|$)`, "g");
    return input.replace(re, (_full, label: string, value: string) => {
      const safeLabel = label.replace(/\s+/g, " ");
      const safeValue = value.trim();
      if (!safeValue) return _full;
      return `<span class="restaurant-fact"><span class="restaurant-fact__label">${safeLabel}</span> ${safeValue}</span>`;
    });
  };

  // Unconditional pipe-table conversion BEFORE markdownToHtml, including <p>-wrapped
  // pipe rows (May 17 re-audit found tables shipped as <p>| Col | Col |</p> which
  // markdownToHtml stage-2 would skip because the HTML detector sees structural tags).
  const rawContentTablesFixed = convertPipeTables(unwrapPipeParagraphs(rawContentPreH1));
  const rawContentMd = markdownToHtml(rawContentTablesFixed);
  const rawContent = transformRestaurantFacts(
    rawContentMd
      .replace(/<h1(\s[^>]*)?>|<h1>/gi, "<h2$1>")
      .replace(/<\/h1>/gi, "</h2>")
      // [IMAGE: query] tokens are replaced server-side in page.tsx transformForClient()
      // with <figure> elements. This strip is kept as a safety net for any that slip through.
      .replace(/\[IMAGE:[^\]]*\]/gi, ""),
  );
  const [sanitizedContent, setSanitizedContent] = useState(() => fastStripScripts(rawContent));
  useEffect(() => {
    if (!rawContent) return undefined;
    let cancelled = false;
    import("@/lib/html-sanitizer").then(({ sanitizeHtml }) => {
      if (!cancelled) setSanitizedContent(sanitizeHtml(rawContent));
    });
    return () => {
      cancelled = true;
    };
  }, [rawContent]);

  // ═══ Heading extraction for TOC ═══
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\u0600-\u06FF\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  interface TocHeading {
    id: string;
    text: string;
    level: 2 | 3;
  }
  interface FaqItem {
    question: string;
    answer: string;
  }

  const tocHeadings = useMemo<TocHeading[]>(() => {
    if (!sanitizedContent) return [];
    const headings: TocHeading[] = [];
    const regex = /<h([23])[^>]*>(.*?)<\/h\1>/gi;
    let match;
    while ((match = regex.exec(sanitizedContent)) !== null) {
      const text = match[2].replace(/<[^>]*>/g, "").trim();
      if (text) headings.push({ id: slugify(text), text, level: parseInt(match[1]) as 2 | 3 });
    }
    return headings;
  }, [sanitizedContent]);

  // Inject IDs into sanitized content so scroll targets exist
  const contentWithIds = useMemo(() => {
    if (tocHeadings.length < 3) return sanitizedContent;
    let result = sanitizedContent;
    for (const h of tocHeadings) {
      // Replace the first occurrence of the heading tag that matches this text
      const escapedText = h.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tagRegex = new RegExp(`(<h${h.level})([^>]*>)(\\s*(?:<[^>]*>)*\\s*${escapedText})`, "i");
      result = result.replace(tagRegex, `$1 id="${h.id}"$2$3`);
    }
    return result;
  }, [sanitizedContent, tocHeadings]);

  // ═══ FTC Disclosure trigger ═══
  // Renders the disclosure paragraph above article content whenever any affiliate
  // marker is present. Covers all injection pathways: tracker redirect, sponsored
  // rel, recommendation/cta blocks, raw partner URLs known to be affiliate networks.
  //
  // SKIP RULE: if content-auto-fix Section 25 already injected an inline
  // `<p class="affiliate-disclosure">` paragraph into the article body, don't
  // render the React component too — that would show TWO disclosures.
  const hasAffiliateLinks = useMemo(() => {
    if (!sanitizedContent) return false;
    const c = sanitizedContent;
    // Section 25 already injected inline disclosure — skip React render.
    if (c.includes('class="affiliate-disclosure"')) return false;
    return (
      c.includes("/api/affiliate/click") ||
      c.includes('rel="sponsored"') ||
      c.includes('rel="noopener sponsored"') ||
      c.includes('class="affiliate-recommendation"') ||
      c.includes('class="affiliate-cta-block"') ||
      c.includes('class="affiliate-partners-section"') ||
      c.includes("data-affiliate-partner=") ||
      c.includes("data-affiliate=") ||
      c.includes("data-affiliate-id=") ||
      // Direct partner URLs (Travelpayouts marker, CJ deep link networks)
      c.includes("marker=") ||
      c.includes("anrdoezrs.net") ||
      c.includes("jdoqocy.com") ||
      c.includes("kqzyfj.com")
    );
  }, [sanitizedContent]);

  // ═══ Key Takeaways extraction ═══
  const keyTakeaways = useMemo(() => {
    if (!sanitizedContent) return "";
    // Try <section class="key-takeaways">
    const sectionMatch = sanitizedContent.match(/<section\s+class="key-takeaways"[^>]*>([\s\S]*?)<\/section>/i);
    if (sectionMatch) return sectionMatch[1].trim();
    // Try H2 containing "Key Takeaways" or Arabic equivalent
    const ktRegex = /<h2[^>]*>[^<]*(Key Takeaways|النقاط الرئيسية)[^<]*<\/h2>([\s\S]*?)(?=<h2[\s>]|$)/i;
    const h2Match = sanitizedContent.match(ktRegex);
    if (h2Match) return h2Match[2].trim();
    return "";
  }, [sanitizedContent]);

  // ═══ Quick Facts extraction ═══
  // Per May 17 audit (GPT + Perplexity): article first paragraph sat at
  // 650-850px depth on mobile — the reader's intent (price / area / halal
  // / best-for) was buried below TOC + hero + author chrome. This pulls
  // common label-style facts out of the body and renders them as a card
  // immediately under the title chrome so the answer is above the fold.
  //
  // Labels matched are bilingual (EN regex + AR regex) so the same logic
  // works for both /blog/<slug> and /ar/blog/<slug> renders. Patterns
  // mirror what the AI content prompts emit ("Price: £X", "Best for: …",
  // "Halal: Certified", etc.) — see config/sites.ts site prompts.
  interface QuickFact {
    icon: string;
    label: string;
    labelAr: string;
    value: string;
  }
  const quickFacts = useMemo<QuickFact[]>(() => {
    if (!sanitizedContent) return [];
    // Search only the first ~6000 chars so we get facts from the intro/
    // summary block, not from way down the page in unrelated sections.
    const text = sanitizedContent.replace(/<[^>]+>/g, " ").slice(0, 6000);

    const PATTERNS: Array<{ regex: RegExp; icon: string; label: string; labelAr: string }> = [
      {
        regex: /\b(?:Price|Cost|السعر|التكلفة)s?\s*[:|—-]\s*([^\n<.]{2,80})/i,
        icon: "💷",
        label: "Price",
        labelAr: "السعر",
      },
      {
        regex: /\b(?:Best for|Ideal for|الأفضل لـ|مثالي لـ)\s*[:|—-]\s*([^\n<.]{2,80})/i,
        icon: "✨",
        label: "Best for",
        labelAr: "الأفضل لـ",
      },
      {
        regex: /\b(?:Halal|الحلال|حلال)(?:\s*status)?\s*[:|—-]\s*([^\n<.]{2,60})/i,
        icon: "🕌",
        label: "Halal",
        labelAr: "حلال",
      },
      {
        regex: /\b(?:Location|Area|Address|الموقع|المنطقة|العنوان)\s*[:|—-]\s*([^\n<.]{2,80})/i,
        icon: "📍",
        label: "Location",
        labelAr: "الموقع",
      },
      {
        regex: /\b(?:Cuisine|Style|Type|المطبخ|النوع)\s*[:|—-]\s*([^\n<.]{2,60})/i,
        icon: "🍽️",
        label: "Cuisine",
        labelAr: "المطبخ",
      },
      {
        regex: /\b(?:Duration|Time required|Time needed|المدة|الوقت)\s*[:|—-]\s*([^\n<.]{2,60})/i,
        icon: "⏱️",
        label: "Duration",
        labelAr: "المدة",
      },
      {
        regex: /\b(?:Reservation|Booking|Reserve|الحجز)\s*[:|—-]\s*([^\n<.]{2,60})/i,
        icon: "📅",
        label: "Booking",
        labelAr: "الحجز",
      },
      {
        regex: /\b(?:Dress code|الزي|قواعد اللباس)\s*[:|—-]\s*([^\n<.]{2,60})/i,
        icon: "👔",
        label: "Dress code",
        labelAr: "الزي",
      },
    ];

    const facts: QuickFact[] = [];
    const seen = new Set<string>();
    for (const { regex, icon, label, labelAr } of PATTERNS) {
      const match = text.match(regex);
      if (!match) continue;
      const value = match[1].trim().replace(/\s+/g, " ");
      if (!value || seen.has(label)) continue;
      seen.add(label);
      facts.push({ icon, label, labelAr, value });
      if (facts.length >= 6) break;
    }
    return facts;
  }, [sanitizedContent]);

  // ═══ Primary affiliate CTA (for mobile sticky Book Now bar) ═══
  // Per May 17 audit (both GPT + Perplexity): article pages lacked a
  // visible above-the-fold booking CTA on mobile — the first affiliate
  // link sat 1900px+ down. Sticky bottom bar gives a persistent CTA so
  // a reader can book anytime without scrolling back up.
  //
  // Extracts the FIRST affiliate link from sanitized content:
  //   • href routed through /api/affiliate/click (so the bar's CTA is
  //     tracked exactly like in-content clicks — same SID, same partner)
  //   • partner name from data-affiliate-partner="X" attr on the <a>
  // If no affiliate present, returns null → bar doesn't render.
  const primaryCta = useMemo<{ url: string; partner: string } | null>(() => {
    if (!sanitizedContent) return null;
    // Match <a href="/api/affiliate/click?..." ... data-affiliate-partner="X">
    // OR <a data-affiliate-partner="X" href="/api/affiliate/click?...">.
    // Tag order in HTML is unpredictable, so we capture href + partner
    // separately and pair them by matching the SAME anchor opening tag.
    const tagRegex = /<a\b([^>]*)>/gi;
    let m: RegExpExecArray | null;
    while ((m = tagRegex.exec(sanitizedContent)) !== null) {
      const attrs = m[1];
      const hrefMatch = attrs.match(/\bhref="([^"]*\/api\/affiliate\/click[^"]*)"/i);
      const partnerMatch = attrs.match(/\bdata-affiliate-partner="([^"]+)"/i);
      if (hrefMatch && partnerMatch) {
        // Decode &amp; back to & so the link works
        const url = hrefMatch[1].replace(/&amp;/g, "&");
        return { url, partner: partnerMatch[1] };
      }
    }
    return null;
  }, [sanitizedContent]);

  // ═══ FAQ extraction (question-mark H2 headings) ═══
  const faqItems = useMemo<FaqItem[]>(() => {
    if (!sanitizedContent) return [];
    const items: FaqItem[] = [];
    // Split content by H2 boundaries
    const parts = sanitizedContent.split(/(?=<h2[\s>])/i);
    for (const part of parts) {
      const h2Match = part.match(/^<h2[^>]*>(.*?)<\/h2>/i);
      if (!h2Match) continue;
      const questionText = h2Match[1].replace(/<[^>]*>/g, "").trim();
      if (!questionText.includes("?") && !questionText.includes("؟")) continue;
      const answer = part.replace(/^<h2[^>]*>.*?<\/h2>/i, "").trim();
      if (answer) items.push({ question: questionText, answer });
    }
    return items;
  }, [sanitizedContent]);

  // ═══ Active TOC heading (IntersectionObserver) ═══
  const [activeTocId, setActiveTocId] = useState("");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [openFaqIndexes, setOpenFaqIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (tocHeadings.length < 3) return undefined;
    const ids = tocHeadings.map((h) => h.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTocId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 },
    );
    const elements: Element[] = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        elements.push(el);
      }
    }
    return () => {
      for (const el of elements) observer.unobserve(el);
    };
  }, [tocHeadings]);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileTocOpen(false);
  };

  const showToc = tocHeadings.length >= 3;

  // Check if content is too thin to display (empty or placeholder articles)
  const strippedContent = rawContent.replace(/<[^>]*>/g, "").trim();
  const isThinContent = !strippedContent || strippedContent.length < 100;

  // Not found state
  if (!post) {
    return (
      <div className={`${isRTL ? "rtl" : "ltr"} min-h-screen flex items-center justify-center bg-yl-cream`}>
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-yl-red/10 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-8 w-8 text-yl-red" />
          </div>
          <h1 className={`text-2xl font-bold text-yl-charcoal mb-3 ${isRTL ? "font-arabic" : "font-heading"}`}>
            {language === "en" ? "Article Not Found" : "المقال غير موجود"}
          </h1>
          <p className={`text-yl-gray-500 mb-8 max-w-md ${isRTL ? "font-arabic" : "font-body"}`}>
            {language === "en"
              ? "The article you're looking for doesn't exist or has been moved."
              : "المقال الذي تبحث عنه غير موجود أو تم نقله."}
          </p>
          <BrandButton variant="primary" href="/blog" className="gap-2">
            <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
            {language === "en" ? "Back to Stories" : "العودة للقصص"}
          </BrandButton>
        </div>
      </div>
    );
  }

  // Use effectiveLanguage for content — correct in both SSR (Arabic HTML for Google) and client
  const title = effectiveLanguage === "ar" && post.title_ar ? post.title_ar : post.title_en;
  const excerpt = effectiveLanguage === "ar" && post.excerpt_ar ? post.excerpt_ar : post.excerpt_en;
  const categoryName = post.category
    ? effectiveLanguage === "ar" && post.category.name_ar
      ? post.category.name_ar
      : post.category.name_en
    : "";
  const readingTime = post.reading_time || 5;

  return (
    <div className={`${isRTL ? "rtl" : "ltr"} bg-yl-cream`}>
      {/* ═══ Reading Progress Bar ═══ */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-yl-red via-yl-gold to-yl-blue transition-[width] duration-150"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* ═══ Breadcrumb ═══ */}
      <nav className="bg-white border-b border-yl-gray-200/50">
        <div className="max-w-7xl mx-auto px-7 py-3">
          <ol className="flex items-center gap-1.5 text-xs font-body tracking-wide text-yl-gray-500/60">
            <li>
              <Link href="/" className="hover:text-yl-red transition-colors">
                {language === "en" ? "Home" : "الرئيسية"}
              </Link>
            </li>
            <li>
              <ChevronRight className={`h-3 w-3 ${isRTL ? "rotate-180" : ""}`} />
            </li>
            <li>
              <Link href="/blog" className="hover:text-yl-red transition-colors">
                {language === "en" ? "Stories" : "القصص"}
              </Link>
            </li>
            {post.category && (
              <>
                <li>
                  <ChevronRight className={`h-3 w-3 ${isRTL ? "rotate-180" : ""}`} />
                </li>
                <li>
                  <Link href={`/blog/category/${post.category.slug}`} className="hover:text-yl-red transition-colors">
                    {categoryName}
                  </Link>
                </li>
              </>
            )}
            <li>
              <ChevronRight className={`h-3 w-3 ${isRTL ? "rotate-180" : ""}`} />
            </li>
            <li className="text-yl-charcoal truncate max-w-[200px]">{title}</li>
          </ol>
        </div>
      </nav>

      {/* ═══ Hero Section — Magazine Style ═══ */}
      {/* Explicit height prevents CLS (Cumulative Layout Shift) when hero image loads */}
      <section className="relative h-[28rem] md:h-[34rem] overflow-hidden pt-28">
        {/* Background image */}
        <div className="absolute inset-0">
          {post.featured_image ? (
            <Image src={post.featured_image} alt={title} fill className="object-cover" sizes="100vw" priority />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#a82924] via-yl-dark-navy to-yl-dark-navy" />
          )}
          {/* Cinematic gradient overlay — stronger at top for header readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/35" />
          {/* Unsplash attribution — required by Unsplash ToS */}
          {unsplashAttribution && (
            <div className="absolute bottom-2 right-3 z-20">
              <span className="text-white/50 text-[11px] font-body">{unsplashAttribution}</span>
            </div>
          )}
        </div>

        {/* Hero content — aligned bottom-left, editorial style */}
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-7xl mx-auto px-7 pb-10 md:pb-14 w-full">
            <div>
              {/* Category + Reading Time */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {categoryName && (
                  <Link href={`/blog/category/${post.category?.slug}`} className="inline-flex items-center gap-1.5">
                    <BrandTag color="gold">{categoryName}</BrandTag>
                  </Link>
                )}
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white/90 px-3 py-1.5 rounded-[14px] text-xs font-body tracking-wide">
                  <Clock className="h-3 w-3" />
                  {language === "en" ? `${readingTime} min read` : `${readingTime} دقائق قراءة`}
                </span>
              </div>

              {/* Title */}
              <h1
                className={`text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-[1.15] max-w-4xl ${isRTL ? "font-arabic tracking-normal" : "font-heading"}`}
                style={{ textShadow: "0 2px 12px rgba(15,22,33,0.7), 0 1px 3px rgba(15,22,33,0.5)" }}
              >
                {title}
              </h1>

              {/* Excerpt */}
              {excerpt && (
                <p
                  className={`text-white/75 text-lg md:text-xl leading-relaxed max-w-3xl mb-6 ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}
                  style={{ textShadow: "0 1px 8px rgba(15,22,33,0.6)" }}
                >
                  {excerpt}
                </p>
              )}

              {/* Author row */}
              <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-yl-red flex items-center justify-center text-white font-bold text-sm">
                    {post.author?.name_en
                      ? post.author.name_en
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                      : "YL"}
                  </div>
                  <div>
                    <span className="text-white/90 font-medium block text-sm leading-tight">
                      {language === "en"
                        ? post.author?.name_en || "Yalla London Editorial"
                        : post.author?.name_ar || "تحرير يلا لندن"}
                    </span>
                    <span className="text-white/50 text-xs">{formatDate(post.created_at)}</span>
                  </div>
                </div>
                <span className="hidden sm:inline text-white/20">|</span>
                <span className="text-white/50 text-xs">
                  {language === "en"
                    ? `Updated ${formatDate(post.updated_at)}`
                    : `تحديث ${formatDate(post.updated_at)}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Tri-color Bar ═══ */}
      <TriBar />

      {/* ═══ Article Body — Two Column Layout ═══ */}
      <section className="py-10 md:py-14 bg-white relative" ref={articleRef}>
        {/* Subtle brand watermark */}
        <div
          className="absolute -right-20 top-20 w-[200px] h-[200px] opacity-[0.02] rotate-[12deg] pointer-events-none bg-contain bg-no-repeat bg-center"
          style={{
            backgroundImage:
              "url('/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png')",
          }}
          aria-hidden="true"
        />
        <div className="max-w-7xl mx-auto px-7 relative z-10">
          {/* Gold accent rule above content */}
          <div className="w-16 h-[2px] bg-yl-gold mb-8" />
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
            {/* ─── Main Content Column ─── */}
            <article className="flex-1 min-w-0 max-w-3xl">
              <div>
                {/* Mobile share bar */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-yl-gray-200 lg:hidden">
                  <BrandButton variant="outline" size="sm" href="/blog" className="gap-2">
                    <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                    {language === "en" ? "All Stories" : "كل القصص"}
                  </BrandButton>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className={`p-2 rounded-full border transition-colors ${isLiked ? "text-red-500 border-red-200 bg-red-50" : "text-yl-gray-500 border-yl-gray-200 hover:border-yl-red/60"}`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* ─── Mobile Table of Contents ─── */}
                {showToc && !isThinContent && (
                  <div className="lg:hidden mb-8 rounded-xl border border-yl-gray-200 bg-yl-cream/50 overflow-hidden">
                    <button
                      onClick={() => setMobileTocOpen(!mobileTocOpen)}
                      className="flex items-center justify-between w-full px-5 py-3.5 text-left"
                    >
                      <span
                        className={`flex items-center gap-2 text-sm font-semibold text-yl-charcoal ${isRTL ? "font-arabic" : "font-heading"}`}
                      >
                        <List className="h-4 w-4 text-yl-gray-500" />
                        {language === "en" ? "Table of Contents" : "جدول المحتويات"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-yl-gray-500 transition-transform duration-200 ${mobileTocOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {mobileTocOpen && (
                      <nav className="px-5 pb-4 border-t border-yl-gray-200/60">
                        <ul className="space-y-1 pt-3">
                          {tocHeadings.map((h) => (
                            <li key={h.id}>
                              <button
                                onClick={() => scrollToHeading(h.id)}
                                className={`block w-full text-left text-sm py-1.5 transition-colors hover:text-yl-red ${
                                  h.level === 3 ? (isRTL ? "pr-4" : "pl-4") : ""
                                } ${activeTocId === h.id ? "text-yl-red font-semibold" : "text-yl-gray-500"} ${isRTL ? "font-arabic text-right" : "font-body"}`}
                              >
                                {h.text}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </nav>
                    )}
                  </div>
                )}

                {/* ─── Key Takeaways Box ─── */}
                {keyTakeaways && !isThinContent && (
                  <div className="mb-10 rounded-xl border-l-4 border-yl-gold bg-yl-gold/10 p-5 md:p-6">
                    <div className={`flex items-center gap-2 mb-3 ${isRTL ? "font-arabic" : "font-heading"}`}>
                      <span className="text-xl" role="img" aria-label={language === "en" ? "star" : "نجمة"}>
                        &#9733;
                      </span>
                      <h3 className="text-base font-bold text-yl-charcoal">
                        {language === "en" ? "Key Takeaways" : "النقاط الرئيسية"}
                      </h3>
                    </div>
                    <div
                      className={`text-sm text-yl-gray-600 leading-relaxed [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1.5 ${isRTL ? "font-arabic [&_ul]:mr-5 [&_ul]:ml-0" : "font-body"}`}
                      dangerouslySetInnerHTML={{ __html: keyTakeaways }}
                    />
                  </div>
                )}

                {/* ─── Quick Facts Card ─── */}
                {/* Pulls 2-6 label-style facts from the article body (price, area, */}
                {/* halal, best-for, cuisine, duration, booking, dress code) and */}
                {/* renders them as a scan-friendly grid above the article body. */}
                {/* Per May 17 audit: previously the reader's intent answer sat */}
                {/* 650-850px deep on mobile — buried under TOC + hero + chrome. */}
                {quickFacts.length >= 2 && !isThinContent && (
                  <div
                    className={`mb-6 rounded-xl border border-yl-gold/30 bg-gradient-to-br from-yl-cream/70 to-white p-4 md:p-5`}
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    <div
                      className={`text-[10px] uppercase tracking-wider text-yl-gray-500 mb-3 ${isRTL ? "font-arabic" : "font-mono"}`}
                    >
                      {language === "en" ? "Quick Facts" : "حقائق سريعة"}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {quickFacts.map((fact, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-base flex-shrink-0 leading-none mt-0.5" aria-hidden="true">
                            {fact.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-[10px] uppercase tracking-wide text-yl-gray-500 ${isRTL ? "font-arabic" : "font-mono"}`}
                            >
                              {language === "en" ? fact.label : fact.labelAr}
                            </div>
                            <div
                              className={`text-sm font-semibold text-yl-charcoal leading-tight ${isRTL ? "font-arabic" : "font-body"}`}
                            >
                              {fact.value}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── FTC Affiliate Disclosure ─── */}
                {/* Required by 16 CFR Part 255 + Google's quality rater guidelines whenever any */}
                {/* affiliate or partner link appears in the body. Auto-detected via hasAffiliateLinks. */}
                {hasAffiliateLinks && !isThinContent && (
                  <AffiliateDisclosure language={effectiveLanguage} className="mb-6" />
                )}

                {/* ─── Article HTML Content ─── */}
                {isThinContent ? (
                  <div className="text-center py-12">
                    <p className="text-yl-gray-500 text-lg">
                      {language === "en"
                        ? "This article is being updated. Please check back soon."
                        : "هذا المقال قيد التحديث. يرجى العودة قريباً."}
                    </p>
                  </div>
                ) : (
                  <div
                    className="yalla-article-content"
                    dangerouslySetInnerHTML={{
                      __html: contentWithIds,
                    }}
                  />
                )}

                {/* ─── FAQ Accordion ─── */}
                {faqItems.length >= 2 && !isThinContent && (
                  <div className="mt-12 pt-8 border-t border-yl-gray-200">
                    <h2 className={`text-xl font-bold text-yl-charcoal mb-6 ${isRTL ? "font-arabic" : "font-heading"}`}>
                      {language === "en" ? "Frequently Asked Questions" : "الأسئلة الشائعة"}
                    </h2>
                    <div className="space-y-3">
                      {faqItems.map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-yl-gray-200 bg-white overflow-hidden">
                          <button
                            onClick={() => toggleFaq(idx)}
                            className="flex items-center justify-between w-full px-5 py-4 text-left gap-3"
                          >
                            <span
                              className={`text-sm font-semibold text-yl-charcoal ${isRTL ? "font-arabic text-right" : "font-heading"}`}
                            >
                              {item.question}
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 text-yl-gray-500 shrink-0 transition-transform duration-200 ${openFaqIndexes.has(idx) ? "rotate-180" : ""}`}
                            />
                          </button>
                          {openFaqIndexes.has(idx) && (
                            <div className="px-5 pb-4 border-t border-yl-gray-100">
                              <div
                                className={`text-sm text-yl-gray-600 leading-relaxed pt-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1.5 ${isRTL ? "font-arabic [&_ul]:mr-5 [&_ul]:ml-0" : "font-body"}`}
                                dangerouslySetInnerHTML={{ __html: item.answer }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* FAQ structured data — Article with mainEntity (NOT deprecated FAQPage) */}
                    <script
                      type="application/ld+json"
                      dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                          "@context": "https://schema.org",
                          "@type": "Article",
                          mainEntity: faqItems.map((item) => ({
                            "@type": "Question",
                            name: item.question,
                            acceptedAnswer: {
                              "@type": "Answer",
                              text: item.answer.replace(/<[^>]*>/g, "").trim(),
                            },
                          })),
                        }),
                      }}
                    />
                  </div>
                )}

                {/* ─── Stay22 Hotel Map — shown only on articles primarily about hotels/accommodation ─── */}
                {(() => {
                  const titleLower = (post.title_en || "").toLowerCase();
                  const slugLower = (post.slug || "").toLowerCase();
                  // Only show on articles specifically about hotels/accommodation (title or slug must mention it)
                  const isHotelArticle = ["hotel", "hotels", "accommodation", "resort", "where to stay"].some(
                    (kw) => titleLower.includes(kw) || slugLower.includes(kw),
                  );
                  if (!isHotelArticle) return null;
                  return (
                    <div className="mt-10 mb-6">
                      <h3
                        className={`text-lg font-heading font-bold text-yl-charcoal mb-3 ${isRTL ? "font-arabic" : ""}`}
                      >
                        {language === "en" ? "Find Hotels Near This Location" : "ابحث عن فنادق بالقرب من هذا الموقع"}
                      </h3>
                      <Stay22Map siteId={post.siteId || "yalla-london"} articleSlug={post.slug} height={350} />
                    </div>
                  );
                })()}

                {/* ─── Weather Widget — shown in sidebar context ─── */}
                <div className="mt-6 mb-6 lg:hidden">
                  <WeatherWidget siteId={post.siteId || "yalla-london"} days={3} />
                </div>

                {/* ─── Tags ─── */}
                {publicTags.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-yl-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="h-4 w-4 text-yl-gray-500/50" />
                      <span
                        className={`text-xs font-medium uppercase tracking-wider text-yl-gray-500/60 ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}
                      >
                        {language === "en" ? "Topics" : "المواضيع"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {publicTags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/blog?tag=${encodeURIComponent(tag)}`}
                          className="px-3.5 py-1.5 text-sm rounded-full bg-yl-cream border border-yl-gray-200 text-yl-gray-500 hover:border-yl-red/80 hover:text-yl-red hover:bg-yl-red/5 transition-all duration-200"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Author Card ─── */}
                <BrandCardLight className="mt-10 p-6 md:p-8" hoverable={false}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yl-red to-[#a82924] flex items-center justify-center text-white font-heading font-bold text-lg shrink-0">
                      {post.author?.name_en
                        ? post.author.name_en
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                        : "YL"}
                    </div>
                    <div className="flex-1">
                      <h4
                        className={`font-bold text-yl-charcoal mb-1 ${isRTL ? "font-arabic tracking-normal" : "font-heading"}`}
                      >
                        {language === "en"
                          ? post.author?.name_en || "Yalla London Editorial"
                          : post.author?.name_ar || "فريق تحرير يلا لندن"}
                      </h4>
                      {post.author?.title_en && (
                        <p
                          className={`text-xs text-yl-gray-500/70 mb-1.5 ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}
                        >
                          {post.author.title_en}
                        </p>
                      )}
                      <p
                        className={`text-sm text-yl-gray-500 leading-relaxed ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}
                      >
                        {language === "en"
                          ? post.author?.bio_en ||
                            "Curating the best of London for Arab travellers — luxury hotels, halal dining, hidden gems, and insider tips from our editorial team."
                          : post.author?.bio_ar ||
                            "نقدم أفضل ما في لندن للمسافرين العرب — فنادق فاخرة، مطاعم حلال، أماكن مخفية، ونصائح من فريقنا التحريري."}
                      </p>
                      {post.author &&
                        (post.author.linkedin_url || post.author.twitter_url || post.author.instagram_url) && (
                          <div className="flex gap-3 mt-3">
                            {post.author.linkedin_url && (
                              <a
                                href={post.author.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yl-gray-500/50 hover:text-yl-red transition-colors text-xs font-medium"
                              >
                                LinkedIn
                              </a>
                            )}
                            {post.author.twitter_url && (
                              <a
                                href={post.author.twitter_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yl-gray-500/50 hover:text-yl-red transition-colors text-xs font-medium"
                              >
                                X/Twitter
                              </a>
                            )}
                            {post.author.instagram_url && (
                              <a
                                href={post.author.instagram_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yl-gray-500/50 hover:text-yl-red transition-colors text-xs font-medium"
                              >
                                Instagram
                              </a>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                </BrandCardLight>

                {/* ─── Reviewer Card (E-E-A-T "Experience" signal) ─── */}
                {post.reviewer && (
                  <BrandCardLight className="mt-6 p-6 md:p-8 border-l-4 border-l-green-600" hoverable={false}>
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className={`text-xs font-semibold uppercase tracking-wider text-green-700 ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}>
                        {language === "en" ? "Verified by Expert" : "تم التحقق بواسطة خبير"}
                      </span>
                    </div>
                    <div className="flex items-start gap-4">
                      {post.reviewer.profile_photo ? (
                        <Image
                          src={post.reviewer.profile_photo}
                          alt={post.reviewer.name}
                          width={56}
                          height={56}
                          className="w-14 h-14 rounded-full object-cover shrink-0 ring-2 ring-green-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-heading font-bold text-lg shrink-0">
                          {post.reviewer.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-bold text-yl-charcoal ${isRTL ? "font-arabic tracking-normal" : "font-heading"}`}>
                            {post.reviewer.name}
                          </h4>
                          {post.reviewer.verified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              {language === "en" ? "Verified" : "موثق"}
                            </span>
                          )}
                        </div>
                        {post.reviewer.expertise && post.reviewer.expertise.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {post.reviewer.expertise.slice(0, 3).map((exp) => (
                              <span
                                key={exp}
                                className="inline-block px-2 py-0.5 bg-yl-gray-100 text-yl-gray-600 text-xs rounded"
                              >
                                {exp}
                              </span>
                            ))}
                          </div>
                        )}
                        {post.reviewer.bio && (
                          <p className={`text-sm text-yl-gray-500 leading-relaxed mb-2 ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}>
                            {post.reviewer.bio}
                          </p>
                        )}
                        {post.reviewer_byline && (
                          <p className={`text-xs text-yl-gray-400 italic mb-2 ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}>
                            &ldquo;{post.reviewer_byline}&rdquo;
                          </p>
                        )}
                        {post.reviewed_at && (
                          <p className={`text-xs text-yl-gray-400 ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}>
                            {language === "en"
                              ? `Reviewed on ${new Date(post.reviewed_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                              : `تمت المراجعة في ${new Date(post.reviewed_at).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}`}
                          </p>
                        )}
                        {(post.reviewer.linkedin_url || post.reviewer.twitter_url || post.reviewer.website_url) && (
                          <div className="flex gap-3 mt-3">
                            {post.reviewer.linkedin_url && (
                              <a
                                href={post.reviewer.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yl-gray-500/50 hover:text-green-600 transition-colors text-xs font-medium"
                              >
                                LinkedIn
                              </a>
                            )}
                            {post.reviewer.twitter_url && (
                              <a
                                href={post.reviewer.twitter_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yl-gray-500/50 hover:text-green-600 transition-colors text-xs font-medium"
                              >
                                X/Twitter
                              </a>
                            )}
                            {post.reviewer.website_url && (
                              <a
                                href={post.reviewer.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yl-gray-500/50 hover:text-green-600 transition-colors text-xs font-medium"
                              >
                                {language === "en" ? "Website" : "الموقع"}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </BrandCardLight>
                )}

                {/* ─── Mobile Share Buttons (bottom) ─── */}
                <BrandCardLight className="mt-8 p-5 bg-yl-gray-100" hoverable={false}>
                  <div className="lg:hidden">
                    <p
                      className={`text-xs font-medium text-yl-gray-500/60 mb-3 ${isRTL ? "font-arabic tracking-normal" : "font-body uppercase tracking-wider"}`}
                    >
                      {language === "en" ? "Share This Story" : "شارك هذه القصة"}
                    </p>
                    <ShareButtons title={title} excerpt={excerpt} variant="bar" />
                  </div>
                </BrandCardLight>
              </div>
            </article>

            {/* ─── Sidebar ─── */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* Table of Contents — Desktop sidebar */}
                {showToc && !isThinContent && (
                  <BrandCardLight className="p-5" hoverable={false}>
                    <div className="flex items-center gap-2 mb-3">
                      <List className="h-4 w-4 text-yl-gray-500/50" />
                      <span
                        className={`text-xs font-medium uppercase tracking-wider text-yl-gray-500/60 ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}
                      >
                        {language === "en" ? "Contents" : "المحتويات"}
                      </span>
                    </div>
                    <nav>
                      <ul className="space-y-0.5">
                        {tocHeadings.map((h) => (
                          <li key={h.id}>
                            <button
                              onClick={() => scrollToHeading(h.id)}
                              className={`block w-full text-left text-[13px] py-1.5 leading-snug transition-colors hover:text-yl-red ${
                                h.level === 3
                                  ? (isRTL ? "pr-3 border-r-2" : "pl-3 border-l-2") + " border-yl-gray-200"
                                  : ""
                              } ${
                                activeTocId === h.id
                                  ? "text-yl-red font-semibold" +
                                    (h.level === 2
                                      ? isRTL
                                        ? " border-r-2 pr-2 border-yl-red"
                                        : " border-l-2 pl-2 border-yl-red"
                                      : "")
                                  : "text-yl-gray-500"
                              } ${isRTL ? "font-arabic text-right" : "font-body"}`}
                            >
                              {h.text}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </BrandCardLight>
                )}

                {/* Back button */}
                <BrandButton variant="outline" size="sm" href="/blog" className="w-full justify-start gap-2">
                  <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                  {language === "en" ? "All Stories" : "كل القصص"}
                </BrandButton>

                {/* Share card */}
                <BrandCardLight className="p-5" hoverable={false}>
                  <div className="flex items-center gap-2 mb-4">
                    <Share2 className="h-4 w-4 text-yl-gray-500/50" />
                    <span className="text-xs font-body font-medium uppercase tracking-wider text-yl-gray-500/60">
                      {language === "en" ? "Share" : "مشاركة"}
                    </span>
                  </div>
                  <ShareButtons title={title} excerpt={excerpt} variant="bar" />
                  <div className="mt-4 pt-4 border-t border-yl-gray-200/40">
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className={`flex items-center gap-2 text-sm transition-colors w-full ${
                        isLiked ? "text-red-500" : "text-yl-gray-500 hover:text-red-500"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                      {language === "en"
                        ? isLiked
                          ? "Liked!"
                          : "Like this article"
                        : isLiked
                          ? "أُعجبت!"
                          : "أعجبني هذا المقال"}
                    </button>
                  </div>
                </BrandCardLight>

                {/* Category banner */}
                {post.category && (
                  <Link
                    href={`/blog/category/${post.category.slug}`}
                    className="block p-5 rounded-[14px] bg-gradient-to-br from-yl-red to-[#a82924] text-white hover:from-yl-red hover:to-yl-dark-navy transition-all duration-300 group"
                  >
                    <span className="text-xs font-body font-medium uppercase tracking-widest text-white/50 block mb-2">
                      {language === "en" ? "Category" : "الفئة"}
                    </span>
                    <span
                      className={`text-lg font-bold block mb-1 ${isRTL ? "font-arabic tracking-normal" : "font-heading"}`}
                    >
                      {categoryName}
                    </span>
                    <span className="text-xs text-white/60 flex items-center gap-1 group-hover:gap-2 transition-all">
                      {language === "en" ? "Explore more" : "اكتشف المزيد"}
                      <ChevronRight className={`h-3 w-3 ${isRTL ? "rotate-180" : ""}`} />
                    </span>
                  </Link>
                )}

                {/* Tags */}
                {publicTags.length > 0 && (
                  <BrandCardLight className="p-5" hoverable={false}>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-3.5 w-3.5 text-yl-gray-500/50" />
                      <span className="text-xs font-body font-medium uppercase tracking-wider text-yl-gray-500/60">
                        {language === "en" ? "Topics" : "المواضيع"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {publicTags.slice(0, 8).map((tag) => (
                        <Link
                          key={tag}
                          href={`/blog?tag=${encodeURIComponent(tag)}`}
                          className="px-2.5 py-1 text-xs rounded-full bg-white border border-yl-gray-200 text-yl-gray-500 hover:border-yl-red/80 hover:text-yl-red transition-all duration-200"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  </BrandCardLight>
                )}

                {/* CTA banner */}
                <BrandCardLight className="p-5 bg-yl-gold/10 border-yl-gold/30" hoverable={false}>
                  <span
                    className={`text-sm font-bold text-yl-charcoal block mb-2 ${isRTL ? "font-arabic tracking-normal" : "font-heading"}`}
                  >
                    {language === "en" ? "Planning a London Trip?" : "تخطط لرحلة لندن؟"}
                  </span>
                  <p
                    className={`text-xs text-yl-gray-500 leading-relaxed mb-3 ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}
                  >
                    {language === "en"
                      ? "Browse our curated guides for hotels, restaurants, and experiences."
                      : "تصفح أدلتنا المختارة للفنادق والمطاعم والتجارب."}
                  </p>
                  <Link
                    href="/information"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-yl-red hover:text-[#a82924] transition-colors"
                  >
                    {language === "en" ? "Information Hub" : "مركز المعلومات"}
                    <ChevronRight className={`h-3 w-3 ${isRTL ? "rotate-180" : ""}`} />
                  </Link>
                </BrandCardLight>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ═══ Explore More CTA ═══ */}
      <section className="py-16 bg-yl-dark-navy">
        <div className="max-w-7xl mx-auto px-7 text-center">
          <h2
            className={`text-2xl md:text-3xl font-bold text-yl-gray-100 mb-4 ${isRTL ? "font-arabic tracking-normal" : "font-heading"}`}
          >
            {language === "en" ? "Discover More London Stories" : "اكتشف المزيد من قصص لندن"}
          </h2>
          <p
            className={`text-yl-gray-500 text-base mb-8 max-w-xl mx-auto ${isRTL ? "font-arabic tracking-normal" : "font-body"}`}
          >
            {language === "en"
              ? "From hidden restaurants to luxury hotels — explore our curated guides to London's finest experiences."
              : "من المطاعم المخفية إلى الفنادق الفاخرة — اكتشف أدلتنا المختارة لأفضل تجارب لندن."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <BrandButton variant="primary" href="/blog">
              {language === "en" ? "Browse All Stories" : "تصفح جميع القصص"}
            </BrandButton>
            <BrandButton variant="outline" href="/information">
              {language === "en" ? "Travel Guides" : "أدلة السفر"}
            </BrandButton>
          </div>
          <div className="mt-10">
            <FollowUs variant="dark" showLabel={true} />
          </div>
        </div>
      </section>

      {/* ═══ Sticky Mobile CTA / Share Bar ═══ */}
      {/* Prioritises affiliate "Book Now" CTA over share buttons when an */}
      {/* affiliate link exists in the article — revenue beats sharing for an */}
      {/* iPhone reader scrolling commercial intent content. Falls back to */}
      {/* share bar on editorial pages without affiliates. */}
      {primaryCta && !isThinContent ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-yl-gold/40 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] py-2.5 px-4 lg:hidden"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <a
            href={primaryCta.url}
            target="_blank"
            rel="noopener sponsored"
            data-affiliate-partner={primaryCta.partner}
            className={`flex items-center justify-between gap-2 w-full min-h-[48px] px-4 rounded-lg bg-yl-gold hover:bg-yl-gold/90 active:bg-yl-gold/80 text-white font-semibold transition-colors ${isRTL ? "font-arabic" : "font-heading"}`}
          >
            <span className="text-xs uppercase tracking-wider opacity-90">
              {language === "en" ? "Book Now" : "احجز الآن"}
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span>{primaryCta.partner}</span>
              <span aria-hidden="true">{isRTL ? "←" : "→"}</span>
            </span>
          </a>
        </div>
      ) : (
        showStickyShare && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-yl-gray-200 py-3 px-6 lg:hidden">
            <ShareButtons title={title} excerpt={excerpt} variant="bar" />
          </div>
        )
      )}
    </div>
  );
}
