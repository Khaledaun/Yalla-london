#!/usr/bin/env node

/**
 * Phase 2 Step 1: Simple HTTP Test Server
 * Tests monitoring endpoints without full Next.js setup
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.log('Could not load .env file:', error.message);
  }
}

loadEnvFile();

// Mock health check endpoint
function handleHealthCheck(req, res) {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      status: 'connected',
      response_time_ms: Math.floor(Math.random() * 100)
    },
    environment: {
      status: 'complete',
      missing_vars: [],
      node_env: process.env.NODE_ENV || 'development'
    },
    feature_flags: {
      FEATURE_PHASE4B_ENABLED: process.env.FEATURE_PHASE4B_ENABLED === 'true',
      FEATURE_PIPELINE_MONITORING: process.env.FEATURE_PIPELINE_MONITORING === 'true',
      FEATURE_AUDIT_SYSTEM: process.env.FEATURE_AUDIT_SYSTEM === 'true',
      FEATURE_PERFORMANCE_MONITORING: process.env.FEATURE_PERFORMANCE_MONITORING === 'true'
    },
    uptime: process.uptime(),
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external
    }
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(healthStatus, null, 2));
}

// Mock AI generate endpoint
function handleAIGenerate(req, res) {
  if (req.method === 'GET') {
    // GET request - return configuration
    const config = {
      status: 'success',
      configuration: {
        enabled: process.env.FEATURE_CONTENT_PIPELINE === 'true',
        providers: {
          abacus: {
            configured: !!process.env.ABACUSAI_API_KEY,
            endpoint: process.env.ABACUSAI_ENDPOINT || 'https://apps.abacus.ai/v1/chat/completions'
          },
          openai: {
            configured: !!process.env.OPENAI_API_KEY,
            endpoint: 'https://api.openai.com/v1/chat/completions'
          }
        },
        safety_limits: {
          MAX_TOKENS: 1000,
          MAX_REQUESTS_PER_HOUR: 10,
          MANUAL_APPROVAL_REQUIRED: true,
          ALLOWED_TYPES: ['content', 'topic', 'seo', 'summary']
        },
        supported_types: ['content', 'topic', 'seo', 'summary'],
        supported_languages: ['en', 'ar']
      },
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(config, null, 2));
    return;
  }
  
  // POST request - simulate content generation
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const requestData = JSON.parse(body);
      const { prompt, type = 'content', language = 'en' } = requestData;
      
      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: 'Prompt is required' }));
        return;
      }
      
      // Simulate AI response
      const mockContent = language === 'en' 
        ? `Generated ${type} content for: "${prompt.substring(0, 50)}..."\n\nThis is a mock response for Phase 2 testing. The AI generation system is configured and ready to connect to real providers.`
        : `محتوى ${type} تم إنشاؤه لـ: "${prompt.substring(0, 50)}..."\n\nهذا رد وهمي لاختبار المرحلة 2. نظام إنشاء الذكاء الاصطناعي مُكوَّن وجاهز للاتصال بالموفرين الحقيقيين.`;
      
      const response = {
        status: 'success',
        content: mockContent,
        provider_used: 'mock-provider',
        tokens_used: 150,
        response_time_ms: Math.floor(Math.random() * 1000) + 500,
        safety_check: {
          passed: true,
          flags: []
        }
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response, null, 2));
      
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', error: 'Invalid JSON' }));
    }
  });
}

// Mock topic orchestrator endpoint
function handleTopicOrchestrator(req, res) {
  if (req.method === 'GET') {
    // GET request - return configuration
    const config = {
      status: 'success',
      configuration: {
        enabled: process.env.FEATURE_TOPIC_RESEARCH === 'true',
        limits: {
          MAX_TOPICS_PER_REQUEST: parseInt(process.env.PHASE2_MAX_CONTENT_GENERATION || '1'),
          MAX_REQUESTS_PER_HOUR: 5,
          MANUAL_APPROVAL_REQUIRED: process.env.PHASE2_MANUAL_APPROVAL_REQUIRED === 'true',
          ALLOWED_CATEGORIES: [
            'london_travel',
            'luxury_hotels',
            'fine_dining',
            'cultural_experiences',
            'shopping',
            'entertainment',
            'weekly_mixed'
          ]
        },
        allowed_categories: [
          'london_travel',
          'luxury_hotels', 
          'fine_dining',
          'cultural_experiences',
          'shopping',
          'entertainment',
          'weekly_mixed'
        ],
        supported_locales: ['en', 'ar']
      },
      phase2_settings: {
        safety_mode: process.env.PHASE2_SAFETY_MODE === 'true',
        manual_approval_required: process.env.PHASE2_MANUAL_APPROVAL_REQUIRED === 'true',
        max_content_generation: process.env.PHASE2_MAX_CONTENT_GENERATION || '1'
      },
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(config, null, 2));
    return;
  }
  
  if (req.method === 'POST') {
    // POST request - simulate topic generation
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        const { category, locale = 'en', count = 1, priority = 'medium' } = requestData;
        
        if (!category) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', error: 'Category is required' }));
          return;
        }
        
        // Simulate topic generation with safety checks
        const allowedCategories = [
          'london_travel', 'luxury_hotels', 'fine_dining', 
          'cultural_experiences', 'shopping', 'entertainment', 'weekly_mixed'
        ];
        
        if (!allowedCategories.includes(category)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'error', 
            error: `Category '${category}' not allowed in Phase 2` 
          }));
          return;
        }
        
        // Generate mock topics
        const maxTopics = Math.min(count, parseInt(process.env.PHASE2_MAX_CONTENT_GENERATION || '1'));
        const topics = [];
        
        for (let i = 0; i < maxTopics; i++) {
          const topicTitle = locale === 'en' 
            ? `Best ${category.replace('_', ' ')} in London - Guide ${i + 1}`
            : `أفضل ${category.replace('_', ' ')} في لندن - دليل ${i + 1}`;
            
          topics.push({
            id: `topic_${Date.now()}_${i}`,
            title: topicTitle,
            slug: topicTitle.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-'),
            category,
            locale,
            primary_keyword: `${category.replace('_', ' ')} london`,
            longtails: [
              `best ${category.replace('_', ' ')} london`,
              `${category.replace('_', ' ')} london guide`,
              `luxury ${category.replace('_', ' ')} london`,
              `${category.replace('_', ' ')} london 2025`
            ],
            questions: [
              `What is the best ${category.replace('_', ' ')} in London?`,
              `Where to find ${category.replace('_', ' ')} in London?`,
              `How to experience ${category.replace('_', ' ')} in London?`
            ],
            rationale: `Generated topic about ${category.replace('_', ' ')} for London travel content`,
            sources: ['timeout.com', 'visitlondon.com'],
            confidence_score: 0.85,
            status: process.env.PHASE2_MANUAL_APPROVAL_REQUIRED === 'true' ? 'proposed' : 'approved',
            created_at: new Date().toISOString(),
            safety_check: {
              passed: true,
              flags: []
            }
          });
        }
        
        const response = {
          status: 'success',
          message: `Generated ${topics.length} topics successfully`,
          data: {
            generated_count: topics.length,
            topics: topics,
            safety_summary: {
              total_checked: topics.length,
              passed: topics.length,
              failed: 0,
              flags: []
            },
            manual_approval_required: process.env.PHASE2_MANUAL_APPROVAL_REQUIRED === 'true'
          },
          timestamp: new Date().toISOString()
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response, null, 2));
        
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  if (req.method === 'PUT') {
    // PUT request - simulate topic approval
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        const { action, topic_ids } = requestData;
        
        if (action === 'approve' && Array.isArray(topic_ids)) {
          const response = {
            status: 'success',
            message: `Approved ${topic_ids.length} topics`,
            approved_count: topic_ids.length,
            timestamp: new Date().toISOString()
          };
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response, null, 2));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', error: 'Invalid action or topic_ids' }));
        }
        
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

// Mock monitoring alerts endpoint
function handleMonitoringAlerts(req, res) {
  const currentMetrics = {
    timestamp: new Date().toISOString(),
    cpu_usage: Math.random() * 100,
    memory_usage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
    database_response_time: Math.floor(Math.random() * 500),
    error_rate: Math.random() * 5,
    active_users: Math.floor(Math.random() * 100),
    request_count: Math.floor(Math.random() * 1000)
  };
  
  const alertSummary = {
    total: 0,
    unresolved: 0,
    by_severity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  };
  
  const response = {
    status: 'success',
    timestamp: new Date().toISOString(),
    current_metrics: currentMetrics,
    alert_summary: alertSummary,
    alerts: [],
    thresholds: {
      cpu_usage: 80,
      memory_usage: 85,
      database_response_time: 1000,
      error_rate: 5,
      active_users: 1000
    },
    system_status: {
      overall: 'healthy',
      database: 'healthy',
      performance: 'healthy'
    }
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response, null, 2));
}

// Create server
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Route handling
  if (req.url === '/api/health' && req.method === 'GET') {
    handleHealthCheck(req, res);
  } else if (req.url === '/api/monitoring/alerts' && req.method === 'GET') {
    handleMonitoringAlerts(req, res);
  } else if (req.url === '/api/ai/generate') {
    handleAIGenerate(req, res);
  } else if (req.url === '/api/admin/topic-orchestrator') {
    handleTopicOrchestrator(req, res);
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>Phase 2 Monitoring Test</title></head>
        <body>
          <h1>🔍 Phase 2 Monitoring System Test</h1>
          <h2>Available Endpoints:</h2>
          <ul>
            <li><a href="/api/health">/api/health</a> - Health check endpoint</li>
            <li><a href="/api/monitoring/alerts">/api/monitoring/alerts</a> - Monitoring alerts</li>
            <li><a href="/api/ai/generate">/api/ai/generate</a> - AI content generation (GET for config, POST for generation)</li>
            <li><a href="/api/admin/topic-orchestrator">/api/admin/topic-orchestrator</a> - Topic orchestration (GET for config, POST for generation, PUT for approval)</li>
          </ul>
          <h2>Feature Flags Status:</h2>
          <ul>
            <li>FEATURE_PHASE4B_ENABLED: ${process.env.FEATURE_PHASE4B_ENABLED}</li>
            <li>FEATURE_PIPELINE_MONITORING: ${process.env.FEATURE_PIPELINE_MONITORING}</li>
            <li>FEATURE_AUDIT_SYSTEM: ${process.env.FEATURE_AUDIT_SYSTEM}</li>
            <li>FEATURE_PERFORMANCE_MONITORING: ${process.env.FEATURE_PERFORMANCE_MONITORING}</li>
          </ul>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: req.url }));
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Phase 2 Test Server running on http://localhost:${PORT}`);
  console.log(`✅ Monitoring endpoints ready for testing`);
  console.log(`📊 Feature flags loaded and active`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
