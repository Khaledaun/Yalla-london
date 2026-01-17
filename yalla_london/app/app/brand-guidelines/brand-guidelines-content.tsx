'use client';

import { useState } from 'react';
import {
  MapPin, Search, Heart, Star, Clock, CheckCircle, Globe,
  Bookmark, Calendar, MessageCircle, Mail, Share, Image,
  Users, Bell, Settings, Check, X
} from 'lucide-react';

// Brand colors
const colors = {
  navy: '#1A1F36',
  navyLight: '#2D3454',
  coral: '#E8634B',
  coralLight: '#FF7F6B',
  black: '#0A0A0A',
  white: '#FFFFFF',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

// Logo Component
const Logo = ({
  variant = 'default',
  size = 'large',
  className = ''
}: {
  variant?: 'default' | 'light' | 'coral' | 'stacked';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) => {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-4xl',
  };

  const yallaColors = {
    default: 'text-[#1A1F36]',
    light: 'text-white',
    coral: 'text-white',
    stacked: 'text-[#1A1F36]',
  };

  const londonColors = {
    default: 'text-gray-400',
    light: 'text-white/50',
    coral: 'text-white/70',
    stacked: 'text-gray-400',
  };

  const dotColors = {
    default: 'bg-[#E8634B]',
    light: 'bg-[#E8634B]',
    coral: 'bg-white',
    stacked: 'bg-[#E8634B]',
  };

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-1 ${className}`}>
        <span className={`font-extrabold tracking-tight ${sizeClasses[size]} ${yallaColors[variant]}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Yalla
        </span>
        <span className="text-xs font-medium tracking-[0.3em] uppercase text-gray-400">
          London
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-0.5 ${className}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <span className={`font-extrabold tracking-tight ${sizeClasses[size]} ${yallaColors[variant]}`}>
        Yalla
      </span>
      <span className={`font-medium tracking-tight ${sizeClasses[size]} ${londonColors[variant]}`}>
        London
      </span>
      <span className={`w-2 h-2 rounded-full ml-1 ${dotColors[variant]} ${size === 'large' ? 'w-3 h-3' : ''}`}></span>
    </div>
  );
};

// App Icon Component
const AppIcon = ({ inverted = false }: { inverted?: boolean }) => (
  <div className={`w-12 h-12 rounded-xl flex items-center justify-center relative ${inverted ? 'bg-white' : 'bg-[#1A1F36]'}`}>
    <span className={`text-2xl font-extrabold ${inverted ? 'text-[#1A1F36]' : 'text-white'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      Y
    </span>
    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#E8634B] rounded-full"></span>
  </div>
);

// Section Component
const Section = ({
  children,
  dark = false,
  navy = false,
  className = ''
}: {
  children: React.ReactNode;
  dark?: boolean;
  navy?: boolean;
  className?: string;
}) => {
  const bgClass = navy
    ? 'bg-[#1A1F36] text-white'
    : dark
      ? 'bg-gray-900 text-white'
      : 'bg-white text-gray-900';

  return (
    <section className={`px-6 py-16 md:px-20 md:py-24 ${bgClass} ${className}`}>
      {children}
    </section>
  );
};

// Section Header Component
const SectionHeader = ({
  label,
  title,
  description,
  dark = false
}: {
  label: string;
  title: string;
  description: string;
  dark?: boolean;
}) => (
  <div className="mb-12 md:mb-16">
    <div className="text-xs font-semibold tracking-[0.15em] uppercase text-[#E8634B] mb-3">
      {label}
    </div>
    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {title}
    </h2>
    <p className={`text-lg max-w-xl ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
      {description}
    </p>
  </div>
);

export function BrandGuidelinesContent() {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Cover Section */}
      <section className="min-h-screen flex flex-col items-center justify-center bg-[#1A1F36] text-white text-center px-6 py-16 relative">
        <div className="flex items-center gap-1 mb-10" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <span className="text-5xl md:text-6xl font-extrabold tracking-tight">Yalla</span>
          <span className="text-5xl md:text-6xl font-medium text-gray-400 tracking-tight">London</span>
          <span className="w-3 h-3 bg-[#E8634B] rounded-full ml-2 animate-pulse"></span>
        </div>
        <div className="text-sm tracking-[0.2em] uppercase text-gray-400 mb-2">
          Brand Guidelines
        </div>
        <div className="text-xs text-gray-500">
          Version 1.0 — January 2026
        </div>

        {/* Language Toggle */}
        <div className="absolute top-8 right-8 flex gap-2">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              language === 'en' ? 'bg-[#E8634B] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('ar')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              language === 'ar' ? 'bg-[#E8634B] text-white' : 'text-gray-400 hover:text-white'
            }`}
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            عربي
          </button>
        </div>
      </section>

      {/* Logo Section */}
      <Section>
        <SectionHeader
          label="01 — Logo"
          title={language === 'en' ? 'Primary Logo' : 'الشعار الرئيسي'}
          description={language === 'en'
            ? 'The Yalla London wordmark combines confident typography with a subtle energy indicator — the coral dot that represents forward motion and the spirit of "let\'s go."'
            : 'يجمع شعار يلا لندن بين الطباعة الواثقة ومؤشر الطاقة الخفي - النقطة المرجانية التي تمثل الحركة للأمام وروح "يلا".'
          }
        />

        {/* Logo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Light Background */}
          <div>
            <div className="bg-white border border-gray-200 rounded-2xl p-12 md:p-16 flex items-center justify-center min-h-[200px]">
              <Logo variant="default" size="large" />
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">Primary — Light Background</p>
          </div>

          {/* Dark Background */}
          <div>
            <div className="bg-[#1A1F36] rounded-2xl p-12 md:p-16 flex items-center justify-center min-h-[200px]">
              <Logo variant="light" size="large" />
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">Primary — Dark Background</p>
          </div>

          {/* Coral Background */}
          <div>
            <div className="bg-[#E8634B] rounded-2xl p-12 md:p-16 flex items-center justify-center min-h-[200px]">
              <Logo variant="coral" size="large" />
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">Primary — Coral Background</p>
          </div>

          {/* Black Background */}
          <div>
            <div className="bg-black rounded-2xl p-12 md:p-16 flex items-center justify-center min-h-[200px]">
              <Logo variant="light" size="large" />
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">Primary — Black Background</p>
          </div>
        </div>

        {/* Logo Variations */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 rounded-xl p-8 md:p-10 flex flex-col items-center justify-center">
            <Logo variant="stacked" size="medium" />
            <p className="text-xs text-gray-500 mt-4">Stacked</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-8 md:p-10 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Yalla</span>
              <span className="text-xs font-medium tracking-[0.3em] uppercase text-gray-500">London</span>
            </div>
            <p className="text-xs text-gray-500 mt-4">Stacked Dark</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-8 md:p-10 flex flex-col items-center justify-center">
            <AppIcon />
            <p className="text-xs text-gray-500 mt-4">App Icon</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-8 md:p-10 flex flex-col items-center justify-center">
            <AppIcon inverted />
            <p className="text-xs text-gray-500 mt-4">App Icon Alt</p>
          </div>
        </div>

        {/* Clear Space */}
        <div className="bg-gray-50 rounded-2xl p-12 md:p-20 flex items-center justify-center mt-16">
          <div className="border-2 border-dashed border-[#E8634B] p-8 md:p-10 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-[#E8634B] bg-gray-50 px-2">Y height</span>
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-[#E8634B] bg-gray-50 px-2">Y height</span>
            <span className="absolute top-1/2 -left-8 -translate-y-1/2 -rotate-90 text-xs font-semibold text-[#E8634B] bg-gray-50 px-2">Y height</span>
            <span className="absolute top-1/2 -right-8 -translate-y-1/2 rotate-90 text-xs font-semibold text-[#E8634B] bg-gray-50 px-2">Y height</span>
            <Logo variant="default" size="medium" />
          </div>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          Minimum clear space equals the height of the "Y" on all sides
        </p>
      </Section>

      {/* Colors Section */}
      <Section navy>
        <SectionHeader
          label="02 — Color"
          title={language === 'en' ? 'Color Palette' : 'لوحة الألوان'}
          description={language === 'en'
            ? 'A restrained palette built around navy and coral. Navy conveys trust and sophistication, while coral provides energy and warmth.'
            : 'لوحة ألوان مقيدة مبنية حول الكحلي والمرجاني. الكحلي ينقل الثقة والرقي، بينما المرجاني يوفر الطاقة والدفء.'
          }
          dark
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Primary Colors */}
          <div>
            <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-4">Primary</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1A1F36] rounded-xl p-6 min-h-[180px] flex flex-col justify-end border border-white/10">
                <div className="text-white font-semibold mb-1">Navy</div>
                <div className="text-white/70 text-sm font-mono">#1A1F36</div>
                <div className="text-white/50 text-xs mt-1">RGB 26, 31, 54</div>
              </div>
              <div className="bg-[#E8634B] rounded-xl p-6 min-h-[180px] flex flex-col justify-end">
                <div className="text-white font-semibold mb-1">Coral</div>
                <div className="text-white/70 text-sm font-mono">#E8634B</div>
                <div className="text-white/50 text-xs mt-1">RGB 232, 99, 75</div>
              </div>
            </div>
          </div>

          {/* Supporting Colors */}
          <div>
            <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-4">Supporting</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 flex flex-col justify-end border border-white/10">
                <div className="text-gray-900 font-semibold mb-1">White</div>
                <div className="text-gray-500 text-sm font-mono">#FFFFFF</div>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 flex flex-col justify-end">
                <div className="text-gray-900 font-semibold mb-1">Gray 100</div>
                <div className="text-gray-500 text-sm font-mono">#F5F5F5</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6 flex flex-col justify-end">
                <div className="text-white font-semibold mb-1">Gray 900</div>
                <div className="text-white/70 text-sm font-mono">#171717</div>
              </div>
              <div className="bg-black rounded-xl p-6 flex flex-col justify-end">
                <div className="text-white font-semibold mb-1">Black</div>
                <div className="text-white/70 text-sm font-mono">#0A0A0A</div>
              </div>
            </div>
          </div>
        </div>

        {/* Gray Scale */}
        <div className="mt-16">
          <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-4">Gray Scale</div>
          <div className="flex gap-2">
            {([50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const).map((shade, index) => (
              <div
                key={shade}
                className={`flex-1 h-14 md:h-16 rounded-lg flex items-end p-2 ${
                  index < 4 ? 'text-gray-900' : 'text-white'
                }`}
                style={{ backgroundColor: colors.gray[shade] }}
              >
                <span className="text-[10px] font-semibold">{shade}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Typography Section */}
      <Section>
        <SectionHeader
          label="03 — Typography"
          title={language === 'en' ? 'Type System' : 'نظام الخطوط'}
          description={language === 'en'
            ? 'Plus Jakarta Sans for headlines and branding. Inter for body copy. Tajawal for Arabic content — all clean, modern, and highly legible.'
            : 'Plus Jakarta Sans للعناوين والعلامة التجارية. Inter للنص الأساسي. Tajawal للمحتوى العربي — كلها نظيفة وحديثة وسهلة القراءة.'
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* English Typography */}
          <div>
            <div className="mb-10">
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-4">Display</div>
              <div className="text-5xl md:text-6xl font-bold tracking-tight leading-tight text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Discover London
              </div>
            </div>

            <div className="mb-10">
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-4">Heading 1</div>
              <div className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Best Halal Restaurants
              </div>
            </div>

            <div className="mb-10">
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-4">Heading 2</div>
              <div className="text-2xl font-semibold tracking-tight leading-snug text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Your Guide to Mayfair
              </div>
            </div>

            <div className="mb-10">
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-4">Body</div>
              <div className="text-base leading-relaxed text-gray-600">
                From Michelin-starred dining to hidden local gems, we've curated the best halal restaurants across the city. Every listing is verified and reviewed by our community.
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-4">Small</div>
              <div className="text-sm text-gray-500">
                17 January 2026 · 8 min read
              </div>
            </div>
          </div>

          {/* Arabic Typography */}
          <div dir="rtl" className="text-right" style={{ fontFamily: "'Tajawal', sans-serif" }}>
            <div className="mb-10">
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-4">العنوان الرئيسي</div>
              <div className="text-5xl md:text-6xl font-bold leading-tight text-gray-900">
                اكتشف لندن
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-4">النص الأساسي</div>
              <div className="text-lg leading-loose text-gray-600">
                من المطاعم الحائزة على نجوم ميشلان إلى الجواهر المحلية المخفية، قمنا برعاية أفضل المطاعم الحلال في جميع أنحاء المدينة. كل قائمة موثقة ومراجعة من قبل مجتمعنا.
              </div>
            </div>
          </div>
        </div>

        {/* Font Weights */}
        <div className="mt-16 space-y-3">
          {[
            { weight: 300, name: 'Light 300' },
            { weight: 400, name: 'Regular 400' },
            { weight: 500, name: 'Medium 500' },
            { weight: 600, name: 'SemiBold 600' },
            { weight: 700, name: 'Bold 700' },
            { weight: 800, name: 'ExtraBold 800' },
          ].map(({ weight, name }) => (
            <div key={weight} className="flex items-baseline gap-4">
              <span className="text-xs text-gray-400 w-24">{name}</span>
              <span
                className="text-xl text-gray-900"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: weight }}
              >
                The quick brown fox
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Icons Section */}
      <Section dark>
        <SectionHeader
          label="04 — Iconography"
          title={language === 'en' ? 'Icon Library' : 'مكتبة الأيقونات'}
          description={language === 'en'
            ? 'Simple, universal icons with 1.5px stroke weight. Rounded caps. Keep them consistent across all touchpoints.'
            : 'أيقونات بسيطة وعالمية بسماكة خط 1.5px. نهايات مستديرة. حافظ على اتساقها عبر جميع نقاط الاتصال.'
          }
          dark
        />

        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {[
            { Icon: MapPin, name: 'Location' },
            { Icon: Search, name: 'Search' },
            { Icon: Heart, name: 'Save' },
            { Icon: Star, name: 'Rating' },
            { Icon: Clock, name: 'Time' },
            { Icon: CheckCircle, name: 'Verified' },
            { Icon: Globe, name: 'Language' },
            { Icon: Bookmark, name: 'Bookmark' },
            { Icon: Calendar, name: 'Calendar' },
            { Icon: MessageCircle, name: 'Chat' },
            { Icon: Mail, name: 'Email' },
            { Icon: Share, name: 'Share' },
            { Icon: Image, name: 'Image' },
            { Icon: Users, name: 'Community' },
            { Icon: Bell, name: 'Alerts' },
            { Icon: Settings, name: 'Settings' },
          ].map(({ Icon, name }) => (
            <div
              key={name}
              className="aspect-square bg-gray-800 rounded-xl flex flex-col items-center justify-center gap-2 p-4 hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" strokeWidth={1.5} />
              <span className="text-[9px] md:text-[10px] font-medium text-gray-400 uppercase tracking-wide">{name}</span>
            </div>
          ))}
        </div>

        {/* Icon Specs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="font-semibold mb-2">Stroke Weight</div>
            <div className="text-sm text-gray-400">1.5px consistent across all icons</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="font-semibold mb-2">Corner Radius</div>
            <div className="text-sm text-gray-400">Rounded line caps and joins</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="font-semibold mb-2">Grid Size</div>
            <div className="text-sm text-gray-400">24×24px base, scale proportionally</div>
          </div>
        </div>
      </Section>

      {/* Components Section */}
      <Section>
        <SectionHeader
          label="05 — Components"
          title={language === 'en' ? 'UI Elements' : 'عناصر واجهة المستخدم'}
          description={language === 'en'
            ? 'Consistent components that work across web and mobile. Clean, functional, with subtle interactions.'
            : 'مكونات متسقة تعمل عبر الويب والجوال. نظيفة ووظيفية مع تفاعلات دقيقة.'
          }
        />

        {/* Buttons */}
        <div className="mb-16">
          <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-6">Buttons</div>
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <button className="px-7 py-3.5 bg-[#1A1F36] text-white text-sm font-semibold rounded-lg hover:bg-[#2D3454] transition-all hover:-translate-y-0.5 hover:shadow-lg">
              Primary
            </button>
            <button className="px-7 py-3.5 bg-[#E8634B] text-white text-sm font-semibold rounded-lg hover:bg-[#FF7F6B] transition-all hover:-translate-y-0.5 hover:shadow-lg">
              Coral
            </button>
            <button className="px-7 py-3.5 bg-transparent text-[#1A1F36] text-sm font-semibold rounded-lg border-2 border-[#1A1F36] hover:bg-[#1A1F36] hover:text-white transition-all">
              Outline
            </button>
            <button className="px-5 py-3.5 text-gray-600 text-sm font-semibold rounded-lg hover:text-[#1A1F36] hover:bg-gray-100 transition-all">
              Ghost
            </button>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <button className="px-5 py-2.5 bg-[#1A1F36] text-white text-xs font-semibold rounded-lg">
              Small
            </button>
            <button className="px-7 py-3.5 bg-[#1A1F36] text-white text-sm font-semibold rounded-lg">
              Default
            </button>
            <button className="px-9 py-4.5 bg-[#1A1F36] text-white text-base font-semibold rounded-lg">
              Large
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-16">
          <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-6">Tags & Filters</div>
          <div className="flex flex-wrap gap-3">
            <span className="px-4 py-2 bg-[#1A1F36] text-white text-sm font-medium rounded-full">All</span>
            <span className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors cursor-pointer">Food</span>
            <span className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors cursor-pointer">Shopping</span>
            <span className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors cursor-pointer">Experiences</span>
            <span className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors cursor-pointer">Family</span>
            <span className="px-4 py-2 bg-[#E8634B]/10 text-[#E8634B] text-sm font-medium rounded-full">Verified Halal</span>
          </div>
        </div>

        {/* Inputs */}
        <div className="mb-16">
          <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-6">Inputs</div>
          <div className="max-w-md space-y-4">
            <input
              type="text"
              placeholder="Enter your email"
              className="w-full px-4 py-3.5 text-base border border-gray-200 rounded-lg outline-none focus:border-[#1A1F36] focus:ring-2 focus:ring-[#1A1F36]/10 transition-all"
            />
            <div className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl">
              <Search className="w-5 h-5 text-gray-400" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search restaurants, places..."
                className="flex-1 bg-transparent outline-none text-base"
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-16">
          <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-6">Navigation</div>

          {/* Light Nav */}
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between mb-4">
            <div className="flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <span className="text-xl font-extrabold text-[#1A1F36]">Yalla</span>
              <span className="text-xl font-medium text-gray-400">London</span>
              <span className="w-1.5 h-1.5 bg-[#E8634B] rounded-full ml-1"></span>
            </div>
            <div className="hidden md:flex gap-8 text-sm font-medium text-gray-500">
              <span className="text-gray-900 cursor-pointer">Discover</span>
              <span className="cursor-pointer hover:text-gray-900 transition-colors">Food</span>
              <span className="cursor-pointer hover:text-gray-900 transition-colors">Experiences</span>
              <span className="cursor-pointer hover:text-gray-900 transition-colors">Map</span>
              <span className="cursor-pointer hover:text-gray-900 transition-colors" style={{ fontFamily: "'Tajawal', sans-serif" }}>عربي</span>
            </div>
            <button className="px-5 py-2.5 bg-[#1A1F36] text-white text-sm font-semibold rounded-lg">
              Sign up
            </button>
          </div>

          {/* Dark Nav */}
          <div className="bg-[#1A1F36] rounded-xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <span className="text-xl font-extrabold text-white">Yalla</span>
              <span className="text-xl font-medium text-white/50">London</span>
              <span className="w-1.5 h-1.5 bg-[#E8634B] rounded-full ml-1"></span>
            </div>
            <div className="hidden md:flex gap-8 text-sm font-medium text-white/60">
              <span className="text-white cursor-pointer">Discover</span>
              <span className="cursor-pointer hover:text-white transition-colors">Food</span>
              <span className="cursor-pointer hover:text-white transition-colors">Experiences</span>
              <span className="cursor-pointer hover:text-white transition-colors">Map</span>
              <span className="cursor-pointer hover:text-white transition-colors" style={{ fontFamily: "'Tajawal', sans-serif" }}>عربي</span>
            </div>
            <button className="px-5 py-2.5 bg-[#E8634B] text-white text-sm font-semibold rounded-lg">
              Sign up
            </button>
          </div>
        </div>

        {/* Cards */}
        <div>
          <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-6">Cards</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { gradient: 'from-[#2d3454] to-[#1A1F36]', category: 'Food', title: 'Best Halal Restaurants in Mayfair', date: '17 January 2026 · 8 min read' },
              { gradient: 'from-gray-600 to-gray-800', category: 'Shopping', title: 'Luxury Guide: Harrods & Beyond', date: '15 January 2026 · 6 min read' },
              { gradient: 'from-[#E8634B] to-[#c74d38]', category: 'Experiences', title: 'Hidden Gems at Borough Market', date: '12 January 2026 · 5 min read' },
            ].map((card, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all cursor-pointer">
                <div className={`h-44 bg-gradient-to-br ${card.gradient} relative`}>
                  <span className="absolute top-4 left-4 px-3 py-1.5 bg-white text-[#1A1F36] text-[10px] font-semibold uppercase tracking-wide rounded-md">
                    {card.category}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-500">{card.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Social Media Templates Section */}
      <Section dark>
        <SectionHeader
          label="06 — Social Media"
          title={language === 'en' ? 'Post Templates' : 'قوالب المنشورات'}
          description={language === 'en'
            ? 'Consistent social presence across Instagram, Twitter, and LinkedIn. Keep typography bold, backgrounds clean.'
            : 'حضور اجتماعي متسق عبر Instagram و Twitter و LinkedIn. حافظ على الطباعة الجريئة والخلفيات النظيفة.'
          }
          dark
        />

        {/* Instagram Posts */}
        <div className="mb-16">
          <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-6">Instagram Posts (1080×1080)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Navy Post */}
            <div>
              <div className="aspect-square bg-[#1A1F36] rounded-lg p-8 flex flex-col justify-end relative shadow-2xl">
                <div className="absolute top-6 left-6 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="text-sm font-extrabold text-white">Yalla</span>
                  <span className="text-sm font-medium text-white/50">London</span>
                  <span className="w-1 h-1 bg-[#E8634B] rounded-full ml-1"></span>
                </div>
                <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/60 mb-3">Food Guide</div>
                <div className="text-2xl font-bold text-white leading-tight mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Best Halal Brunch Spots in London
                </div>
                <div className="text-sm text-white/70">Our top 10 picks for the weekend</div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Navy Background</p>
            </div>

            {/* Coral Post */}
            <div>
              <div className="aspect-square bg-[#E8634B] rounded-lg p-8 flex flex-col justify-end relative shadow-2xl">
                <div className="absolute top-6 left-6 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="text-sm font-extrabold text-white">Yalla</span>
                  <span className="text-sm font-medium text-white/70">London</span>
                  <span className="w-1 h-1 bg-white rounded-full ml-1"></span>
                </div>
                <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/60 mb-3">New Guide</div>
                <div className="text-2xl font-bold text-white leading-tight mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Ramadan in London 2026
                </div>
                <div className="text-sm text-white/70">Iftars, events, and community gatherings</div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Coral Background</p>
            </div>

            {/* Light Post */}
            <div>
              <div className="aspect-square bg-gray-100 rounded-lg p-8 flex flex-col justify-end relative shadow-2xl">
                <div className="absolute top-6 left-6 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="text-sm font-extrabold text-[#1A1F36]">Yalla</span>
                  <span className="text-sm font-medium text-gray-400">London</span>
                  <span className="w-1 h-1 bg-[#E8634B] rounded-full ml-1"></span>
                </div>
                <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#1A1F36]/60 mb-3">Weekend Plans</div>
                <div className="text-2xl font-bold text-[#1A1F36] leading-tight mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Markets You Can't Miss
                </div>
                <div className="text-sm text-gray-500">Portobello, Borough & more</div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Light Background</p>
            </div>

            {/* Quote Post */}
            <div>
              <div className="aspect-square bg-white rounded-lg p-8 flex flex-col justify-center relative shadow-2xl border border-gray-200">
                <div className="absolute top-6 left-6 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="text-sm font-extrabold text-[#1A1F36]">Yalla</span>
                  <span className="text-sm font-medium text-gray-400">London</span>
                  <span className="w-1 h-1 bg-[#E8634B] rounded-full ml-1"></span>
                </div>
                <div className="text-6xl text-[#E8634B] font-serif leading-none mb-0">"</div>
                <div className="text-xl font-semibold text-[#1A1F36] leading-snug mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  London is the most cosmopolitan city in the world — and it welcomes everyone.
                </div>
                <div className="text-sm text-gray-400">— Yalla London Community</div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Quote Post</p>
            </div>

            {/* Announcement Post */}
            <div>
              <div className="aspect-square bg-gray-100 rounded-lg p-8 flex flex-col items-center justify-center relative shadow-2xl">
                <div className="absolute top-6 left-6 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="text-sm font-extrabold text-[#1A1F36]">Yalla</span>
                  <span className="text-sm font-medium text-gray-400">London</span>
                  <span className="w-1 h-1 bg-[#E8634B] rounded-full ml-1"></span>
                </div>
                <div className="w-16 h-16 bg-[#E8634B] rounded-2xl flex items-center justify-center mb-6">
                  <Bell className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                <div className="text-2xl font-bold text-[#1A1F36] text-center mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  New Feature
                </div>
                <div className="text-sm text-gray-400 text-center">Save your favorite spots to collections</div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Announcement</p>
            </div>

            {/* Bilingual Post */}
            <div>
              <div className="aspect-square rounded-lg overflow-hidden shadow-2xl grid grid-rows-2">
                <div className="bg-[#1A1F36] p-6 flex flex-col justify-end relative">
                  <div className="absolute top-4 left-4 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <span className="text-xs font-extrabold text-white">Yalla</span>
                    <span className="text-xs font-medium text-white/50">London</span>
                    <span className="w-1 h-1 bg-[#E8634B] rounded-full ml-1"></span>
                  </div>
                  <div className="text-xl font-bold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Discover London's Hidden Gems
                  </div>
                </div>
                <div className="bg-[#E8634B] p-6 flex flex-col justify-end text-right" dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  <div className="text-xl font-bold text-white leading-tight">
                    اكتشف جواهر لندن المخفية
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Bilingual EN/AR</p>
            </div>
          </div>
        </div>

        {/* Instagram Stories */}
        <div className="mb-16">
          <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-6">Instagram Stories (1080×1920)</div>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {/* Navy Story */}
            <div className="flex-shrink-0">
              <div className="w-56 h-96 bg-[#1A1F36] rounded-2xl p-6 flex flex-col justify-end relative shadow-2xl">
                <div className="absolute top-5 left-5 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="text-xs font-extrabold text-white">Yalla</span>
                  <span className="text-xs font-medium text-white/50">London</span>
                  <span className="w-1 h-1 bg-[#E8634B] rounded-full ml-1"></span>
                </div>
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-white/60 mb-2">New Guide</div>
                <div className="text-xl font-bold text-white leading-tight mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Top 5 Halal Fine Dining
                </div>
                <div className="text-xs text-white/70 mb-5">Michelin-quality restaurants</div>
                <span className="inline-block self-start px-5 py-2.5 bg-white text-[#1A1F36] text-xs font-semibold rounded-md">
                  Read More
                </span>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Story — Navy</p>
            </div>

            {/* Coral Story */}
            <div className="flex-shrink-0">
              <div className="w-56 h-96 bg-[#E8634B] rounded-2xl p-6 flex flex-col justify-end relative shadow-2xl">
                <div className="absolute top-5 left-5 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="text-xs font-extrabold text-white">Yalla</span>
                  <span className="text-xs font-medium text-white/70">London</span>
                  <span className="w-1 h-1 bg-white rounded-full ml-1"></span>
                </div>
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-white/60 mb-2">This Weekend</div>
                <div className="text-xl font-bold text-white leading-tight mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Camden Market Guide
                </div>
                <div className="text-xs text-white/70 mb-5">Food, fashion & finds</div>
                <span className="inline-block self-start px-5 py-2.5 bg-[#1A1F36] text-white text-xs font-semibold rounded-md">
                  Explore
                </span>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Story — Coral</p>
            </div>

            {/* Gradient Story */}
            <div className="flex-shrink-0">
              <div className="w-56 h-96 bg-gradient-to-b from-[#1A1F36] to-[#2d3454] rounded-2xl p-6 flex flex-col justify-end relative shadow-2xl">
                <div className="absolute top-5 left-5 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="text-xs font-extrabold text-white">Yalla</span>
                  <span className="text-xs font-medium text-white/50">London</span>
                  <span className="w-1 h-1 bg-[#E8634B] rounded-full ml-1"></span>
                </div>
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-white/60 mb-2">Community Pick</div>
                <div className="text-xl font-bold text-white leading-tight mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Best Coffee Near Oxford Street
                </div>
                <div className="text-xs text-white/70 mb-5">Your votes are in</div>
                <span className="inline-block self-start px-5 py-2.5 bg-white text-[#1A1F36] text-xs font-semibold rounded-md">
                  See Results
                </span>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Story — Gradient</p>
            </div>
          </div>
        </div>

        {/* Twitter/X Cards */}
        <div>
          <div className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400 mb-6">Twitter/X Cards</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Navy Card */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="h-64 bg-[#1A1F36] p-6 flex flex-col justify-end relative">
                <div className="absolute top-5 left-5 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="text-sm font-extrabold text-white">Yalla</span>
                  <span className="text-sm font-medium text-white/50">London</span>
                  <span className="w-1 h-1 bg-[#E8634B] rounded-full ml-1"></span>
                </div>
                <div className="text-2xl font-bold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Best Halal Restaurants in Mayfair
                </div>
              </div>
              <div className="p-5">
                <div className="text-sm text-gray-400 mb-1">yallalondon.com</div>
                <div className="font-semibold text-gray-900 mb-1">Mayfair Halal Dining Guide</div>
                <div className="text-sm text-gray-400">Our curated guide to the best halal restaurants in one of London's most prestigious neighborhoods.</div>
              </div>
            </div>

            {/* Coral Card */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="h-64 bg-[#E8634B] p-6 flex flex-col justify-end relative">
                <div className="absolute top-5 left-5 flex items-center gap-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="text-sm font-extrabold text-white">Yalla</span>
                  <span className="text-sm font-medium text-white/70">London</span>
                  <span className="w-1 h-1 bg-white rounded-full ml-1"></span>
                </div>
                <div className="text-2xl font-bold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  New: Save to Collections
                </div>
              </div>
              <div className="p-5">
                <div className="text-sm text-gray-400 mb-1">yallalondon.com</div>
                <div className="font-semibold text-gray-900 mb-1">Organize Your Favorites</div>
                <div className="text-sm text-gray-400">Create custom collections of restaurants, experiences, and places you want to visit.</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Usage Rules Section */}
      <Section>
        <SectionHeader
          label="07 — Usage"
          title={language === 'en' ? "Do's and Don'ts" : 'ما يجب وما لا يجب'}
          description={language === 'en'
            ? 'Maintain brand consistency by following these guidelines across all applications.'
            : 'حافظ على اتساق العلامة التجارية باتباع هذه الإرشادات عبر جميع التطبيقات.'
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Do */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold">Do</span>
            </div>
            <ul className="space-y-3">
              {[
                'Use the logo with adequate clear space',
                'Maintain the coral dot as part of the wordmark',
                'Use approved color combinations only',
                'Scale the logo proportionally',
                'Use the stacked version for small spaces',
                'Keep typography clean and minimal',
              ].map((item, index) => (
                <li key={index} className="text-sm text-gray-600 pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Don't */}
          <div className="bg-[#E8634B]/5 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#E8634B] rounded-full flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold">Don't</span>
            </div>
            <ul className="space-y-3">
              {[
                'Stretch or distort the logo',
                'Change the logo colors arbitrarily',
                'Add effects like shadows or gradients',
                'Place the logo on busy backgrounds',
                'Remove or reposition the coral dot',
                'Use ornamental or decorative typography',
              ].map((item, index) => (
                <li key={index} className="text-sm text-gray-600 pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="px-6 py-16 md:px-20 text-center border-t border-gray-200">
        <div className="flex items-center justify-center gap-0.5 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <span className="text-2xl font-extrabold text-[#1A1F36]">Yalla</span>
          <span className="text-2xl font-medium text-gray-400">London</span>
          <span className="w-2 h-2 bg-[#E8634B] rounded-full ml-1"></span>
        </div>
        <p className="text-sm text-gray-500">Brand Guidelines v1.0 — January 2026</p>
      </footer>
    </div>
  );
}
