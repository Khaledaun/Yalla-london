# SLO Metrics and Observability Documentation

## Overview
This document outlines the Service Level Objectives (SLOs), metrics collection, and observability implementation for the Yalla London platform.

## Service Level Objectives (SLOs)

### 1. Availability SLO
- **Target**: 99.9% uptime
- **Measurement**: HTTP 200 responses / Total requests
- **Time Window**: 30 days
- **Alert Threshold**: < 99.5% for 5 minutes

### 2. Latency SLO
- **Target**: 95th percentile < 500ms
- **Measurement**: HTTP request duration
- **Time Window**: 10 minutes
- **Alert Threshold**: > 500ms for 10 minutes

### 3. Error Rate SLO
- **Target**: < 2% error rate
- **Measurement**: HTTP 4xx/5xx responses / Total requests
- **Time Window**: 10 minutes
- **Alert Threshold**: > 2% for 10 minutes

### 4. Database Performance SLO
- **Target**: 95th percentile < 200ms
- **Measurement**: Database query duration
- **Time Window**: 10 minutes
- **Alert Threshold**: > 200ms for 10 minutes

## Metrics Collection

### 1. HTTP Request Metrics

#### http_requests_total
- **Type**: Counter
- **Labels**: method, route, status_code
- **Description**: Total number of HTTP requests

#### http_request_duration_ms
- **Type**: Histogram
- **Labels**: method, route, status_code
- **Buckets**: [10, 50, 100, 200, 500, 1000, 2000, 5000]
- **Description**: HTTP request duration in milliseconds

#### http_errors_total
- **Type**: Counter
- **Labels**: method, route, status_code, error_type
- **Description**: Total number of HTTP errors

### 2. Database Metrics

#### db_query_duration_ms
- **Type**: Histogram
- **Labels**: operation, table, status
- **Buckets**: [1, 5, 10, 25, 50, 100, 250, 500, 1000]
- **Description**: Database query duration in milliseconds

#### db_connections_total
- **Type**: Counter
- **Labels**: status
- **Description**: Total number of database connections

### 3. Business Metrics

#### articles_created_total
- **Type**: Counter
- **Labels**: site_id, locale
- **Description**: Total number of articles created

#### media_uploads_total
- **Type**: Counter
- **Labels**: type, size_bucket
- **Description**: Total number of media uploads

#### feature_flag_usage_total
- **Type**: Counter
- **Labels**: flag_name, enabled
- **Description**: Total feature flag usage

## Implementation

### 1. Metrics Collection
```typescript
import { recordHttpRequest, recordDbQuery, recordArticleCreated } from '@/src/observability/metrics';

// HTTP request metrics
export const GET = withMetrics(async (request: NextRequest) => {
  const startTime = Date.now();
  try {
    const response = await handler(request);
    const duration = Date.now() - startTime;
    recordHttpRequest(request.method, request.nextUrl.pathname, response.status, duration);
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordHttpRequest(request.method, request.nextUrl.pathname, 500, duration);
    throw error;
  }
});

// Database query metrics
const result = await withDbMetrics('create', 'blog_posts', async () => {
  return await prisma.blogPost.create({ data: articleData });
});
```

### 2. Metrics Export
```typescript
// Export metrics in Prometheus format
app.get('/api/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metrics.exportMetrics());
});
```

### 3. Custom Metrics
```typescript
// Business metrics
recordArticleCreated('site-123', 'en');
recordMediaUpload('image', 1024000);
recordFeatureFlagUsage('FEATURE_AI_SEO_AUDIT', true);
```

## Alerting Configuration

### 1. Error Rate Alerts
```yaml
- alert: HighErrorRate
  expr: |
    (
      rate(http_errors_total[10m]) / 
      rate(http_requests_total[10m])
    ) * 100 > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High error rate detected"
    description: "Error rate is {{ $value }}% over the last 10 minutes"
```

### 2. Latency Alerts
```yaml
- alert: HighAPILatency
  expr: |
    histogram_quantile(0.95, 
      rate(http_request_duration_ms_bucket[10m])
    ) > 500
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High API latency detected"
    description: "95th percentile latency is {{ $value }}ms"
```

### 3. Database Performance Alerts
```yaml
- alert: HighDBLatency
  expr: |
    histogram_quantile(0.95,
      rate(db_query_duration_ms_bucket[10m])
    ) > 200
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High database latency detected"
    description: "95th percentile DB latency is {{ $value }}ms"
```

## Monitoring Dashboards

### 1. System Overview Dashboard
- **HTTP Request Rate**: Requests per second
- **Error Rate**: Percentage of failed requests
- **Response Time**: P50, P95, P99 latencies
- **Active Users**: Concurrent users

### 2. Database Performance Dashboard
- **Query Rate**: Queries per second
- **Query Duration**: P50, P95, P99 latencies
- **Connection Pool**: Active connections
- **Slow Queries**: Queries > 100ms

### 3. Business Metrics Dashboard
- **Article Creation Rate**: Articles per hour
- **Media Upload Rate**: Uploads per hour
- **Feature Flag Usage**: Flag activation rates
- **User Engagement**: Active sessions

### 4. Error Analysis Dashboard
- **Error Rate by Endpoint**: Top failing endpoints
- **Error Rate by Status Code**: 4xx vs 5xx errors
- **Error Rate by Time**: Error trends over time
- **Error Rate by User**: User-specific errors

## SLO Monitoring

### 1. SLO Calculation
```promql
# Availability SLO
(
  sum(rate(http_requests_total{status_code!~"5.."}[30d])) /
  sum(rate(http_requests_total[30d]))
) * 100

# Latency SLO
histogram_quantile(0.95, 
  rate(http_request_duration_ms_bucket[10m])
)

# Error Rate SLO
(
  sum(rate(http_errors_total[10m])) /
  sum(rate(http_requests_total[10m]))
) * 100
```

### 2. SLO Burn Rate
```promql
# Error budget burn rate
(
  sum(rate(http_errors_total[1h])) /
  sum(rate(http_requests_total[1h]))
) / 0.02  # 2% error rate target
```

### 3. SLO Alerts
```yaml
- alert: SLOErrorBudgetBurn
  expr: |
    (
      sum(rate(http_errors_total[1h])) /
      sum(rate(http_requests_total[1h]))
    ) / 0.02 > 2
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "SLO error budget burning fast"
    description: "Error budget burn rate is {{ $value }}x"
```

## Performance Testing

### 1. Load Testing
```bash
# K6 load test
k6 run perf/k6/save-and-list.js \
  --env BASE_URL=https://yalla-london.vercel.app \
  --env ADMIN_EMAIL=admin@test.com \
  --env ADMIN_PASSWORD=testpassword
```

### 2. Performance Thresholds
- **Error Rate**: < 1%
- **95th Percentile Latency**: < 500ms
- **99th Percentile Latency**: < 1000ms
- **Throughput**: > 100 requests/second

### 3. Performance Monitoring
```typescript
// Performance metrics
const performanceMetrics = {
  errorRate: errorRate.values.rate,
  p95Latency: apiLatency.values.p95,
  p99Latency: apiLatency.values.p99,
  throughput: httpRequests.values.rate
};
```

## Troubleshooting

### 1. High Error Rates
**Symptoms**: Error rate > 2%
**Investigation**:
- Check error logs
- Review recent deployments
- Verify database connectivity
- Check external dependencies

**Resolution**:
- Rollback if recent deployment
- Scale resources if needed
- Fix underlying issues
- Update monitoring alerts

### 2. High Latency
**Symptoms**: P95 latency > 500ms
**Investigation**:
- Check database performance
- Review slow queries
- Verify external API responses
- Check server resources

**Resolution**:
- Optimize database queries
- Add caching
- Scale resources
- Update performance thresholds

### 3. Database Issues
**Symptoms**: DB latency > 200ms
**Investigation**:
- Check connection pool
- Review slow queries
- Verify database resources
- Check network connectivity

**Resolution**:
- Optimize queries
- Increase connection pool
- Scale database
- Update database configuration

## Best Practices

### 1. Metrics Collection
- Use consistent labeling
- Avoid high cardinality
- Collect business metrics
- Monitor resource usage

### 2. Alerting
- Set appropriate thresholds
- Use multiple severity levels
- Include runbook links
- Test alerting regularly

### 3. SLO Management
- Set realistic targets
- Monitor error budgets
- Review SLOs regularly
- Communicate SLO status

### 4. Performance
- Monitor key metrics
- Set performance budgets
- Test performance regularly
- Optimize based on data

## Tools and Integration

### 1. Monitoring Tools
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and visualization
- **AlertManager**: Alert routing
- **K6**: Load testing

### 2. Logging
- **Structured Logging**: JSON format
- **Log Aggregation**: Centralized collection
- **Log Analysis**: Search and analysis
- **Log Retention**: 30 days

### 3. Tracing
- **Distributed Tracing**: Request flow
- **Performance Profiling**: Code analysis
- **Error Tracking**: Exception monitoring
- **User Experience**: Real user monitoring
