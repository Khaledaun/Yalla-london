'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout';
import {
  FileText, Search, Clock, CheckCircle, XCircle, AlertCircle,
  Eye, User, Calendar, Filter, MoreVertical, ExternalLink,
  RefreshCw, MessageSquare, Timer,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface ContentReview {
  id: string;
  contentType: 'blog_post' | 'article_draft';
  contentId: string;
  contentTitle: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'revision_requested';
  reviewer: {
    id: string;
    name: string;
    email: string;
    profilePicture: string | null;
  } | null;
  assignedAt: string;
  openedAt: string | null;
  completedAt: string | null;
  reviewTimeMinutes: number | null;
  feedback: string | null;
  createdAt: string;
}

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'approved' | 'rejected' | 'revision_requested';

export default function ContentReviewsPage() {
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get('status') as StatusFilter) || 'all';
  
  const [reviews, setReviews] = useState<ContentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      
      const res = await fetch(`/api/reviewer/admin/reviews?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setReviews(json.data || []);
      } else {
        // Mock data for demo
        setReviews([
          {
            id: '1',
            contentType: 'blog_post',
            contentId: 'post-1',
            contentTitle: 'Best Halal Restaurants in London 2026',
            status: 'pending',
            reviewer: {
              id: 'r1',
              name: 'Sarah Ahmed',
              email: 'sarah@example.com',
              profilePicture: null,
            },
            assignedAt: '2026-07-01T10:00:00Z',
            openedAt: null,
            completedAt: null,
            reviewTimeMinutes: null,
            feedback: null,
            createdAt: '2026-07-01T10:00:00Z',
          },
          {
            id: '2',
            contentType: 'blog_post',
            contentId: 'post-2',
            contentTitle: 'Luxury Hotels Near Hyde Park',
            status: 'in_progress',
            reviewer: {
              id: 'r2',
              name: 'Mohammed Ali',
              email: 'mohammed@example.com',
              profilePicture: null,
            },
            assignedAt: '2026-06-30T14:00:00Z',
            openedAt: '2026-06-30T15:30:00Z',
            completedAt: null,
            reviewTimeMinutes: null,
            feedback: null,
            createdAt: '2026-06-30T14:00:00Z',
          },
          {
            id: '3',
            contentType: 'blog_post',
            contentId: 'post-3',
            contentTitle: 'Top Afternoon Tea Spots in Mayfair',
            status: 'approved',
            reviewer: {
              id: 'r1',
              name: 'Sarah Ahmed',
              email: 'sarah@example.com',
              profilePicture: null,
            },
            assignedAt: '2026-06-28T09:00:00Z',
            openedAt: '2026-06-28T10:00:00Z',
            completedAt: '2026-06-28T11:30:00Z',
            reviewTimeMinutes: 90,
            feedback: 'Great content! Added some personal touches about the service quality.',
            createdAt: '2026-06-28T09:00:00Z',
          },
          {
            id: '4',
            contentType: 'article_draft',
            contentId: 'draft-1',
            contentTitle: 'Family-Friendly Activities in Westminster',
            status: 'revision_requested',
            reviewer: {
              id: 'r3',
              name: 'Fatima Hassan',
              email: 'fatima@example.com',
              profilePicture: null,
            },
            assignedAt: '2026-06-27T11:00:00Z',
            openedAt: '2026-06-27T12:00:00Z',
            completedAt: '2026-06-27T13:45:00Z',
            reviewTimeMinutes: 105,
            feedback: 'Needs more specific recommendations for young children. Also, please verify opening hours.',
            createdAt: '2026-06-27T11:00:00Z',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  function getStatusBadge(status: ContentReview['status']) {
    const config = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      in_progress: { icon: RefreshCw, color: 'bg-blue-100 text-blue-700', label: 'In Progress' },
      approved: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Approved' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Rejected' },
      revision_requested: { icon: AlertCircle, color: 'bg-orange-100 text-orange-700', label: 'Revision Requested' },
    };
    const { icon: Icon, color, label } = config[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  async function handleReassign(reviewId: string) {
    if (!confirm('Reassign this review to another reviewer?')) return;
    // API call would go here
    alert('Reassign functionality would open a modal to select a new reviewer');
  }

  async function handleCancel(reviewId: string) {
    if (!confirm('Cancel this review assignment?')) return;
    try {
      const res = await fetch(`/api/reviewer/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchReviews();
      }
    } catch (err) {
      console.error('Failed to cancel review:', err);
    }
  }

  const filteredReviews = reviews.filter((review) => {
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !review.contentTitle.toLowerCase().includes(searchLower) &&
        !review.reviewer?.name.toLowerCase().includes(searchLower) &&
        !review.reviewer?.email.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && review.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const statusCounts = reviews.reduce((acc, review) => {
    acc[review.status] = (acc[review.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <MophyAdminLayout pageTitle="Content Reviews">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Content Reviews</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track and manage content review assignments
            </p>
          </div>
          <button
            onClick={fetchReviews}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'All', count: reviews.length },
            { value: 'pending', label: 'Pending', count: statusCounts.pending || 0 },
            { value: 'in_progress', label: 'In Progress', count: statusCounts.in_progress || 0 },
            { value: 'approved', label: 'Approved', count: statusCounts.approved || 0 },
            { value: 'revision_requested', label: 'Revision Requested', count: statusCounts.revision_requested || 0 },
            { value: 'rejected', label: 'Rejected', count: statusCounts.rejected || 0 },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value as StatusFilter)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                statusFilter === tab.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by content title or reviewer..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No content reviews found</p>
            {(search || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="mt-2 text-sm text-amber-600 hover:text-amber-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(review.status)}
                        <span className="text-xs text-gray-500 capitalize">
                          {review.contentType.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {review.contentTitle}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                        {review.reviewer && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <Link
                              href={`/admin/reviewers/${review.reviewer.id}`}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              {review.reviewer.name}
                            </Link>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Assigned {formatDate(review.assignedAt)}
                        </div>
                        {review.reviewTimeMinutes && (
                          <div className="flex items-center gap-1">
                            <Timer className="w-4 h-4" />
                            Took {formatDuration(review.reviewTimeMinutes)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={review.contentType === 'blog_post' 
                          ? `/admin/content?tab=articles&id=${review.contentId}`
                          : `/admin/content?tab=drafts&id=${review.contentId}`
                        }
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="View content"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedReview === review.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Timeline</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-gray-600">Assigned:</span>
                              <span className="text-gray-900">{formatDate(review.assignedAt)}</span>
                            </div>
                            {review.openedAt && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                <span className="text-gray-600">Opened:</span>
                                <span className="text-gray-900">{formatDate(review.openedAt)}</span>
                              </div>
                            )}
                            {review.completedAt && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-gray-600">Completed:</span>
                                <span className="text-gray-900">{formatDate(review.completedAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {review.feedback && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Reviewer Feedback</h4>
                            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                              <MessageSquare className="w-4 h-4 text-gray-400 inline mr-2" />
                              {review.feedback}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        {review.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleReassign(review.id)}
                              className="px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              Reassign
                            </button>
                            <button
                              onClick={() => handleCancel(review.id)}
                              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        <Link
                          href={`/reviewer/review/${review.id}`}
                          target="_blank"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Review Page
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MophyAdminLayout>
  );
}
