'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, Star, Ship, ShieldCheck, Users, Waves, ChevronDown, ArrowUpDown, Compass } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

// ─── Types ──────────────────────────────────────────────────
type Locale = 'en' | 'ar';

interface YachtCard {
  id: string;
  name: string;
  slug: string;
  type: string;
  cabins: number;
  berths: number;
  length: number | null;
  pricePerWeekLow: number | null;
  currency: string;
  rating: number | null;
  reviewCount: number;
  halalCateringAvailable: boolean;
  familyFriendly: boolean;
  crewIncluded: boolean;
  images: string[] | null;
  featured: boolean;
  destinationName: string | null;
}

interface Destination {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  initialYachts: YachtCard[];
  initialTotal: number;
  destinations: Destination[];
  locale: Locale;
}

// ─── Constants ──────────────────────────────────────────────
const YACHT_TYPES = [
  { value: 'SAILBOAT', label: { en: 'Sailing Yacht', ar: 'يخت شراعي' } },
  { value: 'CATAMARAN', label: { en: 'Catamaran', ar: 'كاتاماران' } },
  { value: 'MOTOR_YACHT', label: { en: 'Motor Yacht', ar: 'يخت بمحرك' } },
  { value: 'GULET', label: { en: 'Gulet', ar: 'قوارب تركية' } },
  { value: 'SUPERYACHT', label: { en: 'Superyacht', ar: 'يخت فاخر' } },
  { value: 'POWER_CATAMARAN', label: { en: 'Power Catamaran', ar: 'كاتاماران بمحرك' } },
];

const SORT_OPTIONS = [
  { value: 'newest', label: { en: 'Newest First', ar: 'الأحدث أولاً' } },
  { value: 'price_asc', label: { en: 'Price: Low to High', ar: 'السعر: من الأقل' } },
  { value: 'price_desc', label: { en: 'Price: High to Low', ar: 'السعر: من الأعلى' } },
  { value: 'rating', label: { en: 'Highest Rated', ar: 'الأعلى تقييماً' } },
  { value: 'popular', label: { en: 'Most Popular', ar: 'الأكثر شعبية' } },
];

// ─── Type Badge Helper ──────────────────────────────────────
function getTypeBadge(type: string, locale: Locale): string {
  const found = YACHT_TYPES.find(t => t.value === type);
  return found ? (found.label[locale] || found.label.en) : type;
}

// ─── Filter Sidebar ─────────────────────────────────────────
function FilterPanel({
  destinations,
  locale,
  filters,
  setFilters,
  isOpen,
  onClose,
}: {
  destinations: Destination[];
  locale: Locale;
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;

  const updateFilter = (key: string, value: string) => {
    const next = { ...filters };
    if (value) next[key] = value;
    else delete next[key];
    setFilters(next);
  };

  const clearAll = () => setFilters({});

  return (
    <div className={`
      fixed inset-0 z-40 lg:relative lg:inset-auto lg:z-auto
      ${isOpen ? 'block' : 'hidden lg:block'}
    `}>
      {/* Mobile overlay */}
      <div className="fixed inset-0 bg-black/30 lg:hidden" onClick={onClose} />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto bg-white rounded-t-2xl shadow-elevated lg:relative lg:bottom-auto lg:max-h-none lg:rounded-xl lg:shadow-card lg:border lg:border-[var(--z-champagne)]">
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--z-champagne)] lg:hidden">
          <h3 className="font-heading font-semibold text-[var(--z-navy)]">{t({ en: 'Filters', ar: 'التصفية' })}</h3>
          <button onClick={onClose} className="p-1"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Destination */}
          <div>
            <label className="text-xs font-heading font-semibold uppercase tracking-wide text-[var(--z-aegean)] mb-2 block">
              {t({ en: 'Destination', ar: 'الوجهة' })}
            </label>
            <select
              value={filters.destination || ''}
              onChange={(e) => updateFilter('destination', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--z-champagne)] text-sm font-body text-[var(--z-navy)] bg-white focus:outline-none focus:border-[var(--z-aegean)]"
            >
              <option value="">{t({ en: 'All Destinations', ar: 'جميع الوجهات' })}</option>
              {destinations.map(d => (
                <option key={d.id} value={d.slug}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Yacht Type */}
          <div>
            <label className="text-xs font-heading font-semibold uppercase tracking-wide text-[var(--z-aegean)] mb-2 block">
              {t({ en: 'Yacht Type', ar: 'نوع اليخت' })}
            </label>
            <div className="space-y-2">
              {YACHT_TYPES.map(type => (
                <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.type === type.value}
                    onChange={(e) => updateFilter('type', e.target.checked ? type.value : '')}
                    className="w-4 h-4 rounded border-[var(--z-champagne)] text-[var(--z-aegean)] focus:ring-[var(--z-aegean)]"
                  />
                  <span className="text-sm font-body text-[var(--z-navy)]">{type.label[locale] || type.label.en}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="text-xs font-heading font-semibold uppercase tracking-wide text-[var(--z-aegean)] mb-2 block">
              {t({ en: 'Price Range (€/week)', ar: 'نطاق السعر (€/أسبوع)' })}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={t({ en: 'Min', ar: 'أدنى' })}
                value={filters.minPrice || ''}
                onChange={(e) => updateFilter('minPrice', e.target.value)}
                className="w-1/2 px-3 py-2 rounded-lg border border-[var(--z-champagne)] text-sm font-mono text-[var(--z-navy)] focus:outline-none focus:border-[var(--z-aegean)]"
              />
              <input
                type="number"
                placeholder={t({ en: 'Max', ar: 'أقصى' })}
                value={filters.maxPrice || ''}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                className="w-1/2 px-3 py-2 rounded-lg border border-[var(--z-champagne)] text-sm font-mono text-[var(--z-navy)] focus:outline-none focus:border-[var(--z-aegean)]"
              />
            </div>
          </div>

          {/* Guests */}
          <div>
            <label className="text-xs font-heading font-semibold uppercase tracking-wide text-[var(--z-aegean)] mb-2 block">
              {t({ en: 'Guests', ar: 'الضيوف' })}
            </label>
            <select
              value={filters.guests || ''}
              onChange={(e) => updateFilter('guests', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--z-champagne)] text-sm font-body text-[var(--z-navy)] bg-white focus:outline-none focus:border-[var(--z-aegean)]"
            >
              <option value="">{t({ en: 'Any', ar: 'أي عدد' })}</option>
              {[2, 4, 6, 8, 10, 12, 16, 20].map(n => (
                <option key={n} value={n}>{n}+ {t({ en: 'guests', ar: 'ضيوف' })}</option>
              ))}
            </select>
          </div>

          {/* Feature Toggles */}
          <div>
            <label className="text-xs font-heading font-semibold uppercase tracking-wide text-[var(--z-aegean)] mb-3 block">
              {t({ en: 'Features', ar: 'المميزات' })}
            </label>
            <div className="space-y-3">
              {[
                { key: 'halal', icon: ShieldCheck, label: { en: 'Halal Catering', ar: 'طعام حلال' } },
                { key: 'family', icon: Users, label: { en: 'Family Friendly', ar: 'مناسب للعائلات' } },
                { key: 'crew', icon: Users, label: { en: 'Crew Included', ar: 'مع طاقم' } },
              ].map(toggle => (
                <label key={toggle.key} className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-sm font-body text-[var(--z-navy)]">
                    <toggle.icon size={16} className="text-[var(--z-aegean)]" />
                    {toggle.label[locale] || toggle.label.en}
                  </span>
                  <div
                    onClick={() => updateFilter(toggle.key, filters[toggle.key] === 'true' ? '' : 'true')}
                    className={`w-10 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${
                      filters[toggle.key] === 'true' ? 'bg-[var(--z-aegean)]' : 'bg-[var(--z-champagne)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      filters[toggle.key] === 'true' ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Clear all */}
          {Object.keys(filters).length > 0 && (
            <button onClick={clearAll} className="text-sm font-heading text-[var(--z-coral)] hover:underline">
              {t({ en: 'Clear All Filters', ar: 'مسح جميع التصفيات' })}
            </button>
          )}

          {/* Mobile apply button */}
          <div className="lg:hidden pt-2">
            <button onClick={onClose} className="z-btn-primary w-full py-3">
              {t({ en: 'Apply Filters', ar: 'تطبيق التصفية' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Yacht Card ─────────────────────────────────────────────
function YachtCardComponent({ yacht, locale }: { yacht: YachtCard; locale: Locale }) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;

  return (
    <Link href={`/yachts/${yacht.slug}`} className="group block">
      <div className="bg-white rounded-xl overflow-hidden shadow-card hover:shadow-hover transition-all duration-350">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-[var(--z-midnight)] to-[var(--z-aegean)] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <Ship size={40} className="text-white/15" />
          </div>
          {/* Type badge */}
          <span className="absolute top-3 left-3 bg-[var(--z-navy)]/80 backdrop-blur-sm text-white text-xs font-heading font-semibold px-2.5 py-1 rounded">
            {getTypeBadge(yacht.type, locale)}
          </span>
          {/* Halal badge */}
          {yacht.halalCateringAvailable && (
            <span className="absolute top-3 right-3 bg-[var(--z-mediterranean)]/90 text-white text-xs font-heading font-semibold px-2 py-1 rounded flex items-center gap-1">
              <ShieldCheck size={12} /> {t({ en: 'Halal', ar: 'حلال' })}
            </span>
          )}
          {/* Featured badge */}
          {yacht.featured && (
            <span className="absolute bottom-3 left-3 bg-[var(--z-gold)] text-[var(--z-navy)] text-xs font-heading font-bold px-2.5 py-1 rounded">
              {t({ en: 'Featured', ar: 'مميز' })}
            </span>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-[var(--z-navy)]/0 group-hover:bg-[var(--z-navy)]/10 transition-colors duration-350" />
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-heading text-base font-semibold text-[var(--z-navy)] truncate">{yacht.name}</h3>
          <p className="text-sm font-body text-[var(--z-aegean)] mt-1">
            {yacht.cabins} {t({ en: 'Cabins', ar: 'كبائن' })} · {yacht.berths} {t({ en: 'Guests', ar: 'ضيوف' })}
            {yacht.length && ` · ${yacht.length}m`}
          </p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--z-sand)]">
            <div>
              {yacht.pricePerWeekLow ? (
                <>
                  <span className="font-mono text-base font-medium text-[var(--z-gold)]">
                    {t({ en: 'From ', ar: 'من ' })}€{yacht.pricePerWeekLow.toLocaleString()}
                  </span>
                  <span className="text-xs text-[var(--z-aegean)] font-body"> /{t({ en: 'week', ar: 'أسبوع' })}</span>
                </>
              ) : (
                <span className="text-sm text-[var(--z-aegean)] font-body">{t({ en: 'Price on request', ar: 'السعر عند الطلب' })}</span>
              )}
            </div>
            {yacht.rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star size={14} className="fill-[var(--z-gold)] text-[var(--z-gold)]" />
                <span className="font-heading font-medium text-[var(--z-navy)]">{yacht.rating}</span>
                <span className="text-[var(--z-aegean)] text-xs">({yacht.reviewCount})</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Empty State ────────────────────────────────────────────
function EmptyState({ locale }: { locale: Locale }) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <Compass size={64} className="text-[var(--z-champagne)] mb-4" />
      <h3 className="font-heading text-xl font-semibold text-[var(--z-navy)] mb-2">
        {t({ en: 'No yachts match your criteria', ar: 'لا توجد يخوت تطابق معاييرك' })}
      </h3>
      <p className="font-body text-[var(--z-aegean)] max-w-md">
        {t({ en: 'Try adjusting your filters or browse all our available yachts.', ar: 'حاول تعديل التصفية أو تصفح جميع اليخوت المتاحة.' })}
      </p>
    </div>
  );
}

// ─── Main Search Component ──────────────────────────────────
export function YachtSearchClient({ initialYachts, initialTotal, destinations, locale: serverLocale }: Props) {
  const { language } = useLanguage();
  const locale = (language || serverLocale) as Locale;
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;

  const [yachts, setYachts] = useState<YachtCard[]>(initialYachts);
  const [total, setTotal] = useState(initialTotal);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch yachts when filters change
  const fetchYachts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ sort, ...filters });
      if (searchQuery) params.set('q', searchQuery);
      const res = await fetch(`/api/yachts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setYachts(data.yachts || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.warn('[yacht-search] Fetch failed:', err instanceof Error ? err.message : 'unknown');
    } finally {
      setIsLoading(false);
    }
  }, [filters, sort, searchQuery]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (Object.keys(filters).length > 0 || searchQuery || sort !== 'newest') {
        fetchYachts();
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters, sort, searchQuery, fetchYachts]);

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="bg-[var(--z-pearl)] min-h-screen">
      {/* Page Header */}
      <div className="bg-white border-b border-[var(--z-champagne)]">
        <div className="max-w-[1280px] mx-auto px-6 py-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--z-navy)]">
            {t({ en: 'Find Your Perfect Yacht', ar: 'اعثر على يختك المثالي' })}
          </h1>
          <p className="font-body text-[var(--z-aegean)] mt-2">
            {total} {t({ en: 'yachts available', ar: 'يخت متاح' })}
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-8">
        {/* Search & Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--z-aegean)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t({ en: 'Search yachts by name...', ar: 'ابحث عن يخوت بالاسم...' })}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--z-champagne)] text-sm font-body text-[var(--z-navy)] bg-white focus:outline-none focus:border-[var(--z-aegean)]"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--z-aegean)]" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-lg border border-[var(--z-champagne)] text-sm font-body text-[var(--z-navy)] bg-white focus:outline-none focus:border-[var(--z-aegean)] appearance-none"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label[locale] || opt.label.en}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--z-aegean)] pointer-events-none" />
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--z-champagne)] text-sm font-heading font-medium text-[var(--z-navy)] bg-white"
          >
            <SlidersHorizontal size={16} />
            {t({ en: 'Filters', ar: 'التصفية' })}
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[var(--z-gold)] text-[var(--z-navy)] text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Main Content: Sidebar + Grid */}
        <div className="flex gap-8">
          {/* Filter Sidebar */}
          <div className="w-[280px] flex-shrink-0 hidden lg:block">
            <FilterPanel
              destinations={destinations}
              locale={locale}
              filters={filters}
              setFilters={setFilters}
              isOpen={true}
              onClose={() => {}}
            />
          </div>

          {/* Mobile Filter */}
          <FilterPanel
            destinations={destinations}
            locale={locale}
            filters={filters}
            setFilters={setFilters}
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
          />

          {/* Results Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl overflow-hidden shadow-card animate-pulse">
                    <div className="aspect-[4/3] bg-[var(--z-champagne)]" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-[var(--z-sand)] rounded w-3/4" />
                      <div className="h-4 bg-[var(--z-sand)] rounded w-1/2" />
                      <div className="h-4 bg-[var(--z-sand)] rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : yachts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {yachts.map(yacht => (
                  <YachtCardComponent key={yacht.id} yacht={yacht} locale={locale} />
                ))}
              </div>
            ) : (
              <EmptyState locale={locale} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
