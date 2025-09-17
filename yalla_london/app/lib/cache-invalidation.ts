/**
 * Cache Invalidation and Real-time Sync System
 * Ensures immediate updates to public site when admin changes content
 */

export class CacheInvalidationService {
  private static instance: CacheInvalidationService;
  private webhookEndpoints: string[] = [];

  static getInstance(): CacheInvalidationService {
    if (!CacheInvalidationService.instance) {
      CacheInvalidationService.instance = new CacheInvalidationService();
    }
    return CacheInvalidationService.instance;
  }

  constructor() {
    // Add webhook endpoints for cache invalidation
    this.webhookEndpoints = [
      '/api/cache/invalidate',
      '/api/revalidate'
    ];
  }

  /**
   * Invalidate cache for specific content type
   */
  async invalidateContentCache(contentType: 'blog' | 'homepage' | 'media' | 'all', contentId?: string) {
    const promises: Promise<any>[] = [];

    try {
      // Invalidate Next.js ISR cache
      if (typeof window === 'undefined') {
        // Server-side: use revalidateTag or revalidatePath
        const { revalidateTag, revalidatePath } = await import('next/cache');
        
        switch (contentType) {
          case 'blog':
            revalidateTag('blog-posts');
            revalidatePath('/blog');
            if (contentId) {
              revalidatePath(`/blog/${contentId}`);
            }
            break;
          case 'homepage':
            revalidateTag('homepage-content');
            revalidatePath('/');
            break;
          case 'media':
            revalidateTag('media-assets');
            break;
          case 'all':
            revalidateTag('blog-posts');
            revalidateTag('homepage-content');
            revalidateTag('media-assets');
            revalidatePath('/');
            revalidatePath('/blog');
            break;
        }
      }

      // Client-side: trigger webhook calls
      for (const endpoint of this.webhookEndpoints) {
        promises.push(
          fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contentType,
              contentId,
              timestamp: new Date().toISOString()
            })
          }).catch(error => {
            console.warn(`Cache invalidation failed for ${endpoint}:`, error);
            return null;
          })
        );
      }

      await Promise.allSettled(promises);
      
      console.log(`Cache invalidated for ${contentType}${contentId ? ` (ID: ${contentId})` : ''}`);
      return { success: true, contentType, contentId };
      
    } catch (error) {
      console.error('Cache invalidation error:', error);
      throw new Error(`Failed to invalidate cache for ${contentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify sync between admin action and public site
   */
  async verifySyncStatus(contentType: string, contentId: string, expectedData: any): Promise<{
    success: boolean;
    synced: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      let endpoint = '';
      
      switch (contentType) {
        case 'blog':
          endpoint = `/api/content?limit=1`;
          if (contentId) {
            endpoint = `/api/content/blog/${contentId}`;
          }
          break;
        case 'homepage':
          endpoint = `/api/homepage-blocks`;
          break;
        default:
          endpoint = `/api/content`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const latency = Date.now() - startTime;
      
      // Check if data matches expected values
      const synced = this.validateSyncData(data, expectedData, contentType);
      
      return {
        success: true,
        synced,
        latency
      };
      
    } catch (error) {
      return {
        success: false,
        synced: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private validateSyncData(actualData: any, expectedData: any, contentType: string): boolean {
    try {
      switch (contentType) {
        case 'blog':
          if (actualData.data && Array.isArray(actualData.data)) {
            const post = actualData.data.find((p: any) => p.id === expectedData.id);
            return post && 
                   post.title === expectedData.title &&
                   post.published === expectedData.published;
          }
          return false;
          
        case 'homepage':
          return actualData.success === true && actualData.data;
          
        default:
          return actualData.success === true;
      }
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const cacheService = CacheInvalidationService.getInstance();

/**
 * Hook for React components to trigger cache invalidation
 */
export function useCacheInvalidation() {
  const invalidateCache = async (contentType: 'blog' | 'homepage' | 'media' | 'all', contentId?: string) => {
    try {
      await cacheService.invalidateContentCache(contentType, contentId);
      return { success: true };
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const verifySync = async (contentType: string, contentId: string, expectedData: any) => {
    try {
      return await cacheService.verifySyncStatus(contentType, contentId, expectedData);
    } catch (error) {
      return {
        success: false,
        synced: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  return { invalidateCache, verifySync };
}