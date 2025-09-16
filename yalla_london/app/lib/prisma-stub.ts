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
  [key: string]: any;
}

// Demo data for blog posts - this will be managed through admin dashboard
let mockBlogPosts = [
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
    }
  };
};

export const mockPrismaClient = createMockClient();