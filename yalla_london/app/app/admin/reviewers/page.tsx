'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout';
import {
  UserCheck, Search, Plus, Mail, Clock, CheckCircle, XCircle,
  MoreVertical, Eye, Edit, Trash2, Send, Filter,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Reviewer {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  profile_photo: string | null;
  expertise: string[];
  status: 'pending' | 'active' | 'suspended';
  verified_at: string | null;
  created_at: string;
  _count?: {
    content_reviews: number;
  };
}

type StatusFilter = 'all' | 'pending' | 'active' | 'suspended';

export default function ReviewersAdminPage() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const fetchReviewers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      
      const res = await fetch(`/api/reviewer/admin/list?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReviewers(data.reviewers || []);
      }
    } catch (err) {
      console.error('Failed to fetch reviewers:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchReviewers();
  }, [fetchReviewers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    try {
      const res = await fetch('/api/reviewer/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      if (res.ok) {
        setInviteEmail('');
        setShowInviteModal(false);
        fetchReviewers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      alert('Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleStatusChange = async (reviewerId: string, newStatus: 'active' | 'suspended') => {
    try {
      const res = await fetch(`/api/reviewer/admin/${reviewerId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchReviewers();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
    setActionMenu(null);
  };

  const handleDelete = async (reviewerId: string) => {
    if (!confirm('Are you sure you want to delete this reviewer? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/reviewer/admin/${reviewerId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchReviewers();
      }
    } catch (err) {
      console.error('Failed to delete reviewer:', err);
    }
    setActionMenu(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" /> Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <MophyAdminLayout pageTitle="Reviewer Management">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-7 h-7 text-green-600" />
              Reviewer Management
            </h1>
            <p className="text-gray-500 mt-1">
              Manage expert reviewers for E-E-A-T content verification
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Invite Reviewer
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Reviewers</p>
            <p className="text-2xl font-bold text-gray-900">{reviewers.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {reviewers.filter((r) => r.status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {reviewers.filter((r) => r.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Reviews</p>
            <p className="text-2xl font-bold text-blue-600">
              {reviewers.reduce((sum, r) => sum + (r._count?.content_reviews || 0), 0)}
            </p>
          </div>
        </div>

        {/* Reviewers Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading reviewers...</div>
          ) : reviewers.length === 0 ? (
            <div className="p-8 text-center">
              <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No reviewers found</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Invite Your First Reviewer
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reviewer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Expertise
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reviews
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviewers.map((reviewer) => (
                    <tr key={reviewer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {reviewer.profile_photo ? (
                            <Image
                              src={reviewer.profile_photo}
                              alt={reviewer.name}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-semibold text-sm">
                              {reviewer.name
                                .split(' ')
                                .map((w) => w[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{reviewer.name}</p>
                            <p className="text-sm text-gray-500">{reviewer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {reviewer.expertise?.slice(0, 2).map((exp) => (
                            <span
                              key={exp}
                              className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                            >
                              {exp}
                            </span>
                          ))}
                          {reviewer.expertise?.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{reviewer.expertise.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(reviewer.status)}</td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-900">
                          {reviewer._count?.content_reviews || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(reviewer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2 relative">
                          <Link
                            href={`/admin/reviewers/${reviewer.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Link>
                          <button
                            onClick={() =>
                              setActionMenu(actionMenu === reviewer.id ? null : reviewer.id)
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {actionMenu === reviewer.id && (
                            <div className="absolute right-0 top-10 z-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                              <Link
                                href={`/admin/reviewers/${reviewer.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" /> Edit Profile
                              </Link>
                              {reviewer.status === 'active' ? (
                                <button
                                  onClick={() => handleStatusChange(reviewer.id, 'suspended')}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-gray-50 w-full text-left"
                                >
                                  <XCircle className="w-4 h-4" /> Suspend
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(reviewer.id, 'active')}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-50 w-full text-left"
                                >
                                  <CheckCircle className="w-4 h-4" /> Activate
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(reviewer.id)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 w-full text-left"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                Invite Reviewer
              </h2>
              <form onSubmit={handleInvite}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="reviewer@example.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    The reviewer will receive an email with a link to complete their profile and
                    start reviewing content.
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {inviteLoading ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MophyAdminLayout>
  );
}
