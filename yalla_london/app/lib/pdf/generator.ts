/**
 * PDF Guide Generator
 *
 * Generates professional PDF travel guides using React-PDF or PDFKit.
 * Supports RTL Arabic layouts and multi-language content.
 */

import { generateText, isAIAvailable } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

export interface PDFGuideConfig {
  title: string;
  subtitle?: string;
  destination: string;
  locale: 'ar' | 'en';
  siteId: string;
  template: 'luxury' | 'budget' | 'family' | 'adventure' | 'honeymoon';
  sections: PDFSection[];
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    siteName: string;
    contactEmail?: string;
    website?: string;
  };
  includeAffiliate?: boolean;
}

export interface PDFSection {
  type: 'intro' | 'resorts' | 'activities' | 'dining' | 'tips' | 'packing' | 'budget' | 'itinerary' | 'affiliate';
  title: string;
  content?: string;
  items?: PDFSectionItem[];
}

export interface PDFSectionItem {
  name: string;
  description: string;
  image?: string;
  price?: string;
  rating?: number;
  affiliateLink?: string;
}

export interface GeneratedPDF {
  id: string;
  url: string;
  filename: string;
  pages: number;
  size: number;
  createdAt: Date;
}

/**
 * Generate PDF content using AI
 */
export async function generatePDFContent(
  destination: string,
  template: string,
  locale: 'ar' | 'en'
): Promise<PDFSection[]> {
  const isRTL = locale === 'ar';

  const prompt = isRTL
    ? `أنشئ محتوى دليل سفر احترافي لـ ${destination} بأسلوب ${template}.
       قدم مقدمة، قائمة بأفضل المنتجعات/الفنادق، الأنشطة، نصائح السفر، وقائمة التعبئة.
       اجعل المحتوى جذاباً ومفيداً للمسافرين العرب.`
    : `Create professional travel guide content for ${destination} in ${template} style.
       Provide an introduction, list of top resorts/hotels, activities, travel tips, and packing list.
       Make the content engaging and useful for travelers.`;

  if (await isAIAvailable()) {
    const result = await generateText(prompt, {
      maxTokens: 4000,
    });

    // Parse AI response into sections
    return parseAIContentToSections(result.text, locale);
  }

  // Fallback content
  return getDefaultSections(destination, template, locale);
}

function parseAIContentToSections(content: string, locale: 'ar' | 'en'): PDFSection[] {
  // Simple parsing - split by common headers
  const sections: PDFSection[] = [];

  // Add intro
  sections.push({
    type: 'intro',
    title: locale === 'ar' ? 'مقدمة' : 'Introduction',
    content: content.slice(0, 500),
  });

  // Extract resort section
  const resortMatch = content.match(/(?:resorts?|hotels?|منتجع|فندق)[:\s]*([\s\S]*?)(?=activities|أنشطة|tips|نصائح|$)/i);
  if (resortMatch) {
    sections.push({
      type: 'resorts',
      title: locale === 'ar' ? 'أفضل المنتجعات' : 'Top Resorts',
      content: resortMatch[1].trim().slice(0, 800),
    });
  }

  // Extract activities section
  const activitiesMatch = content.match(/(?:activities|أنشطة|things to do)[:\s]*([\s\S]*?)(?=tips|نصائح|packing|تعبئة|$)/i);
  if (activitiesMatch) {
    sections.push({
      type: 'activities',
      title: locale === 'ar' ? 'الأنشطة' : 'Activities',
      content: activitiesMatch[1].trim().slice(0, 600),
    });
  }

  // Extract tips section
  const tipsMatch = content.match(/(?:tips|نصائح|advice)[:\s]*([\s\S]*?)(?=packing|تعبئة|$)/i);
  if (tipsMatch) {
    sections.push({
      type: 'tips',
      title: locale === 'ar' ? 'نصائح السفر' : 'Travel Tips',
      content: tipsMatch[1].trim().slice(0, 500),
    });
  }

  // Add packing list
  sections.push({
    type: 'packing',
    title: locale === 'ar' ? 'قائمة التعبئة' : 'Packing List',
    content: getDefaultPackingList(locale),
  });

  return sections;
}

function getDefaultSections(destination: string, template: string, locale: 'ar' | 'en'): PDFSection[] {
  if (locale === 'ar') {
    return [
      {
        type: 'intro',
        title: 'مقدمة',
        content: `مرحباً بك في دليلك الشامل لزيارة ${destination}. سواء كنت تبحث عن الاسترخاء على الشواطئ الرملية البيضاء أو المغامرة تحت الماء، ستجد كل ما تحتاجه هنا.`,
      },
      {
        type: 'resorts',
        title: 'أفضل المنتجعات',
        content: `اكتشف أفضل المنتجعات في ${destination} التي تناسب ميزانيتك واحتياجاتك. من الفيلات الفاخرة فوق الماء إلى الغرف المطلة على الشاطئ.`,
        items: [
          { name: 'منتجع فاخر 1', description: 'فيلات فوق الماء مع مسبح خاص', rating: 5 },
          { name: 'منتجع فاخر 2', description: 'إطلالة بانورامية على المحيط', rating: 4.8 },
        ],
      },
      {
        type: 'activities',
        title: 'الأنشطة والتجارب',
        content: 'من الغوص مع أسماك القرش إلى رحلات الغروب، اكتشف أفضل الأنشطة.',
        items: [
          { name: 'غوص السكوبا', description: 'استكشف الشعاب المرجانية الملونة' },
          { name: 'رحلة الدلافين', description: 'شاهد الدلافين في بيئتها الطبيعية' },
        ],
      },
      {
        type: 'tips',
        title: 'نصائح السفر',
        content: 'نصائح مهمة لرحلة مثالية: أفضل وقت للزيارة، متطلبات التأشيرة، العملة المحلية.',
      },
      {
        type: 'packing',
        title: 'قائمة التعبئة',
        content: getDefaultPackingList('ar'),
      },
    ];
  }

  return [
    {
      type: 'intro',
      title: 'Introduction',
      content: `Welcome to your comprehensive guide to visiting ${destination}. Whether you're looking for relaxation on white sandy beaches or underwater adventures, you'll find everything you need here.`,
    },
    {
      type: 'resorts',
      title: 'Top Resorts',
      content: `Discover the best resorts in ${destination} that match your budget and needs. From luxury overwater villas to beachfront rooms.`,
      items: [
        { name: 'Luxury Resort 1', description: 'Overwater villas with private pool', rating: 5 },
        { name: 'Luxury Resort 2', description: 'Panoramic ocean views', rating: 4.8 },
      ],
    },
    {
      type: 'activities',
      title: 'Activities & Experiences',
      content: 'From shark diving to sunset cruises, discover the best activities.',
      items: [
        { name: 'Scuba Diving', description: 'Explore colorful coral reefs' },
        { name: 'Dolphin Watching', description: 'See dolphins in their natural habitat' },
      ],
    },
    {
      type: 'tips',
      title: 'Travel Tips',
      content: 'Important tips for the perfect trip: Best time to visit, visa requirements, local currency.',
    },
    {
      type: 'packing',
      title: 'Packing List',
      content: getDefaultPackingList('en'),
    },
  ];
}

function getDefaultPackingList(locale: 'ar' | 'en'): string {
  if (locale === 'ar') {
    return `
□ جواز السفر ونسخة منه
□ ملابس السباحة
□ واقي الشمس SPF 50+
□ نظارات شمسية
□ قبعة للحماية من الشمس
□ أحذية مائية
□ كاميرا تحت الماء
□ أدوية أساسية
□ مناشف خفيفة
□ ملابس خفيفة قطنية
    `.trim();
  }

  return `
□ Passport and copy
□ Swimwear
□ Sunscreen SPF 50+
□ Sunglasses
□ Sun hat
□ Water shoes
□ Underwater camera
□ Basic medications
□ Quick-dry towels
□ Light cotton clothing
  `.trim();
}

/**
 * Store PDF metadata in database
 */
export async function storePDFRecord(
  config: PDFGuideConfig,
  filename: string,
  fileUrl: string,
  fileSize: number
): Promise<string> {
  const guide = await prisma.pdfGuide.create({
    data: {
      title: config.title,
      destination: config.destination,
      template: config.template,
      locale: config.locale,
      site_id: config.siteId,
      file_url: fileUrl,
      file_size: fileSize,
      download_count: 0,
      config_json: config as any,
      status: 'published',
    },
  });

  return guide.id;
}

/**
 * Get PDF guides for a site
 */
export async function getPDFGuides(siteId?: string) {
  return prisma.pdfGuide.findMany({
    where: siteId ? { site_id: siteId } : undefined,
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Track PDF download
 */
export async function trackDownload(guideId: string, leadEmail?: string) {
  await prisma.pdfGuide.update({
    where: { id: guideId },
    data: {
      download_count: { increment: 1 },
    },
  });

  // Create download record
  await prisma.pdfDownload.create({
    data: {
      guide_id: guideId,
      lead_email: leadEmail,
    },
  });
}

/**
 * Generate HTML template for PDF rendering
 */
export function generatePDFHTML(config: PDFGuideConfig): string {
  const isRTL = config.locale === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';
  const fontFamily = isRTL ? "'Noto Sans Arabic', 'Cairo', sans-serif" : "'Inter', sans-serif";

  return `
<!DOCTYPE html>
<html lang="${config.locale}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${fontFamily};
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      direction: ${direction};
    }

    .cover {
      height: 100vh;
      background: linear-gradient(135deg, ${config.branding.primaryColor}, ${config.branding.secondaryColor});
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      color: white;
      page-break-after: always;
    }

    .cover h1 {
      font-size: 36pt;
      font-weight: 700;
      margin-bottom: 16px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .cover h2 {
      font-size: 18pt;
      font-weight: 400;
      opacity: 0.9;
    }

    .cover .logo {
      margin-top: 40px;
      font-size: 14pt;
      opacity: 0.8;
    }

    .page {
      padding: 40px;
      min-height: 100vh;
      page-break-after: always;
    }

    .section-title {
      font-size: 24pt;
      color: ${config.branding.primaryColor};
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${config.branding.primaryColor};
    }

    .content {
      font-size: 12pt;
      line-height: 1.8;
      text-align: justify;
    }

    .item {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      border-${isRTL ? 'right' : 'left'}: 4px solid ${config.branding.primaryColor};
    }

    .item-name {
      font-size: 14pt;
      font-weight: 600;
      color: ${config.branding.primaryColor};
      margin-bottom: 8px;
    }

    .item-description {
      font-size: 11pt;
      color: #555;
    }

    .rating {
      color: #ffc107;
      margin-top: 8px;
    }

    .footer {
      position: fixed;
      bottom: 20px;
      ${isRTL ? 'left' : 'right'}: 40px;
      font-size: 10pt;
      color: #888;
    }

    .affiliate-box {
      background: linear-gradient(135deg, ${config.branding.primaryColor}15, ${config.branding.secondaryColor}15);
      border: 1px solid ${config.branding.primaryColor}40;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }

    .affiliate-box .cta {
      display: inline-block;
      background: ${config.branding.primaryColor};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 16px;
    }

    .checklist {
      list-style: none;
      padding: 0;
    }

    .checklist li {
      padding: 8px 0;
      padding-${isRTL ? 'right' : 'left'}: 30px;
      position: relative;
    }

    .checklist li::before {
      content: '☐';
      position: absolute;
      ${isRTL ? 'right' : 'left'}: 0;
      color: ${config.branding.primaryColor};
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    <h1>${config.title}</h1>
    ${config.subtitle ? `<h2>${config.subtitle}</h2>` : ''}
    <div class="logo">${config.branding.siteName}</div>
  </div>

  <!-- Content Sections -->
  ${config.sections.map(section => `
    <div class="page">
      <h2 class="section-title">${section.title}</h2>
      ${section.content ? `<div class="content">${section.content.replace(/\n/g, '<br>')}</div>` : ''}
      ${section.items ? section.items.map(item => `
        <div class="item">
          <div class="item-name">${item.name}</div>
          <div class="item-description">${item.description}</div>
          ${item.rating ? `<div class="rating">${'★'.repeat(Math.floor(item.rating))}${'☆'.repeat(5 - Math.floor(item.rating))} (${item.rating})</div>` : ''}
          ${item.price ? `<div class="price">${item.price}</div>` : ''}
        </div>
      `).join('') : ''}
      ${section.type === 'affiliate' && config.includeAffiliate ? `
        <div class="affiliate-box">
          <h3>${isRTL ? 'احجز الآن واحصل على أفضل الأسعار' : 'Book Now & Get Best Prices'}</h3>
          <p>${isRTL ? 'شركاؤنا المعتمدون يقدمون عروضاً حصرية' : 'Our trusted partners offer exclusive deals'}</p>
          <a href="#" class="cta">${isRTL ? 'احجز الآن' : 'Book Now'}</a>
        </div>
      ` : ''}
    </div>
  `).join('')}

  <!-- Back Cover -->
  <div class="page" style="display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
    <h2 style="color: ${config.branding.primaryColor}; margin-bottom: 20px;">
      ${isRTL ? 'شكراً لاختيارك' : 'Thank You for Choosing'}
    </h2>
    <h1 style="font-size: 28pt; margin-bottom: 30px;">${config.branding.siteName}</h1>
    ${config.branding.website ? `<p>${config.branding.website}</p>` : ''}
    ${config.branding.contactEmail ? `<p>${config.branding.contactEmail}</p>` : ''}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Template configurations for different guide styles
 */
export const PDF_TEMPLATES = {
  luxury: {
    name: 'Luxury',
    nameAr: 'فاخر',
    primaryColor: '#8B7355',
    secondaryColor: '#D4AF37',
    description: 'Premium design for luxury travelers',
  },
  budget: {
    name: 'Budget-Friendly',
    nameAr: 'اقتصادي',
    primaryColor: '#2E7D32',
    secondaryColor: '#4CAF50',
    description: 'Practical guide for budget-conscious travelers',
  },
  family: {
    name: 'Family',
    nameAr: 'عائلي',
    primaryColor: '#1565C0',
    secondaryColor: '#42A5F5',
    description: 'Kid-friendly travel guide',
  },
  adventure: {
    name: 'Adventure',
    nameAr: 'مغامرات',
    primaryColor: '#E65100',
    secondaryColor: '#FF9800',
    description: 'Action-packed activities focus',
  },
  honeymoon: {
    name: 'Honeymoon',
    nameAr: 'شهر العسل',
    primaryColor: '#880E4F',
    secondaryColor: '#E91E63',
    description: 'Romantic getaway guide',
  },
};
