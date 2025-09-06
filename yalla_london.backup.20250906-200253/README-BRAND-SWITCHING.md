
# 🎨 Brand Identity Switching System

This documentation explains how to create new branded websites using the same codebase. The system is designed for **developers only** - users never see brand switching options.

## 🎯 Overview

This platform is built to support multiple brands with identical functionality but different identities:

- **Default Launch**: Yalla London (luxury London travel guide)
- **Developer System**: Code-level brand identity switching
- **No User Interface**: Brand switching is not accessible to users
- **Configuration-Based**: All changes happen via config files

## 🏗️ Architecture

### Brand Configuration Structure

```
/config/
├── brand-config.ts          # Active brand loader
├── brand-templates.ts       # All brand templates
└── deployment-scripts.ts    # Deployment helpers
```

### How It Works

1. **Environment Variable**: `NEXT_PUBLIC_BRAND_TYPE` determines active brand
2. **Template System**: Brand templates define all identity aspects
3. **Runtime Loading**: App loads the active brand configuration
4. **No Database**: Brand identity is code-level only

## 🔄 Creating a New Brand

### Step 1: Create Brand Template

Add your new brand to `/config/brand-templates.ts`:

```typescript
export const myRestaurantTemplate: BrandConfig = {
  siteName: "Dubai Fine Dining",
  siteNameAr: "مطاعم دبي الراقية",
  tagline: "Premium Dining Experiences", 
  taglineAr: "تجارب طعام مميزة",
  description: "Your guide to Dubai's finest restaurants",
  descriptionAr: "دليلك لأفضل مطاعم دبي",
  businessType: 'restaurant-guide',
  
  colors: {
    primary: "#D4AF37",    // Gold
    secondary: "#2C1810",   // Dark Brown
    accent: "#E8B86D",      // Light Gold
    background: "#FFFFFF",
    text: "#1F2937",
    muted: "#6B7280"
  },
  
  navigation: [
    { key: 'home', labelEn: 'Home', labelAr: 'الرئيسية', href: '/' },
    { key: 'restaurants', labelEn: 'Restaurants', labelAr: 'المطاعم', href: '/restaurants' },
    { key: 'reviews', labelEn: 'Reviews', labelAr: 'المراجعات', href: '/reviews' },
    { key: 'events', labelEn: 'Events', labelAr: 'الفعاليات', href: '/events' },
    { key: 'about', labelEn: 'About', labelAr: 'حولنا', href: '/about' },
  ],
  
  categories: [
    {
      slug: 'fine-dining',
      nameEn: 'Fine Dining',
      nameAr: 'الطعام الراقي',
      descriptionEn: 'Luxury dining experiences',
      descriptionAr: 'تجارب طعام فاخرة',
      icon: 'utensils'
    },
    {
      slug: 'casual-dining', 
      nameEn: 'Casual Dining',
      nameAr: 'طعام غير رسمي',
      descriptionEn: 'Relaxed dining atmosphere',
      descriptionAr: 'أجواء طعام مريحة',
      icon: 'coffee'
    }
  ],
  
  contact: {
    email: 'hello@dubaifinedining.com',
    social: {
      instagram: 'https://instagram.com/dubaifinedining'
    }
  },
  
  seo: {
    keywords: 'Dubai restaurants, fine dining, luxury food, UAE cuisine',
    author: 'Dubai Fine Dining Guide'
  },
  
  contentTypes: [
    {
      type: 'restaurant',
      nameEn: 'Restaurant',
      nameAr: 'مطعم',
      fields: ['name', 'cuisine', 'location', 'price_range', 'rating']
    }
  ]
};
```

### Step 2: Add Business Type

Update the `BusinessType` type in `/config/brand-templates.ts`:

```typescript
export type BusinessType = 'luxury-guide' | 'kids-retail' | 'real-estate' | 'restaurant-guide';
```

### Step 3: Export Template  

Add to the exports object:

```typescript
export const brandTemplates = {
  'luxury-guide': luxuryGuideTemplate,
  'kids-retail': kidsRetailTemplate,
  'real-estate': realEstateTemplate,
  'restaurant-guide': myRestaurantTemplate,
} as const;
```

## 🚀 Deploying a New Brand

### Method 1: Environment Variable (Recommended)

1. **Clone Repository**:
   ```bash
   git clone https://github.com/yourusername/yalla-london.git my-restaurant-site
   cd my-restaurant-site
   ```

2. **Set Environment Variable**:
   ```bash
   # In .env.local
   NEXT_PUBLIC_BRAND_TYPE=restaurant-guide
   ```

3. **Deploy**:
   ```bash
   yarn install
   yarn build
   # Deploy to your hosting platform
   ```

### Method 2: Code Modification

If you can't use environment variables, modify `/config/brand-config.ts`:

```typescript
// Change this line:
const ACTIVE_BRAND: BusinessType = 'restaurant-guide';
```

## 🎨 Customization Guide

### Visual Identity

**Colors**: Defined in the `colors` object
- `primary`: Main brand color
- `secondary`: Secondary accent color  
- `accent`: Highlights and CTAs
- `background`: Page background
- `text`: Main text color
- `muted`: Secondary text

**Logo & Assets**: Place brand assets in `/public/`
- `/public/logo.svg` - Main logo
- `/public/og-image.jpg` - Social media image
- `/public/favicon.ico` - Browser icon

### Navigation Structure

Define your site's navigation in the `navigation` array:

```typescript
navigation: [
  { 
    key: 'unique-key',           // Internal identifier
    labelEn: 'English Label',    // English display name
    labelAr: 'Arabic Label',     // Arabic display name  
    href: '/page-url'            // Page URL
  }
]
```

### Content Categories

Configure content organization:

```typescript
categories: [
  {
    slug: 'url-friendly-slug',       // Used in URLs
    nameEn: 'Display Name',          // English name
    nameAr: 'Arabic Name',           // Arabic name
    descriptionEn: 'Description',    // English description
    descriptionAr: 'Arabic Desc',    // Arabic description
    icon: 'lucide-icon-name'         // Icon identifier
  }
]
```

### SEO Configuration

```typescript
seo: {
  keywords: 'relevant, search, keywords',
  author: 'Your Brand Name',
  twitterHandle: '@yourbrand'        // Optional
}
```

## 🛠️ Development Workflow

### Local Development

```bash
# 1. Set your brand
echo "NEXT_PUBLIC_BRAND_TYPE=your-brand" > .env.local

# 2. Start development server  
yarn dev

# 3. Your brand loads automatically at http://localhost:3000
```

### Testing Brand Switch

```bash
# Test different brands quickly
NEXT_PUBLIC_BRAND_TYPE=luxury-guide yarn dev
NEXT_PUBLIC_BRAND_TYPE=restaurant-guide yarn dev
```

### Brand-Specific Content

Create content prompts for your brand in the content generation system:

```typescript
// In your brand template
contentPrompts: {
  blogPost: {
    en: "Write about luxury dining in Dubai...",
    ar: "اكتب عن تجارب الطعام الفاخر في دبي..."
  }
}
```

## 📦 Deployment Scenarios

### Single Brand Deployment

**Use Case**: Deploy one brand to one domain

```bash
# .env.production
NEXT_PUBLIC_BRAND_TYPE=restaurant-guide
NEXT_PUBLIC_SITE_URL=https://dubaifinedining.com
```

### Multi-Brand Infrastructure

**Use Case**: Same code, multiple deployments

```bash
# Site 1: Dubai Fine Dining
NEXT_PUBLIC_BRAND_TYPE=restaurant-guide
NEXT_PUBLIC_SITE_URL=https://dubaifinedining.com

# Site 2: London Kids Guide  
NEXT_PUBLIC_BRAND_TYPE=kids-retail
NEXT_PUBLIC_SITE_URL=https://londonkidsguide.com
```

## 🔧 Advanced Configuration

### Custom Components

Override components for specific brands:

```typescript
// In your component
import { useBrandConfig } from '@/hooks/use-brand-config';

export function CustomComponent() {
  const { config } = useBrandConfig();
  
  if (config.businessType === 'restaurant-guide') {
    return <RestaurantSpecificComponent />;
  }
  
  return <DefaultComponent />;
}
```

### Dynamic Styling

Use brand colors dynamically:

```typescript
import { useBrandConfig } from '@/hooks/use-brand-config';

export function BrandedButton() {
  const { colors } = useBrandConfig();
  
  return (
    <button 
      style={{ 
        backgroundColor: colors.primary,
        color: colors.background 
      }}
    >
      Brand Button
    </button>
  );
}
```

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Brand template created and tested
- [ ] Environment variables configured
- [ ] Assets (logo, images) uploaded to `/public/`
- [ ] Content categories defined
- [ ] Navigation structure tested
- [ ] SEO configuration complete
- [ ] API keys configured in admin panel

### Post-Deployment

- [ ] DNS configured
- [ ] SSL certificate active
- [ ] Google Analytics tracking
- [ ] Search Console connected
- [ ] Social media profiles linked
- [ ] Content generation tested
- [ ] Automation rules configured

## 🚨 Important Notes

### Security

- **No User Access**: Users cannot switch brands via UI
- **Code-Level Only**: Brand switching requires code deployment  
- **Environment Variables**: Secure brand configuration

### Maintenance

- **Shared Updates**: Core functionality updates affect all brands
- **Brand-Specific**: Only identity and content change per brand
- **Database**: Content is shared unless filtered by brand

### Performance

- **Single Build**: Each deployment contains only one brand
- **No Runtime Switching**: Brand is determined at build time
- **Optimized**: No unused brand data in production

## 🎯 Example Use Cases

### 1. Multi-City Restaurant Guides

```typescript
// Dubai Fine Dining
businessType: 'dubai-restaurants'
primaryColor: "#D4AF37"
siteName: "Dubai Fine Dining"

// London Restaurant Guide  
businessType: 'london-restaurants'
primaryColor: "#C41E3A" 
siteName: "London Eats"
```

### 2. Industry-Specific Guides

```typescript
// Luxury Hotels
businessType: 'luxury-hotels'
categories: ['5-star', 'boutique', 'resorts']

// Tech Startups Directory
businessType: 'tech-directory' 
categories: ['fintech', 'ai', 'blockchain']
```

### 3. Language/Culture Variations

```typescript
// Arabic-First Brand
navigation: [
  { key: 'home', labelEn: 'Home', labelAr: 'الرئيسية', href: '/' }
]
primaryLanguage: 'ar'

// English-Only Brand
navigation: [
  { key: 'home', labelEn: 'Home', labelAr: 'Home', href: '/' }  
]
primaryLanguage: 'en'
```

## 📞 Support & Help

If you need help with brand configuration:

1. **Check existing templates** in `/config/brand-templates.ts`
2. **Test locally** before deploying
3. **Verify environment variables** are set correctly  
4. **Ensure all required fields** are configured

---

**Remember**: This is a developer-only system. Users will only see one brand per deployment and have no way to switch brands via the interface.
