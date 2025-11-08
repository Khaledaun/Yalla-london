#!/usr/bin/env tsx
/**
 * Vercel Cron Jobs Setup Script
 * Creates cron jobs for Phase-4 content automation
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CronJob {
  name: string
  schedule: string
  endpoint: string
  description: string
  feature_flag?: string
  enabled: boolean
}

const PHASE4_CRON_JOBS: CronJob[] = [
  {
    name: 'weekly-topic-generation',
    schedule: '0 9 * * 1', // Monday 9 AM
    endpoint: '/api/cron/generate-topics',
    description: 'Generate new topic proposals for the week',
    feature_flag: 'FEATURE_TOPICS_RESEARCH',
    enabled: true
  },
  {
    name: 'daily-backlog-topup',
    schedule: '0 10 * * *', // Daily 10 AM
    endpoint: '/api/cron/topup-backlog',
    description: 'Top up content backlog with additional topics',
    feature_flag: 'FEATURE_CONTENT_PIPELINE',
    enabled: true
  },
  {
    name: 'hourly-publish',
    schedule: '0 * * * *', // Every hour
    endpoint: '/api/cron/publish-scheduled',
    description: 'Publish scheduled content and update sitemaps',
    feature_flag: 'FEATURE_CONTENT_PIPELINE',
    enabled: true
  },
  {
    name: 'nightly-seo-audit',
    schedule: '0 2 * * *', // Daily 2 AM
    endpoint: '/api/cron/seo-audit',
    description: 'Run comprehensive SEO audit and generate reports',
    feature_flag: 'FEATURE_AI_SEO_AUDIT',
    enabled: true
  },
  {
    name: 'daily-analytics-refresh',
    schedule: '0 6 * * *', // Daily 6 AM
    endpoint: '/api/cron/refresh-analytics',
    description: 'Refresh analytics data from Google Analytics and Search Console',
    feature_flag: 'FEATURE_ANALYTICS_DASHBOARD',
    enabled: true
  },
  {
    name: 'media-enrichment-on-upload',
    schedule: '*/15 * * * *', // Every 15 minutes
    endpoint: '/api/cron/process-media',
    description: 'Process uploaded media files for enrichment',
    feature_flag: 'FEATURE_MEDIA_ENRICH',
    enabled: true
  },
  {
    name: 'daily-backup',
    schedule: '0 3 * * *', // Daily 3 AM
    endpoint: '/api/cron/backup-database',
    description: 'Create daily database backup',
    enabled: true
  },
  {
    name: 'weekly-sitemap-update',
    schedule: '0 8 * * 0', // Sunday 8 AM
    endpoint: '/api/cron/update-sitemap',
    description: 'Update and submit sitemap to search engines',
    enabled: true
  }
]

async function createCronEndpoints() {
  console.log('🕒 Creating Phase-4 cron job endpoints...')

  for (const job of PHASE4_CRON_JOBS) {
    console.log(`📝 Creating endpoint: ${job.endpoint}`)
    
    // Create API endpoint file
    const endpointPath = `app/api/cron/${job.name.replace('_', '-')}/route.ts`
    const endpointContent = generateCronEndpoint(job)
    
    try {
      // In a real implementation, you would write this to the filesystem
      console.log(`✅ Endpoint template ready for: ${endpointPath}`)
      console.log(`   Schedule: ${job.schedule}`)
      console.log(`   Description: ${job.description}`)
      
      // Store cron job configuration in database
      await storeCronJobConfig(job)
      
    } catch (error) {
      console.error(`❌ Failed to create endpoint ${job.endpoint}:`, error)
    }
  }
}

function generateCronEndpoint(job: CronJob): string {
  return `import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
${job.feature_flag ? `import { isPremiumFeatureEnabled } from '@/lib/feature-flags'` : ''}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * ${job.description}
 * Schedule: ${job.schedule}
 * ${job.endpoint}
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

${job.feature_flag ? `
    // Check feature flag
    if (!isPremiumFeatureEnabled('${job.feature_flag}')) {
      return NextResponse.json({
        success: true,
        message: 'Feature disabled, skipping job execution'
      })
    }
` : ''}

    console.log('🕒 Starting cron job: ${job.name}')
    
    // Log job execution
    const jobLog = {
      job_name: '${job.name}',
      started_at: new Date().toISOString(),
      status: 'running'
    }

    const { data: logEntry } = await supabase
      .from('cron_job_log')
      .insert([jobLog])
      .select()
      .single()

    try {
      // Execute job logic
      const result = await execute${job.name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('')}Job()

      // Update job log with success
      if (logEntry) {
        await supabase
          .from('cron_job_log')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: result,
            duration: Date.now() - new Date(jobLog.started_at).getTime()
          })
          .eq('id', logEntry.id)
      }

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Job completed successfully'
      })

    } catch (error) {
      console.error('Cron job error:', error)
      
      // Update job log with error
      if (logEntry) {
        await supabase
          .from('cron_job_log')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - new Date(jobLog.started_at).getTime()
          })
          .eq('id', logEntry.id)
      }

      return NextResponse.json(
        { error: 'Job execution failed' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Cron job setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function execute${job.name.split('-').map(word => 
  word.charAt(0).toUpperCase() + word.slice(1)
).join('')}Job() {
  // TODO: Implement ${job.description.toLowerCase()}
  console.log('📋 Executing: ${job.description}')
  
  // Placeholder implementation
  return {
    processed: 0,
    message: 'Job implementation pending'
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    job: '${job.name}',
    description: '${job.description}',
    schedule: '${job.schedule}',
    status: 'ready'
  })
}`
}

async function storeCronJobConfig(job: CronJob) {
  try {
    const { data, error } = await supabase
      .from('cron_job_config')
      .upsert([{
        name: job.name,
        schedule: job.schedule,
        endpoint: job.endpoint,
        description: job.description,
        feature_flag: job.feature_flag,
        enabled: job.enabled,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'name'
      })

    if (error) {
      console.error('Failed to store cron job config:', error)
    } else {
      console.log(`✅ Stored config for ${job.name}`)
    }
  } catch (error) {
    console.error('Database error:', error)
  }
}

async function generateVercelConfig() {
  console.log('📋 Generating vercel.json configuration...')
  
  const vercelConfig = {
    crons: PHASE4_CRON_JOBS.filter(job => job.enabled).map(job => ({
      path: job.endpoint,
      schedule: job.schedule
    }))
  }

  console.log('📄 Vercel cron configuration:')
  console.log(JSON.stringify(vercelConfig, null, 2))
  
  console.log('\n💡 Add this to your vercel.json file:')
  console.log('```json')
  console.log(JSON.stringify(vercelConfig, null, 2))
  console.log('```')
}

async function validateCronSetup() {
  console.log('🔍 Validating cron job setup...')
  
  // Check for required environment variables
  const requiredEnvVars = [
    'CRON_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing environment variable: ${envVar}`)
    } else {
      console.log(`✅ Environment variable set: ${envVar}`)
    }
  }

  // Test database connection
  try {
    const { data, error } = await supabase.from('cron_job_config').select('count(*)')
    if (error) {
      console.error('❌ Database connection failed:', error)
    } else {
      console.log('✅ Database connection successful')
    }
  } catch (error) {
    console.error('❌ Database test failed:', error)
  }
}

async function main() {
  console.log('🚀 Phase-4 Cron Jobs Setup')
  console.log('==========================')
  
  try {
    await validateCronSetup()
    await createCronEndpoints()
    await generateVercelConfig()
    
    console.log('\n✅ Cron jobs setup completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Add the vercel.json configuration to your project')
    console.log('2. Set the CRON_SECRET environment variable')
    console.log('3. Deploy to Vercel to activate scheduled functions')
    console.log('4. Test endpoints manually before first scheduled run')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

// Run setup if called directly
if (require.main === module) {
  main()
}

export { PHASE4_CRON_JOBS, createCronEndpoints, generateVercelConfig }