/**
 * AI Content Generator
 *
 * Generate articles, guides, comparisons, and other content using AI.
 */

import { generateJSON, generateCompletion, AICompletionOptions } from './provider';

export interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  headings: string[];
  wordCount: number;
}

export interface ContentGenerationOptions extends AICompletionOptions {
  locale: 'ar' | 'en';
  targetWordCount?: number;
  targetKeyword?: string;
  includeSchema?: boolean;
  tone?: 'professional' | 'casual' | 'luxury' | 'informative';
}

export interface ResortReviewOptions extends ContentGenerationOptions {
  resortName: string;
  resortData?: {
    location?: string;
    priceRange?: string;
    category?: string;
    features?: string[];
  };
}

export interface ComparisonOptions extends ContentGenerationOptions {
  items: string[];
  comparisonType: 'resort' | 'destination' | 'experience';
  audience?: string;
}

/**
 * Generate a resort review article
 */
export async function generateResortReview(
  options: ResortReviewOptions
): Promise<GeneratedArticle> {
  const { resortName, resortData, locale, targetWordCount = 2000, targetKeyword } = options;

  const systemPrompt = locale === 'ar'
    ? `أنت كاتب محتوى سفر خبير متخصص في منتجعات المالديف الفاخرة. اكتب بأسلوب احترافي وجذاب باللغة العربية.`
    : `You are an expert travel content writer specializing in luxury Maldives resorts. Write in a professional yet engaging style.`;

  const prompt = locale === 'ar'
    ? `اكتب مراجعة شاملة لمنتجع ${resortName} في المالديف.

${resortData ? `معلومات المنتجع:
- الموقع: ${resortData.location || 'غير محدد'}
- فئة السعر: ${resortData.priceRange || 'فاخر'}
- الفئة: ${resortData.category || 'منتجع فاخر'}
- المميزات: ${resortData.features?.join('، ') || 'غير محدد'}` : ''}

المتطلبات:
- عدد الكلمات المستهدف: ${targetWordCount}
- الكلمة المفتاحية: ${targetKeyword || resortName}
- تضمين: نظرة عامة، الإقامة، المطاعم، الأنشطة، نصائح، التقييم النهائي

أرجع النتيجة كـ JSON بالتنسيق التالي:
{
  "title": "عنوان المقال",
  "slug": "slug-in-english",
  "excerpt": "ملخص قصير",
  "content": "المحتوى الكامل بتنسيق HTML",
  "metaTitle": "عنوان SEO",
  "metaDescription": "وصف SEO",
  "keywords": ["كلمة1", "كلمة2"],
  "headings": ["عنوان1", "عنوان2"],
  "wordCount": 2000
}`
    : `Write a comprehensive review of ${resortName} resort in the Maldives.

${resortData ? `Resort information:
- Location: ${resortData.location || 'Not specified'}
- Price range: ${resortData.priceRange || 'Luxury'}
- Category: ${resortData.category || 'Luxury Resort'}
- Features: ${resortData.features?.join(', ') || 'Not specified'}` : ''}

Requirements:
- Target word count: ${targetWordCount}
- Target keyword: ${targetKeyword || resortName}
- Include: Overview, Accommodation, Dining, Activities, Tips, Final verdict

Return as JSON in this format:
{
  "title": "Article title",
  "slug": "url-slug",
  "excerpt": "Short summary",
  "content": "Full content in HTML format",
  "metaTitle": "SEO title",
  "metaDescription": "SEO description",
  "keywords": ["keyword1", "keyword2"],
  "headings": ["heading1", "heading2"],
  "wordCount": 2000
}`;

  return generateJSON<GeneratedArticle>(prompt, { ...options, systemPrompt });
}

/**
 * Generate a comparison article
 */
export async function generateComparison(
  options: ComparisonOptions
): Promise<GeneratedArticle> {
  const { items, comparisonType, locale, targetWordCount = 2500, audience } = options;

  const systemPrompt = locale === 'ar'
    ? `أنت كاتب محتوى سفر خبير. اكتب مقارنات موضوعية ومفيدة تساعد القراء على اتخاذ القرار.`
    : `You are an expert travel content writer. Write objective and helpful comparisons that help readers make decisions.`;

  const itemsStr = items.join(locale === 'ar' ? ' مقابل ' : ' vs ');

  const prompt = locale === 'ar'
    ? `اكتب مقارنة شاملة بين: ${itemsStr}

نوع المقارنة: ${comparisonType}
${audience ? `الجمهور المستهدف: ${audience}` : ''}
عدد الكلمات المستهدف: ${targetWordCount}

المتطلبات:
- جدول مقارنة واضح
- إيجابيات وسلبيات كل خيار
- توصية نهائية لكل نوع من المسافرين
- تسعير تقديري

أرجع النتيجة كـ JSON.`
    : `Write a comprehensive comparison between: ${itemsStr}

Comparison type: ${comparisonType}
${audience ? `Target audience: ${audience}` : ''}
Target word count: ${targetWordCount}

Requirements:
- Clear comparison table
- Pros and cons for each option
- Final recommendation for each traveler type
- Estimated pricing

Return as JSON.`;

  return generateJSON<GeneratedArticle>(prompt, { ...options, systemPrompt });
}

/**
 * Generate a travel guide
 */
export async function generateTravelGuide(options: {
  destination: string;
  locale: 'ar' | 'en';
  targetWordCount?: number;
  topics?: string[];
} & AICompletionOptions): Promise<GeneratedArticle> {
  const { destination, locale, targetWordCount = 3000, topics } = options;

  const systemPrompt = locale === 'ar'
    ? `أنت كاتب دليل سفر خبير. اكتب أدلة شاملة ومفيدة للمسافرين العرب.`
    : `You are an expert travel guide writer. Write comprehensive and useful guides for travelers.`;

  const prompt = locale === 'ar'
    ? `اكتب دليل سفر شامل لـ ${destination}.

${topics?.length ? `المواضيع المطلوبة: ${topics.join('، ')}` : ''}
عدد الكلمات المستهدف: ${targetWordCount}

تضمين:
- أفضل وقت للزيارة
- كيفية الوصول
- أماكن الإقامة
- الأنشطة والمعالم
- الطعام والمطاعم
- نصائح مهمة
- الميزانية التقديرية

أرجع كـ JSON.`
    : `Write a comprehensive travel guide for ${destination}.

${topics?.length ? `Required topics: ${topics.join(', ')}` : ''}
Target word count: ${targetWordCount}

Include:
- Best time to visit
- How to get there
- Accommodation options
- Activities and attractions
- Food and restaurants
- Important tips
- Estimated budget

Return as JSON.`;

  return generateJSON<GeneratedArticle>(prompt, { ...options, systemPrompt });
}

/**
 * Generate article from any prompt
 */
export async function generateArticleFromPrompt(options: {
  prompt: string;
  locale: 'ar' | 'en';
  targetWordCount?: number;
} & AICompletionOptions): Promise<GeneratedArticle> {
  const { prompt, locale, targetWordCount = 1500 } = options;

  const systemPrompt = locale === 'ar'
    ? `أنت كاتب محتوى محترف. أنشئ محتوى عالي الجودة ومحسّن لمحركات البحث.`
    : `You are a professional content writer. Create high-quality, SEO-optimized content.`;

  const fullPrompt = `${prompt}

Requirements:
- Word count: ${targetWordCount}
- Format: HTML
- Include meta title and description
- Include relevant keywords

Return as JSON with structure:
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "content": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "keywords": [...],
  "headings": [...],
  "wordCount": ...
}`;

  return generateJSON<GeneratedArticle>(fullPrompt, { ...options, systemPrompt });
}

/**
 * Generate multiple content ideas/topics
 */
export async function generateContentIdeas(options: {
  niche: string;
  locale: 'ar' | 'en';
  count?: number;
  existingTopics?: string[];
} & AICompletionOptions): Promise<Array<{
  title: string;
  description: string;
  keywords: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedWordCount: number;
}>> {
  const { niche, locale, count = 10, existingTopics } = options;

  const systemPrompt = locale === 'ar'
    ? `أنت خبير في استراتيجية المحتوى ومحركات البحث.`
    : `You are a content strategy and SEO expert.`;

  const prompt = locale === 'ar'
    ? `اقترح ${count} أفكار مقالات جديدة لموقع عن ${niche}.

${existingTopics?.length ? `تجنب هذه المواضيع الموجودة: ${existingTopics.join('، ')}` : ''}

لكل فكرة، قدم:
- العنوان
- الوصف
- الكلمات المفتاحية
- مستوى الصعوبة
- عدد الكلمات المتوقع

أرجع كـ JSON array.`
    : `Suggest ${count} new article ideas for a website about ${niche}.

${existingTopics?.length ? `Avoid these existing topics: ${existingTopics.join(', ')}` : ''}

For each idea, provide:
- Title
- Description
- Keywords
- Difficulty level
- Estimated word count

Return as JSON array.`;

  return generateJSON(prompt, { ...options, systemPrompt });
}

/**
 * Improve/rewrite existing content
 */
export async function improveContent(options: {
  content: string;
  locale: 'ar' | 'en';
  improvements: ('seo' | 'readability' | 'engagement' | 'accuracy')[];
} & AICompletionOptions): Promise<{
  improvedContent: string;
  changes: string[];
  seoScore: number;
}> {
  const { content, locale, improvements } = options;

  const systemPrompt = locale === 'ar'
    ? `أنت محرر محتوى خبير متخصص في تحسين المحتوى للويب.`
    : `You are an expert content editor specializing in web content optimization.`;

  const prompt = locale === 'ar'
    ? `حسّن المحتوى التالي مع التركيز على: ${improvements.join('، ')}

المحتوى الأصلي:
${content}

أرجع كـ JSON مع:
- improvedContent: المحتوى المحسّن
- changes: قائمة التغييرات
- seoScore: نقاط SEO من 0-100`
    : `Improve the following content focusing on: ${improvements.join(', ')}

Original content:
${content}

Return as JSON with:
- improvedContent: The improved content
- changes: List of changes made
- seoScore: SEO score from 0-100`;

  return generateJSON(prompt, { ...options, systemPrompt });
}
