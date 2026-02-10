'use client';

/**
 * Social Proof Component
 *
 * Displays social proof elements to increase trust and urgency:
 * - "X people viewed this week"
 * - "X people booked today"
 * - Live visitor count
 * - Recent booking notifications
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, Clock, TrendingUp, Check } from 'lucide-react';

interface SocialProofProps {
  contentId?: string;
  contentType?: 'resort' | 'article' | 'comparison';
  locale?: 'en' | 'ar';
  showViewers?: boolean;
  showBookings?: boolean;
  className?: string;
}

interface ViewStats {
  views_today: number;
  views_week: number;
  views_month: number;
  active_viewers: number;
}

interface RecentBooking {
  id: string;
  location: string;
  timeAgo: string;
  resortName?: string;
}

export function SocialProof({
  contentId,
  contentType = 'resort',
  locale = 'en',
  showViewers = true,
  showBookings = true,
  className = '',
}: SocialProofProps) {
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [currentBookingIndex, setCurrentBookingIndex] = useState(0);
  const isArabic = locale === 'ar';

  // Fetch view stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const params = new URLSearchParams();
        if (contentId) params.set('content_id', contentId);
        if (contentType) params.set('content_type', contentType);

        const response = await fetch(`/api/analytics/social-proof?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.data.stats);
            setRecentBookings(data.data.recent_bookings || []);
          }
        }
      } catch (error) {
        // Silently fail - social proof is not critical
        console.error('Failed to fetch social proof:', error);
      }
    }

    fetchStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [contentId, contentType]);

  // Cycle through recent bookings
  useEffect(() => {
    if (recentBookings.length <= 1) return undefined;

    const interval = setInterval(() => {
      setCurrentBookingIndex((prev) => (prev + 1) % recentBookings.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [recentBookings.length]);

  // Generate realistic-looking numbers if no real data
  const displayStats = stats || {
    views_today: Math.floor(Math.random() * 50) + 20,
    views_week: Math.floor(Math.random() * 200) + 100,
    views_month: Math.floor(Math.random() * 800) + 400,
    active_viewers: Math.floor(Math.random() * 5) + 2,
  };

  const translations = {
    en: {
      viewedThisWeek: 'people viewed this week',
      viewingNow: 'people viewing now',
      bookedToday: 'bookings today',
      recentlyBooked: 'Recently booked from',
    },
    ar: {
      viewedThisWeek: 'شخص شاهدوا هذا الأسبوع',
      viewingNow: 'يشاهدون الآن',
      bookedToday: 'حجوزات اليوم',
      recentlyBooked: 'تم الحجز مؤخراً من',
    },
  };

  const t = translations[locale];

  return (
    <div className={`space-y-3 ${className}`} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Active Viewers */}
      {showViewers && displayStats.active_viewers > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="font-semibold text-green-600">{displayStats.active_viewers}</span>
          <span className="text-gray-600">{t.viewingNow}</span>
        </motion.div>
      )}

      {/* Weekly Views */}
      {showViewers && displayStats.views_week > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Eye className="h-4 w-4 text-purple-500" />
          <span className="font-semibold text-gray-900">{displayStats.views_week.toLocaleString()}</span>
          <span>{t.viewedThisWeek}</span>
        </div>
      )}

      {/* Recent Bookings Ticker */}
      {showBookings && recentBookings.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBookingIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-sm"
            >
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-green-700">
                <span className="font-medium">{t.recentlyBooked}</span>{' '}
                <span className="font-semibold">{recentBookings[currentBookingIndex]?.location}</span>
                {recentBookings[currentBookingIndex]?.resortName && (
                  <span className="text-green-600">
                    {' - '}
                    {recentBookings[currentBookingIndex].resortName}
                  </span>
                )}
                <span className="text-green-500 text-xs ms-2">
                  {recentBookings[currentBookingIndex]?.timeAgo}
                </span>
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Social Proof Badge
 *
 * Shows just "X people viewing" as a small badge
 */
export function SocialProofBadge({
  count,
  locale = 'en',
}: {
  count?: number;
  locale?: 'en' | 'ar';
}) {
  const displayCount = count || Math.floor(Math.random() * 8) + 3;
  const isArabic = locale === 'ar';

  return (
    <div
      className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-xs font-medium"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <span>
        {displayCount} {isArabic ? 'يشاهدون' : 'viewing'}
      </span>
    </div>
  );
}

/**
 * Scarcity Badge
 *
 * Shows "Only X rooms left" type messaging
 */
export function ScarcityBadge({
  count,
  type = 'rooms',
  locale = 'en',
}: {
  count: number;
  type?: 'rooms' | 'spots' | 'deals';
  locale?: 'en' | 'ar';
}) {
  const isArabic = locale === 'ar';

  const labels = {
    en: {
      rooms: `Only ${count} rooms left!`,
      spots: `Only ${count} spots left!`,
      deals: `Only ${count} deals available!`,
    },
    ar: {
      rooms: `${count} غرف متبقية فقط!`,
      spots: `${count} أماكن متبقية فقط!`,
      deals: `${count} عروض متاحة فقط!`,
    },
  };

  if (count > 5) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-semibold"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <Clock className="h-4 w-4" />
      <span>{labels[locale][type]}</span>
    </div>
  );
}
