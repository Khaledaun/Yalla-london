/**
 * Arabic Copywriting Skill — Content Pipeline Integration
 *
 * Provides Arabic content quality validation, cultural adaptation checking,
 * and enhancement directives for the content generation pipeline.
 *
 * Used by:
 * - /api/cron/daily-content-generate (post-generation AR quality gate)
 * - /api/generate-content (inline AR enhancement)
 * - Content Quality Gate skill (bilingual validation)
 */

import { getSkillById, type Skill, type SkillAction } from "./skill-registry";

// ── Arabic Content Quality Report ────────────────────

export interface ArabicQualityReport {
  score: number; // 0-100
  grade: "excellent" | "good" | "needs-editing" | "rewrite";
  issues: ArabicIssue[];
  suggestions: string[];
}

export interface ArabicIssue {
  type:
    | "rtl"
    | "typography"
    | "cultural"
    | "seo"
    | "readability"
    | "terminology";
  severity: "error" | "warning" | "info";
  message: string;
  messageAr: string;
}

// ── Quick Validation (sync, no AI) ──────────────────

/**
 * Runs fast, synchronous validation checks on Arabic content.
 * Does NOT call AI — meant for pipeline gates before publish.
 */
export function validateArabicContent(content: string): ArabicQualityReport {
  const issues: ArabicIssue[] = [];
  let score = 100;

  // Check 1: Content has actual Arabic characters
  const arabicCharCount = (content.match(/[\u0600-\u06FF]/g) || []).length;
  const totalChars = content.replace(/\s/g, "").length;
  const arabicRatio = totalChars > 0 ? arabicCharCount / totalChars : 0;

  if (arabicRatio < 0.3) {
    issues.push({
      type: "terminology",
      severity: "error",
      message: "Content has less than 30% Arabic characters — likely not Arabic content",
      messageAr: "المحتوى يحتوي على أقل من 30% أحرف عربية — قد لا يكون محتوى عربي",
    });
    score -= 30;
  }

  // Check 2: No unescaped HTML direction issues
  if (content.includes("<p>") && !content.includes('dir="rtl"') && !content.includes("dir='rtl'")) {
    issues.push({
      type: "rtl",
      severity: "warning",
      message: "Arabic HTML content missing dir=\"rtl\" on paragraph elements",
      messageAr: "محتوى HTML العربي يفتقد لسمة dir=\"rtl\" على عناصر الفقرة",
    });
    score -= 10;
  }

  // Check 3: Check for common translation artifacts
  const translationArtifacts = [
    /\bthe\b/gi, // English articles left in
    /\band\b/gi,
    /\bfor\b/gi,
    /\bwith\b/gi,
    /\bbut\b/gi,
  ];

  // Only check for English words outside of proper names/brands
  const strippedContent = content.replace(/<[^>]+>/g, ""); // Remove HTML tags
  const arabicTextBlocks = strippedContent.split(/[A-Za-z]+/).filter(Boolean);
  const englishWordCount = (strippedContent.match(/\b[a-zA-Z]{3,}\b/g) || []).length;
  const wordCount = strippedContent.split(/\s+/).length;

  if (wordCount > 20 && englishWordCount / wordCount > 0.15) {
    issues.push({
      type: "terminology",
      severity: "warning",
      message: `High English word ratio (${Math.round((englishWordCount / wordCount) * 100)}%) — content may be poorly translated`,
      messageAr: `نسبة عالية من الكلمات الإنجليزية (${Math.round((englishWordCount / wordCount) * 100)}%) — قد يكون المحتوى مترجمًا بشكل سيء`,
    });
    score -= 15;
  }

  // Check 4: Arabic punctuation
  const hasArabicComma = content.includes("،");
  const hasArabicQuestion = content.includes("؟");
  const hasArabicSemicolon = content.includes("؛");
  const hasWesternComma = content.includes(",");

  if (!hasArabicComma && hasWesternComma && arabicRatio > 0.5) {
    issues.push({
      type: "typography",
      severity: "info",
      message: "Using Western commas (,) instead of Arabic commas (،)",
      messageAr: "استخدام الفاصلة الغربية (,) بدلاً من الفاصلة العربية (،)",
    });
    score -= 5;
  }

  // Check 5: Sentence length analysis
  const sentences = strippedContent.split(/[.،؛!؟\n]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(sentences.length, 1);

  if (avgSentenceLength > 30) {
    issues.push({
      type: "readability",
      severity: "warning",
      message: `Average sentence length is ${Math.round(avgSentenceLength)} words — target 15-20 for Arabic`,
      messageAr: `متوسط طول الجملة ${Math.round(avgSentenceLength)} كلمة — المستهدف 15-20 للعربية`,
    });
    score -= 10;
  }

  // Check 6: Content length
  if (wordCount < 50 && wordCount > 0) {
    issues.push({
      type: "readability",
      severity: "warning",
      message: "Arabic content is too short (under 50 words)",
      messageAr: "المحتوى العربي قصير جداً (أقل من 50 كلمة)",
    });
    score -= 10;
  }

  // Determine grade
  const grade =
    score >= 90 ? "excellent" :
    score >= 70 ? "good" :
    score >= 50 ? "needs-editing" :
    "rewrite";

  // Generate suggestions
  const suggestions: string[] = [];
  if (issues.some((i) => i.type === "terminology")) {
    suggestions.push("Replace English terms with proper Arabic equivalents");
  }
  if (issues.some((i) => i.type === "rtl")) {
    suggestions.push("Add dir=\"rtl\" to Arabic content HTML elements");
  }
  if (issues.some((i) => i.type === "readability")) {
    suggestions.push("Break long sentences into shorter, clearer phrases");
  }
  if (!hasArabicComma && arabicRatio > 0.5) {
    suggestions.push("Use Arabic punctuation marks (، ؛ ؟) instead of Western equivalents");
  }

  return { score: Math.max(0, score), grade, issues, suggestions };
}

// ── Arabic Enhancement Directives ───────────────────

/**
 * Returns Arabic-specific system prompt directives to inject into
 * the content generation pipeline when generating Arabic content.
 */
export function getArabicCopywritingDirectives(context: {
  destination: string;
  contentType: string;
  audience?: "gulf" | "levantine" | "general";
}): string {
  const audience = context.audience || "gulf";

  const dialectGuidance =
    audience === "gulf"
      ? `اللهجة: استخدم العربية الفصحى المعاصرة مع مصطلحات شائعة في الخليج.
مثال: "يعطيك العافية" بدلاً من "شكراً"، "وايد حلو" كتعبير عامي خفيف في السياق المناسب.
العملة: اذكر الأسعار بالجنيه الاسترليني والدرهم الإماراتي (£150 / 690 د.إ تقريباً).`
      : audience === "levantine"
        ? `اللهجة: استخدم العربية الفصحى المعاصرة مع لمسات شامية طبيعية.
العملة: اذكر الأسعار بالجنيه الاسترليني مع ملاحظة تقريبية.`
        : `اللهجة: استخدم العربية الفصحى المعاصرة المفهومة لجميع العرب.
العملة: اذكر الأسعار بالجنيه الاسترليني.`;

  return `توجيهات كتابة المحتوى العربي (إلزامية):

${dialectGuidance}

قواعد المحتوى العربي:
1. اكتب محتوى أصلياً — لا تترجم من الإنجليزية
2. استخدم ترتيب الجملة العربي الطبيعي (فعل + فاعل + مفعول عند الإمكان)
3. نوّع في طول الجمل: جمل قصيرة مؤثرة مع جمل وصفية أطول
4. استخدم علامات الترقيم العربية: ، ؛ ؟ ! « »
5. اكتب الأرقام بالصيغة الغربية للأسعار (£150) والعربية للترتيب (الخيار ١)

التكيف الثقافي لـ ${context.destination}:
- اذكر خيارات الطعام الحلال وشهادات الاعتماد (HMC, HFA)
- أشر إلى قرب المساجد ومرافق الصلاة
- ركز على الخيارات المناسبة للعائلات
- تجنب ذكر الكحول — استبدل بالبدائل (مشروبات، عصائر طازجة، شاي فاخر)
- اذكر خيارات الملابس المحتشمة عند الحاجة

أسلوب الكتابة:
- نبرة فاخرة وموثوقة تليق بالجمهور المستهدف
- استخدم صوراً حسية (ما تراه، تشمه، تتذوقه) لوصف التجارب
- أضف "نصيحة من الداخل" واحدة على الأقل في كل قسم
- اختم بدعوة واضحة للعمل بالعربية`;
}

// ── Skill Action Lookup ─────────────────────────────

/**
 * Get the Arabic Copywriting skill and its actions for pipeline use.
 */
export function getArabicCopywritingSkill(): Skill | undefined {
  return getSkillById("arabic-copywriting");
}

/**
 * Get a specific Arabic copywriting action's system prompt.
 * Useful for injecting into AI content generation calls.
 */
export function getArabicActionPrompt(
  actionId:
    | "arabic-content-generation"
    | "arabic-cultural-adaptation"
    | "arabic-rtl-quality"
    | "arabic-seo-optimization"
    | "arabic-readability",
): string | undefined {
  const skill = getArabicCopywritingSkill();
  if (!skill) return undefined;

  const action = skill.actions.find((a) => a.id === actionId);
  return action?.systemPrompt;
}

// ── Arabic SEO Helpers ──────────────────────────────

/**
 * Generate Arabic keyword variations accounting for diacritics
 * and common spelling differences.
 */
export function generateArabicKeywordVariations(keyword: string): string[] {
  const variations: string[] = [keyword];

  // Strip all diacritics
  const stripped = keyword.replace(/[\u064B-\u065F\u0670]/g, "");
  if (stripped !== keyword) variations.push(stripped);

  // Common ة/ه variation
  const taMarbuta = keyword.replace(/ة/g, "ه");
  if (taMarbuta !== keyword) variations.push(taMarbuta);

  // Common أ/ا variation
  const alefVariant = keyword.replace(/أ|إ|آ/g, "ا");
  if (alefVariant !== keyword) variations.push(alefVariant);

  // With "ال" prefix (definite article)
  if (!keyword.startsWith("ال")) {
    variations.push(`ال${keyword}`);
  }

  return [...new Set(variations)];
}

/**
 * Check if Arabic meta tag lengths are within SEO limits.
 * Arabic characters render wider so effective limits differ.
 */
export function checkArabicMetaLengths(meta: {
  title?: string;
  description?: string;
}): { titleOk: boolean; descriptionOk: boolean; suggestions: string[] } {
  const suggestions: string[] = [];

  const titleLen = meta.title?.length || 0;
  const descLen = meta.description?.length || 0;

  // Arabic titles: 50-60 chars (similar to English)
  const titleOk = titleLen >= 30 && titleLen <= 65;
  if (!titleOk && meta.title) {
    suggestions.push(
      titleLen < 30
        ? "Arabic title is too short — aim for 50-60 characters"
        : "Arabic title is too long — trim to under 65 characters",
    );
  }

  // Arabic descriptions: 140-155 chars
  const descriptionOk = descLen >= 100 && descLen <= 160;
  if (!descriptionOk && meta.description) {
    suggestions.push(
      descLen < 100
        ? "Arabic meta description too short — aim for 140-155 characters"
        : "Arabic meta description too long — trim to under 160 characters",
    );
  }

  return { titleOk, descriptionOk, suggestions };
}
