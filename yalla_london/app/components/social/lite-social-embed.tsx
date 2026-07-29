
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, ExternalLink, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import { trackEmbedEvent, generateEmbedCode } from '@/lib/social-embed-utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface LiteSocialEmbedProps {
  id: string
  platform: string
  embedId: string
  url: string
  thumbnail?: string
  title?: string
  author?: string
  aspectRatio?: string
  className?: string
}

export function LiteSocialEmbed({
  id,
  platform,
  embedId,
  url,
  thumbnail,
  title,
  author,
  aspectRatio = '16:9',
  className = ''
}: LiteSocialEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [embedContent, setEmbedContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Get aspect ratio class
  const getAspectRatioClass = (ratio: string) => {
    switch (ratio) {
      case '1:1': return 'aspect-square'
      case '9:16': return 'aspect-[9/16]'
      case '4:3': return 'aspect-[4/3]'
      default: return 'aspect-video' // 16:9
    }
  }

  const handleLoadEmbed = async () => {
    setIsLoading(true)
    trackEmbedEvent(platform, 'load_attempt', embedId)

    try {
      // For platforms that need API calls, make them here
      const embedCode = generateEmbedCode(platform, embedId)
      setEmbedContent(embedCode)
      setIsLoaded(true)
      setShowModal(true)
      
      // Update usage count
      await fetch(`/api/social-embeds/${id}/track-usage`, {
        method: 'POST'
      })
      
      trackEmbedEvent(platform, 'load_success', embedId)
    } catch (error) {
      console.error('Failed to load embed:', error)
      trackEmbedEvent(platform, 'load_error', embedId)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenOriginal = () => {
    trackEmbedEvent(platform, 'open_original', embedId)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const platformColors = {
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
    tiktok: 'bg-black',
    youtube: 'bg-red-600',
    facebook: 'bg-blue-600'
  }

  const platformIcons = {
    instagram: '📷',
    tiktok: '🎵',
    youtube: '▶️',
    facebook: '👥'
  }

  return (
    <>
      <Card className={`group hover:shadow-lg transition-all duration-200 ${className}`}>
        <CardContent className="p-0">
          <div className={`relative ${getAspectRatioClass(aspectRatio)} bg-muted overflow-hidden rounded-t-lg`}>
            {thumbnail && (
              <Image
                src={thumbnail}
                alt={title || 'Social media content'}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-200" />
            
            {/* Platform badge */}
            <Badge 
              className={`absolute top-2 left-2 text-white border-0 ${platformColors[platform as keyof typeof platformColors]}`}
            >
              {platformIcons[platform as keyof typeof platformIcons]} {platform}
            </Badge>
            
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                onClick={handleLoadEmbed}
                disabled={isLoading}
                size="lg"
                className="bg-white/90 text-black hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Play className="w-6 h-6 ml-1" fill="currentColor" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Content info */}
          {(title || author) && (
            <div className="p-4">
              {title && (
                <h3 className="font-semibold line-clamp-2 mb-1">
                  {title}
                </h3>
              )}
              {author && (
                <p className="text-sm text-muted-foreground">
                  by {author}
                </p>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenOriginal}
                className="mt-3 w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Original
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for full embed */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {platformIcons[platform as keyof typeof platformIcons]}
              {title || `${platform} content`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="w-full">
            {embedContent && (
              <div 
                className="w-full"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(embedContent) }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
