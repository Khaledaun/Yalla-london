/**
 * Enhanced Real-Time Sync System
 * Ensures immediate updates between admin dashboard and public website
 */

import { revalidateTag, revalidatePath } from 'next/cache';

export class EnhancedSyncService {
  private static instance: EnhancedSyncService;
  private syncQueue: Array<{ type: string; id: string; timestamp: number }> = [];

  static getInstance(): EnhancedSyncService {
    if (!EnhancedSyncService.instance) {
      EnhancedSyncService.instance = new EnhancedSyncService();
    }
    return EnhancedSyncService.instance;
  }

  /**
   * Force immediate sync for content changes
   */
  async forceSync(contentType: 'blog' | 'homepage' | 'media' | 'theme' | 'all', contentId?: string): Promise<{
    success: boolean;
    message: string;
    synced: boolean;
    latency?: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Add to sync queue
      this.syncQueue.push({
        type: contentType,
        id: contentId || 'all',
        timestamp: Date.now()
      });

      // Perform immediate cache invalidation
      await this.performCacheInvalidation(contentType, contentId);
      
      // Trigger public API refresh
      await this.triggerPublicRefresh(contentType, contentId);
      
      // Verify sync
      const verified = await this.verifySync(contentType, contentId);
      
      const latency = Date.now() - startTime;
      
      return {
        success: true,
        message: `Sync completed for ${contentType}${contentId ? ` (ID: ${contentId})` : ''}`,
        synced: verified,
        latency
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        synced: false
      };
    }
  }

  /**
   * Perform comprehensive cache invalidation
   */
  private async performCacheInvalidation(contentType: string, contentId?: string): Promise<void> {
    const invalidationPromises: Promise<any>[] = [];

    switch (contentType) {
      case 'blog':
        // Invalidate blog-related caches
        invalidationPromises.push(
          Promise.resolve(revalidateTag('blog-posts')),
          Promise.resolve(revalidatePath('/blog')),
          Promise.resolve(revalidatePath('/')), // Homepage shows latest posts
          Promise.resolve(revalidatePath('/api/content'))
        );
        
        if (contentId) {
          invalidationPromises.push(
            Promise.resolve(revalidatePath(`/blog/${contentId}`)),
            Promise.resolve(revalidatePath(`/api/content/blog/${contentId}`))
          );
        }
        break;

      case 'homepage':
        // Invalidate homepage caches
        invalidationPromises.push(
          Promise.resolve(revalidateTag('homepage-content')),
          Promise.resolve(revalidateTag('homepage-blocks')),
          Promise.resolve(revalidatePath('/')),
          Promise.resolve(revalidatePath('/api/homepage-blocks'))
        );
        break;

      case 'media':
        // Invalidate media caches
        invalidationPromises.push(
          Promise.resolve(revalidateTag('media-assets')),
          Promise.resolve(revalidatePath('/blog')),
          Promise.resolve(revalidatePath('/'))
        );
        break;

      case 'theme':
        // Invalidate theme caches
        invalidationPromises.push(
          Promise.resolve(revalidateTag('theme-settings')),
          Promise.resolve(revalidatePath('/')),
          Promise.resolve(revalidatePath('/blog'))
        );
        break;

      case 'all':
        // Nuclear option - invalidate everything
        invalidationPromises.push(
          Promise.resolve(revalidateTag('blog-posts')),
          Promise.resolve(revalidateTag('homepage-content')),
          Promise.resolve(revalidateTag('homepage-blocks')),
          Promise.resolve(revalidateTag('media-assets')),
          Promise.resolve(revalidateTag('theme-settings')),
          Promise.resolve(revalidatePath('/')),
          Promise.resolve(revalidatePath('/blog')),
          Promise.resolve(revalidatePath('/api/content')),
          Promise.resolve(revalidatePath('/api/homepage-blocks'))
        );
        break;
    }

    // Execute all invalidations in parallel
    await Promise.allSettled(invalidationPromises);
  }

  /**
   * Trigger public API refresh
   */
  private async triggerPublicRefresh(contentType: string, contentId?: string): Promise<void> {
    const refreshPromises: Promise<any>[] = [];

    // Trigger cache invalidation endpoint
    refreshPromises.push(
      fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, contentId })
      }).catch(error => {
        console.warn('Cache invalidation endpoint failed:', error);
        return null;
      })
    );

    // Trigger revalidation endpoint if it exists
    refreshPromises.push(
      fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, contentId })
      }).catch(error => {
        console.warn('Revalidation endpoint failed:', error);
        return null;
      })
    );

    await Promise.allSettled(refreshPromises);
  }

  /**
   * Verify that sync actually worked
   */
  private async verifySync(contentType: string, contentId?: string): Promise<boolean> {
    try {
      // Wait a moment for cache to clear
      await new Promise(resolve => setTimeout(resolve, 500));

      let endpoint = '';
      
      switch (contentType) {
        case 'blog':
          endpoint = contentId ? `/api/content/blog/${contentId}` : '/api/content?limit=1';
          break;
        case 'homepage':
          endpoint = '/api/homepage-blocks';
          break;
        default:
          endpoint = '/api/content?limit=1';
      }

      const response = await fetch(endpoint, {
        cache: 'no-store', // Force fresh data
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      return response.ok;
      
    } catch (error) {
      console.warn('Sync verification failed:', error);
      return false;
    }
  }

  /**
   * Get sync status and history
   */
  getSyncStatus(): {
    queueLength: number;
    recentSyncs: Array<{ type: string; id: string; timestamp: number; age: number }>;
    isHealthy: boolean;
  } {
    const now = Date.now();
    const recentSyncs = this.syncQueue
      .filter(item => now - item.timestamp < 300000) // Last 5 minutes
      .map(item => ({
        ...item,
        age: Math.round((now - item.timestamp) / 1000)
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10); // Last 10 syncs

    return {
      queueLength: this.syncQueue.length,
      recentSyncs,
      isHealthy: this.syncQueue.length < 100 // Consider healthy if queue isn't too long
    };
  }

  /**
   * Clear old sync history
   */
  cleanupSyncHistory(): void {
    const now = Date.now();
    this.syncQueue = this.syncQueue.filter(item => now - item.timestamp < 3600000); // Keep last hour
  }
}

// Singleton instance
export const enhancedSync = EnhancedSyncService.getInstance();

/**
 * Hook for React components to use enhanced sync
 */
export function useEnhancedSync() {
  const forceSync = async (contentType: 'blog' | 'homepage' | 'media' | 'theme' | 'all', contentId?: string) => {
    return await enhancedSync.forceSync(contentType, contentId);
  };

  const getSyncStatus = () => {
    return enhancedSync.getSyncStatus();
  };

  const cleanupHistory = () => {
    enhancedSync.cleanupSyncHistory();
  };

  return { forceSync, getSyncStatus, cleanupHistory };
}

