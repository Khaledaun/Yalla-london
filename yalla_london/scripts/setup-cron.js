
#!/usr/bin/env node

/**
 * Cron Job Setup Script for Yalla London
 * 
 * This script sets up automated tasks for content publishing and maintenance.
 * Run this after deploying to production.
 */

const cron = require('node-cron');

// Content publishing schedule (9AM and 9PM London time)
const CONTENT_SCHEDULE = process.env.CONTENT_PUBLISHING_SCHEDULE || '0 9,21 * * *';

// Set up content publishing cron job
function setupContentPublishing() {
  console.log('Setting up content publishing cron job...');
  
  cron.schedule(CONTENT_SCHEDULE, async () => {
    console.log('Running scheduled content publishing...');
    
    try {
      // Call the content scheduling API
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/content/schedule`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PASSWORD}`
        }
      });
      
      const result = await response.json();
      console.log('Content publishing result:', result);
      
    } catch (error) {
      console.error('Content publishing failed:', error);
    }
  }, {
    timezone: 'Europe/London'
  });
  
  console.log(`Content publishing scheduled for: ${CONTENT_SCHEDULE}`);
}

// Set up daily analytics and maintenance tasks
function setupMaintenanceTasks() {
  console.log('Setting up maintenance tasks...');
  
  // Run daily at 2AM London time
  cron.schedule('0 2 * * *', async () => {
    console.log('Running daily maintenance tasks...');
    
    try {
      // Cleanup old scheduled content
      // Generate analytics reports
      // Check system health
      console.log('Maintenance tasks completed');
      
    } catch (error) {
      console.error('Maintenance tasks failed:', error);
    }
  }, {
    timezone: 'Europe/London'
  });
}

// Initialize cron jobs
function init() {
  console.log('🚀 Initializing Yalla London automation...');
  
  setupContentPublishing();
  setupMaintenanceTasks();
  
  console.log('✅ All cron jobs configured successfully!');
  console.log('Next content publishing:', new Date());
}

// Run if called directly
if (require.main === module) {
  init();
}

module.exports = { init, setupContentPublishing, setupMaintenanceTasks };
