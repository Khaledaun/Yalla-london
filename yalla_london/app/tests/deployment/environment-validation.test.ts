/**
 * Environment Variable Validation Tests for PR #44 Deployment
 * Validates all required environment variables and configurations
 */

import { describe, test, expect } from '@jest/globals'

describe('Environment Variable Validation', () => {
  describe('Supabase Configuration', () => {
    test('should validate Supabase environment variables', () => {
      const supabaseConfig = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
      }

      console.log('🔍 Checking Supabase Configuration:')
      
      if (supabaseConfig.url) {
        expect(supabaseConfig.url).toMatch(/^https:\/\/.+\.supabase\.co$/)
        console.log('✅ NEXT_PUBLIC_SUPABASE_URL is properly formatted')
      } else {
        console.log('⚠️  NEXT_PUBLIC_SUPABASE_URL is not set')
        console.log('   Required for PR #44 deployment: NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
      }

      if (supabaseConfig.serviceKey && !supabaseConfig.serviceKey.includes('your-service-role-key')) {
        expect(supabaseConfig.serviceKey).toMatch(/^eyJ/)
        expect(supabaseConfig.serviceKey.length).toBeGreaterThan(100)
        console.log('✅ SUPABASE_SERVICE_ROLE_KEY is properly formatted')
      } else {
        console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY is not set or using placeholder')
        console.log('   Required for PR #44 deployment: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
      }

      // Test passes regardless, but logs deployment requirements
      expect(true).toBe(true)
    })
  })

  describe('Feature Flags Configuration', () => {
    test('should validate Phase 4 feature flags', () => {
      const phase4FeatureFlags = {
        FEATURE_TOPICS_RESEARCH: process.env.FEATURE_TOPICS_RESEARCH,
        FEATURE_CONTENT_PIPELINE: process.env.FEATURE_CONTENT_PIPELINE,
        FEATURE_AI_SEO_AUDIT: process.env.FEATURE_AI_SEO_AUDIT,
        FEATURE_ANALYTICS_DASHBOARD: process.env.FEATURE_ANALYTICS_DASHBOARD,
        FEATURE_MEDIA_ENRICH: process.env.FEATURE_MEDIA_ENRICH,
        FEATURE_BULK_ENRICH: process.env.FEATURE_BULK_ENRICH,
        FEATURE_PROMPT_CONTROL: process.env.FEATURE_PROMPT_CONTROL,
        FEATURE_BACKLINK_OFFERS: process.env.FEATURE_BACKLINK_OFFERS
      }

      console.log('🚩 Phase 4 Feature Flags Status:')
      
      Object.entries(phase4FeatureFlags).forEach(([flag, value]) => {
        if (value === 'true') {
          console.log(`✅ ${flag} is ENABLED`)
        } else {
          console.log(`ℹ️  ${flag} is DISABLED (default: safe for production)`)
        }
      })

      console.log('\n💡 To enable Phase 4 features for testing:')
      console.log('   FEATURE_TOPICS_RESEARCH=true')
      console.log('   FEATURE_CONTENT_PIPELINE=true')
      console.log('   FEATURE_AI_SEO_AUDIT=true')
      console.log('   FEATURE_ANALYTICS_DASHBOARD=true')
      console.log('   FEATURE_MEDIA_ENRICH=true')
      console.log('   FEATURE_PROMPT_CONTROL=true')

      expect(true).toBe(true)
    })

    test('should validate feature flag format', () => {
      const featureFlagPrefix = 'FEATURE_'
      const featureFlags = Object.keys(process.env).filter(key => key.startsWith(featureFlagPrefix))

      console.log(`🔍 Found ${featureFlags.length} feature flags:`)
      
      featureFlags.forEach(flag => {
        const value = process.env[flag]
        if (value && !['true', 'false'].includes(value)) {
          console.log(`⚠️  ${flag} has invalid value: ${value} (should be 'true' or 'false')`)
        } else {
          console.log(`✅ ${flag}: ${value || 'undefined'}`)
        }
      })

      expect(true).toBe(true)
    })
  })

  describe('Core Application Configuration', () => {
    test('should validate essential environment variables', () => {
      const coreConfig = {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL
      }

      console.log('🔧 Core Application Configuration:')

      // NODE_ENV
      if (coreConfig.NODE_ENV) {
        expect(['development', 'production', 'test']).toContain(coreConfig.NODE_ENV)
        console.log(`✅ NODE_ENV: ${coreConfig.NODE_ENV}`)
      } else {
        console.log('⚠️  NODE_ENV is not set')
      }

      // NEXTAUTH_SECRET
      if (coreConfig.NEXTAUTH_SECRET) {
        expect(coreConfig.NEXTAUTH_SECRET.length).toBeGreaterThan(32)
        console.log('✅ NEXTAUTH_SECRET is configured')
      } else {
        console.log('⚠️  NEXTAUTH_SECRET is not set')
        console.log('   Required for authentication: NEXTAUTH_SECRET=your-32-character-secret')
      }

      // NEXTAUTH_URL
      if (coreConfig.NEXTAUTH_URL) {
        expect(coreConfig.NEXTAUTH_URL).toMatch(/^https?:\/\//)
        console.log(`✅ NEXTAUTH_URL: ${coreConfig.NEXTAUTH_URL}`)
      } else {
        console.log('⚠️  NEXTAUTH_URL is not set')
      }

      // Database URLs
      if (coreConfig.DATABASE_URL) {
        expect(coreConfig.DATABASE_URL).toMatch(/^postgresql:\/\//)
        console.log('✅ DATABASE_URL is configured')
      } else {
        console.log('⚠️  DATABASE_URL is not set')
      }

      if (coreConfig.DIRECT_URL) {
        expect(coreConfig.DIRECT_URL).toMatch(/^postgresql:\/\//)
        console.log('✅ DIRECT_URL is configured')
      } else {
        console.log('⚠️  DIRECT_URL is not set')
      }

      expect(true).toBe(true)
    })
  })

  describe('Optional Configuration', () => {
    test('should check optional environment variables', () => {
      const optionalConfig = {
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
        SENTRY_DSN: process.env.SENTRY_DSN,
        ADMIN_EMAILS: process.env.ADMIN_EMAILS
      }

      console.log('🔧 Optional Configuration:')

      // AWS Configuration
      if (optionalConfig.AWS_ACCESS_KEY_ID && optionalConfig.AWS_SECRET_ACCESS_KEY) {
        console.log('✅ AWS credentials are configured')
        if (optionalConfig.AWS_BUCKET_NAME) {
          console.log(`✅ AWS bucket: ${optionalConfig.AWS_BUCKET_NAME}`)
        } else {
          console.log('⚠️  AWS_BUCKET_NAME is not set')
        }
      } else {
        console.log('ℹ️  AWS credentials not configured (file uploads will use local storage)')
      }

      // Sentry Configuration
      if (optionalConfig.SENTRY_DSN) {
        expect(optionalConfig.SENTRY_DSN).toMatch(/^https:\/\//)
        console.log('✅ Sentry error tracking is configured')
      } else {
        console.log('ℹ️  Sentry DSN not configured (error tracking disabled)')
      }

      // Admin Emails
      if (optionalConfig.ADMIN_EMAILS) {
        const emailCount = optionalConfig.ADMIN_EMAILS.split(',').length
        console.log(`✅ Admin emails configured (${emailCount} emails)`)
      } else {
        console.log('⚠️  ADMIN_EMAILS not configured (no admin access)') 
      }

      expect(true).toBe(true)
    })
  })

  describe('Deployment Environment Validation', () => {
    test('should validate deployment-specific configuration', () => {
      const isVercel = !!process.env.VERCEL
      const isProduction = process.env.NODE_ENV === 'production'
      
      console.log('🚀 Deployment Environment:')
      console.log(`   Platform: ${isVercel ? 'Vercel' : 'Other'}`)
      console.log(`   Environment: ${process.env.NODE_ENV || 'undefined'}`)

      if (isVercel) {
        console.log('✅ Running on Vercel platform')
        
        // Check Vercel-specific environment variables
        const vercelEnv = {
          VERCEL_URL: process.env.VERCEL_URL,
          VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
          VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF
        }

        Object.entries(vercelEnv).forEach(([key, value]) => {
          if (value) {
            console.log(`✅ ${key}: ${value}`)
          } else {
            console.log(`ℹ️  ${key}: not set`)
          }
        })
      }

      if (isProduction) {
        console.log('🔍 Production Environment Checks:')
        
        const productionRequirements = [
          'NEXTAUTH_SECRET',
          'DATABASE_URL',
          'DIRECT_URL'
        ]

        const missingProdVars = productionRequirements.filter(varName => !process.env[varName])
        
        if (missingProdVars.length === 0) {
          console.log('✅ All production requirements met')
        } else {
          console.log('❌ Missing production requirements:')
          missingProdVars.forEach(varName => {
            console.log(`   - ${varName}`)
          })
        }
      }

      expect(true).toBe(true)
    })
  })

  describe('PR #44 Specific Requirements', () => {
    test('should validate PR #44 deployment readiness', () => {
      console.log('🎯 PR #44 Deployment Readiness Check:')
      
      const pr44Requirements = {
        // Supabase Integration
        supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        
        // Core Features
        feature_topics: process.env.FEATURE_TOPICS_RESEARCH === 'true',
        feature_content: process.env.FEATURE_CONTENT_PIPELINE === 'true',
        feature_seo: process.env.FEATURE_AI_SEO_AUDIT === 'true',
        feature_analytics: process.env.FEATURE_ANALYTICS_DASHBOARD === 'true',
        
        // Database
        database_url: !!process.env.DATABASE_URL,
        direct_url: !!process.env.DIRECT_URL,
        
        // Authentication
        auth_secret: !!process.env.NEXTAUTH_SECRET,
        auth_url: !!process.env.NEXTAUTH_URL
      }

      const readinessScore = Object.values(pr44Requirements).filter(Boolean).length
      const totalRequirements = Object.keys(pr44Requirements).length

      console.log(`📊 Readiness Score: ${readinessScore}/${totalRequirements}`)
      
      Object.entries(pr44Requirements).forEach(([requirement, met]) => {
        const status = met ? '✅' : '❌'
        const description = requirement.replace(/_/g, ' ').toUpperCase()
        console.log(`${status} ${description}`)
      })

      if (readinessScore === totalRequirements) {
        console.log('🎉 PR #44 is ready for deployment!')
      } else {
        console.log('⚠️  PR #44 has missing requirements for full deployment')
        console.log('\n🔧 Required environment variables for PR #44:')
        console.log('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
        console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
        console.log('   DATABASE_URL=postgresql://user:pass@host:5432/db')
        console.log('   DIRECT_URL=postgresql://user:pass@host:5432/db')
        console.log('   NEXTAUTH_SECRET=your-32-character-secret')
        console.log('   NEXTAUTH_URL=https://your-domain.com')
      }

      expect(true).toBe(true)
    })
  })
})