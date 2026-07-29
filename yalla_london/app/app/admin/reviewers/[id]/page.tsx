'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout';
import {
  UserCheck, ArrowLeft, Save, Mail, Clock, CheckCircle, XCircle,
  FileText, Calendar, BarChart3, Link as LinkIcon, Globe, Linkedin,
  Twitter, Camera, Shield,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Reviewer {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  profile_photo: string | null;
  expertise: string[];
  linkedin_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  status: 'pending' | 'active' | 'suspended';
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  content_reviews?: {
    id: string;
    status: string;
    blog_post?: { id: string; title_en: string; slug: string } | null;
    article_draft?: { id: string; keyword: string } | null;
    created_at: string;
    completed_at: string | null;
    time_to_review_seconds: number | null;
  }[];
}

interface ReviewStats {
  total: number;
  approved: number;
  pending: number;
  avgTimeMinutes: number;
}

export default function ReviewerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [reviewer, setReviewer] = useState<Reviewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [stats, setStats] = useState<ReviewStats | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    expertise: [] as string[],
    linkedin_url: '',
    twitter_url: '',
    website_url: '',
  });
  const [expertiseInput, setExpertiseInput] = useState('');

  const fetchReviewer = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reviewer/admin/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setReviewer(data.reviewer);
        setFormData({
          name: data.reviewer.name || '',
          bio: data.reviewer.bio || '',
          expertise: data.reviewer.expertise || [],
          linkedin_url: data.reviewer.linkedin_url || '',
          twitter_url: data.reviewer.twitter_url || '',
          website_url: data.reviewer.website_url || '',
        });

        // Calculate stats
        const reviews = data.reviewer.content_reviews || [];
        const approved = reviews.filter((r: any) => r.status === 'approved').length;
        const pending = reviews.filter((r: any) => r.status === 'pending').length;
        const avgTime =
          reviews
            .filter((r: any) => r.time_to_review_seconds)
            .reduce((sum: number, r: any) => sum + (r.time_to_review_seconds || 0), 0) /
            Math.max(reviews.filter((r: any) => r.time_to_review_seconds).length, 1) /
            60;

        setStats({
          total: reviews.length,
          approved,
          pending,
          avgTimeMinutes: Math.round(avgTime),
        });
      } else if (res.status === 404) {
        router.push('/admin/reviewers');
      }
    } catch (err) {
      console.error('Failed to fetch reviewer:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchReviewer();
  }, [fetchReviewer]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/reviewer/admin/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setEditMode(false);
        fetchReviewer();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save changes');
      }
    } catch (err) {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    try {
      const res = await fetch(`/api/reviewer/admin/${params.id}/verify`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchReviewer();
      }
    } catch (err) {
      console.error('Failed to verify:', err);
    }
  };

  const addExpertise = () => {
    if (expertiseInput.trim() && !formData.expertise.includes(expertiseInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        expertise: [...prev.expertise, expertiseInput.trim()],
      }));
      setExpertiseInput('');
    }
  };

  const removeExpertise = (exp: string) => {
    setFormData((prev) => ({
      ...prev,
      expertise: prev.expertise.filter((e) => e !== exp),
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4" /> Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4" /> Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4" /> Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <MophyAdminLayout pageTitle="Reviewer Details">
        <div className="p-8 text-center text-gray-500">Loading reviewer...</div>
      </MophyAdminLayout>
    );
  }

  if (!reviewer) {
    return (
      <MophyAdminLayout pageTitle="Reviewer Not Found">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Reviewer not found</p>
          <Link href="/admin/reviewers" className="text-green-600 hover:underline">
            Back to Reviewers
          </Link>
        </div>
      </MophyAdminLayout>
    );
  }

  return (
    <MophyAdminLayout pageTitle={`Reviewer: ${reviewer.name}`}>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/reviewers"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{reviewer.name}</h1>
              <p className="text-gray-500">{reviewer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(reviewer.status)}
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex flex-col items-center text-center">
                {reviewer.profile_photo ? (
                  <Image
                    src={reviewer.profile_photo}
                    alt={reviewer.name}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full object-cover mb-4 ring-4 ring-green-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-bold text-2xl mb-4">
                    {reviewer.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                )}

                {reviewer.verified_at && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full mb-4">
                    <Shield className="w-4 h-4" />
                    Verified Expert
                  </div>
                )}

                {!reviewer.verified_at && reviewer.status === 'active' && (
                  <button
                    onClick={handleVerify}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full mb-4 hover:bg-blue-200 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Mark as Verified
                  </button>
                )}

                <div className="w-full mt-4 space-y-2 text-left">
                  {editMode ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </>
                  ) : null}
                </div>
              </div>

              {/* Bio */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                {editMode ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Brief professional bio..."
                  />
                ) : (
                  <p className="text-gray-600 text-sm">
                    {reviewer.bio || 'No bio provided'}
                  </p>
                )}
              </div>

              {/* Expertise */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Expertise</label>
                {editMode ? (
                  <>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={expertiseInput}
                        onChange={(e) => setExpertiseInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                        placeholder="Add expertise..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={addExpertise}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.expertise.map((exp) => (
                        <span
                          key={exp}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                        >
                          {exp}
                          <button
                            onClick={() => removeExpertise(exp)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {reviewer.expertise?.length > 0 ? (
                      reviewer.expertise.map((exp) => (
                        <span
                          key={exp}
                          className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                        >
                          {exp}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">No expertise listed</span>
                    )}
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="mt-6 space-y-3">
                <label className="block text-sm font-medium text-gray-700">Social Links</label>
                {editMode ? (
                  <>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={formData.linkedin_url}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, linkedin_url: e.target.value }))
                        }
                        placeholder="LinkedIn URL"
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div className="relative">
                      <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={formData.twitter_url}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, twitter_url: e.target.value }))
                        }
                        placeholder="X/Twitter URL"
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={formData.website_url}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, website_url: e.target.value }))
                        }
                        placeholder="Website URL"
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    {reviewer.linkedin_url && (
                      <a
                        href={reviewer.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Linkedin className="w-4 h-4" /> LinkedIn
                      </a>
                    )}
                    {reviewer.twitter_url && (
                      <a
                        href={reviewer.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Twitter className="w-4 h-4" /> X/Twitter
                      </a>
                    )}
                    {reviewer.website_url && (
                      <a
                        href={reviewer.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Globe className="w-4 h-4" /> Website
                      </a>
                    )}
                    {!reviewer.linkedin_url && !reviewer.twitter_url && !reviewer.website_url && (
                      <span className="text-gray-400 text-sm">No social links</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Reviews */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Total Reviews</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-500">Approved</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{stats?.approved || 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-500">Pending</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-500">Avg Time</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{stats?.avgTimeMinutes || 0}m</p>
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Reviews</h2>
              </div>
              {reviewer.content_reviews && reviewer.content_reviews.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {reviewer.content_reviews.slice(0, 10).map((review) => (
                    <div key={review.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {review.blog_post?.title_en ||
                              review.article_draft?.keyword ||
                              'Untitled Content'}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                            {review.time_to_review_seconds && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.round(review.time_to_review_seconds / 60)}m review time
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            review.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : review.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : review.status === 'changes_requested'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {review.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No reviews yet
                </div>
              )}
              {reviewer.content_reviews && reviewer.content_reviews.length > 10 && (
                <div className="px-6 py-3 border-t border-gray-200 text-center">
                  <Link
                    href={`/admin/content-reviews?reviewer=${reviewer.id}`}
                    className="text-sm text-green-600 hover:underline"
                  >
                    View all {reviewer.content_reviews.length} reviews
                  </Link>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Created</span>
                  <p className="font-medium text-gray-900">
                    {new Date(reviewer.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated</span>
                  <p className="font-medium text-gray-900">
                    {new Date(reviewer.updated_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Verified</span>
                  <p className="font-medium text-gray-900">
                    {reviewer.verified_at
                      ? new Date(reviewer.verified_at).toLocaleString()
                      : 'Not verified'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Reviewer ID</span>
                  <p className="font-mono text-xs text-gray-600">{reviewer.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MophyAdminLayout>
  );
}
