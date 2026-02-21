'use client';

/**
 * Social Media Command Center
 *
 * Manage and schedule social media posts across all platforms
 * for all sites.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Share2,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Globe,
  Image,
  Link2,
  Send,
  Sparkles,
  BarChart3,
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Repeat2,
  ExternalLink,
} from 'lucide-react';

// Platform icons (using text/emoji for simplicity)
const PLATFORMS = [
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: 'black' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'pink' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'blue' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'sky' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'purple' },
];

interface SocialPost {
  id: string;
  content: string;
  platforms: string[];
  site: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledFor: string | null;
  publishedAt: string | null;
  media: string[];
  link: string | null;
  stats: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
  } | null;
}

interface SocialAccount {
  id: string;
  platform: string;
  name: string;
  handle: string;
  followers: number;
  connected: boolean;
  site: string;
}

export default function SocialMediaPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'posts' | 'accounts' | 'analytics'>('posts');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadSocialData();
  }, []);

  const loadSocialData = async () => {
    setIsLoading(true);
    try {
      const [postsRes, accountsRes] = await Promise.all([
        fetch('/api/admin/command-center/social/posts'),
        fetch('/api/admin/command-center/social/accounts'),
      ]);

      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts || []);
      } else {
        setPosts([]); // No mock data — show honest empty state
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      } else {
        setAccounts([]); // No mock data — show honest empty state
      }
    } catch (error) {
      setPosts([]);
      setAccounts([]);
    }
    setIsLoading(false);
  };

  // Calculate stats
  const totalFollowers = accounts.reduce((sum, a) => sum + a.followers, 0);
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const totalReach = posts.reduce((sum, p) => sum + (p.stats?.reach || 0), 0);

  const filteredPosts = statusFilter === 'all'
    ? posts
    : posts.filter((p) => p.status === statusFilter);

  const getPlatformIcon = (platformId: string) => {
    return PLATFORMS.find((p) => p.id === platformId)?.icon || '📱';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/command-center"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-semibold text-lg flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-600" />
                  Social Media Center
                </h1>
                <p className="text-sm text-gray-500">
                  Manage posts across all platforms
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowComposer(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Create Post
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setSelectedTab('posts')}
              className={`px-4 py-2 border-b-2 ${
                selectedTab === 'posts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setSelectedTab('accounts')}
              className={`px-4 py-2 border-b-2 ${
                selectedTab === 'accounts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Connected Accounts
            </button>
            <button
              onClick={() => setSelectedTab('analytics')}
              className={`px-4 py-2 border-b-2 ${
                selectedTab === 'analytics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total Followers</span>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{totalFollowers.toLocaleString()}</div>
            {totalFollowers > 0 ? (
              <div className="text-sm text-gray-500 mt-1">across all accounts</div>
            ) : (
              <div className="text-sm text-gray-400 mt-1">no accounts connected</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Scheduled</span>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold">{scheduledCount}</div>
            <div className="text-sm text-gray-500 mt-1">posts pending</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Published</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{publishedCount}</div>
            <div className="text-sm text-gray-500 mt-1">this month</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total Reach</span>
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{totalReach > 0 ? `${(totalReach / 1000).toFixed(1)}K` : '—'}</div>
            {totalReach > 0 ? (
              <div className="text-sm text-gray-500 mt-1">all platforms</div>
            ) : (
              <div className="text-sm text-gray-400 mt-1">requires platform APIs</div>
            )}
          </div>
        </div>

        {/* Posts Tab */}
        {selectedTab === 'posts' && (
          <>
            {/* Filters */}
            <div className="flex items-center gap-2 mb-4">
              {['all', 'draft', 'scheduled', 'published', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-sm capitalize ${
                    statusFilter === status
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {post.platforms.map((p) => (
                          <span key={p} className="text-lg" title={p}>
                            {getPlatformIcon(p)}
                          </span>
                        ))}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          post.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : post.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : post.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                      {post.content}
                    </p>

                    {/* Media Preview */}
                    {post.media.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {post.media.slice(0, 3).map((m, i) => (
                          <div
                            key={i}
                            className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center"
                          >
                            <Image className="h-6 w-6 text-gray-400" />
                          </div>
                        ))}
                        {post.media.length > 3 && (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">
                            +{post.media.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Link Preview */}
                    {post.link && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 mb-3">
                        <Link2 className="h-4 w-4" />
                        <span className="truncate">{post.link}</span>
                      </div>
                    )}

                    {/* Site */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <Globe className="h-4 w-4" />
                      {post.site}
                    </div>

                    {/* Schedule/Publish Info */}
                    {post.scheduledFor && post.status === 'scheduled' && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Clock className="h-4 w-4" />
                        Scheduled: {post.scheduledFor}
                      </div>
                    )}

                    {/* Stats for published posts */}
                    {post.stats && post.status === 'published' && (
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {post.stats.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {post.stats.comments}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat2 className="h-4 w-4" />
                          {post.stats.shares}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-100 px-4 py-2 flex justify-between">
                    <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    {post.status === 'draft' && (
                      <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <Send className="h-4 w-4" />
                        Schedule
                      </button>
                    )}
                    <button className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Accounts Tab */}
        {selectedTab === 'accounts' && (
          <div className="space-y-4">
            {PLATFORMS.map((platform) => {
              const platformAccounts = accounts.filter((a) => a.platform === platform.id);

              return (
                <div
                  key={platform.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{platform.icon}</span>
                      <span className="font-semibold">{platform.name}</span>
                    </div>
                    <button className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                      <Plus className="h-4 w-4" />
                      Connect Account
                    </button>
                  </div>

                  {platformAccounts.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {platformAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              {account.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{account.name}</div>
                              <div className="text-sm text-gray-500">@{account.handle}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="font-medium">
                                {account.followers.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">followers</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">{account.site}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {account.connected ? (
                                <span className="flex items-center gap-1 text-green-600 text-sm">
                                  <CheckCircle className="h-4 w-4" />
                                  Connected
                                </span>
                              ) : (
                                <button className="text-blue-600 text-sm">
                                  Reconnect
                                </button>
                              )}
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <ExternalLink className="h-4 w-4 text-gray-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No accounts connected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Analytics Tab */}
        {selectedTab === 'analytics' && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Social Analytics</h3>
            <p className="text-gray-500 mb-4">
              Connect your social accounts to see detailed analytics and insights.
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Connect Accounts
            </button>
          </div>
        )}

        {/* Post Composer Modal */}
        {showComposer && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Create Post</h2>
                  <button
                    onClick={() => setShowComposer(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platforms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((platform) => (
                      <button
                        key={platform.id}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50"
                      >
                        <span className="text-lg">{platform.icon}</span>
                        <span className="text-sm">{platform.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    placeholder="What's on your mind?"
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex justify-between mt-2 text-sm text-gray-500">
                    <span>280 characters remaining</span>
                    <button className="flex items-center gap-1 text-purple-600">
                      <Sparkles className="h-4 w-4" />
                      Generate with AI
                    </button>
                  </div>
                </div>

                {/* Media */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Media
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Image className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      Drop images here or click to upload
                    </p>
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule
                  </label>
                  <div className="flex gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Send className="h-4 w-4" />
                      Post Now
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Calendar className="h-4 w-4" />
                      Schedule
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowComposer(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                  Create Post
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
