
// TikTok API Integration
export interface TikTokVideoData {
  video_id: string;
  title: string;
  description: string;
  cover_image_url: string;
  video_url: string;
  create_time: number;
  view_count: number;
  like_count: number;
}

export class TikTokAPI {
  private clientKey: string;
  private clientSecret: string;
  private accessToken: string;

  constructor() {
    this.clientKey = process.env.TIKTOK_CLIENT_KEY || '';
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET || '';
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN || '';
  }

  // Upload video to TikTok
  async uploadVideo(
    videoFile: File,
    title: string,
    description: string,
    hashtags: string[]
  ) {
    if (!this.accessToken) {
      console.warn('TikTok API credentials not configured');
      return null;
    }

    try {
      // Step 1: Initialize video upload
      const initResponse = await fetch('https://open-api.tiktok.com/video/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoFile.size,
            chunk_size: videoFile.size,
          },
        }),
      });

      const initData = await initResponse.json();
      
      if (!initData.data.upload_url) {
        throw new Error('Failed to get upload URL');
      }

      // Step 2: Upload video file
      const formData = new FormData();
      formData.append('video', videoFile);

      await fetch(initData.data.upload_url, {
        method: 'PUT',
        body: formData,
      });

      // Step 3: Publish video
      const publishResponse = await fetch('https://open-api.tiktok.com/video/publish/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: title,
            description: `${description} ${hashtags.join(' ')}`,
            privacy_level: 'SELF_ONLY', // Change to 'PUBLIC_TO_EVERYONE' when ready
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_id: initData.data.video_id,
          },
        }),
      });

      return await publishResponse.json();
    } catch (error) {
      console.error('Failed to upload TikTok video:', error);
      return null;
    }
  }

  // Get video list
  async getVideoList(cursor: number = 0, max_count: number = 20) {
    if (!this.accessToken) {
      return null;
    }

    try {
      const response = await fetch(
        `https://open-api.tiktok.com/video/list/?cursor=${cursor}&max_count=${max_count}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return await response.json();
    } catch (error) {
      console.error('Failed to get TikTok video list:', error);
      return null;
    }
  }

  // Get video analytics
  async getVideoAnalytics(video_ids: string[]) {
    if (!this.accessToken) {
      return null;
    }

    try {
      const response = await fetch('https://open-api.tiktok.com/video/query/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            video_ids: video_ids,
          },
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to get TikTok analytics:', error);
      return null;
    }
  }

  // Generate TikTok content ideas
  async generateContentIdeas(topic: string, language: 'en' | 'ar' = 'en') {
    try {
      const response = await fetch('/api/generate-tiktok-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to generate TikTok content ideas:', error);
      return null;
    }
  }
}

export const tiktok = new TikTokAPI();
