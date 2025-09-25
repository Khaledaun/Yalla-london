/**
 * K6 Load Test: Save and List Operations
 * Simulates 100 concurrent users doing login → create → list for 5 minutes
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const apiLatency = new Trend('api_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    error_rate: ['rate<0.01'],        // Error rate < 1%
    api_latency: ['p(95)<500'],       // 95th percentile < 500ms
    http_req_duration: ['p(95)<500'], // 95th percentile < 500ms
    http_req_failed: ['rate<0.01'],   // Failed requests < 1%
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'testpassword';

// Test scenarios
const scenarios = {
  login: {
    executor: 'shared-iterations',
    vus: 100,
    iterations: 1000,
    maxDuration: '10m',
  },
  create_article: {
    executor: 'shared-iterations',
    vus: 100,
    iterations: 500,
    maxDuration: '10m',
  },
  list_articles: {
    executor: 'shared-iterations',
    vus: 100,
    iterations: 2000,
    maxDuration: '10m',
  },
};

export default function () {
  const startTime = Date.now();
  let sessionToken = null;
  let articleId = null;

  // Scenario 1: Login
  const loginResponse = http.post(`${BASE_URL}/api/auth/signin`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  }, {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => r.json('token') !== undefined,
  });

  if (loginSuccess) {
    sessionToken = loginResponse.json('token');
  }

  errorRate.add(!loginSuccess);
  apiLatency.add(Date.now() - startTime);

  sleep(1);

  // Scenario 2: Create Article (if login successful)
  if (sessionToken) {
    const createStartTime = Date.now();
    const articleData = {
      title: `Load Test Article ${Date.now()}`,
      content: `This is a load test article created at ${new Date().toISOString()}`,
      locale: 'en',
      pageType: 'guide',
      primaryKeyword: 'load test',
      excerpt: 'Load test article excerpt'
    };

    const createResponse = http.post(`${BASE_URL}/api/admin/editor/save`, JSON.stringify(articleData), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    const createSuccess = check(createResponse, {
      'create article status is 200': (r) => r.status === 200,
      'create article response has id': (r) => r.json('data.id') !== undefined,
    });

    if (createSuccess) {
      articleId = createResponse.json('data.id');
    }

    errorRate.add(!createSuccess);
    apiLatency.add(Date.now() - createStartTime);

    sleep(2);
  }

  // Scenario 3: List Articles (if login successful)
  if (sessionToken) {
    const listStartTime = Date.now();
    const listResponse = http.get(`${BASE_URL}/api/admin/articles`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    const listSuccess = check(listResponse, {
      'list articles status is 200': (r) => r.status === 200,
      'list articles response has articles': (r) => r.json('articles') !== undefined,
    });

    errorRate.add(!listSuccess);
    apiLatency.add(Date.now() - listStartTime);

    sleep(1);
  }

  // Scenario 4: Health Check
  const healthStartTime = Date.now();
  const healthResponse = http.get(`${BASE_URL}/api/health`);

  const healthSuccess = check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response has status': (r) => r.json('status') === 'ok',
  });

  errorRate.add(!healthSuccess);
  apiLatency.add(Date.now() - healthStartTime);

  sleep(1);
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Starting K6 load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Admin Email: ${ADMIN_EMAIL}`);
  
  // Verify the service is accessible
  const healthResponse = http.get(`${BASE_URL}/api/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Service not accessible at ${BASE_URL}`);
  }
  
  console.log('Service is accessible, starting load test...');
  return { baseUrl: BASE_URL };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Final error rate: ${errorRate.values.rate}`);
  console.log(`Final API latency p95: ${apiLatency.values.p95}ms`);
}

// Custom summary function
export function handleSummary(data) {
  return {
    'k6-report.html': htmlReport(data),
    'k6-summary.json': JSON.stringify(data, null, 2),
  };
}

// HTML report generator
function htmlReport(data) {
  const errorRate = data.metrics.error_rate?.values?.rate || 0;
  const apiLatency = data.metrics.api_latency?.values?.p95 || 0;
  const httpDuration = data.metrics.http_req_duration?.values?.p95 || 0;
  const httpFailed = data.metrics.http_req_failed?.values?.rate || 0;

  const passed = errorRate < 0.01 && apiLatency < 500 && httpDuration < 500 && httpFailed < 0.01;

  return `
<!DOCTYPE html>
<html>
<head>
    <title>K6 Load Test Report - Yalla London</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 4px solid #007cba; }
        .pass { border-left-color: #28a745; }
        .fail { border-left-color: #dc3545; }
        .threshold { font-weight: bold; }
        .summary { background: ${passed ? '#d4edda' : '#f8d7da'}; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>K6 Load Test Report - Yalla London</h1>
        <p><strong>Test Duration:</strong> ${data.state.testRunDurationMs / 1000}s</p>
        <p><strong>Total Requests:</strong> ${data.metrics.http_reqs?.values?.count || 0}</p>
        <p><strong>Virtual Users:</strong> ${data.state.vus || 0}</p>
    </div>

    <div class="summary">
        <h2>Test Result: ${passed ? 'PASSED' : 'FAILED'}</h2>
        <p>All thresholds ${passed ? 'passed' : 'failed'}</p>
    </div>

    <h2>Key Metrics</h2>
    
    <div class="metric ${errorRate < 0.01 ? 'pass' : 'fail'}">
        <h3>Error Rate</h3>
        <p><strong>Value:</strong> ${(errorRate * 100).toFixed(2)}%</p>
        <p class="threshold">Threshold: < 1%</p>
    </div>

    <div class="metric ${apiLatency < 500 ? 'pass' : 'fail'}">
        <h3>API Latency (p95)</h3>
        <p><strong>Value:</strong> ${apiLatency.toFixed(2)}ms</p>
        <p class="threshold">Threshold: < 500ms</p>
    </div>

    <div class="metric ${httpDuration < 500 ? 'pass' : 'fail'}">
        <h3>HTTP Request Duration (p95)</h3>
        <p><strong>Value:</strong> ${httpDuration.toFixed(2)}ms</p>
        <p class="threshold">Threshold: < 500ms</p>
    </div>

    <div class="metric ${httpFailed < 0.01 ? 'pass' : 'fail'}">
        <h3>HTTP Request Failed Rate</h3>
        <p><strong>Value:</strong> ${(httpFailed * 100).toFixed(2)}%</p>
        <p class="threshold">Threshold: < 1%</p>
    </div>

    <h2>Detailed Metrics</h2>
    <pre>${JSON.stringify(data.metrics, null, 2)}</pre>
</body>
</html>`;
}
