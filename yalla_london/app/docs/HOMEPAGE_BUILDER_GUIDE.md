# Homepage Builder Documentation

## Overview

The Homepage Builder is a comprehensive visual editor that allows administrators to create, customize, and manage their site's homepage through an intuitive drag-and-drop interface. The builder includes real-time preview, multi-device responsiveness, and advanced customization options.

## Getting Started

### Accessing the Homepage Builder

1. **Navigate to Admin Dashboard**: Go to `/admin/dashboard`
2. **Access Design Tools**: Click on "Design" in the left navigation
3. **Open Homepage Builder**: Select "Homepage Builder" from the design menu

The Homepage Builder is automatically available to all admin users with no feature flag restrictions.

## Interface Overview

### Main Components

1. **Header Bar**: Contains page title, save status, device preview controls, and publishing options
2. **Left Sidebar**: Module library, page structure, and design tools
3. **Main Preview Area**: Live preview of your homepage with real-time updates
4. **Publishing Panel**: Draft/Publish workflow controls

### Device Preview Modes

- **Desktop**: Full-width layout preview (1200px+)
- **Tablet**: Medium screen preview (768px-1199px)
- **Mobile**: Small screen preview (375px-767px)

## Module System

### Available Modules

#### 1. Hero Section
- **Purpose**: Main banner area with headline, subheading, and call-to-action
- **Features**:
  - Background: Image, video, or gradient
  - Text positioning: Left, center, or right alignment
  - Dual CTA buttons with customizable text and URLs
  - Overlay controls with opacity adjustment
  - Multi-language content support

#### 2. Featured Deals
- **Purpose**: Showcase special offers and promotional content
- **Features**:
  - Grid, list, or carousel layout options
  - Price display toggle
  - Deal badges and discount percentages
  - Location and rating information
  - Customizable item limit

#### 3. Article Grid
- **Purpose**: Display latest blog posts and articles
- **Features**:
  - Grid or list layout
  - Excerpt display toggle
  - Author and publication date
  - Category badges
  - Read time estimates

#### 4. Location Map
- **Purpose**: Interactive map showing business location
- **Features**:
  - Customizable coordinates and zoom level
  - Marker visibility toggle
  - Contact information display
  - Directions and phone call integration

#### 5. Social Media
- **Purpose**: Social media integration and follow buttons
- **Features**:
  - Platform selection (Instagram, Twitter, Facebook)
  - Social feed display option
  - Custom styling and colors
  - External link integration

#### 6. Newsletter Signup
- **Purpose**: Email subscription collection
- **Features**:
  - Customizable headline and subtitle
  - Placeholder text configuration
  - Button text customization
  - Privacy notice inclusion

#### 7. Affiliate Links
- **Purpose**: Partner logos and affiliate product showcase
- **Features**:
  - Grid or carousel layout
  - Logo display toggle
  - Partner ratings and offers
  - Category organization

## Customization Options

### Theme Controls

#### Colors
- **Primary Color**: Main brand color used for buttons and accents
- **Secondary Color**: Supporting brand color for highlights
- **Custom Color Picker**: Direct color input or hex code entry
- **Preset Themes**: Quick-apply color combinations

#### Typography
- **Font Family**: Choose from 8 professional font options
- **Font Categories**: Sans-serif, serif, and display fonts
- **Live Preview**: See font changes immediately in preview

#### Layout Styles
- **Full Width**: Content stretches across entire screen
- **Contained**: Content centered with maximum width constraints
- **Split Layout**: Distinct left/right content sections

### Advanced Features

#### Pop-Up Deal Editor
Comprehensive popup/modal builder with:

- **Content Management**: Headlines, descriptions, and CTAs
- **Trigger Options**:
  - Time delay (1-30 seconds)
  - Scroll percentage (10-100%)
  - Exit intent detection
  - Manual trigger events
- **Frequency Control**:
  - Once per user (cookie-based)
  - Once per day
  - Once per session
  - Every visit (testing mode)
- **Design Options**:
  - Position: Center, corners, or bottom banner
  - Animation: Fade, slide, scale, or bounce
  - Background: Color, gradient, or image
- **Behavior Settings**:
  - Dismissible toggle
  - Auto-close with timer
  - Countdown timer integration
- **Analytics Integration**:
  - GA4 event tracking
  - Conversion tracking
  - Performance metrics

## Workflow Guide

### Creating a New Homepage

1. **Start with Hero Section**:
   - Add a hero module from the library
   - Upload background image or configure gradient
   - Write compelling headline and subheading
   - Set up primary and secondary CTAs

2. **Add Content Modules**:
   - Drag modules from library to page structure
   - Arrange modules using drag-and-drop reordering
   - Configure each module's content and settings

3. **Customize Appearance**:
   - Select color scheme from presets or create custom
   - Choose appropriate font family
   - Set layout style based on content needs

4. **Configure Pop-ups** (Optional):
   - Enable pop-up deals if desired
   - Set appropriate triggers and frequency
   - Design popup content and appearance

5. **Preview and Test**:
   - Switch between device preview modes
   - Test all interactive elements
   - Verify content layout on different screen sizes

6. **Publish**:
   - Save draft for review
   - Use "Publish Live" when ready to go live

### Editing Existing Homepage

1. **Access Current Configuration**:
   - Existing modules load automatically
   - Current theme settings are preserved
   - Draft/published status is displayed

2. **Make Changes**:
   - Edit individual modules in-place
   - Reorder modules with drag-and-drop
   - Update theme and appearance settings
   - Modify or add popup configurations

3. **Review Changes**:
   - Use live preview to see updates
   - Test on different device sizes
   - Verify all links and functionality

4. **Update Live Site**:
   - Save draft to preserve work
   - Publish when changes are complete

## Technical Features

### Real-Time Preview
- **Instant Updates**: Changes appear immediately in preview
- **Device Responsive**: Accurate representation across screen sizes
- **Interactive Elements**: Functional buttons and links in preview

### State Management
- **Auto-Save**: Drafts saved automatically every 2 seconds
- **Undo/Redo**: Full history tracking with 10-step memory
- **Version Control**: Draft vs. published state management

### Data Persistence
- **Site-Scoped Storage**: Each site has independent homepage configuration
- **JSON Structure**: Homepage stored as structured JSON in database
- **Backup System**: Previous versions preserved during updates

### Security
- **Admin Authentication**: Requires admin role for access
- **RBAC Integration**: Role-based access control validation
- **Audit Logging**: All publish actions tracked in system logs

## Best Practices

### Content Strategy
1. **Hero Section**: Use high-quality images and clear, action-oriented headlines
2. **Module Order**: Place most important content above the fold
3. **Call-to-Actions**: Limit to 1-2 primary actions per page
4. **Content Length**: Keep descriptions concise and scannable

### Design Guidelines
1. **Color Consistency**: Use theme colors throughout all modules
2. **Typography Hierarchy**: Maintain consistent font usage
3. **White Space**: Allow breathing room between modules
4. **Mobile-First**: Always preview and optimize for mobile devices

### Performance Optimization
1. **Image Optimization**: Use appropriately sized images (recommended: 1920x1080 for hero)
2. **Module Limit**: Avoid excessive modules that slow page load
3. **Video Background**: Use sparingly and provide image fallbacks

### Accessibility
1. **Alt Text**: Provide descriptive alt text for all images
2. **Color Contrast**: Ensure sufficient contrast for text readability
3. **Navigation**: Maintain logical tab order and keyboard navigation

## Troubleshooting

### Common Issues

**Changes Not Saving**
- Check internet connection
- Verify admin permissions
- Clear browser cache and retry

**Preview Not Updating**
- Refresh browser page
- Check for JavaScript errors in console
- Verify all required fields are completed

**Modules Not Displaying**
- Ensure modules are enabled in settings
- Check module content for required fields
- Verify theme compatibility

**Mobile Layout Issues**
- Test in actual mobile devices
- Check responsive design settings
- Adjust content length for smaller screens

### Support
For technical issues or feature requests, contact the development team through the admin dashboard help section.

## API Integration

### Endpoints
- `POST /api/admin/homepage/save-draft`: Save draft configuration
- `POST /api/admin/homepage/publish`: Publish homepage live

### Data Structure
Homepage configurations are stored as JSON with the following structure:
```json
{
  "modules": [...],
  "theme": {...},
  "popup": {...},
  "meta": {
    "draft": boolean,
    "lastModified": date,
    "publishedAt": date
  }
}
```

### Site Scoping
All homepage configurations are automatically scoped to the current site context, ensuring proper tenant isolation in multi-site environments.