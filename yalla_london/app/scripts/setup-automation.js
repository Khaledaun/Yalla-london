
/**
 * Setup Content Automation System
 * This script creates default automation rules and schedules cron jobs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupAutomation() {
  console.log('🚀 Setting up content automation system...\n');

  try {
    // Create default automation rules
    const rules = [
      {
        name: 'Daily Blog Posts (English)',
        content_type: 'blog_post',
        language: 'en',
        frequency_hours: 24,
        auto_publish: false, // Require manual approval
        min_hours_between: 8,
        max_posts_per_day: 2,
        preferred_times: ['09:00', '15:00'],
        categories: ['london-guide', 'food-drink'],
        is_active: true
      },
      {
        name: 'Daily Blog Posts (Arabic)',
        content_type: 'blog_post', 
        language: 'ar',
        frequency_hours: 48, // Every 2 days
        auto_publish: false,
        min_hours_between: 12,
        max_posts_per_day: 1,
        preferred_times: ['21:00'],
        categories: ['london-guide', 'culture-art'],
        is_active: true
      },
      {
        name: 'Weekly Events Content',
        content_type: 'blog_post',
        language: 'en',
        frequency_hours: 168, // Weekly
        auto_publish: false,
        min_hours_between: 24,
        max_posts_per_day: 1,
        preferred_times: ['10:00'],
        categories: ['events'],
        is_active: true
      },
      {
        name: 'Social Media Posts',
        content_type: 'social_post',
        language: 'both',
        frequency_hours: 6, // Every 6 hours
        auto_publish: true, // Auto-publish social content
        min_hours_between: 3,
        max_posts_per_day: 4,
        preferred_times: ['09:00', '15:00', '18:00', '21:00'],
        categories: ['london-guide', 'food-drink', 'style-shopping'],
        is_active: false // Disabled by default
      }
    ];

    console.log('Creating automation rules...');
    
    for (const rule of rules) {
      try {
        const existingRule = await prisma.contentScheduleRule.findFirst({
          where: { name: rule.name }
        });

        if (existingRule) {
          console.log(`✅ Rule "${rule.name}" already exists, skipping...`);
          continue;
        }

        await prisma.contentScheduleRule.create({
          data: rule
        });

        console.log(`✅ Created rule: "${rule.name}"`);
      } catch (error) {
        console.error(`❌ Failed to create rule "${rule.name}":`, error.message);
      }
    }

    // Create sample API settings
    console.log('\n📝 Setting up sample API settings...');
    
    const apiSettings = [
      {
        key_name: 'abacusai_api_key',
        key_value: 'your-abacusai-key-here',
        is_active: false,
        test_status: 'not_tested'
      },
      {
        key_name: 'google_analytics_id',
        key_value: 'G-XXXXXXXXXX',
        is_active: false,
        test_status: 'not_tested'
      },
      {
        key_name: 'smtp_host',
        key_value: 'smtp.gmail.com',
        is_active: false,
        test_status: 'not_tested'
      }
    ];

    for (const setting of apiSettings) {
      try {
        await prisma.apiSettings.upsert({
          where: { key_name: setting.key_name },
          update: {},
          create: setting
        });
        console.log(`✅ Created API setting: ${setting.key_name}`);
      } catch (error) {
        console.warn(`Warning: ${setting.key_name} might already exist`);
      }
    }

    console.log('\n🎯 Automation setup completed!\n');
    
    console.log('Next steps:');
    console.log('1. Update API keys in the admin panel');
    console.log('2. Test content generation manually');
    console.log('3. Enable automation rules as needed');
    console.log('4. Set up cron jobs for automatic execution');
    
    console.log('\nCron job setup:');
    console.log('Add this to your cron tab (crontab -e):');
    console.log('# Auto-generate content every 2 hours');
    console.log('0 */2 * * * curl -X POST -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/cron/auto-generate');
    console.log('\nOr use Vercel Cron Jobs if deploying to Vercel.');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAutomation();
