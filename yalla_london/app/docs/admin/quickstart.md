# Admin Quickstart Guide

## Initial Admin Access

### Default Credentials
- **Username:** `admin`
- **Email:** `admin@yallalondon.com`
- **Password:** `YallaLondon24!`

⚠️ **IMPORTANT:** You must change this password on your first login for security.

### Accessing the Admin Interface

1. Navigate to `/admin` on your site
2. Log in with the credentials above
3. Follow the password change prompt
4. Explore the admin dashboard

## Premium Backend Features

The Yalla London admin interface includes comprehensive premium backend features:

### Information Architecture
- **Dashboard:** Site overview with key metrics and quick actions
- **Content:** Manage articles, media, SEO, and review queue
- **Design:** Customize theme, logo, and homepage builder
- **People:** Manage team members, roles, and access logs
- **Integrations:** API keys, analytics, AI models, and affiliates
- **Automations:** Background jobs, system status, and notifications
- **Settings:** Site configuration, languages, and feature flags

### Key Features

#### Feature Flags System
All features are controlled by environment variables:
- `FEATURE_PREMIUM_BACKEND=true` - Master toggle for all premium features
- `FEATURE_ADMIN_DASHBOARD=true` - Enable the admin dashboard
- `FEATURE_CONTENT_MANAGEMENT=true` - Enable content management features
- `FEATURE_DESIGN_TOOLS=true` - Enable design and theming tools

#### Enhanced Authentication
- **Initial Admin:** Automatic setup with forced password change
- **Google SSO:** Configure with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- **Magic Links:** Secure user invitations
- **RBAC:** Role-based access control (admin/editor/reviewer/viewer)

#### Core Design Principles
- **Optimistic Updates:** Instant UI feedback with toast notifications
- **Instant Undo:** Server-side reversible operations (⌘Z)
- **Keyboard Shortcuts:** Command palette (⌘K) and navigation
- **State Transparency:** Clear status indicators (Draft/Published/Review)
- **Live Previews:** Real-time preview for themes and content

### Google Authentication Setup

To enable Google SSO, you need to:

1. **Google Cloud Console Setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google+ API
   - Go to Credentials → Create Credentials → OAuth 2.0 Client IDs

2. **Configure OAuth:**
   - Set up the consent screen
   - Add authorized redirect URIs:
     - `https://yourdomain.com/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google` (for development)

3. **Environment Variables:**
   ```bash
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   NEXTAUTH_URL=https://yourdomain.com
   NEXTAUTH_SECRET=your_random_secret_here
   FEATURE_ENHANCED_AUTH=true
   ```

4. **Generate NextAuth Secret:**
   ```bash
   openssl rand -base64 32
   ```

## Site Scoping

All premium features are scoped by site ID for multi-tenant support:
- Each site has its own settings and configurations
- Users can be assigned different roles per site
- Global admins can switch between sites via the top bar dropdown

## Health Monitoring

The system includes comprehensive health monitoring:
- **Status Endpoint:** `/api/phase4/status`
- **Database Connectivity:** Real-time connection status
- **Feature Flag Status:** All flags and their current state
- **System Metrics:** Memory usage, uptime, and performance
- **Background Jobs:** Job queue status and execution history

## Security Features

### Data Protection
- **AES-256-GCM Encryption:** For sensitive API keys and secrets
- **Field Masking:** Sensitive data is masked in the UI
- **Re-authentication:** Required for viewing sensitive information
- **Audit Logging:** Comprehensive activity tracking

### Access Control
- **Policy Guards:** `can(siteId, actor, 'content.update')` throughout the system
- **Session Management:** Secure session handling with expiration
- **IP Tracking:** Login attempts and access patterns
- **Permission Validation:** Real-time permission checking

## Background Jobs & Observability

### Job Management
- **Background Jobs:** Automated content processing and maintenance
- **Cron Scheduling:** Flexible job scheduling with monitoring
- **Retry Logic:** Automatic retry with exponential backoff
- **Manual Triggers:** Admin-triggered job execution

### Monitoring
- **Structured Logs:** Comprehensive logging with trace IDs
- **Metrics Charts:** Performance and usage visualization
- **Error Tracking:** Automatic error detection and alerting
- **Performance Monitoring:** Response times and system health

## Troubleshooting

### Common Issues

1. **"Premium Backend Not Enabled" Error:**
   - Ensure `FEATURE_PREMIUM_BACKEND=true` is set
   - Restart the application after changing environment variables

2. **Database Connection Errors:**
   - Check `DATABASE_URL` and `DIRECT_URL` environment variables
   - Verify database server is running and accessible

3. **Feature Not Available:**
   - Check the specific feature flag in Settings → Feature Flags
   - Review environment variable configuration

4. **Authentication Issues:**
   - Verify `NEXTAUTH_SECRET` is set
   - Check Google OAuth configuration if using SSO
   - Ensure callback URLs are correctly configured

### Getting Help

1. **Health Check:** Visit `/api/phase4/status` for system status
2. **Feature Flags:** Go to Settings → Feature Flags to see what's enabled
3. **Logs:** Check the application logs for detailed error information
4. **Documentation:** Visit Help → Documentation in the admin interface

## Next Steps

After initial setup:

1. **Customize Your Site:**
   - Upload your logo and configure branding
   - Set up your homepage using the visual builder
   - Configure your preferred theme

2. **Set Up Integrations:**
   - Connect Google Analytics and Search Console
   - Configure AI models for content generation
   - Set up affiliate partnerships

3. **Invite Team Members:**
   - Use the People → Members section to invite users
   - Assign appropriate roles based on responsibilities
   - Set up access controls and permissions

4. **Content Strategy:**
   - Configure content review workflows
   - Set up automated content generation
   - Implement SEO optimization rules

For more detailed guides, visit the Help section in the admin interface or check the `/docs` directory.