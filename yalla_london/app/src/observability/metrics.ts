/**
 * Observability Metrics for Phase-4C Ops Hardening
 * Exposes counters and histograms for SLO monitoring
 */

interface MetricConfig {
  name: string;
  help: string;
  type: 'counter' | 'histogram';
  labels?: string[];
  buckets?: number[];
}

interface MetricValue {
  value: number;
  labels?: Record<string, string>;
}

class MetricsCollector {
  private metrics: Map<string, any> = new Map();
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV !== 'test';
    this.initializeMetrics();
  }

  private initializeMetrics() {
    if (!this.isEnabled) return;

    // HTTP Request Metrics
    this.registerMetric({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      type: 'counter',
      labels: ['method', 'route', 'status_code']
    });

    this.registerMetric({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      type: 'histogram',
      labels: ['method', 'route', 'status_code'],
      buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
    });

    this.registerMetric({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      type: 'counter',
      labels: ['method', 'route', 'status_code', 'error_type']
    });

    // Database Metrics
    this.registerMetric({
      name: 'db_query_duration_ms',
      help: 'Database query duration in milliseconds',
      type: 'histogram',
      labels: ['operation', 'table', 'status'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000]
    });

    this.registerMetric({
      name: 'db_connections_total',
      help: 'Total number of database connections',
      type: 'counter',
      labels: ['status']
    });

    // Business Metrics
    this.registerMetric({
      name: 'articles_created_total',
      help: 'Total number of articles created',
      type: 'counter',
      labels: ['site_id', 'locale']
    });

    this.registerMetric({
      name: 'media_uploads_total',
      help: 'Total number of media uploads',
      type: 'counter',
      labels: ['type', 'size_bucket']
    });

    // Feature Flag Metrics
    this.registerMetric({
      name: 'feature_flag_usage_total',
      help: 'Total feature flag usage',
      type: 'counter',
      labels: ['flag_name', 'enabled']
    });
  }

  private registerMetric(config: MetricConfig) {
    if (!this.isEnabled) return;

    const metric = {
      name: config.name,
      help: config.help,
      type: config.type,
      labels: config.labels || [],
      buckets: config.buckets,
      values: new Map<string, number>()
    };

    this.metrics.set(config.name, metric);
  }

  // HTTP Request Metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    if (!this.isEnabled) return;

    const labels = { method, route, status_code: statusCode.toString() };
    
    // Increment request counter
    this.incrementCounter('http_requests_total', labels);
    
    // Record duration histogram
    this.recordHistogram('http_request_duration_ms', duration, labels);
    
    // Record errors if status >= 400
    if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', {
        ...labels,
        error_type: this.getErrorType(statusCode)
      });
    }
  }

  // Database Metrics
  recordDbQuery(operation: string, table: string, duration: number, success: boolean) {
    if (!this.isEnabled) return;

    const labels = {
      operation,
      table,
      status: success ? 'success' : 'error'
    };

    this.recordHistogram('db_query_duration_ms', duration, labels);
  }

  recordDbConnection(status: 'success' | 'error') {
    if (!this.isEnabled) return;

    this.incrementCounter('db_connections_total', { status });
  }

  // Business Metrics
  recordArticleCreated(siteId: string, locale: string) {
    if (!this.isEnabled) return;

    this.incrementCounter('articles_created_total', { site_id: siteId, locale });
  }

  recordMediaUpload(type: string, sizeBytes: number) {
    if (!this.isEnabled) return;

    const sizeBucket = this.getSizeBucket(sizeBytes);
    this.incrementCounter('media_uploads_total', { type, size_bucket: sizeBucket });
  }

  recordFeatureFlagUsage(flagName: string, enabled: boolean) {
    if (!this.isEnabled) return;

    this.incrementCounter('feature_flag_usage_total', {
      flag_name: flagName,
      enabled: enabled.toString()
    });
  }

  // Helper Methods
  private incrementCounter(metricName: string, labels: Record<string, string>) {
    const metric = this.metrics.get(metricName);
    if (!metric) return;

    const key = this.createKey(metricName, labels);
    const current = metric.values.get(key) || 0;
    metric.values.set(key, current + 1);
  }

  private recordHistogram(metricName: string, value: number, labels: Record<string, string>) {
    const metric = this.metrics.get(metricName);
    if (!metric || !metric.buckets) return;

    const key = this.createKey(metricName, labels);
    const current = metric.values.get(key) || 0;
    metric.values.set(key, current + 1);

    // Record bucket counts
    for (const bucket of metric.buckets) {
      if (value <= bucket) {
        const bucketKey = this.createKey(`${metricName}_bucket`, { ...labels, le: bucket.toString() });
        const bucketCurrent = metric.values.get(bucketKey) || 0;
        metric.values.set(bucketKey, bucketCurrent + 1);
      }
    }
  }

  private createKey(metricName: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${metricName}{${labelStr}}`;
  }

  private getErrorType(statusCode: number): string {
    if (statusCode >= 500) return 'server_error';
    if (statusCode >= 400) return 'client_error';
    return 'unknown';
  }

  private getSizeBucket(sizeBytes: number): string {
    if (sizeBytes < 1024) return '1kb';
    if (sizeBytes < 10240) return '10kb';
    if (sizeBytes < 102400) return '100kb';
    if (sizeBytes < 1048576) return '1mb';
    if (sizeBytes < 10485760) return '10mb';
    return '100mb+';
  }

  // Export metrics in Prometheus format
  exportMetrics(): string {
    if (!this.isEnabled) return '';

    const lines: string[] = [];
    
    for (const [metricName, metric] of this.metrics) {
      // Add help and type comments
      lines.push(`# HELP ${metricName} ${metric.help}`);
      lines.push(`# TYPE ${metricName} ${metric.type}`);
      
      // Add metric values
      for (const [key, value] of metric.values) {
        lines.push(`${key} ${value}`);
      }
      
      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  // Get metrics for monitoring
  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [metricName, metric] of this.metrics) {
      result[metricName] = {
        type: metric.type,
        help: metric.help,
        values: Object.fromEntries(metric.values)
      };
    }

    return result;
  }

  // Reset metrics (for testing)
  reset() {
    for (const metric of this.metrics.values()) {
      metric.values.clear();
    }
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

// Convenience functions
export const recordHttpRequest = (method: string, route: string, statusCode: number, duration: number) => {
  metrics.recordHttpRequest(method, route, statusCode, duration);
};

export const recordDbQuery = (operation: string, table: string, duration: number, success: boolean) => {
  metrics.recordDbQuery(operation, table, duration, success);
};

export const recordArticleCreated = (siteId: string, locale: string) => {
  metrics.recordArticleCreated(siteId, locale);
};

export const recordMediaUpload = (type: string, sizeBytes: number) => {
  metrics.recordMediaUpload(type, sizeBytes);
};

export const recordFeatureFlagUsage = (flagName: string, enabled: boolean) => {
  metrics.recordFeatureFlagUsage(flagName, enabled);
};
