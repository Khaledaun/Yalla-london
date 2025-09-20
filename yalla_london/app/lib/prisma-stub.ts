// Enhanced Prisma client stub for demonstration of unified admin-public workflow
// This file provides mock data to demonstrate admin dashboard controlling public site

export interface MockPrismaClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $executeRaw(...args: any[]): Promise<any>;
  $queryRaw(...args: any[]): Promise<any>;
  blogPost: any;
  category: any;
  user: any;
  mediaAsset: any;
  homepageBlock: any;
  topicProposal: any;
  apiSettings: any;
  [key: string]: any;
}

// Demo data for blog posts - this will be managed through admin dashboard
let mockBlogPosts = [
  {
    id: 'mock-post-3',
    title_en: 'Luxury Christmas Markets in London 2024',
    title_ar: 'أسواق عيد الميلاد الفاخرة في لندن 2024',
    excerpt_en: 'Discover London\'s most enchanting Christmas markets featuring luxury crafts, gourmet food, and festive experiences.',
    excerpt_ar: 'اكتشف أسواق عيد الميلاد الأكثر سحراً في لندن التي تتميز بالحرف الفاخرة والطعام الذواقة والتجارب الاحتفالية.',
    content_en: 'London\'s Christmas markets transform the city into a winter wonderland, offering visitors an enchanting blend of luxury shopping, gourmet delicacies, and festive entertainment. From the elegant stalls at Covent Garden to the sophisticated Christmas market at Southbank Centre, these destinations showcase the finest in British and international craftsmanship.',
    content_ar: 'تحول أسواق عيد الميلاد في لندن المدينة إلى أرض العجائب الشتوية، وتقدم للزوار مزيجاً ساحراً من التسوق الفاخر والأطعمة الذواقة والترفيه الاحتفالي.',
    slug: 'luxury-christmas-markets-london-2024',
    featured_image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800',
    published: true,
    page_type: 'guide',
    seo_score: 88,
    tags: ['christmas', 'markets', 'luxury', 'shopping', 'winter'],
    created_at: new Date('2024-12-20'),
    updated_at: new Date('2024-12-20'),
    category_id: 'cat-shopping',
    author_id: 'author-1',
    category: {
      id: 'cat-shopping',
      name_en: 'Style & Shopping',
      name_ar: 'الأناقة والتسوق',
      slug: 'style-shopping'
    },
    author: {
      id: 'author-1',
      name: 'Sarah Johnson',
      email: 'sarah@yallalondon.com',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b740?w=100&h=100&fit=crop&crop=face'
    }
  },
  {
    id: 'mock-post-1',
    title_en: 'Luxury Shopping Guide: Harrods to Harvey Nichols',
    title_ar: 'دليل التسوق الفاخر: من هارودز إلى هارفي نيكولز',
    excerpt_en: 'Discover the finest luxury shopping destinations in London, from iconic department stores to hidden boutique gems.',
    excerpt_ar: 'اكتشف أفضل وجهات التسوق الفاخرة في لندن، من المتاجر الكبرى الشهيرة إلى الكنوز المخفية.',
    content_en: 'London is a paradise for luxury shopping enthusiasts...',
    content_ar: 'لندن هي جنة لعشاق التسوق الفاخر...',
    slug: 'luxury-shopping-guide-harrods-harvey-nichols',
    featured_image: 'https://media.timeout.com/images/105658049/image.jpg',
    published: true,
    page_type: 'guide',
    seo_score: 85,
    tags: ['shopping', 'luxury', 'harrods', 'harvey-nichols'],
    created_at: new Date('2024-12-01'),
    updated_at: new Date('2024-12-15'),
    category_id: 'cat-shopping',
    author_id: 'author-1',
    category: {
      id: 'cat-shopping',
      name_en: 'Style & Shopping',
      name_ar: 'الأناقة والتسوق',
      slug: 'style-shopping'
    },
    author: {
      id: 'author-1',
      name: 'Sarah Johnson',
      email: 'sarah@yallalondon.com',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b740?w=100&h=100&fit=crop&crop=face'
    }
  },
  {
    id: 'mock-post-2',
    title_en: 'The Ultimate London Foodie Experience',
    title_ar: 'تجربة الطعام النهائية في لندن',
    excerpt_en: 'From Michelin-starred restaurants to hidden local gems, explore London\'s diverse culinary landscape.',
    excerpt_ar: 'من المطاعم الحاصلة على نجوم ميشلان إلى الكنوز المحلية المخفية، استكشف المشهد الطهوي المتنوع في لندن.',
    content_en: 'London\'s food scene is one of the most vibrant in the world...',
    content_ar: 'مشهد الطعام في لندن هو واحد من أكثر المشاهد حيوية في العالم...',
    slug: 'ultimate-london-foodie-experience',
    featured_image: 'https://www.thecityofldn.com/wp-content/uploads/2023/04/FM_Helen-Lowe_Resize.jpg',
    published: true,
    page_type: 'guide',
    seo_score: 92,
    tags: ['food', 'restaurants', 'michelin', 'dining'],
    created_at: new Date('2024-12-05'),
    updated_at: new Date('2024-12-16'),
    category_id: 'cat-food',
    author_id: 'author-1',
    category: {
      id: 'cat-food',
      name_en: 'Food & Drink',
      name_ar: 'الطعام والشراب',
      slug: 'food-drink'
    },
    author: {
      id: 'author-1',
      name: 'Sarah Johnson',
      email: 'sarah@yallalondon.com',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b740?w=100&h=100&fit=crop&crop=face'
    }
  }
];

let mockCategories = [
  {
    id: 'cat-shopping',
    name_en: 'Style & Shopping',
    name_ar: 'الأناقة والتسوق',
    slug: 'style-shopping',
    description_en: 'Fashion, luxury shopping, and style guides',
    description_ar: 'الموضة والتسوق الفاخر وأدلة الأناقة'
  },
  {
    id: 'cat-food',
    name_en: 'Food & Drink',
    name_ar: 'الطعام والشراب',
    slug: 'food-drink',
    description_en: 'Restaurants, cafes, and culinary experiences',
    description_ar: 'المطاعم والمقاهي والتجارب الطهوية'
  }
];

let mockUsers = [
  {
    id: 'author-1',
    name: 'Sarah Johnson',
    email: 'sarah@yallalondon.com',
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b740?w=100&h=100&fit=crop&crop=face',
    role: 'admin'
  }
];

let mockMediaAssets = [
  {
    id: 'media-1',
    filename: 'harrods-exterior.jpg',
    original_name: 'harrods-exterior.jpg',
    cloud_storage_path: 'images/harrods-exterior.jpg',
    url: 'https://media.timeout.com/images/105658049/image.jpg',
    file_type: 'image',
    mime_type: 'image/jpeg',
    file_size: 2048000,
    width: 1200,
    height: 800,
    alt_text: 'Harrods department store exterior in London',
    title: 'Harrods Luxury Department Store',
    tags: ['shopping', 'luxury', 'harrods', 'london'],
    created_at: new Date('2024-12-01')
  }
];

let mockHomepageBlocks = [
  {
    id: 'hero-1',
    type: 'hero',
    title_en: 'Welcome to Yalla London',
    title_ar: 'مرحباً بك في يالا لندن',
    content_en: 'Your luxury guide to London',
    content_ar: 'دليلك الفاخر للندن',
    config: { style: 'gradient', showButton: true },
    position: 1,
    enabled: true,
    version: 'published',
    created_at: new Date('2024-12-01')
  }
];

// Mock topic proposals data
let mockTopics = [
  {
    id: 'topic-1',
    title: 'Best Hidden Gems in London 2024',
    description: 'Discover secret spots and lesser-known attractions that locals love',
    keywords: ['london hidden gems', 'secret london', 'off beaten path'],
    longtail_keywords: ['best hidden gems in London', 'secret spots London locals love'],
    authority_links: ['https://visitlondon.com/hidden', 'https://timeout.com/london/secret'],
    target_publish_date: new Date('2024-12-25'),
    status: 'approved',
    priority: 'high',
    content_type: 'guide',
    research_phase: 'topic_research',
    source_weights_json: { position: 1 },
    created_at: new Date('2024-12-20'),
    updated_at: new Date('2024-12-20')
  },
  {
    id: 'topic-2',
    title: 'London Food Markets: A Complete Guide',
    description: 'Comprehensive guide to the best food markets in London with insider tips',
    keywords: ['london food markets', 'borough market', 'street food london'],
    longtail_keywords: ['best food markets in London', 'London market food guide'],
    authority_links: ['https://boroughmarket.org.uk', 'https://londonist.com/markets'],
    target_publish_date: new Date('2024-12-30'),
    status: 'pending',
    priority: 'medium',
    content_type: 'guide',
    research_phase: 'topic_research',
    source_weights_json: { position: 2 },
    created_at: new Date('2024-12-21'),
    updated_at: new Date('2024-12-21')
  }
];

// Mock API settings data
let mockApiSettings = [
  {
    id: 'theme-1',
    key_name: 'theme_settings',
    key_value: JSON.stringify({
      siteName: 'Yalla London',
      siteTagline: 'Your Guide to London\'s Best',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      accentColor: '#F59E0B',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      linkColor: '#2563EB'
    }),
    is_active: true,
    created_at: new Date('2024-12-01'),
    updated_at: new Date('2024-12-01')
  },
  {
    id: 'prompt-1',
    key_name: 'prompt_content_travel_guide',
    key_value: JSON.stringify({
      name: 'London Travel Guide',
      description: 'Creates comprehensive travel guides for London attractions',
      category: 'content',
      language: 'en',
      contentType: ['guide', 'travel'],
      prompt: 'Write a comprehensive travel guide about {{attraction}} in London. Include practical information like opening hours, admission fees, best time to visit, and insider tips. Structure: Introduction, What to Expect, Practical Information, Pro Tips, and Conclusion.',
      variables: ['attraction'],
      version: 1,
      isActive: true,
      usageCount: 12,
      lastUsed: new Date('2024-12-20').toISOString(),
      createdAt: new Date('2024-12-15').toISOString(),
      updatedAt: new Date('2024-12-20').toISOString()
    }),
    is_active: true,
    created_at: new Date('2024-12-15'),
    updated_at: new Date('2024-12-20')
  },
  {
    id: 'prompt-2',
    key_name: 'prompt_seo_meta_description',
    key_value: JSON.stringify({
      name: 'SEO Meta Description',
      description: 'Generates compelling meta descriptions for London content',
      category: 'seo',
      language: 'en',
      contentType: ['seo', 'meta'],
      prompt: 'Write an engaging 150-character meta description for a page about {{topic}} in London. Include key benefits, location context, and a call to action. Make it click-worthy and SEO-optimized.',
      variables: ['topic'],
      version: 2,
      isActive: true,
      usageCount: 25,
      lastUsed: new Date('2024-12-21').toISOString(),
      createdAt: new Date('2024-12-10').toISOString(),
      updatedAt: new Date('2024-12-21').toISOString()
    }),
    is_active: true,
    created_at: new Date('2024-12-10'),
    updated_at: new Date('2024-12-21')
  },
  {
    id: 'prompt-3',
    key_name: 'prompt_social_instagram_post',
    key_value: JSON.stringify({
      name: 'Instagram Post Content',
      description: 'Creates engaging Instagram posts about London experiences',
      category: 'social',
      language: 'en',
      contentType: ['social', 'instagram'],
      prompt: 'Create an engaging Instagram post about {{experience}} in London. Include emojis, relevant hashtags, and a compelling caption that encourages engagement. Keep it under 2200 characters. Structure: Hook, Story, Call to Action.',
      variables: ['experience'],
      version: 1,
      isActive: true,
      usageCount: 8,
      lastUsed: new Date('2024-12-19').toISOString(),
      createdAt: new Date('2024-12-18').toISOString(),
      updatedAt: new Date('2024-12-19').toISOString()
    }),
    is_active: true,
    created_at: new Date('2024-12-18'),
    updated_at: new Date('2024-12-19')
  }
];

// Mock database operations
const createMockClient = (): MockPrismaClient => {
  return {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $executeRaw: (...args: any[]) => Promise.resolve([]),
    $queryRaw: (...args: any[]) => Promise.resolve([]),
    
    blogPost: {
      findMany: (params: any = {}) => {
        let posts = [...mockBlogPosts];
        
        // Apply filters
        if (params.where) {
          if (params.where.published !== undefined) {
            posts = posts.filter(p => p.published === params.where.published);
          }
          if (params.where.category?.slug) {
            posts = posts.filter(p => p.category.slug === params.where.category.slug);
          }
          if (params.where.OR) {
            // Simple search implementation
            const searchTerms = params.where.OR;
            posts = posts.filter(p => 
              searchTerms.some((term: any) => {
                if (term.title_en?.contains) {
                  return p.title_en.toLowerCase().includes(term.title_en.contains.toLowerCase());
                }
                if (term.title_ar?.contains) {
                  return p.title_ar.toLowerCase().includes(term.title_ar.contains.toLowerCase());
                }
                return false;
              })
            );
          }
        }
        
        // Apply ordering
        if (params.orderBy?.created_at === 'desc') {
          posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        
        // Apply pagination
        if (params.skip) {
          posts = posts.slice(params.skip);
        }
        if (params.take) {
          posts = posts.slice(0, params.take);
        }
        
        // Apply select/include
        if (params.select || params.include) {
          // Return full objects for demo - in real implementation would filter fields
          return Promise.resolve(posts);
        }
        
        return Promise.resolve(posts);
      },
      
      count: (params: any = {}) => {
        let count = mockBlogPosts.length;
        if (params.where?.published !== undefined) {
          count = mockBlogPosts.filter(p => p.published === params.where.published).length;
        }
        return Promise.resolve(count);
      },
      
      findUnique: (params: any) => {
        const post = mockBlogPosts.find(p => p.id === params.where.id || p.slug === params.where.slug);
        return Promise.resolve(post || null);
      },
      
      create: (params: any) => {
        const newPost = {
          id: `mock-post-${Date.now()}`,
          ...params.data,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        // Add relations if needed
        if (params.include?.category) {
          const category = mockCategories.find(c => c.id === newPost.category_id);
          newPost.category = category;
        }
        if (params.include?.author) {
          const author = mockUsers.find(u => u.id === newPost.author_id);
          newPost.author = author;
        }
        
        mockBlogPosts.push(newPost);
        return Promise.resolve(newPost);
      },
      
      update: (params: any) => {
        const index = mockBlogPosts.findIndex(p => p.id === params.where.id);
        if (index === -1) return Promise.resolve(null);
        
        mockBlogPosts[index] = {
          ...mockBlogPosts[index],
          ...params.data,
          updated_at: new Date()
        };
        
        return Promise.resolve(mockBlogPosts[index]);
      },
      
      delete: (params: any) => {
        const index = mockBlogPosts.findIndex(p => p.id === params.where.id);
        if (index === -1) return Promise.resolve(null);
        
        const deleted = mockBlogPosts[index];
        mockBlogPosts.splice(index, 1);
        return Promise.resolve(deleted);
      }
    },
    
    category: {
      findMany: () => Promise.resolve(mockCategories),
      findUnique: (params: any) => {
        const category = mockCategories.find(c => c.id === params.where.id || c.slug === params.where.slug);
        return Promise.resolve(category || null);
      }
    },
    
    user: {
      findUnique: (params: any) => {
        const user = mockUsers.find(u => u.id === params.where.id || u.email === params.where.email);
        return Promise.resolve(user || null);
      }
    },
    
    mediaAsset: {
      findMany: () => Promise.resolve(mockMediaAssets),
      create: (params: any) => {
        const newAsset = {
          id: `mock-media-${Date.now()}`,
          ...params.data,
          created_at: new Date(),
          updated_at: new Date()
        };
        mockMediaAssets.push(newAsset);
        return Promise.resolve(newAsset);
      }
    },
    
    homepageBlock: {
      findMany: (params: any = {}) => {
        let blocks = [...mockHomepageBlocks];
        if (params.where?.enabled) {
          blocks = blocks.filter(b => b.enabled);
        }
        if (params.orderBy?.position) {
          blocks.sort((a, b) => a.position - b.position);
        }
        return Promise.resolve(blocks);
      },
      
      create: (params: any) => {
        const newBlock = {
          id: `mock-block-${Date.now()}`,
          ...params.data,
          created_at: new Date(),
          updated_at: new Date()
        };
        mockHomepageBlocks.push(newBlock);
        return Promise.resolve(newBlock);
      },
      
      update: (params: any) => {
        const index = mockHomepageBlocks.findIndex(b => b.id === params.where.id);
        if (index === -1) return Promise.resolve(null);
        
        mockHomepageBlocks[index] = {
          ...mockHomepageBlocks[index],
          ...params.data,
          updated_at: new Date()
        };
        
        return Promise.resolve(mockHomepageBlocks[index]);
      }
    },
    
    topicProposal: {
      findMany: (params: any = {}) => {
        let topics = [...mockTopics];
        
        // Apply filters
        if (params.where) {
          if (params.where.status) {
            topics = topics.filter(t => t.status === params.where.status);
          }
          if (params.where.priority) {
            topics = topics.filter(t => t.priority === params.where.priority);
          }
          if (params.where.OR) {
            const searchTerms = params.where.OR;
            topics = topics.filter(t => 
              searchTerms.some((term: any) => {
                if (term.title?.contains) {
                  return t.title.toLowerCase().includes(term.title.contains.toLowerCase());
                }
                if (term.description?.contains) {
                  return t.description.toLowerCase().includes(term.description.contains.toLowerCase());
                }
                return false;
              })
            );
          }
        }
        
        // Apply sorting
        if (params.orderBy?.created_at === 'desc') {
          topics.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        
        // Apply pagination
        if (params.skip) {
          topics = topics.slice(params.skip);
        }
        if (params.take) {
          topics = topics.slice(0, params.take);
        }
        
        return Promise.resolve(topics);
      },
      
      count: (params: any = {}) => {
        let topics = [...mockTopics];
        if (params.where) {
          if (params.where.status) {
            topics = topics.filter(t => t.status === params.where.status);
          }
        }
        return Promise.resolve(topics.length);
      },
      
      create: (params: any) => {
        const newTopic = {
          id: `topic-${Date.now()}`,
          ...params.data,
          created_at: new Date(),
          updated_at: new Date()
        };
        mockTopics.push(newTopic);
        return Promise.resolve(newTopic);
      },
      
      update: (params: any) => {
        const index = mockTopics.findIndex(t => t.id === params.where.id);
        if (index === -1) return Promise.resolve(null);
        
        mockTopics[index] = {
          ...mockTopics[index],
          ...params.data,
          updated_at: new Date()
        };
        
        return Promise.resolve(mockTopics[index]);
      },
      
      findUnique: (params: any) => {
        const topic = mockTopics.find(t => t.id === params.where.id);
        return Promise.resolve(topic || null);
      },
      
      delete: (params: any) => {
        const index = mockTopics.findIndex(t => t.id === params.where.id);
        if (index === -1) return Promise.resolve(null);
        
        const deletedTopic = mockTopics.splice(index, 1)[0];
        return Promise.resolve(deletedTopic);
      }
    },
    
    apiSettings: {
      findMany: (params: any = {}) => {
        let settings = [...mockApiSettings];
        
        // Apply filters
        if (params.where) {
          if (params.where.key_name) {
            if (params.where.key_name.startsWith) {
              settings = settings.filter(s => s.key_name.startsWith(params.where.key_name.startsWith));
            } else {
              settings = settings.filter(s => s.key_name === params.where.key_name);
            }
          }
          if (params.where.is_active !== undefined) {
            settings = settings.filter(s => s.is_active === params.where.is_active);
          }
        }
        
        // Apply sorting
        if (params.orderBy?.updated_at === 'desc') {
          settings.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        }
        
        // Apply pagination
        if (params.skip) {
          settings = settings.slice(params.skip);
        }
        if (params.take) {
          settings = settings.slice(0, params.take);
        }
        
        return Promise.resolve(settings);
      },
      
      count: (params: any = {}) => {
        let settings = [...mockApiSettings];
        if (params.where) {
          if (params.where.key_name?.startsWith) {
            settings = settings.filter(s => s.key_name.startsWith(params.where.key_name.startsWith));
          }
        }
        return Promise.resolve(settings.length);
      },
      
      findFirst: (params: any) => {
        const setting = mockApiSettings.find(s => {
          if (params.where.key_name) {
            return s.key_name === params.where.key_name;
          }
          return false;
        });
        return Promise.resolve(setting || null);
      },
      
      findUnique: (params: any) => {
        const setting = mockApiSettings.find(s => s.id === params.where.id);
        return Promise.resolve(setting || null);
      },
      
      create: (params: any) => {
        const newSetting = {
          id: `setting-${Date.now()}`,
          ...params.data,
          created_at: new Date(),
          updated_at: new Date()
        };
        mockApiSettings.push(newSetting);
        return Promise.resolve(newSetting);
      },
      
      update: (params: any) => {
        const index = mockApiSettings.findIndex(s => s.id === params.where.id);
        if (index === -1) return Promise.resolve(null);
        
        mockApiSettings[index] = {
          ...mockApiSettings[index],
          ...params.data,
          updated_at: new Date()
        };
        
        return Promise.resolve(mockApiSettings[index]);
      },
      
      upsert: (params: any) => {
        let setting = mockApiSettings.find(s => s.key_name === params.where.key_name);
        
        if (setting) {
          // Update existing
          const index = mockApiSettings.findIndex(s => s.id === setting.id);
          mockApiSettings[index] = {
            ...setting,
            ...params.update,
            updated_at: new Date()
          };
          return Promise.resolve(mockApiSettings[index]);
        } else {
          // Create new
          const newSetting = {
            id: `setting-${Date.now()}`,
            ...params.create,
            created_at: new Date(),
            updated_at: new Date()
          };
          mockApiSettings.push(newSetting);
          return Promise.resolve(newSetting);
        }
      },
      
      delete: (params: any) => {
        const index = mockApiSettings.findIndex(s => s.id === params.where.id);
        if (index === -1) return Promise.resolve(null);
        
        const deletedSetting = mockApiSettings.splice(index, 1)[0];
        return Promise.resolve(deletedSetting);
      },
      
      deleteMany: (params: any) => {
        const toDelete = mockApiSettings.filter(s => {
          if (params.where.key_name) {
            return s.key_name === params.where.key_name;
          }
          return false;
        });
        
        toDelete.forEach(setting => {
          const index = mockApiSettings.findIndex(s => s.id === setting.id);
          if (index !== -1) {
            mockApiSettings.splice(index, 1);
          }
        });
        
        return Promise.resolve({ count: toDelete.length });
      }
    }
  };
};

export const mockPrismaClient = createMockClient();