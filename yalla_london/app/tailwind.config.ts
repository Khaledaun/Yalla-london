
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand Kit v2 — Yalla London (yl-* shorthand palette)
        'yl-red': '#C8322B',
        'yl-gold': '#C49A2A',
        'yl-blue': '#4A7BA8',
        'yl-charcoal': '#1C1917',
        'yl-parchment': '#EDE9E1',
        'yl-cream': '#F5F0E8',
        'yl-navy': '#1A2332',
        'yl-dark-navy': '#0F1621',
        'yl-gray': {
          100: '#F7F5F2', 200: '#E8E3DB', 300: '#D4CFC5',
          400: '#A09A8E', 500: '#7A746A', 600: '#5A5449',
        },
        // Brand Kit v2 — Yalla London (full scales)
        london: {
          50: '#fef2f2',
          100: '#fde3e3',
          200: '#fccbcb',
          300: '#f9a3a3',
          400: '#f06b6b',
          500: '#e34040',
          600: '#C8322B',  // PRIMARY — London Red
          700: '#a82520',
          800: '#8b1f1c',
          900: '#751d1b',
          950: '#400b0a',
        },
        'yalla-gold': {
          50: '#fbf8eb',
          100: '#f5eecb',
          200: '#ede09a',
          300: '#e2cc60',
          400: '#d9b938',
          500: '#C49A2A',  // SECONDARY — Gold
          600: '#a87a22',
          700: '#8a5c1e',
          800: '#724a20',
          900: '#5f3e20',
          950: '#371f0e',
        },
        thames: {
          50: '#f0f7fa',
          100: '#dbeef4',
          200: '#bbdee9',
          300: '#8bc6d9',
          400: '#54a6c1',
          500: '#3B7EA1',  // Thames Blue — links, info
          600: '#326b8b',
          700: '#2d5872',
          800: '#2b4a5f',
          900: '#283e50',
          950: '#172735',
        },
        stamp: {
          DEFAULT: '#4A7BA8',  // Stamp Blue — LDN stamp, interactive
        },
        charcoal: {
          DEFAULT: '#1C1917',  // Dark bg, primary text
          light: '#3D3835',    // Graphite — borders, cards
        },
        stone: {
          DEFAULT: '#5C564F',  // Secondary text, metadata (WCAG AA on cream)
        },
        sand: {
          DEFAULT: '#D6D0C4',  // Light mode borders, dividers
        },
        cream: {
          DEFAULT: '#FAF8F4',  // Light mode background
          50: '#FDFCFA',
          100: '#F5F1E8',
          200: '#EDE8DC',
          300: '#DED8CC',
          400: '#C4BEB2',
          500: '#A9A498',
          900: '#3D3835',
          950: '#2A2523',
        },
        forest: {
          DEFAULT: '#2D5A3D',  // Success states
        },
        // DEPRECATED Legacy aliases — Brand Kit v1 → v2 migration
        // burgundy-* → london-*  |  warm-charcoal → yl-charcoal  |  warm-gray → stone
        // gold-* → yalla-gold-*  (87 usages remain — migrate incrementally)
        // See DESIGN.md Section 9.5 for full mapping. Run: npx tsx scripts/brand-check.ts
        burgundy: {
          50: '#fef2f2',
          100: '#fde3e3',
          200: '#fccbcb',
          300: '#f9a3a3',
          400: '#f06b6b',
          500: '#e34040',
          600: '#C8322B',
          700: '#a82520',
          800: '#8b1f1c',
          900: '#751d1b',
          950: '#400b0a',
        },
        gold: {
          50: '#fbf8eb',
          100: '#f5eecb',
          200: '#ede09a',
          300: '#e2cc60',
          400: '#d9b938',
          500: '#C49A2A',
          600: '#a87a22',
          700: '#8a5c1e',
          800: '#724a20',
          900: '#5f3e20',
          950: '#371f0e',
        },
        'warm-charcoal': '#1C1917',
        'warm-gray': '#78716C',
        // Zenitha.Luxury — Parent Brand
        'zl-obsidian': '#0A0A0A',
        'zl-midnight': '#141414',
        'zl-charcoal': '#2A2A2A',
        'zl-smoke': '#4A4A4A',
        'zl-mist': '#8A8A8A',
        'zl-platinum': '#D6D0C4',
        'zl-cream': '#F5F0E8',
        'zl-ivory': '#FDFCF9',
        'zl-gold': {
          DEFAULT: '#C4A96C',
          light: '#E2CBA0',
          deep: '#9A7A42',
        },
        'zl-champagne': '#EAD9BB',
        // Zenitha HQ — Dark Admin Theme
        'zh-navy': {
          DEFAULT: '#0A1628',
          mid: '#0F1F35',
          light: '#162843',
          hover: '#1C3250',
          border: '#1E3555',
        },
        'zh-gold': {
          DEFAULT: '#C9A84C',
          muted: '#7A6535',
          dim: '#3A2E18',
        },
        'zh-cream': {
          DEFAULT: '#F0EAD6',
          muted: '#8A8070',
          dim: '#4A4438',
        },
        'zh-success': { DEFAULT: '#2D6A3F', text: '#6EE7A0' },
        'zh-warn': { DEFAULT: '#7A4A10', text: '#FBBF24' },
        'zh-error': { DEFAULT: '#6B1C1C', text: '#FCA5A5' },
        'zh-info': { DEFAULT: '#0F2E3A', text: '#7DD3FC' },
        'zl-brass': '#B8934A',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'soft': '12px',
        'card': '16px',
        'yl-sm': '6px',
        'yl-md': '10px',
        'yl-lg': '14px',
        'yl-xl': '20px',
      },
      transitionTimingFunction: {
        'yl': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(28, 25, 23, 0.06)',
        'md': '0 4px 12px rgba(28, 25, 23, 0.08)',
        'luxury': '0 4px 20px rgba(28, 25, 23, 0.08)',
        'elegant': '0 8px 40px rgba(28, 25, 23, 0.12)',
        'card': '0 2px 12px rgba(28, 25, 23, 0.06)',
        'hover': '0 12px 32px rgba(28, 25, 23, 0.15)',
        'xl': '0 20px 60px rgba(28, 25, 23, 0.16)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "ticker": {
          from: { transform: "translateX(0%)" },
          to: { transform: "translateX(-50%)" },
        },
        "ticker-rtl": {
          from: { transform: "translateX(0%)" },
          to: { transform: "translateX(50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "shimmer": "shimmer 2s infinite linear",
        "ticker": "ticker 40s linear infinite",
        "ticker-rtl": "ticker-rtl 40s linear infinite",
      },
      fontFamily: {
        'sans': ['var(--font-body)'],
        'display': ['var(--font-display)'],
        'editorial': ['var(--font-editorial)'],
        'mono': ['var(--font-system)'],
        'arabic': ['var(--font-arabic)'],
        // Brand Kit v2 aliases
        'heading': ['Anybody', 'sans-serif'],
        'body': ['Source Serif 4', 'Georgia', 'serif'],
        // Zenitha HQ admin fonts
        'zh-mono': ['var(--f-mono)', 'Space Mono', 'monospace'],
        'zh-ui': ['var(--f-ui)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        // Legacy aliases
        'serif': ['var(--font-editorial)'],
        'cairo': ['var(--font-arabic)'],
        'playfair': ['var(--font-display)'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-luxury': 'linear-gradient(135deg, #C8322B 0%, #8b1f1c 100%)',
        'gradient-gold': 'linear-gradient(135deg, #C49A2A 0%, #d9b938 100%)',
        'gradient-tricolor': 'linear-gradient(90deg, #C8322B, #C49A2A, #3B7EA1)',
        'pattern-arabesque': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("tailwind-scrollbar-hide")],
} satisfies Config

export default config
