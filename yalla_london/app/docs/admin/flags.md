# Feature Flags Documentation

## Overview

The Yalla London premium backend uses a comprehensive feature flag system to enable/disable functionality safely in production. All features are controlled by environment variables and can be toggled without code changes.

## Master Toggle

```bash
FEATURE_PREMIUM_BACKEND=true
```

This is the master toggle that must be enabled for any premium backend features to work. All other feature flags depend on this being `true`.

## Core Categories

### Information Architecture
Enable stable left navigation and admin sections:

```bash
FEATURE_STABLE_LEFT_NAV=true        # Comprehensive admin navigation
FEATURE_ADMIN_DASHBOARD=true        # Dashboard with metrics and quick actions
FEATURE_CONTENT_MANAGEMENT=true     # Articles, media, SEO, review queue
FEATURE_DESIGN_TOOLS=true           # Theme, logo, homepage builder
FEATURE_PEOPLE_MANAGEMENT=true      # Members, roles, access logs
FEATURE_INTEGRATIONS=true           # API keys, analytics, LLMs, affiliates
FEATURE_AUTOMATIONS=true            # Jobs, status, cron, notifications
FEATURE_AFFILIATE_HUB=true          # Affiliate management and revenue tracking
FEATURE_SETTINGS_MANAGEMENT=true    # Site settings, languages, feature flags
```

### Core Design Principles
Enable modern UX patterns:

```bash
FEATURE_OPTIMISTIC_UPDATES=true     # Toast notifications and instant feedback
FEATURE_INSTANT_UNDO=true           # Server-side reversible operations (⌘Z)
FEATURE_KEYBOARD_SHORTCUTS=true     # Command palette (⌘K) and shortcuts
FEATURE_LIVE_PREVIEWS=true          # Real-time preview for themes/content
FEATURE_STATE_TRANSPARENCY=true     # Status chips (Draft/Published/Error)
```

### Security & Authentication
Enhance security and user management:

```bash
FEATURE_ENHANCED_AUTH=true          # Google SSO and magic links
FEATURE_RBAC_PREMIUM=true           # Premium role-based access control
FEATURE_SECRET_ENCRYPTION=true      # AES-256-GCM for sensitive data
FEATURE_FIELD_MASKING=true          # Mask sensitive fields in UI
```

### Content & Trust
Enable AI-powered content workflows:

```bash
FEATURE_REVIEW_QUEUE=true           # AI content gating by score
FEATURE_TRUST_WORKFLOWS=true        # Fix/approve/reject flows
```

### Observability & Jobs
Monitor system health and background processes:

```bash
FEATURE_JOB_MONITORING=true         # Background job management
FEATURE_STRUCTURED_LOGS=true        # Enhanced logging with trace IDs
```

### Performance & Developer Experience
Optimize for performance and development:

```bash
FEATURE_SERVER_COMPONENTS=true      # Server-side rendering for admin
FEATURE_SUSPENSE_LOADING=true       # Loading states with skeletons
```

### Internationalization & Accessibility
Support global audiences:

```bash
FEATURE_PER_SITE_LOCALES=true       # Site-specific language settings
FEATURE_ACCESSIBILITY_ENHANCED=true # Enhanced keyboard navigation
```

## Per-Site Feature Flags

Some features can be enabled/disabled per site:

- `ADMIN_DASHBOARD` - Site-specific dashboard customization
- `CONTENT_MANAGEMENT` - Per-site content policies
- `DESIGN_TOOLS` - Site-specific theming
- `PEOPLE_MANAGEMENT` - Site-specific team management
- `INTEGRATIONS` - Per-site integration settings
- `AUTOMATIONS` - Site-specific automation rules

## Environment Setup

### Development
For local development, enable all features:

```bash
# .env.local
FEATURE_PREMIUM_BACKEND=true
FEATURE_STABLE_LEFT_NAV=true
FEATURE_ADMIN_DASHBOARD=true
FEATURE_CONTENT_MANAGEMENT=true
FEATURE_DESIGN_TOOLS=true
FEATURE_PEOPLE_MANAGEMENT=true
FEATURE_INTEGRATIONS=true
FEATURE_AUTOMATIONS=true
FEATURE_AFFILIATE_HUB=true
FEATURE_SETTINGS_MANAGEMENT=true
FEATURE_OPTIMISTIC_UPDATES=true
FEATURE_INSTANT_UNDO=true
FEATURE_KEYBOARD_SHORTCUTS=true
FEATURE_LIVE_PREVIEWS=true
FEATURE_STATE_TRANSPARENCY=true
FEATURE_ENHANCED_AUTH=true
FEATURE_RBAC_PREMIUM=true
FEATURE_SECRET_ENCRYPTION=true
FEATURE_FIELD_MASKING=true
FEATURE_REVIEW_QUEUE=true
FEATURE_TRUST_WORKFLOWS=true
FEATURE_JOB_MONITORING=true
FEATURE_STRUCTURED_LOGS=true
FEATURE_SERVER_COMPONENTS=true
FEATURE_SUSPENSE_LOADING=true
FEATURE_PER_SITE_LOCALES=true
FEATURE_ACCESSIBILITY_ENHANCED=true
```

### Staging
Enable core features for testing:

```bash
# Core features only
FEATURE_PREMIUM_BACKEND=true
FEATURE_STABLE_LEFT_NAV=true
FEATURE_ADMIN_DASHBOARD=true
FEATURE_CONTENT_MANAGEMENT=true
FEATURE_SETTINGS_MANAGEMENT=true
FEATURE_OPTIMISTIC_UPDATES=true
FEATURE_STATE_TRANSPARENCY=true
```

### Production
Gradual rollout strategy:

```bash
# Phase 1: Core admin functionality
FEATURE_PREMIUM_BACKEND=true
FEATURE_STABLE_LEFT_NAV=true
FEATURE_ADMIN_DASHBOARD=true
FEATURE_SETTINGS_MANAGEMENT=true

# Phase 2: Add content management
FEATURE_CONTENT_MANAGEMENT=true
FEATURE_STATE_TRANSPARENCY=true

# Phase 3: Enhanced UX
FEATURE_OPTIMISTIC_UPDATES=true
FEATURE_KEYBOARD_SHORTCUTS=true

# Phase 4: Advanced features
FEATURE_DESIGN_TOOLS=true
FEATURE_PEOPLE_MANAGEMENT=true
FEATURE_INTEGRATIONS=true

# Phase 5: Full premium suite
FEATURE_AUTOMATIONS=true
FEATURE_AFFILIATE_HUB=true
FEATURE_ENHANCED_AUTH=true
FEATURE_REVIEW_QUEUE=true
```

## Checking Feature Status

### Via API
```bash
curl /api/phase4/status
```

### Via Admin Interface
Navigate to **Settings → Feature Flags** to see all flags and their status.

### Via Code
```typescript
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'

if (isPremiumFeatureEnabled('ADMIN_DASHBOARD')) {
  // Feature is enabled
}
```

## Feature Flag Architecture

### Global vs Site-Scoped
- **Global flags:** Apply to the entire application
- **Site-scoped flags:** Can be overridden per site

### Validation System
```typescript
const access = validatePremiumFeatureAccess('CONTENT_MANAGEMENT', siteId)
if (access.allowed) {
  // User can access feature
} else {
  // Show disabled state with reason and enable link
  console.log(access.reason)
  console.log(access.enableLink)
}
```

### Safe Defaults
All feature flags default to `false` (disabled) for safe deployments:
- New features won't break existing functionality
- Gradual rollout is enforced
- Quick rollback by removing environment variable

## Troubleshooting

### Feature Not Showing
1. Check master toggle: `FEATURE_PREMIUM_BACKEND=true`
2. Verify specific feature flag is set
3. Restart application after environment changes
4. Check site-specific overrides

### Performance Issues
Some features may impact performance:
- `FEATURE_LIVE_PREVIEWS` - Adds real-time preview generation
- `FEATURE_STRUCTURED_LOGS` - Increases logging overhead
- `FEATURE_JOB_MONITORING` - Adds database queries for job status

### Security Considerations
Sensitive features require additional configuration:
- `FEATURE_SECRET_ENCRYPTION` - Requires encryption keys
- `FEATURE_ENHANCED_AUTH` - Requires OAuth setup
- `FEATURE_FIELD_MASKING` - Requires re-auth configuration

## Best Practices

### Deployment Strategy
1. **Test in staging** with feature flags enabled
2. **Gradual production rollout** by enabling flags incrementally
3. **Monitor system health** via `/api/phase4/status`
4. **Quick rollback** by disabling problematic flags

### Development Workflow
1. **Feature branches** should include flag checks
2. **Local development** with all flags enabled
3. **Code reviews** should verify flag usage
4. **Testing** both enabled and disabled states

### Documentation
1. **Update this document** when adding new flags
2. **Include flag dependencies** in feature documentation
3. **Document rollback procedures** for each feature
4. **Maintain environment examples** for different stages

## Legacy Integration

The premium backend works alongside existing Phase 4B features:
- Legacy flags continue to work
- New premium flags are additive
- Gradual migration path available
- Both systems monitored via status endpoint

For more information, see the [Admin Quickstart Guide](./quickstart.md) and [Operations Rollback Guide](../ops/rollbacks.md).