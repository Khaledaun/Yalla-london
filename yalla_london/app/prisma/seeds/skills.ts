/**
 * Skill Seed Data
 *
 * World-class skills taxonomy for the Team & Expertise system.
 * Run with: npx ts-node prisma/seeds/skills.ts
 */

import { PrismaClient, SkillCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface SkillSeed {
  slug: string;
  name_en: string;
  name_ar: string;
  category: SkillCategory;
  description_en: string;
  description_ar?: string;
  icon: string;
  color: string;
}

const SKILLS: SkillSeed[] = [
  // =============================================================================
  // ENGINEERING
  // =============================================================================
  {
    slug: 'full-stack-development',
    name_en: 'Full-Stack Development',
    name_ar: 'تطوير الويب الشامل',
    category: 'ENGINEERING',
    description_en: 'End-to-end web application development with modern frameworks',
    icon: 'code',
    color: '#3B82F6', // Blue
  },
  {
    slug: 'system-architecture',
    name_en: 'System Architecture',
    name_ar: 'هندسة الأنظمة',
    category: 'ENGINEERING',
    description_en: 'Designing scalable, maintainable software systems',
    icon: 'network',
    color: '#3B82F6',
  },
  {
    slug: 'api-design',
    name_en: 'API Design',
    name_ar: 'تصميم واجهات البرمجة',
    category: 'ENGINEERING',
    description_en: 'RESTful and GraphQL API design and implementation',
    icon: 'plug',
    color: '#3B82F6',
  },
  {
    slug: 'devops',
    name_en: 'DevOps & CI/CD',
    name_ar: 'العمليات التطويرية',
    category: 'ENGINEERING',
    description_en: 'Continuous integration, deployment, and infrastructure',
    icon: 'git-branch',
    color: '#3B82F6',
  },
  {
    slug: 'cloud-infrastructure',
    name_en: 'Cloud Infrastructure',
    name_ar: 'البنية السحابية',
    category: 'ENGINEERING',
    description_en: 'AWS, GCP, Vercel, and cloud-native architectures',
    icon: 'cloud',
    color: '#3B82F6',
  },
  {
    slug: 'performance-optimization',
    name_en: 'Performance Optimization',
    name_ar: 'تحسين الأداء',
    category: 'ENGINEERING',
    description_en: 'Core Web Vitals, caching strategies, and speed optimization',
    icon: 'zap',
    color: '#3B82F6',
  },

  // =============================================================================
  // AI & MACHINE LEARNING
  // =============================================================================
  {
    slug: 'ai-implementation',
    name_en: 'AI Implementation',
    name_ar: 'تطبيق الذكاء الاصطناعي',
    category: 'AI_ML',
    description_en: 'Integrating AI/ML solutions into production applications',
    icon: 'brain',
    color: '#8B5CF6', // Purple
  },
  {
    slug: 'prompt-engineering',
    name_en: 'Prompt Engineering',
    name_ar: 'هندسة المطالبات',
    category: 'AI_ML',
    description_en: 'Designing effective prompts for LLMs and generative AI',
    icon: 'message-square',
    color: '#8B5CF6',
  },
  {
    slug: 'llm-integration',
    name_en: 'LLM Integration',
    name_ar: 'دمج النماذج اللغوية',
    category: 'AI_ML',
    description_en: 'OpenAI, Anthropic, and custom model integrations',
    icon: 'bot',
    color: '#8B5CF6',
  },
  {
    slug: 'content-automation',
    name_en: 'Content Automation',
    name_ar: 'أتمتة المحتوى',
    category: 'AI_ML',
    description_en: 'AI-powered content generation and optimization pipelines',
    icon: 'wand-2',
    color: '#8B5CF6',
  },
  {
    slug: 'machine-learning',
    name_en: 'Machine Learning',
    name_ar: 'التعلم الآلي',
    category: 'AI_ML',
    description_en: 'ML model development, training, and deployment',
    icon: 'cpu',
    color: '#8B5CF6',
  },

  // =============================================================================
  // DESIGN
  // =============================================================================
  {
    slug: 'ui-design',
    name_en: 'UI Design',
    name_ar: 'تصميم واجهة المستخدم',
    category: 'DESIGN',
    description_en: 'Creating beautiful, intuitive user interfaces',
    icon: 'palette',
    color: '#EC4899', // Pink
  },
  {
    slug: 'ux-design',
    name_en: 'UX Design',
    name_ar: 'تصميم تجربة المستخدم',
    category: 'DESIGN',
    description_en: 'User research, wireframing, and experience optimization',
    icon: 'users',
    color: '#EC4899',
  },
  {
    slug: 'brand-design',
    name_en: 'Brand Design',
    name_ar: 'تصميم الهوية البصرية',
    category: 'DESIGN',
    description_en: 'Visual identity, logo design, and brand systems',
    icon: 'star',
    color: '#EC4899',
  },
  {
    slug: 'motion-design',
    name_en: 'Motion Design',
    name_ar: 'تصميم الحركة',
    category: 'DESIGN',
    description_en: 'Animations, micro-interactions, and video graphics',
    icon: 'play',
    color: '#EC4899',
  },
  {
    slug: 'design-systems',
    name_en: 'Design Systems',
    name_ar: 'أنظمة التصميم',
    category: 'DESIGN',
    description_en: 'Component libraries, tokens, and scalable design frameworks',
    icon: 'layers',
    color: '#EC4899',
  },
  {
    slug: 'rtl-design',
    name_en: 'RTL & Arabic Design',
    name_ar: 'التصميم العربي',
    category: 'DESIGN',
    description_en: 'Right-to-left layouts and Arabic typography expertise',
    icon: 'align-right',
    color: '#EC4899',
  },

  // =============================================================================
  // DATA
  // =============================================================================
  {
    slug: 'database-management',
    name_en: 'Database Management',
    name_ar: 'إدارة قواعد البيانات',
    category: 'DATA',
    description_en: 'PostgreSQL, MongoDB, and database optimization',
    icon: 'database',
    color: '#10B981', // Emerald
  },
  {
    slug: 'data-analytics',
    name_en: 'Data Analytics',
    name_ar: 'تحليل البيانات',
    category: 'DATA',
    description_en: 'GA4, BigQuery, and business intelligence reporting',
    icon: 'bar-chart-2',
    color: '#10B981',
  },
  {
    slug: 'data-modeling',
    name_en: 'Data Modeling',
    name_ar: 'نمذجة البيانات',
    category: 'DATA',
    description_en: 'Schema design, ERD, and data architecture',
    icon: 'boxes',
    color: '#10B981',
  },
  {
    slug: 'data-visualization',
    name_en: 'Data Visualization',
    name_ar: 'تصور البيانات',
    category: 'DATA',
    description_en: 'Charts, dashboards, and visual data storytelling',
    icon: 'pie-chart',
    color: '#10B981',
  },

  // =============================================================================
  // CONTENT
  // =============================================================================
  {
    slug: 'travel-writing',
    name_en: 'Travel Writing',
    name_ar: 'كتابة محتوى السفر',
    category: 'CONTENT',
    description_en: 'Compelling destination guides and travel narratives',
    icon: 'plane',
    color: '#F59E0B', // Amber
  },
  {
    slug: 'seo-content',
    name_en: 'SEO Content Strategy',
    name_ar: 'استراتيجية محتوى السيو',
    category: 'CONTENT',
    description_en: 'Search-optimized content that ranks and converts',
    icon: 'search',
    color: '#F59E0B',
  },
  {
    slug: 'copywriting',
    name_en: 'Copywriting',
    name_ar: 'كتابة الإعلانات',
    category: 'CONTENT',
    description_en: 'Persuasive copy for landing pages and campaigns',
    icon: 'pencil',
    color: '#F59E0B',
  },
  {
    slug: 'editorial',
    name_en: 'Editorial & Editing',
    name_ar: 'التحرير والمراجعة',
    category: 'CONTENT',
    description_en: 'Content quality, style guides, and editorial standards',
    icon: 'file-text',
    color: '#F59E0B',
  },
  {
    slug: 'arabic-content',
    name_en: 'Arabic Content Creation',
    name_ar: 'إنشاء المحتوى العربي',
    category: 'CONTENT',
    description_en: 'Native Arabic content and cultural localization',
    icon: 'languages',
    color: '#F59E0B',
  },
  {
    slug: 'content-strategy',
    name_en: 'Content Strategy',
    name_ar: 'استراتيجية المحتوى',
    category: 'CONTENT',
    description_en: 'Content planning, calendars, and editorial workflows',
    icon: 'calendar',
    color: '#F59E0B',
  },

  // =============================================================================
  // MARKETING
  // =============================================================================
  {
    slug: 'affiliate-marketing',
    name_en: 'Affiliate Marketing',
    name_ar: 'التسويق بالعمولة',
    category: 'MARKETING',
    description_en: 'Partnership programs, commission optimization, and tracking',
    icon: 'link',
    color: '#EF4444', // Red
  },
  {
    slug: 'growth-strategy',
    name_en: 'Growth Strategy',
    name_ar: 'استراتيجية النمو',
    category: 'MARKETING',
    description_en: 'User acquisition, retention, and viral growth tactics',
    icon: 'trending-up',
    color: '#EF4444',
  },
  {
    slug: 'paid-media',
    name_en: 'Paid Media',
    name_ar: 'الإعلانات المدفوعة',
    category: 'MARKETING',
    description_en: 'Google Ads, Meta Ads, and performance marketing',
    icon: 'dollar-sign',
    color: '#EF4444',
  },
  {
    slug: 'email-marketing',
    name_en: 'Email Marketing',
    name_ar: 'التسويق عبر البريد',
    category: 'MARKETING',
    description_en: 'Email campaigns, automation, and list management',
    icon: 'mail',
    color: '#EF4444',
  },
  {
    slug: 'social-media',
    name_en: 'Social Media Marketing',
    name_ar: 'التسويق عبر التواصل',
    category: 'MARKETING',
    description_en: 'Instagram, TikTok, and social content strategy',
    icon: 'share-2',
    color: '#EF4444',
  },
  {
    slug: 'conversion-optimization',
    name_en: 'Conversion Optimization',
    name_ar: 'تحسين التحويلات',
    category: 'MARKETING',
    description_en: 'A/B testing, funnel optimization, and CRO',
    icon: 'target',
    color: '#EF4444',
  },

  // =============================================================================
  // PSYCHOLOGY
  // =============================================================================
  {
    slug: 'consumer-behavior',
    name_en: 'Consumer Behavior',
    name_ar: 'سلوك المستهلك',
    category: 'PSYCHOLOGY',
    description_en: 'Understanding and influencing purchase decisions',
    icon: 'brain',
    color: '#6366F1', // Indigo
  },
  {
    slug: 'persuasion-design',
    name_en: 'Persuasion Design',
    name_ar: 'تصميم الإقناع',
    category: 'PSYCHOLOGY',
    description_en: 'Applying behavioral psychology to UX and marketing',
    icon: 'sparkles',
    color: '#6366F1',
  },
  {
    slug: 'ux-research',
    name_en: 'UX Research',
    name_ar: 'أبحاث تجربة المستخدم',
    category: 'PSYCHOLOGY',
    description_en: 'User interviews, surveys, and usability testing',
    icon: 'clipboard-list',
    color: '#6366F1',
  },
  {
    slug: 'behavioral-analytics',
    name_en: 'Behavioral Analytics',
    name_ar: 'تحليلات السلوك',
    category: 'PSYCHOLOGY',
    description_en: 'Heatmaps, session recordings, and behavior analysis',
    icon: 'mouse-pointer',
    color: '#6366F1',
  },

  // =============================================================================
  // BUSINESS
  // =============================================================================
  {
    slug: 'business-strategy',
    name_en: 'Business Strategy',
    name_ar: 'استراتيجية الأعمال',
    category: 'BUSINESS',
    description_en: 'Market positioning, competitive analysis, and planning',
    icon: 'briefcase',
    color: '#64748B', // Slate
  },
  {
    slug: 'operations',
    name_en: 'Operations',
    name_ar: 'العمليات',
    category: 'BUSINESS',
    description_en: 'Process optimization, workflows, and efficiency',
    icon: 'settings',
    color: '#64748B',
  },
  {
    slug: 'partnerships',
    name_en: 'Partnerships',
    name_ar: 'الشراكات',
    category: 'BUSINESS',
    description_en: 'Business development and strategic partnerships',
    icon: 'handshake',
    color: '#64748B',
  },
  {
    slug: 'product-management',
    name_en: 'Product Management',
    name_ar: 'إدارة المنتجات',
    category: 'BUSINESS',
    description_en: 'Roadmap planning, prioritization, and product strategy',
    icon: 'layout',
    color: '#64748B',
  },
  {
    slug: 'project-management',
    name_en: 'Project Management',
    name_ar: 'إدارة المشاريع',
    category: 'BUSINESS',
    description_en: 'Agile methodologies, sprints, and team coordination',
    icon: 'kanban',
    color: '#64748B',
  },

  // =============================================================================
  // TRAVEL
  // =============================================================================
  {
    slug: 'maldives-expertise',
    name_en: 'Maldives Expertise',
    name_ar: 'خبرة المالديف',
    category: 'TRAVEL',
    description_en: 'Deep knowledge of Maldives resorts, atolls, and experiences',
    icon: 'palmtree',
    color: '#06B6D4', // Cyan
  },
  {
    slug: 'luxury-travel',
    name_en: 'Luxury Travel',
    name_ar: 'السفر الفاخر',
    category: 'TRAVEL',
    description_en: 'High-end travel experiences and luxury hospitality',
    icon: 'gem',
    color: '#06B6D4',
  },
  {
    slug: 'hospitality-industry',
    name_en: 'Hospitality Industry',
    name_ar: 'صناعة الضيافة',
    category: 'TRAVEL',
    description_en: 'Hotel operations, resort management, and industry trends',
    icon: 'building',
    color: '#06B6D4',
  },
  {
    slug: 'destination-planning',
    name_en: 'Destination Planning',
    name_ar: 'تخطيط الوجهات',
    category: 'TRAVEL',
    description_en: 'Itinerary design, logistics, and travel planning',
    icon: 'map',
    color: '#06B6D4',
  },
  {
    slug: 'travel-photography',
    name_en: 'Travel Photography',
    name_ar: 'تصوير السفر',
    category: 'TRAVEL',
    description_en: 'Destination photography and visual storytelling',
    icon: 'camera',
    color: '#06B6D4',
  },
  {
    slug: 'london-expertise',
    name_en: 'London Expertise',
    name_ar: 'خبرة لندن',
    category: 'TRAVEL',
    description_en: 'Deep knowledge of London attractions, neighborhoods, and culture',
    icon: 'landmark',
    color: '#06B6D4',
  },
];

async function seedSkills() {
  console.log('🌱 Seeding skills...\n');

  let created = 0;
  let updated = 0;

  for (const skill of SKILLS) {
    const result = await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: {
        name_en: skill.name_en,
        name_ar: skill.name_ar,
        category: skill.category,
        description_en: skill.description_en,
        description_ar: skill.description_ar,
        icon: skill.icon,
        color: skill.color,
        is_active: true,
      },
      create: {
        slug: skill.slug,
        name_en: skill.name_en,
        name_ar: skill.name_ar,
        category: skill.category,
        description_en: skill.description_en,
        description_ar: skill.description_ar,
        icon: skill.icon,
        color: skill.color,
        is_active: true,
        display_order: SKILLS.indexOf(skill),
      },
    });

    if (result.created_at.getTime() === result.updated_at.getTime()) {
      created++;
      console.log(`  ✅ Created: ${skill.name_en} (${skill.category})`);
    } else {
      updated++;
      console.log(`  🔄 Updated: ${skill.name_en}`);
    }
  }

  console.log(`\n✨ Done! Created: ${created}, Updated: ${updated}, Total: ${SKILLS.length}`);

  // Print summary by category
  console.log('\n📊 Skills by category:');
  const categories = [...new Set(SKILLS.map(s => s.category))];
  for (const cat of categories) {
    const count = SKILLS.filter(s => s.category === cat).length;
    console.log(`  ${cat}: ${count} skills`);
  }
}

// Export for use in main seed file
export { SKILLS, seedSkills };

// Run directly if executed as script
if (require.main === module) {
  seedSkills()
    .catch((e) => {
      console.error('❌ Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
