
# 🎨 Multi-Brand Platform System

This project has been transformed into a **multi-brand platform** that can be easily duplicated for different business types. Change the entire website's branding, colors, content structure, and navigation with a single command!

## 🚀 Quick Start

### Switch Between Existing Brands

```bash
# Switch to Kids Clothing brand
node scripts/switch-brand.js kids-retail

# Switch to Real Estate brand  
node scripts/switch-brand.js real-estate

# Switch back to Luxury Guide (original)
node scripts/switch-brand.js luxury-guide
```

### Create New Brand Template

```bash
# Interactive brand creation wizard
node scripts/create-new-brand.js
```

## 🏷️ Available Brand Templates

| Brand Type | Site Name | Description | Colors |
|------------|-----------|-------------|--------|
| `luxury-guide` | Yalla London | Luxury London Guide | Purple & Yellow |
| `kids-retail` | Little Stars Fashion | Kids Clothing Guide | Pink & Teal |
| `real-estate` | Prime Properties Guide | Real Estate Insights | Blue & Green |

## 🎯 What Changes Automatically

When you switch brands, the following elements update automatically:

### ✅ Brand Identity
- Site name and tagline
- Color scheme (primary, secondary, accent)
- Logo and branding elements
- Meta descriptions and SEO

### ✅ Navigation & Structure
- Navigation menu items and labels
- Content categories
- Page layouts and sections

### ✅ Content Types
- Database schema remains the same
- Content presentation adapts to business type
- Category names and descriptions change

### ✅ Contact & Social
- Contact information
- Social media links
- Email addresses

## 🛠️ Technical Implementation

### Configuration System
- **`/config/brand-templates.ts`** - All brand templates
- **`/config/brand-config.ts`** - Active brand logic
- **`/hooks/use-brand-config.ts`** - React hooks for components

### Theming System
- **CSS Custom Properties** for dynamic colors
- **Brand-specific classes** in global CSS
- **Component-level theming** with style props

### Content Management
- **Dynamic navigation** based on brand config
- **Category mapping** for different business types
- **Multilingual support** for all brands

## 🎨 Customization Guide

### Add New Brand Template

1. **Edit `/config/brand-templates.ts`**:
```typescript
export const myRestaurantTemplate: BrandConfig = {
  siteName: "Foodie Paradise",
  tagline: "Best Restaurant Guide",
  colors: {
    primary: "#DC2626", // Red
    secondary: "#F59E0B", // Orange
    // ...
  },
  // ... rest of configuration
};
```

2. **Add to exports**:
```typescript
export const brandTemplates = {
  // ... existing templates
  'restaurant-guide': myRestaurantTemplate,
};
```

3. **Switch to new brand**:
```bash
node scripts/switch-brand.js restaurant-guide
```

### Customize Colors

Update colors in the brand template:
```typescript
colors: {
  primary: "#your-color",    // Main brand color
  secondary: "#your-color",  // Secondary brand color  
  accent: "#your-color",     // Accent color
}
```

### Modify Navigation

Update navigation structure:
```typescript
navigation: [
  { key: 'home', labelEn: 'Home', labelAr: 'الرئيسية', href: '/' },
  { key: 'products', labelEn: 'Products', labelAr: 'المنتجات', href: '/products' },
  // ... more nav items
]
```

## 🚀 Deployment

### Single Brand Deployment
```bash
# Set brand type and build
NEXT_PUBLIC_BRAND_TYPE=kids-retail npm run build

# Deploy to Vercel
vercel --prod
```

### Multiple Brand Deployment
```bash
# Deploy different brands to different domains
NEXT_PUBLIC_BRAND_TYPE=kids-retail vercel --prod --scope kids-domain.com
NEXT_PUBLIC_BRAND_TYPE=real-estate vercel --prod --scope realestate-domain.com
```

## 🌐 Live Demo

Visit `/brand-showcase` to see all brand templates and switch between them interactively.

## 📁 File Structure

```
/config/
  ├── brand-templates.ts      # All brand configurations
  ├── brand-config.ts         # Active brand logic
  └── deployment-scripts.ts   # Deployment utilities

/scripts/
  ├── switch-brand.js         # CLI brand switcher
  └── create-new-brand.js     # New brand creation wizard

/hooks/
  └── use-brand-config.ts     # React hooks for brand data

/components/
  ├── brand-theme-provider.tsx # Dynamic theme injection
  ├── dynamic-header.tsx       # Brand-aware header
  └── brand-showcase.tsx       # Demo component
```

## 🎯 Use Cases

This platform is perfect for:

- **Agencies** creating similar sites for different clients
- **Entrepreneurs** launching multiple niche sites
- **Franchises** with consistent structure but different branding
- **Portfolio projects** showcasing different business types

## ✨ Features

- 🎨 **One-command brand switching**
- 🌍 **Multi-language support**
- 📱 **Responsive design system**
- 🔍 **SEO optimization**
- 🎯 **Content management**
- 🚀 **Easy deployment**

---

Transform your business idea into a professional website in minutes! 🚀
