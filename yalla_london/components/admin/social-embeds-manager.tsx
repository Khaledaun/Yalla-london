
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Plus, 
  ExternalLink, 
  Trash2, 
  BarChart3, 
  RefreshCw, 
  Copy,
  Check
} from 'lucide-react'
import { extractEmbedInfo } from '@/lib/social-embed-utils'
import { LiteSocialEmbed } from '@/components/social/lite-social-embed'
import { useToast } from '@/components/ui/use-toast'

interface SocialEmbed {
  id: string
  platform: string
  url: string
  embedId: string
  thumbnail?: string
  title?: string
  author?: string
  aspectRatio: string
  status: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

export function SocialEmbedsManager() {
  const [embeds, setEmbeds] = useState<SocialEmbed[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [isAddingEmbed, setIsAddingEmbed] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadEmbeds()
  }, [])

  const loadEmbeds = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/social-embeds')
      if (response.ok) {
        const data = await response.json()
        setEmbeds(data)
      }
    } catch (error) {
      console.error('Failed to load embeds:', error)
      toast({
        title: "Error",
        description: "Failed to load social embeds",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddEmbed = async () => {
    if (!newUrl.trim()) return

    setIsAddingEmbed(true)
    try {
      const embedInfo = extractEmbedInfo(newUrl)
      if (!embedInfo) {
        throw new Error('Invalid social media URL')
      }

      const response = await fetch('/api/social-embeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          platform: embedInfo.platform,
          embedId: embedInfo.embedId,
          aspectRatio: embedInfo.aspectRatio,
          thumbnail: embedInfo.thumbnailUrl
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add embed')
      }

      const newEmbed = await response.json()
      setEmbeds(prev => [newEmbed, ...prev])
      setNewUrl('')
      
      toast({
        title: "Success",
        description: "Social embed added successfully"
      })
    } catch (error) {
      console.error('Failed to add embed:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add embed",
        variant: "destructive"
      })
    } finally {
      setIsAddingEmbed(false)
    }
  }

  const handleDeleteEmbed = async (id: string) => {
    try {
      const response = await fetch(`/api/social-embeds/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete embed')
      }

      setEmbeds(prev => prev.filter(embed => embed.id !== id))
      
      toast({
        title: "Success",
        description: "Social embed deleted successfully"
      })
    } catch (error) {
      console.error('Failed to delete embed:', error)
      toast({
        title: "Error",
        description: "Failed to delete embed",
        variant: "destructive"
      })
    }
  }

  const copyEmbedCode = async (embed: SocialEmbed) => {
    const embedCode = `<LiteSocialEmbed 
  id="${embed.id}"
  platform="${embed.platform}"
  embedId="${embed.embedId}"
  url="${embed.url}"
  ${embed.thumbnail ? `thumbnail="${embed.thumbnail}"` : ''}
  ${embed.title ? `title="${embed.title}"` : ''}
  aspectRatio="${embed.aspectRatio}"
/>`

    try {
      await navigator.clipboard.writeText(embedCode)
      setCopiedId(embed.id)
      setTimeout(() => setCopiedId(null), 2000)
      
      toast({
        title: "Copied",
        description: "Embed code copied to clipboard"
      })
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getPlatformBadgeColor = (platform: string) => {
    const colors = {
      instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
      tiktok: 'bg-black',
      youtube: 'bg-red-600',
      facebook: 'bg-blue-600'
    }
    return colors[platform as keyof typeof colors] || 'bg-gray-600'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎬 Social Media Embeds Manager
            <Badge variant="outline" className="ml-auto">
              Phase 3.2
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Paste Instagram, TikTok, YouTube, or Facebook URL..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleAddEmbed}
              disabled={isAddingEmbed || !newUrl.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Embed
            </Button>
          </div>

          {embeds.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No social embeds yet</p>
              <p className="text-sm">Add Instagram, TikTok, YouTube, or Facebook URLs to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {embeds.slice(0, 3).map((embed) => (
                  <LiteSocialEmbed
                    key={embed.id}
                    id={embed.id}
                    platform={embed.platform}
                    embedId={embed.embedId}
                    url={embed.url}
                    thumbnail={embed.thumbnail}
                    title={embed.title}
                    author={embed.author}
                    aspectRatio={embed.aspectRatio}
                  />
                ))}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {embeds.map((embed) => (
                    <TableRow key={embed.id}>
                      <TableCell>
                        <Badge className={`${getPlatformBadgeColor(embed.platform)} text-white`}>
                          {embed.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <a 
                          href={embed.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-xs"
                        >
                          {embed.url.substring(0, 50)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          {embed.usageCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={embed.status === 'active' ? 'default' : 'secondary'}>
                          {embed.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyEmbedCode(embed)}
                          >
                            {copiedId === embed.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteEmbed(embed.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
