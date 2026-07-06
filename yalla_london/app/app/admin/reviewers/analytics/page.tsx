'use client';

import React, { useState, useEffect } from 'react';
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout';
import {
  BarChart3, Users, FileText, Clock, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Calendar, Activity, Award, Timer,
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalReviewers: number;
    activeReviewers: number;
    totalReviews: number;
    avgReviewTime: number;
    approvalRate: number;
    reviewsThisMonth: number;
    reviewsLastMonth: number;
  };
  topReviewers: Array<{
    id: string;
    name: string;
    profilePicture: string | null;
    reviewCount: number;
    avgTime: number;
    approvalRate: number;
  }>;
  reviewsByStatus: {
    pending: number;
    approved: number;
    rejected: number;
    revision_requested: number;
  };
  reviewTrend: Array<{
    date: string;
    count: number;
  }>;
  avgTimeByExpertise: Array<{
    expertise: string;
    avgTime: number;
    count: number;
  }>;
}

export default function ReviewerAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviewer/admin/analytics?range=${timeRange}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        // Use mock data for demo
        setData({
          overview: {
            totalReviewers: 12,
            activeReviewers: 8,
            totalReviews: 156,
            avgReviewTime: 45,
            approvalRate: 87.5,
            reviewsThisMonth: 34,
            reviewsLastMonth: 28,
          },
          topReviewers: [
            { id: '1', name: 'Sarah Ahmed', profilePicture: null, reviewCount: 24, avgTime: 32, approvalRate: 92 },
            { id: '2', name: 'Mohammed Ali', profilePicture: null, reviewCount: 18, avgTime: 45, approvalRate: 89 },
            { id: '3', name: 'Fatima Hassan', profilePicture: null, reviewCount: 15, avgTime: 38, approvalRate: 94 },
          ],
          reviewsByStatus: {
            pending: 8,
            approved: 136,
            rejected: 7,
            revision_requested: 5,
          },
          reviewTrend: [
            { date: '2026-06-01', count: 5 },
            { date: '2026-06-08', count: 8 },
            { date: '2026-06-15', count: 12 },
            { date: '2026-06-22', count: 9 },
          ],
          avgTimeByExpertise: [
            { expertise: 'Travel', avgTime: 35, count: 45 },
            { expertise: 'Food & Dining', avgTime: 42, count: 38 },
            { expertise: 'Hotels', avgTime: 48, count: 32 },
            { expertise: 'Culture', avgTime: 55, count: 21 },
          ],
        });
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  function getTrendIcon(current: number, previous: number) {
    if (current > previous) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (current < previous) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return null;
  }

  function getTrendPercent(current: number, previous: number): string {
    if (previous === 0) return '+100%';
    const change = ((current - previous) / previous) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  }

  if (loading) {
    return (
      <MophyAdminLayout pageTitle="Review Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
        </div>
      </MophyAdminLayout>
    );
  }

  if (!data) {
    return (
      <MophyAdminLayout pageTitle="Review Analytics">
        <div className="text-center py-12 text-gray-500">
          Failed to load analytics data
        </div>
      </MophyAdminLayout>
    );
  }

  return (
    <MophyAdminLayout pageTitle="Review Analytics">
      <div className="space-y-6">
        {/* Header with Time Range */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Review Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor reviewer performance and content review metrics
            </p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Reviewers</p>
                <p className="text-2xl font-semibold text-gray-900">{data.overview.totalReviewers}</p>
                <p className="text-xs text-gray-500">{data.overview.activeReviewers} active</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Reviews</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold text-gray-900">{data.overview.totalReviews}</p>
                  {getTrendIcon(data.overview.reviewsThisMonth, data.overview.reviewsLastMonth)}
                </div>
                <p className="text-xs text-gray-500">
                  {getTrendPercent(data.overview.reviewsThisMonth, data.overview.reviewsLastMonth)} vs last month
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Review Time</p>
                <p className="text-2xl font-semibold text-gray-900">{formatTime(data.overview.avgReviewTime)}</p>
                <p className="text-xs text-gray-500">from assignment to approval</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approval Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{data.overview.approvalRate}%</p>
                <p className="text-xs text-gray-500">first-pass approval</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Review Status Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Review Status Distribution</h3>
            <div className="space-y-4">
              {Object.entries(data.reviewsByStatus).map(([status, count]) => {
                const total = Object.values(data.reviewsByStatus).reduce((a, b) => a + b, 0);
                const percent = total > 0 ? (count / total) * 100 : 0;
                const colors: Record<string, string> = {
                  pending: 'bg-yellow-500',
                  approved: 'bg-green-500',
                  rejected: 'bg-red-500',
                  revision_requested: 'bg-orange-500',
                };
                const labels: Record<string, string> = {
                  pending: 'Pending',
                  approved: 'Approved',
                  rejected: 'Rejected',
                  revision_requested: 'Revision Requested',
                };
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{labels[status]}</span>
                      <span className="text-gray-900 font-medium">{count} ({percent.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[status]} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Avg Time by Expertise */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Average Review Time by Expertise</h3>
            <div className="space-y-4">
              {data.avgTimeByExpertise.map((item) => {
                const maxTime = Math.max(...data.avgTimeByExpertise.map((e) => e.avgTime));
                const percent = (item.avgTime / maxTime) * 100;
                return (
                  <div key={item.expertise}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.expertise}</span>
                      <span className="text-gray-900 font-medium">
                        {formatTime(item.avgTime)} ({item.count} reviews)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Reviewers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Top Reviewers</h3>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Reviewer</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Reviews</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Avg Time</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Approval Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.topReviewers.map((reviewer, index) => (
                  <tr key={reviewer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-full text-amber-700 font-semibold text-sm">
                          {index + 1}
                        </div>
                        {reviewer.profilePicture ? (
                          <img
                            src={reviewer.profilePicture}
                            alt={reviewer.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{reviewer.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        <FileText className="w-3 h-3" />
                        {reviewer.reviewCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                        <Timer className="w-3 h-3" />
                        {formatTime(reviewer.avgTime)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                        reviewer.approvalRate >= 90
                          ? 'bg-green-100 text-green-700'
                          : reviewer.approvalRate >= 75
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {reviewer.approvalRate >= 90 ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Activity className="w-3 h-3" />
                        )}
                        {reviewer.approvalRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Review Trend (Simple) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Review Activity Trend</h3>
          <div className="flex items-end gap-2 h-32">
            {data.reviewTrend.map((item, index) => {
              const maxCount = Math.max(...data.reviewTrend.map((t) => t.count));
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-amber-500 rounded-t transition-all duration-500 hover:bg-amber-600"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                    title={`${item.count} reviews`}
                  />
                  <span className="text-xs text-gray-500">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MophyAdminLayout>
  );
}
