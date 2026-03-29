
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  ExternalLink,
  Download,
  Share2,
  Instagram,
  Youtube,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SocialEmbedProps {
  url?: string;
  localVideo?: {
    src: string;
    thumbnail: string;
    title: string;
    duration?: string;
    fileSize?: string;
  };
  type: 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'local';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  autoplay?: boolean;
  showMetadata?: boolean;
  className?: string;
  onPlay?: () => void;
  onExternalClick?: () => void;
}

export function LiteSocialEmbed({
  url,
  localVideo,
  type,
  aspectRatio = '16:9',
  autoplay = false,
  showMetadata = true,
  className = '',
  onPlay,
  onExternalClick
}: SocialEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [embedData, setEmbedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchEmbedData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/social/embed-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type })
      });

      const result = await response.json();
      
      if (result.success) {
        setEmbedData(result.data);
        setIsLoaded(true);
      } else {
        setError(result.error || 'Failed to load embed data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Embed data fetch failed:', err);
    }
  }, [url, type]);

  useEffect(() => {
    if (url && !isLoaded && !localVideo) {
      fetchEmbedData();
    }
  }, [url, isLoaded, localVideo, fetchEmbedData]);

  useEffect(() => {
    // Track video engagement for GA4
    if (isPlaying) {
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'video_start', {
          video_title: embedData?.title || localVideo?.title || 'Social Video',
          video_provider: type,
          video_url: url || 'local'
        });
      }
    }
  }, [isPlaying, embedData?.title, localVideo?.title, type, url]);

  const handlePlayClick = () => {
    if (localVideo && videoRef.current) {
      // Local video playback
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else if (url) {
      // External embed loading
      setIsPlaying(true);
      setIsLoaded(true);
    }
    
    onPlay?.();
  };

  const handleExternalClick = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      
      // Track outbound click
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'click', {
          event_category: 'outbound',
          event_label: url,
          transport_type: 'beacon'
        });
      }
    }
    
    onExternalClick?.();
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-video';
      case '9:16': return 'aspect-[9/16]';
      case '1:1': return 'aspect-square';
      case '4:3': return 'aspect-[4/3]';
      default: return 'aspect-video';
    }
  };

  const getPlatformIcon = () => {
    switch (type) {
      case 'instagram': return <Instagram className="h-5 w-5" />;
      case 'youtube': return <Youtube className="h-5 w-5" />;
      case 'tiktok': return <Video className="h-5 w-5" />;
      case 'local': return <Video className="h-5 w-5" />;
      default: return <Video className="h-5 w-5" />;
    }
  };

  const getPlatformColor = () => {
    switch (type) {
      case 'instagram': return 'from-purple-500 to-pink-500';
      case 'youtube': return 'from-red-500 to-red-600';
      case 'tiktok': return 'from-black to-gray-800';
      case 'facebook': return 'from-blue-600 to-blue-700';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const renderThumbnail = () => {
    const thumbnailUrl = embedData?.thumbnail || localVideo?.thumbnail || '/placeholder-video.jpg';
    const title = embedData?.title || localVideo?.title || 'Social Media Content';

    return (
      <div className="relative group cursor-pointer" onClick={handlePlayClick}>
        {/* Thumbnail Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white bg-opacity-90 backdrop-blur-sm rounded-full p-4 shadow-lg"
          >
            <Play className="h-8 w-8 text-gray-800 fill-current" />
          </motion.div>
        </div>

        {/* Duration Badge */}
        {(embedData?.duration || localVideo?.duration) && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {embedData?.duration || localVideo?.duration}
          </div>
        )}

        {/* Platform Badge */}
        <div className={`absolute top-2 left-2 bg-gradient-to-r ${getPlatformColor()} text-white p-2 rounded-full shadow-lg`}>
          {getPlatformIcon()}
        </div>
      </div>
    );
  };

  const renderFullEmbed = () => {
    if (localVideo) {
      return (
        <video
          ref={videoRef}
          className="w-full h-full object-cover rounded-lg"
          controls
          poster={localVideo.thumbnail}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        >
          <source src={localVideo.src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }

    // External embed iframes
    const embedUrls: Record<string, (url: string) => string> = {
      youtube: (url) => url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/'),
      instagram: (url) => `${url}embed/`,
      tiktok: (url) => url.replace('/video/', '/embed/'),
      facebook: (url) => `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`
    };

    const embedUrl = embedUrls[type]?.(url!) || url;

    return (
      <iframe
        src={embedUrl}
        className="w-full h-full rounded-lg"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="lazy"
        title={embedData?.title || 'Social Media Content'}
      />
    );
  };

  const renderError = () => (
    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center rounded-lg">
      <Video className="h-12 w-12 text-gray-400 mb-2" />
      <p className="text-gray-600 text-sm text-center mb-2">Content unavailable</p>
      <p className="text-gray-500 text-xs text-center">{error}</p>
      {url && (
        <Button variant="outline" size="sm" onClick={handleExternalClick} className="mt-2">
          <ExternalLink className="h-3 w-3 mr-1" />
          View Original
        </Button>
      )}
    </div>
  );

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        {/* Video Container */}
        <div ref={containerRef} className={`relative ${getAspectRatioClass()} bg-gray-200`}>
          {error ? (
            renderError()
          ) : isPlaying || isLoaded ? (
            renderFullEmbed()
          ) : (
            renderThumbnail()
          )}
        </div>

        {/* Metadata */}
        {showMetadata && (embedData || localVideo) && (
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm line-clamp-2">
                {embedData?.title || localVideo?.title}
              </h3>
              <div className="flex gap-2 ml-2">
                {url && (
                  <Button variant="ghost" size="sm" onClick={handleExternalClick}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="sm">
                  <Share2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {embedData?.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {embedData.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs capitalize">
                  {type}
                </Badge>
                {embedData?.author && (
                  <span>@{embedData.author}</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {localVideo?.fileSize && (
                  <span>{localVideo.fileSize}</span>
                )}
                {embedData?.views && (
                  <span>{embedData.views} views</span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Schema.org VideoObject generator for local videos
export function generateVideoSchema(localVideo: {
  src: string;
  thumbnail: string;
  title: string;
  description?: string;
  duration?: string;
  uploadDate?: string;
  contentUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: localVideo.title,
    description: localVideo.description || '',
    thumbnailUrl: localVideo.thumbnail,
    contentUrl: localVideo.contentUrl || localVideo.src,
    embedUrl: localVideo.src,
    uploadDate: localVideo.uploadDate || new Date().toISOString(),
    duration: localVideo.duration,
    publisher: {
      '@type': 'Organization',
      name: 'Yalla London',
      logo: {
        '@type': 'ImageObject',
        url: '/images/yalla-london-logo.svg'
      }
    }
  };
}
