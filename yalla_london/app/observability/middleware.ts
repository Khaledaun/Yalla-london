/**
 * Metrics Middleware for API Routes
 * Automatically records HTTP request metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordHttpRequest } from './metrics';

export function withMetrics<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    let statusCode = 500;
    let route = 'unknown';
    let method = 'unknown';

    try {
      // Extract request info from first argument (NextRequest)
      const request = args[0] as NextRequest;
      if (request) {
        method = request.method;
        route = request.nextUrl.pathname;
      }

      // Execute the handler
      const response = await handler(...args);
      statusCode = response.status;

      return response;
    } catch (error) {
      console.error('Error in metrics middleware:', error);
      statusCode = 500;
      throw error;
    } finally {
      // Record metrics
      const duration = Date.now() - startTime;
      recordHttpRequest(method, route, statusCode, duration);
    }
  };
}

// Database query wrapper
export function withDbMetrics<T extends any[]>(
  operation: string,
  table: string,
  queryFn: (...args: T) => Promise<any>
) {
  return async (...args: T): Promise<any> => {
    const startTime = Date.now();
    let success = false;

    try {
      const result = await queryFn(...args);
      success = true;
      return result;
    } catch (error) {
      console.error(`Database query error (${operation} on ${table}):`, error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      recordHttpRequest(operation, table, duration, success ? 200 : 500);
    }
  };
}
